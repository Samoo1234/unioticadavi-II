import { describe, it, expect } from "vitest";
import { generatePrescriptionHash, buildHashData } from "./prescriptionHash";

describe("prescriptionHash", () => {
    const mockParams = {
        paciente: {
            nome: "João da Silva",
            cpf: "123.456.789-00",
            dataNascimento: "1990-05-15",
        },
        exame: {
            olhoDireito: { esferico: "+2.00", cilindrico: "-0.75", eixo: "180", adicao: "", dnp: "32" },
            olhoEsquerdo: { esferico: "+1.75", cilindrico: "-0.50", eixo: "175", adicao: "", dnp: "31" },
        },
        tipoLente: "Monofocal",
    };

    it("should generate a 64-character hex hash", async () => {
        const data = buildHashData(mockParams);
        const hash = await generatePrescriptionHash(data);
        expect(hash).toHaveLength(64);
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should generate the same hash for the same input", async () => {
        const data1 = buildHashData(mockParams);
        const data2 = buildHashData(mockParams);

        // Force same timestamp so they match
        data2.dataEmissao = data1.dataEmissao;
        data2.timestampUnix = data1.timestampUnix;

        const hash1 = await generatePrescriptionHash(data1);
        const hash2 = await generatePrescriptionHash(data2);
        expect(hash1).toBe(hash2);
    });

    it("should generate different hashes for different inputs", async () => {
        const data1 = buildHashData(mockParams);
        const data2 = buildHashData({
            ...mockParams,
            paciente: { ...mockParams.paciente, nome: "Maria Oliveira" },
        });

        // Force same timestamp
        data2.dataEmissao = data1.dataEmissao;
        data2.timestampUnix = data1.timestampUnix;

        const hash1 = await generatePrescriptionHash(data1);
        const hash2 = await generatePrescriptionHash(data2);
        expect(hash1).not.toBe(hash2);
    });

    it("should handle bifocal prescriptions with near vision data", async () => {
        const bifocalParams = {
            ...mockParams,
            tipoLente: "Bifocal",
            examePerto: {
                olhoDireito: { esferico: "+3.50", cilindrico: "-0.75", eixo: "180", adicao: "+1.50", dnp: "30" },
                olhoEsquerdo: { esferico: "+3.25", cilindrico: "-0.50", eixo: "175", adicao: "+1.50", dnp: "29" },
            },
        };
        const data = buildHashData(bifocalParams);
        const hash = await generatePrescriptionHash(data);
        expect(hash).toHaveLength(64);
        expect(data.pertoOdEsferico).toBe("+3.50");
        expect(data.pertoOeEsferico).toBe("+3.25");
    });

    it("should normalize values (trim and lowercase)", async () => {
        const data1 = buildHashData(mockParams);
        const data2 = buildHashData({
            ...mockParams,
            paciente: { ...mockParams.paciente, nome: "  João da Silva  " },
        });

        data2.dataEmissao = data1.dataEmissao;
        data2.timestampUnix = data1.timestampUnix;

        const hash1 = await generatePrescriptionHash(data1);
        const hash2 = await generatePrescriptionHash(data2);
        expect(hash1).toBe(hash2);
    });
});
