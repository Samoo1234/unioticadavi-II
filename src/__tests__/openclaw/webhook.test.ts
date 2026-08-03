import { describe, it, expect } from 'vitest'
import crypto from 'crypto'

describe('Validação de Webhook Meta WhatsApp', () => {
    it('deve gerar e validar a assinatura HMAC-SHA256 sobre o rawBody', () => {
        const appSecret = 'meta_app_secret_test_123'
        const rawBody = JSON.stringify({
            entry: [
                {
                    id: '12345',
                    changes: [
                        {
                            value: {
                                messaging_product: 'whatsapp',
                                messages: [
                                    {
                                        from: '5533999998888',
                                        id: 'wamid.HBgLMTIzNDU2Nzg5',
                                        type: 'interactive',
                                        interactive: {
                                            type: 'button_reply',
                                            button_reply: { id: 'SIM_CONFIRMAR', title: 'Sim' }
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        })

        const expectedHash = crypto
            .createHmac('sha256', appSecret)
            .update(rawBody)
            .digest('hex')

        const signatureHeader = `sha256=${expectedHash}`

        // Verification logic
        const receivedHash = signatureHeader.substring(7)
        const expectedBuf = Buffer.from(expectedHash, 'utf-8')
        const receivedBuf = Buffer.from(receivedHash, 'utf-8')

        const isValid = expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf)

        expect(isValid).toBe(true)
    })
})
