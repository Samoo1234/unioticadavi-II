"use client";

import { useState, useEffect } from "react";
import {
    Venda,
    ItemVenda,
    ReceitaParaVenda,
    vendaVazia,
    Lente,
    Armacao
} from "@/data/vendasData";
import { formatarMoeda, parseMoeda } from "@/utils/monetary";
import Panel from "../clinica/Panel";

interface SaleFormProps {
    venda: Venda;
    receita: ReceitaParaVenda | null;
    onUpdateVenda: (venda: Venda) => void;
    onFinalizarVenda: () => void;
    onCancelarVenda: () => void;
}

type FormaPagamento = "Dinheiro" | "Cartao Debito" | "Cartao Credito" | "PIX" | "Parcelado";

export default function SaleForm({
    venda,
    receita,
    onUpdateVenda,
    onFinalizarVenda,
    onCancelarVenda,
}: SaleFormProps) {
    const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>(venda.formaPagamento);
    const [parcelas, setParcelas] = useState(venda.parcelas || 1);
    const [desconto, setDesconto] = useState(venda.desconto);

    useEffect(() => {
        const novoTotal = venda.subtotal - desconto;
        const novasParcelas = (formaPagamento === "Parcelado" || formaPagamento === "Cartao Credito") ? parcelas : undefined;

        if (novoTotal !== venda.total || formaPagamento !== venda.formaPagamento || novasParcelas !== venda.parcelas) {
            onUpdateVenda({
                ...venda,
                desconto: desconto,
                total: Math.max(0, novoTotal),
                formaPagamento,
                parcelas: novasParcelas,
            });
        }
    }, [desconto, formaPagamento, parcelas, venda.subtotal, venda.total, venda.formaPagamento, venda.parcelas]);

    const removerItem = (itemId: number) => {
        const novosItens = venda.itens.filter((i) => i.id !== itemId);
        const novoSubtotal = novosItens.reduce((acc, i) => acc + i.precoTotal, 0);
        onUpdateVenda({
            ...venda,
            itens: novosItens,
            subtotal: novoSubtotal,
            total: Math.max(0, novoSubtotal - desconto),
        });
    };

    const getStatusColor = (status: Venda["status"]) => {
        switch (status) {
            case "aberta": return "text-green-500";
            case "finalizada": return "text-white";
            case "cancelada": return "text-red-500";
        }
    };

    return (
        <Panel title="VENDA" subtitle={`Status: ${venda.status.toUpperCase()}`} className="h-full">
            <div className="p-4 flex flex-col h-full">
                {/* Dados do Cliente */}
                <div className="border-b border-gray-700 pb-4 mb-4">
                    <div className="text-xs font-bold text-gray-400 mb-2">CLIENTE</div>
                    {receita ? (
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-white">{receita.pacienteNome}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Receita de {new Date(receita.dataConsulta).toLocaleDateString("pt-BR")} • {receita.tipoLente}
                                </div>
                            </div>
                            <span className="text-xs text-green-500 font-medium">RECEITA VINCULADA</span>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500">
                            Nenhuma receita selecionada. Selecione uma receita ou adicione produtos manualmente.
                        </div>
                    )}
                </div>

                {/* Lista de Itens */}
                <div className="flex-1 overflow-auto mb-4">
                    <div className="text-xs font-bold text-gray-400 mb-2">ITENS DA VENDA</div>
                    {venda.itens.length === 0 ? (
                        <div className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-700">
                            Nenhum item adicionado. Clique em um produto no estoque →
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-gray-500 border-b border-gray-800">
                                    <th className="text-left py-2">PRODUTO</th>
                                    <th className="text-center py-2 w-16">QTD</th>
                                    <th className="text-right py-2 w-24">UNIT.</th>
                                    <th className="text-right py-2 w-24">TOTAL</th>
                                    <th className="w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {venda.itens.map((item) => (
                                    <tr key={item.id} className="border-b border-gray-800/50">
                                        <td className="py-2">
                                            <div className="text-white">{item.nome}</div>
                                            <div className="text-xs text-gray-500 uppercase">{item.tipo}</div>
                                        </td>
                                        <td className="text-center py-2 text-white">{item.quantidade}</td>
                                        <td className="text-right py-2 text-gray-400 font-mono">
                                            R$ {formatarMoeda(item.precoUnitario)}
                                        </td>
                                        <td className="text-right py-2 text-white font-mono">
                                            R$ {formatarMoeda(item.precoTotal)}
                                        </td>
                                        <td className="py-2">
                                            <button
                                                onClick={() => removerItem(item.id)}
                                                className="text-red-500 hover:text-red-400 text-xs px-2"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Totais e Pagamento */}
                <div className="border-t border-gray-700 pt-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Coluna Pagamento */}
                        <div>
                            <div className="text-xs font-bold text-gray-400 mb-2">FORMA DE PAGAMENTO</div>
                            <select
                                value={formaPagamento}
                                onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                            >
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Cartao Debito">Cartão Débito</option>
                                <option value="Cartao Credito">Cartão Crédito</option>
                                <option value="PIX">PIX</option>
                                <option value="Parcelado">Parcelado</option>
                            </select>

                            {(formaPagamento === "Parcelado" || formaPagamento === "Cartao Credito") && (
                                <div className="mt-2">
                                    <label className="text-xs text-gray-500">PARCELAS</label>
                                    <select
                                        value={parcelas}
                                        onChange={(e) => setParcelas(parseInt(e.target.value))}
                                        className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                    >
                                        {[1, 2, 3, 4, 5, 6, 10, 12].map((p) => (
                                            <option key={p} value={p}>
                                                {p}x {venda.total > 0 ? `de R$ ${formatarMoeda(venda.total / p)}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Coluna Totais */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Subtotal:</span>
                                <span className="text-white font-mono">R$ {formatarMoeda(venda.subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-sm">Desconto:</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-500 text-sm">R$</span>
                                    <input
                                        type="text"
                                        value={formatarMoeda(desconto)}
                                        onChange={(e) => setDesconto(parseMoeda(e.target.value))}
                                        className="w-24 px-2 py-1 bg-gray-800 border border-gray-700 text-sm text-white text-right font-mono focus:border-green-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-700">
                                <span className="text-white">TOTAL:</span>
                                <span className="text-green-500 font-mono">R$ {formatarMoeda(venda.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-3">
                        <button
                            onClick={onFinalizarVenda}
                            disabled={venda.itens.length === 0}
                            className="flex-1 px-4 py-2 bg-green-700 border border-green-600 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            FINALIZAR VENDA
                        </button>
                        <button
                            onClick={onCancelarVenda}
                            className="px-4 py-2 bg-gray-800 border border-gray-600 text-sm font-medium text-white hover:bg-gray-700"
                        >
                            CANCELAR
                        </button>
                    </div>
                </div>
            </div>
        </Panel>
    );
}
