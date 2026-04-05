"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { StatusEstoque, calcularStatusEstoque } from "@/data/vendasData";

export interface ProdutoDb {
    id: string;
    codigo: string;
    nome: string;
    marca: string;
    tipo: string;
    descricao?: string;
    quantidade: number;
    preco_unitario: number;
    preco_custo: number;
    ncm?: string;
    cest?: string;
    origem?: number;
    empresa_id?: number;
    ativo: boolean;
    empresa?: { id: number; nome_fantasia: string; cidade: string; is_deposito_central: boolean };
}

export interface DepositoCentral {
    id: number;
    nome_fantasia: string;
    cidade: string;
    cnpj: string;
}

export function useEstoque(unidadeSelecionada: string) {
    const [produtosDb, setProdutosDb] = useState<ProdutoDb[]>([]);
    const [loading, setLoading] = useState(true);
    const [depositoCentral, setDepositoCentral] = useState<DepositoCentral | null>(null);

    const fetchDepositoCentral = useCallback(async () => {
        const { data } = await supabase
            .from("empresas")
            .select("id, nome_fantasia, cidade, cnpj")
            .eq("is_deposito_central", true)
            .single();
        if (data) setDepositoCentral(data);
    }, []);

    const fetchProdutos = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from("produtos")
            .select("*, empresa:empresas(id, nome_fantasia, cidade, is_deposito_central)")
            .eq("ativo", true);

        if (unidadeSelecionada !== "geral") {
            query = query.eq("empresa_id", parseInt(unidadeSelecionada));
        }

        const { data, error } = await query.order("nome");

        if (!error && data) {
            setProdutosDb(data as ProdutoDb[]);
        }
        setLoading(false);
    }, [unidadeSelecionada]);

    useEffect(() => {
        fetchProdutos();
        fetchDepositoCentral();
    }, [fetchProdutos, fetchDepositoCentral]);

    const salvarProduto = async (dados: Partial<ProdutoDb>) => {
        const { error } = await supabase.from("produtos").insert(dados);
        if (!error) await fetchProdutos();
        return { error };
    };

    const atualizarProduto = async (id: string, dados: Partial<ProdutoDb>) => {
        const { error } = await supabase.from("produtos").update(dados).eq("id", id);
        if (!error) await fetchProdutos();
        return { error };
    };

    const excluirProduto = async (id: string) => {
        const { error } = await supabase.from("produtos").update({ ativo: false }).eq("id", id);
        if (!error) await fetchProdutos();
        return { error };
    };

    const trocarDepositoCentral = async (novaEmpresaId: number) => {
        // Buscar o depósito atual para migrar os produtos
        const depositoAtualId = depositoCentral?.id;

        // Remover flag da empresa atual
        await supabase.from("empresas").update({ is_deposito_central: false }).eq("is_deposito_central", true);
        // Setar na nova
        const { error } = await supabase.from("empresas").update({ is_deposito_central: true }).eq("id", novaEmpresaId);

        if (!error && depositoAtualId) {
            // Migrar produtos do depósito antigo para o novo
            await supabase
                .from("produtos")
                .update({ empresa_id: novaEmpresaId })
                .eq("empresa_id", depositoAtualId)
                .eq("ativo", true);
        }

        if (!error) {
            await fetchDepositoCentral();
            await fetchProdutos();
        }
        return { error };
    };

    return {
        produtosDb,
        loading,
        depositoCentral,
        fetchProdutos,
        salvarProduto,
        atualizarProduto,
        excluirProduto,
        trocarDepositoCentral,
    };
}
