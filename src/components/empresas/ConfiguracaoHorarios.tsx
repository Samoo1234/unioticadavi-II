"use client";

import { useState, useMemo, useEffect } from "react";
import Panel from "@/components/clinica/Panel";
import { supabase } from "@/lib/supabase";
import {
    ConfiguracaoHorarios,
    TurnoAtendimento,
    Medico,
    configuracaoHorariosPadrao,
} from "@/data/empresasData";

interface MedicoDb {
    id: number;
    nome: string;
}

interface ConfiguracaoHorariosProps {
    configuracao: ConfiguracaoHorarios;
    onSave: (config: ConfiguracaoHorarios) => void;
    onCancel: () => void;
    nomeEmpresa: string;
    isMatriz?: boolean;
    medicosDisponiveis?: Medico[];
    empresaId?: number;
}

const INTERVALOS = [
    { value: 10, label: "10 minutos" },
    { value: 15, label: "15 minutos" },
    { value: 20, label: "20 minutos" },
    { value: 30, label: "30 minutos" },
];

function gerarHorarios(): string[] {
    const horarios: string[] = [];
    for (let h = 6; h <= 22; h++) {
        for (let m = 0; m < 60; m += 30) {
            horarios.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
        }
    }
    return horarios;
}

function calcularAtendimentosPorTurno(turno: TurnoAtendimento, intervalo: number): number {
    if (!turno.ativo) return 0;
    const [hInicio, mInicio] = turno.inicio.split(":").map(Number);
    const [hFim, mFim] = turno.fim.split(":").map(Number);
    const minutosTotais = (hFim * 60 + mFim) - (hInicio * 60 + mInicio);
    return Math.floor(minutosTotais / intervalo);
}

