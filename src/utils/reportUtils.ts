"use client";

import { formatarMoeda } from "@/utils/monetary";

interface ReportData {
    titulo: string;
    subtitulo: string;
    data: string;
    hora: string;
    unidade: string;
    operador: string;
    resumo: {
        saldoInicial: number;
        totalEntradas: number;
        totalSaidas: number;
        saldoFinal: number;
        faturamentoTotal: number;
        recebidoReal: number;
    };
    entradas: any[];
    saidas: any[];
    detalhamentoUnidades?: Record<number, { faturamento: number, recebido: number, saídas: number }>;
    listaEmpresas?: { id: number, nome_fantasia: string }[];
}

export interface ReportAgendamentoData {
    titulo: string;
    data: string;
    unidade: string;
    operador: string;
    medico: string;
    resumoPorTipo: { tipo: string; qtd: number; total: number }[];
    resumoPorPagamento: { forma: string; qtd: number; total: number }[];
    registros: {
        pacienteNome: string;
        valorTotal: number;
        tipo: string;
        pagamentos: { forma: string; valor: number }[];
        situacao: string;
        observacoes: string;
    }[];
}

export interface ReportAgendaOperacionalData {
    titulo: string;
    data: string;
    unidade: string;
    operador: string;
    registros: {
        hora: string;
        pacienteNome: string;
        telefone: string;
        medico: string;
        status: string;
        observacoes: string;
    }[];
}

