// Mock data para cadastro de empresas (matriz e filiais)

export type TipoEmpresa = "Matriz" | "Filial";

// Tipos para configuração de horários
export interface TurnoAtendimento {
    id: number;
    nome: string; // "Manhã", "Tarde", "Noite"
    inicio: string; // "08:00"
    fim: string; // "12:00"
    ativo: boolean;
}

export interface Medico {
    id: number;
    nome: string;
}

export interface DiaDisponivel {
    data: string; // "2026-01-21"
    medico_id?: number; // ID na tabela medicos
    medicoResponsavel?: string; // mantido para compatibilidade
    observacao?: string;
}

export interface ConfiguracaoHorarios {
    turnos: TurnoAtendimento[];
    intervaloMinutos: number; // 10, 15, 20, 30
    diasDisponiveis: DiaDisponivel[];
    medicos: Medico[];
}

export interface Empresa {
    id: number;
    tipo: TipoEmpresa;
    razaoSocial: string;
    nomeFantasia: string;
    cnpj: string;
    inscricaoEstadual: string;
    telefone: string;
    email: string;
    endereco: {
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        estado: string;
        cep: string;
    };
    responsavel: string;
    ativo: boolean;
    dataCadastro: string;
    configuracaoHorarios?: ConfiguracaoHorarios;
    regimeTributario?: string;
    certificadoSenha?: string;
    certificadoB64?: string;
    cscId?: string;
    cscToken?: string;
    ambiente?: "Produção" | "Homologação";
}

// Empresas cadastradas
export const empresas: Empresa[] = [
    {
        id: 1,
        tipo: "Matriz",
        razaoSocial: "ÓTICA DAVI LTDA",
        nomeFantasia: "ÓTICA DAVI - MATRIZ",
        cnpj: "12.345.678/0001-00",
        inscricaoEstadual: "123.456.789.000",
        telefone: "(11) 3456-7890",
        email: "matriz@oticadavi.com.br",
        endereco: {
            logradouro: "Av. Paulista",
            numero: "1000",
            complemento: "Sala 101",
            bairro: "Bela Vista",
            cidade: "São Paulo",
            estado: "SP",
            cep: "01310-100",
        },
        responsavel: "Carlos Eduardo Silva",
        ativo: true,
        dataCadastro: "2020-01-15",
        configuracaoHorarios: {
            turnos: [
                { id: 1, nome: "Manhã", inicio: "08:00", fim: "12:00", ativo: true },
                { id: 2, nome: "Tarde", inicio: "14:00", fim: "18:00", ativo: true },
            ],
            intervaloMinutos: 30,
            diasDisponiveis: [
                { data: "2026-01-21", medicoResponsavel: "Dr. Carlos" },
                { data: "2026-01-22", medicoResponsavel: "Dra. Ana" },
                { data: "2026-01-23", medicoResponsavel: "Dr. Carlos" },
                { data: "2026-01-24", medicoResponsavel: "Dra. Ana" },
                { data: "2026-01-27", medicoResponsavel: "Dr. Carlos" },
                { data: "2026-01-28", medicoResponsavel: "Dra. Ana" },
            ],
            medicos: [
                { id: 1, nome: "Dr. Carlos" },
                { id: 2, nome: "Dra. Ana" },
            ],
        },
    },
    {
        id: 2,
        tipo: "Filial",
        razaoSocial: "ÓTICA DAVI LTDA",
        nomeFantasia: "ÓTICA DAVI - SHOPPING CENTER",
        cnpj: "12.345.678/0002-81",
        inscricaoEstadual: "123.456.789.001",
        telefone: "(11) 3456-7891",
        email: "shopping@oticadavi.com.br",
        endereco: {
            logradouro: "Av. das Nações Unidas",
            numero: "12901",
            complemento: "Loja 234",
            bairro: "Brooklin",
            cidade: "São Paulo",
            estado: "SP",
            cep: "04578-000",
        },
        responsavel: "Maria Fernanda Costa",
        ativo: true,
        dataCadastro: "2022-06-10",
        configuracaoHorarios: {
            turnos: [
                { id: 1, nome: "Manhã", inicio: "09:00", fim: "13:00", ativo: true },
                { id: 2, nome: "Tarde", inicio: "14:00", fim: "20:00", ativo: true },
            ],
            intervaloMinutos: 20,
            diasDisponiveis: [
                { data: "2026-01-21", medicoResponsavel: "Dr. Pedro" },
                { data: "2026-01-22", medicoResponsavel: "Dr. Pedro" },
                { data: "2026-01-25", medicoResponsavel: "Dr. Pedro" },
            ],
            medicos: [
                { id: 1, nome: "Dr. Pedro" },
            ],
        },
    },
    {
        id: 3,
        tipo: "Filial",
        razaoSocial: "ÓTICA DAVI LTDA",
        nomeFantasia: "ÓTICA DAVI - CENTRO",
        cnpj: "12.345.678/0003-62",
        inscricaoEstadual: "123.456.789.002",
        telefone: "(11) 3456-7892",
        email: "centro@oticadavi.com.br",
        endereco: {
            logradouro: "Rua Direita",
            numero: "250",
            bairro: "Centro",
            cidade: "São Paulo",
            estado: "SP",
            cep: "01002-000",
        },
        responsavel: "João Pedro Almeida",
        ativo: false,
        dataCadastro: "2023-03-20",
    },
];

// Empresa vazia para cadastro
export const empresaVazia: Omit<Empresa, "id" | "dataCadastro"> = {
    tipo: "Filial",
    razaoSocial: "",
    nomeFantasia: "",
    cnpj: "",
    inscricaoEstadual: "",
    telefone: "",
    email: "",
    endereco: {
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        estado: "",
        cep: "",
    },
    responsavel: "",
    ativo: true,
    regimeTributario: "Simples Nacional",
    ambiente: "Homologação",
    certificadoSenha: "",
    cscId: "",
    cscToken: "",
    configuracaoHorarios: {
        turnos: [
            { id: 1, nome: "Manhã", inicio: "08:00", fim: "12:00", ativo: true },
            { id: 2, nome: "Tarde", inicio: "14:00", fim: "18:00", ativo: true },
        ],
        intervaloMinutos: 30,
        diasDisponiveis: [],
        medicos: [],
    },
};

// Configuração de horários padrão
export const configuracaoHorariosPadrao: ConfiguracaoHorarios = {
    turnos: [
        { id: 1, nome: "Manhã", inicio: "08:00", fim: "12:00", ativo: true },
        { id: 2, nome: "Tarde", inicio: "14:00", fim: "18:00", ativo: true },
    ],
    intervaloMinutos: 30,
    diasDisponiveis: [],
    medicos: [],
};
