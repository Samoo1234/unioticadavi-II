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

    const fetchProfileData = async (userId: string) => {
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
            console.error('Error fetching profile:', error);
            return;
        }

        if (data) {
            setProfile(data);
            const r = data.roles as any;
            if (r) {
                setRoleName(r.name);
                const pList = r.role_permissions.map((rp: any) => ({
                    module: rp.permissions.module,
                    action: rp.permissions.action
                }));
                setPermissions(pList);

                // If role is Médico, fetch medico_id linked to this user
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
    };

    // 1. Auth State Listener (Runs once)
    useEffect(() => {
        let mounted = true;

        const handleSession = async (session: any) => {
            if (!mounted) return;

            if (session?.user) {
                setUser(session.user);
                // Fetch profile only if not loaded or different user
                // Note: user state inside here is from closure, so simpler to just fetch always or check id
                // But since this is "session changed" or "init", let's fetch.
                await fetchProfileData(session.user.id);
            } else {
                setUser(null);
                setProfile(null);
                setPermissions([]);
                setRoleName(null);
                setMedicoId(null);
            }
            setLoading(false);
        };

        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            await handleSession(session);
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            await handleSession(session);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []); // Empty dependency array ensures this runs once

    // 2. Session Sync on Navigation (Runs on route change)
    // This ensures that if middleware updated the cookie/session, the client picks it up.
    useEffect(() => {
        const syncSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && session.user.id !== user?.id) {
                // User changed or session recovered
                setUser(session.user);
                await fetchProfileData(session.user.id);
            } else if (!session && user) {
                // Session lost
                setUser(null);
                setProfile(null);
            }
        };

        syncSession();
    }, [pathname]);

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
