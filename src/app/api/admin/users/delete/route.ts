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

export async function DELETE(request: Request) {
    try {
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                        }
                    },
                },
            }
        );

        // Verify Session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
        }

        // Verify Admin Permissions
        const { data: requesterProfile } = await supabase
            .from('profiles')
            .select('roles(name)')
            .eq('id', session.user.id)
            .single();

        const requesterRole = requesterProfile?.roles && (requesterProfile.roles as any).name;

        if (requesterRole !== 'Administrador') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Parse Request Body
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        // Prevent self-deletion
        if (userId === session.user.id) {
            return NextResponse.json({ error: 'Você não pode excluir seu próprio usuário' }, { status: 400 });
        }

        // Delete profile first (cascade should handle, but let's be explicit)
        await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId);

        // Delete user from auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
            console.error('Supabase Delete User Error:', deleteError);
            return NextResponse.json({ error: deleteError.message }, { status: 400 });
        }

        // Log Audit
        await supabaseAdmin.from('audit_logs').insert({
            user_id: session.user.id,
            action: 'DELETE_USER',
            module: 'admin',
            record_id: userId,
            new_data: { deletedUserId: userId }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('API Delete User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
    }
}
