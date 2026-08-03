import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServiceClient() {
    return createClient(supabaseUrl, supabaseServiceKey)
}

export type OpenClawScope = 'read' | 'schedule' | 'cancel'

export interface OpenClawKeyConfig {
    id: string
    secret_hash: string
    scopes: OpenClawScope[]
}

export interface AuthResult {
    isValid: boolean
    error?: string
    statusCode?: number
    requestId: string
    apiKeyId: string
    scopes: OpenClawScope[]
}

/**
 * Loads API key configurations from OPENCLAW_API_KEYS (JSON) or fallback OPENCLAW_API_KEY.
 * Fails securely if no keys are configured.
 */
function loadKeyConfigs(): OpenClawKeyConfig[] {
    const rawKeysJson = process.env.OPENCLAW_API_KEYS
    if (rawKeysJson) {
        try {
            const parsed = JSON.parse(rawKeysJson)
            if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed
            }
        } catch (e) {
            console.error('[OpenClaw Auth] Erro ao parsear OPENCLAW_API_KEYS JSON:', e)
        }
    }

    const singleKey = process.env.OPENCLAW_API_KEY
    if (singleKey) {
        // Compute SHA-256 hash for timing-safe comparison
        const hash = crypto.createHash('sha256').update(singleKey).digest('hex')
        return [
            {
                id: 'key_master',
                secret_hash: hash,
                scopes: ['read', 'schedule', 'cancel']
            }
        ]
    }

    return []
}

/**
 * Validates API key, checks scope permissions, generates UUID requestId, and performs rate limiting.
 */
export async function validateOpenClawKey(
    request: NextRequest,
    requiredScope: OpenClawScope
): Promise<AuthResult> {
    const requestId = crypto.randomUUID()
    const keyConfigs = loadKeyConfigs()

    // Misconfigured server check -> HTTP 503
    if (keyConfigs.length === 0) {
        console.error('[OpenClaw Auth] ERRO CRÍTICO: Nenhuma chave de API configurada no servidor.')
        return {
            isValid: false,
            error: 'Serviço indisponível no momento devido a problema de configuração.',
            statusCode: 503,
            requestId,
            apiKeyId: 'unknown',
            scopes: []
        }
    }

    // Extract token
    let token = request.headers.get('x-openclaw-api-key')
    if (!token) {
        const authHeader = request.headers.get('authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7).trim()
        }
    }

    if (!token) {
        return {
            isValid: false,
            error: 'Autenticação necessária. Envie o token via header x-openclaw-api-key ou Authorization Bearer.',
            statusCode: 401,
            requestId,
            apiKeyId: 'unknown',
            scopes: []
        }
    }

    // Compute SHA-256 hash of presented token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const tokenHashBuf = Buffer.from(tokenHash, 'utf-8')

    let matchedConfig: OpenClawKeyConfig | null = null

    for (const config of keyConfigs) {
        const configHashBuf = Buffer.from(config.secret_hash, 'utf-8')
        if (tokenHashBuf.length === configHashBuf.length && crypto.timingSafeEqual(tokenHashBuf, configHashBuf)) {
            matchedConfig = config
            break
        }
    }

    if (!matchedConfig) {
        return {
            isValid: false,
            error: 'Chave de API inválida ou não autorizada.',
            statusCode: 401,
            requestId,
            apiKeyId: 'unauthorized',
            scopes: []
        }
    }

    // Check scope
    if (!matchedConfig.scopes.includes(requiredScope)) {
        return {
            isValid: false,
            error: `Acesso negado. A chave '${matchedConfig.id}' não possui o escopo necessário '${requiredScope}'.`,
            statusCode: 403,
            requestId,
            apiKeyId: matchedConfig.id,
            scopes: matchedConfig.scopes
        }
    }

    // Check Rate Limiting (60 requests / minute)
    const clientIp = getClientIp(request)
    const rateLimitOk = await checkRateLimit(matchedConfig.id, clientIp)

    if (!rateLimitOk) {
        return {
            isValid: false,
            error: 'Limite de requisições excedido. Aguarde antes de enviar novas chamadas.',
            statusCode: 429,
            requestId,
            apiKeyId: matchedConfig.id,
            scopes: matchedConfig.scopes
        }
    }

    return {
        isValid: true,
        requestId,
        apiKeyId: matchedConfig.id,
        scopes: matchedConfig.scopes
    }
}

/**
 * Database-backed rate limiting.
 */
async function checkRateLimit(keyId: string, ip: string): Promise<boolean> {
    try {
        const supabase = getServiceClient()
        const windowStart = new Date()
        windowStart.setSeconds(0, 0)
        const windowStr = windowStart.toISOString()
        const expiresAt = new Date(windowStart.getTime() + 60000).toISOString()

        const rateKey = `${keyId}:${ip}`

        const { data, error } = await supabase
            .rpc('increment_rate_limit', {
                p_key_id: rateKey,
                p_window_start: windowStr,
                p_expires_at: expiresAt
            })

        if (error) {
            // Fallback to table upsert if RPC not present
            const { data: existing } = await supabase
                .from('openclaw_rate_limits')
                .select('request_count')
                .eq('key_id', rateKey)
                .eq('window_start', windowStr)
                .maybeSingle()

            const currentCount = (existing?.request_count || 0) + 1
            if (currentCount > 60) return false

            await supabase.from('openclaw_rate_limits').upsert({
                key_id: rateKey,
                window_start: windowStr,
                request_count: currentCount,
                expires_at: expiresAt
            })
            return true
        }

        return (data || 0) <= 60
    } catch {
        return true // Fail open if rate limit table unavailable
    }
}

/**
 * Extracts client IP address safely from trusted headers.
 */
export function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
        return forwarded.split(',')[0].trim()
    }
    const realIp = request.headers.get('x-real-ip')
    if (realIp) return realIp.trim()
    return '127.0.0.1'
}

/**
 * Allowlist-based payload sanitizer for audit logs.
 */
export function sanitizePayloadAllowlist(payload: any): any {
    if (!payload || typeof payload !== 'object') return null

    const ALLOWED_KEYS = new Set([
        'empresaId', 'data', 'horario', 'tipo', 'status', 'agendamentoId',
        'a_partir_de', 'cidade', 'motivo', 'total', 'resultado', 'filial'
    ])

    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(payload)) {
        if (ALLOWED_KEYS.has(key)) {
            sanitized[key] = value
        }
    }

    return sanitized
}

/**
 * Writes non-blocking audit logs.
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
        const sanitized = sanitizePayloadAllowlist(params.payload)

        await supabase.from('openclaw_audit_logs').insert({
            request_id: params.requestId,
            api_key_id: params.apiKeyId,
            endpoint: params.endpoint,
            method: params.method,
            scope_used: params.scopeUsed,
            status_code: params.statusCode,
            action: params.action,
            ip_address: params.ipAddress || '127.0.0.1',
            sanitized_payload: sanitized
        })
    } catch (err) {
        console.error('[OpenClaw Audit] Erro ao gravar audit log:', err)
    }
}
