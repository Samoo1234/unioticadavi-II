import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Entrada, Saida, Caixa, getDataAtual, getHoraAtual } from "@/data/financeiroData";
import { imprimirRelatorioFinanceiro } from "@/utils/reportUtils";

export function useFinanceiro() {
    const { profile } = useAuth();
    const [dataSelecionada, setDataSelecionada] = useState<string>(getDataAtual());
    const [entradas, setEntradas] = useState<Entrada[]>([]);
    const [saidas, setSaidas] = useState<Saida[]>([]);
    const [caixa, setCaixa] = useState<Caixa>({
        id: 0,
        data: dataSelecionada,
        status: "fechado",
        saldoInicial: 0,
        totalEntradas: 0,
        totalSaidas: 0,
        saldoFinal: 0,
        operador: "ADMIN"
    });
    const [dataHora, setDataHora] = useState("");
    const [carregando, setCarregando] = useState(true);
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro" | "info"; texto: string } | null>(null);

    // Filtros
    const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>(
        profile?.unit_id ? String(profile.unit_id) : "geral"
    );
    const [listaEmpresas, setListaEmpresas] = useState<any[]>([]);

    useEffect(() => {
        if (profile?.unit_id) {
            setUnidadeSelecionada(String(profile.unit_id));
        }
    }, [profile]);

    useEffect(() => {
        fetchEmpresas();
    }, []);

    useEffect(() => {
        fetchData();
    }, [unidadeSelecionada, dataSelecionada]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setDataHora(now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchEmpresas = async () => {
        const { data } = await supabase.from('empresas').select('id, nome_fantasia, cidade').eq('ativo', true).order('cidade');
        if (data) setListaEmpresas(data);
    };

    const fetchData = async () => {
        setCarregando(true);
        try {
            const dateStr = dataSelecionada;
            const empresaId = unidadeSelecionada === "geral" ? null : parseInt(unidadeSelecionada);

            // 1. Buscar Vendas
            let queryVendas = supabase
                .from('vendas')
                .select('*, pacientes(nome)')
                .eq('data_venda', dateStr);

            if (empresaId) {
                queryVendas = queryVendas.eq('empresa_id', empresaId);
            }
            const { data: vendas } = await queryVendas;

            // 2. Buscar Financeiro Agendamentos
            let queryFinAgend = supabase
                .from('financeiro_agendamentos')
                .select('*, agendamentos!inner(data, empresa_id, pacientes(nome))')
                .eq('agendamentos.data', dateStr);

            if (empresaId) {
                queryFinAgend = queryFinAgend.eq('agendamentos.empresa_id', empresaId);
            }
            const { data: finAgend } = await queryFinAgend;

            // 3. Buscar Movimentações Financeiras
            let queryMov = supabase
                .from('financeiro_movimentacoes')
                .select('*')
                .eq('data', dateStr);

            if (empresaId) {
                queryMov = queryMov.eq('empresa_id', empresaId);
            }
            const { data: movs } = await queryMov;

            // Processar Entradas
            const novasEntradas: Entrada[] = [];

            finAgend?.forEach(f => {
                f.pagamentos?.forEach((p: any, idx: number) => {
                    novasEntradas.push({
                        id: `agend-${f.id}-${idx}`,
                        data: f.agendamentos.data,
                        hora: "00:00",
                        origem: "Ajuste",
                        descricao: `Atendimento - ${f.agendamentos.pacientes?.nome}`,
                        cliente: f.agendamentos.pacientes?.nome,
                        formaPagamento: p.forma,
                        valor: p.valor,
                        empresa_id: f.agendamentos.empresa_id
                    });
                });
            });

            movs?.filter(m => m.tipo === 'entrada').forEach(m => {
                let origem: any = "Venda";
                if (m.origem_motivo === 'venda_prazo') origem = "Venda (A Prazo)";
                else if (m.descricao.includes("RECEBIMENTO")) origem = "Recebimento";
                else if (m.descricao.includes("VENDA")) origem = "Venda";
                else origem = "Outro";

                novasEntradas.push({
                    id: m.id,
                    data: m.data,
                    hora: m.hora.substring(0, 5),
                    origem: origem,
                    descricao: m.descricao,
                    formaPagamento: m.forma_pagamento as any,
                    valor: m.valor,
                    empresa_id: m.empresa_id
                });
            });

            // Processar Saídas
            const novasSaidas: Saida[] = [];
            movs?.filter(m => m.tipo === 'saida').forEach(m => {
                novasSaidas.push({
                    id: m.id,
                    data: m.data,
                    hora: m.hora.substring(0, 5),
                    motivo: m.origem === 'manual' ? 'Despesa' : m.origem === 'sangria' ? 'Outro' : 'Ajuste',
                    descricao: m.descricao,
                    formaPagamento: m.forma_pagamento as any,
                    valor: m.valor,
                    empresa_id: m.empresa_id
                });
            });

            // 4. Buscar Status do Caixa
            if (empresaId) {
                const { data: caixaDB } = await supabase
                    .from('caixas')
                    .select('*')
                    .eq('data', dateStr)
                    .eq('empresa_id', empresaId)
                    .maybeSingle();

                if (caixaDB) {
                    setCaixa({
                        id: caixaDB.id,
                        data: caixaDB.data,
                        status: caixaDB.status as any,
                        saldoInicial: Number(caixaDB.saldo_inicial),
                        totalEntradas: Number(caixaDB.total_entradas),
                        totalSaidas: Number(caixaDB.total_saidas),
                        saldoFinal: Number(caixaDB.saldo_final),
                        operador: caixaDB.operador || "ADMIN",
                        horaAbertura: caixaDB.aberto_em ? new Date(caixaDB.aberto_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined,
                        horaFechamento: caixaDB.fechado_em ? new Date(caixaDB.fechado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : undefined,
                        empresa_id: caixaDB.empresa_id
                    });
                } else {
                    setCaixa({
                        id: 0,
                        data: dateStr,
                        status: "fechado",
                        saldoInicial: 0,
                        totalEntradas: 0,
                        totalSaidas: 0,
                        saldoFinal: 0,
                        operador: "ADMIN",
                        empresa_id: empresaId
                    });
                }
            } else {
                setCaixa(prev => ({
                    ...prev,
                    data: dateStr,
                    status: "consolidado",
                    id: 'geral'
                }));
            }

            setEntradas(novasEntradas);
            setSaidas(novasSaidas);

        } catch (error) {
            console.error("Erro ao buscar dados financeiros:", error);
        } finally {
            setCarregando(false);
        }
    };

    const { totalEntradas, totalSaidas, totalFaturamento, totalRecebido, totaisPorEmpresa } = useMemo(() => {
        const tSaidas = saidas.reduce((acc, s) => acc + s.valor, 0);
        const tFaturamento = entradas.reduce((acc, e) => acc + e.valor, 0);
        const tRecebido = entradas.filter(e => e.origem !== "Venda (A Prazo)").reduce((acc, e) => acc + e.valor, 0);

        const porEmpresa: Record<number, { faturamento: number, recebido: number, saídas: number }> = {};
        if (unidadeSelecionada === 'geral') {
            entradas.forEach(e => {
                const eid = e.empresa_id;
                if (eid) {
                    if (!porEmpresa[eid]) porEmpresa[eid] = { faturamento: 0, recebido: 0, saídas: 0 };
                    porEmpresa[eid].faturamento += e.valor;
                    if (e.origem !== "Venda (A Prazo)") porEmpresa[eid].recebido += e.valor;
                }
            });
            saidas.forEach(s => {
                const eid = s.empresa_id;
                if (eid) {
                    if (!porEmpresa[eid]) porEmpresa[eid] = { faturamento: 0, recebido: 0, saídas: 0 };
                    porEmpresa[eid].saídas += s.valor;
                }
            });
        }

        return {
            totalEntradas: tRecebido,
            totalSaidas: tSaidas,
            totalFaturamento: tFaturamento,
            totalRecebido: tRecebido,
            totaisPorEmpresa: porEmpresa
        };
    }, [entradas, saidas, unidadeSelecionada]);

    useEffect(() => {
        setCaixa(prev => ({
            ...prev,
            data: dataSelecionada,
            totalEntradas,
            totalSaidas,
            saldoFinal: prev.saldoInicial + totalEntradas - totalSaidas
        }));
    }, [dataSelecionada, totalEntradas, totalSaidas]);

    const handleAddEntrada = async (novaEntrada: Omit<Entrada, "id">) => {
        if (caixa.status !== "aberto") {
            setMensagem({ tipo: "erro", texto: "CAIXA FECHADO. ABRA O CAIXA PARA LANÇAR." });
            return;
        }

        try {
            const { error } = await supabase.from('financeiro_movimentacoes').insert({
                tipo: 'entrada',
                origem_motivo: novaEntrada.origem === 'Suprimento' ? 'suprimento' : 'manual',
                descricao: novaEntrada.descricao,
                valor: novaEntrada.valor,
                forma_pagamento: novaEntrada.formaPagamento,
                empresa_id: unidadeSelecionada === 'geral' ? 1 : parseInt(unidadeSelecionada),
                data: novaEntrada.data,
                hora: novaEntrada.hora
            });

            if (error) throw error;
            fetchData();
            setMensagem({ tipo: "sucesso", texto: "ENTRADA REGISTRADA COM SUCESSO." });
        } catch (error: any) {
            setMensagem({ tipo: "erro", texto: "ERRO AO REGISTRAR ENTRADA: " + error.message });
        }
    };

    const handleAddSaida = async (novaSaida: Omit<Saida, "id">) => {
        if (caixa.status !== "aberto") {
            setMensagem({ tipo: "erro", texto: "CAIXA FECHADO. ABRA O CAIXA PARA LANÇAR." });
            return;
        }

        try {
            const { error } = await supabase.from('financeiro_movimentacoes').insert({
                tipo: 'saida',
                origem_motivo: novaSaida.motivo === 'Sangria' ? 'sangria' : 'manual',
                descricao: novaSaida.descricao,
                valor: novaSaida.valor,
                forma_pagamento: novaSaida.formaPagamento,
                empresa_id: unidadeSelecionada === 'geral' ? 1 : parseInt(unidadeSelecionada),
                data: novaSaida.data,
                hora: novaSaida.hora
            });

            if (error) throw error;
            fetchData();
            setMensagem({ tipo: "sucesso", texto: "SAÍDA REGISTRADA COM SUCESSO." });
        } catch (error: any) {
            setMensagem({ tipo: "erro", texto: "ERRO AO REGISTRAR SAÍDA: " + error.message });
        }
    };

    const handleAbrirCaixa = async (saldoInicial: number) => {
        const empresaId = unidadeSelecionada === 'geral' ? null : parseInt(unidadeSelecionada);
        if (!empresaId) {
            setMensagem({ tipo: "erro", texto: "SELECIONE UMA UNIDADE PARA ABRIR O CAIXA." });
            return;
        }

        try {
            const { data: novoCaixa, error } = await supabase.from('caixas').insert({
                empresa_id: empresaId,
                data: dataSelecionada,
                status: 'aberto',
                saldo_inicial: saldoInicial,
                aberto_em: new Date().toISOString(),
                operador: 'ADMIN'
            }).select().single();

            if (error) throw error;

            setCaixa({
                id: novoCaixa.id,
                data: novoCaixa.data,
                status: "aberto",
                horaAbertura: getHoraAtual(),
                saldoInicial,
                totalEntradas: 0,
                totalSaidas: 0,
                saldoFinal: saldoInicial,
                operador: "ADMIN",
                empresa_id: empresaId
            });

            setMensagem({ tipo: "sucesso", texto: `CAIXA ABERTO COM SUCESSO.` });
        } catch (error: any) {
            setMensagem({ tipo: "erro", texto: "ERRO AO ABRIR CAIXA: " + error.message });
        }
    };

    const handleFecharCaixa = async () => {
        if (!caixa.id || caixa.id === 0) return;

        try {
            const { error } = await supabase.from('caixas').update({
                status: 'fechado',
                fechado_em: new Date().toISOString(),
                total_entradas: totalEntradas,
                total_saidas: totalSaidas,
                saldo_final: caixa.saldoInicial + totalEntradas - totalSaidas
            }).eq('id', caixa.id);

            if (error) throw error;

            setCaixa(prev => ({
                ...prev,
                status: "fechado",
                horaFechamento: getHoraAtual(),
                totalEntradas,
                totalSaidas,
                saldoFinal: prev.saldoInicial + totalEntradas - totalSaidas,
            }));

            setMensagem({ tipo: "info", texto: `CAIXA FECHADO COM SUCESSO.` });

            setTimeout(() => {
                const emp = listaEmpresas.find(e => e.id === parseInt(unidadeSelecionada));
                const unidadeTexto = unidadeSelecionada === 'geral' ? "TODAS AS LOJAS" :
                    emp ? `${emp.nome_fantasia}${emp.cidade ? ` - ${emp.cidade}` : ''}` : "UNIDADE";

                imprimirRelatorioFinanceiro({
                    titulo: "RELATÓRIO DE FECHAMENTO DE CAIXA",
                    subtitulo: "RESUMO DIÁRIO",
                    data: dataSelecionada,
                    hora: getHoraAtual(),
                    unidade: unidadeTexto.toUpperCase(),
                    operador: "ADMIN",
                    resumo: {
                        saldoInicial: caixa.saldoInicial,
                        totalEntradas: totalEntradas,
                        totalSaidas: totalSaidas,
                        saldoFinal: caixa.saldoInicial + totalEntradas - totalSaidas,
                        faturamentoTotal: totalFaturamento,
                        recebidoReal: totalRecebido
                    },
                    entradas: entradas,
                    saidas: saidas,
                    detalhamentoUnidades: totaisPorEmpresa,
                    listaEmpresas: listaEmpresas
                });
            }, 500);
        } catch (error: any) {
            setMensagem({ tipo: "erro", texto: "ERRO AO FECHAR CAIXA: " + error.message });
        }
    };

    const handleImprimirRelatorio = (tipo: "consolidado" | "parcial") => {
        const empSel = listaEmpresas.find(e => e.id === parseInt(unidadeSelecionada));
        const unidadeTexto = unidadeSelecionada === 'geral' ? "TODAS AS LOJAS" :
            empSel ? `${empSel.nome_fantasia}${empSel.cidade ? ` - ${empSel.cidade}` : ''}` : "UNIDADE";

        imprimirRelatorioFinanceiro({
            titulo: tipo === "consolidado" ? "RELATÓRIO CONSOLIDADO DO GRUPO" : "RELATÓRIO FINANCEIRO PARCIAL",
            subtitulo: "MOVIMENTAÇÃO DIÁRIA",
            data: dataSelecionada,
            hora: getHoraAtual(),
            unidade: unidadeTexto.toUpperCase(),
            operador: "ADMIN",
            resumo: {
                saldoInicial: caixa.saldoInicial,
                totalEntradas: totalEntradas,
                totalSaidas: totalSaidas,
                saldoFinal: caixa.saldoInicial + totalEntradas - totalSaidas,
                faturamentoTotal: totalFaturamento,
                recebidoReal: totalRecebido
            },
            entradas: entradas,
            saidas: saidas,
            detalhamentoUnidades: totaisPorEmpresa,
            listaEmpresas: listaEmpresas
        });
    };

    const handleImprimirRelatorioUnidade = (empresaId: number) => {
        const empresa = listaEmpresas.find(e => e.id === empresaId);
        if (!empresa) return;

        const entradasUnidade = entradas.filter(e => e.empresa_id === empresaId);
        const saidasUnidade = saidas.filter(s => s.empresa_id === empresaId);

        const faturamento = entradasUnidade.reduce((acc, e) => acc + e.valor, 0);
        const recebido = entradasUnidade.filter(e => e.origem !== "Venda (A Prazo)").reduce((acc, e) => acc + e.valor, 0);
        const tSaidas = saidasUnidade.reduce((acc, s) => acc + s.valor, 0);

        imprimirRelatorioFinanceiro({
            titulo: `RELATÓRIO FINANCEIRO - ${empresa.nome_fantasia.toUpperCase()}${empresa.cidade ? ` - ${empresa.cidade.toUpperCase()}` : ''}`,
            subtitulo: "MOVIMENTAÇÃO DIÁRIA DA UNIDADE",
            data: dataSelecionada,
            hora: getHoraAtual(),
            unidade: `${empresa.nome_fantasia}${empresa.cidade ? ` - ${empresa.cidade}` : ''}`.toUpperCase(),
            operador: "ADMIN",
            resumo: {
                saldoInicial: 0,
                totalEntradas: recebido,
                totalSaidas: tSaidas,
                saldoFinal: recebido - tSaidas,
                faturamentoTotal: faturamento,
                recebidoReal: recebido
            },
            entradas: entradasUnidade,
            saidas: saidasUnidade
        });
    };

    return {
        profile,
        dataSelecionada, setDataSelecionada,
        entradas, saidas, caixa,
        dataHora, carregando, mensagem, setMensagem,
        unidadeSelecionada, setUnidadeSelecionada,
        listaEmpresas,
        totalEntradas, totalSaidas, totalFaturamento, totalRecebido, totaisPorEmpresa,
        handleAddEntrada, handleAddSaida, handleAbrirCaixa, handleFecharCaixa,
        handleImprimirRelatorio, handleImprimirRelatorioUnidade,
        isAberto: caixa.status === "aberto"
    };
}
