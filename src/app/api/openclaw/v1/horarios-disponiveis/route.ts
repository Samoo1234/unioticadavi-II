import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateOpenClawKey, logOpenClawAudit, getClientIp } from '@/lib/openclaw/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey)
}

function parseSlotsFromConfig(config: any): string[] {
    if (!config || !config.turnos || !Array.isArray(config.turnos)) return []
    const interval = config.intervaloMinutos || 30

    const slots: string[] = []
    for (const turno of config.turnos) {
        if (!turno.ativo || !turno.inicio || !turno.fim) continue
        const [hIn, mIn] = turno.inicio.split(':').map(Number)
        const [hOut, mOut] = turno.fim.split(':').map(Number)

        let startMin = hIn * 60 + mIn
        const endMin = hOut * 60 + mOut

        while (startMin + interval <= endMin) {
            const h = Math.floor(startMin / 60)
            const m = startMin % 60
            const slotStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
            slots.push(slotStr)
            startMin += interval
        }
    }
    return slots
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

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return NextResponse.json({ error: 'Formato de data inválido. Use YYYY-MM-DD' }, { status: 422 })
    }

    const supabase = getServiceClient()

    const { data: empresa, error: errEmpresa } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, configuracao_horarios, timezone')
        .eq('id', Number(empresaId))
        .single()

    if (errEmpresa || !empresa) {
        return NextResponse.json({ error: 'Filial não encontrada' }, { status: 404 })
    }

    const slotsBase = parseSlotsFromConfig(empresa.configuracao_horarios)
    if (slotsBase.length === 0) {
        return NextResponse.json({ error: 'Filial sem configuração de horário válida' }, { status: 422 })
    }

    // Filter past slots on current day
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    let slotsValidos = slotsBase
    if (data === todayStr) {
        slotsValidos = slotsBase.filter(h => h > currentHHMM)
    }

    // Fetch active appointments occupying slots (aguardando & confirmado)
    const { data: agendamentos, error: errAgd } = await supabase
        .from('agendamentos')
        .select('hora')
        .eq('empresa_id', Number(empresaId))
        .eq('data', data)
        .in('status', ['aguardando', 'confirmado'])

    if (errAgd) {
        return NextResponse.json({ error: 'Erro ao consultar agendamentos no banco de dados' }, { status: 500 })
    }

    const ocupadosSet = new Set((agendamentos || []).map(a => a.hora.substring(0, 5)))
    const horariosLivre = slotsValidos.filter(h => !ocupadosSet.has(h))
    const horariosOcupados = slotsBase.filter(h => ocupadosSet.has(h))

    await logOpenClawAudit({
        requestId: auth.requestId,
        apiKeyId: auth.apiKeyId,
        endpoint: '/api/openclaw/v1/horarios-disponiveis',
        method: 'GET',
        scopeUsed: 'read',
        statusCode: 200,
        action: 'consultar_horarios_disponiveis',
        ipAddress: getClientIp(request),
        payload: { empresaId, data, totalLivre: horariosLivre.length }
    })

    return NextResponse.json({
        empresaId: empresa.id,
        nomeFilial: empresa.nome_fantasia,
        data,
        timezone: empresa.timezone || 'America/Sao_Paulo',
        horariosLivre,
        horariosOcupados
    })
}
