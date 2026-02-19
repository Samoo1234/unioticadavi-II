"use client";

import { useState, useEffect, useMemo } from "react";
import MainLayout from "@/components/MainLayout";
import EntryList from "@/components/financeiro/EntryList";
import ExitList from "@/components/financeiro/ExitList";
import CashSummary from "@/components/financeiro/CashSummary";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
    Entrada,
    Saida,
    Caixa,
    getDataAtual,
    getHoraAtual,
} from "@/data/financeiroData";
import { imprimirRelatorioFinanceiro } from "@/utils/reportUtils";

export default function FinanceiroPage() {
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

    const fetchEmpresas = async () => {
        const { data } = await supabase.from('empresas').select('id, nome_fantasia, cidade').eq('ativo', true);
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
                // Assuming vendas table has empresa_id, if not, we'll need to handle it
                // Based on vendas/page.tsx it might not have empresa_id in some versions, 
                // but usually it should. Let's check VendasPage again.
                // In VendasPage line 119: query.eq('empresa_id', empresaSelecionada.id)
                // So it HAS empresa_id.
                queryVendas = queryVendas.eq('empresa_id', empresaId);
            }
            const { data: vendas } = await queryVendas;

            // 2. Buscar Financeiro Agendamentos
            // We need to join with agendamentos to filter by date and empresa
            let queryFinAgend = supabase
                .from('financeiro_agendamentos')
                .select('*, agendamentos!inner(data, empresa_id, pacientes(nome))')
                .eq('agendamentos.data', dateStr);

            if (empresaId) {
                queryFinAgend = queryFinAgend.eq('agendamentos.empresa_id', empresaId);
            }
            const { data: finAgend } = await queryFinAgend;

            // 3. Buscar Movimentações Financeiras (A nova tabela)
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

            // De Agendamentos
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

            // De Movimentações Financeiras (Incluindo Baixas de Vendas e Entradas Manuais)
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

            // 4. Buscar Status do Caixa (Persistente)
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
                    // Se não existir, reseta para fechado com saldo do dia anterior ou 0
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
                // Visão Geral - Consolidado
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

    // Recalcular Totais e Sincronizar Caixa
    const { totalEntradas, totalSaidas, totalFaturamento, totalRecebido, totaisPorEmpresa } = useMemo(() => {
        const tSaidas = saidas.reduce((acc, s) => acc + s.valor, 0);

        // Faturamento = Tudo que foi vendido (Vista + Prazo) + Outros
        const tFaturamento = entradas.reduce((acc, e) => acc + e.valor, 0);

        // Recebido (Caixa) = Tudo exceto Venda (A Prazo)
        const tRecebido = entradas
            .filter(e => e.origem !== "Venda (A Prazo)")
            .reduce((acc, e) => acc + e.valor, 0);

        // Agrupar por empresa se for visão geral
        const porEmpresa: Record<number, { faturamento: number, recebido: number, saídas: number }> = {};
        if (unidadeSelecionada === 'geral') {
            entradas.forEach(e => {
                const eid = e.empresa_id;
                if (eid) {
                    if (!porEmpresa[eid]) {
                        porEmpresa[eid] = { faturamento: 0, recebido: 0, saídas: 0 };
                    }
                    porEmpresa[eid].faturamento += e.valor;
                    if (e.origem !== "Venda (A Prazo)") {
                        porEmpresa[eid].recebido += e.valor;
                    }
                }
            });
            saidas.forEach(s => {
                const eid = s.empresa_id;
                if (eid) {
                    if (!porEmpresa[eid]) {
                        porEmpresa[eid] = { faturamento: 0, recebido: 0, saídas: 0 };
                    }
                    porEmpresa[eid].saídas += s.valor;
                }
            });
        }

        return {
            totalEntradas: tRecebido, // O Caixa usa o que foi realmente recebido
            totalSaidas: tSaidas,
            totalFaturamento: tFaturamento,
            totalRecebido: tRecebido,
            totaisPorEmpresa: porEmpresa
        };
    }, [entradas, saidas, unidadeSelecionada]);

    // Atualizar o objeto caixa quando as dependências mudarem
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
            const { error } = await supabase
                .from('financeiro_movimentacoes')
                .insert({
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
            const { error } = await supabase
                .from('financeiro_movimentacoes')
                .insert({
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
            const { data: novoCaixa, error } = await supabase
                .from('caixas')
                .insert({
                    empresa_id: empresaId,
                    data: dataSelecionada,
                    status: 'aberto',
                    saldo_inicial: saldoInicial,
                    aberto_em: new Date().toISOString(),
                    operador: 'ADMIN'
                })
                .select()
                .single();

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
            const { error } = await supabase
                .from('caixas')
                .update({
                    status: 'fechado',
                    fechado_em: new Date().toISOString(),
                    total_entradas: totalEntradas,
                    total_saidas: totalSaidas,
                    saldo_final: caixa.saldoInicial + totalEntradas - totalSaidas
                })
                .eq('id', caixa.id);

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

            // Gerar relatório profissional no estilo TSO
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

        // As we don't have the specific saldoInicial for each unit in the general view easily (unless we fetch caixas for all)
        // We'll estimate or just show movement
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
                saldoInicial: 0, // In general view we don't track base for each unless we fetch.
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

    const isAberto = caixa.status === "aberto";

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header do Financeiro */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div>
                                <div className="text-xs text-gray-500">MÓDULO</div>
                                <div className="text-lg font-bold text-white">FINANCEIRO</div>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>

                            {/* Seletores de Filtro */}
                            <div className="flex items-center gap-4">
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">UNIDADE</div>
                                    <select
                                        value={unidadeSelecionada}
                                        disabled={!!profile?.unit_id}
                                        onChange={(e) => setUnidadeSelecionada(e.target.value)}
                                        className={`bg-transparent border-none text-sm font-bold text-white p-0 focus:outline-none transition-all ${profile?.unit_id ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:text-green-500'}`}
                                    >
                                        {!profile?.unit_id && <option value="geral" className="bg-gray-900 text-white">TODAS AS LOJAS</option>}
                                        {listaEmpresas.map(emp => (
                                            <option key={emp.id} value={emp.id} className="bg-gray-900 text-white">{emp.nome_fantasia.toUpperCase()}{emp.cidade ? ` - ${emp.cidade.toUpperCase()}` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="h-8 w-px bg-gray-800"></div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">DATA EXIBIDA</div>
                                    <input
                                        type="date"
                                        value={dataSelecionada}
                                        onChange={(e) => setDataSelecionada(e.target.value)}
                                        className="bg-transparent border-none text-sm font-bold text-white p-0 focus:outline-none cursor-pointer hover:text-green-500 transition-all [color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            <div className="h-8 w-px bg-gray-700"></div>
                            <div>
                                <div className="text-xs text-gray-500">CAIXA</div>
                                <div className={`text-sm font-medium ${isAberto ? "text-green-500" : "text-red-500"}`}>
                                    {isAberto ? "ABERTO" : "FECHADO"}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-xs text-gray-500">DATA/HORA ATUAL</div>
                                <div className="text-sm font-mono text-white">{dataHora}</div>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500">OPERADOR</div>
                                <div className="text-sm text-white">ADMIN</div>
                            </div>
                        </div>
                    </div>

                    {/* Mensagem de feedback */}
                    {mensagem && (
                        <div className={`mt-4 px-4 py-2 text-sm font-medium ${mensagem.tipo === "sucesso"
                            ? "bg-green-900/50 border border-green-700 text-green-400"
                            : mensagem.tipo === "erro"
                                ? "bg-red-900/50 border border-red-700 text-red-400"
                                : "bg-yellow-900/50 border border-yellow-700 text-yellow-400"
                            }`}>
                            {mensagem.texto}
                        </div>
                    )}
                </div>

                {/* Layout 3 Colunas */}
                <div className={`flex-1 grid grid-cols-12 gap-4 min-h-0 ${carregando ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-300 relative`}>
                    {carregando && (
                        <div className="absolute inset-0 flex items-center justify-center z-50">
                            <div className="bg-gray-900/80 px-6 py-3 border border-gray-700 rounded shadow-xl">
                                <div className="text-sm font-bold text-white flex items-center gap-3">
                                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent animate-spin rounded-full"></div>
                                    CARREGANDO DADOS...
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Coluna 1 - Entradas (Esquerda) */}
                    <div className="col-span-4">
                        <EntryList
                            entradas={entradas}
                            caixaAberto={isAberto}
                            onAddEntrada={handleAddEntrada}
                        />
                    </div>

                    {/* Coluna 2 - Caixa do Dia (Centro - Foco Principal) */}
                    <div className="col-span-4">
                        <CashSummary
                            caixa={caixa}
                            onAbrirCaixa={handleAbrirCaixa}
                            onFecharCaixa={handleFecharCaixa}
                            totalFaturamento={totalFaturamento}
                            totalRecebido={totalRecebido}
                            totaisPorEmpresa={totaisPorEmpresa}
                            listaEmpresas={listaEmpresas}
                            onImprimirRelatorio={handleImprimirRelatorio}
                            onImprimirRelatorioUnidade={handleImprimirRelatorioUnidade}
                        />
                    </div>

                    {/* Coluna 3 - Saídas (Direita) */}
                    <div className="col-span-4">
                        <ExitList
                            saidas={saidas}
                            caixaAberto={isAberto}
                            onAddSaida={handleAddSaida}
                        />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
