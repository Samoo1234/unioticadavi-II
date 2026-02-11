"use client";

// Interface para dados da empresa
interface EmpresaData {
    id: number;
    nome_fantasia: string;
    telefone: string;
    cidade: string;
    estado: string;
    endereco: {
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        estado: string;
        cep: string;
    } | null;
    cnpj?: string;
}

// Interface para dados do TSO
export interface TSOData {
    // Dados da empresa
    empresa: EmpresaData;

    // Dados do documento
    numeroReceituario: number;
    dataEmissao: string;
    dataEntrega: string;
    hora: string;

    // Dados do cliente
    clienteCodigo: string;
    clienteNome: string;
    clienteEndereco?: string;
    clienteBairro?: string;
    clienteCidade?: string;
    clienteUF?: string;
    clienteCep?: string;
    clienteTelefone?: string;
    clienteNascimento?: string;
    clienteCpf?: string;

    // Solicitante e Vendedor
    solicitante?: string;
    vendedor: string;

    // Receita - Longe
    longeOD: { esferico: string; cilindrico: string; eixo: string; dp: string; altura: string; dnp: string };
    longeOE: { esferico: string; cilindrico: string; eixo: string; dp: string; altura: string; dnp: string };

    // Receita - Perto (se bifocal/progressiva)
    pertoOD?: { esferico: string; cilindrico: string; eixo: string; dp: string; altura: string; dnp: string };
    pertoOE?: { esferico: string; cilindrico: string; eixo: string; dp: string; altura: string; dnp: string };

    // Adição
    adicao?: string;

    // Produtos
    armacao?: { codigo: string; descricao: string; valor: number; tipo: string };
    lente?: { codigo: string; descricao: string; valor: number; tipo: string };

    // Valores
    valorTotal: number;
    valorOutros?: number;
    valorEntrada?: number;
    valorSaldo: number;

    // Rodapé
    laboratorio?: string;
    condPagto?: string;
    diametro?: string;
    observacao?: string;
    pedVenda?: string;
    dataVenda: string;
}

