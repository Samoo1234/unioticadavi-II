"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Consulta } from "@/types";
import { ConfiguracaoHorarios } from "@/data/empresasData";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface AgendamentoFormProps {
    empresas: any[];
    editandoId: string | number | null;
    agenda: Consulta[];
    onSalvar: () => void;
    onCancelar: () => void;
    mostrarMensagem: (tipo: "sucesso" | "erro", texto: string) => void;
    initialPacienteNome?: string;
}

interface ExamOption {
    nome: string;
    valor: number;
}

const EXAMES_DISPONIVEIS: ExamOption[] = [
    { nome: "Oct", valor: 400.00 },
    { nome: "Checkup + Oct", valor: 1100.00 },
    { nome: "Checkup + Campimetria", valor: 800.00 },
    { nome: "Topografia", valor: 250.00 },
    { nome: "Campimetria", valor: 250.00 },
    { nome: "Paquimetria", valor: 200.00 },
    { nome: "Gonioscopia", valor: 150.00 },
    { nome: "Tonometria (curva de pressão)", valor: 150.00 },
    { nome: "Retinografia", valor: 200.00 },
    { nome: "Pré de Catarata (topog. Córnea + Biometria ultrassônica)", valor: 500.00 },
    { nome: "Pterígio", valor: 1500.00 },
    { nome: "Ultrassom", valor: 400.00 }
];

function adicionarMinutos(horario: string, minutos: number): string {
    const [h, m] = horario.split(":").map(Number);
    const totalMinutos = h * 60 + m + minutos;
    const novaHora = Math.floor(totalMinutos / 60);
    const novosMinutos = totalMinutos % 60;
    return `${novaHora.toString().padStart(2, "0")}:${novosMinutos.toString().padStart(2, "0")}`;
}

