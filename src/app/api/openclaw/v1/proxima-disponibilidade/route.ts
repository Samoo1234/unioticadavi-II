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
    const aPartirDeParam = searchParams.get('a_partir_de')
    const cidadeParam = searchParams.get('cidade')
    const empresaIdParam = searchParams.get('empresaId')

    const dataInicial = aPartirDeParam ? aPartirDeParam : new Date().toISOString().split('T')[0]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicial)) {
        return NextResponse.json({ error: 'Formato de data inválido. Use YYYY-MM-DD' }, { status: 422 })
    }

    const supabase = getServiceClient()

    // Query active companies
    let query = supabase
        .from('empresas')
        .select('id, nome_fantasia, cidade, configuracao_horarios, telefone, timezone')
        .eq('ativo', true)

    if (empresaIdParam) {
        query = query.eq('id', Number(empresaIdParam))
    }

    const { data: empresas, error: errEmpresas } = await query

    if (errEmpresas || !empresas || empresas.length === 0) {
        return NextResponse.json({ error: 'Nenhuma filial encontrada' }, { status: 404 })
    }

    const empresasFiltradas = empresas.filter(e => {
        if (!e.cidade) return false
        if (cidadeParam && !e.cidade.toLowerCase().includes(cidadeParam.toLowerCase())) return false
        return !e.nome_fantasia.toLowerCase().includes('depósito')
    })

    if (empresasFiltradas.length === 0) {
        return NextResponse.json({ error: 'Nenhuma filial disponível para os filtros informados' }, { status: 404 })
    }

    const startDate = new Date(dataInicial + 'T00:00:00')
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    interface CandidateSlot {
        empresa: any
        data: string
        horario: string
        datetime: Date
    }

    let earliestCandidate: CandidateSlot | null = null

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + dayOffset)
        const dateStr = currentDate.toISOString().split('T')[0]

        for (const empresa of empresasFiltradas) {
            const config = empresa.configuracao_horarios as any
            const slotsBase = parseSlotsFromConfig(config)
            if (slotsBase.length === 0) continue // Skip branches without valid turnos config

            // Filter past slots on current day
            let slotsValidos = slotsBase
            if (dateStr === todayStr) {
                slotsValidos = slotsBase.filter(h => h > currentHHMM)
            }

            if (slotsValidos.length === 0) continue

            // Fetch occupied slots for active appointments (aguardando & confirmado)
            const { data: agendamentos, error: errAgd } = await supabase
                .from('agendamentos')
                .select('hora')
                .eq('empresa_id', empresa.id)
                .eq('data', dateStr)
                .in('status', ['aguardando', 'confirmado'])

            if (errAgd) continue

            const ocupados = new Set((agendamentos || []).map(a => a.hora.substring(0, 5)))
            const disponivel = slotsValidos.find(slot => !ocupados.has(slot))

            if (disponivel) {
                const candidateDatetime = new Date(`${dateStr}T${disponivel}:00`)
                if (!earliestCandidate || candidateDatetime < earliestCandidate.datetime) {
                    earliestCandidate = {
                        empresa,
                        data: dateStr,
                        horario: disponivel,
                        datetime: candidateDatetime
                    }
                }
            }
        }

        // Return immediately if we found the earliest candidate up to this day
        if (earliestCandidate) break
    }

    if (!earliestCandidate) {
        return NextResponse.json({ error: 'Nenhum horário disponível encontrado nos próximos 14 dias' }, { status: 404 })
    }

    const responseData = {
        filial: {
            id: earliestCandidate.empresa.id,
            nome: earliestCandidate.empresa.nome_fantasia,
            cidade: earliestCandidate.empresa.cidade,
            telefone: earliestCandidate.empresa.telefone
        },
        data: earliestCandidate.data,
        horario: earliestCandidate.horario,
        timezone: earliestCandidate.empresa.timezone || 'America/Sao_Paulo'
    }

    await logOpenClawAudit({
        requestId: auth.requestId,
        apiKeyId: auth.apiKeyId,
        endpoint: '/api/openclaw/v1/proxima-disponibilidade',
        method: 'GET',
        scopeUsed: 'read',
        statusCode: 200,
        action: 'buscar_proxima_disponibilidade',
        ipAddress: getClientIp(request),
        payload: { a_partir_de: dataInicial, cidade: cidadeParam, resultado: responseData }
    })

    return NextResponse.json(responseData)
}
