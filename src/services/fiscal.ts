import { supabase } from "@/lib/supabase";

export interface FiscalValidationResult {
    valid: boolean;
    errors: string[];
}

export const fiscalService = {
    /**
     * Valida se os dados da empresa e do cliente estão completos para emissão
     */
    async validarVendaParaEmissao(vendaId: string, modelo: 55 | 65 = 65): Promise<FiscalValidationResult> {
        const errors: string[] = [];

        // 1. Buscar dados da venda, cliente e empresa
        const { data: venda, error: vError } = await supabase
            .from('vendas')
            .select(`
                *,
                pacientes (*),
                empresas (*),
                vendas_itens (*, produtos(*))
            `)
            .eq('id', vendaId)
            .single();

        if (vError || !venda) {
            return { valid: false, errors: ["Venda não encontrada ou erro no banco."] };
        }

        const empresa = venda.empresas;
        const paciente = venda.pacientes;
        const itens = venda.vendas_itens;

        // 2. Validar Empresa (Emitente)
        if (!empresa.cnpj) errors.push("CNPJ da empresa não cadastrado.");
        if (!empresa.inscricao_estadual) errors.push("Inscrição Estadual da empresa não cadastrada.");
        if (!empresa.certificado_senha) errors.push("Certificado Digital ou senha não configurados.");

        // Se for 65 (NFC-e), validar CSC
        if (modelo === 65) {
            if (!empresa.csc_id || !empresa.csc_token) {
                errors.push("Tokens CSC (ID e Token) são obrigatórios para NFC-e.");
            }
        }

        // 3. Validar Paciente (Destinatário)
        if (modelo === 55) {
            // NF-e exige destinatário completo
            if (!paciente) {
                errors.push("Cliente cadastrado é obrigatório para emissão de NF-e.");
            } else {
                if (!paciente.cpf) errors.push("CPF do cliente é obrigatório para NF-e.");
                if (!paciente.endereco_logradouro) errors.push("Endereço do cliente (Logradouro) incompleto.");
                if (!paciente.endereco_numero) errors.push("Número do endereço não informado.");
                if (!paciente.endereco_bairro) errors.push("Bairro não informado.");
                if (!paciente.endereco_cidade) errors.push("Cidade não informada.");
                if (!paciente.endereco_estado) errors.push("UF não informada.");
                if (!paciente.endereco_cep) errors.push("CEP não informado.");
            }
        } else {
            // NFC-e permite venda sem CPF ou apenas com CPF identificado
            // Não bloqueamos aqui a menos que o usuário queira CPF na nota
        }

        // 4. Validar Itens (Produtos)
        itens.forEach((item: any) => {
            const prod = item.produtos;
            if (!prod.ncm || prod.ncm.length < 8) {
                errors.push(`Produto "${prod.nome}" está sem NCM válido.`);
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    },

    /**
     * Prepara o JSON para envio à API (Exemplo Focus NFe / PlugNotas)
     */
    async gerarPayloadFiscal(vendaId: string, modelo: 55 | 65 = 65) {
        const validation = await this.validarVendaParaEmissao(vendaId, modelo);
        if (!validation.valid) {
            throw new Error(validation.errors.join(" | "));
        }

        return {
            status: "ready",
            modelo: modelo,
            message: `Dados validados e prontos para transmissão de ${modelo === 55 ? 'NF-e' : 'NFC-e'}.`
        };
    }
};