function gerarHorariosDisponiveis(config: ConfiguracaoHorarios | undefined): string[] {
    if (!config) {
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

export function gerarDatasDisponiveis(config: ConfiguracaoHorarios | undefined): { value: string; label: string; medico?: string; medico_id?: number }[] {
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

export default function AgendamentoForm({
    empresas,
    editandoId,
    agenda,
    onSalvar,
    onCancelar,
    mostrarMensagem,
    initialPacienteNome = "",
}: AgendamentoFormProps) {
    const { profile } = useAuth();

    const [formData, setFormData] = useState({
        empresaId: profile?.unit_id || 0,
        data: "",
        horario: "",
        pacienteNome: initialPacienteNome,
        pacienteId: null as string | null,
        telefone: "",
        tipo: "Consulta" as "Consulta" | "Exame",
        examesSelecionados: [] as string[],
        valorTotalExames: 0
    });

    const [sugestoesPacientes, setSugestoesPacientes] = useState<{ id: string; nome: string; telefone?: string }[]>([]);
    const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
    const [buscandoPacientes, setBuscandoPacientes] = useState(false);
    const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);
    const [buscandoHorarios, setBuscandoHorarios] = useState(false);

    // Load editando data and its financial/paciente details
    useEffect(() => {
        const loadEditandoData = async () => {
            if (editandoId) {
                const agendamento = agenda.find(c => c.id === editandoId);
                if (agendamento) {
                    let tipoVal: "Consulta" | "Exame" = agendamento.tipo === "Exame" ? "Exame" : "Consulta";
                    let examesSel: string[] = [];
                    let valorTot = 0;

                    if (tipoVal === "Exame") {
                        const { data: finData, error } = await supabase
                            .from('financeiro_agendamentos')
                            .select('*')
                            .eq('id', editandoId)
                            .maybeSingle();
                        
                        if (!error && finData) {
                            valorTot = finData.valor_total || 0;
                            const obs = finData.observacoes || "";
                            if (obs.startsWith("Exames: ")) {
                                examesSel = obs.replace("Exames: ", "").split(", ").filter(Boolean);
                            }
                        }
                    }

                    // Tenta buscar telefone do paciente também
                    let tel = "";
                    if (agendamento.pacienteId) {
                        const { data: pacData } = await supabase
                            .from('pacientes')
                            .select('telefone')
                            .eq('id', agendamento.pacienteId)
                            .maybeSingle();
                        if (pacData?.telefone) tel = pacData.telefone;
                    }

                    setFormData({
                        empresaId: agendamento.empresaId,
                        data: agendamento.data,
                        horario: agendamento.hora,
                        pacienteNome: agendamento.pacienteNome,
                        pacienteId: agendamento.pacienteId ? String(agendamento.pacienteId) : null,
                        telefone: tel,
                        tipo: tipoVal,
                        examesSelecionados: examesSel,
                        valorTotalExames: valorTot
                    });
                }
            }
        };

        loadEditandoData();
    }, [editandoId, agenda]);

    // Mantena Auto-selection and Locking for Exams
    useEffect(() => {
        if (formData.tipo === "Exame" && empresas.length > 0) {
            const mantena = empresas.find(e => 
                e.ativo && 
                (e.cidade?.toLowerCase().includes("mantena") || e.nomeFantasia?.toLowerCase().includes("mantena")) &&
                !e.nomeFantasia?.toLowerCase().includes("depósito")
            );
            if (mantena && formData.empresaId !== mantena.id) {
                setFormData(prev => ({
                    ...prev,
                    empresaId: mantena.id,
                    data: "", // reset date and time as we changed branch
                    horario: ""
                }));
            }
        }
    }, [formData.tipo, empresas, formData.empresaId]);

    // Buscar pacientes
    const buscarPacientes = useCallback(async (termo: string) => {
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
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.pacienteNome && !formData.pacienteId) {
                buscarPacientes(formData.pacienteNome);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [formData.pacienteNome, formData.pacienteId, buscarPacientes]);

    // Horários ocupados
    const fetchHorariosOcupados = useCallback(async () => {
        setBuscandoHorarios(true);
        try {
            const { data, error } = await supabase
                .from('agendamentos')
                .select('hora')
                .eq('empresa_id', formData.empresaId)
                .eq('data', formData.data)
                .neq('status', 'cancelado');

            if (!error && data) {
                const occupied = data.map(a => a.hora.substring(0, 5));
                if (editandoId) {
                    const atual = agenda.find(c => c.id === editandoId);
                    if (atual && atual.data === formData.data && atual.empresaId === formData.empresaId) {
                        setHorariosOcupados(occupied.filter(h => h !== atual.hora));
                        setBuscandoHorarios(false);
                        return;
                    }
                }
                setHorariosOcupados(occupied);
            }
        } catch (err) {
            console.error("Erro ao buscar horários ocupados:", err);
        } finally {
            setBuscandoHorarios(false);
        }
    }, [formData.empresaId, formData.data, editandoId, agenda]);

    useEffect(() => {
        if (formData.empresaId && formData.data) {
            fetchHorariosOcupados();
        } else {
            setHorariosOcupados([]);
        }
    }, [formData.empresaId, formData.data, fetchHorariosOcupados]);



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

    const handleExameToggle = (exameNome: string, valor: number) => {
        const jaSelecionado = formData.examesSelecionados.includes(exameNome);
        const novosExames = jaSelecionado
            ? formData.examesSelecionados.filter(name => name !== exameNome)
            : [...formData.examesSelecionados, exameNome];
        
        const novoTotal = novosExames.reduce((acc, name) => {
            const ex = EXAMES_DISPONIVEIS.find(item => item.nome === name);
            return acc + (ex?.valor || 0);
        }, 0);

        setFormData(prev => ({
            ...prev,
            examesSelecionados: novosExames,
            valorTotalExames: novoTotal
        }));
    };

    const empresaSelecionada = useMemo(() => {
        return empresas.find((e) => e.id === formData.empresaId);
    }, [formData.empresaId, empresas]);

    const unidades = useMemo(() => {
        return empresas
            .filter((e) => e.ativo)
            .map((e) => ({
                id: e.id,
                label: `${e.nomeFantasia} - ${e.cidade}`,
                temHorarios: !!e.configuracaoHorarios?.diasDisponiveis?.length
            }));
    }, [empresas]);

    const datasDisponiveis = useMemo(() => {
        return gerarDatasDisponiveis(empresaSelecionada?.configuracaoHorarios);
    }, [empresaSelecionada]);

    const horariosDisponiveis = useMemo(() => {
        return gerarHorariosDisponiveis(empresaSelecionada?.configuracaoHorarios);
    }, [empresaSelecionada]);

    const medicoDoDia = useMemo(() => {
        const diaConfig = empresaSelecionada?.configuracaoHorarios?.diasDisponiveis?.find(
            (d: any) => d.data === formData.data
        );
        return { nome: diaConfig?.medicoResponsavel || "", id: diaConfig?.medico_id || null };
    }, [empresaSelecionada, formData.data]);

    const handleSalvar = async () => {
        if (!formData.empresaId || !formData.data || !formData.horario || !formData.pacienteNome) {
            mostrarMensagem("erro", "PREENCHA TODOS OS CAMPOS OBRIGATÓRIOS");
            return;
        }

        if (formData.tipo === "Exame" && formData.examesSelecionados.length === 0) {
            mostrarMensagem("erro", "POR FAVOR, SELECIONE AO MENOS UM EXAME");
            return;
        }

        try {
            let pacienteId = formData.pacienteId;
            if (!pacienteId) {
                const { data: novoPaciente, error: erroP } = await supabase
                    .from('pacientes')
                    .insert({ nome: formData.pacienteNome.trim(), telefone: formData.telefone })
                    .select('id')
                    .single();
                if (erroP) throw erroP;
                pacienteId = novoPaciente.id;
            }

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
                fetchHorariosOcupados();
                return;
            }

            let agendamentoId = editandoId;

            if (editandoId) {
                const { error } = await supabase
                    .from('agendamentos')
                    .update({
                        empresa_id: formData.empresaId,
                        data: formData.data,
                        hora: formData.horario,
                        tipo: formData.tipo,
                        medico_id: medicoDoDia.id,
                        status: "aguardando"
                    })
                    .eq('id', editandoId);
                if (error) throw error;
                mostrarMensagem("sucesso", "AGENDAMENTO ATUALIZADO COM SUCESSO");
            } else {
                const { data: novoAgd, error: erroA } = await supabase
                    .from('agendamentos')
                    .insert({
                        paciente_id: pacienteId,
                        empresa_id: formData.empresaId,
                        data: formData.data,
                        hora: formData.horario,
                        tipo: formData.tipo,
                        medico_id: medicoDoDia.id,
                        status: "aguardando"
                    })
                    .select('id')
                    .single();
                if (erroA) throw erroA;
                agendamentoId = novoAgd.id;
                mostrarMensagem("sucesso", "AGENDAMENTO CRIADO COM SUCESSO");
            }

            // Gravação Integrada no Financeiro (Opção A) se for do tipo Exame
            if (formData.tipo === "Exame" && agendamentoId) {
                const { error: erroFin } = await supabase
                    .from('financeiro_agendamentos')
                    .upsert({
                        id: agendamentoId,
                        valor_total: formData.valorTotalExames,
                        tipo_financeiro: "Exames",
                        observacoes: `Exames: ${formData.examesSelecionados.join(", ")}`,
                        pagamentos: []
                    });
                if (erroFin) throw erroFin;

                // Template e Log do Envio do WhatsApp
                const dataFormatada = new Date(formData.data + "T12:00:00").toLocaleDateString('pt-BR');
                const whatsappMsg = `*ÓTICA VISION - CONFIRMAÇÃO DE EXAME*\n\nOlá, *${formData.pacienteNome}*!\n\nSeu agendamento para realizar os seguintes exames na filial *Mantena* foi confirmado:\n\n${formData.examesSelecionados.map(ex => `• _${ex}_`).join("\n")}\n\n📅 *Data:* ${dataFormatada}\n⏰ *Horário:* ${formData.horario}\n💰 *Valor Total:* R$ ${formData.valorTotalExames.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nEsperamos você!`;
                console.log("================ TELEMETRIA WHATSAPP ================\n", whatsappMsg, "\n=====================================================");
            }

            onSalvar();
        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            mostrarMensagem("erro", "ERRO AO SALVAR AGENDAMENTO: " + error.message);
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 p-4">
            <div className="text-xs font-bold text-gray-400 mb-4 pb-2 border-b border-gray-700">
                {editandoId ? "REAGENDAR ATENDIMENTO" : "NOVO AGENDAMENTO"}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                {/* Unidade */}
                <div>
                    <label htmlFor="unidade" className="text-xs text-gray-500 block mb-1">
                        UNIDADE <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="unidade"
                        value={formData.empresaId}
                        disabled={!!profile?.unit_id || formData.tipo === "Exame"}
                        onChange={(e) => setFormData({ ...formData, empresaId: Number(e.target.value), data: "", horario: "" })}
                        className={`w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none ${(profile?.unit_id || formData.tipo === "Exame") ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {!profile?.unit_id && <option value={0}>Selecione uma unidade</option>}
                        {unidades.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.label} {u.temHorarios ? "✓" : ""}
                            </option>
                        ))}
                    </select>
                    {formData.tipo === "Exame" && (
                        <span className="text-[10px] text-yellow-500 font-bold block mt-1 uppercase tracking-wider animate-pulse">
                            ⚠️ Apenas filial Mantena
                        </span>
                    )}
                </div>

                {/* Tipo de Agendamento */}
                <div>
                    <label htmlFor="tipo" className="text-xs text-gray-500 block mb-1">
                        TIPO <span className="text-red-500">*</span>
                    </label>
                    <select
                        id="tipo"
                        value={formData.tipo}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as "Consulta" | "Exame", examesSelecionados: [], valorTotalExames: 0 })}
                        className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                    >
                        <option value="Consulta">Consulta</option>
                        <option value="Exame">Exame</option>
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

                {/* Paciente */}
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
                        onChange={(e) => setFormData({ ...formData, pacienteNome: e.target.value, pacienteId: null })}
                        onFocus={() => { if (sugestoesPacientes.length > 0) setMostrarSugestoes(true); }}
                        onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                        placeholder="Digite o nome do paciente"
                        className={`w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none ${!formData.horario ? 'opacity-70 cursor-pointer' : ''}`}
                    />
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

            {/* Seção de Exames (Apenas se for tipo Exame) */}
            {formData.tipo === "Exame" && (
                <div className="mt-4 p-4 bg-gray-900/50 border border-gray-800">
                    <div className="text-xs font-black text-gray-400 mb-3 uppercase tracking-widest border-b border-gray-800 pb-1.5 flex justify-between items-center">
                        <span>Selecione os Exames Clínicos</span>
                        <span className="text-green-500 font-mono text-sm">Total: R$ {formData.valorTotalExames.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {EXAMES_DISPONIVEIS.map(ex => {
                            const selecionado = formData.examesSelecionados.includes(ex.nome);
                            return (
                                <label
                                    key={ex.nome}
                                    className={`flex items-start gap-3 p-2.5 border rounded cursor-pointer transition-all duration-150 ${
                                        selecionado
                                            ? "bg-green-500/10 border-green-500/50 text-white"
                                            : "bg-gray-800/40 border-gray-800 text-gray-400 hover:bg-gray-800/80 hover:border-gray-700"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selecionado}
                                        onChange={() => handleExameToggle(ex.nome, ex.valor)}
                                        className="mt-0.5 rounded border-gray-700 text-green-600 focus:ring-green-500/30 bg-gray-900"
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold uppercase tracking-wide leading-tight wrap-break-word">{ex.nome}</span>
                                        <span className="text-[10px] font-mono text-green-500 mt-1 font-bold">R$ {ex.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-700 flex gap-3">
                <button
                    onClick={handleSalvar}
                    className="px-4 py-2 bg-green-700 border border-green-600 text-sm font-medium text-white hover:bg-green-600"
                >
                    {editandoId ? "CONFIRMAR REAGENDAMENTO" : "CONFIRMAR AGENDAMENTO"}
                </button>
                <button
                    onClick={onCancelar}
                    className="px-4 py-2 bg-gray-800 border border-gray-600 text-sm font-medium text-white hover:bg-gray-700"
                >
                    CANCELAR
                </button>
            </div>
        </div>
    );
}
