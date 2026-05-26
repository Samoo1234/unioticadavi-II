"use client";

import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";
import { Consulta } from "@/types";
import { RegistroFinanceiroAgendamento, TipoFinanceiroAgendamento, PagamentoAgendamento, FormaPagamento } from "@/data/financeiroData";
import { useState, useMemo, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { imprimirRelatorioAgendamentoCompleto, ReportAgendamentoData, imprimirRelatorioListaOperacional, ReportAgendaOperacionalData } from "@/utils/reportUtils";
import { useAuth } from "@/contexts/AuthContext";
import FeedbackMessage from "@/components/ui/FeedbackMessage";
import AgendamentoForm from "@/components/agendamento/AgendamentoForm";
import AgendaCalendar from "@/components/agendamento/AgendaCalendar";
import AgendaFinanceiro from "@/components/agendamento/AgendaFinanceiro";
import { ConfiguracaoHorarios } from "@/data/empresasData";

function gerarDatasDisponiveisLocal(config: ConfiguracaoHorarios | undefined): { value: string; label: string; medico?: string; medico_id?: number }[] {
    if (!config || config.diasDisponiveis.length === 0) return [];
    const hoje = new Date().toISOString().split("T")[0];
    return config.diasDisponiveis
        .filter((d) => d.data >= hoje)
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((d) => ({
            value: d.data,
            label: new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "short", day: "2-digit", month: "2-digit",
            }).toUpperCase(),
            medico: d.medicoResponsavel,
            medico_id: d.medico_id,
        }));
}

