import { describe, it, expect } from 'vitest';
import { gerarTSOHTML, TSOData } from './tso';

describe('tso utils', () => {
    const mockTSOData: TSOData = {
        empresa: {
            id: 1,
            nome_fantasia: 'Ótica Visão',
            telefone: '(11) 99999-9999',
            cidade: 'São Paulo',
            estado: 'SP',
            endereco: {
                logradouro: 'Rua Teste',
                numero: '123',
                bairro: 'Centro',
                cidade: 'São Paulo',
                estado: 'SP',
                cep: '01000-000'
            }
        },
        numeroReceituario: 101,
        dataEmissao: '2024-02-11',
        dataEntrega: '2024-02-18',
        hora: '10:00',
        clienteCodigo: 'C001',
        clienteNome: 'João Silva',
        vendedor: 'Carlos',
        longeOD: { esferico: '+1.00', cilindrico: '-0.50', eixo: '90', dp: '32', altura: '18', dnp: '31' },
        longeOE: { esferico: '+1.25', cilindrico: '-0.75', eixo: '180', dp: '31', altura: '18', dnp: '30' },
        valorTotal: 500.00,
        valorSaldo: 300.00,
        valorEntrada: 200.00,
        dataVenda: '2024-02-11'
    };

    describe('gerarTSOHTML', () => {
        it('should generate HTML containing client name', () => {
            const html = gerarTSOHTML(mockTSOData);
            expect(html).toContain('João Silva');
        });

        it('should generate HTML containing company name uppercase', () => {
            const html = gerarTSOHTML(mockTSOData);
            expect(html).toContain('ÓTICA VISÃO');
        });

        it('should contain the correct recipe values', () => {
            const html = gerarTSOHTML(mockTSOData);
            expect(html).toContain('+1.00');
            expect(html).toContain('-0.75');
            expect(html).toContain('90°');
        });

        it('should format currency correctly in HTML', () => {
            const html = gerarTSOHTML(mockTSOData);
            expect(html).toContain('500,00');
            expect(html).toContain('300,00');
        });
    });
});
