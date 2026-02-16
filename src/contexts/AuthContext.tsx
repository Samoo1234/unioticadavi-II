"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export type Permission = {
    module: string;
    action: string;
};

type AuthContextType = {
    user: any | null;
    profile: any | null;
    permissions: Permission[];
    roleName: string | null;
    medicoId: number | null;
    loading: boolean;
    hasPermission: (module: string, action: string) => boolean;
    isModuleAllowed: (module: string) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [roleName, setRoleName] = useState<string | null>(null);
    const [medicoId, setMedicoId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const isPublicRoute = pathname?.startsWith('/verificar');

    const lastProfileUserId = React.useRef<string | null>(null);

    const fetchProfileData = async (userId: string) => {
        // Avoid redundant fetches if profile for this user is already loaded
        if (lastProfileUserId.current === userId && profile) {
            setLoading(false);
            return;
        }

        try {
            console.log(`[Auth] Buscando perfil para: ${userId}`);
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    roles (
                        name,
                        role_permissions (
                            permissions (
                                module,
                                action
                            )
                        )
                    )
                `)
                .eq('id', userId)
                .single();

            if (error) {
                console.error('[Auth] Erro ao buscar perfil:', error.message);
                // Keep existing profile if it's a transient error, 
                // but if we have NO profile, we must indicate loading is done
                if (!profile) {
                    setProfile(null);
                    setPermissions([]);
                    setRoleName(null);
                }
                return;
            }

            if (data) {
                console.log('[Auth] Perfil carregado com sucesso');
                lastProfileUserId.current = userId;
                setProfile(data);
                const r = data.roles as any;
                if (r) {
                    setRoleName(r.name);
                    const pList = r.role_permissions.map((rp: any) => ({
                        module: rp.permissions.module,
                        action: rp.permissions.action
                    }));
                    setPermissions(pList);

                    if (r.name === 'Médico') {
                        const { data: medicoData } = await supabase
                            .from('medicos')
                            .select('id')
                            .eq('user_id', userId)
                            .eq('ativo', true)
                            .maybeSingle();

                        if (medicoData) {
                            setMedicoId(medicoData.id);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[Auth] Erro fatal no fetchProfileData:', err);
        } finally {
            setLoading(false);
        }
    };

    // 1. Unified Auth State Management
    useEffect(() => {
        let mounted = true;

        const handleSession = async (session: any, eventName = 'NONE') => {
            if (!mounted) return;
            console.log(`[Auth] Evento: ${eventName} | Usuário: ${session?.user?.id || 'Nenhum'}`);

            if (session?.user) {
                setUser(session.user);
                await fetchProfileData(session.user.id);
            } else {
                console.log('[Auth] Sessão limpa');
                lastProfileUserId.current = null;
                setUser(null);
                setProfile(null);
                setPermissions([]);
                setRoleName(null);
                setMedicoId(null);
                setLoading(false);
            }
        };

        // Initialize session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session, 'INITIAL_SESSION');
        });

        // Listen for all auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            await handleSession(session, event);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // 3. Route Protection (Runs on changes)
    useEffect(() => {
        if (!loading && !user && !isPublicRoute) {
            router.push('/login');
        }
    }, [user, loading, isPublicRoute, router]);

    const hasPermission = (module: string, action: string) => {
        if (roleName === 'Administrador') return true;
        return permissions.some(p => p.module === module && p.action === action);
    };

    const isModuleAllowed = (module: string) => {
        if (roleName === 'Administrador') return true;
        return permissions.some(p => p.module === module);
    };

    return (
        <AuthContext.Provider value={{ user, profile, permissions, roleName, medicoId, loading, hasPermission, isModuleAllowed }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