function AgendamentoContent() {
    const { profile } = useAuth();
    const searchParams = useSearchParams();
    const pacienteUrl = searchParams.get("paciente");

    const [listaEmpresas, setListaEmpresas] = useState<any[]>([]);
    const [agenda, setAgenda] = useState<Consulta[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [view, setView] = useState<"agenda" | "financeiro">("agenda");
    const [registrosFin, setRegistrosFin] = useState<RegistroFinanceiroAgendamento[]>([]);
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro" | "info"; texto: string } | null>(null);
    const [editandoId, setEditandoId] = useState<string | number | null>(null);
    const [financeiroIndividualId, setFinanceiroIndividualId] = useState<string | number | null>(null);

    const [filtroEmpresaId, setFiltroEmpresaId] = useState<number>(profile?.unit_id || 0);
    const [filtroData, setFiltroData] = useState<string>(new Date().toISOString().split("T")[0]);
    const [datasRealizadas, setDatasRealizadas] = useState<string[]>([]);

    useEffect(() => {
        if (profile?.unit_id) {
            setFiltroEmpresaId(profile.unit_id);
        } else {
            // Se não tiver unidade fixa, tenta recuperar a última selecionada do localStorage
            const savedUnit = localStorage.getItem('last_selected_unit');
            if (savedUnit) {
                setFiltroEmpresaId(Number(savedUnit));
            }
        }
    }, [profile]);

    const fetchEmpresas = useCallback(async () => {
        const { data, error } = await supabase.from('empresas').select('*').order('id');
        if (!error && data) {
            const adapted = data.map(e => ({
                id: e.id,
                nomeFantasia: e.nome_fantasia,
                cidade: e.cidade,
                configuracaoHorarios: e.configuracao_horarios,
                ativo: e.ativo
            }));
            setListaEmpresas(adapted);
            // Removido o override automático da primeira unidade para respeitar a persistência e o "Todas as unidades"
        } else {
            setMensagem({ tipo: 'erro', texto: `Erro ao buscar empresas: ${JSON.stringify(error)}` });
        }
    }, [filtroEmpresaId]);

    useEffect(() => { fetchEmpresas(); }, [fetchEmpresas]);

    useEffect(() => {
        if (pacienteUrl) {
            setMostrarForm(true);
        }
    }, [pacienteUrl]);

    const fetchFinanceiroData = useCallback(async (agendamentos: Consulta[]) => {
        if (agendamentos.length === 0) { setRegistrosFin([]); return; }
        const agendamentoIds = agendamentos.map(c => c.id);
        const { data: finData, error } = await supabase
            .from('financeiro_agendamentos').select('*').in('id', agendamentoIds);
        if (error) { console.error("Erro ao buscar dados financeiros:", error); return; }

        const novosRegistros: RegistroFinanceiroAgendamento[] = agendamentos.map(c => {
            const extra = finData?.find(f => f.id === c.id);
            return {
                id: c.id, pacienteNome: c.pacienteNome,
                valorTotal: extra?.valor_total || 0, tipo: extra?.tipo_financeiro || "",
                pagamentos: extra?.pagamentos || [], situacao: extra?.situacao || "",
                observacoes: extra?.observacoes || ""
            };
        });
        setRegistrosFin(novosRegistros);
    }, []);

    const fetchAgendamentos = useCallback(async () => {
        setCarregando(true);
        const { data, error } = await supabase
            .from('agendamentos').select('*, pacientes(*)')
            .eq('empresa_id', filtroEmpresaId).eq('data', filtroData)
            .neq('status', 'cancelado')
            .order('hora');

        if (!error && data) {
            const adapted: Consulta[] = data.map((a: any) => ({
                id: a.id, empresaId: a.empresa_id, data: a.data,
                hora: a.hora.substring(0, 5), pacienteId: a.paciente_id,
                pacienteNome: a.pacientes?.nome || 'Desconhecido',
                tipo: a.tipo as any, status: a.status as any
            }));
            setAgenda(adapted);
        }
        setCarregando(false);
    }, [filtroEmpresaId, filtroData]);

    const fetchDatasRealizadas = useCallback(async () => {
        if (!filtroEmpresaId) return;
        try {
            const { data, error } = await supabase
                .from('agendamentos')
                .select('data')
                .eq('empresa_id', filtroEmpresaId)
                .neq('status', 'cancelado')
                .order('data', { ascending: false });

            if (!error && data) {
                const uniqueDates = Array.from(new Set(data.map((item: any) => item.data))) as string[];
                setDatasRealizadas(uniqueDates);
            }
        } catch (err) {
            console.error("Erro ao buscar datas realizadas:", err);
        }
    }, [filtroEmpresaId]);

    // Fetch datas realizadas
    useEffect(() => {
        if (filtroEmpresaId > 0) {
            fetchDatasRealizadas();
        }
    }, [filtroEmpresaId, fetchDatasRealizadas]);

    // Fetch agendamentos
    useEffect(() => {
        if (filtroEmpresaId > 0 && filtroData) fetchAgendamentos();
    }, [filtroEmpresaId, filtroData, fetchAgendamentos]);

    // Derived data
    const unidades = useMemo(() => listaEmpresas.filter(e => e.ativo).map(e => ({
        id: e.id, label: `${e.nomeFantasia} - ${e.cidade}`,
        temHorarios: !!e.configuracaoHorarios?.diasDisponiveis?.length
    })), [listaEmpresas]);

    const agendaFiltrada = useMemo(() => {
        return agenda.filter(c => {
            const bateEmpresa = filtroEmpresaId === 0 || c.empresaId === filtroEmpresaId;
            const bateData = !filtroData || c.data === filtroData;
            return bateEmpresa && bateData;
        }).sort((a, b) => a.hora.localeCompare(b.hora));
    }, [agenda, filtroEmpresaId, filtroData]);

    const empresaFiltro = useMemo(() => listaEmpresas.find(e => e.id === filtroEmpresaId), [filtroEmpresaId, listaEmpresas]);

    const datasDisponiveisFiltro = useMemo(() => {
        const datasAgenda = (filtroEmpresaId === 0)
            ? Array.from(new Set(agenda.map(c => c.data))).sort()
            : Array.from(new Set(agenda.filter(c => c.empresaId === filtroEmpresaId).map(c => c.data))).sort();

        const datasConfig = gerarDatasDisponiveisLocal(empresaFiltro?.configuracaoHorarios);
        const datasConfigValues = new Set(datasConfig.map(d => d.value));
        const datasExtras = datasAgenda
            .filter(d => !datasConfigValues.has(d))
            .map(d => ({
                value: d,
                label: new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
                    weekday: "short", day: "2-digit", month: "2-digit",
                }).toUpperCase(),
                medico: undefined as string | undefined
            }));

        return [...datasConfig, ...datasExtras].sort((a, b) => a.value.localeCompare(b.value));
    }, [empresaFiltro, agenda, filtroEmpresaId]);

    const datasRealizadasFormatadas = useMemo(() => {
        return datasRealizadas.map(dataStr => {
            const dateObj = new Date(dataStr + "T12:00:00");
            const label = dateObj.toLocaleDateString("pt-BR", {
                weekday: "short", day: "2-digit", month: "2-digit", year: "numeric"
            }).toUpperCase();
            return {
                value: dataStr,
                label: label
            };
        });
    }, [datasRealizadas]);

    const medicoDoDia = useMemo(() => {
        const diaConfig = empresaFiltro?.configuracaoHorarios?.diasDisponiveis?.find(
            (d: any) => d.data === filtroData
        );
        return { nome: diaConfig?.medicoResponsavel || "", id: diaConfig?.medico_id || null };
    }, [empresaFiltro, filtroData]);

    // Recarrega dados financeiros automaticamente se a filial ou a data mudarem na tela do financeiro geral
    useEffect(() => {
        if (view === "financeiro" && !financeiroIndividualId) {
            const agendamentosAtivos = agendaFiltrada.filter(c => c.status !== "cancelado");
            fetchFinanceiroData(agendamentosAtivos);
        }
    }, [view, agendaFiltrada, financeiroIndividualId, fetchFinanceiroData]);

    // Handlers
    const mostrarMensagemFn = (tipo: "sucesso" | "erro", texto: string) => {
        setMensagem({ tipo, texto });
        setTimeout(() => setMensagem(null), 3000);
    };

    const handleConfirmar = async (id: string | number) => {
        const { error } = await supabase.from('agendamentos').update({ status: 'confirmado' }).eq('id', id);
        if (!error) fetchAgendamentos();
    };

    const handleCancelar = async (id: string | number) => {
        const { error } = await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('id', id);
        if (!error) fetchAgendamentos();
    };

    const handleReagendar = (id: string | number) => {
        setEditandoId(id);
        setMostrarForm(true);
    };

    const handleNovoAgendamento = () => {
        setMostrarForm(true);
        setEditandoId(null);
    };

    const handleFormSalvar = () => {
        fetchAgendamentos();
        setMostrarForm(false);
        setEditandoId(null);
    };

    const handleCancelarForm = () => {
        setMostrarForm(false);
        setEditandoId(null);
    };

    const handleAbrirFinanceiro = async () => {
        setFinanceiroIndividualId(null);
        const agendamentosAtivos = agendaFiltrada.filter(c => c.status !== "cancelado");
        await fetchFinanceiroData(agendamentosAtivos);
        setView("financeiro");
    };

    const handleAbrirFinanceiroIndividual = async (consulta: Consulta) => {
        setFinanceiroIndividualId(consulta.id);
        await fetchFinanceiroData([consulta]);
        setView("financeiro");
    };

    const handleAddPagamento = (registroId: string | number) => {
        setRegistrosFin(prev => prev.map(reg => {
            if (reg.id === registroId) return { ...reg, pagamentos: [...reg.pagamentos, { forma: "Dinheiro", valor: 0 }] };
            return reg;
        }));
    };

    const handleRemovePagamento = (registroId: string | number, index: number) => {
        setRegistrosFin(prev => prev.map(reg => {
            if (reg.id === registroId) {
                const novosPagamentos = [...reg.pagamentos];
                novosPagamentos.splice(index, 1);
                return { ...reg, pagamentos: novosPagamentos };
            }
            return reg;
        }));
    };

    const handleUpdatePagamento = (registroId: string | number, index: number, field: keyof PagamentoAgendamento, value: any) => {
        setRegistrosFin(prev => prev.map(reg => {
            if (reg.id === registroId) {
                const novosPagamentos = [...reg.pagamentos];
                novosPagamentos[index] = { ...novosPagamentos[index], [field]: value };
                return { ...reg, pagamentos: novosPagamentos };
            }
            return reg;
        }));
    };

    const handleUpdateRegistro = (registroId: string | number, field: keyof RegistroFinanceiroAgendamento, value: any) => {
        setRegistrosFin(prev => prev.map(reg => reg.id === registroId ? { ...reg, [field]: value } : reg));
    };

    const handleSalvarFinanceiro = async (registroId: string | number) => {
        const registro = registrosFin.find(r => r.id === registroId);
        if (!registro) return;
        try {
            const { data: savedData, error } = await supabase
                .from('financeiro_agendamentos')
                .upsert({
                    id: registroId, valor_total: registro.valorTotal,
                    tipo_financeiro: registro.tipo, situacao: registro.situacao,
                    observacoes: registro.observacoes, pagamentos: registro.pagamentos
                }).select().single();

            if (error) throw error;
            setRegistrosFin(prev => prev.map(reg => {
                if (reg.id === registroId && savedData) {
                    return { ...reg, valorTotal: savedData.valor_total, tipo: savedData.tipo_financeiro,
                        situacao: savedData.situacao, observacoes: savedData.observacoes, pagamentos: savedData.pagamentos };
                }
                return reg;
            }));
            mostrarMensagemFn("sucesso", "REGISTRO FINANCEIRO SALVO COM SUCESSO");
        } catch (error: any) {
            mostrarMensagemFn("erro", "ERRO AO SALVAR FINANCEIRO: " + error.message);
        }
    };

    const handleImprimirAgendamentoCompleto = () => {
        const tipos: TipoFinanceiroAgendamento[] = ["Particular", "Convênio", "Campanha", "Exames", "Revisão"];
        const resumoPorTipo = tipos.map(t => {
            const filtrados = registrosFin.filter(r => r.tipo === t);
            return { tipo: t, qtd: filtrados.length, total: filtrados.reduce((acc, r) => acc + (r.valorTotal || 0), 0) };
        }).filter(t => t.qtd > 0);

        const formas: FormaPagamento[] = ["Dinheiro", "Cartao Debito", "Cartao Credito", "PIX", "Boleto", "Outros"];
        const resumoPorPagamento = formas.map(f => {
            let count = 0; let total = 0;
            registrosFin.forEach(r => {
                const pagamentosDessaForma = r.pagamentos.filter(p => p.forma === f);
                if (pagamentosDessaForma.length > 0) { count += pagamentosDessaForma.length; total += pagamentosDessaForma.reduce((acc, p) => acc + p.valor, 0); }
            });
            return { forma: f, qtd: count, total };
        }).filter(f => f.qtd > 0);

        const dataRelatorio: ReportAgendamentoData = {
            titulo: "RESUMO DE AGENDAMENTO FINANCEIRO",
            data: new Date(filtroData + "T12:00:00").toLocaleDateString('pt-BR'),
            unidade: empresaFiltro?.nomeFantasia || "TODAS AS UNIDADES",
            operador: "ADMIN", medico: medicoDoDia.nome || "",
            resumoPorTipo, resumoPorPagamento,
            registros: registrosFin.map(r => ({
                pacienteNome: r.pacienteNome, valorTotal: r.valorTotal, tipo: r.tipo || "",
                pagamentos: r.pagamentos, situacao: r.situacao || "", observacoes: r.observacoes
            }))
        };
        imprimirRelatorioAgendamentoCompleto(dataRelatorio);
    };

    const handleImprimirAgenda = async () => {
        const diaConfig = empresaFiltro?.configuracaoHorarios?.diasDisponiveis?.find((d: any) => d.data === filtroData);
        const nomeMedico = diaConfig?.medicoResponsavel || "";

        const dadosRelatorio: ReportAgendaOperacionalData = {
            titulo: "AGENDA DO DIA",
            data: new Date(filtroData + "T12:00:00").toLocaleDateString('pt-BR'),
            unidade: empresaFiltro?.nomeFantasia || "TODAS AS UNIDADES",
            operador: profile?.nome || "ADMIN",
            registros: agendaFiltrada.map(agd => ({
                hora: agd.hora, pacienteNome: agd.pacienteNome,
                telefone: "", medico: nomeMedico, status: agd.status, observacoes: ""
            }))
        };

        try {
            const { data, error } = await supabase
                .from('agendamentos').select('*, pacientes(nome, telefone)')
                .eq('empresa_id', filtroEmpresaId).eq('data', filtroData)
                .neq('status', 'cancelado')
                .order('hora');

            if (!error && data) {
                dadosRelatorio.registros = data.map((item: any) => ({
                    hora: item.hora.substring(0, 5), pacienteNome: item.pacientes?.nome || 'Desconhecido',
                    telefone: item.pacientes?.telefone || '', medico: nomeMedico,
                    status: item.status, observacoes: ''
                }));
            }
        } catch (err) { console.error("Erro ao buscar dados completos para relatório", err); }

        imprimirRelatorioListaOperacional(dadosRelatorio);
    };

    const getDiaSemana = (dataStr: string) => {
        const data = new Date(dataStr + "T12:00:00");
        return data.toLocaleDateString("pt-BR", { weekday: "long" }).replace(/^\w/, (c) => c.toUpperCase());
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-wide text-white">
                            {view === "agenda" ? "AGENDAMENTO" : financeiroIndividualId ? `Financeiro - ${registrosFin[0]?.pacienteNome || 'Paciente'}` : `Registros Financeiros - ${getDiaSemana(filtroData)}`}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {view === "agenda" ? "Controle de consultas e exames" : financeiroIndividualId ? "Lançamento financeiro do paciente" : "Lançamento financeiro diário"}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {view === "agenda" && !mostrarForm && (
                            <button onClick={handleImprimirAgenda} className="px-4 py-2 bg-purple-900 border border-purple-700 text-sm font-medium text-white hover:bg-purple-800 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                IMPRIMIR AGENDA
                            </button>
                        )}
                        {view === "agenda" && !mostrarForm && (profile?.roles?.name === 'Administrador' || profile?.roles?.name === 'Vendedor') && (
                            <button onClick={handleAbrirFinanceiro} className="px-4 py-2 bg-blue-900 border border-blue-700 text-sm font-medium text-white hover:bg-blue-800">
                                FINANCEIRO DO DIA
                            </button>
                        )}
                        {view === "financeiro" && !financeiroIndividualId && (
                            <button onClick={handleImprimirAgendamentoCompleto} className="px-4 py-2 bg-green-900 border border-green-700 text-sm font-medium text-white hover:bg-green-800">
                                IMPRIMIR RESUMO COMPLETO
                            </button>
                        )}
                        {!mostrarForm ? (
                            view === "agenda" ? (
                                <button onClick={handleNovoAgendamento} className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700">
                                    + NOVO AGENDAMENTO
                                </button>
                            ) : (
                                <button onClick={() => { setView("agenda"); setFinanceiroIndividualId(null); }} className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700">
                                    ← VOLTAR
                                </button>
                            )
                        ) : (
                            <button onClick={handleCancelarForm} className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700">
                                ← VOLTAR
                            </button>
                        )}
                    </div>
                </div>

                <FeedbackMessage mensagem={mensagem} />

                {/* Formulário */}
                {mostrarForm && (
                    <AgendamentoForm
                        empresas={listaEmpresas}
                        editandoId={editandoId}
                        agenda={agenda}
                        onSalvar={handleFormSalvar}
                        onCancelar={handleCancelarForm}
                        mostrarMensagem={mostrarMensagemFn}
                        initialPacienteNome={pacienteUrl || ""}
                    />
                )}

                {/* Resumo de status */}
                {view === "agenda" && (
                    <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500"></span>
                            <span className="text-gray-400">Confirmadas: {agendaFiltrada.filter(c => c.status === "confirmado").length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-yellow-500"></span>
                            <span className="text-gray-400">Aguardando: {agendaFiltrada.filter(c => c.status === "aguardando").length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500"></span>
                            <span className="text-gray-400">Atrasadas: {agendaFiltrada.filter(c => c.status === "atrasado").length}</span>
                        </div>
                    </div>
                )}

                {/* Filtros */}
                {!mostrarForm && !financeiroIndividualId && (
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end bg-gray-900 border border-gray-800 p-3 sm:p-4">
                        <div className="flex-1 min-w-0 sm:w-64">
                            <label className="text-[10px] text-gray-500 block mb-1 font-black uppercase tracking-widest">UNIDADE</label>
                            <select
                                value={filtroEmpresaId}
                                disabled={!!profile?.unit_id}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setFiltroEmpresaId(val);
                                    if (!profile?.unit_id) {
                                        localStorage.setItem('last_selected_unit', val.toString());
                                    }
                                }}
                                className={`w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none ${profile?.unit_id ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {!profile?.unit_id && <option value={0}>Todas as unidades</option>}
                                {unidades.map(u => (<option key={u.id} value={u.id}>{u.label}</option>))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-0 sm:w-56">
                            <label className="text-[10px] text-gray-500 block mb-1 font-black uppercase tracking-widest">DATA</label>
                            {view === "agenda" ? (
                                <select
                                    value={filtroData}
                                    onChange={(e) => setFiltroData(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                >
                                    <option value="">Selecione uma data</option>
                                    {datasDisponiveisFiltro.map(d => (
                                        <option key={d.value} value={d.value}>{d.label} {d.medico ? `(${d.medico})` : ""}</option>
                                    ))}
                                </select>
                            ) : (
                                <select
                                    value={filtroData}
                                    onChange={(e) => setFiltroData(e.target.value)}
                                    className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                >
                                    <option value="">Selecione uma data anterior</option>
                                    {datasRealizadasFormatadas.map(d => (
                                        <option key={d.value} value={d.value}>{d.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <button
                            onClick={() => { if (!profile?.unit_id) setFiltroEmpresaId(0); setFiltroData(new Date().toISOString().split("T")[0]); }}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                        >
                            LIMPAR
                        </button>
                    </div>
                )}

                {/* Conteúdo principal */}
                {view === "agenda" ? (
                    <AgendaCalendar
                        agenda={agendaFiltrada}
                        carregando={carregando}
                        onConfirmar={handleConfirmar}
                        onCancelar={handleCancelar}
                        onReagendar={handleReagendar}
                        onAbrirFinanceiroIndividual={handleAbrirFinanceiroIndividual}
                    />
                ) : (
                    <AgendaFinanceiro
                        registrosFin={registrosFin}
                        onUpdateRegistro={handleUpdateRegistro}
                        onAddPagamento={handleAddPagamento}
                        onRemovePagamento={handleRemovePagamento}
                        onUpdatePagamento={handleUpdatePagamento}
                        onSalvarFinanceiro={handleSalvarFinanceiro}
                        financeiroIndividualId={financeiroIndividualId}
                    />
                )}
            </div>
        </MainLayout>
    );
}

export default function AgendamentoPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <AgendamentoContent />
        </Suspense>
    );
}
