"use client";

import React, { useState, useEffect, Fragment } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";

interface Empresa {
    id: number;
    nome_fantasia: string;
    cidade?: string;
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
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

    // Estados para Edição Inline na Linha da Tabela
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [formEdit, setFormEdit] = useState({
        fornecedor_id: "",
        empresa_id: "",
        tipo_id: "",
        tipo: "pagar",
        valor: "",
        data_vencimento: "",
        multa: "0",
        juros: "0",
        observacao: "",
    });

    // Estados para Baixa de Pagamento Inline na Linha da Tabela
    const [pagandoId, setPagandoId] = useState<number | null>(null);
    const [formPagamento, setFormPagamento] = useState({
        data_pagamento: "",
        multa: "0",
        juros: "0",
    });

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
            supabase.from("empresas").select("id, nome_fantasia, cidade").eq("ativo", true).order("cidade"),
            supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
            supabase.from("tipos_fornecedores").select("*").order("nome"),
        ]);

        if (empRes.data) setEmpresas(empRes.data);
        if (fornRes.data) setFornecedores(fornRes.data);
        if (tiposRes.data) setTipos(tiposRes.data);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let query = supabase.from("titulos").select("*, fornecedores(id, nome), empresas(id, nome_fantasia, cidade), tipos_fornecedores(id, nome)").order("data_vencimento", { ascending: false });

            if (filtros.status !== "todos") query = query.eq("status", filtros.status);
            if (filtros.empresa_id) query = query.eq("empresa_id", parseInt(filtros.empresa_id));
            if (filtros.fornecedor_id) query = query.eq("fornecedor_id", parseInt(filtros.fornecedor_id));
            if (filtros.tipo_id) query = query.eq("tipo_id", parseInt(filtros.tipo_id));
            if (filtros.dataInicio) query = query.gte("data_vencimento", filtros.dataInicio);
            if (filtros.dataFim) query = query.lte("data_vencimento", filtros.dataFim);

            const { data, error } = await query;
            if (error) throw error;
            if (data) setTitulos(data);
        } catch (error) {
            console.error("Erro ao carregar títulos:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatarValor = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const formatarData = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

    const getValorTotalTitulo = (t: Titulo) => {
        const v = t.valor || 0;
        const m = t.multa || 0;
        const j = t.juros || 0;
        return v + m + j;
    };

    // Agrupamentos levando em conta multa e juros
    const titulosPorEmpresa = empresas.map(emp => ({
        empresa: `${emp.nome_fantasia}${emp.cidade ? ` - ${emp.cidade}` : ''}`,
        pendente: titulos.filter(t => t.empresa_id === emp.id && t.status === "pendente").reduce((acc, t) => acc + getValorTotalTitulo(t), 0),
        pago: titulos.filter(t => t.empresa_id === emp.id && t.status === "pago").reduce((acc, t) => acc + getValorTotalTitulo(t), 0),
    })).filter(e => e.pendente > 0 || e.pago > 0);

    const titulosPorTipo = tipos.map(tipo => {
        const doTipo = titulos.filter(t => t.tipo_id === tipo.id);
        const pendentes = doTipo.filter(t => t.status === "pendente");
        const pagos = doTipo.filter(t => t.status === "pago");
        return {
            tipo: tipo.nome,
            pendentesQtd: pendentes.length,
            pendentesValor: pendentes.reduce((acc, t) => acc + getValorTotalTitulo(t), 0),
            pagosQtd: pagos.length,
            pagosValor: pagos.reduce((acc, t) => acc + getValorTotalTitulo(t), 0),
            totalQtd: doTipo.length,
            totalValor: doTipo.reduce((acc, t) => acc + getValorTotalTitulo(t), 0),
        };
    }).filter(t => t.totalQtd > 0);

    const totalPendente = titulos.filter(t => t.status === "pendente").reduce((acc, t) => acc + getValorTotalTitulo(t), 0);
    const totalPendenteQtd = titulos.filter(t => t.status === "pendente").length;
    const totalPago = titulos.filter(t => t.status === "pago").reduce((acc, t) => acc + getValorTotalTitulo(t), 0);
    const totalPagoQtd = titulos.filter(t => t.status === "pago").length;
    const totalGeral = totalPendente + totalPago;
    const totalGeralQtd = totalPendenteQtd + totalPagoQtd;

    const empresaFiltrada = filtros.empresa_id
        ? (() => { const emp = empresas.find(e => e.id === parseInt(filtros.empresa_id)); return emp ? `${emp.nome_fantasia}${emp.cidade ? ` - ${emp.cidade}` : ''}` : ''; })()
        : "Todas as Filiais";

    // Abrir Form de Baixa (Pagar) na própria linha
    const handleAbrirPagar = (t: Titulo) => {
        setEditandoId(null);
        if (pagandoId === t.id) {
            setPagandoId(null);
        } else {
            setPagandoId(t.id);
            setFormPagamento({
                data_pagamento: new Date().toISOString().split("T")[0],
                multa: t.multa ? t.multa.toString().replace(".", ",") : "0",
                juros: t.juros ? t.juros.toString().replace(".", ",") : "0",
            });
        }
    };

    // Confirmar Baixa com Multas/Juros
    const handleConfirmarPagamento = async () => {
        if (!pagandoId) return;

        const multaNum = parseFloat(formPagamento.multa.replace(",", ".")) || 0;
        const jurosNum = parseFloat(formPagamento.juros.replace(",", ".")) || 0;

        const { error } = await supabase.from("titulos").update({
            status: "pago",
            data_pagamento: formPagamento.data_pagamento || new Date().toISOString().split("T")[0],
            multa: multaNum,
            juros: jurosNum,
        }).eq("id", pagandoId);

        if (!error) {
            setMensagem({ tipo: "sucesso", texto: "Pagamento efetuado com sucesso!" });
            setPagandoId(null);
            fetchData();
        } else {
            setMensagem({ tipo: "erro", texto: "Erro ao efetuar pagamento." });
        }
    };

    // Reverter Pagamento
    const handleReverterPagamento = async (t: Titulo) => {
        if (!confirm(`Deseja reverter o pagamento do título nº ${t.numero} para PENDENTE?`)) return;

        const { error } = await supabase.from("titulos").update({
            status: "pendente",
            data_pagamento: null,
        }).eq("id", t.id);

        if (!error) {
            setMensagem({ tipo: "sucesso", texto: "Pagamento revertido com sucesso!" });
            fetchData();
        } else {
            setMensagem({ tipo: "erro", texto: "Erro ao reverter pagamento." });
        }
    };

    // Abrir Form de Edição na própria linha
    const handleAbrirEditar = (t: Titulo) => {
        setPagandoId(null);
        if (editandoId === t.id) {
            setEditandoId(null);
        } else {
            setEditandoId(t.id);
            setFormEdit({
                fornecedor_id: t.fornecedor_id ? t.fornecedor_id.toString() : "",
                empresa_id: t.empresa_id ? t.empresa_id.toString() : "",
                tipo_id: t.tipo_id ? t.tipo_id.toString() : "",
                tipo: t.tipo || "pagar",
                valor: t.valor ? t.valor.toString().replace(".", ",") : "0",
                data_vencimento: t.data_vencimento || "",
                multa: t.multa ? t.multa.toString().replace(".", ",") : "0",
                juros: t.juros ? t.juros.toString().replace(".", ",") : "0",
                observacao: t.observacao || "",
            });
        }
    };

    // Salvar Edição de Título
    const handleSalvarEdicao = async () => {
        if (!editandoId) return;

        const valorNum = parseFloat(formEdit.valor.replace(",", ".")) || 0;
        const multaNum = parseFloat(formEdit.multa.replace(",", ".")) || 0;
        const jurosNum = parseFloat(formEdit.juros.replace(",", ".")) || 0;

        const dados: any = {
            fornecedor_id: formEdit.fornecedor_id ? parseInt(formEdit.fornecedor_id) : null,
            empresa_id: formEdit.empresa_id ? parseInt(formEdit.empresa_id) : null,
            tipo_id: formEdit.tipo_id ? parseInt(formEdit.tipo_id) : null,
            tipo: formEdit.tipo,
            valor: valorNum,
            data_vencimento: formEdit.data_vencimento,
            multa: multaNum,
            juros: jurosNum,
            observacao: formEdit.observacao || null,
        };

        const { error } = await supabase.from("titulos").update(dados).eq("id", editandoId);

        if (!error) {
            setMensagem({ tipo: "sucesso", texto: "Título atualizado com sucesso!" });
            setEditandoId(null);
            fetchData();
        } else {
            setMensagem({ tipo: "erro", texto: "Erro ao atualizar título." });
        }
    };

    // Excluir Título
    const handleExcluir = async (id: number) => {
        if (!confirm("Deseja excluir este título?")) return;
        const { error } = await supabase.from("titulos").delete().eq("id", id);
        if (!error) {
            setMensagem({ tipo: "sucesso", texto: "Título excluído" });
            fetchData();
        } else {
            setMensagem({ tipo: "erro", texto: "Erro ao excluir título" });
        }
    };

    const tituloPagando = titulos.find(t => t.id === pagandoId);

    const valorOriginalPagando = tituloPagando?.valor || 0;
    const multaPagando = parseFloat(formPagamento.multa.replace(",", ".")) || 0;
    const jurosPagando = parseFloat(formPagamento.juros.replace(",", ".")) || 0;
    const valorFinalPagando = valorOriginalPagando + multaPagando + jurosPagando;

    return (
        <MainLayout>
            <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="text-xs text-gray-500">CMV</div>
                    <div className="text-lg font-bold text-white">EXTRATO DE TÍTULOS</div>
                </div>

                {mensagem && (
                    <div className={`px-4 py-2 text-sm font-medium ${mensagem.tipo === "sucesso" ? "bg-green-900/50 border border-green-700 text-green-400" : "bg-red-900/50 border border-red-700 text-red-400"}`}>
                        {mensagem.texto}
                    </div>
                )}

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
                            {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}{e.cidade ? ` - ${e.cidade}` : ''}</option>)}
                        </select>
                        <select value={filtros.fornecedor_id} onChange={(e) => setFiltros({ ...filtros, fornecedor_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                            <option value="">Todos Fornecedores</option>
                            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                        </select>
                        <select value={filtros.tipo_id} onChange={(e) => setFiltros({ ...filtros, tipo_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                            <option value="">Todos Tipos</option>
                            {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                        <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm scheme-dark" />
                        <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm scheme-dark" />
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
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">VALOR / MULTA JUROS</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">VENCIMENTO / PAGTO</th>
                                    <th className="text-center text-xs text-gray-400 font-medium px-4 py-3">STATUS</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {titulos.map((t) => {
                                    const totalLiq = getValorTotalTitulo(t);
                                    const temMultaJuros = (t.multa || 0) > 0 || (t.juros || 0) > 0;
                                    const isPagando = pagandoId === t.id;
                                    const isEditando = editandoId === t.id;

                                    return (
                                        <Fragment key={t.id}>
                                            <tr className="border-t border-gray-800 hover:bg-gray-800/50">
                                                <td className="px-4 py-3 text-gray-400 text-sm">{t.numero}</td>
                                                <td className="px-4 py-3 text-white text-sm">{t.fornecedores?.nome || "-"}</td>
                                                <td className="px-4 py-3 text-gray-400 text-sm">{t.empresas ? `${t.empresas.nome_fantasia}${t.empresas.cidade ? ` - ${t.empresas.cidade}` : ''}` : "-"}</td>
                                                <td className="px-4 py-3 text-gray-400 text-sm">{t.tipos_fornecedores?.nome || "-"}</td>
                                                <td className="px-4 py-3 text-right text-sm font-mono">
                                                    <div className="text-white font-bold">{formatarValor(totalLiq)}</div>
                                                    {temMultaJuros && (
                                                        <div className="text-[10px] text-gray-400">
                                                            Orig: {formatarValor(t.valor)} {t.multa > 0 ? `| M: ${formatarValor(t.multa)}` : ''} {t.juros > 0 ? `| J: ${formatarValor(t.juros)}` : ''}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-400 text-sm">
                                                    <div>Venc: {formatarData(t.data_vencimento)}</div>
                                                    {t.data_pagamento && (
                                                        <div className="text-[10px] text-green-400">Pag: {formatarData(t.data_pagamento)}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`text-xs px-2 py-1 ${t.status === "pago" ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"}`}>
                                                        {t.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {t.status === "pendente" ? (
                                                        <>
                                                            <button onClick={() => handleAbrirPagar(t)} className="text-green-500 hover:text-green-400 text-xs font-medium mr-2">
                                                                {isPagando ? "FECHAR" : "PAGAR"}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button onClick={() => handleReverterPagamento(t)} className="text-amber-500 hover:text-amber-400 text-xs font-medium mr-2">REVERTER</button>
                                                        </>
                                                    )}
                                                    <button onClick={() => handleAbrirEditar(t)} className="text-blue-500 hover:text-blue-400 text-xs font-medium mr-2">
                                                        {isEditando ? "FECHAR" : "EDITAR"}
                                                    </button>
                                                    <button onClick={() => handleExcluir(t.id)} className="text-red-500 hover:text-red-400 text-xs font-medium">EXCLUIR</button>
                                                </td>
                                            </tr>

                                            {/* Sublinha Expandida de Pagamento */}
                                            {isPagando && (
                                                <tr className="bg-gray-800/90 border-t border-b border-green-700/50">
                                                    <td colSpan={8} className="p-4">
                                                        <div className="flex flex-col gap-3">
                                                            <div className="font-bold text-white text-xs flex justify-between items-center border-b border-gray-700 pb-2">
                                                                <span>💰 BAIXA DE PAGAMENTO - TÍTULO Nº {t.numero}</span>
                                                                <span className="font-mono text-green-400">VALOR FINAL PAGO: {formatarValor(valorFinalPagando)}</span>
                                                            </div>
                                                            <div className="grid grid-cols-4 gap-4">
                                                                <div>
                                                                    <label className="block text-[10px] text-gray-400 mb-1">DATA PAGAMENTO</label>
                                                                    <input
                                                                        type="date"
                                                                        value={formPagamento.data_pagamento}
                                                                        onChange={(e) => setFormPagamento({ ...formPagamento, data_pagamento: e.target.value })}
                                                                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs scheme-dark w-full"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-gray-400 mb-1">MULTA R$ (+)</label>
                                                                    <input
                                                                        type="text"
                                                                        value={formPagamento.multa}
                                                                        onChange={(e) => setFormPagamento({ ...formPagamento, multa: e.target.value })}
                                                                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs w-full"
                                                                        placeholder="0,00"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-gray-400 mb-1">JUROS R$ (+)</label>
                                                                    <input
                                                                        type="text"
                                                                        value={formPagamento.juros}
                                                                        onChange={(e) => setFormPagamento({ ...formPagamento, juros: e.target.value })}
                                                                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs w-full"
                                                                        placeholder="0,00"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-gray-400 mb-1">VALOR ORIGINAL</label>
                                                                    <div className="bg-gray-900 border border-gray-700 text-gray-300 px-3 py-1.5 text-xs font-mono">
                                                                        {formatarValor(valorOriginalPagando)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 mt-1">
                                                                <button onClick={handleConfirmarPagamento} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs font-medium rounded-sm">
                                                                    CONFIRMAR PAGAMENTO
                                                                </button>
                                                                <button onClick={() => setPagandoId(null)} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 text-xs font-medium rounded-sm">
                                                                    CANCELAR
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}

                                            {/* Sublinha Expandida de Edição */}
                                            {isEditando && (
                                                <tr className="bg-gray-800/90 border-t border-b border-blue-700/50">
                                                    <td colSpan={8} className="p-4">
                                                        <div className="flex flex-col gap-3">
                                                            <div className="font-bold text-white text-xs border-b border-gray-700 pb-2">
                                                                ✏️ EDITAR TÍTULO Nº {t.numero}
                                                            </div>
                                                            <div className="grid grid-cols-4 gap-4">
                                                                <div>
                                                                    <label className="block text-[10px] text-gray-400 mb-1">FORNECEDOR</label>
                                                                    <select
                                                                        value={formEdit.fornecedor_id}
                                                                        onChange={(e) => setFormEdit({ ...formEdit, fornecedor_id: e.target.value })}
                                                                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs w-full"
                                                                    >
                                                                        <option value="">Selecione...</option>
                                                                        {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-gray-400 mb-1">EMPRESA / FILIAL</label>
                                                                    <select
                                                                        value={formEdit.empresa_id}
                                                                        onChange={(e) => setFormEdit({ ...formEdit, empresa_id: e.target.value })}
                                                                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs w-full"
                                                                    >
                                                                        <option value="">Selecione...</option>
                                                                        {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}{e.cidade ? ` - ${e.cidade}` : ''}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-gray-400 mb-1">TIPO FORNECEDOR</label>
                                                                    <select
                                                                        value={formEdit.tipo_id}
                                                                        onChange={(e) => setFormEdit({ ...formEdit, tipo_id: e.target.value })}
                                                                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs w-full"
                                                                    >
                                                                        <option value="">Selecione...</option>
                                                                        {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-gray-400 mb-1">TIPO TÍTULO</label>
                                                                    <select
                                                                        value={formEdit.tipo}
                                                                        onChange={(e) => setFormEdit({ ...formEdit, tipo: e.target.value })}
                                                                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs w-full"
                                                                    >
                                                                        <option value="pagar">A Pagar</option>
                                                                        <option value="receber">A Receber</option>
                                                                    </select>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-4 gap-4">
                                                                <div>
                                                                    <label className="block text-[10px] text-gray-400 mb-1">VALOR R$</label>
                                                                    <input
                                                                        type="text"
                                                                        value={formEdit.valor}
                                                                        onChange={(e) => setFormEdit({ ...formEdit, valor: e.target.value })}
                                                                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs w-full"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-gray-400 mb-1">VENCIMENTO</label>
                                                                    <input
                                                                        type="date"
                                                                        value={formEdit.data_vencimento}
                                                                        onChange={(e) => setFormEdit({ ...formEdit, data_vencimento: e.target.value })}
                                                                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs scheme-dark w-full"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-gray-400 mb-1">MULTA R$</label>
                                                                    <input
                                                                        type="text"
                                                                        value={formEdit.multa}
                                                                        onChange={(e) => setFormEdit({ ...formEdit, multa: e.target.value })}
                                                                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs w-full"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] text-gray-400 mb-1">JUROS R$</label>
                                                                    <input
                                                                        type="text"
                                                                        value={formEdit.juros}
                                                                        onChange={(e) => setFormEdit({ ...formEdit, juros: e.target.value })}
                                                                        className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs w-full"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] text-gray-400 mb-1">OBSERVAÇÃO</label>
                                                                <input
                                                                    type="text"
                                                                    value={formEdit.observacao}
                                                                    onChange={(e) => setFormEdit({ ...formEdit, observacao: e.target.value })}
                                                                    className="bg-gray-900 border border-gray-700 text-white px-3 py-1.5 text-xs w-full"
                                                                />
                                                            </div>
                                                            <div className="flex gap-2 mt-1">
                                                                <button onClick={handleSalvarEdicao} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-medium rounded-sm">
                                                                    SALVAR ALTERAÇÕES
                                                                </button>
                                                                <button onClick={() => setEditandoId(null)} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 text-xs font-medium rounded-sm">
                                                                    CANCELAR
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
