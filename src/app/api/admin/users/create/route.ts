import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Initialize Supabase Admin Client (Service Role)
// This client bypasses RLS and is used for admin actions like creating users.
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
        const allCookies = cookieStore.getAll();
        console.log('DEBUG: API Route Cookies:', allCookies.map(c => `${c.name}=${c.value.substring(0, 10)}...`));


        // 1. Initialize Supabase Client for the Request (to check session)
        // Using @supabase/ssr to correctly handle Next.js cookies
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        // API routes usually don't set cookies, but this is required by the type definition
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            )
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing
                            // user sessions.
                        }
                    },
                },
            }
        );

        // 2. Verify Session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized: No active session' }, { status: 401 });
        }

        // 3. Verify Admin Permissions
        const { data: requesterProfile } = await supabase
            .from('profiles')
            .select('roles(name)')
            .eq('id', session.user.id)
            .single();

        const requesterRole = requesterProfile?.roles && (requesterProfile.roles as any).name;

        if (requesterRole !== 'Administrador') {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // 4. Parse Request Body
        const body = await request.json();
        const { email, password, fullName, roleId, unitId } = body;

        if (!email || !password || !fullName || !roleId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 5. Create User using Service Role Client
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (createError) {
            console.error('Supabase Create User Error:', createError);
            return NextResponse.json({ error: createError.message }, { status: 400 });
        }

        if (!newUser.user) {
            return NextResponse.json({ error: 'User creation failed unexpectedly' }, { status: 500 });
        }

        // 6. Update Profile with Role and Unit
        // The trigger might have created the profile, so we update it.
        // We use supabaseAdmin to bypass any RLS that might block the update if the user isn't the owner.
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                role_id: roleId,
                unit_id: unitId || null,
                full_name: fullName,
                active: true
            })
            .eq('id', newUser.user.id);

        if (profileError) {
            console.error('Profile Update Error:', profileError);
            // We don't delete the user here to avoid complex rollback, but we alert the admin.
            return NextResponse.json({ error: 'User created but profile update failed: ' + profileError.message }, { status: 500 });
        }

        // 7. Log Audit
        await supabaseAdmin.from('audit_logs').insert({
            user_id: session.user.id,
            action: 'CREATE_USER',
            module: 'admin',
            record_id: newUser.user.id,
            new_data: { email, roleId, unitId, fullName }
        });

        return NextResponse.json({ success: true, user: newUser.user });

    } catch (error: any) {
        console.error('API Context Error:', error);
        return NextResponse.json({ error: 'Internal Server Error: ' + error.message }, { status: 500 });
    }
}
