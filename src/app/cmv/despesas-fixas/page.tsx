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

interface DespesaFixa {
    id: number;
    empresa_id: number | null;
    categoria_id: number | null;
    credor: string | null;
    valor: number;
    periodicidade: string;
    dia_vencimento: number | null;
    data_vencimento: string | null;
    observacoes: string | null;
    status: string;
    data_pagamento: string | null;
    forma_pagamento: string | null;
    empresas?: Empresa;
    categorias?: Categoria;
}

export default function DespesasFixasPage() {
    const [despesas, setDespesas] = useState<DespesaFixa[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

    const [filtros, setFiltros] = useState({
        empresa_id: "",
        status: "todos",
    });

    const [form, setForm] = useState({
        empresa_id: "",
        categoria_id: "",
        credor: "",
        valor: "",
        periodicidade: "mensal",
        dia_vencimento: "",
        observacoes: "",
    });

    useEffect(() => {
        fetchRefs();
        fetchData();
    }, []);

    useEffect(() => {
        fetchData();
    }, [filtros]);

    const fetchRefs = async () => {
        const [empRes, catRes] = await Promise.all([
            supabase.from("empresas").select("id, nome_fantasia").eq("ativo", true).order("nome_fantasia"),
            supabase.from("categorias").select("*").eq("tipo", "fixa").order("nome"),
        ]);
        if (empRes.data) setEmpresas(empRes.data);
        if (catRes.data) setCategorias(catRes.data);
    };

    const fetchData = async () => {
        setLoading(true);
        let query = supabase.from("despesas_fixas").select("*, empresas(id, nome_fantasia), categorias(id, nome)").order("data_vencimento", { ascending: false });

        if (filtros.empresa_id) query = query.eq("empresa_id", parseInt(filtros.empresa_id));
        if (filtros.status !== "todos") query = query.eq("status", filtros.status);

        const { data } = await query;
        if (data) setDespesas(data);
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!form.valor || !form.credor) {
            setMensagem({ tipo: "erro", texto: "Credor e Valor são obrigatórios" });
            return;
        }

        const dados = {
            empresa_id: form.empresa_id ? parseInt(form.empresa_id) : null,
            categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
            credor: form.credor,
            valor: parseFloat(form.valor.replace(",", ".")),
            periodicidade: form.periodicidade,
            dia_vencimento: form.dia_vencimento ? parseInt(form.dia_vencimento) : null,
            observacoes: form.observacoes || null,
        };

        if (editandoId) {
            const { error } = await supabase.from("despesas_fixas").update(dados).eq("id", editandoId);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao atualizar" });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Despesa atualizada" });
                resetForm();
                fetchData();
            }
        } else {
            const { error } = await supabase.from("despesas_fixas").insert(dados);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao adicionar" });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Despesa adicionada" });
                resetForm();
                fetchData();
            }
        }
    };

    const resetForm = () => {
        setForm({ empresa_id: "", categoria_id: "", credor: "", valor: "", periodicidade: "mensal", dia_vencimento: "", observacoes: "" });
        setEditandoId(null);
        setShowForm(false);
    };

    const handleEditar = (d: DespesaFixa) => {
        setForm({
            empresa_id: d.empresa_id?.toString() || "",
            categoria_id: d.categoria_id?.toString() || "",
            credor: d.credor || "",
            valor: d.valor.toString(),
            periodicidade: d.periodicidade,
            dia_vencimento: d.dia_vencimento?.toString() || "",
            observacoes: d.observacoes || "",
        });
        setEditandoId(d.id);
        setShowForm(true);
    };

    const handlePagar = async (id: number) => {
        const { error } = await supabase.from("despesas_fixas").update({
            status: "pago",
            data_pagamento: new Date().toISOString().split("T")[0],
        }).eq("id", id);

        if (!error) {
            setMensagem({ tipo: "sucesso", texto: "Despesa marcada como paga" });
            fetchData();
        }
    };

    const handleToggleStatus = async (id: number, status: string) => {
        const novoStatus = status === "ativo" ? "inativo" : "ativo";
        const { error } = await supabase.from("despesas_fixas").update({ status: novoStatus }).eq("id", id);
        if (!error) fetchData();
    };

    const handleExcluir = async (id: number) => {
        if (!confirm("Deseja excluir esta despesa?")) return;
        const { error } = await supabase.from("despesas_fixas").delete().eq("id", id);
        if (!error) {
            setMensagem({ tipo: "sucesso", texto: "Despesa excluída" });
            fetchData();
        }
    };

    const formatarValor = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const totalMensal = despesas.filter(d => d.status === "ativo").reduce((acc, d) => acc + d.valor, 0);

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-gray-500">CMV</div>
                            <div className="text-lg font-bold text-white">DESPESAS FIXAS</div>
                        </div>
                        <div className="flex gap-4">
                            <select value={filtros.empresa_id} onChange={(e) => setFiltros({ ...filtros, empresa_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                <option value="">Todas Empresas</option>
                                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
                            </select>
                            <select value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                <option value="todos">Todos Status</option>
                                <option value="ativo">Ativos</option>
                                <option value="inativo">Inativos</option>
                                <option value="pago">Pagos</option>
                            </select>
                            <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium">
                                NOVA DESPESA
                            </button>
                        </div>
                    </div>

                    <div className="mt-4">
                        <span className="text-gray-500 text-sm">TOTAL MENSAL (ATIVOS): </span>
                        <span className="text-yellow-400 font-bold">{formatarValor(totalMensal)}</span>
                    </div>

                    {mensagem && (
                        <div className={`mt-4 px-4 py-2 text-sm font-medium ${mensagem.tipo === "sucesso" ? "bg-green-900/50 border border-green-700 text-green-400" : "bg-red-900/50 border border-red-700 text-red-400"}`}>
                            {mensagem.texto}
                        </div>
                    )}
                </div>

                {/* Formulário */}
                {showForm && (
                    <div className="bg-gray-900 border border-gray-800 p-4 mb-4">
                        <div className="grid grid-cols-4 gap-4 mb-4">
                            <input type="text" placeholder="Credor *" value={form.credor} onChange={(e) => setForm({ ...form, credor: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm" />
                            <input type="text" placeholder="Valor *" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm" />
                            <select value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                <option value="">Empresa...</option>
                                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
                            </select>
                            <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                <option value="">Categoria...</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                            <select value={form.periodicidade} onChange={(e) => setForm({ ...form, periodicidade: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                <option value="mensal">Mensal</option>
                                <option value="semanal">Semanal</option>
                                <option value="anual">Anual</option>
                            </select>
                            <input type="number" placeholder="Dia Venc." value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm" min="1" max="31" />
                            <input type="text" placeholder="Observações" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm col-span-2" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium">SALVAR</button>
                            <button onClick={resetForm} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 text-sm font-medium">CANCELAR</button>
                        </div>
                    </div>
                )}

                {/* Lista */}
                <div className="flex-1 bg-gray-900 border border-gray-800 overflow-auto">
                    {loading ? (
                        <div className="p-4 text-gray-500 text-sm">Carregando...</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-800 sticky top-0">
                                <tr>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">CREDOR</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">CATEGORIA</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">EMPRESA</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">VALOR</th>
                                    <th className="text-center text-xs text-gray-400 font-medium px-4 py-3">PERIODICIDADE</th>
                                    <th className="text-center text-xs text-gray-400 font-medium px-4 py-3">STATUS</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {despesas.map((d) => (
                                    <tr key={d.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-white text-sm">{d.credor}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{d.categorias?.nome || "-"}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{d.empresas?.nome_fantasia || "-"}</td>
                                        <td className="px-4 py-3 text-right text-yellow-400 text-sm font-mono">{formatarValor(d.valor)}</td>
                                        <td className="px-4 py-3 text-center text-gray-400 text-sm">{d.periodicidade.toUpperCase()}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => handleToggleStatus(d.id, d.status)} className={`text-xs px-2 py-1 ${d.status === "ativo" ? "bg-green-900/50 text-green-400" : d.status === "pago" ? "bg-blue-900/50 text-blue-400" : "bg-gray-700 text-gray-400"}`}>
                                                {d.status.toUpperCase()}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {d.status === "ativo" && <button onClick={() => handlePagar(d.id)} className="text-green-500 hover:text-green-400 text-xs font-medium mr-2">PAGAR</button>}
                                            <button onClick={() => handleEditar(d)} className="text-blue-500 hover:text-blue-400 text-xs font-medium mr-2">EDITAR</button>
                                            <button onClick={() => handleExcluir(d.id)} className="text-red-500 hover:text-red-400 text-xs font-medium">EXCLUIR</button>
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
