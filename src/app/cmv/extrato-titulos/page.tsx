"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";

interface Empresa {
    id: number;
    nome_fantasia: string;
}

interface Fornecedor {
    id: number;
    nome: string;
}

interface TipoFornecedor {
    id: number;
    nome: string;
}

interface Titulo {
    id: number;
    numero: number;
    fornecedor_id: number | null;
    empresa_id: number | null;
    tipo_id: number | null;
    tipo: string;
    valor: number;
    data_vencimento: string;
    data_pagamento: string | null;
    status: string;
    observacao: string | null;
    multa: number;
    juros: number;
    fornecedores?: Fornecedor;
    empresas?: Empresa;
    tipos_fornecedores?: TipoFornecedor;
}

export default function ExtratoTitulosPage() {
    const [titulos, setTitulos] = useState<Titulo[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [tipos, setTipos] = useState<TipoFornecedor[]>([]);
    const [loading, setLoading] = useState(true);

    const [filtros, setFiltros] = useState({
        status: "todos",
        empresa_id: "",
        fornecedor_id: "",
        tipo_id: "",
        dataInicio: "",
        dataFim: "",
    });

    useEffect(() => {
        fetchRefs();
    }, []);

    useEffect(() => {
        fetchData();
    }, [filtros]);

    const fetchRefs = async () => {
        const [empRes, fornRes, tiposRes] = await Promise.all([
            supabase.from("empresas").select("id, nome_fantasia").eq("ativo", true).order("nome_fantasia"),
            supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
            supabase.from("tipos_fornecedores").select("*").order("nome"),
        ]);

        if (empRes.data) setEmpresas(empRes.data);
        if (fornRes.data) setFornecedores(fornRes.data);
        if (tiposRes.data) setTipos(tiposRes.data);
    };

    const fetchData = async () => {
        setLoading(true);
        let query = supabase.from("titulos").select("*, fornecedores(id, nome), empresas(id, nome_fantasia), tipos_fornecedores(id, nome)").order("data_vencimento", { ascending: false });

        if (filtros.status !== "todos") query = query.eq("status", filtros.status);
        if (filtros.empresa_id) query = query.eq("empresa_id", parseInt(filtros.empresa_id));
        if (filtros.fornecedor_id) query = query.eq("fornecedor_id", parseInt(filtros.fornecedor_id));
        if (filtros.tipo_id) query = query.eq("tipo_id", parseInt(filtros.tipo_id));
        if (filtros.dataInicio) query = query.gte("data_vencimento", filtros.dataInicio);
        if (filtros.dataFim) query = query.lte("data_vencimento", filtros.dataFim);

        const { data } = await query;
        if (data) setTitulos(data);
        setLoading(false);
    };

    const formatarValor = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const formatarData = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

    // Agrupamentos
    const titulosPorEmpresa = empresas.map(emp => ({
        empresa: emp.nome_fantasia,
        pendente: titulos.filter(t => t.empresa_id === emp.id && t.status === "pendente").reduce((acc, t) => acc + t.valor, 0),
        pago: titulos.filter(t => t.empresa_id === emp.id && t.status === "pago").reduce((acc, t) => acc + t.valor, 0),
    })).filter(e => e.pendente > 0 || e.pago > 0);

    const titulosPorTipo = tipos.map(tipo => {
        const doTipo = titulos.filter(t => t.tipo_id === tipo.id);
        const pendentes = doTipo.filter(t => t.status === "pendente");
        const pagos = doTipo.filter(t => t.status === "pago");
        return {
            tipo: tipo.nome,
            pendentesQtd: pendentes.length,
            pendentesValor: pendentes.reduce((acc, t) => acc + t.valor, 0),
            pagosQtd: pagos.length,
            pagosValor: pagos.reduce((acc, t) => acc + t.valor, 0),
            totalQtd: doTipo.length,
            totalValor: doTipo.reduce((acc, t) => acc + t.valor, 0),
        };
    }).filter(t => t.totalQtd > 0);

    const totalPendente = titulos.filter(t => t.status === "pendente").reduce((acc, t) => acc + t.valor, 0);
    const totalPendenteQtd = titulos.filter(t => t.status === "pendente").length;
    const totalPago = titulos.filter(t => t.status === "pago").reduce((acc, t) => acc + t.valor, 0);
    const totalPagoQtd = titulos.filter(t => t.status === "pago").length;
    const totalGeral = totalPendente + totalPago;
    const totalGeralQtd = totalPendenteQtd + totalPagoQtd;

    const empresaFiltrada = filtros.empresa_id
        ? empresas.find(e => e.id === parseInt(filtros.empresa_id))?.nome_fantasia || ""
        : "Todas as Filiais";

    const handlePagar = async (id: number) => {
        const { error } = await supabase.from("titulos").update({
            status: "pago",
            data_pagamento: new Date().toISOString().split("T")[0],
        }).eq("id", id);

        if (!error) fetchData();
    };

    return (
        <MainLayout>
            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="text-xs text-gray-500">CMV</div>
                    <div className="text-lg font-bold text-white">EXTRATO DE TÍTULOS</div>
                </div>

                {/* Filtros */}
                <div className="bg-gray-900 border border-gray-800 p-4 mb-4">
                    <div className="grid grid-cols-6 gap-4">
                        <select value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                            <option value="todos">Todos Status</option>
                            <option value="pendente">Pendentes</option>
                            <option value="pago">Pagos</option>
                        </select>
                        <select value={filtros.empresa_id} onChange={(e) => setFiltros({ ...filtros, empresa_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                            <option value="">Todas Empresas</option>
                            {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
                        </select>
                        <select value={filtros.fornecedor_id} onChange={(e) => setFiltros({ ...filtros, fornecedor_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                            <option value="">Todos Fornecedores</option>
                            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                        </select>
                        <select value={filtros.tipo_id} onChange={(e) => setFiltros({ ...filtros, tipo_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                            <option value="">Todos Tipos</option>
                            {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                        <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm [color-scheme:dark]" />
                        <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm [color-scheme:dark]" />
                    </div>
                </div>

                {/* Cards de Resumo */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="text-xs text-gray-500">PENDENTE</div>
                        <div className="text-lg font-bold text-yellow-400">{formatarValor(totalPendente)}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="text-xs text-gray-500">PAGO</div>
                        <div className="text-lg font-bold text-green-400">{formatarValor(totalPago)}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="text-xs text-gray-500">TOTAL</div>
                        <div className="text-lg font-bold text-white">{formatarValor(totalGeral)}</div>
                    </div>
                </div>

                {/* Resumo de Títulos por Tipo */}
                <div className="bg-gray-900 border border-gray-800 mb-4">
                    <div className="px-4 py-3 border-b border-gray-800">
                        <div className="text-center">
                            <div className="text-sm font-bold text-white">📊 Resumo de Títulos por Tipo ({empresaFiltrada})</div>
                        </div>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-800">
                                <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Tipo de Título</th>
                                <th className="text-center text-xs text-yellow-400 font-medium px-4 py-3">Pendentes</th>
                                <th className="text-center text-xs text-green-400 font-medium px-4 py-3">Pagos</th>
                                <th className="text-center text-xs text-blue-400 font-medium px-4 py-3">Total</th>
                                <th className="text-center text-xs text-gray-400 font-medium px-4 py-3">Percentual</th>
                            </tr>
                        </thead>
                        <tbody>
                            {titulosPorTipo.map((t, i) => (
                                <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/50">
                                    <td className="px-4 py-3 text-white text-sm font-medium">{t.tipo}</td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="text-sm text-yellow-400 font-medium">{t.pendentesQtd} títulos</div>
                                        <div className="text-xs text-yellow-400/70">{formatarValor(t.pendentesValor)}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="text-sm text-green-400 font-medium">{t.pagosQtd} títulos</div>
                                        <div className="text-xs text-green-400/70">{formatarValor(t.pagosValor)}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="text-sm text-blue-400 font-medium">{t.totalQtd} títulos</div>
                                        <div className="text-xs text-blue-400/70">{formatarValor(t.totalValor)}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm text-white font-mono">
                                        {totalGeral > 0 ? ((t.totalValor / totalGeral) * 100).toFixed(1) : "0.0"}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-600 bg-gray-800/80">
                                <td className="px-4 py-3 text-white text-sm font-bold">TOTAL GERAL</td>
                                <td className="px-4 py-3 text-center">
                                    <div className="text-sm text-yellow-400 font-bold">{totalPendenteQtd} títulos</div>
                                    <div className="text-xs text-yellow-400/70 font-medium">{formatarValor(totalPendente)}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="text-sm text-green-400 font-bold">{totalPagoQtd} títulos</div>
                                    <div className="text-xs text-green-400/70 font-medium">{formatarValor(totalPago)}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="text-sm text-blue-400 font-bold">{totalGeralQtd} títulos</div>
                                    <div className="text-xs text-blue-400/70 font-medium">{formatarValor(totalGeral)}</div>
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-white font-bold font-mono">100.0%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Resumo por Empresa */}
                <div className="bg-gray-900 border border-gray-800 p-4 mb-4">
                    <div className="text-xs text-gray-500 mb-2">POR EMPRESA</div>
                    {titulosPorEmpresa.map((e, i) => (
                        <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-800">
                            <span className="text-white">{e.empresa}</span>
                            <span className="text-yellow-400">{formatarValor(e.pendente)}</span>
                        </div>
                    ))}
                </div>

                {/* Lista */}
                <div className="flex-1 bg-gray-900 border border-gray-800 overflow-auto">
                    {loading ? (
                        <div className="p-4 text-gray-500 text-sm">Carregando...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-800 sticky top-0">
                                <tr>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Nº</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">FORNECEDOR</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">EMPRESA</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">TIPO</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">VALOR</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">VENCIMENTO</th>
                                    <th className="text-center text-xs text-gray-400 font-medium px-4 py-3">STATUS</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {titulos.map((t) => (
                                    <tr key={t.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-gray-400 text-sm">{t.numero}</td>
                                        <td className="px-4 py-3 text-white text-sm">{t.fornecedores?.nome || "-"}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{t.empresas?.nome_fantasia || "-"}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{t.tipos_fornecedores?.nome || "-"}</td>
                                        <td className="px-4 py-3 text-right text-white text-sm font-mono">{formatarValor(t.valor)}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{formatarData(t.data_vencimento)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-xs px-2 py-1 ${t.status === "pago" ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"}`}>
                                                {t.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {t.status === "pendente" && (
                                                <button onClick={() => handlePagar(t.id)} className="text-green-500 hover:text-green-400 text-xs font-medium">PAGAR</button>
                                            )}
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
