"use client";

import { StatusEstoque, calcularStatusEstoque } from "@/data/vendasData";
import { ProdutoDb } from "@/hooks/useEstoque";
import { formatarMoeda } from "@/utils/monetary";

function getStatusColor(status: StatusEstoque): string {
    switch (status) {
        case "disponivel": return "text-green-500";
        case "baixo": return "text-yellow-500";
        case "critico": return "text-red-500";
    }
}

function getStatusLabel(status: StatusEstoque): string {
    switch (status) {
        case "disponivel": return "OK";
        case "baixo": return "BAIXO";
        case "critico": return "CRÍTICO";
    }
}

interface EstoqueTabelaProps {
    produtos: ProdutoDb[];
    onEditar: (produto: ProdutoDb) => void;
    onExcluir: (produto: ProdutoDb) => void;
    mostrarLoja?: boolean;
}

export function EstoqueTabela({ produtos, onEditar, onExcluir, mostrarLoja = false }: EstoqueTabelaProps) {
    if (produtos.length === 0) {
        return <div className="p-4 text-gray-500 text-sm text-center">Nenhum produto cadastrado.</div>;
    }

    return (
        <table className="w-full text-sm">
            <thead className="bg-gray-900 sticky top-0">
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                    <th className="text-left py-3 px-4">CÓDIGO</th>
                    <th className="text-left py-3 px-4">PRODUTO</th>
                    <th className="text-left py-3 px-4">MARCA</th>
                    {mostrarLoja && <th className="text-left py-3 px-4">LOJA</th>}
                    <th className="text-right py-3 px-4">CUSTO</th>
                    <th className="text-right py-3 px-4">VENDA</th>
                    <th className="text-center py-3 px-4">QTD</th>
                    <th className="text-center py-3 px-4">STATUS</th>
                    <th className="text-center py-3 px-4">AÇÕES</th>
                </tr>
            </thead>
            <tbody>
                {produtos.map((produto) => {
                    const status = calcularStatusEstoque(produto.quantidade);
                    const isDeposito = produto.empresa?.is_deposito_central;
                    return (
                        <tr key={produto.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="py-3 px-4 font-mono text-gray-400">{produto.codigo || "—"}</td>
                            <td className="py-3 px-4 text-white">{produto.nome}</td>
                            <td className="py-3 px-4 text-gray-400">{produto.marca || "—"}</td>
                            {mostrarLoja && (
                                <td className="py-3 px-4">
                                    <span className={`text-xs font-medium px-2 py-0.5 ${
                                        isDeposito
                                            ? "text-cyan-400 bg-cyan-400/10"
                                            : "text-gray-300 bg-gray-700/50"
                                    }`}>
                                        {isDeposito ? "DEPÓSITO" : produto.empresa?.cidade?.toUpperCase() || "—"}
                                    </span>
                                </td>
                            )}
                            <td className="py-3 px-4 text-right font-mono text-yellow-500">
                                R$ {formatarMoeda(produto.preco_custo || 0)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-white">
                                R$ {formatarMoeda(produto.preco_unitario)}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-white">
                                {produto.quantidade}
                            </td>
                            <td className={`py-3 px-4 text-center font-medium ${getStatusColor(status)}`}>
                                {getStatusLabel(status)}
                            </td>
                            <td className="py-3 px-4 text-center">
                                <button
                                    type="button"
                                    onClick={() => onEditar(produto)}
                                    className="text-blue-500 hover:text-blue-400 text-xs font-medium mr-3"
                                >
                                    EDITAR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onExcluir(produto)}
                                    className="text-red-500 hover:text-red-400 text-xs font-medium"
                                >
                                    EXCLUIR
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
