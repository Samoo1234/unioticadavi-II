"use client";

import { useState } from "react";
import { Lente, Armacao, StatusEstoque } from "@/data/vendasData";
import Panel from "../clinica/Panel";

interface StockListProps {
    lentes: Lente[];
    armacoes: Armacao[];
    onAddLente: (lente: Lente) => void;
    onAddArmacao: (armacao: Armacao) => void;
}

function getStatusColor(status: StatusEstoque): string {
    switch (status) {
        case "disponivel": return "text-green-500";
        case "baixo": return "text-yellow-500";
        case "critico": return "text-red-500";
    }
}

function getStatusBg(status: StatusEstoque): string {
    switch (status) {
        case "disponivel": return "bg-green-500/10";
        case "baixo": return "bg-yellow-500/10";
        case "critico": return "bg-red-500/10";
    }
}

type Tab = "lentes" | "armacoes";

export default function StockList({ lentes, armacoes, onAddLente, onAddArmacao }: StockListProps) {
    const [tab, setTab] = useState<Tab>("lentes");

    return (
        <Panel title="ESTOQUE" subtitle="Clique para adicionar à venda" className="h-full">
            <div className="flex flex-col h-full">
                {/* Tabs de navegação */}
                <div className="flex border-b border-gray-800">
                    <button
                        onClick={() => setTab("lentes")}
                        className={`flex-1 px-4 py-2 text-sm font-medium ${tab === "lentes"
                                ? "bg-gray-800 text-white border-b-2 border-green-500"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        LENTES ({lentes.length})
                    </button>
                    <button
                        onClick={() => setTab("armacoes")}
                        className={`flex-1 px-4 py-2 text-sm font-medium ${tab === "armacoes"
                                ? "bg-gray-800 text-white border-b-2 border-green-500"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        ARMAÇÕES ({armacoes.length})
                    </button>
                </div>

                {/* Lista de produtos */}
                <div className="flex-1 overflow-auto">
                    {tab === "lentes" ? (
                        <div className="divide-y divide-gray-800/50">
                            {lentes.map((lente) => (
                                <button
                                    key={lente.id}
                                    onClick={() => lente.status !== "critico" && onAddLente(lente)}
                                    disabled={lente.status === "critico"}
                                    className={`w-full text-left px-4 py-3 hover:bg-gray-800/50 disabled:opacity-50 disabled:cursor-not-allowed ${getStatusBg(lente.status)}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="text-sm text-white">{lente.nome}</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {lente.codigo} • {lente.marca} • {lente.material}
                                            </div>
                                        </div>
                                        <div className="text-right ml-3">
                                            <div className="text-sm text-white font-mono">
                                                R$ {lente.precoUnitario.toFixed(2)}
                                            </div>
                                            <div className={`text-xs font-medium ${getStatusColor(lente.status)}`}>
                                                {lente.quantidade} un
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-800/50">
                            {armacoes.map((armacao) => (
                                <button
                                    key={armacao.id}
                                    onClick={() => armacao.status !== "critico" && onAddArmacao(armacao)}
                                    disabled={armacao.status === "critico"}
                                    className={`w-full text-left px-4 py-3 hover:bg-gray-800/50 disabled:opacity-50 disabled:cursor-not-allowed ${getStatusBg(armacao.status)}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="text-sm text-white">{armacao.nome}</div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {armacao.codigo} • {armacao.modelo} • {armacao.cor}
                                            </div>
                                        </div>
                                        <div className="text-right ml-3">
                                            <div className="text-sm text-white font-mono">
                                                R$ {armacao.precoUnitario.toFixed(2)}
                                            </div>
                                            <div className={`text-xs font-medium ${getStatusColor(armacao.status)}`}>
                                                {armacao.quantidade} un
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Legenda de cores */}
                <div className="border-t border-gray-700 px-4 py-2">
                    <div className="flex items-center justify-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500"></span>
                            <span className="text-gray-500">Disponível</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-yellow-500"></span>
                            <span className="text-gray-500">Baixo</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-500"></span>
                            <span className="text-gray-500">Crítico</span>
                        </span>
                    </div>
                </div>
            </div>
        </Panel>
    );
}
