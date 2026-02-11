"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type Permission = {
    id: string;
    module: string;
    action: string;
};

type Role = {
    id: string;
    name: string;
    description: string;
};

export default function RolesAdminPage() {
    const { hasPermission, loading: authLoading } = useAuth();
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [rolePermissions, setRolePermissions] = useState<string[]>([]); // Array of permission IDs
    const [loading, setLoading] = useState(true);

    // Translation Maps
    const moduleTranslations: Record<string, string> = {
        admin: 'Administração',
        estoque: 'Estoque',
        financeiro: 'Financeiro',
        pacientes: 'Pacientes',
        vendas: 'Vendas',
        agendamentos: 'Agendamentos',
        clinica: 'Clínica',
        cmv: 'CMV',
        empresas: 'Empresas'
    };

    const actionTranslations: Record<string, string> = {
        view: 'Visualizar',
        create: 'Criar',
        edit: 'Editar',
        delete: 'Excluir',
        manage_users: 'Gerenciar Usuários',
        view_users: 'Visualizar Usuários',
        view_audit: 'Ver Auditoria',
        view_history: 'Ver Histórico',
        apply_discount: 'Aplicar Desconto',
        calculate: 'Calcular'
    };

    useEffect(() => {
        if (!authLoading && hasPermission('admin', 'manage_users')) {
            fetchData();
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [authLoading]);

    const fetchData = async () => {
        setLoading(true);
        const { data: rData } = await supabase.from('roles').select('*').order('name');
        const { data: pData } = await supabase.from('permissions').select('*').order('module', { ascending: true });

        if (rData) setRoles(rData);
        if (pData) setPermissions(pData);
        setLoading(false);
    };

    const fetchRolePermissions = async (roleId: string) => {
        setSelectedRole(roleId);
        const { data } = await supabase
            .from('role_permissions')
            .select('permission_id')
            .eq('role_id', roleId);

        if (data) {
            setRolePermissions(data.map((rp: any) => rp.permission_id));
        } else {
            setRolePermissions([]);
        }
    };

    const togglePermission = async (permissionId: string) => {
        if (!selectedRole) return;

        if (rolePermissions.includes(permissionId)) {
            // Remove
            await supabase
                .from('role_permissions')
                .delete()
                .eq('role_id', selectedRole)
                .eq('permission_id', permissionId);
            setRolePermissions(prev => prev.filter(id => id !== permissionId));
        } else {
            // Add
            await supabase
                .from('role_permissions')
                .insert({ role_id: selectedRole, permission_id: permissionId });
            setRolePermissions(prev => [...prev, permissionId]);
        }
    };

    // Group permissions by module
    const permissionsByModule = permissions.reduce((acc, curr) => {
        if (!acc[curr.module]) acc[curr.module] = [];
        acc[curr.module].push(curr);
        return acc;
    }, {} as Record<string, Permission[]>);

    if (loading || authLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
            </MainLayout>
        );
    }

    if (!hasPermission('admin', 'manage_users')) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-full">
                    <p className="text-red-500 font-bold">ACESSO NEGADO</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="flex h-[calc(100vh-100px)] gap-6">
                {/* Lado Esquerdo: Lista de Cargos */}
                <div className="w-1/3 space-y-4 flex flex-col">
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Cargos</h1>
                        <p className="text-gray-500 text-xs uppercase tracking-widest">Selecione para editar permissões</p>
                    </div>

                    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex-1 shadow-2xl">
                        <div className="divide-y divide-gray-800">
                            {roles.map((role) => (
                                <button
                                    key={role.id}
                                    onClick={() => fetchRolePermissions(role.id)}
                                    className={`w-full text-left px-6 py-4 transition-colors ${selectedRole === role.id ? 'bg-emerald-900/30 text-white' : 'text-gray-400 hover:bg-gray-800'
                                        }`}
                                >
                                    <div className="font-bold text-sm uppercase">{role.name}</div>
                                    <div className="text-[10px] text-gray-500">{role.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Lado Direito: Matriz de Permissões */}
                <div className="w-2/3 space-y-4 flex flex-col">
                    {selectedRole ? (
                        <>
                            <div>
                                <h2 className="text-xl font-black text-emerald-500 uppercase tracking-tighter">
                                    Permissões: {roles.find(r => r.id === selectedRole)?.name}
                                </h2>
                                <p className="text-gray-500 text-xs uppercase tracking-widest">Marque as caixas para conceder acesso</p>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 rounded-2xl flex-1 shadow-2xl overflow-y-auto p-6 space-y-8 custom-scrollbar">
                                {Object.entries(permissionsByModule).map(([module, perms]) => (
                                    <div key={module}>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-gray-800 pb-2 mb-4">
                                            Módulo: <span className="text-emerald-500">{moduleTranslations[module] || module}</span>
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {perms.map((perm) => (
                                                <div
                                                    key={perm.id}
                                                    onClick={() => togglePermission(perm.id)}
                                                    className={`cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between ${rolePermissions.includes(perm.id)
                                                        ? 'bg-emerald-900/20 border-emerald-500/50'
                                                        : 'bg-gray-950 border-gray-800 hover:border-gray-700'
                                                        }`}
                                                >
                                                    <div>
                                                        <div className={`text-xs font-bold uppercase ${rolePermissions.includes(perm.id) ? 'text-emerald-400' : 'text-gray-400'
                                                            }`}>
                                                            {actionTranslations[perm.action] || perm.action}
                                                        </div>
                                                        <div className="text-[9px] text-gray-600 uppercase">
                                                            {moduleTranslations[perm.module] || perm.module}.{actionTranslations[perm.action] || perm.action}
                                                        </div>
                                                    </div>
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${rolePermissions.includes(perm.id)
                                                        ? 'bg-emerald-500 border-emerald-500'
                                                        : 'border-gray-700'
                                                        }`}>
                                                        {rolePermissions.includes(perm.id) && (
                                                            <svg className="w-2 h-2 text-black" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center flex-col text-gray-600 gap-4">
                            <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <p className="text-sm font-bold uppercase tracking-widest">Nenhum cargo selecionado</p>
                            <div className="text-[10px] text-gray-500 max-w-xs text-center leading-relaxed">
                                Selecione um cargo da lista à esquerda para visualizar e gerenciar suas permissões detalhadas.
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
