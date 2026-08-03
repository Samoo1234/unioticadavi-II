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

    const { searchParams } = new URL(request.url)
    const empresaId = searchParams.get('empresaId')
    const data = searchParams.get('data')

    if (!empresaId || !data) {
        return NextResponse.json({ error: 'Parâmetros empresaId e data são obrigatórios' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Fetch empresa config
    const { data: empresa, error: errEmpresa } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, configuracao_horarios')
        .eq('id', Number(empresaId))
        .single()

    if (errEmpresa || !empresa) {
        return NextResponse.json({ error: 'Filial não encontrada' }, { status: 404 })
    }

    // Fetch active appointments
    const { data: agendamentos, error: errAgd } = await supabase
        .from('agendamentos')
        .select('hora')
        .eq('empresa_id', Number(empresaId))
        .eq('data', data)
        .neq('status', 'cancelado')

    if (errAgd) {
        return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 })
    }

    const horariosOcupados = (agendamentos || []).map(a => a.hora.substring(0, 5))
    const config = empresa.configuracao_horarios as any || {}
    const diaConfig = config.diasDisponiveis?.find((d: any) => d.data === data)

    let horariosTotais: string[] = []
    if (diaConfig && diaConfig.horarios && diaConfig.horarios.length > 0) {
        horariosTotais = diaConfig.horarios
    } else {
        horariosTotais = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '14:00', '14:30', '15:00', '15:30', '16:00']
    }

    const ocupadosSet = new Set(horariosOcupados)
    const horariosLivre = horariosTotais.filter(h => !ocupadosSet.has(h))

    await logOpenClawAudit({
        requestId: auth.requestId,
        apiKeyId: auth.apiKeyId,
        endpoint: '/api/openclaw/v1/horarios-disponiveis',
        method: 'GET',
        scopeUsed: 'read',
        statusCode: 200,
        action: 'consultar_horarios_disponiveis',
        payload: { empresaId, data, totalLivre: horariosLivre.length }
    })

    return NextResponse.json({
        empresaId: empresa.id,
        nomeFilial: empresa.nome_fantasia,
        data,
        timezone: 'America/Sao_Paulo',
        horariosLivre,
        horariosOcupados
    })
}
