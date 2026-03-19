"use client";

import MainLayout from "@/components/MainLayout";
import PrescriptionBox from "@/components/vendas/PrescriptionBox";
import SaleForm from "@/components/vendas/SaleForm";
import StockList from "@/components/vendas/StockList";
import { HistoricoVendas } from "@/components/vendas/HistoricoVendas";
import { useVendas } from "@/hooks/useVendas";

export default function VendasPage() {
    const {
        profile,
        view, setView,
        receitaSelecionada, setReceitaSelecionada,
        venda, setVenda,
        estoqueLentes, estoqueArmacoes,
        receitasDb, empresas, empresaSelecionada, setEmpresaSelecionada,
        vendaRealizada, dataHora, caixaStatus, mensagem,
        carregando, vendasFiltradas,
        filtroCliente, setFiltroCliente, filtroDataInicio, setFiltroDataInicio, filtroDataFim, setFiltroDataFim,
        baixandoId, setBaixandoId, baixaValor, setBaixaValor, baixaForma, setBaixaForma,
        handleFinalizarVenda, handleCancelarVenda, handleAddLente, handleAddArmacao,
        handleCarregarNaVenda, handleBaixarPagamento, handleGerarTSO, handleGerarCarne, handleEmitirNota
    } = useVendas();

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header da Venda - Contexto do Atendimento */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div>
                                <div className="text-xs text-gray-500">MÓDULO</div>
                                <div className="text-lg font-bold text-white uppercase tracking-tighter">Vendas</div>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div className="flex bg-gray-900 border border-gray-800 p-0.5 rounded">
                                <button
                                    onClick={() => setView("pdv")}
                                    className={`px-4 py-1.5 text-xs font-bold transition-all ${view === "pdv" ? "bg-gray-800 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
                                >
                                    LANÇAR VENDA
                                </button>
                                <button
                                    onClick={() => setView("historico")}
                                    className={`px-4 py-1.5 text-xs font-bold transition-all ${view === "historico" ? "bg-gray-800 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
                                >
                                    HISTÓRICO
                                </button>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">UNIDADE</div>
                                <select
                                    value={empresaSelecionada?.id || ""}
                                    disabled={!!profile?.unit_id}
                                    onChange={(e) => {
                                        const emp = empresas.find(em => em.id === Number(e.target.value));
                                        if (emp) setEmpresaSelecionada(emp);
                                    }}
                                    className={`bg-transparent border-none text-sm font-bold text-white p-0 focus:outline-none transition-all ${profile?.unit_id ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:text-green-500'}`}
                                >
                                    {empresas.map(emp => (
                                        <option key={emp.id} value={emp.id} className="bg-gray-900 text-white">{emp.nome_fantasia}{emp.cidade ? ` - ${emp.cidade}` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div>
                                <div className="text-xs text-gray-500">CAIXA</div>
                                <div className={`text-sm font-medium ${caixaStatus === "aberto" ? "text-green-500" : "text-red-500"}`}>
                                    {caixaStatus.toUpperCase()}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {view === "pdv" && venda.pacienteNome && (
                                <div className="mr-4">
                                    <div className="text-[10px] text-gray-500 uppercase">CLIENTE EM ATENDIMENTO</div>
                                    <div className="text-sm font-bold text-white">{venda.pacienteNome}</div>
                                </div>
                            )}
                            {vendaRealizada && view === "pdv" && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleGerarTSO()}
                                        className="px-4 py-1.5 bg-gray-800 border border-gray-700 text-xs font-bold text-gray-200 hover:bg-gray-700 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                        GERAR TSO
                                    </button>
                                    {vendaRealizada.venda.formaPagamento === "Parcelado" && (
                                        <button
                                            onClick={() => handleGerarCarne()}
                                            className="px-4 py-1.5 bg-gray-800 border border-gray-700 text-xs font-bold text-gray-200 hover:bg-gray-700 hover:text-white transition-all flex items-center gap-2"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                            GERAR CARNÊ
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEmitirNota(vendaRealizada.vendaId, 65)}
                                        className="px-4 py-1.5 bg-green-900 border border-green-700 text-xs font-bold text-white hover:bg-green-700 transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                        EMITIR CUPOM (NFC-e)
                                    </button>
                                    <button
                                        onClick={() => handleEmitirNota(vendaRealizada.vendaId, 55)}
                                        className="px-4 py-1.5 bg-blue-900 border border-blue-700 text-xs font-bold text-white hover:bg-blue-700 transition-all flex items-center gap-2"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-white opacity-50"></span>
                                        EMITIR NOTA (NF-e)
                                    </button>
                                </div>
                            )}
                            <div className="text-right">
                                <div className="text-xs text-gray-500">DATA/HORA</div>
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
                            : "bg-red-900/50 border border-red-700 text-red-400"
                            }`}>
                            {mensagem.texto}
                        </div>
                    )}
                </div>

                {/* Conteúdo dinâmico baseado na view */}
                {view === "pdv" ? (
                    <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
                        {/* Coluna 1 - Receitas (Esquerda) */}
                        <div className="col-span-3">
                            <PrescriptionBox
                                receitas={receitasDb}
                                receitaSelecionada={receitaSelecionada}
                                onSelectReceita={setReceitaSelecionada}
                                onCarregarNaVenda={handleCarregarNaVenda}
                            />
                        </div>

                        {/* Coluna 2 - Venda (Centro - Foco Principal) */}
                        <div className="col-span-6">
                            <SaleForm
                                venda={venda}
                                receita={receitaSelecionada}
                                onUpdateVenda={setVenda}
                                onFinalizarVenda={handleFinalizarVenda}
                                onCancelarVenda={handleCancelarVenda}
                            />
                        </div>

                        {/* Coluna 3 - Estoque (Direita) */}
                        <div className="col-span-3">
                            <StockList
                                lentes={estoqueLentes}
                                armacoes={estoqueArmacoes}
                                onAddLente={handleAddLente}
                                onAddArmacao={handleAddArmacao}
                            />
                        </div>
                    </div>
                ) : (
                    <HistoricoVendas
                        vendasFiltradas={vendasFiltradas}
                        filtroCliente={filtroCliente} setFiltroCliente={setFiltroCliente}
                        filtroDataInicio={filtroDataInicio} setFiltroDataInicio={setFiltroDataInicio}
                        filtroDataFim={filtroDataFim} setFiltroDataFim={setFiltroDataFim}
                        baixandoId={baixandoId} setBaixandoId={setBaixandoId}
                        baixaValor={baixaValor} setBaixaValor={setBaixaValor}
                        baixaForma={baixaForma} setBaixaForma={setBaixaForma}
                        handleBaixarPagamento={handleBaixarPagamento}
                        handleGerarTSO={handleGerarTSO}
                        handleGerarCarne={handleGerarCarne}
                        handleEmitirNota={handleEmitirNota}
                        carregando={carregando}
                    />
                )}
            </div>
        </MainLayout>
    );
}
