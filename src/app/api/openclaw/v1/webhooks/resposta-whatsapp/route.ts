import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey)
}

// GET — Meta Webhook Verification
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN

    if (!expectedToken) {
        return new NextResponse('Webhook verify token não configurado', { status: 503 })
    }

    if (mode === 'subscribe' && token === expectedToken) {
        return new NextResponse(challenge || '', { status: 200 })
    }

    return new NextResponse('Verificação falhou', { status: 403 })
}

// POST — Meta WhatsApp Inbound Webhook Event Handler
export async function POST(request: NextRequest) {
    const appSecret = process.env.WHATSAPP_APP_SECRET
    if (!appSecret) {
        return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 503 })
    }

    // Read raw body string for HMAC verification
    const rawBody = await request.text()
    const signatureHeader = request.headers.get('x-hub-signature-256')

    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
        return NextResponse.json({ error: 'Assinatura X-Hub-Signature-256 ausente' }, { status: 401 })
    }

    const expectedHash = crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex')

    const receivedHash = signatureHeader.substring(7)
    const expectedBuf = Buffer.from(expectedHash, 'utf-8')
    const receivedBuf = Buffer.from(receivedHash, 'utf-8')

    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
        return NextResponse.json({ error: 'Assinatura HMAC-SHA256 inválida' }, { status: 401 })
    }

    let payload: any = {}
    try {
        payload = JSON.parse(rawBody)
    } catch {
        return NextResponse.json({ error: 'Payload JSON inválido' }, { status: 400 })
    }

    const supabase = getServiceClient()

    // Process Meta WhatsApp webhook payload structure
    const entries = payload.entry || []
    for (const entry of entries) {
        const changes = entry.changes || []
        for (const change of changes) {
            const value = change.value || {}
            const messages = value.messages || []

            for (const msg of messages) {
                const messageId = msg.id
                const senderPhone = msg.from
                const contextId = msg.context?.id // Context ID contains the original sent message ID

                // Deduplicate webhook event by provider_event_id
                const { error: errEvent } = await supabase
                    .from('openclaw_webhook_events')
                    .insert({
                        provider_event_id: messageId,
                        event_type: msg.type || 'message',
                        sender_phone: senderPhone,
                        sanitized_payload: {
                            message_id: messageId,
                            context_id: contextId,
                            type: msg.type,
                            timestamp: msg.timestamp
                        }
                    })

                if (errEvent && errEvent.code === '23505') {
                    // Duplicate message event -> skip processing cleanly
                    continue
                }

                // Check interactive button responses
                let buttonPayload = ''
                if (msg.type === 'interactive' && msg.interactive?.button_reply) {
                    buttonPayload = msg.interactive.button_reply.id || msg.interactive.button_reply.title
                } else if (msg.type === 'text' && msg.text?.body) {
                    buttonPayload = msg.text.body
                }

                const buttonTextUpper = buttonPayload.trim().toUpperCase()
                if (!['SIM', 'SIM_CONFIRMAR', 'NAO', 'NAO_CANCELAR', 'CONFIRMAR', 'CANCELAR'].includes(buttonTextUpper)) {
                    continue // Ignore non-matching text responses
                }

                const isConfirm = ['SIM', 'SIM_CONFIRMAR', 'CONFIRMAR'].includes(buttonTextUpper)
                const newStatus = isConfirm ? 'confirmado' : 'recusado'

                // Find persistent message binding using context.id
                let targetAgendamentoId: string | null = null
                if (contextId) {
                    const { data: binding } = await supabase
                        .from('openclaw_whatsapp_messages')
                        .select('agendamento_id')
                        .eq('provider_message_id', contextId)
                        .maybeSingle()

                    if (binding) {
                        targetAgendamentoId = binding.agendamento_id
                    }
                }

                if (targetAgendamentoId) {
                    await supabase
                        .from('agendamentos')
                        .update({ status: newStatus })
                        .eq('id', targetAgendamentoId)
                }
            }
        }
    }

    return NextResponse.json({ success: true, message: 'Webhook processado' })
}
