"use client";

import MainLayout from "@/components/MainLayout";
import EntryList from "@/components/financeiro/EntryList";
import ExitList from "@/components/financeiro/ExitList";
import CashSummary from "@/components/financeiro/CashSummary";
import { useFinanceiro } from "@/hooks/useFinanceiro";

export default function FinanceiroPage() {
    const {
        profile,
        dataSelecionada, setDataSelecionada,
        entradas, saidas, caixa,
        dataHora, carregando, mensagem,
        unidadeSelecionada, setUnidadeSelecionada,
        listaEmpresas,
        totalFaturamento, totalRecebido, totaisPorEmpresa,
        handleAddEntrada, handleAddSaida, handleAbrirCaixa, handleFecharCaixa,
        handleImprimirRelatorio, handleImprimirRelatorioUnidade,
        isAberto
    } = useFinanceiro();

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header do Financeiro */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div>
                                <div className="text-xs text-gray-500">MÓDULO</div>
                                <div className="text-lg font-bold text-white">FINANCEIRO</div>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>

                            {/* Seletores de Filtro */}
                            <div className="flex items-center gap-4">
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">UNIDADE</div>
                                    <select
                                        value={unidadeSelecionada}
                                        disabled={!!profile?.unit_id}
                                        onChange={(e) => setUnidadeSelecionada(e.target.value)}
                                        className={`bg-transparent border-none text-sm font-bold text-white p-0 focus:outline-none transition-all ${profile?.unit_id ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:text-green-500'}`}
                                    >
                                        {!profile?.unit_id && <option value="geral" className="bg-gray-900 text-white">TODAS AS LOJAS</option>}
                                        {listaEmpresas.map(emp => (
                                            <option key={emp.id} value={emp.id} className="bg-gray-900 text-white">{emp.nome_fantasia.toUpperCase()}{emp.cidade ? ` - ${emp.cidade.toUpperCase()}` : ''}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="h-8 w-px bg-gray-800"></div>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">DATA EXIBIDA</div>
                                    <input
                                        type="date"
                                        value={dataSelecionada}
                                        onChange={(e) => setDataSelecionada(e.target.value)}
                                        className="bg-transparent border-none text-sm font-bold text-white p-0 focus:outline-none cursor-pointer hover:text-green-500 transition-all scheme-dark"
                                    />
                                </div>
                            </div>

                            <div className="h-8 w-px bg-gray-700"></div>
                            <div>
                                <div className="text-xs text-gray-500">CAIXA</div>
                                <div className={`text-sm font-medium ${isAberto ? "text-green-500" : "text-red-500"}`}>
                                    {isAberto ? "ABERTO" : "FECHADO"}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-xs text-gray-500">DATA/HORA ATUAL</div>
                                <div className="text-sm font-mono text-white">{dataHora}</div>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500">OPERADOR</div>
                                <div className="text-sm text-white">ADMIN</div>
                            </div>
                        </div>
                    </div>

                    {/* Mensagem de feedback */}
                    {mensagem && (
                        <div className={`mt-4 px-4 py-2 text-sm font-medium ${mensagem.tipo === "sucesso"
                                ? "bg-green-900/50 border border-green-700 text-green-400"
                                : mensagem.tipo === "erro"
                                    ? "bg-red-900/50 border border-red-700 text-red-400"
                                    : "bg-yellow-900/50 border border-yellow-700 text-yellow-400"
                            }`}>
                            {mensagem.texto}
                        </div>
                    )}
                </div>

                {/* Layout 3 Colunas */}
                <div className={`flex-1 grid grid-cols-12 gap-4 min-h-0 ${carregando ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-300 relative`}>
                    {carregando && (
                        <div className="absolute inset-0 flex items-center justify-center z-50">
                            <div className="bg-gray-900/80 px-6 py-3 border border-gray-700 rounded shadow-xl">
                                <div className="text-sm font-bold text-white flex items-center gap-3">
                                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent animate-spin rounded-full"></div>
                                    CARREGANDO DADOS...
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Coluna 1 - Entradas (Esquerda) */}
                    <div className="col-span-4">
                        <EntryList
                            entradas={entradas}
                            caixaAberto={isAberto}
                            onAddEntrada={handleAddEntrada}
                        />
                    </div>

                    {/* Coluna 2 - Caixa do Dia (Centro - Foco Principal) */}
                    <div className="col-span-4">
                        <CashSummary
                            caixa={caixa}
                            onAbrirCaixa={handleAbrirCaixa}
                            onFecharCaixa={handleFecharCaixa}
                            totalFaturamento={totalFaturamento}
                            totalRecebido={totalRecebido}
                            totaisPorEmpresa={totaisPorEmpresa}
                            listaEmpresas={listaEmpresas}
                            onImprimirRelatorio={handleImprimirRelatorio}
                            onImprimirRelatorioUnidade={handleImprimirRelatorioUnidade}
                        />
                    </div>

                    {/* Coluna 3 - Saídas (Direita) */}
                    <div className="col-span-4">
                        <ExitList
                            saidas={saidas}
                            caixaAberto={isAberto}
                            onAddSaida={handleAddSaida}
                        />
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
