"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";

interface TipoFornecedor {
    id: number;
    nome: string;
}

interface Fornecedor {
    id: number;
    nome: string;
    tipo_id: number | null;
    cnpj: string | null;
    telefone: string | null;
    email: string | null;
    endereco: string | null;
    ativo: boolean;
    tipos_fornecedores?: TipoFornecedor;
}

export default function FornecedoresPage() {
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [tipos, setTipos] = useState<TipoFornecedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
    const [busca, setBusca] = useState("");

    const [form, setForm] = useState({
        nome: "",
        tipo_id: "",
        cnpj: "",
        telefone: "",
        email: "",
        endereco: "",
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [fornRes, tiposRes] = await Promise.all([
            supabase.from("fornecedores").select("*, tipos_fornecedores(id, nome)").order("nome"),
            supabase.from("tipos_fornecedores").select("*").order("nome"),
        ]);

        if (fornRes.data) setFornecedores(fornRes.data);
        if (tiposRes.data) setTipos(tiposRes.data);
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!form.nome.trim()) {
            setMensagem({ tipo: "erro", texto: "Nome é obrigatório" });
            return;
        }

        const dados = {
            nome: form.nome.trim(),
            tipo_id: form.tipo_id ? parseInt(form.tipo_id) : null,
            cnpj: form.cnpj || null,
            telefone: form.telefone || null,
            email: form.email || null,
            endereco: form.endereco || null,
        };

        if (editandoId) {
            const { error } = await supabase.from("fornecedores").update(dados).eq("id", editandoId);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao atualizar" });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Fornecedor atualizado" });
                resetForm();
                fetchData();
            }
        } else {
            const { error } = await supabase.from("fornecedores").insert(dados);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao adicionar" });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Fornecedor adicionado" });
                resetForm();
                fetchData();
            }
        }
    };

    const resetForm = () => {
        setForm({ nome: "", tipo_id: "", cnpj: "", telefone: "", email: "", endereco: "" });
        setEditandoId(null);
        setShowForm(false);
    };

    const handleEditar = (f: Fornecedor) => {
        setForm({
            nome: f.nome,
            tipo_id: f.tipo_id?.toString() || "",
            cnpj: f.cnpj || "",
            telefone: f.telefone || "",
            email: f.email || "",
            endereco: f.endereco || "",
        });
        setEditandoId(f.id);
        setShowForm(true);
    };

    const handleExcluir = async (id: number) => {
        if (!confirm("Deseja excluir este fornecedor?")) return;

        const { error } = await supabase.from("fornecedores").delete().eq("id", id);
        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao excluir" });
        } else {
            setMensagem({ tipo: "sucesso", texto: "Fornecedor excluído" });
            fetchData();
        }
    };

    const handleToggleAtivo = async (id: number, ativo: boolean) => {
        const { error } = await supabase.from("fornecedores").update({ ativo: !ativo }).eq("id", id);
        if (!error) fetchData();
    };

    const fornecedoresFiltrados = fornecedores.filter(f =>
        f.nome.toLowerCase().includes(busca.toLowerCase())
    );

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-gray-500">CMV</div>
                            <div className="text-lg font-bold text-white">FORNECEDORES</div>
                        </div>
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                            />
                            <button
                                onClick={() => { resetForm(); setShowForm(true); }}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium"
                            >
                                NOVO FORNECEDOR
                            </button>
                        </div>
                    </div>

                    {mensagem && (
                        <div className={`mt-4 px-4 py-2 text-sm font-medium ${mensagem.tipo === "sucesso"
                                ? "bg-green-900/50 border border-green-700 text-green-400"
                                : "bg-red-900/50 border border-red-700 text-red-400"
                            }`}>
                            {mensagem.texto}
                        </div>
                    )}
                </div>

                {/* Formulário */}
                {showForm && (
                    <div className="bg-gray-900 border border-gray-800 p-4 mb-4">
                        <div className="text-sm font-bold text-white mb-4">{editandoId ? "EDITAR FORNECEDOR" : "NOVO FORNECEDOR"}</div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <input
                                type="text"
                                placeholder="Nome *"
                                value={form.nome}
                                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                            />
                            <select
                                value={form.tipo_id}
                                onChange={(e) => setForm({ ...form, tipo_id: e.target.value })}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                            >
                                <option value="">Selecione o tipo...</option>
                                {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                            </select>
                            <input
                                type="text"
                                placeholder="CNPJ"
                                value={form.cnpj}
                                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                            />
                            <input
                                type="text"
                                placeholder="Telefone"
                                value={form.telefone}
                                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                            />
                            <input
                                type="text"
                                placeholder="Endereço"
                                value={form.endereco}
                                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                                className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                            />
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
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">NOME</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">TIPO</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">CNPJ</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">TELEFONE</th>
                                    <th className="text-center text-xs text-gray-400 font-medium px-4 py-3">STATUS</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fornecedoresFiltrados.map((f) => (
                                    <tr key={f.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-white text-sm">{f.nome}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{f.tipos_fornecedores?.nome || "-"}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{f.cnpj || "-"}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{f.telefone || "-"}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleToggleAtivo(f.id, f.ativo)}
                                                className={`text-xs px-2 py-1 ${f.ativo ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}
                                            >
                                                {f.ativo ? "ATIVO" : "INATIVO"}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleEditar(f)} className="text-blue-500 hover:text-blue-400 text-xs font-medium mr-2">EDITAR</button>
                                            <button onClick={() => handleExcluir(f.id)} className="text-red-500 hover:text-red-400 text-xs font-medium">EXCLUIR</button>
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
