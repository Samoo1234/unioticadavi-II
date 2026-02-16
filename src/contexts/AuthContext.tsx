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
        try {
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
                // Clear profile state if fetching fails to avoid stale data
                setProfile(null);
                setPermissions([]);
                setRoleName(null);
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
            console.error('Fatal error in fetchProfileData:', err);
        } finally {
            setLoading(false);
        }
    };

    // 1. Unified Auth State Management
    useEffect(() => {
        let mounted = true;

        const handleSession = async (session: any) => {
            if (!mounted) return;

            if (session?.user) {
                if (session.user.id !== user?.id) {
                    setUser(session.user);
                    await fetchProfileData(session.user.id);
                }
            } else {
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
            handleSession(session);
        });

        // Listen for all auth changes (including SIGN_OUT, TOKEN_REFRESHED)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
                // Force immediate clean up on specific events
                await handleSession(session);
            } else {
                await handleSession(session);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []); // Only run once on mount

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
