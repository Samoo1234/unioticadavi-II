import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
            .maybeSingle()

        if (error) throw error

        return NextResponse.json(data)
    } catch (error: any) {
        console.error('Error fetching profile via API:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
