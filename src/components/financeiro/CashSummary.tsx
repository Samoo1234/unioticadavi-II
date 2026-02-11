"use client";

import { useState } from "react";
import { Caixa, getHoraAtual } from "@/data/financeiroData";
import { formatarMoeda, parseMoeda } from "@/utils/monetary";
import Panel from "../clinica/Panel";

interface CashSummaryProps {
    caixa: Caixa;
    onAbrirCaixa: (saldoInicial: number) => void;
    onFecharCaixa: () => void;
    totalFaturamento?: number;
    totalRecebido?: number;
    totaisPorEmpresa?: Record<number, { faturamento: number, recebido: number, saídas: number }>;
    listaEmpresas?: { id: number, nome_fantasia: string }[];
    onImprimirRelatorio?: (tipo: "consolidado" | "parcial") => void;
    onImprimirRelatorioUnidade?: (empresaId: number) => void;
}

export default function CashSummary({
    caixa,
    onAbrirCaixa,
    onFecharCaixa,
    totalFaturamento,
    totalRecebido,
    totaisPorEmpresa,
    listaEmpresas,
    onImprimirRelatorio,
    onImprimirRelatorioUnidade
}: CashSummaryProps) {
    const [saldoInicial, setSaldoInicial] = useState(200);

    const handleAbrirCaixa = () => {
        onAbrirCaixa(saldoInicial);
    };

    const isAberto = caixa.status === "aberto";
    const saldoFinal = caixa.saldoInicial + caixa.totalEntradas - caixa.totalSaidas;

    return (
        <Panel title="CAIXA DO DIA" className="h-full">
            <div className="p-4 flex flex-col h-full">
                {/* Data e Status */}
                <div className="border-b border-gray-700 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-gray-500">DATA</div>
                            <div className="text-lg font-mono text-white">
                                {new Date(caixa.data + "T12:00:00").toLocaleDateString("pt-BR", {
                                    weekday: "long",
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric"
                                }).toUpperCase()}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500">STATUS</div>
                            <div className={`text-lg font-bold ${isAberto ? "text-green-500" : caixa.status === "consolidado" ? "text-blue-500" : "text-red-500"}`}>
                                {caixa.status === "consolidado" ? "CONSOLIDADO" : isAberto ? "ABERTO" : "FECHADO"}
                            </div>
                        </div>
                    </div>

                    {isAberto && caixa.horaAbertura && (
                        <div className="mt-2 text-xs text-gray-500">
                            Aberto às {caixa.horaAbertura} por {caixa.operador}
                        </div>
                    )}

                    {!isAberto && caixa.horaFechamento && (
                        <div className="mt-2 text-xs text-gray-500">
                            Fechado às {caixa.horaFechamento}
                        </div>
                    )}
                </div>

                {/* Resumo Financeiro */}
                <div className="flex-1">
                    <div className="space-y-4">
                        {/* Saldo Inicial */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
                            <span className="text-sm text-gray-400">Saldo Inicial</span>
                            <span className="text-lg font-mono text-white">
                                R$ {formatarMoeda(caixa.saldoInicial)}
                            </span>
                        </div>

                        {/* Total Entradas (Recebido) */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
                            <span className="text-sm text-gray-400">Total Recebido</span>
                            <span className="text-lg font-mono text-green-500">
                                + R$ {formatarMoeda(caixa.totalEntradas)}
                            </span>
                        </div>

                        {/* Total Saídas */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
                            <span className="text-sm text-gray-400">Total Saídas</span>
                            <span className="text-lg font-mono text-red-500">
                                - R$ {formatarMoeda(caixa.totalSaidas)}
                            </span>
                        </div>

                        {/* Saldo Final */}
                        <div className="flex items-center justify-between py-4 border-t-2 border-gray-700">
                            <span className="text-lg font-bold text-white">SALDO FINAL</span>
                            <span className={`text-2xl font-mono font-bold ${saldoFinal >= 0 ? "text-green-500" : "text-red-500"}`}>
                                R$ {formatarMoeda(saldoFinal)}
                            </span>
                        </div>
                    </div>

                    {/* Detalhamento por forma de pagamento */}
                    {isAberto && (
                        <div className="mt-6 pt-4 border-t border-gray-700">
                            <div className="text-xs font-bold text-gray-400 mb-3">RESUMO DO MOVIMENTO</div>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="bg-gray-800/50 p-3">
                                    <div className="text-gray-500">Faturamento Total</div>
                                    <div className="text-blue-400 font-mono text-lg mt-1">
                                        R$ {formatarMoeda(totalFaturamento || 0)}
                                    </div>
                                </div>
                                <div className="bg-gray-800/50 p-3">
                                    <div className="text-gray-500">Disp. em Caixa</div>
                                    <div className="text-green-500 font-mono text-lg mt-1">
                                        R$ {formatarMoeda(totalRecebido || 0)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Breakdown by unit (Consolidated View) */}
                    {caixa.status === "consolidado" && totaisPorEmpresa && (
                        <div className="mt-6 pt-4 border-t border-gray-700">
                            <div className="text-xs font-bold text-gray-400 mb-3 uppercase">Resumo por Unidade</div>
                            <div className="space-y-2 max-h-48 overflow-auto pr-2">
                                {Object.entries(totaisPorEmpresa).map(([eid, dados]) => {
                                    const empresa = listaEmpresas?.find(l => l.id === parseInt(eid));
                                    return (
                                        <div key={eid} className="bg-gray-800/30 p-2 border-l-2 border-green-600 relative group">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[10px] font-bold text-white uppercase truncate">
                                                    {empresa?.nome_fantasia || `Unidade ${eid}`}
                                                </div>
                                                <button
                                                    onClick={() => onImprimirRelatorioUnidade?.(parseInt(eid))}
                                                    className="opacity-0 group-hover:opacity-100 text-[10px] bg-gray-700 hover:bg-gray-600 px-1 rounded transition-opacity"
                                                    title="Imprimir Relatório Detalhado desta Unidade"
                                                >
                                                    🖨️
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 mt-1 font-mono text-[10px]">
                                                <div>
                                                    <span className="text-gray-500 block">FATUR.</span>
                                                    <span className="text-blue-400">R$ {formatarMoeda(dados.faturamento)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block">RECEB.</span>
                                                    <span className="text-green-500">R$ {formatarMoeda(dados.recebido)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500 block">SAÍDAS</span>
                                                    <span className="text-red-500">R$ {formatarMoeda(dados.saídas)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Ações do Caixa */}
                {caixa.status === "consolidado" ? (
                    <div className="space-y-3">
                        <div className="text-center p-4 bg-blue-900/20 border border-blue-800 rounded">
                            <p className="text-xs text-blue-400 font-bold">VISÃO GERAL DO GRUPO</p>
                            <p className="text-[10px] text-gray-500 mt-1">Selecione uma unidade específica para abrir ou fechar o caixa individual.</p>
                        </div>
                        <button
                            onClick={() => onImprimirRelatorio?.("consolidado")}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 text-sm font-bold text-white hover:bg-gray-700 flex items-center justify-center gap-2"
                        >
                            🖨️ GERAR RELATÓRIO CONSOLIDADO
                        </button>
                    </div>
                ) : !isAberto ? (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500">SALDO INICIAL (R$)</label>
                            <input
                                type="text"
                                value={formatarMoeda(saldoInicial)}
                                onChange={(e) => setSaldoInicial(parseMoeda(e.target.value))}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none text-right font-mono"
                                placeholder="0,00"
                            />
                        </div>
                        <button
                            onClick={handleAbrirCaixa}
                            className="w-full px-4 py-3 bg-green-700 border border-green-600 text-sm font-bold text-white hover:bg-green-600"
                        >
                            ABRIR CAIXA
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <button
                            onClick={onFecharCaixa}
                            className="w-full px-4 py-3 bg-red-700 border border-red-600 text-sm font-bold text-white hover:bg-red-600"
                        >
                            FECHAR CAIXA
                        </button>
                        <button
                            onClick={() => onImprimirRelatorio?.("parcial")}
                            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 text-xs font-bold text-white hover:bg-gray-700"
                        >
                            🖨️ IMPRIMIR PARCIAL
                        </button>
                    </div>
                )}
            </div>
        </Panel>
    );
}
