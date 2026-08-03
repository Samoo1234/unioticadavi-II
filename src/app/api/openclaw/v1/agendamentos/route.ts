import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import {
    validateOpenClawKey,
    logOpenClawAudit,
    checkIdempotencyKey,
    storeIdempotencyKey,
    sanitizePayloadLGPD
} from '@/lib/openclaw/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey)
}

// GET — Query appointments for date/branch
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
    const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select(`
            id,
            data,
            hora,
            tipo,
            status,
            created_at,
            pacientes (
                id,
                nome,
                telefone
            )
        `)
        .eq('empresa_id', Number(empresaId))
        .eq('data', data)
        .order('hora')

    if (error) {
        return NextResponse.json({ error: 'Erro ao listar agendamentos' }, { status: 500 })
    }

    // Sanitize PII for general GET endpoint
    const listSanitizada = (agendamentos || []).map((a: any) => ({
        id: a.id,
        data: a.data,
        horario: a.hora,
        tipo: a.tipo,
        status: a.status,
        paciente: a.pacientes ? sanitizePayloadLGPD({
            id: a.pacientes.id,
            nome: a.pacientes.nome,
            telefone: a.pacientes.telefone
        }) : null
    }))

    await logOpenClawAudit({
        requestId: auth.requestId,
        apiKeyId: auth.apiKeyId,
        endpoint: '/api/openclaw/v1/agendamentos',
        method: 'GET',
        scopeUsed: 'read',
        statusCode: 200,
        action: 'listar_agendamentos',
        payload: { empresaId, data, total: listSanitizada.length }
    })

    return NextResponse.json({ agendamentos: listSanitizada })
}

// POST — Create appointment (requires schedule scope & Idempotency-Key support)
export async function POST(request: NextRequest) {
    const auth = await validateOpenClawKey(request, 'schedule')
    if (!auth.isValid) {
        return NextResponse.json({ error: auth.error }, { status: auth.statusCode })
    }

    const idempotencyKey = request.headers.get('idempotency-key')
    if (idempotencyKey) {
        const cached = await checkIdempotencyKey(idempotencyKey, '/api/openclaw/v1/agendamentos')
        if (cached) return cached
    }

    try {
        const body = await request.json()
        const { empresaId, data, horario, pacienteNome, pacienteTelefone, tipo, observacoes } = body

        if (!empresaId || !data || !horario || !pacienteNome || !pacienteTelefone) {
            const errResp = { error: 'Preencha os campos obrigatórios: empresaId, data, horario, pacienteNome, pacienteTelefone' }
            return NextResponse.json(errResp, { status: 400 })
        }

        const supabase = getServiceClient()

        // 1. Check for schedule conflict
        const { data: conflito } = await supabase
            .from('agendamentos')
            .select('id')
            .eq('empresa_id', empresaId)
            .eq('data', data)
            .eq('hora', horario)
            .neq('status', 'cancelado')
            .maybeSingle()

        if (conflito) {
            const conflictResp = { error: 'Este horário já está ocupado. Escolha outro slot livre.' }
            return NextResponse.json(conflictResp, { status: 409 })
        }

        // 2. Find or register patient
        const nomeTrimmed = pacienteNome.trim()
        const telefoneTrimmed = pacienteTelefone.trim()

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
            const { data: novoPaciente, error: errPaciente } = await supabase
                .from('pacientes')
                .insert({ nome: nomeTrimmed, telefone: telefoneTrimmed })
                .select('id')
                .single()

            if (errPaciente || !novoPaciente) {
                return NextResponse.json({ error: 'Erro ao registrar paciente' }, { status: 500 })
            }
            pacienteId = novoPaciente.id
        }

        // 3. Create appointment with default status 'aguardando'
        const { data: novoAgd, error: errAgd } = await supabase
            .from('agendamentos')
            .insert({
                paciente_id: pacienteId,
                empresa_id: empresaId,
                data: data,
                hora: horario,
                tipo: tipo || 'Consulta',
                status: 'aguardando',
                observacoes: observacoes || 'Agendado via OpenClaw Davi'
            })
            .select('id, data, hora, status')
            .single()

        if (errAgd) {
            if (errAgd.code === '23505') { // Postgres Unique Constraint error code
                return NextResponse.json({ error: 'Conflito de horário detectado no banco de dados.' }, { status: 409 })
            }
            return NextResponse.json({ error: 'Erro ao salvar agendamento' }, { status: 500 })
        }

        const successResponse = {
            success: true,
            agendamentoId: novoAgd.id,
            status: novoAgd.status,
            mensagem: 'Agendamento criado com sucesso! Status inicial: aguardando.',
            detalhes: {
                empresaId,
                data: novoAgd.data,
                horario: novoAgd.hora,
                timezone: 'America/Sao_Paulo'
            }
        }

        // Save Idempotency Key if provided
        if (idempotencyKey) {
            await storeIdempotencyKey(idempotencyKey, '/api/openclaw/v1/agendamentos', 201, successResponse)
        }

        // Audit Log
        await logOpenClawAudit({
            requestId: auth.requestId,
            apiKeyId: auth.apiKeyId,
            endpoint: '/api/openclaw/v1/agendamentos',
            method: 'POST',
            scopeUsed: 'schedule',
            statusCode: 201,
            action: 'criar_agendamento',
            payload: body
        })

        return NextResponse.json(successResponse, { status: 201 })

    } catch (error: any) {
        console.error('[OpenClaw Agendamento POST] Erro:', error)
        return NextResponse.json({ error: 'Erro interno ao processar agendamento' }, { status: 500 })
    }
}
