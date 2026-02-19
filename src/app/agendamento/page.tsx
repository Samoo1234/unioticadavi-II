"use client";

import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";
import { agendaHoje, Consulta } from "@/data/mockData";
import { ConfiguracaoHorarios } from "@/data/empresasData";
import { RegistroFinanceiroAgendamento, TipoFinanceiroAgendamento, SituacaoFinanceiroAgendamento, PagamentoAgendamento, FormaPagamento, formasPagamento } from "@/data/financeiroData";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { formatarMoeda, parseMoeda } from "@/utils/monetary";
import { imprimirRelatorioAgendamentoCompleto, ReportAgendamentoData, imprimirRelatorioListaOperacional, ReportAgendaOperacionalData } from "@/utils/reportUtils";
import { useAuth } from "@/contexts/AuthContext";

function StatusBadge({ status }: { status: string }) {
    const cores: Record<string, string> = {
        confirmado: "bg-green-500/20 text-green-500 border-green-500/50",
        aguardando: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
        atrasado: "bg-red-500/20 text-red-500 border-red-500/50",
        cancelado: "bg-gray-500/20 text-gray-500 border-gray-500/50",
        atendido: "bg-blue-500/20 text-blue-500 border-blue-500/50",
    };

    const labels: Record<string, string> = {
        confirmado: "CONFIRMADO",
        aguardando: "AGUARDANDO",
        atrasado: "ATRASADO",
        cancelado: "CANCELADO",
        atendido: "ATENDIDO",
    };

    const cor = cores[status] || "bg-gray-500/20 text-gray-400 border-gray-500/50";
    const label = labels[status] || status?.toUpperCase() || "DESCONHECIDO";

    return (
        <span className={`px-2 py-0.5 text-xs font-bold border ${cor}`}>
            {label}
        </span>
    );
}

// Gerar próximos 30 dias
function gerarDatas(): { value: string; label: string }[] {
    const datas = [];
    for (let i = 0; i < 30; i++) {
        const data = new Date();
        data.setDate(data.getDate() + i);
        datas.push({
            value: data.toISOString().split("T")[0],
            label: data.toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
            }).toUpperCase(),
        });
    }
    return datas;
}

// Adicionar minutos a um horário
function adicionarMinutos(horario: string, minutos: number): string {
    const [h, m] = horario.split(":").map(Number);
    const totalMinutos = h * 60 + m + minutos;
    const novaHora = Math.floor(totalMinutos / 60);
    const novosMinutos = totalMinutos % 60;
    return `${novaHora.toString().padStart(2, "0")}:${novosMinutos.toString().padStart(2, "0")}`;
}

// Gerar horários baseados na configuração da empresa
function gerarHorariosDisponiveis(config: ConfiguracaoHorarios | undefined): string[] {
    if (!config) {
        // Horários padrão se não houver configuração
        return [
            "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
            "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
            "16:00", "16:30", "17:00", "17:30",
        ];
    }

    const horarios: string[] = [];

    config.turnos
        .filter((t) => t.ativo)
        .forEach((turno) => {
            let horaAtual = turno.inicio;
            while (horaAtual < turno.fim) {
                horarios.push(horaAtual);
                horaAtual = adicionarMinutos(horaAtual, config.intervaloMinutos);
            }
        });

    return horarios;
}

// Gerar datas disponíveis baseadas na configuração da empresa
function gerarDatasDisponiveis(config: ConfiguracaoHorarios | undefined): { value: string; label: string; medico?: string; medico_id?: number }[] {
    if (!config || config.diasDisponiveis.length === 0) {
        // Se não houver configuração, retornar vazio — datas devem ser inseridas na página Empresas
        return [];
    }

    const hoje = new Date().toISOString().split("T")[0];

    return config.diasDisponiveis
        .filter((d) => d.data >= hoje)
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((d) => ({
            value: d.data,
            label: new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
            }).toUpperCase(),
            medico: d.medicoResponsavel,
            medico_id: d.medico_id,
        }));
}


