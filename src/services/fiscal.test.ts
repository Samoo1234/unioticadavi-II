import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fiscalService } from './fiscal';
import { supabase } from '@/lib/supabase';

// Mock do supabase
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
    }
}));

describe('fiscalService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('validarVendaParaEmissao', () => {
        it('should return invalid if company CNPJ is missing', async () => {
            const mockVenda = {
                empresas: { cnpj: null, inscricao_estadual: '123', certificado_senha: 'pass' },
                pacientes: { cpf: '123' },
                vendas_itens: []
            };

            (supabase.from('vendas').select().eq('id', 'venda-1').single as any).mockResolvedValue({ data: mockVenda, error: null });

            const result = await fiscalService.validarVendaParaEmissao('venda-1', 65);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("CNPJ da empresa não cadastrado.");
        });

        it('should return invalid if NFC-e requires CSC but it is missing', async () => {
            const mockVenda = {
                empresas: { cnpj: '123', inscricao_estadual: '123', certificado_senha: 'pass', csc_id: null },
                pacientes: { cpf: '123' },
                vendas_itens: []
            };

            (supabase.from('vendas').select().eq('id', 'venda-1').single as any).mockResolvedValue({ data: mockVenda, error: null });

            const result = await fiscalService.validarVendaParaEmissao('venda-1', 65);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain("Tokens CSC (ID e Token) são obrigatórios para NFC-e.");
        });

        it('should return valid if all data is present', async () => {
            const mockVenda = {
                empresas: {
                    cnpj: '123',
                    inscricao_estadual: '123',
                    certificado_senha: 'pass',
                    csc_id: '1',
                    csc_token: 'abc'
                },
                pacientes: { cpf: '123' },
                vendas_itens: [
                    { produtos: { nome: 'Lente', ncm: '12345678' } }
                ]
            };

            (supabase.from('vendas').select().eq('id', 'venda-1').single as any).mockResolvedValue({ data: mockVenda, error: null });

            const result = await fiscalService.validarVendaParaEmissao('venda-1', 65);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
    });
});
