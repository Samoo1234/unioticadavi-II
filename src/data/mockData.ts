// Mock data para o sistema de ótica

export interface Paciente {
    id: string | number;
    nome: string;
    telefone: string;
    email: string;
    cpf: string;
    dataNascimento: string;
    ultimaConsulta: string;
    nomePai: string;
    nomeMae: string;
    enderecoCompleto: string;
    enderecoLogradouro?: string;
    enderecoNumero?: string;
    enderecoBairro?: string;
    enderecoCidade?: string;
    enderecoEstado?: string;
    enderecoCep?: string;
    enderecoComplemento?: string;
    rg: string;
    observacoes: string;
}

export interface Consulta {
    id: string | number;
    empresaId: number; // ID da empresa/loja
    data: string; // "2026-01-21"
    hora: string;
    pacienteId: string | number;
    pacienteNome: string;
    tipo: "Consulta" | "Retorno" | "Exame";
    status: "confirmado" | "aguardando" | "atrasado" | "cancelado";
}

export const pacientes: Paciente[] = [
    {
        id: 1,
        nome: "João Silva",
        telefone: "(11) 98765-4321",
        email: "joao.silva@email.com",
        cpf: "123.456.789-00",
        dataNascimento: "1985-03-15",
        ultimaConsulta: "2025-12-10",
        nomePai: "",
        nomeMae: "",
        enderecoCompleto: "",
        rg: "",
        observacoes: "Miopia leve. Usa óculos para leitura.",
    },
    {
        id: 2,
        nome: "Maria Santos",
        telefone: "(11) 91234-5678",
        email: "maria.santos@email.com",
        cpf: "987.654.321-00",
        dataNascimento: "1990-07-22",
        ultimaConsulta: "2026-01-05",
        nomePai: "",
        nomeMae: "",
        enderecoCompleto: "",
        rg: "",
        observacoes: "Astigmatismo. Preferência por armações finas.",
    },
    {
        id: 3,
        nome: "Carlos Oliveira",
        telefone: "(11) 99876-5432",
        email: "carlos.o@email.com",
        cpf: "456.789.123-00",
        dataNascimento: "1978-11-30",
        ultimaConsulta: "2025-11-20",
        nomePai: "",
        nomeMae: "",
        enderecoCompleto: "",
        rg: "",
        observacoes: "Hipermetropia. Precisa de lentes progressivas.",
    },
    {
        id: 4,
        nome: "Ana Costa",
        telefone: "(11) 92345-6789",
        email: "ana.costa@email.com",
        cpf: "321.654.987-00",
        dataNascimento: "1995-01-08",
        ultimaConsulta: "2026-01-10",
        nomePai: "",
        nomeMae: "",
        enderecoCompleto: "",
        rg: "",
        observacoes: "Primeira consulta. Dores de cabeça frequentes.",
    },
    {
        id: 5,
        nome: "Pedro Almeida",
        telefone: "(11) 93456-7890",
        email: "pedro.almeida@email.com",
        cpf: "654.321.987-00",
        dataNascimento: "1982-09-14",
        ultimaConsulta: "2025-10-15",
        nomePai: "",
        nomeMae: "",
        enderecoCompleto: "",
        rg: "",
        observacoes: "Glaucoma em acompanhamento.",
    },
    {
        id: 6,
        nome: "Fernanda Lima",
        telefone: "(11) 94567-8901",
        email: "fernanda.lima@email.com",
        cpf: "789.123.456-00",
        dataNascimento: "1988-04-25",
        ultimaConsulta: "2026-01-08",
        nomePai: "",
        nomeMae: "",
        enderecoCompleto: "",
        rg: "",
        observacoes: "Ceratocone. Usa lentes de contato especiais.",
    },
];

export const agendaHoje: Consulta[] = [
    {
        id: 1,
        empresaId: 1,
        data: "2026-01-21",
        hora: "08:00",
        pacienteId: 1,
        pacienteNome: "João Silva",
        tipo: "Consulta",
        status: "confirmado",
    },
    {
        id: 2,
        empresaId: 1,
        data: "2026-01-21",
        hora: "08:30",
        pacienteId: 2,
        pacienteNome: "Maria Santos",
        tipo: "Retorno",
        status: "confirmado",
    },
    {
        id: 3,
        empresaId: 1,
        data: "2026-01-21",
        hora: "09:00",
        pacienteId: 3,
        pacienteNome: "Carlos Oliveira",
        tipo: "Exame",
        status: "aguardando",
    },
    {
        id: 4,
        empresaId: 2,
        data: "2026-01-21",
        hora: "09:30",
        pacienteId: 4,
        pacienteNome: "Ana Costa",
        tipo: "Consulta",
        status: "aguardando",
    },
    {
        id: 5,
        empresaId: 2,
        data: "2026-01-21",
        hora: "10:00",
        pacienteId: 5,
        pacienteNome: "Pedro Almeida",
        tipo: "Retorno",
        status: "atrasado",
    },
    {
        id: 6,
        empresaId: 1,
        data: "2026-01-21",
        hora: "10:30",
        pacienteId: 6,
        pacienteNome: "Fernanda Lima",
        tipo: "Exame",
        status: "confirmado",
    },
    {
        id: 7,
        empresaId: 2,
        data: "2026-01-21",
        hora: "11:00",
        pacienteId: 1,
        pacienteNome: "João Silva",
        tipo: "Retorno",
        status: "aguardando",
    },
    {
        id: 8,
        empresaId: 1,
        data: "2026-01-21",
        hora: "11:30",
        pacienteId: 2,
        pacienteNome: "Maria Santos",
        tipo: "Consulta",
        status: "confirmado",
    },
];

// Estatísticas calculadas
export const getEstatisticas = () => {
    const confirmadas = agendaHoje.filter((c) => c.status === "confirmado").length;
    const aguardando = agendaHoje.filter((c) => c.status === "aguardando").length;
    const atrasadas = agendaHoje.filter((c) => c.status === "atrasado").length;

    return { confirmadas, aguardando, atrasadas };
};

// Próximos pacientes (próximos 3)
export const getProximosPacientes = () => {
    return agendaHoje
        .filter((c) => c.status !== "cancelado")
        .slice(0, 3);
};
