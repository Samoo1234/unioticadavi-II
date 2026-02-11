// Mock data para o módulo financeiro

export type FormaPagamento = "Dinheiro" | "PIX" | "Cartao Debito" | "Cartao Credito" | "Boleto" | "Outros";

export type TipoFinanceiroAgendamento = "Particular" | "Convênio" | "Campanha" | "Exames" | "Revisão";
export type SituacaoFinanceiroAgendamento = "Caso Clínico" | "Efetivação" | "Perda";

export interface PagamentoAgendamento {
    forma: FormaPagamento;
    valor: number;
}

export interface RegistroFinanceiroAgendamento {
    id: string | number;
    pacienteNome: string;
    valorTotal: number;
    tipo: TipoFinanceiroAgendamento | "";
    pagamentos: PagamentoAgendamento[];
    situacao: SituacaoFinanceiroAgendamento | "";
    observacoes: string;
}

export interface Entrada {
    id: string | number;
    data: string;
    hora: string;
    origem: "Venda" | "Venda (A Prazo)" | "Ajuste" | "Outro" | "Agendamento" | "Suprimento" | "Recebimento";
    descricao: string;
    cliente?: string;
    vendaId?: string | number;
    formaPagamento: FormaPagamento;
    valor: number;
    empresa_id?: number;
}

export interface Saida {
    id: string | number;
    data: string;
    hora: string;
    motivo: "Fornecedor" | "Despesa" | "Ajuste" | "Outro" | "Sangria";
    descricao: string;
    formaPagamento: FormaPagamento;
    valor: number;
    empresa_id?: number;
}

export interface Caixa {
    id: string | number;
    data: string;
    status: "aberto" | "fechado" | "consolidado";
    horaAbertura?: string;
    horaFechamento?: string;
    aberto_em?: string;
    fechado_em?: string;
    saldoInicial: number;
    totalEntradas: number;
    totalSaidas: number;
    saldoFinal: number;
    operador: string;
    empresa_id?: number;
}

export interface FormaPagamentoConfig {
    id: number;
    nome: FormaPagamento;
    ativo: boolean;
}

// Formas de pagamento disponíveis
export const formasPagamento: FormaPagamentoConfig[] = [
    { id: 1, nome: "Dinheiro", ativo: true },
    { id: 2, nome: "PIX", ativo: true },
    { id: 3, nome: "Cartao Debito", ativo: true },
    { id: 4, nome: "Cartao Credito", ativo: true },
    { id: 5, nome: "Boleto", ativo: true },
    { id: 6, nome: "Outros", ativo: true },
];

// Função para formatar hora atual
export function getHoraAtual(): string {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Função para formatar data atual
export function getDataAtual(): string {
    return new Date().toISOString().split("T")[0];
}

// Entradas do dia (incluindo vendas automáticas)
export const entradasHoje: Entrada[] = [
    {
        id: 1,
        data: getDataAtual(),
        hora: "08:15",
        origem: "Venda",
        descricao: "Venda #001 - Óculos progressivos",
        cliente: "João Silva",
        vendaId: 1,
        formaPagamento: "Cartao Credito",
        valor: 1649.80,
    },
    {
        id: 2,
        data: getDataAtual(),
        hora: "09:30",
        origem: "Venda",
        descricao: "Venda #002 - Óculos monofocal",
        cliente: "Maria Santos",
        vendaId: 2,
        formaPagamento: "PIX",
        valor: 349.80,
    },
    {
        id: 3,
        data: getDataAtual(),
        hora: "10:45",
        origem: "Outro",
        descricao: "Conserto de armação",
        cliente: "Carlos Oliveira",
        formaPagamento: "Dinheiro",
        valor: 50.00,
    },
    {
        id: 4,
        data: getDataAtual(),
        hora: "11:20",
        origem: "Venda",
        descricao: "Venda #003 - Lentes de contato",
        cliente: "Ana Costa",
        vendaId: 3,
        formaPagamento: "Cartao Debito",
        valor: 180.00,
    },
];

// Saídas do dia
export const saidasHoje: Saida[] = [
    {
        id: 1,
        data: getDataAtual(),
        hora: "08:00",
        motivo: "Despesa",
        descricao: "Café e materiais de limpeza",
        formaPagamento: "Dinheiro",
        valor: 45.00,
    },
    {
        id: 2,
        data: getDataAtual(),
        hora: "10:00",
        motivo: "Fornecedor",
        descricao: "Pagamento parcial - Essilor",
        formaPagamento: "Boleto",
        valor: 500.00,
    },
    {
        id: 3,
        data: getDataAtual(),
        hora: "12:00",
        motivo: "Despesa",
        descricao: "Almoço equipe",
        formaPagamento: "PIX",
        valor: 85.00,
    },
];

// Calcular totais
export function calcularTotais(entradas: Entrada[], saidas: Saida[]) {
    const totalEntradas = entradas.reduce((acc, e) => acc + e.valor, 0);
    const totalSaidas = saidas.reduce((acc, s) => acc + s.valor, 0);
    return { totalEntradas, totalSaidas };
}

// Caixa do dia
export const caixaHoje: Caixa = {
    id: 1,
    data: getDataAtual(),
    status: "aberto",
    horaAbertura: "08:00",
    saldoInicial: 200.00,
    totalEntradas: entradasHoje.reduce((acc, e) => acc + e.valor, 0),
    totalSaidas: saidasHoje.reduce((acc, s) => acc + s.valor, 0),
    saldoFinal: 200.00 + entradasHoje.reduce((acc, e) => acc + e.valor, 0) - saidasHoje.reduce((acc, s) => acc + s.valor, 0),
    operador: "ADMIN",
};

// Entrada vazia para formulário
export const entradaVazia: Omit<Entrada, "id" | "data" | "hora"> = {
    origem: "Outro",
    descricao: "",
    formaPagamento: "Dinheiro",
    valor: 0,
};

// Saída vazia para formulário
export const saidaVazia: Omit<Saida, "id" | "data" | "hora"> = {
    motivo: "Despesa",
    descricao: "",
    formaPagamento: "Dinheiro",
    valor: 0,
};
