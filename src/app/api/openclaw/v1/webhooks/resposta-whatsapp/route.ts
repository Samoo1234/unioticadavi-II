import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { validateOpenClawKey, logOpenClawAudit } from '@/lib/openclaw/auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey)
}

export async function POST(request: NextRequest) {
    const auth = await validateOpenClawKey(request, 'schedule')
    if (!auth.isValid) {
        return NextResponse.json({ error: auth.error }, { status: auth.statusCode })
    }

    try {
        const body = await request.json()
        const { agendamentoId, resposta, telefone, consentimentoMensagens } = body

        if (!agendamentoId || !resposta) {
            return NextResponse.json({ error: 'Campos agendamentoId e resposta ("sim" ou "nao") são obrigatórios' }, { status: 400 })
        }

        const respostaUpper = String(resposta).trim().toUpperCase()
        const novoStatus = (respostaUpper === 'SIM' || respostaUpper === 'CONFIRMAR') ? 'confirmado' : 'recusado'

        const supabase = getServiceClient()

        // 1. Update appointment status
        const { data: agdUpdated, error: errAgd } = await supabase
            .from('agendamentos')
            .update({ status: novoStatus })
            .eq('id', agendamentoId)
            .select('id, paciente_id, data, hora, status')
            .single()

        if (errAgd || !agdUpdated) {
            return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
        }

        // 2. Optionally record patient messaging consent if provided
        if (consentimentoMensagens !== undefined && agdUpdated.paciente_id) {
            await supabase
                .from('pacientes')
                .update({ observacoes: `[WhatsApp Consentimento]: ${consentimentoMensagens ? 'Aceito' : 'Recusado'} em ${new Date().toLocaleDateString('pt-BR')}` })
                .eq('id', agdUpdated.paciente_id)
        }

        await logOpenClawAudit({
            requestId: auth.requestId,
            apiKeyId: auth.apiKeyId,
            endpoint: '/api/openclaw/v1/webhooks/resposta-whatsapp',
            method: 'POST',
            scopeUsed: 'schedule',
            statusCode: 200,
            action: `webhook_resposta_whatsapp_${novoStatus}`,
            payload: { agendamentoId, resposta: respostaUpper, telefone }
        })

        return NextResponse.json({
            success: true,
            message: `Resposta processada com sucesso. Agendamento marcado como '${novoStatus}'.`,
            agendamentoId,
            novoStatus
        })

    } catch (error: any) {
        console.error('[Webhook WhatsApp] Erro:', error)
        return NextResponse.json({ error: 'Erro interno ao processar resposta do WhatsApp' }, { status: 500 })
    }
}
