import { describe, it, expect } from 'vitest'
import crypto from 'crypto'
import { sanitizePayloadAllowlist } from '@/lib/openclaw/auth'

describe('OpenClaw Security & Auth Helpers', () => {
    it('deve sanitizar o payload de auditoria permitindo apenas chaves da allowlist', () => {
        const piiPayload = {
            empresaId: 1,
            data: '2026-08-10',
            pacienteNome: 'João da Silva',
            pacienteTelefone: '(33) 99999-8888',
            email: 'joao@email.com',
            cpf: '123.456.789-00',
            motivo: 'Consulta de rotina'
        }

        const sanitized = sanitizePayloadAllowlist(piiPayload)

        expect(sanitized).toHaveProperty('empresaId', 1)
        expect(sanitized).toHaveProperty('data', '2026-08-10')
        expect(sanitized).toHaveProperty('motivo', 'Consulta de rotina')

        expect(sanitized).not.toHaveProperty('pacienteNome')
        expect(sanitized).not.toHaveProperty('pacienteTelefone')
        expect(sanitized).not.toHaveProperty('email')
        expect(sanitized).not.toHaveProperty('cpf')
    })

    it('deve gerar hashes SHA-256 e comparar de forma timing-safe', () => {
        const key1 = 'secret_key_123'
        const key2 = 'secret_key_123'
        const key3 = 'different_key_456'

        const hash1 = crypto.createHash('sha256').update(key1).digest('hex')
        const hash2 = crypto.createHash('sha256').update(key2).digest('hex')
        const hash3 = crypto.createHash('sha256').update(key3).digest('hex')

        const buf1 = Buffer.from(hash1, 'utf-8')
        const buf2 = Buffer.from(hash2, 'utf-8')
        const buf3 = Buffer.from(hash3, 'utf-8')

        expect(crypto.timingSafeEqual(buf1, buf2)).toBe(true)
        expect(crypto.timingSafeEqual(buf1, buf3)).toBe(false)
    })
})
