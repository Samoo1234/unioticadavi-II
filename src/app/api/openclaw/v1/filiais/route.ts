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
    const { data: empresas, error } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, cidade, telefone, timezone')
        .eq('ativo', true)
        .order('nome_fantasia')

    if (error) {
        return NextResponse.json({ error: 'Erro ao buscar filiais' }, { status: 500 })
    }

    const filiais = (empresas || [])
        .filter(e => e.cidade && e.cidade.trim() !== '' && !e.nome_fantasia.toLowerCase().includes('depósito'))
        .map(e => ({
            id: e.id,
            nome: e.nome_fantasia,
            cidade: e.cidade,
            telefone: e.telefone,
            timezone: e.timezone || 'America/Sao_Paulo'
        }))

    await logOpenClawAudit({
        requestId: auth.requestId,
        apiKeyId: auth.apiKeyId,
        endpoint: '/api/openclaw/v1/filiais',
        method: 'GET',
        scopeUsed: 'read',
        statusCode: 200,
        action: 'listar_filiais',
        ipAddress: getClientIp(request),
        payload: { total: filiais.length }
    })

    return NextResponse.json({ filiais })
}
