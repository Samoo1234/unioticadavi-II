"use client";

import { useState } from "react";
import { Saida, FormaPagamento, formasPagamento, getDataAtual, getHoraAtual } from "@/data/financeiroData";
import { formatarMoeda, parseMoeda } from "@/utils/monetary";
import Panel from "../clinica/Panel";

interface ExitListProps {
    saidas: Saida[];
    caixaAberto: boolean;
    onAddSaida: (saida: Omit<Saida, "id">) => void;
}

export default function ExitList({ saidas, caixaAberto, onAddSaida }: ExitListProps) {
    const [mostrarForm, setMostrarForm] = useState(false);
    const [novaSaida, setNovaSaida] = useState({
        motivo: "Despesa" as Saida["motivo"],
        descricao: "",
        formaPagamento: "Dinheiro" as FormaPagamento,
        valor: 0,
    });

    const totalSaidas = saidas.reduce((acc, s) => acc + s.valor, 0);

    const handleSubmit = () => {
        if (!novaSaida.descricao || !novaSaida.valor) return;

        onAddSaida({
            data: getDataAtual(),
            hora: getHoraAtual(),
            motivo: novaSaida.motivo,
            descricao: novaSaida.descricao,
            formaPagamento: novaSaida.formaPagamento,
            valor: novaSaida.valor,
        });

        setNovaSaida({
            motivo: "Despesa",
            descricao: "",
            formaPagamento: "Dinheiro",
            valor: 0,
        });
        setMostrarForm(false);
    };

    return (
        <Panel
            title="SAÍDAS"
            subtitle={`${saidas.length} lançamentos`}
            className="h-full"
        >
            <div className="flex flex-col h-full">
                {/* Total */}
                <div className="border-b border-gray-700 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">TOTAL</span>
                    <span className="text-lg font-mono font-bold text-red-500">
                        - R$ {formatarMoeda(totalSaidas)}
                    </span>
                </div>

                {/* Lista de saídas */}
                <div className="flex-1 overflow-auto divide-y divide-gray-800/50">
                    {saidas.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            Nenhuma saída registrada
                        </div>
                    ) : (
                        saidas.map((saida) => (
                            <div key={saida.id} className="px-4 py-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-gray-500">
                                                {saida.hora}
                                            </span>
                                            <span className="text-xs text-gray-600">•</span>
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${saida.motivo === 'Sangria' ? 'bg-orange-900/50 text-orange-400' :
                                                    saida.motivo === 'Fornecedor' ? 'bg-indigo-900/50 text-indigo-400' :
                                                        'bg-gray-800 text-gray-400'
                                                }`}>
                                                {saida.motivo}
                                            </span>
                                        </div>
                                        <div className="text-sm text-white mt-1">
                                            {saida.descricao}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {saida.formaPagamento}
                                        </div>
                                    </div>
                                    <div className="text-sm font-mono font-medium text-red-500">
                                        - R$ {formatarMoeda(saida.valor)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Formulário inline */}
                {mostrarForm && caixaAberto && (
                    <div className="border-t border-gray-700 p-4 space-y-3">
                        <div className="text-xs font-bold text-gray-400 mb-2">NOVA SAÍDA</div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-500">MOTIVO</label>
                                <select
                                    value={novaSaida.motivo}
                                    onChange={(e) => setNovaSaida({ ...novaSaida, motivo: e.target.value as Saida["motivo"] })}
                                    className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                >
                                    <option value="Despesa">Despesa</option>
                                    <option value="Fornecedor">Fornecedor</option>
                                    <option value="Sangria">Sangria</option>
                                    <option value="Ajuste">Ajuste</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">PAGAMENTO</label>
                                <select
                                    value={novaSaida.formaPagamento}
                                    onChange={(e) => setNovaSaida({ ...novaSaida, formaPagamento: e.target.value as FormaPagamento })}
                                    className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                >
                                    {formasPagamento.filter(f => f.ativo).map((f) => (
                                        <option key={f.id} value={f.nome}>{f.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">DESCRIÇÃO</label>
                            <input
                                type="text"
                                value={novaSaida.descricao}
                                onChange={(e) => setNovaSaida({ ...novaSaida, descricao: e.target.value })}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                placeholder="Descrição da saída..."
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">VALOR (R$)</label>
                            <input
                                type="text"
                                value={formatarMoeda(novaSaida.valor)}
                                onChange={(e) => setNovaSaida({ ...novaSaida, valor: parseMoeda(e.target.value) })}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none text-right font-mono"
                                placeholder="0,00"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSubmit}
                                className="flex-1 px-3 py-1.5 bg-red-700 border border-red-600 text-xs font-medium text-white hover:bg-red-600"
                            >
                                CONFIRMAR
                            </button>
                            <button
                                onClick={() => setMostrarForm(false)}
                                className="px-3 py-1.5 bg-gray-800 border border-gray-600 text-xs font-medium text-white hover:bg-gray-700"
                            >
                                CANCELAR
                            </button>
                        </div>
                    </div>
                )}

                {/* Botão adicionar */}
                {!mostrarForm && (
                    <div className="border-t border-gray-700 p-4">
                        <button
                            onClick={() => setMostrarForm(true)}
                            disabled={!caixaAberto}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            + ADICIONAR SAÍDA
                        </button>
                    </div>
                )}
            </div>
        </Panel>
    );
}
