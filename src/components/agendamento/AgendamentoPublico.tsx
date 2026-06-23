"use client";

import { useState, useEffect, useMemo } from "react";

interface EmpresaPublica {
    id: number;
    nome_fantasia: string;
    cidade: string;
    configuracao_horarios: any;
    telefone: string;
}

interface DiaDisponivel {
    value: string;
    label: string;
    medico?: string;
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
    { nome: "Ultrassom", valor: 400.00 },
    { nome: "Yag Laser (1 olho)", valor: 400.00 },
    { nome: "Yag Laser (2 olhos)", valor: 800.00 }
];


function adicionarMinutos(horario: string, minutos: number): string {
    const [h, m] = horario.split(":").map(Number);
    const totalMinutos = h * 60 + m + minutos;
    const novaHora = Math.floor(totalMinutos / 60);
    const novosMinutos = totalMinutos % 60;
    return `${novaHora.toString().padStart(2, "0")}:${novosMinutos.toString().padStart(2, "0")}`;
}

function gerarHorarios(config: any): string[] {
    if (!config) {
        return [
            "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
            "11:00", "11:30", "14:00", "14:30", "15:00", "15:30",
            "16:00", "16:30", "17:00", "17:30",
        ];
    }
    const horarios: string[] = [];
    (config.turnos || [])
        .filter((t: any) => t.ativo)
        .forEach((turno: any) => {
            let horaAtual = turno.inicio;
            while (horaAtual < turno.fim) {
                horarios.push(horaAtual);
                horaAtual = adicionarMinutos(horaAtual, config.intervaloMinutos || 30);
            }
        });
    return horarios;
}

function gerarDatas(config: any): DiaDisponivel[] {
    if (!config?.diasDisponiveis?.length) return [];
    const hoje = new Date().toISOString().split("T")[0];
    return config.diasDisponiveis
        .filter((d: any) => d.data >= hoje)
        .sort((a: any, b: any) => a.data.localeCompare(b.data))
        .map((d: any) => ({
            value: d.data,
            label: new Date(d.data + "T12:00:00").toLocaleDateString("pt-BR", {
                weekday: "short", day: "2-digit", month: "2-digit",
            }).toUpperCase(),
            medico: d.medicoResponsavel,
        }));
}

type EstadoForm = "formulario" | "enviando" | "sucesso" | "erro";

