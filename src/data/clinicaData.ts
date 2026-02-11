// Mock data para o módulo de clínica

export interface Prontuario {
    id: string;
    pacienteId: string;
    queixaPrincipal: string;
    anamnese: string;
    observacoesClinicas: string;
}

export interface ExameOcular {
    olho: "OD" | "OE";
    esferico: string;
    cilindrico: string;
    eixo: string;
    adicao: string;
    dnp: string;
}

export interface Exame {
    id: number;
    consultaId: number;
    data: string;
    olhoDireito: ExameOcular;
    olhoEsquerdo: ExameOcular;
}

export interface Receita {
    id: number;
    consultaId: number;
    data: string;
    olhoDireito: ExameOcular;
    olhoEsquerdo: ExameOcular;
    tipoLente: string;
    observacoes: string;
}

export interface HistoricoConsulta {
    id: string;
    pacienteId: string;
    data: string;
    tipo: "Consulta" | "Retorno" | "Exame" | "Emergência";
    profissional: string;
    queixaPrincipal: string;
    anamnese: string;
    observacoesClinicas: string;
    exame: Exame;
    receita?: Receita;
}

export interface PacienteClinico {
    id: string;
    nome: string;
    dataNascimento: string;
    telefone: string;
    documento: string;
    convenio?: string;
    observacoes: string;
}

// Paciente em atendimento atual
export const pacienteEmAtendimento: PacienteClinico = {
    id: "1",
    nome: "João Silva",
    dataNascimento: "1985-03-15",
    telefone: "(11) 98765-4321",
    documento: "123.456.789-00",
    convenio: "UNIMED",
    observacoes: "Miopia leve. Usa óculos para leitura. Preferência por armações metálicas.",
};

// Histórico de consultas do paciente
export const historicoConsultas: HistoricoConsulta[] = [
    {
        id: "1",
        pacienteId: "1",
        data: "2026-01-10",
        tipo: "Consulta",
        profissional: "Dr. Ricardo Souza",
        queixaPrincipal: "Dificuldade para leitura",
        anamnese: "Paciente relata dificuldade para leitura de textos pequenos há cerca de 6 meses. Piora ao final do dia. Sem dores de cabeça.",
        observacoesClinicas: "Presbiopia inicial. Recomendar lentes progressivas.",
        exame: {
            id: 1,
            consultaId: 1,
            data: "2026-01-10",
            olhoDireito: {
                olho: "OD",
                esferico: "-1.50",
                cilindrico: "-0.50",
                eixo: "180",
                adicao: "+1.00",
                dnp: "32",
            },
            olhoEsquerdo: {
                olho: "OE",
                esferico: "-1.25",
                cilindrico: "-0.75",
                eixo: "175",
                adicao: "+1.00",
                dnp: "31",
            },
        },
        receita: {
            id: 1,
            consultaId: 1,
            data: "2026-01-10",
            olhoDireito: {
                olho: "OD",
                esferico: "-1.50",
                cilindrico: "-0.50",
                eixo: "180",
                adicao: "+1.00",
                dnp: "32",
            },
            olhoEsquerdo: {
                olho: "OE",
                esferico: "-1.25",
                cilindrico: "-0.75",
                eixo: "175",
                adicao: "+1.00",
                dnp: "31",
            },
            tipoLente: "Progressiva",
            observacoes: "Lentes com tratamento antirreflexo. Armação a escolha do paciente.",
        },
    },
    {
        id: "2",
        pacienteId: "1",
        data: "2025-07-15",
        tipo: "Retorno",
        profissional: "Dra. Ana Paula",
        queixaPrincipal: "Revisão de grau",
        anamnese: "Paciente retorna para revisão semestral. Sem queixas atuais. Adaptou-se bem às lentes progressivas.",
        observacoesClinicas: "Grau estável. Manter prescrição.",
        exame: {
            id: 2,
            consultaId: 2,
            data: "2025-07-15",
            olhoDireito: {
                olho: "OD",
                esferico: "-1.50",
                cilindrico: "-0.50",
                eixo: "180",
                adicao: "+0.75",
                dnp: "32",
            },
            olhoEsquerdo: {
                olho: "OE",
                esferico: "-1.25",
                cilindrico: "-0.50",
                eixo: "170",
                adicao: "+0.75",
                dnp: "31",
            },
        },
    },
    {
        id: "3",
        pacienteId: "1",
        data: "2025-01-20",
        tipo: "Consulta",
        profissional: "Dr. Ricardo Souza",
        queixaPrincipal: "Dores de cabeça",
        anamnese: "Paciente apresenta dores de cabeça frequentes, principalmente após uso prolongado de computador. Trabalha 8h/dia em escritório.",
        observacoesClinicas: "Fadiga visual. Prescrever óculos com filtro de luz azul.",
        exame: {
            id: 3,
            consultaId: 3,
            data: "2025-01-20",
            olhoDireito: {
                olho: "OD",
                esferico: "-1.25",
                cilindrico: "-0.50",
                eixo: "180",
                adicao: "",
                dnp: "32",
            },
            olhoEsquerdo: {
                olho: "OE",
                esferico: "-1.00",
                cilindrico: "-0.50",
                eixo: "175",
                adicao: "",
                dnp: "31",
            },
        },
        receita: {
            id: 3,
            consultaId: 3,
            data: "2025-01-20",
            olhoDireito: {
                olho: "OD",
                esferico: "-1.25",
                cilindrico: "-0.50",
                eixo: "180",
                adicao: "",
                dnp: "32",
            },
            olhoEsquerdo: {
                olho: "OE",
                esferico: "-1.00",
                cilindrico: "-0.50",
                eixo: "175",
                adicao: "",
                dnp: "31",
            },
            tipoLente: "Monofocal",
            observacoes: "Lentes com filtro de luz azul para uso em computador.",
        },
    },
    {
        id: "4",
        pacienteId: "1",
        data: "2024-06-10",
        tipo: "Exame",
        profissional: "Dra. Ana Paula",
        queixaPrincipal: "Exame de rotina",
        anamnese: "Exame de rotina anual. Paciente sem queixas.",
        observacoesClinicas: "Pressão intraocular normal. Fundo de olho sem alterações.",
        exame: {
            id: 4,
            consultaId: 4,
            data: "2024-06-10",
            olhoDireito: {
                olho: "OD",
                esferico: "-1.00",
                cilindrico: "-0.25",
                eixo: "180",
                adicao: "",
                dnp: "32",
            },
            olhoEsquerdo: {
                olho: "OE",
                esferico: "-0.75",
                cilindrico: "-0.25",
                eixo: "180",
                adicao: "",
                dnp: "31",
            },
        },
    },
];

// Exame vazio para nova consulta
export const exameVazio: Exame = {
    id: 0,
    consultaId: 0,
    data: new Date().toISOString().split("T")[0],
    olhoDireito: {
        olho: "OD",
        esferico: "",
        cilindrico: "",
        eixo: "",
        adicao: "",
        dnp: "",
    },
    olhoEsquerdo: {
        olho: "OE",
        esferico: "",
        cilindrico: "",
        eixo: "",
        adicao: "",
        dnp: "",
    },
};

// Prontuário vazio para nova consulta
export const prontuarioVazio: Prontuario = {
    id: "",
    pacienteId: "",
    queixaPrincipal: "",
    anamnese: "",
    observacoesClinicas: "",
};
