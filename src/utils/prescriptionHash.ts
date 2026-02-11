"use client";

export interface PrescriptionHashData {
    pacienteNome: string;
    pacienteCpf?: string;
    pacienteNascimento?: string;
    olhoDireitoEsferico: string;
    olhoDireitoCilindrico: string;
    olhoDireitoEixo: string;
    olhoDireitoAdicao: string;
    olhoDireitoDnp: string;
    olhoEsquerdoEsferico: string;
    olhoEsquerdoCilindrico: string;
    olhoEsquerdoEixo: string;
    olhoEsquerdoAdicao: string;
    olhoEsquerdoDnp: string;
    pertoOdEsferico?: string;
    pertoOdCilindrico?: string;
    pertoOdEixo?: string;
    pertoOdAdicao?: string;
    pertoOdDnp?: string;
    pertoOeEsferico?: string;
    pertoOeCilindrico?: string;
    pertoOeEixo?: string;
    pertoOeAdicao?: string;
    pertoOeDnp?: string;
    tipoLente: string;
    dataEmissao: string;
    timestampUnix: number;
}

function normalizeValue(value: string | undefined): string {
    return (value || "").trim().toLowerCase();
}

function buildDeterministicString(data: PrescriptionHashData): string {
    const parts = [
        normalizeValue(data.pacienteNome),
        normalizeValue(data.pacienteCpf),
        normalizeValue(data.pacienteNascimento),
        normalizeValue(data.olhoDireitoEsferico),
        normalizeValue(data.olhoDireitoCilindrico),
        normalizeValue(data.olhoDireitoEixo),
        normalizeValue(data.olhoDireitoAdicao),
        normalizeValue(data.olhoDireitoDnp),
        normalizeValue(data.olhoEsquerdoEsferico),
        normalizeValue(data.olhoEsquerdoCilindrico),
        normalizeValue(data.olhoEsquerdoEixo),
        normalizeValue(data.olhoEsquerdoAdicao),
        normalizeValue(data.olhoEsquerdoDnp),
        normalizeValue(data.pertoOdEsferico),
        normalizeValue(data.pertoOdCilindrico),
        normalizeValue(data.pertoOdEixo),
        normalizeValue(data.pertoOdAdicao),
        normalizeValue(data.pertoOdDnp),
        normalizeValue(data.pertoOeEsferico),
        normalizeValue(data.pertoOeCilindrico),
        normalizeValue(data.pertoOeEixo),
        normalizeValue(data.pertoOeAdicao),
        normalizeValue(data.pertoOeDnp),
        normalizeValue(data.tipoLente),
        normalizeValue(data.dataEmissao),
        String(data.timestampUnix),
    ];

    return parts.join("|");
}

export async function generatePrescriptionHash(data: PrescriptionHashData): Promise<string> {
    const input = buildDeterministicString(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildHashData(params: {
    paciente: { nome: string; cpf?: string; dataNascimento?: string };
    exame: {
        olhoDireito: { esferico: string; cilindrico: string; eixo: string; adicao: string; dnp: string };
        olhoEsquerdo: { esferico: string; cilindrico: string; eixo: string; adicao: string; dnp: string };
    };
    examePerto?: {
        olhoDireito: { esferico: string; cilindrico: string; eixo: string; adicao: string; dnp: string };
        olhoEsquerdo: { esferico: string; cilindrico: string; eixo: string; adicao: string; dnp: string };
    };
    tipoLente: string;
}): PrescriptionHashData {
    const now = new Date();

    return {
        pacienteNome: params.paciente.nome,
        pacienteCpf: params.paciente.cpf,
        pacienteNascimento: params.paciente.dataNascimento,
        olhoDireitoEsferico: params.exame.olhoDireito.esferico,
        olhoDireitoCilindrico: params.exame.olhoDireito.cilindrico,
        olhoDireitoEixo: params.exame.olhoDireito.eixo,
        olhoDireitoAdicao: params.exame.olhoDireito.adicao,
        olhoDireitoDnp: params.exame.olhoDireito.dnp,
        olhoEsquerdoEsferico: params.exame.olhoEsquerdo.esferico,
        olhoEsquerdoCilindrico: params.exame.olhoEsquerdo.cilindrico,
        olhoEsquerdoEixo: params.exame.olhoEsquerdo.eixo,
        olhoEsquerdoAdicao: params.exame.olhoEsquerdo.adicao,
        olhoEsquerdoDnp: params.exame.olhoEsquerdo.dnp,
        pertoOdEsferico: params.examePerto?.olhoDireito.esferico,
        pertoOdCilindrico: params.examePerto?.olhoDireito.cilindrico,
        pertoOdEixo: params.examePerto?.olhoDireito.eixo,
        pertoOdAdicao: params.examePerto?.olhoDireito.adicao,
        pertoOdDnp: params.examePerto?.olhoDireito.dnp,
        pertoOeEsferico: params.examePerto?.olhoEsquerdo.esferico,
        pertoOeCilindrico: params.examePerto?.olhoEsquerdo.cilindrico,
        pertoOeEixo: params.examePerto?.olhoEsquerdo.eixo,
        pertoOeAdicao: params.examePerto?.olhoEsquerdo.adicao,
        pertoOeDnp: params.examePerto?.olhoEsquerdo.dnp,
        tipoLente: params.tipoLente,
        dataEmissao: now.toISOString().split("T")[0],
        timestampUnix: Math.floor(now.getTime() / 1000),
    };
}