export function gerarRelatorioFinanceiroHTML(data: ReportData): string {
    const isConsolidado = data.unidade === "TODAS AS LOJAS";

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${data.titulo} - ${data.data}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 11px; 
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            background: white;
            color: #000;
        }
        .report-container {
            border: 2px solid #000;
            padding: 15px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .header h1 { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
        .header h2 { font-size: 14px; color: #333; margin-bottom: 5px; }
        
        .info-grid { display: flex; border-bottom: 1px solid #000; margin-bottom: 15px; }
        .info-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #999; }
        .info-cell:last-child { border-right: none; }
        .info-cell label { font-weight: bold; font-size: 9px; color: #666; display: block; text-transform: uppercase; }
        .info-cell span { font-size: 11px; font-weight: bold; }

        .section-title { 
            background: #eee; 
            padding: 5px 10px; 
            font-weight: bold; 
            font-size: 11px;
            border: 1px solid #000;
            margin-top: 15px;
        }

        .summary-grid { display: flex; flex-wrap: wrap; margin: 10px 0; border: 1px solid #999; }
        .summary-cell { 
            flex: 1; 
            min-width: 150px; 
            padding: 10px; 
            text-align: center; 
            border-right: 1px solid #999;
            border-bottom: 1px solid #999;
        }
        .summary-cell:last-child { border-right: none; }
        .summary-cell label { font-size: 10px; font-weight: bold; color: #444; display: block; margin-bottom: 4px; }
        .summary-cell span { font-size: 16px; font-weight: bold; font-family: 'Courier New', Courier, monospace; }
        .text-green { color: #006400; }
        .text-red { color: #8b0000; }
        .text-blue { color: #00008b; }

        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; font-size: 10px; }
        th { background: #f2f2f2; font-weight: bold; text-transform: uppercase; }
        .text-right { text-align: right; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }

        .footer { 
            margin-top: 30px; 
            text-align: center; 
            font-size: 10px; 
            color: #666; 
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }

        @media print {
            body { padding: 0; }
            .report-container { border-width: 1px; }
            @page { margin: 1cm; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1>ÓTICA DAVI</h1>
            <h2>${data.titulo}</h2>
            <p>FECHAMENTO DE MOVIMENTO DIÁRIO</p>
        </div>

        <div class="info-grid">
            <div class="info-cell"><label>Unidade:</label><span>${data.unidade}</span></div>
            <div class="info-cell"><label>Data:</label><span>${data.data}</span></div>
            <div class="info-cell"><label>Hora Impressão:</label><span>${new Date().toLocaleTimeString('pt-BR')}</span></div>
            <div class="info-cell"><label>Operador:</label><span>${data.operador}</span></div>
        </div>

        <div class="section-title">RESUMO FINANCEIRO</div>
        <div class="summary-grid">
            <div class="summary-cell"><label>SALDO INICIAL</label><span>R$ ${formatarMoeda(data.resumo.saldoInicial)}</span></div>
            <div class="summary-cell"><label>TOTAL ENTRADAS</label><span class="text-green">+ R$ ${formatarMoeda(data.resumo.totalEntradas)}</span></div>
            <div class="summary-cell"><label>TOTAL SAÍDAS</label><span class="text-red">- R$ ${formatarMoeda(data.resumo.totalSaidas)}</span></div>
            <div class="summary-cell" style="background: #f0f0f0;"><label>SALDO EM CAIXA</label><span class="${data.resumo.saldoFinal >= 0 ? 'text-green' : 'text-red'}">R$ ${formatarMoeda(data.resumo.saldoFinal)}</span></div>
        </div>
        <div class="summary-grid" style="margin-top: -11px;">
            <div class="summary-cell"><label>FATURAMENTO BRUTO</label><span class="text-blue">R$ ${formatarMoeda(data.resumo.faturamentoTotal)}</span></div>
            <div class="summary-cell"><label>DINHEIRO REAL/PIX</label><span class="text-green">R$ ${formatarMoeda(data.resumo.recebidoReal)}</span></div>
        </div>

        ${isConsolidado && data.detalhamentoUnidades ? `
        <div class="section-title">DESEMPENHO POR UNIDADE</div>
        <table>
            <thead>
                <tr>
                    <th>Unidade/Filial</th>
                    <th class="text-right">Faturamento</th>
                    <th class="text-right">Recebido (Caixa)</th>
                    <th class="text-right">Saídas</th>
                    <th class="text-right">Saldo Líquido</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(data.detalhamentoUnidades).map(([eid, d]) => {
        const emp = data.listaEmpresas?.find(l => l.id === parseInt(eid));
        return `
                    <tr>
                        <td style="font-weight: bold;">${emp?.nome_fantasia || `Loja ${eid}`}</td>
                        <td class="text-right font-mono">R$ ${formatarMoeda(d.faturamento)}</td>
                        <td class="text-right font-mono">R$ ${formatarMoeda(d.recebido)}</td>
                        <td class="text-right font-mono">R$ ${formatarMoeda(d.saídas)}</td>
                        <td class="text-right font-mono" style="font-weight: bold;">R$ ${formatarMoeda(d.recebido - d.saídas)}</td>
                    </tr>`;
    }).join('')}
            </tbody>
        </table>
        ` : ''}

        <div class="section-title">DETALHAMENTO DE ENTRADAS</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 50px;">Hora</th>
                    <th>Origem</th>
                    <th>Descrição</th>
                    <th style="width: 100px;">Pagamento</th>
                    <th class="text-right" style="width: 90px;">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${data.entradas.length === 0 ? '<tr><td colspan="5" style="text-align: center;">Nenhum lançamento</td></tr>' :
            data.entradas.map(e => `
                    <tr>
                        <td class="font-mono">${e.hora}</td>
                        <td>${e.origem}</td>
                        <td>${e.descricao}</td>
                        <td>${e.formaPagamento}</td>
                        <td class="text-right font-mono">R$ ${formatarMoeda(e.valor)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        ${data.saidas.length > 0 ? `
        <div class="section-title">DETALHAMENTO DE SAÍDAS</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 50px;">Hora</th>
                    <th>Motivo</th>
                    <th>Descrição</th>
                    <th style="width: 100px;">Pagamento</th>
                    <th class="text-right" style="width: 90px;">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${data.saidas.map(s => `
                    <tr>
                        <td class="font-mono">${s.hora}</td>
                        <td>${s.motivo}</td>
                        <td>${s.descricao}</td>
                        <td>${s.formaPagamento}</td>
                        <td class="text-right font-mono" style="color: #8b0000;">- R$ ${formatarMoeda(s.valor)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}

        <div class="footer">
            <p>Documento gerado pelo Sistema Ótica Davi - ${new Date().toLocaleDateString('pt-BR')}</p>
            <p>Conferido por: __________________________________________________</p>
        </div>
    </div>
    
    <script>
        window.onload = function() { window.print(); }
    </script>
</body>
</html>`;
}

export function imprimirRelatorioFinanceiro(data: ReportData) {
    const html = gerarRelatorioFinanceiroHTML(data);
    const windowPrint = window.open('', '_blank');
    if (windowPrint) {
        windowPrint.document.write(html);
        windowPrint.document.close();
    }
}

export function gerarRelatorioAgendamentoCompletoHTML(data: ReportAgendamentoData): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Relatório de Consultas - ${data.unidade} - ${data.data}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 11px; 
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            color: #000;
        }
        .report-container {
            border: 2px solid #000;
            padding: 15px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .header h1 { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
        .header h2 { font-size: 14px; color: #333; margin-bottom: 5px; }
        
        .info-grid { display: flex; border-bottom: 1px solid #000; margin-bottom: 15px; }
        .info-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #999; }
        .info-cell:last-child { border-right: none; }
        .info-cell label { font-weight: bold; font-size: 9px; color: #666; display: block; text-transform: uppercase; }
        .info-cell span { font-size: 11px; font-weight: bold; }

        .section-title { 
            background: #eee; 
            padding: 5px 10px; 
            font-weight: bold; 
            font-size: 11px;
            border: 1px solid #000;
            margin-top: 15px;
        }

        .summary-wrapper { display: flex; gap: 20px; margin-top: 10px; }
        .summary-box { flex: 1; }

        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; font-size: 10px; }
        th { background: #f2f2f2; font-weight: bold; text-transform: uppercase; }
        .text-right { text-align: right; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }

        .footer { 
            margin-top: 30px; 
            text-align: center; 
            font-size: 10px; 
            color: #666; 
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }

        @media print {
            body { padding: 0; }
            .report-container { border-width: 1px; }
            @page { margin: 1cm; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1>ÓTICA VISION</h1>
            <h2>RESUMO DE AGENDAMENTO FINANCEIRO</h2>
            <p>${data.unidade} - ${data.data}</p>
        </div>

        <div class="info-grid">
            <div class="info-cell"><label>Unidade:</label><span>${data.unidade}</span></div>
            <div class="info-cell"><label>Data:</label><span>${data.data}</span></div>
            <div class="info-cell"><label>Médico:</label><span>${data.medico || 'NÃO INFORMADO'}</span></div>
            <div class="info-cell"><label>Operador:</label><span>${data.operador}</span></div>
        </div>

        <div class="summary-wrapper">
            <div class="summary-box">
                <div class="section-title">POR TIPO</div>
                <table>
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th class="text-right">Qtd</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.resumoPorTipo.map(t => `
                            <tr>
                                <td>${t.tipo.toUpperCase()}</td>
                                <td class="text-right">${t.qtd}</td>
                                <td class="text-right font-mono">R$ ${formatarMoeda(t.total)}</td>
                            </tr>
                        `).join('')}
                        <tr style="font-weight: bold; background: #f9f9f9;">
                            <td>TOTAL</td>
                            <td class="text-right">${data.resumoPorTipo.reduce((acc, t) => acc + t.qtd, 0)}</td>
                            <td class="text-right font-mono">R$ ${formatarMoeda(data.resumoPorTipo.reduce((acc, t) => acc + t.total, 0))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="summary-box">
                <div class="section-title">POR FORMA DE PAGAMENTO</div>
                <table>
                    <thead>
                        <tr>
                            <th>Forma</th>
                            <th class="text-right">Qtd</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.resumoPorPagamento.map(f => `
                            <tr>
                                <td>${f.forma.toUpperCase()}</td>
                                <td class="text-right">${f.qtd}</td>
                                <td class="text-right font-mono">R$ ${formatarMoeda(f.total)}</td>
                            </tr>
                        `).join('')}
                        <tr style="font-weight: bold; background: #f9f9f9;">
                            <td colspan="2">TOTAL RECEBIDO</td>
                            <td class="text-right font-mono">R$ ${formatarMoeda(data.resumoPorPagamento.reduce((acc, f) => acc + f.total, 0))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="section-title">DETALHAMENTO DE ATENDIMENTOS</div>
        <table>
            <thead>
                <tr>
                    <th>CLIENTE</th>
                    <th class="text-right" style="width: 100px;">VALOR TOTAL</th>
                    <th style="width: 100px;">TIPO</th>
                    <th>PAGAMENTOS</th>
                    <th style="width: 100px;">SITUAÇÃO</th>
                    <th>OBSERVAÇÕES</th>
                </tr>
            </thead>
            <tbody>
                ${data.registros.length === 0 ? '<tr><td colspan="6" style="text-align: center;">Nenhum registro encontrado</td></tr>' :
            data.registros.map(r => `
                    <tr>
                        <td style="font-weight: bold;">${r.pacienteNome.toUpperCase()}</td>
                        <td class="text-right font-mono">R$ ${formatarMoeda(r.valorTotal)}</td>
                        <td>${(r.tipo || '-').toUpperCase()}</td>
                        <td>
                            ${r.pagamentos.map(p => `<div style="font-size: 9px;">${p.forma}: R$ ${formatarMoeda(p.valor)}</div>`).join('')}
                        </td>
                        <td>${(r.situacao || '-').toUpperCase()}</td>
                        <td style="font-size: 9px;">${r.observacoes || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            <p>Documento gerado pelo Sistema Ótica Davi - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p>Conferido por: __________________________________________________</p>
        </div>
    </div>
    
    <script>
        window.onload = function() { window.print(); }
    </script>
</body>
</html>`;
}

export function imprimirRelatorioAgendamentoCompleto(data: ReportAgendamentoData) {
    const html = gerarRelatorioAgendamentoCompletoHTML(data);
    const windowPrint = window.open('', '_blank');
    if (windowPrint) {
        windowPrint.document.write(html);
        windowPrint.document.close();
    }
}

export function gerarRelatorioListaOperacionalHTML(data: ReportAgendaOperacionalData): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>${data.titulo} - ${data.data}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 11px; 
            padding: 20px;
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            color: #000;
        }
        .report-container {
            border: 2px solid #000;
            padding: 15px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .header h1 { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
        .header h2 { font-size: 14px; color: #333; margin-bottom: 5px; }
        
        .info-grid { display: flex; border-bottom: 1px solid #000; margin-bottom: 15px; }
        .info-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #999; }
        .info-cell:last-child { border-right: none; }
        .info-cell label { font-weight: bold; font-size: 9px; color: #666; display: block; text-transform: uppercase; }
        .info-cell span { font-size: 11px; font-weight: bold; }

        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; font-size: 10px; }
        th { background: #f2f2f2; font-weight: bold; text-transform: uppercase; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }

        .footer { 
            margin-top: 30px; 
            text-align: center; 
            font-size: 10px; 
            color: #666; 
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }

        @media print {
            body { padding: 0; }
            .report-container { border-width: 1px; }
            @page { margin: 1cm; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1>ÓTICA DAVI</h1>
            <h2>${data.titulo}</h2>
            <p>${data.unidade} - ${data.data}</p>
        </div>

        <div class="info-grid">
            <div class="info-cell"><label>Unidade:</label><span>${data.unidade}</span></div>
            <div class="info-cell"><label>Data:</label><span>${data.data}</span></div>
            <div class="info-cell"><label>Hora Impressão:</label><span>${new Date().toLocaleTimeString('pt-BR')}</span></div>
            <div class="info-cell"><label>Operador:</label><span>${data.operador}</span></div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 60px;">HORA</th>
                    <th>PACIENTE</th>
                    <th style="width: 100px;">TELEFONE</th>
                    <th>MÉDICO/RESP.</th>
                    <th style="width: 90px;">STATUS</th>
                    <th>OBSERVAÇÕES</th>
                </tr>
            </thead>
            <tbody>
                ${data.registros.length === 0 ? '<tr><td colspan="6" style="text-align: center;">Nenhum agendamento encontrado</td></tr>' :
            data.registros.map(r => `
                    <tr>
                        <td class="font-mono" style="font-weight: bold;">${r.hora}</td>
                        <td style="font-weight: bold;">${r.pacienteNome.toUpperCase()}</td>
                        <td class="font-mono" style="font-size: 9px;">${r.telefone || '-'}</td>
                        <td>${(r.medico || '-').toUpperCase()}</td>
                        <td>${r.status.toUpperCase()}</td>
                        <td style="font-size: 9px;">${r.observacoes || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            <p>Documento gerado pelo Sistema Ótica Davi - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p>Conferido por: __________________________________________________</p>
        </div>
    </div>
    
    <script>
        window.onload = function() { window.print(); }
    </script>
</body>
</html>`;
}

export function imprimirRelatorioListaOperacional(data: ReportAgendaOperacionalData) {
    const html = gerarRelatorioListaOperacionalHTML(data);
    const windowPrint = window.open('', '_blank');
    if (windowPrint) {
        windowPrint.document.write(html);
        windowPrint.document.close();
    }
}

export interface ReportTransferenciaData {
    protocolo: string;
    status: string;
    origem: string;
    destino: string;
    dataCriacao: string;
    dataEnvio: string;
    dataRecebimento: string;
    operadorCriacao: string;
    operadorRecebimento: string;
    observacoes: string;
    motivoParcial: string;
    motivoCancelamento: string;
    itens: {
        codigo: string;
        nome: string;
        marca: string;
        tipo: string;
        qtdEnviada: number;
        qtdRecebida: number | null;
    }[];
}

export function gerarRelatorioTransferenciaHTML(data: ReportTransferenciaData): string {
    const statusLabel: Record<string, string> = {
        pendente: "PENDENTE",
        em_transito: "EM TRÂNSITO",
        recebido: "RECEBIDO",
        recebido_parcial: "RECEBIDO PARCIAL",
        cancelado: "CANCELADO",
    };

    const totalEnviado = data.itens.reduce((acc, i) => acc + i.qtdEnviada, 0);
    const totalRecebido = data.itens.reduce((acc, i) => acc + (i.qtdRecebida ?? 0), 0);

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Transferência ${data.protocolo} - ${data.origem} → ${data.destino}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 11px; 
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
            background: white;
            color: #000;
        }
        .report-container {
            border: 2px solid #000;
            padding: 15px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .header h1 { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
        .header h2 { font-size: 14px; color: #333; margin-bottom: 5px; }
        .header .protocolo { font-size: 18px; font-weight: bold; font-family: 'Courier New', Courier, monospace; margin-top: 8px; }
        
        .info-grid { display: flex; border-bottom: 1px solid #000; margin-bottom: 15px; }
        .info-cell { flex: 1; padding: 5px 8px; border-right: 1px solid #999; }
        .info-cell:last-child { border-right: none; }
        .info-cell label { font-weight: bold; font-size: 9px; color: #666; display: block; text-transform: uppercase; }
        .info-cell span { font-size: 11px; font-weight: bold; }

        .section-title { 
            background: #eee; 
            padding: 5px 10px; 
            font-weight: bold; 
            font-size: 11px;
            border: 1px solid #000;
            margin-top: 15px;
        }

        .summary-grid { display: flex; flex-wrap: wrap; margin: 10px 0; border: 1px solid #999; }
        .summary-cell { 
            flex: 1; 
            min-width: 120px; 
            padding: 10px; 
            text-align: center; 
            border-right: 1px solid #999;
        }
        .summary-cell:last-child { border-right: none; }
        .summary-cell label { font-size: 10px; font-weight: bold; color: #444; display: block; margin-bottom: 4px; }
        .summary-cell span { font-size: 16px; font-weight: bold; font-family: 'Courier New', Courier, monospace; }

        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; font-size: 10px; }
        th { background: #f2f2f2; font-weight: bold; text-transform: uppercase; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }

        .obs-box {
            border: 1px solid #999;
            padding: 8px 10px;
            margin-top: 10px;
            min-height: 30px;
        }
        .obs-box label { font-weight: bold; font-size: 9px; color: #666; display: block; text-transform: uppercase; margin-bottom: 4px; }
        .obs-box p { font-size: 11px; }

        .signature-grid {
            display: flex;
            margin-top: 40px;
            gap: 30px;
        }
        .signature-cell {
            flex: 1;
            text-align: center;
            padding-top: 5px;
            border-top: 1px solid #000;
        }
        .signature-cell label { font-size: 9px; color: #666; text-transform: uppercase; }

        .footer { 
            margin-top: 30px; 
            text-align: center; 
            font-size: 10px; 
            color: #666; 
            border-top: 1px solid #ccc;
            padding-top: 10px;
        }

        @media print {
            body { padding: 0; }
            .report-container { border-width: 1px; }
            @page { margin: 1cm; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1>ÓTICA DAVI</h1>
            <h2>PROTOCOLO DE TRANSFERÊNCIA DE ESTOQUE</h2>
            <div class="protocolo">${data.protocolo}</div>
        </div>

        <div class="info-grid">
            <div class="info-cell"><label>Origem:</label><span>${data.origem}</span></div>
            <div class="info-cell"><label>Destino:</label><span>${data.destino}</span></div>
            <div class="info-cell"><label>Status:</label><span>${statusLabel[data.status] || data.status.toUpperCase()}</span></div>
        </div>

        <div class="info-grid">
            <div class="info-cell"><label>Data Criação:</label><span>${data.dataCriacao}</span></div>
            <div class="info-cell"><label>Data Envio:</label><span>${data.dataEnvio || '—'}</span></div>
            <div class="info-cell"><label>Data Recebimento:</label><span>${data.dataRecebimento || '—'}</span></div>
            <div class="info-cell"><label>Hora Impressão:</label><span>${new Date().toLocaleTimeString('pt-BR')}</span></div>
        </div>

        <div class="summary-grid">
            <div class="summary-cell"><label>TOTAL ITENS</label><span>${data.itens.length}</span></div>
            <div class="summary-cell"><label>QTD ENVIADA</label><span>${totalEnviado}</span></div>
            <div class="summary-cell"><label>QTD RECEBIDA</label><span>${totalRecebido > 0 ? totalRecebido : '—'}</span></div>
        </div>

        <div class="section-title">ITENS DA TRANSFERÊNCIA</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 70px;">Código</th>
                    <th>Produto</th>
                    <th>Marca</th>
                    <th style="width: 80px;">Tipo</th>
                    <th class="text-center" style="width: 80px;">Enviado</th>
                    <th class="text-center" style="width: 80px;">Recebido</th>
                </tr>
            </thead>
            <tbody>
                ${data.itens.map(item => `
                    <tr>
                        <td class="font-mono">${item.codigo || '—'}</td>
                        <td style="font-weight: bold;">${item.nome.toUpperCase()}</td>
                        <td>${item.marca || '—'}</td>
                        <td>${(item.tipo || '—').toUpperCase()}</td>
                        <td class="text-center font-mono">${item.qtdEnviada}</td>
                        <td class="text-center font-mono">${item.qtdRecebida !== null ? item.qtdRecebida : '—'}</td>
                    </tr>
                `).join('')}
                <tr style="font-weight: bold; background: #f9f9f9;">
                    <td colspan="4" class="text-right">TOTAL</td>
                    <td class="text-center font-mono">${totalEnviado}</td>
                    <td class="text-center font-mono">${totalRecebido > 0 ? totalRecebido : '—'}</td>
                </tr>
            </tbody>
        </table>

        ${data.observacoes ? `
        <div class="obs-box">
            <label>Observações</label>
            <p>${data.observacoes}</p>
        </div>
        ` : ''}

        ${data.motivoParcial ? `
        <div class="obs-box" style="border-color: #cc8800;">
            <label style="color: #cc8800;">Motivo do Recebimento Parcial</label>
            <p>${data.motivoParcial}</p>
        </div>
        ` : ''}

        ${data.motivoCancelamento ? `
        <div class="obs-box" style="border-color: #cc0000;">
            <label style="color: #cc0000;">Motivo do Cancelamento</label>
            <p>${data.motivoCancelamento}</p>
        </div>
        ` : ''}

        <div class="signature-grid">
            <div class="signature-cell">
                <label>Responsável pelo Envio</label>
            </div>
            <div class="signature-cell">
                <label>Responsável pelo Recebimento</label>
            </div>
        </div>

        <div class="footer">
            <p>Documento gerado pelo Sistema Ótica Davi - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
            <p>Conferido por: __________________________________________________</p>
        </div>
    </div>
    
    <script>
        window.onload = function() { window.print(); }
    </script>
</body>
</html>`;
}

export function imprimirRelatorioTransferencia(data: ReportTransferenciaData) {
    const html = gerarRelatorioTransferenciaHTML(data);
    const windowPrint = window.open('', '_blank');
    if (windowPrint) {
        windowPrint.document.write(html);
        windowPrint.document.close();
    }
}