export default function ConfiguracaoHorariosComponent({
    configuracao,
    onSave,
    onCancel,
    nomeEmpresa,
    isMatriz = false,
    medicosDisponiveis = [],
    empresaId,
}: ConfiguracaoHorariosProps) {
    // Médicos do banco de dados
    const [medicosDb, setMedicosDb] = useState<MedicoDb[]>([]);
    const [config, setConfig] = useState<ConfiguracaoHorarios>({
        ...configuracao || configuracaoHorariosPadrao,
        turnos: [...(configuracao?.turnos || configuracaoHorariosPadrao.turnos)],
        diasDisponiveis: [...(configuracao?.diasDisponiveis || [])],
        medicos: [...(configuracao?.medicos || [])],
    });

    // Buscar médicos do banco de dados
    const fetchMedicos = async () => {
        const { data } = await supabase
            .from("medicos")
            .select("id, nome")
            .eq("ativo", true)
            .order("nome");
        if (data) setMedicosDb(data);
    };

    useEffect(() => {
        fetchMedicos();
    }, []);

    // Estado para adicionar novo dia
    const [novaData, setNovaData] = useState("");
    const [novoMedicoId, setNovoMedicoId] = useState<number | null>(null);
    const [novoMedicoNome, setNovoMedicoNome] = useState("");
    const [salvandoMedico, setSalvandoMedico] = useState(false);

    const horariosDisp = useMemo(() => gerarHorarios(), []);

    // Usar médicos do banco de dados
    const listaMedicos = useMemo(() => {
        return medicosDb;
    }, [medicosDb]);

    // Handlers para turnos
    const handleTurnoChange = (id: number, campo: keyof TurnoAtendimento, valor: string | boolean) => {
        setConfig({
            ...config,
            turnos: config.turnos.map((t) =>
                t.id === id ? { ...t, [campo]: valor } : t
            ),
        });
    };

    const handleAdicionarTurno = () => {
        const novoId = Math.max(...config.turnos.map((t) => t.id), 0) + 1;
        setConfig({
            ...config,
            turnos: [
                ...config.turnos,
                { id: novoId, nome: `Turno ${novoId}`, inicio: "08:00", fim: "12:00", ativo: true },
            ],
        });
    };

    const handleRemoverTurno = (id: number) => {
        if (config.turnos.length <= 1) return;
        setConfig({
            ...config,
            turnos: config.turnos.filter((t) => t.id !== id),
        });
    };

    // Handler para intervalo
    const handleIntervaloChange = (valor: number) => {
        setConfig({ ...config, intervaloMinutos: valor });
    };

    // Handlers para médicos (apenas matriz) - persiste no banco de dados
    const handleAdicionarMedico = async () => {
        if (!novoMedicoNome.trim() || salvandoMedico) return;
        setSalvandoMedico(true);
        try {
            const { data, error } = await supabase
                .from("medicos")
                .insert({
                    nome: novoMedicoNome.trim(),
                    empresa_id: empresaId || null,
                    ativo: true,
                })
                .select("id, nome")
                .single();

            if (error) {
                console.error("Erro ao cadastrar médico:", error);
                alert("Erro ao cadastrar médico: " + error.message);
                return;
            }

            if (data) {
                setConfig({
                    ...config,
                    medicos: [...config.medicos, { id: data.id, nome: data.nome }],
                });
                setNovoMedicoNome("");
                await fetchMedicos();
            }
        } finally {
            setSalvandoMedico(false);
        }
    };

    const handleRemoverMedico = async (id: number) => {
        const { error } = await supabase
            .from("medicos")
            .update({ ativo: false })
            .eq("id", id);

        if (error) {
            console.error("Erro ao remover médico:", error);
            alert("Erro ao remover médico: " + error.message);
            return;
        }

        setConfig({
            ...config,
            medicos: config.medicos.filter((m) => m.id !== id),
        });
        await fetchMedicos();
    };

    // Handler para adicionar dia disponível
    const handleAdicionarDia = () => {
        if (!novaData || !novoMedicoId) return;

        // Buscar nome do médico selecionado
        const medicoSelecionado = medicosDb.find(m => m.id === novoMedicoId);
        const medicoNome = medicoSelecionado?.nome || "";

        // Verificar se já existe
        const existe = config.diasDisponiveis.find((d) => d.data === novaData);
        if (existe) {
            // Atualizar médico
            setConfig({
                ...config,
                diasDisponiveis: config.diasDisponiveis.map((d) =>
                    d.data === novaData ? { ...d, medico_id: novoMedicoId, medicoResponsavel: medicoNome } : d
                ),
            });
        } else {
            // Adicionar novo
            setConfig({
                ...config,
                diasDisponiveis: [
                    ...config.diasDisponiveis,
                    { data: novaData, medico_id: novoMedicoId, medicoResponsavel: medicoNome },
                ].sort((a, b) => a.data.localeCompare(b.data)),
            });
        }

        setNovaData("");
        setNovoMedicoId(null);
    };

    // Handler para remover dia
    const handleRemoverDia = (data: string) => {
        setConfig({
            ...config,
            diasDisponiveis: config.diasDisponiveis.filter((d) => d.data !== data),
        });
    };

    // Calcular totais
    const totalAtendimentosDia = config.turnos
        .filter((t) => t.ativo)
        .reduce((acc, t) => acc + calcularAtendimentosPorTurno(t, config.intervaloMinutos), 0);

    // Dias futuros
    const hoje = new Date().toISOString().split("T")[0];
    const diasFuturos = config.diasDisponiveis.filter((d) => d.data >= hoje);

    return (
        <div className="grid grid-cols-12 gap-4">
            {/* Coluna Esquerda - Turnos e Médicos */}
            <div className="col-span-5 space-y-4">
                {/* Turnos de Atendimento */}
                <Panel title="TURNOS DE ATENDIMENTO" subtitle={nomeEmpresa}>
                    <div className="p-4 space-y-4">
                        {/* Lista de turnos */}
                        <div className="space-y-3">
                            {config.turnos.map((turno) => (
                                <div
                                    key={turno.id}
                                    className={`p-3 border ${turno.ativo ? "border-gray-700 bg-gray-800/50" : "border-gray-800 bg-gray-900/50 opacity-60"}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={turno.ativo}
                                            onChange={(e) => handleTurnoChange(turno.id, "ativo", e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        <input
                                            type="text"
                                            value={turno.nome}
                                            onChange={(e) => handleTurnoChange(turno.id, "nome", e.target.value)}
                                            className="w-24 px-2 py-1 bg-gray-900 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                        />
                                        <select
                                            value={turno.inicio}
                                            onChange={(e) => handleTurnoChange(turno.id, "inicio", e.target.value)}
                                            className="px-2 py-1 bg-gray-900 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                        >
                                            {horariosDisp.map((h) => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                        <span className="text-gray-500">até</span>
                                        <select
                                            value={turno.fim}
                                            onChange={(e) => handleTurnoChange(turno.id, "fim", e.target.value)}
                                            className="px-2 py-1 bg-gray-900 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                        >
                                            {horariosDisp.map((h) => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                        {config.turnos.length > 1 && (
                                            <button
                                                onClick={() => handleRemoverTurno(turno.id)}
                                                className="px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                    {turno.ativo && (
                                        <div className="mt-2 text-xs text-gray-500">
                                            {calcularAtendimentosPorTurno(turno, config.intervaloMinutos)} atendimentos
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleAdicionarTurno}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-sm text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                            + ADICIONAR TURNO
                        </button>

                        {/* Intervalo */}
                        <div className="pt-4 border-t border-gray-700">
                            <label className="text-xs text-gray-500 block mb-2">
                                INTERVALO ENTRE ATENDIMENTOS
                            </label>
                            <div className="flex items-center gap-4">
                                <select
                                    value={config.intervaloMinutos}
                                    onChange={(e) => handleIntervaloChange(Number(e.target.value))}
                                    className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                >
                                    {INTERVALOS.map((i) => (
                                        <option key={i.value} value={i.value}>{i.label}</option>
                                    ))}
                                </select>
                                <div className="text-sm text-green-500 font-mono">
                                    {totalAtendimentosDia} atend/dia
                                </div>
                            </div>
                        </div>
                    </div>
                </Panel>

                {/* Cadastro de Médicos - Apenas Matriz */}
                {isMatriz && (
                    <Panel title="MÉDICOS" subtitle="Cadastre os médicos">
                        <div className="p-4 space-y-3">
                            {/* Lista de médicos */}
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                {config.medicos.length === 0 ? (
                                    <div className="text-xs text-gray-600 py-2">
                                        Nenhum médico cadastrado
                                    </div>
                                ) : (
                                    config.medicos.map((medico) => (
                                        <div
                                            key={medico.id}
                                            className="flex items-center justify-between px-2 py-1.5 bg-gray-800/50 text-sm"
                                        >
                                            <span className="text-white">{medico.nome}</span>
                                            <button
                                                onClick={() => handleRemoverMedico(medico.id)}
                                                className="text-red-500 hover:text-red-400 text-xs"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Adicionar novo médico */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={novoMedicoNome}
                                    onChange={(e) => setNovoMedicoNome(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAdicionarMedico()}
                                    placeholder="Nome do médico"
                                    className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                />
                                <button
                                    onClick={handleAdicionarMedico}
                                    disabled={!novoMedicoNome.trim() || salvandoMedico}
                                    className="px-3 py-1.5 bg-green-700 border border-green-600 text-xs font-medium text-white hover:bg-green-600 disabled:opacity-50"
                                >
                                    {salvandoMedico ? "..." : "+ ADD"}
                                </button>
                            </div>
                        </div>
                    </Panel>
                )}
            </div>

            {/* Coluna Direita - Datas de Atendimento */}
            <div className="col-span-7">
                <Panel title="DATAS DE ATENDIMENTO" subtitle="Adicione os dias disponíveis para consultas">
                    <div className="p-4 space-y-4">
                        {/* Formulário simples para adicionar data */}
                        <div className="bg-gray-800/50 border border-gray-700 p-4">
                            <div className="text-xs font-bold text-gray-400 mb-3">ADICIONAR NOVA DATA</div>
                            <div className="grid grid-cols-12 gap-3">
                                <div className="col-span-4">
                                    <label className="text-xs text-gray-500 block mb-1">DATA *</label>
                                    <input
                                        type="date"
                                        value={novaData}
                                        onChange={(e) => setNovaData(e.target.value)}
                                        min={hoje}
                                        className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                    />
                                </div>
                                <div className="col-span-5">
                                    <label className="text-xs text-gray-500 block mb-1">MÉDICO *</label>
                                    <select
                                        value={novoMedicoId || ""}
                                        onChange={(e) => setNovoMedicoId(e.target.value ? parseInt(e.target.value) : null)}
                                        className="w-full px-2 py-1.5 bg-gray-900 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                    >
                                        <option value="">Selecione...</option>
                                        {listaMedicos.map((m) => (
                                            <option key={m.id} value={m.id}>{m.nome}</option>
                                        ))}
                                    </select>
                                    {listaMedicos.length === 0 && (
                                        <div className="text-xs text-yellow-500 mt-1">
                                            Cadastre médicos na página CMV → Fornecedores
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-3 flex items-end">
                                    <button
                                        onClick={handleAdicionarDia}
                                        disabled={!novaData || !novoMedicoId}
                                        className="w-full px-3 py-1.5 bg-green-700 border border-green-600 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        + ADICIONAR
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Lista de dias configurados */}
                        <div>
                            <div className="text-xs font-bold text-gray-400 mb-2">
                                DIAS CONFIGURADOS ({diasFuturos.length})
                            </div>
                            <div className="max-h-64 overflow-y-auto space-y-1 border border-gray-800 bg-gray-900/30">
                                {diasFuturos.length === 0 ? (
                                    <div className="p-4 text-center text-gray-600 text-sm">
                                        Nenhum dia configurado. Adicione datas acima.
                                    </div>
                                ) : (
                                    diasFuturos.map((d) => (
                                        <div
                                            key={d.data}
                                            className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 hover:bg-gray-800/30"
                                        >
                                            <div className="flex items-center gap-4">
                                                <span className="font-mono text-white text-sm">
                                                    {new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR", {
                                                        weekday: "short",
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                    }).toUpperCase()}
                                                </span>
                                                <span className="text-green-500 text-sm">
                                                    {d.medicoResponsavel}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoverDia(d.data)}
                                                className="px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
                                            >
                                                REMOVER
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Botões de ação */}
                        <div className="pt-4 border-t border-gray-700 flex gap-3">
                            <button
                                onClick={() => onSave(config)}
                                className="flex-1 px-4 py-2 bg-green-700 border border-green-600 text-sm font-medium text-white hover:bg-green-600"
                            >
                                SALVAR CONFIGURAÇÃO
                            </button>
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 bg-gray-800 border border-gray-600 text-sm font-medium text-white hover:bg-gray-700"
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                </Panel>
            </div>
        </div>
    );
}
