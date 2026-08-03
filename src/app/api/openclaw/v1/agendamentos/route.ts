import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
    validateOpenClawKey,
    logOpenClawAudit,
    getClientIp
} from '@/lib/openclaw/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey)
}

// GET — List appointments with PII masked
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
            created_at
        `)
        .eq('empresa_id', Number(empresaId))
        .eq('data', data)
        .order('hora')

    if (error) {
        return NextResponse.json({ error: 'Erro ao listar agendamentos' }, { status: 500 })
    }

    await logOpenClawAudit({
        requestId: auth.requestId,
        apiKeyId: auth.apiKeyId,
        endpoint: '/api/openclaw/v1/agendamentos',
        method: 'GET',
        scopeUsed: 'read',
        statusCode: 200,
        action: 'listar_agendamentos',
        ipAddress: getClientIp(request),
        payload: { empresaId, data, total: (agendamentos || []).length }
    })

    return NextResponse.json({ agendamentos })
}

// POST — Create appointment via atomic RPC create_agendamento_idempotent
export async function POST(request: NextRequest) {
    const auth = await validateOpenClawKey(request, 'schedule')
    if (!auth.isValid) {
        return NextResponse.json({ error: auth.error }, { status: auth.statusCode })
    }

    const idempotencyKey = request.headers.get('idempotency-key') || `auto_${crypto.randomUUID()}`

    try {
        const rawBodyText = await request.text()
        let body: any = {}
        try {
            body = JSON.parse(rawBodyText)
        } catch {
            return NextResponse.json({ error: 'Corpo da requisição deve ser um JSON válido' }, { status: 400 })
        }

        const { empresaId, data, horario, pacienteNome, pacienteTelefone, tipo, observacoes } = body

        if (!empresaId || !data || !horario || !pacienteNome || !pacienteTelefone) {
            return NextResponse.json({
                error: 'Campos obrigatórios ausentes: empresaId, data, horario, pacienteNome, pacienteTelefone'
            }, { status: 400 })
        }

        // Validate date format YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
            return NextResponse.json({ error: 'Formato de data inválido. Use YYYY-MM-DD' }, { status: 422 })
        }

        // Compute request hash
        const requestHash = crypto.createHash('sha256').update(rawBodyText).digest('hex')
        const supabase = getServiceClient()

        // Invoke atomic RPC
        const { data: rpcResult, error: rpcError } = await supabase.rpc('create_agendamento_idempotent', {
            p_api_key_id: auth.apiKeyId,
            p_idempotency_key: idempotencyKey,
            p_method: 'POST',
            p_endpoint: '/api/openclaw/v1/agendamentos',
            p_request_hash: requestHash,
            p_empresa_id: Number(empresaId),
            p_data: data,
            p_hora: horario,
            p_paciente_nome: pacienteNome.trim(),
            p_paciente_telefone: pacienteTelefone.trim(),
            p_tipo: tipo || 'Consulta',
            p_observacoes: observacoes || 'Criado via OpenClaw API'
        })

        if (rpcError) {
            const errMsg = rpcError.message || ''

            if (errMsg.includes('IDEMPOTENCY_CONFLICT')) {
                return NextResponse.json({ error: 'Idempotency-Key reutilizada com payload diferente' }, { status: 409 })
            }
            if (errMsg.includes('IDEMPOTENCY_PENDING')) {
                return NextResponse.json({ error: 'Requisição com esta Idempotency-Key já está em processamento' }, { status: 409 })
            }
            if (errMsg.includes('23505') || errMsg.includes('idx_agendamentos_empresa_data_hora_unico')) {
                return NextResponse.json({ error: 'Horário já ocupado nesta filial.' }, { status: 409 })
            }

            console.error('[OpenClaw Agendamentos POST] Erro RPC:', rpcError)
            return NextResponse.json({ error: 'Erro ao processar agendamento' }, { status: 500 })
        }

        await logOpenClawAudit({
            requestId: auth.requestId,
            apiKeyId: auth.apiKeyId,
            endpoint: '/api/openclaw/v1/agendamentos',
            method: 'POST',
            scopeUsed: 'schedule',
            statusCode: 201,
            action: 'criar_agendamento',
            ipAddress: getClientIp(request),
            payload: { empresaId, data, horario, tipo }
        })

        return NextResponse.json(rpcResult, { status: 201 })

    } catch (error: any) {
        console.error('[OpenClaw Agendamentos POST] Erro fatal:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