function AgendamentoContent() {
    const { profile, user } = useAuth();
    const searchParams = useSearchParams();
    const pacienteUrl = searchParams.get("paciente");

    const [listaEmpresas, setListaEmpresas] = useState<any[]>([]);
    const [agenda, setAgenda] = useState<Consulta[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [mostrarForm, setMostrarForm] = useState(false);
    const [view, setView] = useState<"agenda" | "financeiro">("agenda");
    const [registrosFin, setRegistrosFin] = useState<RegistroFinanceiroAgendamento[]>([]);
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
    const [editandoId, setEditandoId] = useState<string | number | null>(null);
    const [financeiroIndividualId, setFinanceiroIndividualId] = useState<string | number | null>(null);

    // Filtros
    const [filtroEmpresaId, setFiltroEmpresaId] = useState<number>(profile?.unit_id || 0);
    const [filtroData, setFiltroData] = useState<string>(new Date().toISOString().split("T")[0]);

    // Fetch empresas
    useEffect(() => {
        if (profile?.unit_id) {
            setFiltroEmpresaId(profile.unit_id);
        }
    }, [profile]);

    useEffect(() => {
        fetchEmpresas();
    }, []);

    const fetchEmpresas = async () => {
        const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .order('id');


        if (!error && data) {
            const adapted = data.map(e => ({
                id: e.id,
                nomeFantasia: e.nome_fantasia,
                cidade: e.cidade,
                configuracaoHorarios: e.configuracao_horarios,
                ativo: e.ativo
            }));
            setListaEmpresas(adapted);
            if (adapted.length > 0 && filtroEmpresaId === 0) {
                // Se o perfil tiver unit_id, ele já foi setado no useEffect do profile. 
                // Se não, e se quisermos forçar a primeira loja:
                setFiltroEmpresaId(adapted[0].id);
            }
        } else {
            console.error("DEBUG: Erro ao buscar empresas", error);
            setMensagem({ tipo: 'erro', texto: `Fetch Error: ${JSON.stringify(error)}` });
        }
    };

    // Fetch agendamentos
    useEffect(() => {
        if (filtroEmpresaId > 0 && filtroData) {
            fetchAgendamentos();
        }
    }, [filtroEmpresaId, filtroData]);

    const fetchFinanceiroData = async (agendamentos: Consulta[]) => {
        if (agendamentos.length === 0) {
            setRegistrosFin([]);
            return;
        }

        const agendamentoIds = agendamentos.map(c => c.id);
        const { data: finData, error } = await supabase
            .from('financeiro_agendamentos')
            .select('*')
            .in('id', agendamentoIds);

        if (error) {
            console.error("Erro ao buscar dados financeiros:", error);
            // Não sobrescrever estado se houver erro
            return;
        }

        const novosRegistros: RegistroFinanceiroAgendamento[] = agendamentos.map(c => {
            const extra = finData?.find(f => f.id === c.id);
            return {
                id: c.id,
                pacienteNome: c.pacienteNome,
                valorTotal: extra?.valor_total || 0,
                tipo: extra?.tipo_financeiro || "",
                pagamentos: extra?.pagamentos || [],
                situacao: extra?.situacao || "",
                observacoes: extra?.observacoes || ""
            };
        });
        setRegistrosFin(novosRegistros);
    };

    const fetchAgendamentos = async () => {
        setCarregando(true);
        const { data, error } = await supabase
            .from('agendamentos')
            .select('*, pacientes(*)')
            .eq('empresa_id', filtroEmpresaId)
            .eq('data', filtroData)
            .order('hora');

        if (!error && data) {
            const adapted: Consulta[] = data.map((a: any) => ({
                id: a.id,
                empresaId: a.empresa_id,
                data: a.data,
                hora: a.hora.substring(0, 5),
                pacienteId: a.paciente_id,
                pacienteNome: a.pacientes?.nome || 'Desconhecido',
                tipo: a.tipo as any,
                status: a.status as any
            }));
            setAgenda(adapted);

            if (view === "financeiro") {
                await fetchFinanceiroData(adapted);
            }
        }
        setCarregando(false);
    };

    // Form state
    const [formData, setFormData] = useState({
        empresaId: 0,
        data: "",
        horario: "",
        pacienteNome: "",
        pacienteId: null as string | null,
        telefone: "",
    });

    // Estado para autocomplete de pacientes
    const [sugestoesPacientes, setSugestoesPacientes] = useState<{ id: string; nome: string; telefone?: string }[]>([]);
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
    const [buscandoPacientes, setBuscandoPacientes] = useState(false);
    const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
    const [buscandoHorarios, setBuscandoHorarios] = useState(false);

    // Buscar pacientes no banco (com debounce)
    const buscarPacientes = async (termo: string) => {
        if (termo.length < 2) {
            setSugestoesPacientes([]);
            setMostrarSugestoes(false);
            return;
        }

        setBuscandoPacientes(true);
        const { data, error } = await supabase
            .from('pacientes')
            .select('id, nome, telefone')
            .ilike('nome', `%${termo}%`)
            .limit(8);

        if (!error && data) {
            setSugestoesPacientes(data);
            setMostrarSugestoes(data.length > 0);
        }
        setBuscandoPacientes(false);
    };

    // Debounce para busca
    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.pacienteNome && !formData.pacienteId) {
                buscarPacientes(formData.pacienteNome);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [formData.pacienteNome]);

    // Buscar horários ocupados para a data/unidade selecionada no formulário
    useEffect(() => {
        if (formData.empresaId && formData.data) {
            fetchHorariosOcupados();
        } else {
            setHorariosOcupados([]);
        }
    }, [formData.empresaId, formData.data]);

    const fetchHorariosOcupados = async () => {
        setBuscandoHorarios(true);
        try {
            const { data, error } = await supabase
                .from('agendamentos')
                .select('hora')
                .eq('empresa_id', formData.empresaId)
                .eq('data', formData.data)
                .neq('status', 'cancelado');

            if (!error && data) {
                // Formatar para HH:MM
                const occupied = data.map(a => a.hora.substring(0, 5));
                console.log('[Agendamento] Horários ocupados encontrados:', occupied, 'para data:', formData.data, 'empresa:', formData.empresaId);

                // Se estiver editando, permitir o próprio horário atual
                if (editandoId) {
                    const atual = agenda.find(c => c.id === editandoId);
                    if (atual && atual.data === formData.data && atual.empresaId === formData.empresaId) {
                        const filtered = occupied.filter(h => h !== atual.hora);
                        console.log('[Agendamento] Editando - removendo horário atual:', atual.hora, 'ocupados finais:', filtered);
                        setHorariosOcupados(filtered);
                        return;
                    }
                }

                setHorariosOcupados(occupied);
            } else if (error) {
                console.error('[Agendamento] Erro ao buscar horários ocupados:', error);
            }
        } catch (err) {
            console.error("Erro ao buscar horários ocupados:", err);
        } finally {
            setBuscandoHorarios(false);
        }
    };

    // Selecionar paciente da lista
    const handleSelecionarPaciente = (paciente: { id: string; nome: string; telefone?: string }) => {
        setFormData({
            ...formData,
            pacienteNome: paciente.nome,
            pacienteId: paciente.id,
            telefone: paciente.telefone || formData.telefone
        });
        setMostrarSugestoes(false);
        setSugestoesPacientes([]);
    };

    // Detectar paciente da URL
    useEffect(() => {
        if (pacienteUrl) {
            setFormData(prev => ({ ...prev, pacienteNome: pacienteUrl }));
            setMostrarForm(true);
        }
    }, [pacienteUrl]);

    // Empresa selecionada
    const empresaSelecionada = useMemo(() => {
        return listaEmpresas.find((e) => e.id === formData.empresaId);
    }, [formData.empresaId, listaEmpresas]);

    // Unidades ativas
    // Unidades ativas
    const unidades = useMemo(() => {
        return listaEmpresas
            .filter((e) => e.ativo)
            .map((e) => ({
                id: e.id,
                label: `${e.nomeFantasia} - ${e.cidade}`,
                temHorarios: !!e.configuracaoHorarios?.diasDisponiveis?.length
            }));
    }, [listaEmpresas]);

    // Datas disponíveis baseadas na empresa selecionada
    const datasDisponiveis = useMemo(() => {
        return gerarDatasDisponiveis(empresaSelecionada?.configuracaoHorarios);
    }, [empresaSelecionada]);

    // Horários disponíveis baseados na empresa selecionada
    const horariosDisponiveis = useMemo(() => {
        return gerarHorariosDisponiveis(empresaSelecionada?.configuracaoHorarios);
    }, [empresaSelecionada]);

    // Médico do dia selecionado
    const medicoDoDia = useMemo(() => {
        const diaConfig = empresaSelecionada?.configuracaoHorarios?.diasDisponiveis?.find(
            (d: any) => d.data === formData.data
        );
        return {
            nome: diaConfig?.medicoResponsavel || "",
            id: diaConfig?.medico_id || null,
        };
    }, [empresaSelecionada, formData.data]);

    // Agenda filtrada para a listagem
    const agendaFiltrada = useMemo(() => {
        return agenda.filter((c) => {
            const bateEmpresa = filtroEmpresaId === 0 || c.empresaId === filtroEmpresaId;
            const bateData = !filtroData || c.data === filtroData;
            return bateEmpresa && bateData;
        }).sort((a, b) => a.hora.localeCompare(b.hora));
    }, [agenda, filtroEmpresaId, filtroData]);

    // Empresa selecionada para o filtro (usa dados do Supabase)
    const empresaFiltro = useMemo(() => {
        return listaEmpresas.find((e) => e.id === filtroEmpresaId);
    }, [filtroEmpresaId, listaEmpresas]);

    // Datas disponíveis para o filtro (baseadas na loja selecionada)
    const datasDisponiveisFiltro = useMemo(() => {
        const datasAgenda = (filtroEmpresaId === 0)
            ? Array.from(new Set(agenda.map(c => c.data))).sort()
            : Array.from(new Set(agenda.filter(c => c.empresaId === filtroEmpresaId).map(c => c.data))).sort();

        // Datas configuradas na empresa
        const datasConfig = gerarDatasDisponiveis(empresaFiltro?.configuracaoHorarios);

        // Merge: datas config + datas com agendamentos existentes (sem duplicar)
        const datasConfigValues = new Set(datasConfig.map(d => d.value));
        const datasExtras = datasAgenda
            .filter(d => !datasConfigValues.has(d))
            .map(d => ({
                value: d,
                label: new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                }).toUpperCase(),
                medico: undefined as string | undefined
            }));

        return [...datasConfig, ...datasExtras].sort((a, b) => a.value.localeCompare(b.value));
    }, [empresaFiltro, agenda, filtroEmpresaId]);

    const mostrarMensagem = (tipo: "sucesso" | "erro", texto: string) => {
        setMensagem({ tipo, texto });
        setTimeout(() => setMensagem(null), 3000);
    };

    const handleConfirmar = async (id: string | number) => {
        const { error } = await supabase
            .from('agendamentos')
            .update({ status: 'confirmado' })
            .eq('id', id);

        if (!error) {
            fetchAgendamentos();
        }
    };

    const handleCancelar = async (id: string | number) => {
        const { error } = await supabase
            .from('agendamentos')
            .update({ status: 'cancelado' })
            .eq('id', id);

        if (!error) {
            fetchAgendamentos();
        }
    };

    const handleReagendar = (id: string | number) => {
        const agendamento = agenda.find(c => c.id === id);
        if (agendamento) {
            setFormData({
                empresaId: agendamento.empresaId,
                data: agendamento.data,
                horario: agendamento.hora,
                pacienteNome: agendamento.pacienteNome,
                pacienteId: agendamento.pacienteId ? String(agendamento.pacienteId) : null,
                telefone: "",
            });
            setEditandoId(id);
            setMostrarForm(true);
        }
    };

    const handleNovoAgendamento = () => {
        setMostrarForm(true);
        setEditandoId(null);
        setFormData({
            empresaId: profile?.unit_id || 0,
            data: "",
            horario: "",
            pacienteNome: "",
            pacienteId: null,
            telefone: "",
        });
        setSugestoesPacientes([]);
        setMostrarSugestoes(false);
    };

    const handleSalvarAgendamento = async () => {
        if (!formData.empresaId || !formData.data || !formData.horario || !formData.pacienteNome) {
            mostrarMensagem("erro", "PREENCHA TODOS OS CAMPOS OBRIGATÓRIOS");
            return;
        }

        try {
            // 1. Determinar pacienteId - usar existente do formData ou criar novo
            let pacienteId = formData.pacienteId;

            if (!pacienteId) {
                // Paciente não foi selecionado do autocomplete - criar novo
                const { data: novoPaciente, error: erroP } = await supabase
                    .from('pacientes')
                    .insert({
                        nome: formData.pacienteNome.trim(),
                        telefone: formData.telefone
                    })
                    .select('id')
                    .single();

                if (erroP) throw erroP;
                pacienteId = novoPaciente.id;
            }

            // 2. Verificar conflito de horário (Double check)
            let queryConflito = supabase
                .from('agendamentos')
                .select('id')
                .eq('empresa_id', formData.empresaId)
                .eq('data', formData.data)
                .eq('hora', formData.horario)
                .neq('status', 'cancelado');

            if (editandoId) {
                queryConflito = queryConflito.neq('id', editandoId);
            }

            const { data: conflitos, error: erroC } = await queryConflito;

            if (erroC) throw erroC;
            if (conflitos && conflitos.length > 0) {
                mostrarMensagem("erro", "ESTE HORÁRIO JÁ FOI OCUPADO POR OUTRO AGENDAMENTO");
                fetchHorariosOcupados(); // Atualizar lista de ocupados
                return;
            }

            // 3. Salvar Agendamento
            if (editandoId) {
                const { error } = await supabase
                    .from('agendamentos')
                    .update({
                        empresa_id: formData.empresaId,
                        data: formData.data,
                        hora: formData.horario,
                        medico_id: medicoDoDia.id,
                        status: "aguardando"
                    })
                    .eq('id', editandoId);

                if (error) throw error;
                mostrarMensagem("sucesso", "AGENDAMENTO ATUALIZADO COM SUCESSO");
            } else {
                const { error } = await supabase
                    .from('agendamentos')
                    .insert({
                        paciente_id: pacienteId,
                        empresa_id: formData.empresaId,
                        data: formData.data,
                        hora: formData.horario,
                        tipo: "Consulta",
                        medico_id: medicoDoDia.id,
                        status: "aguardando"
                    });

                if (error) throw error;
                mostrarMensagem("sucesso", "AGENDAMENTO CRIADO COM SUCESSO");
            }

            // 3. Finalizar
            fetchAgendamentos();
            setMostrarForm(false);
            setEditandoId(null);
            setFormData({ empresaId: 0, data: "", horario: "", pacienteNome: "", pacienteId: null, telefone: "" });

        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            mostrarMensagem("erro", "ERRO AO SALVAR AGENDAMENTO: " + error.message);
        }
    };

    const handleCancelarForm = () => {
        setMostrarForm(false);
        setFormData({ empresaId: 0, data: "", horario: "", pacienteNome: "", pacienteId: null, telefone: "" });
    };

    const handleAbrirFinanceiro = async () => {
        setFinanceiroIndividualId(null);
        // Filtrar agendamentos cancelados - não devem aparecer no financeiro
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
            if (reg.id === registroId) {
                return {
                    ...reg,
                    pagamentos: [...reg.pagamentos, { forma: "Dinheiro", valor: 0 }]
                };
            }
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
        setRegistrosFin(prev => prev.map(reg => {
            if (reg.id === registroId) {
                return { ...reg, [field]: value };
            }
            return reg;
        }));
    };

    const handleSalvarFinanceiro = async (registroId: string | number) => {
        const registro = registrosFin.find(r => r.id === registroId);
        if (!registro) return;

        try {
            const { data: savedData, error } = await supabase
                .from('financeiro_agendamentos')
                .upsert({
                    id: registroId,
                    valor_total: registro.valorTotal,
                    tipo_financeiro: registro.tipo,
                    situacao: registro.situacao,
                    observacoes: registro.observacoes,
                    pagamentos: registro.pagamentos
                })
                .select()
                .single();

            if (error) throw error;

            // Atualizar estado com dados confirmados do banco
            setRegistrosFin(prev => prev.map(reg => {
                if (reg.id === registroId && savedData) {
                    return {
                        ...reg,
                        valorTotal: savedData.valor_total,
                        tipo: savedData.tipo_financeiro,
                        situacao: savedData.situacao,
                        observacoes: savedData.observacoes,
                        pagamentos: savedData.pagamentos
                    };
                }
                return reg;
            }));

            mostrarMensagem("sucesso", "REGISTRO FINANCEIRO SALVO COM SUCESSO");
        } catch (error: any) {
            console.error("Erro ao salvar financeiro:", error);
            mostrarMensagem("erro", "ERRO AO SALVAR FINANCEIRO: " + error.message);
        }
    };

    const handleImprimirAgendamentoCompleto = () => {
        const tipos: TipoFinanceiroAgendamento[] = ["Particular", "Convênio", "Campanha", "Exames", "Revisão"];
        const resumoPorTipo = tipos.map(t => {
            const filtrados = registrosFin.filter(r => r.tipo === t);
            return {
                tipo: t,
                qtd: filtrados.length,
                total: filtrados.reduce((acc, r) => acc + (r.valorTotal || 0), 0)
            };
        }).filter(t => t.qtd > 0);

        const formas: FormaPagamento[] = ["Dinheiro", "Cartao Debito", "Cartao Credito", "PIX", "Boleto", "Outros"];
        const resumoPorPagamento = formas.map(f => {
            let count = 0;
            let total = 0;
            registrosFin.forEach(r => {
                const pagamentosDessaForma = r.pagamentos.filter(p => p.forma === f);
                if (pagamentosDessaForma.length > 0) {
                    count += pagamentosDessaForma.length;
                    total += pagamentosDessaForma.reduce((acc, p) => acc + p.valor, 0);
                }
            });
            return { forma: f, qtd: count, total: total };
        }).filter(f => f.qtd > 0);

        const dataRelatorio: ReportAgendamentoData = {
            titulo: "RESUMO DE AGENDAMENTO FINANCEIRO",
            data: new Date(filtroData + "T12:00:00").toLocaleDateString('pt-BR'),
            unidade: empresaFiltro?.nomeFantasia || "TODAS AS UNIDADES",
            operador: "ADMIN",
            medico: medicoDoDia.nome || "",
            resumoPorTipo,
            resumoPorPagamento,
            registros: registrosFin.map(r => ({
                pacienteNome: r.pacienteNome,
                valorTotal: r.valorTotal,
                tipo: r.tipo || "",
                pagamentos: r.pagamentos,
                situacao: r.situacao || "",
                observacoes: r.observacoes
            }))
        };

        imprimirRelatorioAgendamentoCompleto(dataRelatorio);
    };

    const handleImprimirAgenda = async () => {
        // Encontrar o médico RESPONSÁVEL DO DIA pelo filtro
        const diaConfig = empresaFiltro?.configuracaoHorarios?.diasDisponiveis?.find(
            (d: any) => d.data === filtroData
        );
        const nomeMedico = diaConfig?.medicoResponsavel || "";

        // Obter telefones dos pacientes (não está na lista principal, precisamos buscar ou assumir que o mock ou join traria)
        // A consulta atual já tem: `pacientes(*)` no fetchAgendamentos

        // Mapear dados
        const dadosRelatorio: ReportAgendaOperacionalData = {
            titulo: "AGENDA DO DIA",
            data: new Date(filtroData + "T12:00:00").toLocaleDateString('pt-BR'),
            unidade: empresaFiltro?.nomeFantasia || "TODAS AS UNIDADES",
            operador: profile?.nome || "ADMIN",
            registros: agendaFiltrada.map(agd => {
                // Encontrar o objeto original no `data` do Supabase se precisarmos de mais campos, 
                // mas `fetchAgendamentos` já fez o join. 
                // O estado `agenda` tem: id, empresaId, data, hora, pacienteId, pacienteNome, tipo, status.
                // Precisamos recuperar o telefone e observações.
                // Como `agenda` é `Consulta[]` (mockData type), precisamos ver se temos acesso ao objeto completo.
                // No `fetchAgendamentos`, fizemos map manual. Vamos ajustar o map lá ou aqui.
                // Por segurança e rapidez, vamos fazer um fetch rápido ou tentar recuperar do estado se possível.
                // Melhor: vamos assumir que o `agenda` é suficiente, mas telefone pode faltar.
                // OBS: O `Consulta` interface no mockData pode não ter telefone. 
                // Vamos tentar pegar do `sugestoesPacientes` se tiver em cache ou aceitar sem telefone por enquanto.
                // Para fazer direito, o ideal seria o `fetchAgendamentos` trazer o telefone.

                return {
                    hora: agd.hora,
                    pacienteNome: agd.pacienteNome,
                    telefone: "", // Ajustaremos o fetch se necessário, ou deixamos vazio
                    medico: nomeMedico,
                    status: agd.status,
                    observacoes: "" // Também não está no adapter atual
                };
            })
        };

        // Vamos fazer um fetch dedicated para ter todos os dados corretos para o relatório
        // para garantir que telefone e observações apareçam.
        try {
            const { data, error } = await supabase
                .from('agendamentos')
                .select('*, pacientes(nome, telefone)')
                .eq('empresa_id', filtroEmpresaId)
                .eq('data', filtroData)
                .order('hora');

            if (!error && data) {
                const registrosCompletos = data.map((item: any) => ({
                    hora: item.hora.substring(0, 5),
                    pacienteNome: item.pacientes?.nome || 'Desconhecido',
                    telefone: item.pacientes?.telefone || '',
                    medico: nomeMedico,
                    status: item.status,
                    observacoes: '' // Observações do agendamento não existem no schema ? Vamos verificar. O schema tem `observacoes`?
                    // No `financeiro_agendamentos` tem observacoes. No `agendamentos` tabela, não vi no código anterior. 
                    // Mas no `pacientes` tem observacoes.
                }));

                dadosRelatorio.registros = registrosCompletos;
            }
        } catch (err) {
            console.error("Erro ao buscar dados completos para relatório", err);
        }

        imprimirRelatorioListaOperacional(dadosRelatorio);
    };

    const getDiaSemana = (dataStr: string) => {
        const data = new Date(dataStr + "T12:00:00");
        return data.toLocaleDateString("pt-BR", { weekday: "long" }).replace(/^\w/, (c) => c.toUpperCase());
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Título */}
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
                            <button
                                onClick={handleImprimirAgenda}
                                className="px-4 py-2 bg-purple-900 border border-purple-700 text-sm font-medium text-white hover:bg-purple-800 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                IMPRIMIR AGENDA
                            </button>
                        )}
                        {view === "agenda" && !mostrarForm && profile?.roles?.name === 'Administrador' && (
                            <button
                                onClick={handleAbrirFinanceiro}
                                className="px-4 py-2 bg-blue-900 border border-blue-700 text-sm font-medium text-white hover:bg-blue-800"
                            >
                                FINANCEIRO DO DIA
                            </button>
                        )}
                        {view === "financeiro" && !financeiroIndividualId && (
                            <button
                                onClick={handleImprimirAgendamentoCompleto}
                                className="px-4 py-2 bg-green-900 border border-green-700 text-sm font-medium text-white hover:bg-green-800"
                            >
                                IMPRIMIR RESUMO COMPLETO
                            </button>
                        )}
                        {!mostrarForm ? (
                            view === "agenda" ? (
                                <button
                                    onClick={handleNovoAgendamento}
                                    className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700"
                                >
                                    + NOVO AGENDAMENTO
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        setView("agenda");
                                        setFinanceiroIndividualId(null);
                                    }}
                                    className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700"
                                >
                                    ← VOLTAR
                                </button>
                            )
                        ) : (
                            <button
                                onClick={handleCancelarForm}
                                className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700"
                            >
                                ← VOLTAR
                            </button>
                        )}
                    </div>
                </div>

                {/* Mensagem */}
                {mensagem && (
                    <div className={`px-4 py-2 text-sm font-medium ${mensagem.tipo === "sucesso"
                        ? "bg-green-900/50 border border-green-700 text-green-400"
                        : "bg-red-900/50 border border-red-700 text-red-400"
                        }`}>
                        {mensagem.texto}
                    </div>
                )}

                {/* Formulário de Novo Agendamento */}
                {mostrarForm && (
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="text-xs font-bold text-gray-400 mb-4 pb-2 border-b border-gray-700">
                            {editandoId ? "REAGENDAR ATENDIMENTO" : "NOVO AGENDAMENTO"}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {/* Cidade/Unidade */}
                            <div>
                                <label htmlFor="unidade" className="text-xs text-gray-500 block mb-1">
                                    UNIDADE <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="unidade"
                                    value={formData.empresaId}
                                    disabled={!!profile?.unit_id}
                                    onChange={(e) => setFormData({ ...formData, empresaId: Number(e.target.value), data: "", horario: "" })}
                                    className={`w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none ${profile?.unit_id ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {!profile?.unit_id && <option value={0}>Selecione uma unidade</option>}
                                    {unidades.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.label} {u.temHorarios ? "✓" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Data */}
                            <div>
                                <label htmlFor="data" className="text-xs text-gray-500 block mb-1">
                                    DATA <span className="text-red-500">*</span>
                                    {medicoDoDia.nome && (
                                        <span className="text-green-500 ml-2">({medicoDoDia.nome})</span>
                                    )}
                                </label>
                                <select
                                    id="data"
                                    value={formData.data}
                                    onChange={(e) => setFormData({ ...formData, data: e.target.value, horario: "" })}
                                    className={`w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none ${!formData.empresaId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!formData.empresaId}
                                >
                                    <option value="">
                                        {formData.empresaId ? "Selecione uma data" : "Selecione a unidade primeiro"}
                                    </option>
                                    {datasDisponiveis.map((d) => (
                                        <option key={d.value} value={d.value}>
                                            {d.label} {d.medico ? `(${d.medico})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Horário */}
                            <div>
                                <label htmlFor="horario" className="text-xs text-gray-500 block mb-1">
                                    HORÁRIO <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="horario"
                                    value={formData.horario}
                                    onChange={(e) => setFormData({ ...formData, horario: e.target.value })}
                                    className={`w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none ${!formData.data || buscandoHorarios ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    disabled={!formData.data || buscandoHorarios}
                                >
                                    <option value="">
                                        {buscandoHorarios ? "Buscando disponibilidade..." : formData.data ? "Selecione um horário" : "Selecione a data primeiro"}
                                    </option>
                                    {horariosDisponiveis.map((h) => {
                                        const ocupado = horariosOcupados.includes(h);
                                        return (
                                            <option key={h} value={h} disabled={ocupado} style={ocupado ? { color: '#9ca3af' } : {}}>
                                                {h} {ocupado ? "(OCUPADO)" : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Nome do Paciente */}
                            <div className="relative">
                                <label htmlFor="pacienteNome" className="text-xs text-gray-500 block mb-1">
                                    NOME DO PACIENTE <span className="text-red-500">*</span>
                                    {formData.pacienteId && (
                                        <span className="text-green-500 ml-2">(Paciente existente)</span>
                                    )}
                                    {buscandoPacientes && (
                                        <span className="text-yellow-500 ml-2">Buscando...</span>
                                    )}
                                </label>
                                <input
                                    id="pacienteNome"
                                    autoComplete="off"
                                    type="text"
                                    value={formData.pacienteNome}
                                    onChange={(e) => {
                                        setFormData({ ...formData, pacienteNome: e.target.value, pacienteId: null });
                                    }}
                                    onFocus={() => {
                                        if (sugestoesPacientes.length > 0) setMostrarSugestoes(true);
                                    }}
                                    onBlur={() => {
                                        // Delay para permitir clique na sugestão
                                        setTimeout(() => setMostrarSugestoes(false), 200);
                                    }}
                                    placeholder="Digite o nome do paciente"
                                    className={`w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none ${!formData.horario ? 'opacity-70 cursor-pointer' : ''}`}
                                />
                                {/* Dropdown de sugestões */}
                                {mostrarSugestoes && sugestoesPacientes.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 max-h-48 overflow-y-auto">
                                        {sugestoesPacientes.map((paciente) => (
                                            <div
                                                key={paciente.id}
                                                onClick={() => handleSelecionarPaciente(paciente)}
                                                className="px-3 py-2 cursor-pointer hover:bg-gray-800 border-b border-gray-800 last:border-0"
                                            >
                                                <div className="text-sm text-white">{paciente.nome}</div>
                                                {paciente.telefone && (
                                                    <div className="text-xs text-gray-500">{paciente.telefone}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {!formData.pacienteId && formData.pacienteNome.length >= 2 && !buscandoPacientes && sugestoesPacientes.length === 0 && (
                                    <div className="text-xs text-yellow-500 mt-1">
                                        Novo paciente - será cadastrado automaticamente
                                    </div>
                                )}
                            </div>

                            {/* Telefone */}
                            <div>
                                <label htmlFor="telefone" className="text-xs text-gray-500 block mb-1">TELEFONE</label>
                                <input
                                    id="telefone"
                                    type="tel"
                                    value={formData.telefone}
                                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                    className={`w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none ${!formData.horario ? 'opacity-70 cursor-pointer' : ''}`}
                                />
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-700 flex gap-3">
                            <button
                                onClick={handleSalvarAgendamento}
                                className="px-4 py-2 bg-green-700 border border-green-600 text-sm font-medium text-white hover:bg-green-600"
                            >
                                {editandoId ? "CONFIRMAR REAGENDAMENTO" : "CONFIRMAR AGENDAMENTO"}
                            </button>
                            <button
                                onClick={handleCancelarForm}
                                className="px-4 py-2 bg-gray-800 border border-gray-600 text-sm font-medium text-white hover:bg-gray-700"
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                )}

                {/* Resumo */}
                {view === "agenda" && (
                    <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500"></span>
                            <span className="text-gray-400">
                                Confirmadas: {agendaFiltrada.filter((c) => c.status === "confirmado").length}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-yellow-500"></span>
                            <span className="text-gray-400">
                                Aguardando: {agendaFiltrada.filter((c) => c.status === "aguardando").length}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500"></span>
                            <span className="text-gray-400">
                                Atrasadas: {agendaFiltrada.filter((c) => c.status === "atrasado").length}
                            </span>
                        </div>
                    </div>
                )}

                {!mostrarForm && view === "agenda" && (
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end bg-gray-900 border border-gray-800 p-3 sm:p-4">
                        <div className="flex-1 min-w-0 sm:w-64">
                            <label className="text-[10px] text-gray-500 block mb-1 font-black uppercase tracking-widest">UNIDADE</label>
                            <select
                                value={filtroEmpresaId}
                                disabled={!!profile?.unit_id}
                                onChange={(e) => {
                                    setFiltroEmpresaId(Number(e.target.value));
                                }}
                                className={`w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none ${profile?.unit_id ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {!profile?.unit_id && <option value={0}>Todas as unidades</option>}
                                {unidades.map((u) => (
                                    <option key={u.id} value={u.id}>{u.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-0 sm:w-56">
                            <label className="text-[10px] text-gray-500 block mb-1 font-black uppercase tracking-widest">DATA</label>
                            <select
                                value={filtroData}
                                onChange={(e) => setFiltroData(e.target.value)}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                            >
                                <option value="">Selecione uma data</option>
                                {datasDisponiveisFiltro.map((d) => (
                                    <option key={d.value} value={d.value}>
                                        {d.label} {d.medico ? `(${d.medico})` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={() => {
                                if (!profile?.unit_id) setFiltroEmpresaId(0);
                                setFiltroData(new Date().toISOString().split("T")[0]);
                            }}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                        >
                            LIMPAR
                        </button>
                    </div>
                )}

                {/* Tabela de Agendamento */}
                {view === "agenda" ? (
                    <div className="bg-transparent lg:bg-gray-900 lg:border lg:border-gray-800">
                        {/* Mobile View: Cards */}
                        <div className="lg:hidden space-y-3">
                            {carregando ? (
                                <div className="p-8 text-center text-gray-500 text-sm">Carregando...</div>
                            ) : agendaFiltrada.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm bg-gray-900 border border-gray-800">Nenhum agendamento.</div>
                            ) : (
                                agendaFiltrada.map((consulta) => (
                                    <div key={consulta.id} className={`bg-gray-900 border-l-4 p-4 shadow-sm border-gray-800 ${consulta.status === 'confirmado' ? 'border-l-green-600' :
                                        consulta.status === 'aguardando' ? 'border-l-yellow-600' :
                                            consulta.status === 'atrasado' ? 'border-l-red-600' : 'border-l-gray-600'
                                        } ${consulta.status === 'cancelado' ? 'opacity-60' : ''}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-mono text-emerald-500 font-bold">{consulta.hora}</div>
                                            <StatusBadge status={consulta.status} />
                                        </div>
                                        <div className="text-white font-bold mb-1 uppercase tracking-tight">{consulta.pacienteNome}</div>
                                        <div className="text-xs text-gray-500 mb-4">{consulta.tipo}</div>

                                        {consulta.status !== "cancelado" && (
                                            <div className="flex flex-wrap gap-2">
                                                {profile?.roles?.name === 'Administrador' && (
                                                    <button
                                                        onClick={() => handleAbrirFinanceiroIndividual(consulta)}
                                                        className="flex-1 py-1.5 text-[10px] font-black bg-blue-600/10 border border-blue-600/30 text-blue-500 hover:bg-blue-600/20"
                                                    >
                                                        FINANCEIRO
                                                    </button>
                                                )}
                                                {consulta.status !== "confirmado" && (
                                                    <button
                                                        onClick={() => handleConfirmar(consulta.id)}
                                                        className="flex-1 py-1.5 text-[10px] font-black bg-green-600/10 border border-green-600/30 text-green-500 hover:bg-green-600/20"
                                                    >
                                                        OK
                                                    </button>
                                                )}
                                                {consulta.status !== "confirmado" && (
                                                    <button
                                                        onClick={() => handleReagendar(consulta.id)}
                                                        className="flex-1 py-1.5 text-[10px] font-black bg-yellow-600/10 border border-yellow-600/30 text-yellow-500 hover:bg-yellow-600/20"
                                                    >
                                                        REAGER.
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleCancelar(consulta.id)}
                                                    className="flex-1 py-1.5 text-[10px] font-black bg-red-600/10 border border-red-600/30 text-red-500 hover:bg-red-600/20"
                                                >
                                                    CANCEL.
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Desktop View: Table */}
                        <table className="w-full hidden lg:table">
                            <thead>
                                <tr className="border-b border-gray-800 text-left">
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 w-20 tracking-widest">HORA</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 tracking-widest">PACIENTE</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 w-28 tracking-widest">TIPO</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 w-32 tracking-widest">STATUS</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-500 w-72 tracking-widest text-center">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {carregando ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">Carregando...</td>
                                    </tr>
                                ) : agendaFiltrada.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">Nenhum agendamento.</td>
                                    </tr>
                                ) : (
                                    agendaFiltrada.map((consulta) => (
                                        <tr key={consulta.id} className={`border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors ${consulta.status === "cancelado" ? "opacity-40" : ""}`}>
                                            <td className="px-4 py-4 text-sm font-mono text-emerald-500 font-bold">{consulta.hora}</td>
                                            <td className="px-4 py-4 text-sm text-gray-200 font-medium uppercase tracking-tight">{consulta.pacienteNome}</td>
                                            <td className="px-4 py-4 text-xs text-gray-500 font-bold">{consulta.tipo}</td>
                                            <td className="px-4 py-4"><StatusBadge status={consulta.status} /></td>
                                            <td className="px-4 py-4">
                                                {consulta.status !== "cancelado" && (
                                                    <div className="flex justify-center gap-1.5">
                                                        {profile?.roles?.name === 'Administrador' && (
                                                            <button onClick={() => handleAbrirFinanceiroIndividual(consulta)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" title="Financeiro">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            </button>
                                                        )}
                                                        {consulta.status !== "confirmado" && (
                                                            <button onClick={() => handleConfirmar(consulta.id)} className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors" title="Confirmar">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                            </button>
                                                        )}
                                                        {consulta.status !== "confirmado" && (
                                                            <button onClick={() => handleReagendar(consulta.id)} className="p-2 text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors" title="Reagendar">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleCancelar(consulta.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Cancelar">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Tabela Financeira */
                    <div className="bg-gray-900 border border-gray-800 overflow-x-auto">
                        <table className="w-full min-w-[1200px]">
                            <thead>
                                <tr className="border-b border-gray-800 text-left bg-gray-800/30">
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase w-32">R$</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase w-40">Tipo</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase w-80">Forma de Pagamento</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase w-40">Situação</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Observações</th>
                                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase w-32 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registrosFin.map((reg) => {
                                    const totalPagamentos = reg.pagamentos.reduce((acc, p) => acc + p.valor, 0);

                                    return (
                                        <tr key={reg.id} className="border-b border-gray-800 hover:bg-gray-800/20 transition-colors">
                                            <td className="px-4 py-4 text-sm font-medium text-white uppercase">{reg.pacienteNome}</td>
                                            <td className="px-4 py-4">
                                                <input
                                                    type="text"
                                                    value={formatarMoeda(reg.valorTotal)}
                                                    onChange={(e) => handleUpdateRegistro(reg.id, "valorTotal", parseMoeda(e.target.value))}
                                                    className="w-full bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none text-right font-mono"
                                                    placeholder="0,00"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <select
                                                    value={reg.tipo}
                                                    onChange={(e) => handleUpdateRegistro(reg.id, "tipo", e.target.value as TipoFinanceiroAgendamento)}
                                                    className="w-full bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                                >
                                                    <option value="">Selecione</option>
                                                    <option value="Particular">Particular</option>
                                                    <option value="Convênio">Convênio</option>
                                                    <option value="Campanha">Campanha</option>
                                                    <option value="Exames">Exames</option>
                                                    <option value="Revisão">Revisão</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-2">
                                                    {reg.pagamentos.map((pag, idx) => (
                                                        <div key={idx} className="flex gap-2 items-center">
                                                            <select
                                                                value={pag.forma}
                                                                onChange={(e) => handleUpdatePagamento(reg.id, idx, "forma", e.target.value as FormaPagamento)}
                                                                className="flex-1 bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-xs"
                                                            >
                                                                {formasPagamento.map(f => (
                                                                    <option key={f.id} value={f.nome}>{f.nome}</option>
                                                                ))}
                                                            </select>
                                                            <input
                                                                type="text"
                                                                value={formatarMoeda(pag.valor)}
                                                                onChange={(e) => handleUpdatePagamento(reg.id, idx, "valor", parseMoeda(e.target.value))}
                                                                className="w-24 bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-xs text-right font-mono"
                                                                placeholder="0,00"
                                                            />
                                                            <button
                                                                onClick={() => handleRemovePagamento(reg.id, idx)}
                                                                className="p-1.5 bg-gray-700/50 text-gray-400 hover:text-red-500"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => handleAddPagamento(reg.id)}
                                                        className="w-full py-2 px-3 bg-[#0a0f2c] border border-blue-900/50 text-white text-xs font-bold hover:bg-[#151c4d] flex items-center justify-center gap-2"
                                                    >
                                                        <span className="text-lg leading-none">+</span> ADICIONAR FORMA DE PAGAMENTO
                                                    </button>
                                                    <div className="text-xs font-bold mt-1">
                                                        <span className="text-blue-400">Total: R$ / R$ {totalPagamentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                        {totalPagamentos === reg.valorTotal && reg.valorTotal > 0 && (
                                                            <span className="text-green-500 ml-1">✓</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <select
                                                    value={reg.situacao}
                                                    onChange={(e) => handleUpdateRegistro(reg.id, "situacao", e.target.value as SituacaoFinanceiroAgendamento)}
                                                    className="w-full bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                                >
                                                    <option value="">Selecione</option>
                                                    <option value="Caso Clínico">Caso Clínico</option>
                                                    <option value="Efetivação">Efetivação</option>
                                                    <option value="Perda">Perda</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-4">
                                                <input
                                                    type="text"
                                                    value={reg.observacoes}
                                                    onChange={(e) => handleUpdateRegistro(reg.id, "observacoes", e.target.value)}
                                                    className="w-full bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                                    placeholder="..."
                                                />
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <button
                                                    onClick={() => handleSalvarFinanceiro(reg.id)}
                                                    className="px-6 py-2 bg-[#0a0f2c] border border-blue-900/50 text-white text-xs font-bold hover:bg-blue-900 transition-colors uppercase"
                                                >
                                                    Salvar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Seção de Resumo - Apenas na visão financeira do dia (não individual) */}
                {view === "financeiro" && !financeiroIndividualId && (
                    <div className="mt-8 space-y-6">
                        <h2 className="text-lg font-bold text-white uppercase tracking-tight">Resumo</h2>
                        <div className="grid grid-cols-2 gap-8">
                            {/* Por Tipo */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400 uppercase">Por Tipo</h3>
                                <table className="w-full text-sm text-left border border-gray-800 bg-gray-900/50">
                                    <thead>
                                        <tr className="border-b border-gray-800 bg-gray-800/30">
                                            <th className="px-4 py-2 font-medium text-gray-400">Tipo</th>
                                            <th className="px-4 py-2 font-medium text-gray-400">Quantidade</th>
                                            <th className="px-4 py-2 font-medium text-gray-400">Total (R$)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {(["Particular", "Convênio", "Campanha", "Exames", "Revisão"] as TipoFinanceiroAgendamento[]).map(t => {
                                            const filtrados = registrosFin.filter(r => r.tipo === t);
                                            const total = filtrados.reduce((acc, r) => acc + (r.valorTotal || 0), 0);
                                            return (
                                                <tr key={t} className="text-gray-300">
                                                    <td className="px-4 py-2 uppercase">{t}</td>
                                                    <td className="px-4 py-2">{filtrados.length}</td>
                                                    <td className="px-4 py-2">{total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-gray-800/20 font-bold text-white">
                                            <td className="px-4 py-2">Total</td>
                                            <td className="px-4 py-2">{registrosFin.length}</td>
                                            <td className="px-4 py-2">
                                                {registrosFin.reduce((acc, r) => acc + (r.valorTotal || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Por Forma de Pagamento */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400 uppercase">Por Forma de Pagamento</h3>
                                <table className="w-full text-sm text-left border border-gray-800 bg-gray-900/50">
                                    <thead>
                                        <tr className="border-b border-gray-800 bg-gray-800/30">
                                            <th className="px-4 py-2 font-medium text-gray-400">Forma de Pagamento</th>
                                            <th className="px-4 py-2 font-medium text-gray-400">Quantidade</th>
                                            <th className="px-4 py-2 font-medium text-gray-400">Total (R$)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {(["Dinheiro", "Cartão", "PIX"] as FormaPagamento[]).map(f => {
                                            let count = 0;
                                            let total = 0;
                                            registrosFin.forEach(r => {
                                                const pagamentosDessaForma = r.pagamentos.filter(p => p.forma === f);
                                                if (pagamentosDessaForma.length > 0) {
                                                    count += pagamentosDessaForma.length;
                                                    total += pagamentosDessaForma.reduce((acc, p) => acc + p.valor, 0);
                                                }
                                            });
                                            return (
                                                <tr key={f} className="text-gray-300">
                                                    <td className="px-4 py-2 uppercase">{f}</td>
                                                    <td className="px-4 py-2">{count}</td>
                                                    <td className="px-4 py-2">{total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout >
    );
}

export default function AgendamentoPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <AgendamentoContent />
        </Suspense>
    );
}
