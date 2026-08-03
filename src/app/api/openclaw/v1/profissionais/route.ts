import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateOpenClawKey, logOpenClawAudit } from '@/lib/openclaw/auth'

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

    // Fetch doctors/optometrists from usuarios where role is medico or optometrista
    const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, papel, empresa_id')
        .in('papel', ['medico', 'optometrista', 'admin'])

    if (error) {
        return NextResponse.json({ error: 'Erro ao buscar profissionais' }, { status: 500 })
    }

    const profissionais = (usuarios || []).map(u => ({
        id: u.id,
        nome: u.nome,
        papel: u.papel,
        empresaId: u.empresa_id
    }))

    await logOpenClawAudit({
        requestId: auth.requestId,
        apiKeyId: auth.apiKeyId,
        endpoint: '/api/openclaw/v1/profissionais',
        method: 'GET',
        scopeUsed: 'read',
        statusCode: 200,
        action: 'listar_profissionais',
        payload: { total: profissionais.length }
    })

    return NextResponse.json({ profissionais })
}
