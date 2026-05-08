// Tipos do sistema Ótica Vision
// Migrados de @/data/mockData.ts para local definitivo

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
