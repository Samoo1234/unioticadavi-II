"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Paciente } from "@/data/mockData";

export function usePacientes() {
    const [listaPacientes, setListaPacientes] = useState<Paciente[]>([]);
    const [carregando, setCarregando] = useState(false);
    const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
    const [termoBusca, setTermoBusca] = useState("");

    const adaptarDados = useCallback((data: any[]): Paciente[] => {
        return data.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            telefone: p.telefone,
            email: p.email || "",
            cpf: p.cpf || "",
            dataNascimento: p.data_nascimento || "",
            ultimaConsulta: p.created_at,
            nomePai: p.nome_pai || "",
            nomeMae: p.nome_mae || "",
            enderecoCompleto: p.endereco_completo || "",
            enderecoLogradouro: p.endereco_logradouro || "",
            enderecoNumero: p.endereco_numero || "",
            enderecoBairro: p.endereco_bairro || "",
            enderecoCidade: p.endereco_cidade || "",
            enderecoEstado: p.endereco_estado || "",
            enderecoCep: p.endereco_cep || "",
            enderecoComplemento: p.endereco_complemento || "",
            rg: p.rg || "",
            observacoes: p.observacoes || ""
        }));
    }, []);

    const buscarPacientes = useCallback(async (termo: string) => {
        setCarregando(true);
        const { data, error } = await supabase
            .from('pacientes')
            .select('*')
            .ilike('nome', `%${termo}%`)
            .order('nome')
            .limit(20);

        if (!error && data) {
            setListaPacientes(adaptarDados(data));
        }
        setCarregando(false);
    }, [adaptarDados]);

    // Debounced search
    useEffect(() => {
        if (termoBusca.length < 3) {
            setListaPacientes([]);
            return;
        }
        const timer = setTimeout(() => {
            buscarPacientes(termoBusca);
        }, 300);
        return () => clearTimeout(timer);
    }, [termoBusca, buscarPacientes]);

    const salvarPaciente = async (dadosDaView: any) => {
        const payload = {
            nome: dadosDaView.nome,
            telefone: dadosDaView.telefone,
            email: dadosDaView.email,
            cpf: dadosDaView.cpf,
            data_nascimento: dadosDaView.dataNascimento || null,
            nome_pai: dadosDaView.nomePai,
            nome_mae: dadosDaView.nomeMae,
            endereco_completo: `${dadosDaView.enderecoLogradouro}, ${dadosDaView.enderecoNumero} - ${dadosDaView.enderecoBairro}, ${dadosDaView.enderecoCidade} - ${dadosDaView.enderecoEstado}`,
            endereco_logradouro: dadosDaView.enderecoLogradouro,
            endereco_numero: dadosDaView.enderecoNumero,
            endereco_bairro: dadosDaView.enderecoBairro,
            endereco_cidade: dadosDaView.enderecoCidade,
            endereco_estado: dadosDaView.enderecoEstado,
            endereco_cep: dadosDaView.enderecoCep,
            endereco_complemento: dadosDaView.enderecoComplemento,
            rg: dadosDaView.rg,
            observacoes: dadosDaView.observacoes
        };

        if (dadosDaView.id) {
            const { error } = await supabase.from('pacientes').update(payload).eq('id', dadosDaView.id);
            if (error) return { error };
            return { data: { id: dadosDaView.id }, error: null };
        } else {
            const { data, error } = await supabase.from('pacientes').insert(payload).select().single();
            return { data, error };
        }
    };

    return {
        listaPacientes,
        setListaPacientes,
        carregando,
        pacienteSelecionado,
        setPacienteSelecionado,
        termoBusca,
        setTermoBusca,
        salvarPaciente,
        adaptarDados
    };
}
