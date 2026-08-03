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
    const aPartirDeParam = searchParams.get('a_partir_de')
    const cidadeParam = searchParams.get('cidade')
    const empresaIdParam = searchParams.get('empresaId')

    const dataInicial = aPartirDeParam ? aPartirDeParam : new Date().toISOString().split('T')[0]

    const supabase = getServiceClient()

    // 1. Fetch active companies/branches
    let query = supabase
        .from('empresas')
        .select('id, nome_fantasia, cidade, configuracao_horarios, telefone')
        .eq('ativo', true)

    if (empresaIdParam) {
        query = query.eq('id', Number(empresaIdParam))
    }

    const { data: empresas, error: errEmpresas } = await query

    if (errEmpresas || !empresas || empresas.length === 0) {
        await logOpenClawAudit({
            requestId: auth.requestId,
            apiKeyId: auth.apiKeyId,
            endpoint: '/api/openclaw/v1/proxima-disponibilidade',
            method: 'GET',
            scopeUsed: 'read',
            statusCode: 404,
            action: 'buscar_proxima_disponibilidade',
            payload: { a_partir_de: dataInicial, cidade: cidadeParam, empresaId: empresaIdParam }
        })
        return NextResponse.json({ error: 'Nenhuma filial encontrada' }, { status: 404 })
    }

    // Filter by city if specified
    const empresasFiltradas = empresas.filter(e => {
        if (!e.cidade) return false
        if (cidadeParam && !e.cidade.toLowerCase().includes(cidadeParam.toLowerCase())) return false
        return !e.nome_fantasia.toLowerCase().includes('depósito')
    })

    if (empresasFiltradas.length === 0) {
        return NextResponse.json({ error: 'Nenhuma filial disponível para os filtros fornecidos' }, { status: 404 })
    }

    // 2. Iterate day by day starting from dataInicial up to 14 days
    const startDate = new Date(dataInicial + 'T00:00:00')

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
        const currentDate = new Date(startDate)
        currentDate.setDate(startDate.getDate() + dayOffset)
        const dateStr = currentDate.toISOString().split('T')[0]
        const dayOfWeekIndex = currentDate.getDay() // 0 = Sun, 1 = Mon ...

        for (const empresa of empresasFiltradas) {
            const config = empresa.configuracao_horarios as any || {}
            
            // Check day config from configuracao_horarios (or default standard slots)
            const diaConfig = config.diasDisponiveis?.find((d: any) => d.data === dateStr)
            
            // Standard slots fallback if not explicitly disabled
            let slotsValidos: string[] = []
            if (diaConfig && diaConfig.horarios && diaConfig.horarios.length > 0) {
                slotsValidos = diaConfig.horarios
            } else if (dayOfWeekIndex !== 0) { // Skip Sundays by default unless defined
                slotsValidos = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '14:00', '14:30', '15:00', '15:30', '16:00']
            }

            if (slotsValidos.length === 0) continue

            // Fetch occupied slots for this empresa + date
            const { data: agendamentos } = await supabase
                .from('agendamentos')
                .select('hora')
                .eq('empresa_id', empresa.id)
                .eq('data', dateStr)
                .neq('status', 'cancelado')

            const ocupados = new Set((agendamentos || []).map(a => a.hora.substring(0, 5)))
            const disponivel = slotsValidos.find(slot => !ocupados.has(slot))

            if (disponivel) {
                const responseData = {
                    filial: {
                        id: empresa.id,
                        nome: empresa.nome_fantasia,
                        cidade: empresa.cidade,
                        telefone: empresa.telefone
                    },
                    data: dateStr,
                    horario: disponivel,
                    timezone: 'America/Sao_Paulo'
                }

                await logOpenClawAudit({
                    requestId: auth.requestId,
                    apiKeyId: auth.apiKeyId,
                    endpoint: '/api/openclaw/v1/proxima-disponibilidade',
                    method: 'GET',
                    scopeUsed: 'read',
                    statusCode: 200,
                    action: 'buscar_proxima_disponibilidade',
                    payload: { a_partir_de: dataInicial, cidade: cidadeParam, resultado: responseData }
                })

                return NextResponse.json(responseData)
            }
        }
    }

    return NextResponse.json({
        error: 'Nenhum horário disponível encontrado nos próximos 14 dias'
    }, { status: 404 })
}
