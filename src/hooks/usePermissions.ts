import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type Permission = {
    module: string;
    action: string;
};

export function usePermissions() {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [roleName, setRoleName] = useState<string | null>(null);

    useEffect(() => {
        const fetchPermissions = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoading(false);
                return;
            }

            // Fetch user profile with role and permissions
            const { data: profile, error } = await supabase
                .from('profiles')
                .select(`
                    role_id,
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
                .eq('id', session.user.id)
                .single();

            if (error) {
                console.error('Error fetching permissions:', error);
            } else if (profile && profile.roles) {
                const r = profile.roles as any;
                setRoleName(r.name);

                const pList = r.role_permissions.map((rp: any) => ({
                    module: rp.permissions.module,
                    action: rp.permissions.action
                }));

                setPermissions(pList);
            }
            setLoading(false);
        };

        fetchPermissions();
    }, []);

    const hasPermission = (module: string, action: string) => {
        if (roleName === 'Administrador') return true;
        return permissions.some(p => p.module === module && p.action === action);
    };

    const isModuleAllowed = (module: string) => {
        if (roleName === 'Administrador') return true;
        return permissions.some(p => p.module === module);
    };

    return { permissions, roleName, loading, hasPermission, isModuleAllowed };
}
