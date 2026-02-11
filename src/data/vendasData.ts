// Mock data para o módulo de vendas e estoque
import { HistoricoConsulta, historicoConsultas, pacienteEmAtendimento } from "./clinicaData";

export type StatusEstoque = "disponivel" | "baixo" | "critico";

export interface Lente {
    id: number;
    codigo: string;
    nome: string;
    tipo: "Monofocal" | "Bifocal" | "Progressiva" | "Contato";
    marca: string;
    material: "CR-39" | "Policarbonato" | "Trivex" | "Alto Índice";
    quantidade: number;
    precoUnitario: number;
    status: StatusEstoque;
}

export interface Armacao {
    id: number;
    codigo: string;
    nome: string;
    marca: string;
    modelo: string;
    cor: string;
    quantidade: number;
    precoUnitario: number;
    status: StatusEstoque;
}

export interface ItemVenda {
    id: number;
    tipo: "lente" | "armacao";
    produtoId: number;
    nome: string;
    quantidade: number;
    precoUnitario: number;
    precoTotal: number;
}

export interface Venda {
    id: number;
    receitaId?: number | string;
    pacienteId: number | string;
    pacienteNome: string;
    dataVenda: string;
    itens: ItemVenda[];
    subtotal: number;
    desconto: number;
    total: number;
    formaPagamento: "Dinheiro" | "Cartao Debito" | "Cartao Credito" | "PIX" | "Parcelado";
    parcelas?: number;
    status: "aberta" | "finalizada" | "cancelada";
}

export interface ReceitaParaVenda {
    id: number | string;
    pacienteId: number | string;
    pacienteNome: string;
    dataConsulta: string;
    profissional: string;
    olhoDireito: {
        esferico: string;
        cilindrico: string;
        eixo: string;
        adicao: string;
        dnp: string;
    };
    olhoEsquerdo: {
        esferico: string;
        cilindrico: string;
        eixo: string;
        adicao: string;
        dnp: string;
    };
    tipoLente: string;
    observacoes: string;
}

// Função para calcular status do estoque
export function calcularStatusEstoque(quantidade: number): StatusEstoque {
    if (quantidade <= 0) return "critico";
    if (quantidade <= 5) return "baixo";
    return "disponivel";
}

// Lentes em estoque
export const lentes: Lente[] = [
    {
        id: 1,
        codigo: "LNT-001",
        nome: "Lente CR-39 Monofocal",
        tipo: "Monofocal",
        marca: "Essilor",
        material: "CR-39",
        quantidade: 25,
        precoUnitario: 89.90,
        status: "disponivel",
    },
    {
        id: 2,
        codigo: "LNT-002",
        nome: "Lente Policarbonato Monofocal",
        tipo: "Monofocal",
        marca: "Zeiss",
        material: "Policarbonato",
        quantidade: 12,
        precoUnitario: 149.90,
        status: "disponivel",
    },
    {
        id: 3,
        codigo: "LNT-003",
        nome: "Lente Progressiva Varilux",
        tipo: "Progressiva",
        marca: "Essilor",
        material: "Alto Índice",
        quantidade: 4,
        precoUnitario: 599.90,
        status: "baixo",
    },
    {
        id: 4,
        codigo: "LNT-004",
        nome: "Lente Bifocal Flat-Top",
        tipo: "Bifocal",
        marca: "Hoya",
        material: "CR-39",
        quantidade: 8,
        precoUnitario: 179.90,
        status: "disponivel",
    },
    {
        id: 5,
        codigo: "LNT-005",
        nome: "Lente Contato Descartável",
        tipo: "Contato",
        marca: "Acuvue",
        material: "Policarbonato",
        quantidade: 0,
        precoUnitario: 45.00,
        status: "critico",
    },
    {
        id: 6,
        codigo: "LNT-006",
        nome: "Lente Trivex Monofocal",
        tipo: "Monofocal",
        marca: "Zeiss",
        material: "Trivex",
        quantidade: 3,
        precoUnitario: 199.90,
        status: "baixo",
    },
];

