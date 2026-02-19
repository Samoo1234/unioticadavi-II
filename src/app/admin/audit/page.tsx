"use client";

import { useState, useEffect, Fragment } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type AuditLog = {
    id: string;
    user_id: string;
    action: string;
    module: string;
    record_id: string;
    previous_data: any;
    new_data: any;
    created_at: string;
    profiles?: { full_name: string };
};

export default function AuditAdminPage() {
    const { hasPermission } = useAuth();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (hasPermission('admin', 'view_audit')) {
            fetchLogs();
        }
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('audit_logs')
            .select('*, profiles!audit_logs_user_id_profiles_fkey(full_name)')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('[Auditoria] Erro ao buscar logs:', error);
        }
        if (data) setLogs(data as any);
        setLoading(false);
    };

    if (!hasPermission('admin', 'view_audit')) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-full">
                    <p className="text-red-500 font-bold tracking-widest uppercase">Acesso Reservado ao Administrador</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Trilha de Auditoria</h1>
                        <p className="text-gray-500 text-xs uppercase tracking-widest">Rastreamento de todas as ações críticas</p>
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="px-4 py-2 bg-gray-900 border border-gray-800 text-[10px] font-black text-white hover:bg-gray-800 rounded-lg transition-all"
                    >
                        ATUALIZAR LOGS
                    </button>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-[10px] uppercase font-bold tracking-wider">
                        <thead className="bg-gray-950 text-gray-500">
                            <tr>
                                <th className="px-6 py-4">Data/Hora</th>
                                <th className="px-6 py-4">Usuário</th>
                                <th className="px-6 py-4">Módulo</th>
                                <th className="px-6 py-4">Ação</th>
                                <th className="px-6 py-4">ID Registro</th>
                                <th className="px-6 py-4 text-right">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-gray-400">
                            {logs.map((log) => (
                                <Fragment key={log.id}>
                                    <tr className="hover:bg-gray-800/20 transition-colors cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                                        <td className="px-6 py-4 font-mono text-gray-500">
                                            {new Date(log.created_at).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4 text-white">
                                            {log.profiles?.full_name || 'Sistema'}
                                        </td>
                                        <td className="px-6 py-4 text-emerald-500">{log.module}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded ${log.action === 'DELETE' ? 'bg-red-900/30 text-red-500' :
                                                log.action === 'CREATE' ? 'bg-green-900/30 text-green-500' :
                                                    'bg-blue-900/30 text-blue-500'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[9px]">{log.record_id || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className={`transition-colors underline decoration-dotted ${expandedId === log.id ? 'text-emerald-400' : 'text-gray-600 hover:text-white'}`}>
                                                {expandedId === log.id ? 'FECHAR' : 'VER JSON'}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedId === log.id && (
                                        <tr key={`${log.id}-detail`}>
                                            <td colSpan={6} className="px-6 py-4 bg-gray-950/50">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2 font-black">Dados Anteriores</p>
                                                        <pre className="text-[10px] text-gray-400 font-mono bg-black/30 p-3 rounded-lg overflow-x-auto max-h-60 overflow-y-auto">
                                                            {log.previous_data ? JSON.stringify(log.previous_data, null, 2) : 'Nenhum'}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-emerald-500 uppercase tracking-widest mb-2 font-black">Dados Novos</p>
                                                        <pre className="text-[10px] text-gray-400 font-mono bg-black/30 p-3 rounded-lg overflow-x-auto max-h-60 overflow-y-auto">
                                                            {log.new_data ? JSON.stringify(log.new_data, null, 2) : 'Nenhum'}
                                                        </pre>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </MainLayout>
    );
}
