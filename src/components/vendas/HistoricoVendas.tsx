"use client";

import { Venda, vendaVazia } from "@/data/vendasData";
import { formatarMoeda, parseMoeda } from "@/utils/monetary";

interface HistoricoVendasProps {
    vendasFiltradas: any[];
    filtroCliente: string;
    setFiltroCliente: (val: string) => void;
    filtroDataInicio: string;
    setFiltroDataInicio: (val: string) => void;
    filtroDataFim: string;
    setFiltroDataFim: (val: string) => void;
    baixandoId: string | null;
    setBaixandoId: (val: string | null) => void;
    baixaValor: number;
    setBaixaValor: (val: number) => void;
    baixaForma: string;
    setBaixaForma: (val: string) => void;
    handleBaixarPagamento: (vendaId: string, valor: number, forma: string) => void;
    handleGerarTSO: (data: { venda: Venda; receita: any; numeroVenda?: number }) => void;
    handleGerarCarne: (data: { venda: Venda; numeroVenda?: number }) => void;
    handleEmitirNota: (vendaId: string, modelo: 55 | 65) => void;
    carregando: boolean;
}

export function HistoricoVendas({
    vendasFiltradas,
    filtroCliente, setFiltroCliente,
    filtroDataInicio, setFiltroDataInicio,
    filtroDataFim, setFiltroDataFim,
    baixandoId, setBaixandoId,
    baixaValor, setBaixaValor,
    baixaForma, setBaixaForma,
    handleBaixarPagamento,
    handleGerarTSO,
    handleGerarCarne,
    handleEmitirNota,
    carregando
}: HistoricoVendasProps) {
    return (
        <div className="flex-1 bg-gray-900 border border-gray-800 flex flex-col min-h-0">
            {/* Filtros do Histórico */}
            <div className="p-4 border-b border-gray-800 flex items-center gap-4">
                <div className="flex-1">
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Buscar Cliente</label>
                    <input
                        type="text"
                        value={filtroCliente}
                        onChange={(e) => setFiltroCliente(e.target.value)}
                        placeholder="Nome do paciente..."
                        className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                </div>
                <div className="w-40">
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Início</label>
                    <input
                        type="date"
                        value={filtroDataInicio}
                        onChange={(e) => setFiltroDataInicio(e.target.value)}
                        className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-blue-500 focus:outline-none scheme-dark"
                    />
                </div>
                <div className="w-40">
                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Fim</label>
                    <input
                        type="date"
                        value={filtroDataFim}
                        onChange={(e) => setFiltroDataFim(e.target.value)}
                        className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-blue-500 focus:outline-none scheme-dark"
                    />
                </div>
                <div className="pt-5">
                    <button
                        onClick={() => {
                            setFiltroCliente("");
                            setFiltroDataInicio("");
                            setFiltroDataFim("");
                        }}
                        className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs font-bold hover:bg-gray-600 transition-all"
                    >
                        LIMPAR
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-800/50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Parcelas</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pagamento (Dar Baixa)</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Documentos</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {vendasFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">Nenhuma venda encontrada com os filtros atuais</td>
                            </tr>
                        ) : (
                            vendasFiltradas.map((v) => {
                                const totalPago = v.vendas_pagamentos?.reduce((acc: number, p: any) => acc + Number(p.valor), 0) || 0;
                                const saldoDevedor = v.total - totalPago;
                                const quitado = saldoDevedor <= 0.01;

                                return (
                                    <tr key={v.id} className="hover:bg-gray-800/20 transition-all">
                                        <td className="px-6 py-4 text-sm font-mono text-gray-400">
                                            {new Date(v.created_at).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-white uppercase">
                                            {v.pacientes?.nome || "Cliente Avulso"}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-green-500 font-bold whitespace-nowrap">
                                            R$ {v.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-300">
                                            {v.parcelas || 1}x {v.valor_parcela ? `de R$ ${Number(v.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ""}
                                        </td>
                                        <td className="px-6 py-4">
                                            {quitado ? (
                                                <span className="text-[10px] font-bold bg-green-900/30 text-green-500 px-2 py-1 rounded">QUITADO</span>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1.5 text-[10px] text-gray-500">R$</span>
                                                        <input
                                                            type="text"
                                                            value={baixandoId === v.id ? formatarMoeda(baixaValor) : ""}
                                                            placeholder={v.valor_parcela ? Number(v.valor_parcela).toFixed(2) : saldoDevedor.toFixed(2)}
                                                            className="w-24 pl-6 pr-2 py-1 bg-gray-800 border border-gray-700 text-xs text-white focus:border-green-500 focus:outline-none font-mono"
                                                            onChange={(e) => {
                                                                setBaixandoId(v.id);
                                                                setBaixaValor(parseMoeda(e.target.value));
                                                            }}
                                                        />
                                                    </div>
                                                    <select
                                                        className="bg-gray-800 border border-gray-700 text-[10px] text-white py-1 focus:outline-none"
                                                        value={baixaForma}
                                                        onChange={(e) => setBaixaForma(e.target.value)}
                                                    >
                                                        <option value="Dinheiro">DINHEIRO</option>
                                                        <option value="PIX">PIX</option>
                                                        <option value="Cartao Debito">DÉBITO</option>
                                                        <option value="Cartao Credito">CRÉDITO</option>
                                                    </select>
                                                    <button
                                                        onClick={() => handleBaixarPagamento(v.id, baixandoId === v.id ? baixaValor : (v.valor_parcela ? Number(v.valor_parcela) : saldoDevedor), baixaForma)}
                                                        disabled={carregando}
                                                        className={`p-1 border rounded transition-all ${carregando ? "bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed" : "bg-green-900/40 border-green-800 text-green-500 hover:bg-green-700 hover:text-white"}`}
                                                        title="Confirmar Baixa"
                                                    >
                                                        {carregando && baixandoId === v.id ? "..." : "✓"}
                                                    </button>
                                                </div>
                                            )}
                                            {!quitado && (
                                                <div className="mt-1 text-[10px] text-gray-500 italic">
                                                    Faltam R$ {saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        const vendaAdaptada: Venda = {
                                                            ...vendaVazia,
                                                            total: v.total,
                                                            pacienteNome: v.pacientes?.nome || "Cliente Avulso",
                                                            formaPagamento: v.forma_pagamento,
                                                            itens: v.vendas_itens.map((item: any) => ({
                                                                tipo: item.produtos?.tipo || "lente",
                                                                nome: item.produtos?.nome || "Produto",
                                                                precoTotal: item.preco_total
                                                            }))
                                                        };
                                                        handleGerarTSO({ venda: vendaAdaptada, receita: null, numeroVenda: v.numero_venda });
                                                    }}
                                                    className="px-3 py-1 bg-blue-900/30 border border-blue-800 text-blue-400 text-[10px] font-bold hover:bg-blue-800 hover:text-white transition-all uppercase"
                                                >
                                                    TSO
                                                </button>
                                                {v.forma_pagamento === "Parcelado" && (
                                                    <button
                                                        onClick={() => {
                                                            const vendaAdaptada: Venda = {
                                                                ...vendaVazia,
                                                                total: v.total,
                                                                pacienteNome: v.pacientes?.nome || "Cliente Avulso",
                                                                formaPagamento: "Parcelado",
                                                                parcelas: v.parcelas || 1
                                                            };
                                                            handleGerarCarne({ venda: vendaAdaptada, numeroVenda: v.numero_venda });
                                                        }}
                                                        className="px-3 py-1 bg-orange-900/30 border border-orange-800 text-orange-400 text-[10px] font-bold hover:bg-orange-800 hover:text-white transition-all uppercase"
                                                    >
                                                        CARNÊ
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEmitirNota(v.id, 65)}
                                                    className="px-2 py-0.5 bg-green-900/40 border border-green-800 text-green-500 text-[9px] font-bold hover:bg-green-700 hover:text-white transition-all uppercase"
                                                    title="Emitir Cupom Fiscal"
                                                >
                                                    NFC-e
                                                </button>
                                                <button
                                                    onClick={() => handleEmitirNota(v.id, 55)}
                                                    className="px-2 py-0.5 bg-blue-900/40 border border-blue-800 text-blue-400 text-[9px] font-bold hover:bg-blue-700 hover:text-white transition-all uppercase"
                                                    title="Emitir Nota Fiscal Completa"
                                                >
                                                    NF-e
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
