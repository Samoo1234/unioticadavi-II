"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";

interface Empresa {
    id: number;
    nome_fantasia: string;
}

interface Categoria {
    id: number;
    nome: string;
}

interface Despesa {
    id: string;
    tipo: "fixa" | "diversa";
    nome: string;
    categoria: string;
    empresa: string;
    empresa_id: number | null;
    categoria_id: number | null;
    valor: number;
    data: string;
    status: string;
}

export default function ExtratoDespesasPage() {
    const [despesas, setDespesas] = useState<Despesa[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);

    const [filtros, setFiltros] = useState({
        empresa_id: "",
        categoria_id: "",
        tipo: "todos",
        dataInicio: "",
        dataFim: "",
        busca: "",
    });

    useEffect(() => {
        fetchRefs();
    }, []);

    useEffect(() => {
        fetchData();
    }, [filtros]);

    const fetchRefs = async () => {
        const [empRes, catRes] = await Promise.all([
            supabase.from("empresas").select("id, nome_fantasia").eq("ativo", true).order("nome_fantasia"),
            supabase.from("categorias").select("*").order("nome"),
        ]);
        if (empRes.data) setEmpresas(empRes.data);
        if (catRes.data) setCategorias(catRes.data);
    };

    const fetchData = async () => {
        setLoading(true);

        // Buscar despesas fixas
        let queryFixas = supabase.from("despesas_fixas").select("*, empresas(id, nome_fantasia), categorias(id, nome)");
        if (filtros.empresa_id) queryFixas = queryFixas.eq("empresa_id", parseInt(filtros.empresa_id));
        if (filtros.categoria_id) queryFixas = queryFixas.eq("categoria_id", parseInt(filtros.categoria_id));

        // Buscar despesas diversas
        let queryDiversas = supabase.from("despesas_diversas").select("*, empresas(id, nome_fantasia), categorias(id, nome)");
        if (filtros.empresa_id) queryDiversas = queryDiversas.eq("empresa_id", parseInt(filtros.empresa_id));
        if (filtros.categoria_id) queryDiversas = queryDiversas.eq("categoria_id", parseInt(filtros.categoria_id));
        if (filtros.dataInicio) queryDiversas = queryDiversas.gte("data", filtros.dataInicio);
        if (filtros.dataFim) queryDiversas = queryDiversas.lte("data", filtros.dataFim);

        const [fixasRes, diversasRes] = await Promise.all([queryFixas, queryDiversas]);

        const despesasUnificadas: Despesa[] = [];

        // Processar fixas
        if (fixasRes.data && (filtros.tipo === "todos" || filtros.tipo === "fixa")) {
            fixasRes.data.forEach((d: any) => {
                despesasUnificadas.push({
                    id: `fixa-${d.id}`,
                    tipo: "fixa",
                    nome: d.credor || "Despesa Fixa",
                    categoria: d.categorias?.nome || "-",
                    empresa: d.empresas?.nome_fantasia || "-",
                    empresa_id: d.empresa_id,
                    categoria_id: d.categoria_id,
                    valor: d.valor,
                    data: d.data_vencimento || new Date().toISOString().split("T")[0],
                    status: d.status,
                });
            });
        }

        // Processar diversas
        if (diversasRes.data && (filtros.tipo === "todos" || filtros.tipo === "diversa")) {
            diversasRes.data.forEach((d: any) => {
                despesasUnificadas.push({
                    id: `diversa-${d.id}`,
                    tipo: "diversa",
                    nome: d.nome || "Despesa Diversa",
                    categoria: d.categorias?.nome || "-",
                    empresa: d.empresas?.nome_fantasia || "-",
                    empresa_id: d.empresa_id,
                    categoria_id: d.categoria_id,
                    valor: d.valor,
                    data: d.data,
                    status: d.status,
                });
            });
        }

        // Filtrar por busca
        let resultado = despesasUnificadas;
        if (filtros.busca) {
            const termo = filtros.busca.toLowerCase();
            resultado = resultado.filter(d => d.nome.toLowerCase().includes(termo) || d.categoria.toLowerCase().includes(termo));
        }

        // Ordenar por data
        resultado.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

        setDespesas(resultado);
        setLoading(false);
    };

    const formatarValor = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const formatarData = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

    // Totais
    const totalFixas = despesas.filter(d => d.tipo === "fixa").reduce((acc, d) => acc + d.valor, 0);
    const totalDiversas = despesas.filter(d => d.tipo === "diversa").reduce((acc, d) => acc + d.valor, 0);
    const totalGeral = totalFixas + totalDiversas;

    // Agrupamento por categoria
    const porCategoria = categorias.map(cat => ({
        nome: cat.nome,
        total: despesas.filter(d => d.categoria === cat.nome).reduce((acc, d) => acc + d.valor, 0),
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    // Agrupamento por empresa
    const porEmpresa = empresas.map(emp => ({
        nome: emp.nome_fantasia,
        total: despesas.filter(d => d.empresa === emp.nome_fantasia).reduce((acc, d) => acc + d.valor, 0),
    })).filter(e => e.total > 0).sort((a, b) => b.total - a.total);

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="text-xs text-gray-500">CMV</div>
                    <div className="text-lg font-bold text-white">EXTRATO DE DESPESAS</div>
                </div>

                {/* Filtros */}
                <div className="bg-gray-900 border border-gray-800 p-4 mb-4">
                    <div className="grid grid-cols-6 gap-4">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={filtros.busca}
                            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                        />
                        <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                            <option value="todos">Todos Tipos</option>
                            <option value="fixa">Fixas</option>
                            <option value="diversa">Diversas</option>
                        </select>
                        <select value={filtros.empresa_id} onChange={(e) => setFiltros({ ...filtros, empresa_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                            <option value="">Todas Empresas</option>
                            {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
                        </select>
                        <select value={filtros.categoria_id} onChange={(e) => setFiltros({ ...filtros, categoria_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                            <option value="">Todas Categorias</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm [color-scheme:dark]" />
                        <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm [color-scheme:dark]" />
                    </div>
                </div>

                {/* Cards de Resumo */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="text-xs text-gray-500">DESPESAS FIXAS</div>
                        <div className="text-lg font-bold text-blue-400">{formatarValor(totalFixas)}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="text-xs text-gray-500">DESPESAS DIVERSAS</div>
                        <div className="text-lg font-bold text-purple-400">{formatarValor(totalDiversas)}</div>
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4">
                        <div className="text-xs text-gray-500">TOTAL GERAL</div>
                        <div className="text-lg font-bold text-yellow-400">{formatarValor(totalGeral)}</div>
                    </div>
                </div>

                {/* Resumos por Categoria e Empresa */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-900 border border-gray-800 p-4 max-h-40 overflow-auto">
                        <div className="text-xs text-gray-500 mb-2">POR CATEGORIA</div>
                        {porCategoria.map((c, i) => (
                            <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-800">
                                <span className="text-white">{c.nome}</span>
                                <span className="text-yellow-400">{formatarValor(c.total)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="bg-gray-900 border border-gray-800 p-4 max-h-40 overflow-auto">
                        <div className="text-xs text-gray-500 mb-2">POR EMPRESA</div>
                        {porEmpresa.map((e, i) => (
                            <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-800">
                                <span className="text-white">{e.nome}</span>
                                <span className="text-yellow-400">{formatarValor(e.total)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lista */}
                <div className="flex-1 bg-gray-900 border border-gray-800 overflow-auto">
                    {loading ? (
                        <div className="p-4 text-gray-500 text-sm">Carregando...</div>
                    ) : despesas.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm">Nenhuma despesa encontrada</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-800 sticky top-0">
                                <tr>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">DATA</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">TIPO</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">NOME</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">CATEGORIA</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">EMPRESA</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">VALOR</th>
                                    <th className="text-center text-xs text-gray-400 font-medium px-4 py-3">STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {despesas.map((d) => (
                                    <tr key={d.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-gray-400 text-sm">{formatarData(d.data)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 ${d.tipo === "fixa" ? "bg-blue-900/50 text-blue-400" : "bg-purple-900/50 text-purple-400"}`}>
                                                {d.tipo.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-white text-sm">{d.nome}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{d.categoria}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{d.empresa}</td>
                                        <td className="px-4 py-3 text-right text-yellow-400 text-sm font-mono">{formatarValor(d.valor)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-xs px-2 py-1 ${d.status === "pago" ? "bg-green-900/50 text-green-400" : d.status === "ativo" ? "bg-yellow-900/50 text-yellow-400" : "bg-gray-700 text-gray-400"}`}>
                                                {d.status.toUpperCase()}
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
