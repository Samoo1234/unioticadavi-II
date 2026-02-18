"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { debugLog, debugError } from "@/utils/debugUtils";
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

    const PUBLIC_PREFIXES = ['/verificar', '/login'];
    const isPublicRoute = PUBLIC_PREFIXES.some(prefix => pathname?.startsWith(prefix)) ||
        (typeof window !== 'undefined' && PUBLIC_PREFIXES.some(prefix => window.location.pathname.startsWith(prefix)));

    const lastProfileUserId = React.useRef<string | null>(null);
    const fetchingForUserId = React.useRef<string | null>(null);

    const fetchProfileData = async (userId: string) => {
        // Avoid redundant fetches:
        // 1. If profile for this user is already fully loaded (ref-based, not state-based)
        if (lastProfileUserId.current === userId) {
            console.log('[Auth] Perfil já carregado para este usuário, ignorando fetch duplicado');
            setLoading(false);
            return;
        }
        // 2. If a fetch for this exact user is already in flight
        if (fetchingForUserId.current === userId) {
            console.log('[Auth] Fetch já em andamento para este usuário, ignorando');
            return;
        }
        fetchingForUserId.current = userId;

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
                debugError('AUTH_PROFILE', 'Erro ao carregar perfil, usando fallback local', error);
                // Keep existing profile if it's a transient error, 
                // but if we have NO profile, we must indicate loading is done
                if (!profile) {
                    setProfile(null);
                    setPermissions([]);
                    setRoleName(null);
                }
                throw error;
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
            fetchingForUserId.current = null;
            setLoading(false);
        }
    };

    // Unified Auth State Management
    useEffect(() => {
        let mounted = true;

        const handleSession = async (session: any, eventName = 'NONE') => {
            if (!mounted) return;

            const currentUserId = session?.user?.id || null;
            console.log(`[Auth] Evento: ${eventName} | Usuário: ${currentUserId || 'Nenhum'}`);

            if (currentUserId) {
                setUser(session.user);
                // fetchProfileData handles its own deduplication using lastProfileUserId
                await fetchProfileData(currentUserId);
            } else {
                console.log('[Auth] Sessão limpa');
                lastProfileUserId.current = null;
                fetchingForUserId.current = null;
                setUser(null);
                setProfile(null);
                setPermissions([]);
                setRoleName(null);
                setMedicoId(null);
                setLoading(false);
            }
        };

        // Initialize and listen for all auth changes
        // onAuthStateChange handles both initial session and subsequent events
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            debugLog('AUTH_STATE', `Estado mudou: ${event}`, { userId: session?.user?.id });
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
