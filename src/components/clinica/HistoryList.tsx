import { HistoricoConsulta } from "@/data/clinicaData";
import Panel from "./Panel";

interface HistoryListProps {
    historico: HistoricoConsulta[];
    consultaSelecionada: HistoricoConsulta | null;
    onSelectConsulta: (consulta: HistoricoConsulta) => void;
}

function getTipoColor(tipo: HistoricoConsulta["tipo"]): string {
    switch (tipo) {
        case "Consulta":
            return "text-green-500";
        case "Retorno":
            return "text-yellow-500";
        case "Exame":
            return "text-white";
        case "Emergência":
            return "text-red-500";
        default:
            return "text-gray-400";
    }
}

export default function HistoryList({ historico, consultaSelecionada, onSelectConsulta }: HistoryListProps) {
    return (
        <Panel title="HISTÓRICO" subtitle={`${historico.length} registros`} className="h-full">
            <div className="divide-y divide-gray-800/50">
                {historico.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                        Nenhuma consulta anterior
                    </div>
                ) : (
                    historico.map((consulta) => {
                        const isSelected = consultaSelecionada?.id === consulta.id;
                        return (
                            <button
                                key={consulta.id}
                                onClick={() => onSelectConsulta(consulta)}
                                className={`w-full text-left px-4 py-3 ${isSelected ? "bg-gray-800" : "hover:bg-gray-800/50"
                                    }`}
                            >
                                {/* Data */}
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-mono text-white">
                                        {new Date(consulta.data).toLocaleDateString("pt-BR")}
                                    </span>
                                    <span className={`text-xs font-medium ${getTipoColor(consulta.tipo)}`}>
                                        {consulta.tipo.toUpperCase()}
                                    </span>
                                </div>

                                {/* Profissional */}
                                <div className="text-xs text-gray-500 mb-2">
                                    {consulta.profissional}
                                </div>

                                {/* Queixa resumida */}
                                <div className="text-xs text-gray-400 line-clamp-2">
                                    {consulta.queixaPrincipal}
                                </div>

                                {/* Indicador de receita */}
                                {consulta.receita && (
                                    <div className="mt-2 text-xs text-green-500">
                                        ● RECEITA EMITIDA
                                    </div>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </Panel>
    );
}
