"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export type Permission = {
    module: string;
    action: string;
};

type AuthContextType = {
    user: any | null;
    profile: any | null;
    permissions: Permission[];
    roleName: string | null;
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
    const [loading, setLoading] = useState(true);
    const router = useRouter();

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
            }
        }
    };

    useEffect(() => {
        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setUser(session.user);
                await fetchProfileData(session.user.id);
            } else {
                setLoading(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session) {
                setUser(session.user);
                await fetchProfileData(session.user.id);
            } else {
                setUser(null);
                setProfile(null);
                setPermissions([]);
                setRoleName(null);
                router.push('/login');
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const hasPermission = (module: string, action: string) => {
        if (roleName === 'Administrador') return true;
        return permissions.some(p => p.module === module && p.action === action);
    };

    const isModuleAllowed = (module: string) => {
        if (roleName === 'Administrador') return true;
        return permissions.some(p => p.module === module);
    };

    return (
        <AuthContext.Provider value={{ user, profile, permissions, roleName, loading, hasPermission, isModuleAllowed }}>
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
