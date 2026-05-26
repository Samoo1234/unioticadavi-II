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

    // Otherwise return active companies with schedule config and CNPJ
    const { data: empresas, error } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, cidade, configuracao_horarios, telefone, cnpj')
        .eq('ativo', true)
        .order('nome_fantasia')

    if (error) {
        return NextResponse.json({ error: 'Erro ao buscar unidades' }, { status: 500 })
    }

    // Filter to only include active branches with a valid registered CNPJ and address
    const empresasFiltradas = (empresas || []).filter(e => 
        e.cnpj && 
        e.cnpj.trim() !== '' && 
        e.cnpj !== '11.111.111/0001-01' && 
        e.cnpj !== '11.111.111/00001.01' &&
        e.cidade && 
        e.cidade.trim() !== '' &&
        !e.nome_fantasia.toLowerCase().includes('depósito')
    )

    return NextResponse.json({ empresas: empresasFiltradas })
}

// POST — Create public appointment
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { empresaId, data, horario, pacienteNome, telefone, tipo, examesSelecionados, valorTotalExames } = body

        // Validation
        if (!empresaId || !data || !horario || !pacienteNome || !telefone) {
            return NextResponse.json(
                { error: 'Preencha todos os campos obrigatórios' },
                { status: 400 }
            )
        }

        if (tipo === 'Exame' && (!examesSelecionados || examesSelecionados.length === 0)) {
            return NextResponse.json(
                { error: 'Por favor, selecione ao menos um exame' },
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
        const { data: novoAgd, error: erroAgendamento } = await supabase
            .from('agendamentos')
            .insert({
                paciente_id: pacienteId,
                empresa_id: empresaId,
                data: data,
                hora: horario,
                tipo: tipo || 'Consulta',
                medico_id: medicoId,
                status: 'aguardando'
            })
            .select('id')
            .single()

        if (erroAgendamento || !novoAgd) {
            return NextResponse.json(
                { error: 'Erro ao criar agendamento' },
                { status: 500 }
            )
        }

        // 4.1. If Exam, create financial record (Option A)
        if (tipo === 'Exame') {
            const { error: erroFin } = await supabase
                .from('financeiro_agendamentos')
                .upsert({
                    id: novoAgd.id,
                    valor_total: valorTotalExames || 0,
                    tipo_financeiro: 'Exames',
                    observacoes: `Exames: ${(examesSelecionados || []).join(', ')}`,
                    pagamentos: []
                })

            if (erroFin) {
                console.error('[API Pública] Erro ao criar financeiro:', erroFin)
            } else {
                // WhatsApp Template Formatting
                const dataFormatadaMsg = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')
                const whatsappMsg = `*ÓTICA DAVI - CONFIRMAÇÃO DE EXAME*\n\nOlá, *${nomeTrimmed}*!\n\nSeu agendamento para realizar os seguintes exames na filial *Mantena* foi confirmado:\n\n${(examesSelecionados || []).map((ex: string) => `• _${ex}_`).join('\n')}\n\n📅 *Data:* ${dataFormatadaMsg}\n⏰ *Horário:* ${horario}\n💰 *Valor Total:* R$ ${(valorTotalExames || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\nEsperamos você!`
                console.log("================ TELEMETRIA WHATSAPP (PUBLIC) ================\n", whatsappMsg, "\n==============================================================")
            }
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
