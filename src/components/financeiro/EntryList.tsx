"use client";

import { useState } from "react";
import { Entrada, FormaPagamento, formasPagamento, getDataAtual, getHoraAtual } from "@/data/financeiroData";
import { formatarMoeda, parseMoeda } from "@/utils/monetary";
import Panel from "../clinica/Panel";
import Link from "next/link";

interface EntryListProps {
    entradas: Entrada[];
    caixaAberto: boolean;
    onAddEntrada: (entrada: Omit<Entrada, "id">) => void;
}

export default function EntryList({ entradas, caixaAberto, onAddEntrada }: EntryListProps) {
    const [mostrarForm, setMostrarForm] = useState(false);
    const [novaEntrada, setNovaEntrada] = useState({
        origem: "Outro" as Entrada["origem"],
        descricao: "",
        formaPagamento: "Dinheiro" as FormaPagamento,
        valor: 0,
    });

    const totalEntradas = entradas.reduce((acc, e) => acc + e.valor, 0);

    const handleSubmit = () => {
        if (!novaEntrada.descricao || !novaEntrada.valor) return;

        onAddEntrada({
            data: getDataAtual(),
            hora: getHoraAtual(),
            origem: novaEntrada.origem,
            descricao: novaEntrada.descricao,
            formaPagamento: novaEntrada.formaPagamento,
            valor: novaEntrada.valor,
        });

        setNovaEntrada({
            origem: "Outro",
            descricao: "",
            formaPagamento: "Dinheiro",
            valor: 0,
        });
        setMostrarForm(false);
    };

    return (
        <Panel
            title="ENTRADAS"
            subtitle={`${entradas.length} lançamentos`}
            className="h-full"
        >
            <div className="flex flex-col h-full">
                {/* Total */}
                <div className="border-b border-gray-700 px-4 py-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500">TOTAL</span>
                    <span className="text-lg font-mono font-bold text-green-500">
                        + R$ {formatarMoeda(totalEntradas)}
                    </span>
                </div>

                {/* Lista de entradas */}
                <div className="flex-1 overflow-auto divide-y divide-gray-800/50">
                    {entradas.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            Nenhuma entrada registrada
                        </div>
                    ) : (
                        entradas.map((entrada) => (
                            <div key={entrada.id} className="px-4 py-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-gray-500">
                                                {entrada.hora}
                                            </span>
                                            <span className="text-xs text-gray-600">•</span>
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${entrada.origem === 'Venda' ? 'bg-blue-900/50 text-blue-400' :
                                                entrada.origem === 'Venda (A Prazo)' ? 'bg-amber-900/50 text-amber-400' :
                                                    entrada.origem === 'Recebimento' ? 'bg-green-900/50 text-green-400' :
                                                        entrada.origem === 'Agendamento' ? 'bg-purple-900/50 text-purple-400' :
                                                            'bg-gray-800 text-gray-400'
                                                }`}>
                                                {entrada.origem}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="text-sm text-white">
                                                {entrada.descricao}
                                            </div>
                                            {(entrada.vendaId) && (
                                                <Link
                                                    href={`/vendas?id=${entrada.vendaId}`}
                                                    className="w-5 h-5 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded transition-colors"
                                                    title="Ver Venda"
                                                >
                                                    🔗
                                                </Link>
                                            )}
                                        </div>
                                        {entrada.cliente && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                {entrada.cliente}
                                            </div>
                                        )}
                                        <div className="text-xs text-gray-600 mt-1">
                                            {entrada.formaPagamento}
                                        </div>
                                    </div>
                                    <div className="text-sm font-mono font-medium text-green-500">
                                        + R$ {formatarMoeda(entrada.valor)}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Formulário inline */}
                {mostrarForm && caixaAberto && (
                    <div className="border-t border-gray-700 p-4 space-y-3">
                        <div className="text-xs font-bold text-gray-400 mb-2">NOVA ENTRADA</div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-gray-500">ORIGEM</label>
                                <select
                                    value={novaEntrada.origem}
                                    onChange={(e) => setNovaEntrada({ ...novaEntrada, origem: e.target.value as Entrada["origem"] })}
                                    className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                >
                                    <option value="Suprimento">Suprimento</option>
                                    <option value="Ajuste">Ajuste</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">PAGAMENTO</label>
                                <select
                                    value={novaEntrada.formaPagamento}
                                    onChange={(e) => setNovaEntrada({ ...novaEntrada, formaPagamento: e.target.value as FormaPagamento })}
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
                                value={novaEntrada.descricao}
                                onChange={(e) => setNovaEntrada({ ...novaEntrada, descricao: e.target.value })}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                placeholder="Descrição da entrada..."
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">VALOR (R$)</label>
                            <input
                                type="text"
                                value={formatarMoeda(novaEntrada.valor)}
                                onChange={(e) => setNovaEntrada({ ...novaEntrada, valor: parseMoeda(e.target.value) })}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none text-right font-mono"
                                placeholder="0,00"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSubmit}
                                className="flex-1 px-3 py-1.5 bg-green-700 border border-green-600 text-xs font-medium text-white hover:bg-green-600"
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
                            + ADICIONAR ENTRADA
                        </button>
                    </div>
                )}
            </div>
        </Panel>
    );
}
