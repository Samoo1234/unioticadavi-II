"use client";

import { Consulta } from "@/data/mockData";
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

interface AgendaCalendarProps {
    agenda: Consulta[];
    carregando: boolean;
    onConfirmar: (id: string | number) => void;
    onCancelar: (id: string | number) => void;
    onReagendar: (id: string | number) => void;
    onAbrirFinanceiroIndividual: (consulta: Consulta) => void;
}

export default function AgendaCalendar({
    agenda,
    carregando,
    onConfirmar,
    onCancelar,
    onReagendar,
    onAbrirFinanceiroIndividual,
}: AgendaCalendarProps) {
    const { profile } = useAuth();

    return (
        <div className="bg-transparent lg:bg-gray-900 lg:border lg:border-gray-800">
            {/* Mobile View: Cards */}
            <div className="lg:hidden space-y-3">
                {carregando ? (
                    <div className="p-8 text-center text-gray-500 text-sm">Carregando...</div>
                ) : agenda.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm bg-gray-900 border border-gray-800">Nenhum agendamento.</div>
                ) : (
                    agenda.map((consulta) => (
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
                                            onClick={() => onAbrirFinanceiroIndividual(consulta)}
                                            className="flex-1 py-1.5 text-[10px] font-black bg-blue-600/10 border border-blue-600/30 text-blue-500 hover:bg-blue-600/20"
                                        >
                                            FINANCEIRO
                                        </button>
                                    )}
                                    {consulta.status !== "confirmado" && (
                                        <button
                                            onClick={() => onConfirmar(consulta.id)}
                                            className="flex-1 py-1.5 text-[10px] font-black bg-green-600/10 border border-green-600/30 text-green-500 hover:bg-green-600/20"
                                        >
                                            OK
                                        </button>
                                    )}
                                    {consulta.status !== "confirmado" && (
                                        <button
                                            onClick={() => onReagendar(consulta.id)}
                                            className="flex-1 py-1.5 text-[10px] font-black bg-yellow-600/10 border border-yellow-600/30 text-yellow-500 hover:bg-yellow-600/20"
                                        >
                                            REAGER.
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onCancelar(consulta.id)}
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
                    ) : agenda.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">Nenhum agendamento.</td>
                        </tr>
                    ) : (
                        agenda.map((consulta) => (
                            <tr key={consulta.id} className={`border-b border-gray-800/50 hover:bg-white/2 transition-colors ${consulta.status === "cancelado" ? "opacity-40" : ""}`}>
                                <td className="px-4 py-4 text-sm font-mono text-emerald-500 font-bold">{consulta.hora}</td>
                                <td className="px-4 py-4 text-sm text-gray-200 font-medium uppercase tracking-tight">{consulta.pacienteNome}</td>
                                <td className="px-4 py-4 text-xs text-gray-500 font-bold">{consulta.tipo}</td>
                                <td className="px-4 py-4"><StatusBadge status={consulta.status} /></td>
                                <td className="px-4 py-4">
                                    {consulta.status !== "cancelado" && (
                                        <div className="flex justify-center gap-1.5">
                                            {profile?.roles?.name === 'Administrador' && (
                                                <button onClick={() => onAbrirFinanceiroIndividual(consulta)} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" title="Financeiro">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </button>
                                            )}
                                            {consulta.status !== "confirmado" && (
                                                <button onClick={() => onConfirmar(consulta.id)} className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors" title="Confirmar">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                </button>
                                            )}
                                            {consulta.status !== "confirmado" && (
                                                <button onClick={() => onReagendar(consulta.id)} className="p-2 text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors" title="Reagendar">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </button>
                                            )}
                                            <button onClick={() => onCancelar(consulta.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Cancelar">
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
    );
}
