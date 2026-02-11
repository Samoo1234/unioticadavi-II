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

export default function TitulosPage() {
    const [titulos, setTitulos] = useState<Titulo[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [tipos, setTipos] = useState<TipoFornecedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

    const [filtros, setFiltros] = useState({
        status: "todos",
        empresa_id: "",
    });

    const [form, setForm] = useState({
        fornecedor_id: "",
        empresa_id: "",
        tipo_id: "",
        tipo: "pagar",
        valor: "",
        data_vencimento: "",
        observacao: "",
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [titRes, empRes, fornRes, tiposRes] = await Promise.all([
            supabase.from("titulos").select("*, fornecedores(id, nome), empresas(id, nome_fantasia), tipos_fornecedores(id, nome)").order("data_vencimento", { ascending: false }),
            supabase.from("empresas").select("id, nome_fantasia").eq("ativo", true).order("nome_fantasia"),
            supabase.from("fornecedores").select("id, nome").eq("ativo", true).order("nome"),
            supabase.from("tipos_fornecedores").select("*").order("nome"),
        ]);

        if (titRes.data) setTitulos(titRes.data);
        if (empRes.data) setEmpresas(empRes.data);
        if (fornRes.data) setFornecedores(fornRes.data);
        if (tiposRes.data) setTipos(tiposRes.data);
        setLoading(false);
    };

    const getProximoNumero = async (): Promise<number> => {
        const anoAtual = new Date().getFullYear();
        const { data } = await supabase
            .from("titulos")
            .select("numero")
            .gte("numero", parseInt(`${anoAtual}0001`))
            .lt("numero", parseInt(`${anoAtual + 1}0001`))
            .order("numero", { ascending: false })
            .limit(1);

        let proximo = 1;
        if (data && data.length > 0) {
            proximo = (data[0].numero % 10000) + 1;
        }
        return parseInt(`${anoAtual}${proximo.toString().padStart(4, "0")}`);
    };

    const handleSubmit = async () => {
        if (!form.valor || !form.data_vencimento) {
            setMensagem({ tipo: "erro", texto: "Valor e Data de Vencimento são obrigatórios" });
            return;
        }

        const numero = editandoId ? undefined : await getProximoNumero();

        const dados: any = {
            fornecedor_id: form.fornecedor_id ? parseInt(form.fornecedor_id) : null,
            empresa_id: form.empresa_id ? parseInt(form.empresa_id) : null,
            tipo_id: form.tipo_id ? parseInt(form.tipo_id) : null,
            tipo: form.tipo,
            valor: parseFloat(form.valor.replace(",", ".")),
            data_vencimento: form.data_vencimento,
            observacao: form.observacao || null,
        };

        if (numero) dados.numero = numero;

        if (editandoId) {
            const { error } = await supabase.from("titulos").update(dados).eq("id", editandoId);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao atualizar" });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Título atualizado" });
                resetForm();
                fetchData();
            }
        } else {
            const { error } = await supabase.from("titulos").insert(dados);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao adicionar" });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Título adicionado" });
                resetForm();
                fetchData();
            }
        }
    };

    const resetForm = () => {
        setForm({ fornecedor_id: "", empresa_id: "", tipo_id: "", tipo: "pagar", valor: "", data_vencimento: "", observacao: "" });
        setEditandoId(null);
        setShowForm(false);
    };

    const handlePagar = async (id: number) => {
        const { error } = await supabase.from("titulos").update({
            status: "pago",
            data_pagamento: new Date().toISOString().split("T")[0],
        }).eq("id", id);

        if (!error) {
            setMensagem({ tipo: "sucesso", texto: "Título marcado como pago" });
            fetchData();
        }
    };

    const handleExcluir = async (id: number) => {
        if (!confirm("Deseja excluir este título?")) return;
        const { error } = await supabase.from("titulos").delete().eq("id", id);
        if (!error) {
            setMensagem({ tipo: "sucesso", texto: "Título excluído" });
            fetchData();
        }
    };

    const formatarValor = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const formatarData = (data: string) => new Date(data + "T00:00:00").toLocaleDateString("pt-BR");

    const titulosFiltrados = titulos.filter(t => {
        if (filtros.status !== "todos" && t.status !== filtros.status) return false;
        if (filtros.empresa_id && t.empresa_id !== parseInt(filtros.empresa_id)) return false;
        return true;
    });

    const totalPendente = titulosFiltrados.filter(t => t.status === "pendente").reduce((acc, t) => acc + t.valor, 0);
    const totalPago = titulosFiltrados.filter(t => t.status === "pago").reduce((acc, t) => acc + t.valor, 0);

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-gray-500">CMV</div>
                            <div className="text-lg font-bold text-white">TÍTULOS</div>
                        </div>
                        <div className="flex gap-4">
                            <select
                                value={filtros.status}
                                onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                            >
                                <option value="todos">Todos</option>
                                <option value="pendente">Pendentes</option>
                                <option value="pago">Pagos</option>
                            </select>
                            <select
                                value={filtros.empresa_id}
                                onChange={(e) => setFiltros({ ...filtros, empresa_id: e.target.value })}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                            >
                                <option value="">Todas Empresas</option>
                                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
                            </select>
                            <button
                                onClick={() => { resetForm(); setShowForm(true); }}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium"
                            >
                                NOVO TÍTULO
                            </button>
                        </div>
                    </div>

                    {/* Resumo */}
                    <div className="flex gap-6 mt-4">
                        <div className="text-sm"><span className="text-gray-500">PENDENTE:</span> <span className="text-yellow-400 font-bold">{formatarValor(totalPendente)}</span></div>
                        <div className="text-sm"><span className="text-gray-500">PAGO:</span> <span className="text-green-400 font-bold">{formatarValor(totalPago)}</span></div>
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
                            <select value={form.fornecedor_id} onChange={(e) => setForm({ ...form, fornecedor_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                <option value="">Fornecedor...</option>
                                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                            </select>
                            <select value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                <option value="">Empresa...</option>
                                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}</option>)}
                            </select>
                            <select value={form.tipo_id} onChange={(e) => setForm({ ...form, tipo_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                <option value="">Tipo Fornecedor...</option>
                                {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                            </select>
                            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                <option value="pagar">A Pagar</option>
                                <option value="receber">A Receber</option>
                            </select>
                            <input type="text" placeholder="Valor" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm" />
                            <input type="date" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm [color-scheme:dark]" />
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
                                {titulosFiltrados.map((t) => (
                                    <tr key={t.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-gray-400 text-sm">{t.numero}</td>
                                        <td className="px-4 py-3 text-white text-sm">{t.fornecedores?.nome || "-"}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{t.empresas?.nome_fantasia || "-"}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-1 ${t.tipo === "pagar" ? "bg-red-900/50 text-red-400" : "bg-blue-900/50 text-blue-400"}`}>
                                                {t.tipo === "pagar" ? "PAGAR" : "RECEBER"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-white text-sm font-mono">{formatarValor(t.valor)}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{formatarData(t.data_vencimento)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-xs px-2 py-1 ${t.status === "pago" ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"}`}>
                                                {t.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {t.status === "pendente" && (
                                                <button onClick={() => handlePagar(t.id)} className="text-green-500 hover:text-green-400 text-xs font-medium mr-2">PAGAR</button>
                                            )}
                                            <button onClick={() => handleExcluir(t.id)} className="text-red-500 hover:text-red-400 text-xs font-medium">EXCLUIR</button>
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
