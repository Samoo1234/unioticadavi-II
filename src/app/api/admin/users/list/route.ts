import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function GET() {
    try {
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {
                            // Ignored in Server Components
                        }
                    },
                },
            }
        );

        // Verify session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin permission
        const { data: requesterProfile } = await supabaseAdmin
            .from('profiles')
            .select('roles(name)')
            .eq('id', session.user.id)
            .single();

        const requesterRole = requesterProfile?.roles && (requesterProfile.roles as any).name;
        if (requesterRole !== 'Administrador') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch ALL profiles using admin client (bypasses RLS)
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('*, roles(name)')
            .order('full_name');

        if (profilesError) {
            return NextResponse.json({ error: profilesError.message }, { status: 500 });
        }

        // Fetch roles
        const { data: roles } = await supabaseAdmin
            .from('roles')
            .select('*')
            .order('name');

        // Fetch units
        const { data: units } = await supabaseAdmin
            .from('empresas')
            .select('id, nome_fantasia')
            .order('nome_fantasia');

        return NextResponse.json({ profiles, roles, units });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
