import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey)
}

export type OpenClawScope = 'read' | 'schedule' | 'cancel'

export interface AuthResult {
    isValid: boolean
    error?: string
    statusCode?: number
    requestId: string
    apiKeyId: string
    scopes: OpenClawScope[]
}

/**
 * Validates OpenClaw API key, verifies required scopes, and generates a unique request_id.
 */
export async function validateOpenClawKey(
    request: NextRequest,
    requiredScope: OpenClawScope
): Promise<AuthResult> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    
    // Extract token from x-openclaw-api-key or Authorization Bearer header
    let token = request.headers.get('x-openclaw-api-key')
    if (!token) {
        const authHeader = request.headers.get('authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7).trim()
        }
    }

    const expectedKey = process.env.OPENCLAW_API_KEY || 'default_openclaw_secret_key'

    if (!token) {
        return {
            isValid: false,
            error: 'Chave de API ausente. Envie a chave pelo header x-openclaw-api-key ou Authorization Bearer.',
            statusCode: 401,
            requestId,
            apiKeyId: 'unknown',
            scopes: []
        }
    }

    if (token !== expectedKey) {
        return {
            isValid: false,
            error: 'Chave de API inválida ou expirada.',
            statusCode: 401,
            requestId,
            apiKeyId: 'unauthorized',
            scopes: []
        }
    }

    // Default scopes for master key (or configurable)
    const scopes: OpenClawScope[] = ['read', 'schedule', 'cancel']

    if (!scopes.includes(requiredScope)) {
        return {
            isValid: false,
            error: `Permissão insuficiente. A chave não possui o escopo '${requiredScope}'.`,
            statusCode: 403,
            requestId,
            apiKeyId: 'key_master',
            scopes
        }
    }

    return {
        isValid: true,
        requestId,
        apiKeyId: 'key_master',
        scopes
    }
}

/**
 * Sanitizes payloads to comply with LGPD before writing to audit logs.
 * Masks personal identifiable information (PII) like names, phones, CPFs, emails.
 */
export function sanitizePayloadLGPD(payload: any): any {
    if (!payload || typeof payload !== 'object') return payload

    const copy = JSON.parse(JSON.stringify(payload))

    const maskName = (str: string) => {
        if (!str || typeof str !== 'string') return str
        const parts = str.trim().split(' ')
        return parts.map(p => p.length > 1 ? `${p[0]}***` : p).join(' ')
    }

    const maskPhone = (str: string) => {
        if (!str || typeof str !== 'string') return str
        const digits = str.replace(/\D/g, '')
        if (digits.length >= 8) {
            return digits.substring(0, 2) + '****-' + digits.substring(digits.length - 4)
        }
        return '****-****'
    }

    const maskEmail = (str: string) => {
        if (!str || typeof str !== 'string' || !str.includes('@')) return str
        const [user, domain] = str.split('@')
        return `${user[0]}***@${domain}`
    }

    const PII_KEYS: Record<string, (val: any) => any> = {
        nome: maskName,
        pacienteNome: maskName,
        paciente_nome: maskName,
        telefone: maskPhone,
        pacienteTelefone: maskPhone,
        email: maskEmail,
        cpf: (v: string) => v ? '***.***.***-**' : v,
        rg: (v: string) => v ? '**.***.***-*' : v
    }

    for (const key of Object.keys(copy)) {
        if (PII_KEYS[key] && typeof copy[key] === 'string') {
            copy[key] = PII_KEYS[key](copy[key])
        } else if (typeof copy[key] === 'object' && copy[key] !== null) {
            copy[key] = sanitizePayloadLGPD(copy[key])
        }
    }

    return copy
}

/**
 * Non-blocking audit logger for OpenClaw requests.
 */
export async function logOpenClawAudit(params: {
    requestId: string
    apiKeyId: string
    endpoint: string
    method: string
    scopeUsed: string
    statusCode: number
    action: string
    ipAddress?: string
    payload?: any
}) {
    try {
        const supabase = getServiceClient()
        const sanitized = sanitizePayloadLGPD(params.payload)

        await supabase.from('openclaw_audit_logs').insert({
            request_id: params.requestId,
            api_key_id: params.apiKeyId,
            endpoint: params.endpoint,
            method: params.method,
            scope_used: params.scopeUsed,
            status_code: params.statusCode,
            action: params.action,
            ip_address: params.ipAddress || '0.0.0.0',
            sanitized_payload: sanitized
        })
    } catch (err) {
        console.error('[OpenClaw Audit] Erro ao gravar log de auditoria:', err)
    }
}

/**
 * Checks for existing response with the specified Idempotency-Key.
 */
export async function checkIdempotencyKey(key: string, requestPath: string) {
    try {
        const supabase = getServiceClient()
        const { data } = await supabase
            .from('openclaw_idempotency_keys')
            .select('response_status, response_body')
            .eq('key', key)
            .eq('request_path', requestPath)
            .gte('expires_at', new Date().toISOString())
            .maybeSingle()

        if (data) {
            return NextResponse.json(data.response_body, { status: data.response_status })
        }
    } catch (err) {
        console.error('[OpenClaw Idempotency] Erro ao checar chave:', err)
    }
    return null
}

/**
 * Saves response associated with Idempotency-Key.
 */
export async function storeIdempotencyKey(key: string, requestPath: string, status: number, body: any) {
    try {
        const supabase = getServiceClient()
        await supabase.from('openclaw_idempotency_keys').upsert({
            key,
            request_path: requestPath,
            response_status: status,
            response_body: body
        })
    } catch (err) {
        console.error('[OpenClaw Idempotency] Erro ao salvar chave:', err)
    }
}
