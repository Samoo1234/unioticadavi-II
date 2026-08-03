import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateOpenClawKey, logOpenClawAudit, getClientIp } from '@/lib/openclaw/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey)
}

export async function GET(request: NextRequest) {
    const auth = await validateOpenClawKey(request, 'read')
    if (!auth.isValid) {
        return NextResponse.json({ error: auth.error }, { status: auth.statusCode })
    }

    const supabase = getServiceClient()

    // Query active clinical profiles from profiles + roles OR medicos table
    const { data: profiles, error: errProf } = await supabase
        .from('profiles')
        .select(`
            id,
            full_name,
            active,
            roles!inner (
                name
            )
        `)
        .eq('active', true)
        .in('roles.name', ['Médico', 'Optometrista'])

    let profissionais: any[] = []

    if (!errProf && profiles) {
        profissionais = profiles.map(p => ({
            id: p.id,
            nome: p.full_name,
            papel: (p.roles as any)?.name || 'Profissional'
        }))
    } else {
        // Fallback to medicos table if profiles join returns empty
        const { data: medicos } = await supabase
            .from('medicos')
            .select('id, nome')
            .eq('ativo', true)

        if (medicos) {
            profissionais = medicos.map(m => ({
                id: m.id,
                nome: m.nome,
                papel: 'Médico'
            }))
        }
    }

    await logOpenClawAudit({
        requestId: auth.requestId,
        apiKeyId: auth.apiKeyId,
        endpoint: '/api/openclaw/v1/profissionais',
        method: 'GET',
        scopeUsed: 'read',
        statusCode: 200,
        action: 'listar_profissionais',
        ipAddress: getClientIp(request),
        payload: { total: profissionais.length }
    })

    return NextResponse.json({ profissionais })
}