export default function AgendamentoPublico() {
    const [empresas, setEmpresas] = useState<EmpresaPublica[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [estado, setEstado] = useState<EstadoForm>("formulario");
    const [mensagemErro, setMensagemErro] = useState("");

    const [detalhes, setDetalhes] = useState<any>(null);
    const [horariosOcupados, setHorariosOcupados] = useState<string[]>([]);

    const [form, setForm] = useState({
        empresaId: 0,
        data: "",
        horario: "",
        pacienteNome: "",
        telefone: "",
        tipo: "Consulta" as "Consulta" | "Exame" | "Retorno",
        examesSelecionados: [] as string[],
        valorTotalExames: 0
    });

    // Load companies
    useEffect(() => {
        fetch("/api/agendamento-publico")
            .then(res => res.json())
            .then(data => {
                setEmpresas(data.empresas || []);
                setCarregando(false);
            })
            .catch(() => setCarregando(false));
    }, []);

    // Mantena Auto-selection and Locking for Exams in Public Form
    useEffect(() => {
        if (form.tipo === "Exame" && empresas.length > 0) {
            const mantena = empresas.find(e => 
                (e.cidade?.toLowerCase().includes("mantena") || e.nome_fantasia?.toLowerCase().includes("mantena")) &&
                !e.nome_fantasia?.toLowerCase().includes("depósito")
            );
            if (mantena && form.empresaId !== mantena.id) {
                setForm(prev => ({
                    ...prev,
                    empresaId: mantena.id,
                    data: "", // reset date and time as we changed branch
                    horario: ""
                }));
            }
        }
    }, [form.tipo, empresas, form.empresaId]);

    const handleExameToggle = (exameNome: string, valor: number) => {
        const jaSelecionado = form.examesSelecionados.includes(exameNome);
        const novosExames = jaSelecionado
            ? form.examesSelecionados.filter(name => name !== exameNome)
            : [...form.examesSelecionados, exameNome];
        
        const novoTotal = novosExames.reduce((acc, name) => {
            const ex = EXAMES_DISPONIVEIS.find(item => item.nome === name);
            return acc + (ex?.valor || 0);
        }, 0);

        setForm(prev => ({
            ...prev,
            examesSelecionados: novosExames,
            valorTotalExames: novoTotal
        }));
    };

    // Load occupied slots when empresa + data changes
    useEffect(() => {
        if (!form.empresaId || !form.data) {
            setHorariosOcupados([]);
            return;
        }
        fetch(`/api/agendamento-publico?empresaId=${form.empresaId}&data=${form.data}`)
            .then(res => res.json())
            .then(data => setHorariosOcupados(data.horariosOcupados || []))
            .catch(() => setHorariosOcupados([]));
    }, [form.empresaId, form.data]);

    const empresaSelecionada = useMemo(() => {
        return empresas.find(e => e.id === form.empresaId);
    }, [form.empresaId, empresas]);

    const datasDisponiveis = useMemo(() => {
        return gerarDatas(empresaSelecionada?.configuracao_horarios);
    }, [empresaSelecionada]);

    const horariosDisponiveis = useMemo(() => {
        return gerarHorarios(empresaSelecionada?.configuracao_horarios);
    }, [empresaSelecionada]);

    const formatarTelefone = (valor: string) => {
        const numeros = valor.replace(/\D/g, "").slice(0, 11);
        if (numeros.length <= 2) return numeros;
        if (numeros.length <= 7) return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
        return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.empresaId || !form.data || !form.horario || !form.pacienteNome || !form.telefone) {
            setMensagemErro("Preencha todos os campos");
            setEstado("erro");
            setTimeout(() => setEstado("formulario"), 3000);
            return;
        }

        if (form.tipo === "Exame" && form.examesSelecionados.length === 0) {
            setMensagemErro("Por favor, selecione ao menos um exame");
            setEstado("erro");
            setTimeout(() => setEstado("formulario"), 3000);
            return;
        }

        setEstado("enviando");

        try {
            const res = await fetch("/api/agendamento-publico", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                setMensagemErro(data.error || "Erro ao agendar");
                setEstado("erro");
                setTimeout(() => setEstado("formulario"), 4000);
                return;
            }


            setDetalhes(data.detalhes);
            setEstado("sucesso");
        } catch {
            setMensagemErro("Erro de conexão. Tente novamente.");
            setEstado("erro");
            setTimeout(() => setEstado("formulario"), 4000);
        }
    };

    const resetForm = () => {
        setForm({
            empresaId: 0,
            data: "",
            horario: "",
            pacienteNome: "",
            telefone: "",
            tipo: "Consulta",
            examesSelecionados: [],
            valorTotalExames: 0
        });
        setEstado("formulario");

        setDetalhes(null);
    };

    // --- SUCCESS STATE ---
    if (estado === "sucesso") {
        return (
            <div className="text-center space-y-5">
                <div className="w-16 h-16 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center animate-[bounceIn_0.5s_ease-out]">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <div>
                    <h3 className="text-lg font-bold text-white mb-1">Agendamento Confirmado!</h3>
                    <p className="text-gray-400 text-xs">Seus dados foram registrados com sucesso</p>
                </div>

                {detalhes && (
                    <div className="bg-gray-950/60 border border-gray-700/50 rounded-xl p-4 text-left space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">📅</span>
                            <span className="text-white">{detalhes.data}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">🕐</span>
                            <span className="text-white">{detalhes.horario}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500">🏥</span>
                            <span className="text-white">{detalhes.unidade}</span>
                        </div>
                    </div>
                )}



                <button
                    onClick={resetForm}
                    className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                    Fazer novo agendamento
                </button>
            </div>
        );
    }

    // --- FORM STATE ---
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Agendar Consulta</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">Rápido e sem cadastro</p>
                </div>
            </div>

            {/* Tipo de Agendamento */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-wider">
                    Tipo de Agendamento <span className="text-red-500">*</span>
                </label>
                <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value as "Consulta" | "Exame" | "Retorno", examesSelecionados: [], valorTotalExames: 0 })}
                    className="w-full bg-gray-950 border border-gray-800 text-white text-sm px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                >
                    <option value="Consulta">Consulta</option>
                    <option value="Exame">Exame</option>
                    <option value="Retorno">Retorno</option>
                </select>
            </div>

            {/* Unidade */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 flex justify-between items-center tracking-wider">
                    <span>Unidade <span className="text-red-500">*</span></span>
                    {form.tipo === "Exame" && (
                        <span className="text-[9px] text-yellow-500 font-bold uppercase tracking-wider animate-pulse">
                            ⚠️ Apenas filial Mantena
                        </span>
                    )}
                </label>
                <select
                    value={form.empresaId}
                    onChange={(e) => setForm({ ...form, empresaId: Number(e.target.value), data: "", horario: "" })}
                    className="w-full bg-gray-950 border border-gray-800 text-white text-sm px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all disabled:opacity-75"
                    disabled={carregando || form.tipo === "Exame"}
                >
                    <option value={0}>{carregando ? "Carregando..." : "Selecione a unidade"}</option>
                    {empresas.map(e => (
                        <option key={e.id} value={e.id}>
                            {e.nome_fantasia} — {e.cidade}
                        </option>
                    ))}
                </select>
            </div>

            {/* Data */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-wider">
                    Data <span className="text-red-500">*</span>
                </label>
                <select
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value, horario: "" })}
                    className="w-full bg-gray-950 border border-gray-800 text-white text-sm px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
                    disabled={!form.empresaId}
                >
                    <option value="">{form.empresaId ? "Selecione a data" : "Selecione a unidade primeiro"}</option>
                    {datasDisponiveis.map(d => (
                        <option key={d.value} value={d.value}>
                            {d.label} {d.medico ? `(${d.medico})` : ""}
                        </option>
                    ))}
                </select>
                {form.empresaId > 0 && datasDisponiveis.length === 0 && (
                    <p className="text-[10px] text-yellow-500 mt-1">Nenhuma data disponível para esta unidade</p>
                )}
            </div>

            {/* Horário */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-wider">
                    Horário <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {!form.data ? (
                        <p className="col-span-4 text-[10px] text-gray-600 text-center py-3">Selecione a data primeiro</p>
                    ) : (
                        horariosDisponiveis.map(h => {
                            const ocupado = horariosOcupados.includes(h);
                            const selecionado = form.horario === h;
                            return (
                                <button
                                    key={h}
                                    type="button"
                                    disabled={ocupado}
                                    onClick={() => setForm({ ...form, horario: h })}
                                    className={`text-xs py-1.5 rounded-lg font-medium transition-all ${
                                        selecionado
                                            ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]"
                                            : ocupado
                                                ? "bg-gray-900/50 text-gray-700 cursor-not-allowed line-through"
                                                : "bg-gray-900 text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-800"
                                    }`}
                                >
                                    {h}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Nome */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-wider">
                    Seu Nome <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.pacienteNome}
                    onChange={(e) => setForm({ ...form, pacienteNome: e.target.value })}
                    placeholder="Nome completo"
                    className="w-full bg-gray-950 border border-gray-800 text-white text-sm px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder-gray-700"
                />
            </div>

            {/* Telefone */}
            <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block tracking-wider">
                    WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                    type="tel"
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-gray-950 border border-gray-800 text-white text-sm px-3 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder-gray-700"
                />
            </div>

            {/* Seção de Seleção de Exames (Apenas se for tipo Exame) */}
            {form.tipo === "Exame" && (
                <div className="bg-gray-950/40 border border-gray-800/80 rounded-xl p-4 space-y-3 animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Selecione os Exames
                        </span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                            Total: R$ {form.valorTotalExames.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                        {EXAMES_DISPONIVEIS.map((ex) => {
                            const selecionado = form.examesSelecionados.includes(ex.nome);
                            return (
                                <label
                                    key={ex.nome}
                                    className={`flex items-start gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all duration-200 select-none ${
                                        selecionado
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-white shadow-[0_2px_8px_-2px_rgba(16,185,129,0.15)]"
                                            : "bg-gray-950/60 border-gray-800 text-gray-400 hover:bg-gray-900/60 hover:border-gray-700 hover:text-gray-300"
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selecionado}
                                        onChange={() => handleExameToggle(ex.nome, ex.valor)}
                                        className="mt-0.5 rounded border-gray-800 text-emerald-600 focus:ring-emerald-500/20 bg-gray-950"
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-bold uppercase tracking-wider leading-tight wrap-break-word">
                                            {ex.nome}
                                        </span>
                                        <span className="text-[9px] font-mono text-emerald-400 mt-1 font-bold">
                                            R$ {ex.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Error message */}
            {estado === "erro" && (
                <div className="bg-red-900/30 border border-red-700/50 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2 animate-[shake_0.3s_ease-in-out]">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {mensagemErro}
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={estado === "enviando"}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 text-sm"
            >
                {estado === "enviando" ? (
                    <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Agendando...
                    </>
                ) : (
                    "CONFIRMAR AGENDAMENTO"
                )}
            </button>
        </form>
    );
}
