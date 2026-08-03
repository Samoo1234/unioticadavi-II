import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateOpenClawKey, logOpenClawAudit } from '@/lib/openclaw/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey)
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

        const statusValidos = ['aguardando', 'confirmado', 'recusado', 'cancelado', 'realizado']
        if (!status || !statusValidos.includes(status)) {
            return NextResponse.json({
                error: `Status inválido. Escolha um dos seguintes: ${statusValidos.join(', ')}`
            }, { status: 400 })
        }

        const supabase = getServiceClient()

        // Verify existence
        const { data: agdAtual, error: errFetch } = await supabase
            .from('agendamentos')
            .select('id, status, data, hora, empresa_id')
            .eq('id', agendamentoId)
            .single()

        if (errFetch || !agdAtual) {
            return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
        }

        // Update status and append motif to observacoes
        const { data: agdAtualizado, error: errUpdate } = await supabase
            .from('agendamentos')
            .update({
                status,
                observacoes: motivo ? `[OpenClaw update (${status})]: ${motivo}` : undefined
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
            payload: { agendamentoId, statusAnterior: agdAtual.status, novoStatus: status, motivo }
        })

        return NextResponse.json({
            success: true,
            message: `Status do agendamento alterado para '${status}' com sucesso.`,
            agendamento: agdAtualizado
        })

    } catch (error: any) {
        console.error('[OpenClaw Agendamento PATCH] Erro:', error)
        return NextResponse.json({ error: 'Erro interno ao atualizar agendamento' }, { status: 500 })
    }
}
