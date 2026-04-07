"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";

interface CategoriaEntrada {
    id: string;
    nome: string;
    tipo_sistema: string;
    tipo_fluxo: 'entrada' | 'saida';
    ordem: number;
    ativo: boolean;
}

export default function CategoriasEntradasPage() {
    const [categorias, setCategorias] = useState<CategoriaEntrada[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [novaCategoria, setNovaCategoria] = useState("");
    const [novoTipo, setNovoTipo] = useState("manual");
    const [novoFluxo, setNovoFluxo] = useState<'entrada' | 'saida'>('entrada');
    const [novaOrdem, setNovaOrdem] = useState(10);
    
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [editandoNome, setEditandoNome] = useState("");
    const [editandoTipo, setEditandoTipo] = useState("manual");
    const [editandoFluxo, setEditandoFluxo] = useState<'entrada' | 'saida'>('entrada');
    const [editandoOrdem, setEditandoOrdem] = useState(10);
    
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

    useEffect(() => {
        fetchCategorias();
    }, []);

    const fetchCategorias = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("cmv_entradas_categorias")
            .select("*")
            .order("ordem");

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao carregar categorias de fluxo" });
        } else {
            setCategorias(data || []);
        }
        setLoading(false);
    };

    const handleAdicionar = async () => {
        if (!novaCategoria.trim()) return;

        const { error } = await supabase
            .from("cmv_entradas_categorias")
            .insert({ nome: novaCategoria.trim(), tipo_sistema: novoTipo, tipo_fluxo: novoFluxo, ordem: novaOrdem, ativo: true });

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao adicionar categoria" });
        } else {
            setMensagem({ tipo: "sucesso", texto: "Categoria adicionada" });
            setNovaCategoria("");
            setNovaOrdem(prev => prev + 1);
            fetchCategorias();
        }
    };

    const handleEditar = async () => {
        if (!editandoId || !editandoNome.trim()) return;

        const { error } = await supabase
            .from("cmv_entradas_categorias")
            .update({ nome: editandoNome.trim(), tipo_sistema: editandoTipo, tipo_fluxo: editandoFluxo, ordem: editandoOrdem })
            .eq("id", editandoId);

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao atualizar categoria" });
        } else {
            setMensagem({ tipo: "sucesso", texto: "Categoria atualizada" });
            setEditandoId(null);
            fetchCategorias();
        }
    };

    const handleExcluir = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir? Ela sumirá do Fluxo de Caixa.")) return;

        const { error } = await supabase.from("cmv_entradas_categorias").delete().eq("id", id);

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao excluir - ela pode possuir dados atrelados" });
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
                    <div className="text-lg font-bold text-white">CATEGORIAS DO FLUXO DE CAIXA</div>

                    {mensagem && (
                        <div className={`mt-4 px-4 py-2 text-sm font-medium ${mensagem.tipo === "sucesso"
                                ? "bg-green-900/50 border border-green-700 text-green-400"
                                : "bg-red-900/50 border border-red-700 text-red-400"
                            }`}>
                            {mensagem.texto}
                        </div>
                    )}
                </div>

                {/* Formulário Novo */}
                <div className="bg-gray-900 border border-gray-800 p-4 mb-4">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Nome (ex: 1.5 Vendas)"
                            value={novaCategoria}
                            onChange={(e) => setNovaCategoria(e.target.value)}
                            className="flex-1 bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none focus:border-green-500"
                        />
                        <select
                            value={novoTipo}
                            onChange={(e) => setNovoTipo(e.target.value)}
                            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none"
                        >
                            <option value="manual">Lançamento Manual</option>
                            <option value="pix">Integração Pix (Stone)</option>
                            <option value="cartao">Integração Cartão (Stone)</option>
                            <option value="servicos">Serviços / Clínica</option>
                        </select>
                        <select
                            value={novoFluxo}
                            onChange={(e) => setNovoFluxo(e.target.value as "entrada" | "saida")}
                            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none"
                        >
                            <option value="entrada">Entrada (+)</option>
                            <option value="saida">Saída (-)</option>
                        </select>
                        <input
                            type="number"
                            placeholder="Ordem"
                            value={novaOrdem}
                            onChange={(e) => setNovaOrdem(parseInt(e.target.value) || 0)}
                            className="w-20 bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm focus:outline-none text-center"
                            title="Ordem de visualização"
                        />
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
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 w-16 text-center">ORDEM</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">NOME DA LINHA GRÁFICA</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 w-48">MÓDULO DE CÁLCULO</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3 w-32">NATUREZA</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3 w-32">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categorias.map((cat) => (
                                    <tr key={cat.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-white text-center">
                                             {editandoId === cat.id ? (
                                                  <input type="number" value={editandoOrdem} onChange={e => setEditandoOrdem(parseInt(e.target.value)||0)} className="bg-gray-800 border border-green-500 text-white px-2 py-1 text-sm w-16 text-center" />
                                             ) : cat.ordem}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editandoId === cat.id ? (
                                                <input
                                                    type="text"
                                                    value={editandoNome}
                                                    onChange={(e) => setEditandoNome(e.target.value)}
                                                    className="bg-gray-800 border border-green-500 text-white px-2 py-1 text-sm w-full"
                                                />
                                            ) : (
                                                <span className="text-white text-sm">{cat.nome}</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editandoId === cat.id ? (
                                                <select value={editandoTipo} onChange={(e) => setEditandoTipo(e.target.value)} className="bg-gray-800 border border-green-500 text-white px-2 py-1 text-sm w-full">
                                                    <option value="manual">Manual</option>
                                                    <option value="pix">Stone Pix</option>
                                                    <option value="cartao">Stone Cartão</option>
                                                    <option value="servicos">Serviços</option>
                                                </select>
                                            ) : (
                                                <span className="text-xs text-gray-400 font-mono">
                                                    {cat.tipo_sistema.toUpperCase()}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editandoId === cat.id ? (
                                                <select value={editandoFluxo} onChange={e => setEditandoFluxo(e.target.value as "entrada" | "saida")} className="bg-gray-800 border border-green-500 text-white px-2 py-1 text-sm w-full">
                                                    <option value="entrada">Entrada (+)</option>
                                                    <option value="saida">Saída (-)</option>
                                                </select>
                                            ) : (
                                                <span className={`text-xs px-2 py-1 rounded font-bold ${cat.tipo_fluxo === 'saida' ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
                                                    {cat.tipo_fluxo === 'saida' ? 'SAÍDA (-)' : 'ENTRADA (+)'}
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
                                                    <button onClick={() => { setEditandoId(cat.id); setEditandoNome(cat.nome); setEditandoTipo(cat.tipo_sistema); setEditandoOrdem(cat.ordem); }} className="text-blue-500 hover:text-blue-400 text-xs font-medium">EDITAR</button>
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
