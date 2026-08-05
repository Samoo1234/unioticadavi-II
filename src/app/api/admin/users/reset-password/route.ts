import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Initialize Supabase Admin Client (Service Role)
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

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();

        // 1. Initialize Supabase Client for the Request (to check session)
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
                            // Can be ignored in API routes
                        }
                    },
                },
            }
        );

        // 2. Verify Session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Não autorizado: Sessão inválida ou expirada' }, { status: 401 });
        }

        // 3. Verify Admin Permissions
        const { data: requesterProfile } = await supabase
            .from('profiles')
            .select('roles(name)')
            .eq('id', session.user.id)
            .single();

        const requesterRole = requesterProfile?.roles && (requesterProfile.roles as any).name;

        if (requesterRole !== 'Administrador') {
            return NextResponse.json({ error: 'Acesso negado: Requer privilégios de Administrador' }, { status: 403 });
        }

        // 4. Parse Request Body
        const body = await request.json();
        const { userId, newPassword } = body;

        if (!userId || !newPassword) {
            return NextResponse.json({ error: 'Parâmetros ausentes (userId, newPassword)' }, { status: 400 });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400 });
        }

        // 5. Update User Password using Service Role Client
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (updateError) {
            console.error('Erro ao atualizar senha via Supabase Admin:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        // 6. Audit Log
        try {
            await supabaseAdmin.from('audit_logs').insert({
                user_id: session.user.id,
                action: 'RESET_USER_PASSWORD',
                module: 'admin',
                record_id: userId,
                new_data: { reset_by: session.user.id }
            });
        } catch (auditErr) {
            console.error('Erro ao registrar log de auditoria:', auditErr);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('API Error in reset-password:', error);
        return NextResponse.json({ error: 'Erro interno no servidor: ' + error.message }, { status: 500 });
    }
}
