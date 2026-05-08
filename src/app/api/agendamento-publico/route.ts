import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side Supabase client (bypasses RLS)
function getServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey)
}

// GET — List active companies with schedule config
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const empresaId = searchParams.get('empresaId')
    const data = searchParams.get('data')

    const supabase = getServiceClient()

    // If empresaId + data provided, return occupied time slots
    if (empresaId && data) {
        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select('hora')
            .eq('empresa_id', Number(empresaId))
            .eq('data', data)
            .neq('status', 'cancelado')

        if (error) {
            return NextResponse.json({ error: 'Erro ao buscar horários' }, { status: 500 })
        }

        const horariosOcupados = (agendamentos || []).map(a => a.hora.substring(0, 5))
        return NextResponse.json({ horariosOcupados })
    }

    // Otherwise return active companies with schedule config
    const { data: empresas, error } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, cidade, configuracao_horarios, telefone')
        .eq('ativo', true)
        .order('nome_fantasia')

    if (error) {
        return NextResponse.json({ error: 'Erro ao buscar unidades' }, { status: 500 })
    }

    return NextResponse.json({ empresas })
}

// POST — Create public appointment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { empresaId, data, horario, pacienteNome, telefone } = body

        // Validation
        if (!empresaId || !data || !horario || !pacienteNome || !telefone) {
            return NextResponse.json(
                { error: 'Preencha todos os campos obrigatórios' },
                { status: 400 }
            )
        }

        const supabase = getServiceClient()

        // 1. Check for time conflict
        const { data: conflitos } = await supabase
            .from('agendamentos')
            .select('id')
            .eq('empresa_id', empresaId)
            .eq('data', data)
            .eq('hora', horario)
            .neq('status', 'cancelado')

        if (conflitos && conflitos.length > 0) {
            return NextResponse.json(
                { error: 'Este horário já está ocupado. Por favor, escolha outro.' },
                { status: 409 }
            )
        }

        // 2. Find or create patient by name + phone
        const nomeTrimmed = pacienteNome.trim()
        const telefoneTrimmed = telefone.trim()

        const { data: pacienteExistente } = await supabase
            .from('pacientes')
            .select('id')
            .ilike('nome', nomeTrimmed)
            .eq('telefone', telefoneTrimmed)
            .maybeSingle()

        let pacienteId: string

        if (pacienteExistente) {
            pacienteId = pacienteExistente.id
        } else {
            const { data: novoPaciente, error: erroPaciente } = await supabase
                .from('pacientes')
                .insert({ nome: nomeTrimmed, telefone: telefoneTrimmed })
                .select('id')
                .single()

            if (erroPaciente || !novoPaciente) {
                return NextResponse.json(
                    { error: 'Erro ao registrar paciente' },
                    { status: 500 }
                )
            }
            pacienteId = novoPaciente.id
        }

        // 3. Get medico_id for the day (from empresa schedule config)
        const { data: empresa } = await supabase
            .from('empresas')
            .select('configuracao_horarios, telefone, nome_fantasia')
            .eq('id', empresaId)
            .single()

        let medicoId: number | null = null
        if (empresa?.configuracao_horarios) {
            const config = empresa.configuracao_horarios as any
            const diaConfig = config.diasDisponiveis?.find((d: any) => d.data === data)
            if (diaConfig?.medico_id) {
                medicoId = diaConfig.medico_id
            }
        }

        // 4. Insert appointment
        const { error: erroAgendamento } = await supabase
            .from('agendamentos')
            .insert({
                paciente_id: pacienteId,
                empresa_id: empresaId,
                data: data,
                hora: horario,
                tipo: 'Consulta',
                medico_id: medicoId,
                status: 'aguardando'
            })

        if (erroAgendamento) {
            return NextResponse.json(
                { error: 'Erro ao criar agendamento' },
                { status: 500 }
            )
        }

        // 5. Build response details
        const dataFormatada = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
        })

        const nomeUnidade = empresa?.nome_fantasia || ''

        return NextResponse.json({
            success: true,
            message: 'Agendamento realizado com sucesso!',
            detalhes: {
                data: dataFormatada,
                horario,
                unidade: nomeUnidade
            }
        })

    } catch (error: any) {
        console.error('[Agendamento Público] Erro:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
