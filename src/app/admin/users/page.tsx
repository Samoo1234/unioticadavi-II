"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

type Profile = {
    id: string;
    full_name: string;
    email?: string;
    role_id: string;
    unit_id: number | null;
    active: boolean;
    roles?: { name: string };
};

type Role = {
    id: string;
    name: string;
};

type Unit = {
    id: number;
    nome_fantasia: string;
};

export default function UsersAdminPage() {
    const { hasPermission, loading: authLoading } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form States for Creation
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newName, setNewName] = useState("");
    const [newRoleId, setNewRoleId] = useState("");
    const [newUnitId, setNewUnitId] = useState("");
    const [createError, setCreateError] = useState("");
    const [creatingLoading, setCreatingLoading] = useState(false);

    useEffect(() => {
        if (!authLoading && hasPermission('admin', 'manage_users')) {
            fetchData();
        } else if (!authLoading) {
            setLoading(false); // Stop loading if auth is done but no permission
        }
    }, [authLoading]);

    const fetchData = async () => {
        setLoading(true);

        // Fetch Profiles - now we need valid email, but email is in auth.users not easily accessible by join unless we have a view or function.
        // For now we just show profiles. The API ensures synchronization.
        const { data: pData } = await supabase
            .from('profiles')
            .select('*, roles(name)')
            .order('full_name');

        // Fetch Roles
        const { data: rData } = await supabase
            .from('roles')
            .select('*')
            .order('name');

        // Fetch Units (Empresas)
        const { data: uData } = await supabase
            .from('empresas')
            .select('id, nome_fantasia')
            .order('nome_fantasia');

        if (pData) setProfiles(pData);
        if (rData) setRoles(rData);
        if (uData) setUnits(uData);

        setLoading(false);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError("");
        setCreatingLoading(true);

        try {
            const response = await fetch('/api/admin/users/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail,
                    password: newPassword,
                    fullName: newName,
                    roleId: newRoleId,
                    unitId: newUnitId ? parseInt(newUnitId) : null
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao criar usuário');
            }

            alert('Usuário criado com sucesso!');
            setIsCreating(false);
            setNewEmail("");
            setNewPassword("");
            setNewName("");
            setNewRoleId("");
            setNewUnitId("");
            fetchData();

        } catch (error: any) {
            setCreateError(error.message);
        } finally {
            setCreatingLoading(false);
        }
    };

    const handleUpdateProfile = async (id: string, updates: Partial<Profile>) => {
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', id);

        if (error) {
            alert('Erro ao atualizar perfil: ' + error.message);
        } else {
            fetchData();
            setEditingProfile(null);
        }
    };

    const handleDeleteUser = async (profile: Profile) => {
        const confirmed = window.confirm(
            `Tem certeza que deseja EXCLUIR o usuário "${profile.full_name || 'Sem Nome'}"?\n\nEssa ação é irreversível.`
        );
        if (!confirmed) return;

        try {
            const response = await fetch('/api/admin/users/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: profile.id })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao excluir usuário');
            }

            alert('Usuário excluído com sucesso!');
            fetchData();
        } catch (error: any) {
            alert('Erro: ' + error.message);
        }
    };

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
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Gestão de Usuários</h1>
                        <p className="text-gray-500 text-xs uppercase tracking-widest">Controle de acesso e permissões</p>
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-lg hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        NOVO USUÁRIO
                    </button>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-xs uppercase tracking-wider">
                        <thead className="bg-gray-950 text-gray-400">
                            <tr>
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Cargo / Nível</th>
                                <th className="px-6 py-4">Unidade</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-gray-300">
                            {profiles.map((profile) => (
                                <tr key={profile.id} className="hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-white">{profile.full_name || 'Usuário Sem Nome'}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-emerald-900/30 text-emerald-400 border border-emerald-800 px-2 py-1 rounded text-[10px] font-black">
                                            {profile.roles?.name || 'Sem Cargo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {units.find(u => u.id === profile.unit_id)?.nome_fantasia || 'Acesso Global / S.A.'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={profile.active ? 'text-green-500' : 'text-red-500'}>
                                            {profile.active ? '● ATIVO' : '○ INATIVO'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-3">
                                        <button
                                            onClick={() => setEditingProfile(profile)}
                                            className="text-emerald-500 hover:text-emerald-400 font-black transition-colors"
                                        >
                                            EDITAR
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(profile)}
                                            className="text-red-500 hover:text-red-400 font-black transition-colors"
                                        >
                                            EXCLUIR
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Criação */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-800">
                            <h2 className="text-xl font-black text-white uppercase italic">Novo Usuário</h2>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            {createError && (
                                <div className="bg-red-900/20 text-red-500 text-xs p-3 rounded-lg border border-red-900">
                                    {createError}
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-950 border border-gray-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">E-mail de Acesso</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-gray-950 border border-gray-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Senha Provisória</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full bg-gray-950 border border-gray-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Cargo</label>
                                    <select
                                        required
                                        className="w-full bg-gray-950 border border-gray-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newRoleId}
                                        onChange={(e) => setNewRoleId(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Unidade</label>
                                    <select
                                        className="w-full bg-gray-950 border border-gray-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                        value={newUnitId}
                                        onChange={(e) => setNewUnitId(e.target.value)}
                                    >
                                        <option value="">Global</option>
                                        {units.map(u => <option key={u.id} value={u.id}>{u.nome_fantasia}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 text-white font-black rounded-xl hover:bg-gray-800 transition-all text-xs"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingLoading}
                                    className="flex-1 px-4 py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all text-xs disabled:opacity-50"
                                >
                                    {creatingLoading ? 'CRIANDO...' : 'CRIAR USUÁRIO'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Edição */}
            {editingProfile && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-800">
                            <h2 className="text-xl font-black text-white uppercase italic">Configurar Usuário</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Definir Cargo</label>
                                <select
                                    className="w-full bg-gray-950 border border-gray-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={editingProfile.role_id}
                                    onChange={(e) => setEditingProfile({ ...editingProfile, role_id: e.target.value })}
                                >
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Vincular Unidade</label>
                                <select
                                    className="w-full bg-gray-950 border border-gray-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                                    value={editingProfile.unit_id || ''}
                                    onChange={(e) => setEditingProfile({ ...editingProfile, unit_id: e.target.value ? parseInt(e.target.value) : null })}
                                >
                                    <option value="">Acesso Global (Todas as Unidades)</option>
                                    {units.map(u => <option key={u.id} value={u.id}>{u.nome_fantasia}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="user-active"
                                    checked={editingProfile.active}
                                    onChange={(e) => setEditingProfile({ ...editingProfile, active: e.target.checked })}
                                    className="w-5 h-5 accent-emerald-500"
                                />
                                <label htmlFor="user-active" className="text-xs font-black text-gray-300 uppercase underline decoration-emerald-500 decoration-2">Usuário Ativo</label>
                            </div>
                        </div>
                        <div className="p-6 bg-gray-950 flex gap-4">
                            <button
                                onClick={() => setEditingProfile(null)}
                                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 text-white font-black rounded-xl hover:bg-gray-800 transition-all"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={() => handleUpdateProfile(editingProfile.id, {
                                    role_id: editingProfile.role_id,
                                    unit_id: editingProfile.unit_id,
                                    active: editingProfile.active
                                })}
                                className="flex-1 px-4 py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all"
                            >
                                SALVAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
