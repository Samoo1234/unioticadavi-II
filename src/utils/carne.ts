"use client";

import { formatarMoeda } from "./monetary";

interface Parcela {
    numero: number;
    vencimento: string;
    valor: number;
}

interface EmpresaData {
    nome_fantasia: string;
    telefone: string;
    cnpj?: string;
    endereco: {
        logradouro: string;
        numero: string;
        bairro: string;
        cidade: string;
        estado: string;
    } | null;
}

export interface CarneData {
    empresa: EmpresaData;
    clienteNome: string;
    vendaId: string | number;
    valorTotal: number;
    parcelas: Parcela[];
}

export function gerarCarneHTML(data: CarneData): string {
    const enderecoEmpresa = data.empresa.endereco
        ? `${data.empresa.endereco.logradouro}, ${data.empresa.endereco.numero} - ${data.empresa.endereco.bairro}, ${data.empresa.endereco.cidade}-${data.empresa.endereco.estado}`
        : "";

    const parcelasHTML = data.parcelas.map(p => `
        <div class="parcela">
            <div class="canhoto">
                <div class="field"><label>PARCELA</label><span>${p.numero}/${data.parcelas.length}</span></div>
                <div class="field"><label>VENCIMENTO</label><span>${p.vencimento}</span></div>
                <div class="field"><label>VALOR</label><span>R$ ${formatarMoeda(p.valor)}</span></div>
                <div class="field"><label>CLIENTE</label><span class="small">${data.clienteNome}</span></div>
                <div class="footer-canhoto text-center">CONTROLE DA LOJA</div>
            </div>
            <div class="corpo">
                <div class="header-carne">
                    <div class="empresa-info">
                        <strong>${data.empresa.nome_fantasia.toUpperCase()}</strong><br/>
                        <span class="small">${data.empresa.cnpj || ""} ${data.empresa.telefone}</span><br/>
                        <span class="small">${enderecoEmpresa}</span>
                    </div>
                    <div class="venda-info text-right">
                        <label>Venda Nº:</label> <span>${data.vendaId}</span><br/>
                        <label>Total:</label> <span>R$ ${formatarMoeda(data.valorTotal)}</span>
                    </div>
                </div>
                <div class="main-carne">
                    <div class="row">
                        <div class="cell flex-2"><label>CLIENTE</label><span>${data.clienteNome}</span></div>
                        <div class="cell"><label>CNPJ/CPF</label><span>-</span></div>
                    </div>
                    <div class="row">
                        <div class="cell"><label>PARCELA</label><span>${p.numero} de ${data.parcelas.length}</span></div>
                        <div class="cell"><label>VALOR DA PARCELA</label><span class="bold">R$ ${formatarMoeda(p.valor)}</span></div>
                        <div class="cell"><label>VENCIMENTO</label><span class="bold">${p.vencimento}</span></div>
                    </div>
                    <div class="row info-row">
                        <div class="cell"><label>MULTA/JUROS</label><span>-</span></div>
                        <div class="cell"><label>TOTAL PAGO</label><span>-</span></div>
                        <div class="cell"><label>DATA PAGAMENTO</label><span>____/____/____</span></div>
                    </div>
                </div>
                <div class="footer-carne">
                    <span>Assinatura/Autenticação Manual</span>
                </div>
            </div>
        </div>
        <div class="separator"></div>
    `).join("");

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Carnê de Pagamento - ${data.clienteNome}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; background: white; padding: 20px; }
        .parcela { display: flex; border: 1px solid #000; margin-bottom: 5px; height: 180px; }
        .canhoto { width: 140px; border-right: 1px dashed #000; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        .corpo { flex: 1; padding: 10px; display: flex; flex-direction: column; }
        .separator { height: 10px; border-top: 1px dotted #999; margin: 10px 0; }
        
        .header-carne { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 8px; }
        .main-carne { flex: 1; }
        .row { display: flex; border: 1px solid #eee; margin-bottom: -1px; }
        .cell { padding: 4px; border-right: 1px solid #eee; }
        .cell:last-child { border-right: none; }
        .cell.flex-2 { flex: 2; }
        .cell label { display: block; font-size: 8px; color: #666; font-weight: bold; }
        .cell span { font-size: 11px; }
        .cell span.bold { font-weight: bold; font-size: 13px; }
        
        .field { border-bottom: 1px solid #eee; padding-bottom: 2px; }
        .field label { display: block; font-size: 8px; color: #666; }
        .field span { font-weight: bold; font-size: 11px; }
        .field span.small { font-size: 9px; }
        
        .footer-carne { margin-top: auto; border-top: 1px solid #ddd; padding-top: 5px; font-style: italic; color: #999; display: flex; justify-content: space-between; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .small { font-size: 9px; }
        .footer-canhoto { margin-top: auto; font-size: 8px; font-weight: bold; padding: 2px; background: #eee; }
        
        @media print {
            body { padding: 0; }
            .separator { border-color: transparent; }
            .parcela { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    ${parcelasHTML}
    <script>window.onload = () => window.print();</script>
</body>
</html>
    `;
}

export function abrirCarne(data: CarneData): void {
    const html = gerarCarneHTML(data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    if (!newWindow) {
        alert("O bloqueador de popups impediu a abertura do carnê. Por favor, autorize.");
    }
}
