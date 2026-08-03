import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateOpenClawKey, logOpenClawAudit, getClientIp } from '@/lib/openclaw/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey)
}

// Strict State Machine transitions map
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    aguardando: ['confirmado', 'recusado', 'cancelado'],
    confirmado: ['realizado', 'cancelado'],
    recusado: [],
    cancelado: [],
    realizado: []
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const auth = await validateOpenClawKey(request, 'cancel')
    if (!auth.isValid) {
        return NextResponse.json({ error: auth.error }, { status: auth.statusCode })
    }

    const { id: agendamentoId } = await context.params

    if (!agendamentoId) {
        return NextResponse.json({ error: 'ID do agendamento é obrigatório' }, { status: 400 })
    }

    try {
        const body = await request.json()
        const { status, motivo } = body

        const validStatuses = ['aguardando', 'confirmado', 'recusado', 'cancelado', 'realizado']
        if (!status || !validStatuses.includes(status)) {
            return NextResponse.json({
                error: `Status inválido. Escolha um dos seguintes: ${validStatuses.join(', ')}`
            }, { status: 400 })
        }

        const supabase = getServiceClient()

        // Fetch current appointment
        const { data: agdAtual, error: errFetch } = await supabase
            .from('agendamentos')
            .select('id, status, observacoes, data, hora, empresa_id')
            .eq('id', agendamentoId)
            .single()

        if (errFetch || !agdAtual) {
            return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
        }

        const currentStatus = agdAtual.status || 'aguardando'
        const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || []

        if (!allowedNext.includes(status)) {
            return NextResponse.json({
                error: `Transição de status inválida: Não é permitido alterar de '${currentStatus}' para '${status}'.`
            }, { status: 409 })
        }

        // Append motif to observacoes without overwriting previous text
        let novasObservacoes = agdAtual.observacoes || ''
        if (motivo) {
            const timestamp = new Date().toISOString()
            novasObservacoes = `${novasObservacoes}\n[${timestamp} Status ${currentStatus} -> ${status} (${auth.apiKeyId})]: ${motivo}`.trim()
        }

        const { data: agdAtualizado, error: errUpdate } = await supabase
            .from('agendamentos')
            .update({
                status,
                observacoes: novasObservacoes
            })
            .eq('id', agendamentoId)
            .select('id, status, data, hora')
            .single()

        if (errUpdate || !agdAtualizado) {
            return NextResponse.json({ error: 'Erro ao atualizar status do agendamento' }, { status: 500 })
        }

        await logOpenClawAudit({
            requestId: auth.requestId,
            apiKeyId: auth.apiKeyId,
            endpoint: `/api/openclaw/v1/agendamentos/${agendamentoId}`,
            method: 'PATCH',
            scopeUsed: 'cancel',
            statusCode: 200,
            action: `alterar_status_${status}`,
            ipAddress: getClientIp(request),
            payload: { agendamentoId, statusAnterior: currentStatus, novoStatus: status, motivo }
        })

        return NextResponse.json({
            success: true,
            message: `Status alterado de '${currentStatus}' para '${status}' com sucesso.`,
            agendamento: agdAtualizado
        })

    } catch (error: any) {
        console.error('[OpenClaw Agendamento PATCH] Erro:', error)
        return NextResponse.json({ error: 'Erro interno ao atualizar agendamento' }, { status: 500 })
    }
}
