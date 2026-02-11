"use client";

import MainLayout from "@/components/MainLayout";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Consulta } from "@/data/mockData";

function StatusBadge({ status }: { status: Consulta["status"] }) {
    const cores = {
        confirmado: "text-green-500",
        aguardando: "text-yellow-500",
        atrasado: "text-red-500",
        cancelado: "text-gray-500",
    };

    const labels = {
        confirmado: "CONFIRMADO",
        aguardando: "AGUARDANDO",
        atrasado: "ATRASADO",
        cancelado: "CANCELADO",
    };

    return (
        <span className={`text-xs font-bold ${cores[status] || "text-gray-400"}`}>
            {(labels[status as keyof typeof labels] || status || "DESCONHECIDO").toUpperCase()}
        </span>
    );
}

export default function DashboardPage() {
    const [agendamentos, setAgendamentos] = useState<Consulta[]>([]);
    const [carregando, setCarregando] = useState(true);

    const fetchAgendamentos = async () => {
        setCarregando(true);
        const hoje = new Date().toISOString().split("T")[0];

        try {
            const { data, error } = await supabase
                .from('agendamentos')
                .select(`
                    id,
                    empresa_id,
                    data,
                    hora,
                    status,
                    tipo,
                    paciente_id,
                    pacientes (
                        nome
                    )
                `)
                .gte('data', hoje)
                .order('data')
                .order('hora');

            if (error) throw error;

            if (data) {
                const adaptados: Consulta[] = data.map((a: any) => ({
                    id: a.id,
                    empresaId: a.empresa_id,
                    data: a.data,
                    hora: a.hora.substring(0, 5),
                    pacienteId: a.paciente_id,
                    pacienteNome: a.pacientes?.nome || 'Paciente não identificado',
                    tipo: a.tipo || 'Consulta',
                    status: a.status as any
                }));
                setAgendamentos(adaptados);
            }
        } catch (err) {
            console.error("Erro ao buscar agendamentos do dashboard:", err);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        fetchAgendamentos();

        // Atualizar a cada 5 minutos
        const interval = setInterval(fetchAgendamentos, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const hoje = useMemo(() => new Date().toISOString().split("T")[0], []);

    const agendaHoje = useMemo(() => {
        return agendamentos.filter(a => a.data === hoje);
    }, [agendamentos, hoje]);

    const stats = useMemo(() => {
        const confirmadas = agendaHoje.filter((c) => c.status === "confirmado").length;
        const aguardando = agendaHoje.filter((c) => c.status === "aguardando").length;
        const atrasadas = agendaHoje.filter((c) => c.status === "atrasado").length;
        return { confirmadas, aguardando, atrasadas };
    }, [agendaHoje]);

    const proximos = useMemo(() => {
        const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return agendamentos
            .filter((c) => {
                if (c.status === "cancelado") return false;
                if (c.data > hoje) return true;
                if (c.data === hoje && c.hora >= agora) return true;
                return false;
            })
            .slice(0, 5);
    }, [agendamentos, hoje]);

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Título */}
                <div className="border-b border-gray-800 pb-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl font-bold tracking-wide text-white">
                            PAINEL DE CONTROLE
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Visão geral das operações de hoje ({new Date().toLocaleDateString('pt-BR')})
                        </p>
                    </div>
                    {carregando && (
                        <span className="text-xs text-yellow-500 animate-pulse font-mono">ATUALIZANDO DADOS...</span>
                    )}
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 bg-green-500"></span>
                            <span className="text-xs text-gray-400 font-medium">CONFIRMADAS</span>
                        </div>
                        <div className="text-4xl font-bold text-green-500">
                            {stats.confirmadas}
                        </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 bg-yellow-500"></span>
                            <span className="text-xs text-gray-400 font-medium">AGUARDANDO</span>
                        </div>
                        <div className="text-4xl font-bold text-yellow-500">
                            {stats.aguardando}
                        </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 bg-red-500"></span>
                            <span className="text-xs text-gray-400 font-medium">ATRASADAS</span>
                        </div>
                        <div className="text-4xl font-bold text-red-500">
                            {stats.atrasadas}
                        </div>
                    </div>
                </div>

                {/* Grid Principal */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Agenda do Dia - Ocupa 2 colunas */}
                    <div className="lg:col-span-2 bg-gray-900 border border-gray-800">
                        <div className="border-b border-gray-800 px-4 py-3 flex justify-between items-center">
                            <h2 className="text-sm font-bold text-white uppercase">Agenda do Dia</h2>
                            <span className="text-xs text-gray-500">{agendaHoje.length} agendamentos</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-800 text-left">
                                        <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Hora</th>
                                        <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Paciente</th>
                                        <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                                        <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agendaHoje.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-gray-600 text-sm">
                                                Nenhum agendamento para hoje.
                                            </td>
                                        </tr>
                                    ) : (
                                        agendaHoje.map((consulta) => (
                                            <tr key={consulta.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                                <td className="px-4 py-3 text-sm font-mono text-white">
                                                    {consulta.hora}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-300 font-medium">
                                                    {consulta.pacienteNome}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-400">
                                                    {consulta.tipo}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={consulta.status} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Próximos Pacientes */}
                    <div className="bg-gray-900 border border-gray-800 self-start">
                        <div className="border-b border-gray-800 px-4 py-3">
                            <h2 className="text-sm font-bold text-white uppercase">Próximos Atendimentos</h2>
                        </div>
                        <div className="p-4 space-y-4">
                            {proximos.length === 0 ? (
                                <div className="text-sm text-gray-600">Não há próximos atendimentos.</div>
                            ) : (
                                proximos.map((consulta, index) => (
                                    <div key={consulta.id} className="flex items-center gap-3 group">
                                        <span className="text-lg font-mono text-gray-700 group-hover:text-green-500 transition-colors">
                                            {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <div className="flex-1">
                                            <div className="text-sm text-white font-medium">{consulta.pacienteNome}</div>
                                            <div className="text-xs text-gray-500">
                                                {consulta.data !== hoje ? new Date(consulta.data + "T00:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + " • " : ""}
                                                {consulta.hora} • {consulta.tipo}
                                            </div>
                                        </div>
                                        <span
                                            className={`w-2 h-2 rounded-full ${consulta.status === "confirmado"
                                                ? "bg-green-500"
                                                : consulta.status === "aguardando"
                                                    ? "bg-yellow-500"
                                                    : "bg-red-500"
                                                }`}
                                        ></span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
