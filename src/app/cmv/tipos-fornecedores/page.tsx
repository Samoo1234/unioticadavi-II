"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";

interface TipoFornecedor {
    id: number;
    nome: string;
    created_at: string;
}

export default function TiposFornecedoresPage() {
    const [tipos, setTipos] = useState<TipoFornecedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [novoTipo, setNovoTipo] = useState("");
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [editandoNome, setEditandoNome] = useState("");
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

    useEffect(() => {
        fetchTipos();
    }, []);

    const fetchTipos = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("tipos_fornecedores")
            .select("*")
            .order("nome");

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao carregar tipos" });
        } else {
            setTipos(data || []);
        }
        setLoading(false);
    };

    const handleAdicionar = async () => {
        if (!novoTipo.trim()) return;

        const { error } = await supabase
            .from("tipos_fornecedores")
            .insert({ nome: novoTipo.trim() });

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao adicionar tipo" });
        } else {
            setMensagem({ tipo: "sucesso", texto: "Tipo adicionado com sucesso" });
            setNovoTipo("");
            fetchTipos();
        }
    };

    const handleEditar = async () => {
        if (!editandoId || !editandoNome.trim()) return;

        const { error } = await supabase
            .from("tipos_fornecedores")
            .update({ nome: editandoNome.trim(), updated_at: new Date().toISOString() })
            .eq("id", editandoId);

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao atualizar tipo" });
        } else {
            setMensagem({ tipo: "sucesso", texto: "Tipo atualizado com sucesso" });
            setEditandoId(null);
            setEditandoNome("");
            fetchTipos();
        }
    };

    const handleExcluir = async (id: number) => {
        if (!confirm("Deseja excluir este tipo?")) return;

        // Verificar se há fornecedores usando este tipo
        const { data: fornecedores } = await supabase
            .from("fornecedores")
            .select("id")
            .eq("tipo_id", id);

        if (fornecedores && fornecedores.length > 0) {
            setMensagem({ tipo: "erro", texto: `Este tipo possui ${fornecedores.length} fornecedor(es) vinculado(s)` });
            return;
        }

        const { error } = await supabase
            .from("tipos_fornecedores")
            .delete()
            .eq("id", id);

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao excluir tipo" });
        } else {
            setMensagem({ tipo: "sucesso", texto: "Tipo excluído com sucesso" });
            fetchTipos();
        }
    };

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-gray-500">CMV</div>
                            <div className="text-lg font-bold text-white">TIPOS DE FORNECEDORES</div>
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

                {/* Formulário Adicionar */}
                <div className="bg-gray-900 border border-gray-800 p-4 mb-4">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Nome do tipo..."
                            value={novoTipo}
                            onChange={(e) => setNovoTipo(e.target.value)}
                            className="flex-1 bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                        />
                        <button
                            onClick={handleAdicionar}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium transition-colors"
                        >
                            ADICIONAR
                        </button>
                    </div>
                </div>

                {/* Lista de Tipos */}
                <div className="flex-1 bg-gray-900 border border-gray-800 overflow-auto">
                    {loading ? (
                        <div className="p-4 text-gray-500 text-sm">Carregando...</div>
                    ) : tipos.length === 0 ? (
                        <div className="p-4 text-gray-500 text-sm">Nenhum tipo cadastrado</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-800 sticky top-0">
                                <tr>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">NOME</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3 w-32">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tipos.map((tipo) => (
                                    <tr key={tipo.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3">
                                            {editandoId === tipo.id ? (
                                                <input
                                                    type="text"
                                                    value={editandoNome}
                                                    onChange={(e) => setEditandoNome(e.target.value)}
                                                    className="bg-gray-800 border border-green-500 text-white px-2 py-1 text-sm w-full"
                                                    autoFocus
                                                />
                                            ) : (
                                                <span className="text-white text-sm">{tipo.nome}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {editandoId === tipo.id ? (
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={handleEditar}
                                                        className="text-green-500 hover:text-green-400 text-xs font-medium"
                                                    >
                                                        SALVAR
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditandoId(null); setEditandoNome(""); }}
                                                        className="text-gray-500 hover:text-gray-400 text-xs font-medium"
                                                    >
                                                        CANCELAR
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => { setEditandoId(tipo.id); setEditandoNome(tipo.nome); }}
                                                        className="text-blue-500 hover:text-blue-400 text-xs font-medium"
                                                    >
                                                        EDITAR
                                                    </button>
                                                    <button
                                                        onClick={() => handleExcluir(tipo.id)}
                                                        className="text-red-500 hover:text-red-400 text-xs font-medium"
                                                    >
                                                        EXCLUIR
                                                    </button>
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
