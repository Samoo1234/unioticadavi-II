"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface TransferenciaItem {
    id: string;
    produto_id: string;
    quantidade_enviada: number;
    quantidade_recebida: number | null;
    observacao: string | null;
    produto?: { id: string; nome: string; codigo: string; marca: string; tipo: string };
}

export interface Transferencia {
    id: string;
    numero_protocolo: number;
    empresa_origem_id: number;
    empresa_destino_id: number;
    status: "pendente" | "em_transito" | "recebido" | "recebido_parcial" | "cancelado";
    criado_por: string | null;
    recebido_por: string | null;
    data_criacao: string;
    data_envio: string | null;
    data_recebimento: string | null;
    observacoes: string | null;
    motivo_parcial: string | null;
    motivo_cancelamento: string | null;
    empresa_origem?: { id: number; nome_fantasia: string; cidade: string };
    empresa_destino?: { id: number; nome_fantasia: string; cidade: string };
    itens?: TransferenciaItem[];
}

export interface NovaTransferenciaItem {
    produto_id: string;
    quantidade: number;
}

export function useTransferencias(filtroEmpresaId?: string) {
    const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTransferencias = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from("transferencias_estoque")
            .select(`
                *,
                empresa_origem:empresas!transferencias_estoque_empresa_origem_id_fkey(id, nome_fantasia, cidade),
                empresa_destino:empresas!transferencias_estoque_empresa_destino_id_fkey(id, nome_fantasia, cidade),
                itens:transferencias_estoque_itens(*, produto:produtos(id, nome, codigo, marca, tipo))
            `)
            .order("data_criacao", { ascending: false });

        if (filtroEmpresaId && filtroEmpresaId !== "geral") {
            const eid = parseInt(filtroEmpresaId);
            query = query.or(`empresa_origem_id.eq.${eid},empresa_destino_id.eq.${eid}`);
        }

        const { data, error } = await query;
        if (!error && data) {
            setTransferencias(data as Transferencia[]);
        }
        setLoading(false);
    }, [filtroEmpresaId]);

    useEffect(() => {
        fetchTransferencias();
    }, [fetchTransferencias]);

    const criarTransferencia = async (
        origemId: number,
        destinoId: number,
        itens: NovaTransferenciaItem[],
        observacoes?: string
    ) => {
        const { data: user } = await supabase.auth.getUser();

        const { data: transf, error: errTransf } = await supabase
            .from("transferencias_estoque")
            .insert({
                empresa_origem_id: origemId,
                empresa_destino_id: destinoId,
                status: "pendente",
                criado_por: user?.user?.id,
                observacoes: observacoes || null,
            })
            .select()
            .single();

        if (errTransf || !transf) return { error: errTransf };

        const itensInsert = itens.map((i) => ({
            transferencia_id: transf.id,
            produto_id: i.produto_id,
            quantidade_enviada: i.quantidade,
        }));

        const { error: errItens } = await supabase
            .from("transferencias_estoque_itens")
            .insert(itensInsert);

        if (errItens) return { error: errItens };

        await fetchTransferencias();
        return { error: null, protocolo: transf.numero_protocolo };
    };

    const buscarPorProtocolo = async (protocolo: number) => {
        const { data, error } = await supabase
            .from("transferencias_estoque")
            .select(`
                *,
                empresa_origem:empresas!transferencias_estoque_empresa_origem_id_fkey(id, nome_fantasia, cidade),
                empresa_destino:empresas!transferencias_estoque_empresa_destino_id_fkey(id, nome_fantasia, cidade),
                itens:transferencias_estoque_itens(*, produto:produtos(id, nome, codigo, marca, tipo))
            `)
            .eq("numero_protocolo", protocolo)
            .single();

        if (error) return { data: null, error };
        return { data: data as Transferencia, error: null };
    };

    const confirmarRecebimento = async (
        transferenciaId: string,
        itensRecebidos: { itemId: string; quantidadeRecebida: number }[],
        parcial: boolean,
        motivoParcial?: string
    ) => {
        const { data: user } = await supabase.auth.getUser();

        // Buscar transferência completa
        const { data: transf } = await supabase
            .from("transferencias_estoque")
            .select("*, itens:transferencias_estoque_itens(*, produto:produtos(id, nome, codigo, quantidade, empresa_id))")
            .eq("id", transferenciaId)
            .single();

        if (!transf) return { error: { message: "Transferência não encontrada" } };

        // Atualizar quantidades recebidas nos itens
        for (const item of itensRecebidos) {
            await supabase
                .from("transferencias_estoque_itens")
                .update({ quantidade_recebida: item.quantidadeRecebida })
                .eq("id", item.itemId);
        }

        // Movimentar estoque: debitar da origem, creditar no destino
        for (const item of itensRecebidos) {
            if (item.quantidadeRecebida <= 0) continue;

            const itemOriginal = transf.itens?.find((i: any) => i.id === item.itemId);
            if (!itemOriginal?.produto) continue;

            // Debitar do depósito central
            const novaQtdOrigem = Math.max(0, itemOriginal.produto.quantidade - item.quantidadeRecebida);
            await supabase
                .from("produtos")
                .update({ quantidade: novaQtdOrigem })
                .eq("id", itemOriginal.produto_id);

            // Verificar se produto já existe na loja destino (mesmo código)
            const { data: produtoDestino } = await supabase
                .from("produtos")
                .select("id, quantidade")
                .eq("codigo", itemOriginal.produto.codigo)
                .eq("empresa_id", transf.empresa_destino_id)
                .eq("ativo", true)
                .maybeSingle();

            if (produtoDestino) {
                // Produto já existe na loja — somar quantidade
                await supabase
                    .from("produtos")
                    .update({ quantidade: produtoDestino.quantidade + item.quantidadeRecebida })
                    .eq("id", produtoDestino.id);
            } else {
                // Criar cópia do produto na loja destino
                const { data: produtoOrigem } = await supabase
                    .from("produtos")
                    .select("*")
                    .eq("id", itemOriginal.produto_id)
                    .single();

                if (produtoOrigem) {
                    const { id, created_at, ...rest } = produtoOrigem;
                    await supabase.from("produtos").insert({
                        ...rest,
                        empresa_id: transf.empresa_destino_id,
                        quantidade: item.quantidadeRecebida,
                    });
                }
            }
        }

        // Atualizar status da transferência
        const novoStatus = parcial ? "recebido_parcial" : "recebido";
        const { error } = await supabase
            .from("transferencias_estoque")
            .update({
                status: novoStatus,
                recebido_por: user?.user?.id,
                data_recebimento: new Date().toISOString(),
                motivo_parcial: parcial ? motivoParcial : null,
            })
            .eq("id", transferenciaId);

        await fetchTransferencias();
        return { error };
    };

    const cancelarTransferencia = async (transferenciaId: string, motivo: string) => {
        const { error } = await supabase
            .from("transferencias_estoque")
            .update({
                status: "cancelado",
                motivo_cancelamento: motivo,
            })
            .eq("id", transferenciaId);

        await fetchTransferencias();
        return { error };
    };

    const marcarEnviado = async (transferenciaId: string) => {
        const { error } = await supabase
            .from("transferencias_estoque")
            .update({
                status: "em_transito",
                data_envio: new Date().toISOString(),
            })
            .eq("id", transferenciaId);

        await fetchTransferencias();
        return { error };
    };

    return {
        transferencias,
        loading,
        fetchTransferencias,
        criarTransferencia,
        buscarPorProtocolo,
        confirmarRecebimento,
        cancelarTransferencia,
        marcarEnviado,
    };
}
