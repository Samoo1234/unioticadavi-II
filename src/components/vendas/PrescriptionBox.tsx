import { ReceitaParaVenda } from "@/data/vendasData";
import Panel from "../clinica/Panel";

interface PrescriptionBoxProps {
    receitas: ReceitaParaVenda[];
    receitaSelecionada: ReceitaParaVenda | null;
    onSelectReceita: (receita: ReceitaParaVenda) => void;
    onCarregarNaVenda: () => void;
}

interface OlhoDisplayProps {
    label: string;
    olho: {
        esferico: string;
        cilindrico: string;
        eixo: string;
        adicao: string;
        dnp: string;
    };
    cor: string;
}

function OlhoDisplay({ label, olho, cor }: OlhoDisplayProps) {
    return (
        <div className="mb-3">
            <div className={`text-xs font-bold ${cor} mb-1`}>{label}</div>
            <div className="grid grid-cols-5 gap-1 text-xs">
                <div>
                    <span className="text-gray-500">ESF:</span>
                    <span className="text-white ml-1">{olho.esferico || "—"}</span>
                </div>
                <div>
                    <span className="text-gray-500">CIL:</span>
                    <span className="text-white ml-1">{olho.cilindrico || "—"}</span>
                </div>
                <div>
                    <span className="text-gray-500">EIXO:</span>
                    <span className="text-white ml-1">{olho.eixo || "—"}</span>
                </div>
                <div>
                    <span className="text-gray-500">AD:</span>
                    <span className="text-white ml-1">{olho.adicao || "—"}</span>
                </div>
                <div>
                    <span className="text-gray-500">DNP:</span>
                    <span className="text-white ml-1">{olho.dnp || "—"}</span>
                </div>
            </div>
        </div>
    );
}

export default function PrescriptionBox({
    receitas,
    receitaSelecionada,
    onSelectReceita,
    onCarregarNaVenda,
}: PrescriptionBoxProps) {
    return (
        <Panel title="RECEITAS" subtitle={`${receitas.length} disponíveis`} className="h-full">
            <div className="flex flex-col h-full">
                {/* Lista de receitas */}
                <div className="flex-1 overflow-auto divide-y divide-gray-800/50">
                    {receitas.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            Nenhuma receita disponível
                        </div>
                    ) : (
                        receitas.map((receita) => {
                            const isSelected = receitaSelecionada?.id === receita.id;
                            return (
                                <button
                                    key={receita.id}
                                    onClick={() => onSelectReceita(receita)}
                                    className={`w-full text-left px-4 py-3 ${isSelected ? "bg-gray-800" : "hover:bg-gray-800/50"
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-white">
                                            {receita.pacienteNome}
                                        </span>
                                        <span className="text-xs font-mono text-gray-400">
                                            {new Date(receita.dataConsulta).toLocaleDateString("pt-BR")}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2">
                                        {receita.profissional}
                                    </div>
                                    <div className="text-xs text-green-500">
                                        {receita.tipoLente}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Detalhes da receita selecionada */}
                {receitaSelecionada && (
                    <div className="border-t border-gray-700 p-4">
                        <div className="text-xs font-bold text-gray-400 mb-3">DETALHES DA RECEITA</div>

                        <OlhoDisplay
                            label="OD (OLHO DIREITO)"
                            olho={receitaSelecionada.olhoDireito}
                            cor="text-green-500"
                        />

                        <OlhoDisplay
                            label="OE (OLHO ESQUERDO)"
                            olho={receitaSelecionada.olhoEsquerdo}
                            cor="text-yellow-500"
                        />

                        {receitaSelecionada.observacoes && (
                            <div className="mt-3">
                                <div className="text-xs text-gray-500 mb-1">OBSERVAÇÕES</div>
                                <div className="text-xs text-gray-300">
                                    {receitaSelecionada.observacoes}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onCarregarNaVenda}
                            className="w-full mt-4 px-4 py-2 bg-green-700 border border-green-600 text-sm font-medium text-white hover:bg-green-600"
                        >
                            CARREGAR NA VENDA
                        </button>
                    </div>
                )}
            </div>
        </Panel>
    );
}
