"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";

interface Empresa {
    id: number;
    nome_fantasia: string;
    cidade?: string;
}

interface CustoOS {
    id: number;
    empresa_id: number | null;
    data: string;
    valor_venda: number;
    custo_lentes: number;
    custo_armacoes: number;
    custo_mkt: number;
    outros_custos: number;
    medico_nome: string | null;
    numero_tco: string | null;
    empresas?: Empresa;
}

export default function RelatorioOSPage() {
    const [registros, setRegistros] = useState<CustoOS[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [loading, setLoading] = useState(true);

    const [filtros, setFiltros] = useState({
        empresa_id: "",
        dataInicio: "",
        dataFim: "",
    });

    useEffect(() => {
        fetchEmpresas();
    }, []);

    useEffect(() => {
        fetchData();
    }, [filtros]);

    const fetchEmpresas = async () => {
        const { data } = await supabase.from("empresas").select("id, nome_fantasia, cidade").eq("ativo", true).order("nome_fantasia");
        if (data) setEmpresas(data);
    };

    const fetchData = async () => {
        setLoading(true);
        let query = supabase.from("custos_os").select("*, empresas(id, nome_fantasia, cidade)").order("data", { ascending: false });

        if (filtros.empresa_id) query = query.eq("empresa_id", parseInt(filtros.empresa_id));
        if (filtros.dataInicio) query = query.gte("data", filtros.dataInicio);
        if (filtros.dataFim) query = query.lte("data", filtros.dataFim);

        const { data } = await query;
        if (data) setRegistros(data);
        setLoading(false);
    };

    const formatarValor = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const formatarData = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

    const calcularCustoTotal = (r: CustoOS) => r.custo_lentes + r.custo_armacoes + r.custo_mkt + r.outros_custos;
    const calcularMargem = (r: CustoOS) => r.valor_venda - calcularCustoTotal(r);

    // Cálculos totais
    const totalVendas = registros.reduce((acc, r) => acc + r.valor_venda, 0);
    const totalLentes = registros.reduce((acc, r) => acc + r.custo_lentes, 0);
    const totalArmacoes = registros.reduce((acc, r) => acc + r.custo_armacoes, 0);
    const totalMkt = registros.reduce((acc, r) => acc + r.custo_mkt, 0);
    const totalOutros = registros.reduce((acc, r) => acc + r.outros_custos, 0);
    const totalCustos = totalLentes + totalArmacoes + totalMkt + totalOutros;
    const margemTotal = totalVendas - totalCustos;
    const margemPercent = totalVendas > 0 ? ((margemTotal / totalVendas) * 100).toFixed(1) : "0";
    const ticketMedio = registros.length > 0 ? totalVendas / registros.length : 0;

    const handleGerarPDF = () => {
        // Implementação simplificada - apenas abre a janela de impressão
        window.print();
    };

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-gray-500">CMV</div>
                            <div className="text-lg font-bold text-white">RELATÓRIO DE OS</div>
                        </div>
                        <div className="flex gap-4">
                            <select
                                value={filtros.empresa_id}
                                onChange={(e) => setFiltros({ ...filtros, empresa_id: e.target.value })}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                            >
                                <option value="">Todas Empresas</option>
                                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}{e.cidade ? ` - ${e.cidade}` : ''}</option>)}
                            </select>
                            <input
                                type="date"
                                value={filtros.dataInicio}
                                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm [color-scheme:dark]"
                            />
                            <input
                                type="date"
                                value={filtros.dataFim}
                                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm [color-scheme:dark]"
                            />
                            <button onClick={handleGerarPDF} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium">
                                IMPRIMIR
                            </button>
                        </div>
                    </div>
                </div>

                {/* Cards de Resumo */}
                <div className="grid grid-cols-5 gap-4 mb-4">
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="text-xs text-gray-500">TOTAL VENDAS</div>
                        <div className="text-lg font-bold text-blue-400">{formatarValor(totalVendas)}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="text-xs text-gray-500">TOTAL CUSTOS</div>
                        <div className="text-lg font-bold text-red-400">{formatarValor(totalCustos)}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="text-xs text-gray-500">MARGEM BRUTA</div>
                        <div className="text-lg font-bold text-green-400">{formatarValor(margemTotal)} ({margemPercent}%)</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="text-xs text-gray-500">TICKET MÉDIO</div>
                        <div className="text-lg font-bold text-white">{formatarValor(ticketMedio)}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="text-xs text-gray-500">QTD REGISTROS</div>
                        <div className="text-lg font-bold text-white">{registros.length}</div>
                    </div>
                </div>

                {/* Detalhamento Custos */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-900 border border-gray-800 p-3">
                        <div className="text-xs text-gray-500">LENTES</div>
                        <div className="text-sm font-bold text-white">{formatarValor(totalLentes)}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-3">
                        <div className="text-xs text-gray-500">ARMAÇÕES</div>
                        <div className="text-sm font-bold text-white">{formatarValor(totalArmacoes)}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-3">
                        <div className="text-xs text-gray-500">MARKETING</div>
                        <div className="text-sm font-bold text-white">{formatarValor(totalMkt)}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-3">
                        <div className="text-xs text-gray-500">OUTROS</div>
                        <div className="text-sm font-bold text-white">{formatarValor(totalOutros)}</div>
                    </div>
                </div>

                {/* Lista */}
                <div className="flex-1 bg-gray-900 border border-gray-800 overflow-auto">
                    {loading ? (
                        <div className="p-4 text-gray-500 text-sm">Carregando...</div>
                    ) : registros.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm">Nenhum registro encontrado</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-800 sticky top-0">
                                <tr>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">DATA</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">EMPRESA</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">TSO</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">MÉDICO</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">VENDA</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">LENTES</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">ARMAÇÕES</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">MKT</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">OUTROS</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">MARGEM</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registros.map((r) => (
                                    <tr key={r.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-gray-400 text-sm">{formatarData(r.data)}</td>
                                        <td className="px-4 py-3 text-white text-sm">{r.empresas ? `${r.empresas.nome_fantasia}${r.empresas.cidade ? ` - ${r.empresas.cidade}` : ''}` : "-"}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{r.numero_tco || "-"}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{r.medico_nome || "-"}</td>
                                        <td className="px-4 py-3 text-right text-blue-400 text-sm font-mono">{formatarValor(r.valor_venda)}</td>
                                        <td className="px-4 py-3 text-right text-gray-400 text-sm font-mono">{formatarValor(r.custo_lentes)}</td>
                                        <td className="px-4 py-3 text-right text-gray-400 text-sm font-mono">{formatarValor(r.custo_armacoes)}</td>
                                        <td className="px-4 py-3 text-right text-gray-400 text-sm font-mono">{formatarValor(r.custo_mkt)}</td>
                                        <td className="px-4 py-3 text-right text-gray-400 text-sm font-mono">{formatarValor(r.outros_custos)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`text-sm font-mono ${calcularMargem(r) >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                {formatarValor(calcularMargem(r))}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
