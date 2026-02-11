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

interface DespesaDiversa {
    id: number;
    empresa_id: number | null;
    categoria_id: number | null;
    nome: string | null;
    descricao: string | null;
    valor: number;
    data: string;
    data_pagamento: string | null;
    forma_pagamento: string | null;
    observacao: string | null;
    status: string;
    empresas?: Empresa;
    categorias?: Categoria;
}

export default function DespesasDiversasPage() {
    const [despesas, setDespesas] = useState<DespesaDiversa[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

    const [filtros, setFiltros] = useState({
        empresa_id: "",
        categoria_id: "",
        dataInicio: "",
        dataFim: "",
    });

    const [form, setForm] = useState({
        empresa_id: "",
        categoria_id: "",
        nome: "",
        descricao: "",
        valor: "",
        data: new Date().toISOString().split("T")[0],
        forma_pagamento: "",
        observacao: "",
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
            supabase.from("categorias").select("*").eq("tipo", "diversa").order("nome"),
        ]);
        if (empRes.data) setEmpresas(empRes.data);
        if (catRes.data) setCategorias(catRes.data);
    };

    const fetchData = async () => {
        setLoading(true);
        let query = supabase.from("despesas_diversas").select("*, empresas(id, nome_fantasia), categorias(id, nome)").order("data", { ascending: false });

        if (filtros.empresa_id) query = query.eq("empresa_id", parseInt(filtros.empresa_id));
        if (filtros.categoria_id) query = query.eq("categoria_id", parseInt(filtros.categoria_id));
        if (filtros.dataInicio) query = query.gte("data", filtros.dataInicio);
        if (filtros.dataFim) query = query.lte("data", filtros.dataFim);

        const { data } = await query;
        if (data) setDespesas(data);
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!form.valor || !form.nome) {
            setMensagem({ tipo: "erro", texto: "Nome e Valor são obrigatórios" });
            return;
        }

        const dados = {
            empresa_id: form.empresa_id ? parseInt(form.empresa_id) : null,
            categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
            nome: form.nome,
            descricao: form.descricao || null,
            valor: parseFloat(form.valor.replace(",", ".")),
            data: form.data,
            forma_pagamento: form.forma_pagamento || null,
            observacao: form.observacao || null,
            status: "pago",
            data_pagamento: form.data,
        };

        if (editandoId) {
            const { error } = await supabase.from("despesas_diversas").update(dados).eq("id", editandoId);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao atualizar" });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Despesa atualizada" });
                resetForm();
                fetchData();
            }
        } else {
            const { error } = await supabase.from("despesas_diversas").insert(dados);
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
        setForm({ empresa_id: "", categoria_id: "", nome: "", descricao: "", valor: "", data: new Date().toISOString().split("T")[0], forma_pagamento: "", observacao: "" });
        setEditandoId(null);
        setShowForm(false);
    };

    const handleEditar = (d: DespesaDiversa) => {
        setForm({
            empresa_id: d.empresa_id?.toString() || "",
            categoria_id: d.categoria_id?.toString() || "",
            nome: d.nome || "",
            descricao: d.descricao || "",
            valor: d.valor.toString(),
            data: d.data,
            forma_pagamento: d.forma_pagamento || "",
            observacao: d.observacao || "",
        });
        setEditandoId(d.id);
        setShowForm(true);
    };

    const handleExcluir = async (id: number) => {
        if (!confirm("Deseja excluir esta despesa?")) return;
        const { error } = await supabase.from("despesas_diversas").delete().eq("id", id);
        if (!error) {
            setMensagem({ tipo: "sucesso", texto: "Despesa excluída" });
            fetchData();
        }
    };

    const formatarValor = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const formatarData = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

    const totalDespesas = despesas.reduce((acc, d) => acc + d.valor, 0);

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-gray-500">CMV</div>
                            <div className="text-lg font-bold text-white">DESPESAS DIVERSAS</div>
                        </div>
                        <div className="flex gap-4">
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
                            <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium">
                                NOVA DESPESA
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-6 mt-4">
                        <div className="text-sm"><span className="text-gray-500">TOTAL:</span> <span className="text-yellow-400 font-bold">{formatarValor(totalDespesas)}</span></div>
                        <div className="text-sm"><span className="text-gray-500">QTD:</span> <span className="text-white font-bold">{despesas.length}</span></div>
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
                            <input type="text" placeholder="Nome/Descrição *" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm" />
                            <input type="text" placeholder="Valor *" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm" />
                            <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm [color-scheme:dark]" />
                            <select value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                <option value="">Empresa...</option>
                                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
                            </select>
                            <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                <option value="">Categoria...</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </select>
                            <select value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                <option value="">Forma Pagamento...</option>
                                <option value="dinheiro">Dinheiro</option>
                                <option value="pix">PIX</option>
                                <option value="cartao_debito">Cartão Débito</option>
                                <option value="cartao_credito">Cartão Crédito</option>
                                <option value="transferencia">Transferência</option>
                            </select>
                            <input type="text" placeholder="Observação" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm col-span-2" />
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
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">DATA</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">NOME</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">CATEGORIA</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">EMPRESA</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">VALOR</th>
                                    <th className="text-center text-xs text-gray-400 font-medium px-4 py-3">PAGAMENTO</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {despesas.map((d) => (
                                    <tr key={d.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-gray-400 text-sm">{formatarData(d.data)}</td>
                                        <td className="px-4 py-3 text-white text-sm">{d.nome}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{d.categorias?.nome || "-"}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{d.empresas?.nome_fantasia || "-"}</td>
                                        <td className="px-4 py-3 text-right text-yellow-400 text-sm font-mono">{formatarValor(d.valor)}</td>
                                        <td className="px-4 py-3 text-center text-gray-400 text-sm">{d.forma_pagamento?.toUpperCase() || "-"}</td>
                                        <td className="px-4 py-3 text-right">
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
