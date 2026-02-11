import { describe, it, expect } from 'vitest';
import { formatarMoeda, parseMoeda } from './monetary';

describe('monetary utils', () => {
    describe('formatarMoeda', () => {
        it('should format number to BRL currency string', () => {
            expect(formatarMoeda(1234.56)).toBe('1.234,56');
            expect(formatarMoeda(0)).toBe('0,00');
            expect(formatarMoeda(10.5)).toBe('10,50');
        });

        it('should handle string input', () => {
            expect(formatarMoeda("1234.56")).toBe('1.234,56');
            expect(formatarMoeda("invalid")).toBe('0,00');
        });
    });

    describe('parseMoeda', () => {
        it('should parse currency string to number', () => {
            expect(parseMoeda('1.234,56')).toBe(1234.56);
            expect(parseMoeda('0,00')).toBe(0);
            expect(parseMoeda('R$ 1.234,56')).toBe(1234.56);
            expect(parseMoeda('10,50')).toBe(10.5);
        });

        it('should handle empty or invalid string', () => {
            expect(parseMoeda('')).toBe(0);
            expect(parseMoeda('abc')).toBe(0);
        });
    });
});