// Armações em estoque
export const armacoes: Armacao[] = [
    {
        id: 1,
        codigo: "ARM-001",
        nome: "Armação Ray-Ban RB5154",
        marca: "Ray-Ban",
        modelo: "RB5154",
        cor: "Preto",
        quantidade: 6,
        precoUnitario: 450.00,
        status: "disponivel",
    },
    {
        id: 2,
        codigo: "ARM-002",
        nome: "Armação Oakley OX8046",
        marca: "Oakley",
        modelo: "OX8046",
        cor: "Azul",
        quantidade: 3,
        precoUnitario: 520.00,
        status: "baixo",
    },
    {
        id: 3,
        codigo: "ARM-003",
        nome: "Armação Chilli Beans CB0721",
        marca: "Chilli Beans",
        modelo: "CB0721",
        cor: "Tartaruga",
        quantidade: 15,
        precoUnitario: 280.00,
        status: "disponivel",
    },
    {
        id: 4,
        codigo: "ARM-004",
        nome: "Armação Vogue VO5243",
        marca: "Vogue",
        modelo: "VO5243",
        cor: "Rosa",
        quantidade: 2,
        precoUnitario: 350.00,
        status: "baixo",
    },
    {
        id: 5,
        codigo: "ARM-005",
        nome: "Armação Ana Hickmann AH6348",
        marca: "Ana Hickmann",
        modelo: "AH6348",
        cor: "Dourado",
        quantidade: 0,
        precoUnitario: 420.00,
        status: "critico",
    },
    {
        id: 6,
        codigo: "ARM-006",
        nome: "Armação Atitude AT4066",
        marca: "Atitude",
        modelo: "AT4066",
        cor: "Preto Fosco",
        quantidade: 8,
        precoUnitario: 190.00,
        status: "disponivel",
    },
];

// Converter histórico de consulta para receita de venda
export function converterParaReceitaVenda(consulta: HistoricoConsulta): ReceitaParaVenda {
    return {
        id: consulta.id,
        pacienteId: consulta.pacienteId,
        pacienteNome: pacienteEmAtendimento.nome,
        dataConsulta: consulta.data,
        profissional: consulta.profissional,
        olhoDireito: {
            esferico: consulta.exame.olhoDireito.esferico,
            cilindrico: consulta.exame.olhoDireito.cilindrico,
            eixo: consulta.exame.olhoDireito.eixo,
            adicao: consulta.exame.olhoDireito.adicao,
            dnp: consulta.exame.olhoDireito.dnp,
        },
        olhoEsquerdo: {
            esferico: consulta.exame.olhoEsquerdo.esferico,
            cilindrico: consulta.exame.olhoEsquerdo.cilindrico,
            eixo: consulta.exame.olhoEsquerdo.eixo,
            adicao: consulta.exame.olhoEsquerdo.adicao,
            dnp: consulta.exame.olhoEsquerdo.dnp,
        },
        tipoLente: consulta.receita?.tipoLente || "Monofocal",
        observacoes: consulta.receita?.observacoes || "",
    };
}

// Receitas disponíveis para venda (apenas consultas com receita)
export const receitasDisponiveis: ReceitaParaVenda[] = historicoConsultas
    .filter((c) => c.receita)
    .map(converterParaReceitaVenda);

// Venda vazia para iniciar
export const vendaVazia: Venda = {
    id: 0,
    pacienteId: 0,
    pacienteNome: "",
    dataVenda: new Date().toISOString().split("T")[0],
    itens: [],
    subtotal: 0,
    desconto: 0,
    total: 0,
    formaPagamento: "Dinheiro",
    status: "aberta",
};

// Histórico de vendas
export const historicoVendas: Venda[] = [
    {
        id: 1,
        receitaId: 1,
        pacienteId: 1,
        pacienteNome: "João Silva",
        dataVenda: "2026-01-10",
        itens: [
            {
                id: 1,
                tipo: "lente",
                produtoId: 3,
                nome: "Lente Progressiva Varilux",
                quantidade: 2,
                precoUnitario: 599.90,
                precoTotal: 1199.80,
            },
            {
                id: 2,
                tipo: "armacao",
                produtoId: 1,
                nome: "Armação Ray-Ban RB5154",
                quantidade: 1,
                precoUnitario: 450.00,
                precoTotal: 450.00,
            },
        ],
        subtotal: 1649.80,
        desconto: 0,
        total: 1649.80,
        formaPagamento: "Cartao Credito",
        parcelas: 3,
        status: "finalizada",
    },
    {
        id: 2,
        receitaId: 3,
        pacienteId: 1,
        pacienteNome: "João Silva",
        dataVenda: "2025-01-20",
        itens: [
            {
                id: 3,
                tipo: "lente",
                produtoId: 1,
                nome: "Lente CR-39 Monofocal",
                quantidade: 2,
                precoUnitario: 89.90,
                precoTotal: 179.80,
            },
            {
                id: 4,
                tipo: "armacao",
                produtoId: 6,
                nome: "Armação Atitude AT4066",
                quantidade: 1,
                precoUnitario: 190.00,
                precoTotal: 190.00,
            },
        ],
        subtotal: 369.80,
        desconto: 20.00,
        total: 349.80,
        formaPagamento: "PIX",
        status: "finalizada",
    },
];
