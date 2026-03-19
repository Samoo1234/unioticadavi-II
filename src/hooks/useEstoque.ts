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
}

export function useEstoque(unidadeSelecionada: string) {
    const [produtosDb, setProdutosDb] = useState<ProdutoDb[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProdutos = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('produtos').select('*').eq('ativo', true);

        if (unidadeSelecionada !== "geral") {
            query = query.eq('empresa_id', parseInt(unidadeSelecionada));
        }

        const { data, error } = await query.order('nome');

        if (!error && data) {
            setProdutosDb(data);
        }
        setLoading(false);
    }, [unidadeSelecionada]);

    useEffect(() => {
        fetchProdutos();
    }, [fetchProdutos]);

    const salvarProduto = async (dados: Partial<ProdutoDb>) => {
        const { error } = await supabase.from('produtos').insert(dados);
        if (!error) await fetchProdutos();
        return { error };
    };

    const atualizarProduto = async (id: string, dados: Partial<ProdutoDb>) => {
        const { error } = await supabase.from('produtos').update(dados).eq('id', id);
        if (!error) await fetchProdutos();
        return { error };
    };

    const excluirProduto = async (id: string) => {
        const { error } = await supabase.from('produtos').update({ ativo: false }).eq('id', id);
        if (!error) await fetchProdutos();
        return { error };
    };

    return {
        produtosDb,
        loading,
        fetchProdutos,
        salvarProduto,
        atualizarProduto,
        excluirProduto
    };
}
