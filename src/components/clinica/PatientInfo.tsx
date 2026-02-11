import { PacienteClinico } from "@/data/clinicaData";
import Panel from "./Panel";

interface PatientInfoProps {
    paciente: PacienteClinico;
    onNovaConsulta: () => void;
}

interface InfoRowProps {
    label: string;
    value: string;
    status?: "normal" | "atencao" | "critico";
}

function InfoRow({ label, value, status }: InfoRowProps) {
    const statusColors = {
        normal: "text-green-500",
        atencao: "text-yellow-500",
        critico: "text-red-500",
    };

    const valueColor = status ? statusColors[status] : "text-white";

    return (
        <div className="py-2 border-b border-gray-800/50">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className={`text-sm ${valueColor}`}>{value || "—"}</div>
        </div>
    );
}

export default function PatientInfo({ paciente, onNovaConsulta }: PatientInfoProps) {
    const calcularIdade = (dataNasc: string): string => {
        const hoje = new Date();
        const nascimento = new Date(dataNasc);
        let idade = hoje.getFullYear() - nascimento.getFullYear();
        const mesAtual = hoje.getMonth();
        const mesNasc = nascimento.getMonth();
        if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < nascimento.getDate())) {
            idade--;
        }
        return `${idade} anos`;
    };

    return (
        <Panel title="PACIENTE" className="h-full">
            <div className="p-4">
                {/* Nome em destaque */}
                <div className="mb-4 pb-4 border-b border-gray-700">
                    <div className="text-lg font-bold text-white">{paciente.nome}</div>
                    <div className="text-sm text-gray-400 mt-1">{calcularIdade(paciente.dataNascimento)}</div>
                </div>

                {/* Informações */}
                <div className="space-y-0">
                    <InfoRow
                        label="DATA DE NASCIMENTO"
                        value={new Date(paciente.dataNascimento).toLocaleDateString("pt-BR")}
                    />
                    <InfoRow
                        label="TELEFONE"
                        value={paciente.telefone}
                    />
                    <InfoRow
                        label="DOCUMENTO"
                        value={paciente.documento}
                    />
                    <InfoRow
                        label="CONVÊNIO"
                        value={paciente.convenio || "PARTICULAR"}
                        status={paciente.convenio ? "normal" : undefined}
                    />
                </div>

                {/* Observações */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="text-xs text-gray-500 mb-2">OBSERVAÇÕES</div>
                    <div className="text-sm text-gray-300 leading-relaxed">
                        {paciente.observacoes || "Sem observações registradas."}
                    </div>
                </div>

                {/* Ação */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                    <button
                        onClick={onNovaConsulta}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-600 text-sm font-medium text-white hover:bg-gray-700 hover:border-gray-500"
                    >
                        NOVA CONSULTA
                    </button>
                </div>
            </div>
        </Panel>
    );
}