// Função para formatar moeda
function formatarMoeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Função para gerar o HTML do TSO
export function gerarTSOHTML(data: TSOData): string {
    const enderecoEmpresa = data.empresa.endereco
        ? `${data.empresa.endereco.logradouro}, ${data.empresa.endereco.numero} - ${data.empresa.endereco.bairro} - ${data.empresa.cidade} - ${data.empresa.estado} - Cep: ${data.empresa.endereco.cep}`
        : `${data.empresa.cidade} - ${data.empresa.estado}`;

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>TSO - ${data.clienteNome}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            font-size: 11px; 
            padding: 15px;
            max-width: 800px;
            margin: 0 auto;
            background: white;
        }
        .tso-container {
            border: 2px solid #000;
            padding: 10px;
        }
        .header {
            text-align: center;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
        }
        .header h1 { font-size: 18px; font-weight: bold; margin-bottom: 3px; }
        .header p { font-size: 10px; }
        
        .row { display: flex; border-bottom: 1px solid #999; }
        .row:last-child { border-bottom: none; }
        .cell { padding: 4px 6px; border-right: 1px solid #999; }
        .cell:last-child { border-right: none; }
        .cell label { font-weight: bold; font-size: 9px; color: #333; }
        .cell span { display: block; font-size: 11px; }
        
        .section-title { 
            background: #eee; 
            padding: 3px 6px; 
            font-weight: bold; 
            font-size: 10px;
            border-bottom: 1px solid #000;
        }
        
        .receita-table { width: 100%; border-collapse: collapse; margin: 5px 0; }
        .receita-table th, .receita-table td { 
            border: 1px solid #999; 
            padding: 3px 5px; 
            text-align: center; 
            font-size: 10px;
        }
        .receita-table th { background: #f5f5f5; font-weight: bold; }
        .receita-table .label-col { text-align: left; font-weight: bold; width: 60px; }
        
        .produtos-section { margin-top: 10px; }
        .valores-row { display: flex; background: #f9f9f9; }
        .valor-cell { flex: 1; padding: 5px; text-align: center; border: 1px solid #999; }
        .valor-cell label { font-size: 9px; display: block; }
        .valor-cell span { font-size: 14px; font-weight: bold; }
        
        .footer { margin-top: 10px; font-size: 9px; }
        .footer-row { display: flex; border-bottom: 1px solid #999; }
        .footer-cell { flex: 1; padding: 3px 6px; }
        
        .assinatura { 
            margin-top: 20px; 
            text-align: center; 
            padding-top: 30px; 
            border-top: 1px solid #000;
            width: 300px;
            margin-left: auto;
            margin-right: auto;
        }
        
        @media print {
            body { padding: 5px; }
            .tso-container { border-width: 1px; }
        }
    </style>
</head>
<body>
    <div class="tso-container">
        <!-- Cabeçalho -->
        <div class="header">
            <h1>${data.empresa.nome_fantasia.toUpperCase()}</h1>
            <p>Fone: ${data.empresa.telefone || '-'}</p>
            <p>${enderecoEmpresa}</p>
        </div>
        
        <!-- Dados do Documento -->
        <div class="row">
            <div class="cell" style="width: 20%"><label>Dt Emissão:</label><span>${data.dataEmissao}</span></div>
            <div class="cell" style="width: 20%"><label>Dt a Entregar:</label><span>${data.dataEntrega}</span></div>
            <div class="cell" style="width: 15%"><label>Hora:</label><span>${data.hora}</span></div>
            <div class="cell" style="width: 45%; text-align: right;"><label>Número Receituário:</label><span style="font-size: 16px; font-weight: bold;">${data.numeroReceituario}</span></div>
        </div>
        
        <!-- Dados do Cliente -->
        <div class="row">
            <div class="cell" style="width: 60%"><label>Cliente:</label><span>${data.clienteNome}</span></div>
            <div class="cell" style="width: 40%"><label>Dt Nascimento:</label><span>${data.clienteNascimento || '-'}</span></div>
        </div>
        <div class="row">
            <div class="cell" style="width: 60%"><label>Endereço:</label><span>${data.clienteEndereco || '-'}</span></div>
            <div class="cell" style="width: 40%"><label>CPF/CNPJ:</label><span>${data.clienteCpf || '-'}</span></div>
        </div>
        <div class="row">
            <div class="cell" style="width: 40%"><label>Bairro:</label><span>${data.clienteBairro || '-'}</span></div>
            <div class="cell" style="width: 40%"><label>Cidade:</label><span>${data.clienteCidade || '-'}</span></div>
            <div class="cell" style="width: 10%"><label>UF:</label><span>${data.clienteUF || '-'}</span></div>
            <div class="cell" style="width: 10%"><label>Cep:</label><span>${data.clienteCep || '-'}</span></div>
        </div>
        <div class="row">
            <div class="cell" style="width: 50%"><label>Solicitante:</label><span>${data.solicitante || data.clienteNome}</span></div>
            <div class="cell" style="width: 20%"><label>Fone:</label><span>${data.clienteTelefone || '-'}</span></div>
            <div class="cell" style="width: 30%"><label>Vendedor:</label><span>${data.vendedor}</span></div>
        </div>
        
        <!-- Receita -->
        <div class="section-title">RECEITA</div>
        <table class="receita-table">
            <thead>
                <tr>
                    <th></th>
                    <th>Adição</th>
                    <th>Esférico</th>
                    <th>Cilíndrico</th>
                    <th>Eixo</th>
                    <th>D.P.</th>
                    <th>Altura</th>
                    <th>D.N.P.</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="label-col">Longe: O.D.</td>
                    <td>${data.adicao || '-'}</td>
                    <td>${data.longeOD.esferico || '-'}</td>
                    <td>${data.longeOD.cilindrico || '-'}</td>
                    <td>${data.longeOD.eixo || '-'}°</td>
                    <td>${data.longeOD.dp || '-'}</td>
                    <td>${data.longeOD.altura || '-'}</td>
                    <td>${data.longeOD.dnp || '-'}</td>
                </tr>
                <tr>
                    <td class="label-col">O.E.</td>
                    <td></td>
                    <td>${data.longeOE.esferico || '-'}</td>
                    <td>${data.longeOE.cilindrico || '-'}</td>
                    <td>${data.longeOE.eixo || '-'}°</td>
                    <td>${data.longeOE.dp || '-'}</td>
                    <td>${data.longeOE.altura || '-'}</td>
                    <td>${data.longeOE.dnp || '-'}</td>
                </tr>
                ${data.pertoOD ? `
                <tr>
                    <td class="label-col">Perto: O.D.</td>
                    <td></td>
                    <td>${data.pertoOD.esferico || '-'}</td>
                    <td>${data.pertoOD.cilindrico || '-'}</td>
                    <td>${data.pertoOD.eixo || '-'}°</td>
                    <td>${data.pertoOD.dp || '-'}</td>
                    <td>${data.pertoOD.altura || '-'}</td>
                    <td>${data.pertoOD.dnp || '-'}</td>
                </tr>
                <tr>
                    <td class="label-col">O.E.</td>
                    <td></td>
                    <td>${data.pertoOE?.esferico || '-'}</td>
                    <td>${data.pertoOE?.cilindrico || '-'}</td>
                    <td>${data.pertoOE?.eixo || '-'}°</td>
                    <td>${data.pertoOE?.dp || '-'}</td>
                    <td>${data.pertoOE?.altura || '-'}</td>
                    <td>${data.pertoOE?.dnp || '-'}</td>
                </tr>
                ` : ''}
            </tbody>
        </table>
        
        <!-- Produtos -->
        <div class="produtos-section">
            <div class="row">
                <div class="cell" style="width: 60%"><label>Armação:</label><span>${data.armacao?.codigo || '-'} ${data.armacao?.descricao || '-'}</span></div>
                <div class="cell" style="width: 20%"><label>Valor:</label><span>R$ ${data.armacao ? formatarMoeda(data.armacao.valor) : '0,00'}</span></div>
                <div class="cell" style="width: 20%"><label>Tipo:</label><span>${data.armacao?.tipo || '-'}</span></div>
            </div>
            <div class="row">
                <div class="cell" style="width: 60%"><label>Lente:</label><span>${data.lente?.codigo || '-'} ${data.lente?.descricao || '-'}</span></div>
                <div class="cell" style="width: 20%"><label>Valor:</label><span>R$ ${data.lente ? formatarMoeda(data.lente.valor) : '0,00'}</span></div>
                <div class="cell" style="width: 20%"><label>Tipo:</label><span>${data.lente?.tipo || '-'}</span></div>
            </div>
        </div>
        
        <!-- Valores -->
        <div class="valores-row">
            <div class="valor-cell"><label>Vr Total:</label><span>R$ ${formatarMoeda(data.valorTotal)}</span></div>
            <div class="valor-cell"><label>Vr Outros:</label><span>R$ ${formatarMoeda(data.valorOutros || 0)}</span></div>
            <div class="valor-cell"><label>Vr Entrada:</label><span>R$ ${formatarMoeda(data.valorEntrada || 0)}</span></div>
            <div class="valor-cell"><label>Vr Saldo:</label><span>R$ ${formatarMoeda(data.valorSaldo)}</span></div>
        </div>
        
        <!-- Rodapé -->
        <div class="footer">
            <div class="footer-row">
                <div class="footer-cell"><label>Laboratório:</label> ${data.laboratorio || '-'}</div>
                <div class="footer-cell"><label>Dt Pedido:</label> ${data.dataVenda}</div>
                <div class="footer-cell"><label>Dt Entrega:</label> ${data.dataEntrega}</div>
            </div>
            <div class="footer-row">
                <div class="footer-cell"><label>Cond. Pagto:</label> ${data.condPagto || '-'}</div>
                <div class="footer-cell"><label>Diâmetro:</label> ${data.diametro || '-'}</div>
            </div>
            <div class="footer-row">
                <div class="footer-cell" style="flex: 2"><label>Observação:</label> ${data.observacao || '-'}</div>
            </div>
            <div class="footer-row">
                <div class="footer-cell"><label>Ped. Venda:</label> ${data.pedVenda || '-'}</div>
                <div class="footer-cell"><label>Dt. Venda:</label> ${data.dataVenda}</div>
            </div>
        </div>
        
        <!-- Assinatura -->
        <div class="assinatura">
            <p>Autorizo a Realizar o Serviço</p>
        </div>
    </div>
    
    <script>
        window.onload = function() { 
            window.print(); 
        }
    </script>
</body>
</html>`;
}

// Função para abrir TSO para impressão
export function abrirTSO(data: TSOData): void {
    const html = gerarTSOHTML(data);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const newWindow = window.open(url, '_blank');

    if (!newWindow) {
        // Fallback: download do arquivo
        const link = document.createElement('a');
        link.href = url;
        link.download = `TSO_${data.clienteNome.replace(/\s/g, '_')}_${data.numeroReceituario}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    setTimeout(() => URL.revokeObjectURL(url), 10000);
}
