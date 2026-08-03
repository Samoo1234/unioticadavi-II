import { describe, it, expect } from 'vitest'

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    aguardando: ['confirmado', 'recusado', 'cancelado'],
    confirmado: ['realizado', 'cancelado'],
    recusado: [],
    cancelado: [],
    realizado: []
}

function isValidTransition(from: string, to: string): boolean {
    const allowed = ALLOWED_TRANSITIONS[from] || []
    return allowed.includes(to)
}

describe('Máquina de Estados de Agendamento', () => {
    it('deve permitir transições válidas a partir de aguardando', () => {
        expect(isValidTransition('aguardando', 'confirmado')).toBe(true)
        expect(isValidTransition('aguardando', 'recusado')).toBe(true)
        expect(isValidTransition('aguardando', 'cancelado')).toBe(true)
        expect(isValidTransition('aguardando', 'realizado')).toBe(false)
    })

    it('deve permitir transições válidas a partir de confirmado', () => {
        expect(isValidTransition('confirmado', 'realizado')).toBe(true)
        expect(isValidTransition('confirmado', 'cancelado')).toBe(true)
        expect(isValidTransition('confirmado', 'aguardando')).toBe(false)
        expect(isValidTransition('confirmado', 'recusado')).toBe(false)
    })

    it('deve proibir qualquer transição a partir de estados terminais', () => {
        expect(isValidTransition('recusado', 'confirmado')).toBe(false)
        expect(isValidTransition('cancelado', 'aguardando')).toBe(false)
        expect(isValidTransition('realizado', 'cancelado')).toBe(false)
    })
})
