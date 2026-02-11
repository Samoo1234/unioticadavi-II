"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";

interface Categoria {
    id: number;
    nome: string;
    tipo: string;
    created_at: string;
}

export default function CategoriasPage() {
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [novaCategoria, setNovaCategoria] = useState("");
    const [novoTipo, setNovoTipo] = useState("fixa");
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [editandoNome, setEditandoNome] = useState("");
    const [editandoTipo, setEditandoTipo] = useState("fixa");
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

    useEffect(() => {
        fetchCategorias();
    }, []);

    const fetchCategorias = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("categorias")
            .select("*")
            .order("nome");

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao carregar categorias" });
        } else {
            setCategorias(data || []);
        }
        setLoading(false);
    };

    const handleAdicionar = async () => {
        if (!novaCategoria.trim()) return;

        const { error } = await supabase
            .from("categorias")
            .insert({ nome: novaCategoria.trim(), tipo: novoTipo });

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao adicionar categoria" });
        } else {
            setMensagem({ tipo: "sucesso", texto: "Categoria adicionada" });
            setNovaCategoria("");
            setNovoTipo("fixa");
            fetchCategorias();
        }
    };

    const handleEditar = async () => {
        if (!editandoId || !editandoNome.trim()) return;

        const { error } = await supabase
            .from("categorias")
            .update({ nome: editandoNome.trim(), tipo: editandoTipo, updated_at: new Date().toISOString() })
            .eq("id", editandoId);

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao atualizar categoria" });
        } else {
            setMensagem({ tipo: "sucesso", texto: "Categoria atualizada" });
            setEditandoId(null);
            fetchCategorias();
        }
    };

    const handleExcluir = async (id: number) => {
        if (!confirm("Deseja excluir esta categoria?")) return;

        const { error } = await supabase.from("categorias").delete().eq("id", id);

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao excluir categoria" });
        } else {
            setMensagem({ tipo: "sucesso", texto: "Categoria excluída" });
            fetchCategorias();
        }
    };

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="text-xs text-gray-500">CMV</div>
                    <div className="text-lg font-bold text-white">CATEGORIAS DE DESPESAS</div>

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
                <div className="bg-gray-900 border border-gray-800 p-4 mb-4">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Nome da categoria..."
                            value={novaCategoria}
                            onChange={(e) => setNovaCategoria(e.target.value)}
                            className="flex-1 bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                        />
                        <select
                            value={novoTipo}
                            onChange={(e) => setNovoTipo(e.target.value)}
                            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                        >
                            <option value="fixa">Fixa</option>
                            <option value="diversa">Diversa</option>
                        </select>
                        <button
                            onClick={handleAdicionar}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium transition-colors"
                        >
                            ADICIONAR
                        </button>
                    </div>
                </div>

                {/* Lista */}
                <div className="flex-1 bg-gray-900 border border-gray-800 overflow-auto">
                    {loading ? (
                        <div className="p-4 text-gray-500 text-sm">Carregando...</div>
                    ) : categorias.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm">Nenhuma categoria cadastrada</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-800 sticky top-0">
                                <tr>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">NOME</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 w-32">TIPO</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3 w-32">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categorias.map((cat) => (
                                    <tr key={cat.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            {editandoId === cat.id ? (
                                                <input
                                                    type="text"
                                                    value={editandoNome}
                                                    onChange={(e) => setEditandoNome(e.target.value)}
                                                    className="bg-gray-800 border border-green-500 text-white px-2 py-1 text-sm w-full"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="text-white text-sm">{cat.nome}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editandoId === cat.id ? (
                                                <select
                                                    value={editandoTipo}
                                                    onChange={(e) => setEditandoTipo(e.target.value)}
                                                    className="bg-gray-800 border border-green-500 text-white px-2 py-1 text-sm"
                                                >
                                                    <option value="fixa">Fixa</option>
                                                    <option value="diversa">Diversa</option>
                                                </select>
                                            ) : (
                                                <span className={`text-xs px-2 py-1 ${cat.tipo === "fixa" ? "bg-blue-900/50 text-blue-400" : "bg-purple-900/50 text-purple-400"
                                                    }`}>
                                                    {cat.tipo.toUpperCase()}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {editandoId === cat.id ? (
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={handleEditar} className="text-green-500 hover:text-green-400 text-xs font-medium">SALVAR</button>
                                                    <button onClick={() => setEditandoId(null)} className="text-gray-500 hover:text-gray-400 text-xs font-medium">CANCELAR</button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => { setEditandoId(cat.id); setEditandoNome(cat.nome); setEditandoTipo(cat.tipo); }} className="text-blue-500 hover:text-blue-400 text-xs font-medium">EDITAR</button>
                                                    <button onClick={() => handleExcluir(cat.id)} className="text-red-500 hover:text-red-400 text-xs font-medium">EXCLUIR</button>
                                                </div>
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
