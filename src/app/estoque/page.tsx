"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import Panel from "@/components/clinica/Panel";
import { supabase } from "@/lib/supabase";
import {
    Lente,
    Armacao,
    StatusEstoque,
    calcularStatusEstoque,
} from "@/data/vendasData";
import { formatarMoeda, parseMoeda } from "@/utils/monetary";

type Tab = "lentes" | "armacoes";
type Modo = "lista" | "cadastro" | "edicao";

interface ProdutoDb {
    id: string;
    codigo: string;
    nome: string;
    marca: string;
    tipo: string;
    descricao?: string;
    quantidade: number;
    preco_unitario: number;
    preco_custo: number;
    ncm?: string;
    cest?: string;
    origem?: number;
    empresa_id?: number;
    ativo: boolean;
}

function getStatusColor(status: StatusEstoque): string {
    switch (status) {
        case "disponivel": return "text-green-500";
        case "baixo": return "text-yellow-500";
        case "critico": return "text-red-500";
    }
}

function getStatusLabel(status: StatusEstoque): string {
    switch (status) {
        case "disponivel": return "OK";
        case "baixo": return "BAIXO";
        case "critico": return "CRÍTICO";
    }
}

interface CampoFormProps {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: "text" | "number" | "currency";
    disabled?: boolean;
}

function CampoForm({ label, value, onChange, type = "text", disabled = false }: CampoFormProps) {
    const isCurrency = type === "currency";
    const inputValue = isCurrency ? formatarMoeda(value) : value;

    return (
        <div>
            <label className="text-xs text-gray-500 block mb-1">{label}</label>
            <input
                type={isCurrency ? "text" : type}
                value={inputValue}
                onChange={(e) => {
                    const val = e.target.value;
                    if (isCurrency) {
                        onChange(parseMoeda(val).toString());
                    } else {
                        onChange(val);
                    }
                }}
                disabled={disabled}
                className={`w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none disabled:opacity-50 ${isCurrency || type === "number" ? "text-right font-mono" : ""}`}
            />
        </div>
    );
}

export default function EstoquePage() {
    const [tab, setTab] = useState<Tab>("lentes");
    const [modo, setModo] = useState<Modo>("lista");
    const [produtosDb, setProdutosDb] = useState<ProdutoDb[]>([]);
    const [empresas, setEmpresas] = useState<any[]>([]);
    const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("geral");
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [produtoEditando, setProdutoEditando] = useState<ProdutoDb | null>(null);

    // Form states
    const [formLente, setFormLente] = useState({
        codigo: "",
        nome: "",
        tipo: "Monofocal",
        marca: "",
        material: "CR-39",
        quantidade: "",
        precoUnitario: "",
        precoCusto: "",
        ncm: "",
        cest: "",
        origem: "0",
    });

    const [formArmacao, setFormArmacao] = useState({
        codigo: "",
        nome: "",
        marca: "",
        modelo: "",
        cor: "",
        quantidade: "",
        precoUnitario: "",
        precoCusto: "",
        ncm: "",
        cest: "",
        origem: "0",
    });

    // Buscar dados do Supabase
    useEffect(() => {
        fetchEmpresas();
        fetchProdutos();
    }, [unidadeSelecionada]);

    const fetchEmpresas = async () => {
        const { data } = await supabase.from('empresas').select('id, nome_fantasia');
        if (data) setEmpresas(data);
    };

    const fetchProdutos = async () => {
        setLoading(true);
        let query = supabase.from('produtos').select('*').eq('ativo', true);

        if (unidadeSelecionada !== "geral") {
            query = query.eq('empresa_id', parseInt(unidadeSelecionada));
        }

        const { data, error } = await query.order('nome');

        if (!error && data) {
            setProdutosDb(data);
        }
        setLoading(false);
    };

    const mostrarMensagem = (tipo: "sucesso" | "erro", texto: string) => {
        setMensagem({ tipo, texto });
        setTimeout(() => setMensagem(null), 3000);
    };

    const resetForms = () => {
        setFormLente({
            codigo: "", nome: "", tipo: "Monofocal", marca: "", material: "CR-39",
            quantidade: "", precoUnitario: "", precoCusto: "", ncm: "", cest: "", origem: "0",
        });
        setFormArmacao({
            codigo: "", nome: "", marca: "", modelo: "", cor: "",
            quantidade: "", precoUnitario: "", precoCusto: "", ncm: "", cest: "", origem: "0",
        });
        setProdutoEditando(null);
    };

    // ===== CREATE =====
    const handleSalvarLente = async () => {
        if (!formLente.codigo || !formLente.nome || !formLente.marca) {
            mostrarMensagem("erro", "PREENCHA OS CAMPOS OBRIGATÓRIOS");
            return;
        }

        const dados = {
            codigo: formLente.codigo,
            nome: formLente.nome,
            marca: formLente.marca,
            tipo: 'lente',
            quantidade: parseInt(formLente.quantidade) || 0,
            preco_unitario: parseFloat(formLente.precoUnitario) || 0,
            preco_custo: parseFloat(formLente.precoCusto) || 0,
            ncm: formLente.ncm,
            cest: formLente.cest,
            origem: parseInt(formLente.origem),
            empresa_id: unidadeSelecionada === "geral" ? 1 : parseInt(unidadeSelecionada),
            ativo: true
        };

        const { error } = await supabase.from('produtos').insert(dados);

        if (!error) {
            fetchProdutos();
            resetForms();
            setModo("lista");
            mostrarMensagem("sucesso", "LENTE CADASTRADA COM SUCESSO");
        } else {
            mostrarMensagem("erro", "ERRO AO SALVAR: " + error.message);
        }
    };

    const handleSalvarArmacao = async () => {
        if (!formArmacao.codigo || !formArmacao.nome || !formArmacao.marca) {
            mostrarMensagem("erro", "PREENCHA OS CAMPOS OBRIGATÓRIOS");
            return;
        }

        const dados = {
            codigo: formArmacao.codigo,
            nome: formArmacao.nome,
            marca: formArmacao.marca,
            tipo: 'armacao',
            descricao: formArmacao.modelo,
            quantidade: parseInt(formArmacao.quantidade) || 0,
            preco_unitario: parseFloat(formArmacao.precoUnitario) || 0,
            preco_custo: parseFloat(formArmacao.precoCusto) || 0,
            ncm: formArmacao.ncm,
            cest: formArmacao.cest,
            origem: parseInt(formArmacao.origem),
            empresa_id: unidadeSelecionada === "geral" ? 1 : parseInt(unidadeSelecionada),
            ativo: true
        };

        const { error } = await supabase.from('produtos').insert(dados);

        if (!error) {
            fetchProdutos();
            resetForms();
            setModo("lista");
            mostrarMensagem("sucesso", "ARMAÇÃO CADASTRADA COM SUCESSO");
        } else {
            mostrarMensagem("erro", "ERRO AO SALVAR: " + error.message);
        }
    };

    // ===== UPDATE =====
    const handleEditar = (produto: ProdutoDb) => {
        setProdutoEditando(produto);
        if (produto.tipo === 'lente') {
            setFormLente({
                codigo: produto.codigo || "",
                nome: produto.nome,
                tipo: "Monofocal",
                marca: produto.marca || "",
                material: "CR-39",
                quantidade: produto.quantidade.toString(),
                precoUnitario: produto.preco_unitario.toString(),
                precoCusto: (produto.preco_custo || 0).toString(),
                ncm: produto.ncm || "",
                cest: produto.cest || "",
                origem: (produto.origem || 0).toString(),
            });
            setTab("lentes");
        } else {
            setFormArmacao({
                codigo: produto.codigo || "",
                nome: produto.nome,
                marca: produto.marca || "",
                modelo: produto.descricao || "",
                cor: "",
                quantidade: produto.quantidade.toString(),
                precoUnitario: produto.preco_unitario.toString(),
                precoCusto: (produto.preco_custo || 0).toString(),
                ncm: produto.ncm || "",
                cest: produto.cest || "",
                origem: (produto.origem || 0).toString(),
            });
            setTab("armacoes");
        }
        setModo("edicao");
    };

    const handleAtualizarLente = async () => {
        if (!produtoEditando) return;

        const dados = {
            codigo: formLente.codigo,
            nome: formLente.nome,
            marca: formLente.marca,
            quantidade: parseInt(formLente.quantidade) || 0,
            preco_unitario: parseFloat(formLente.precoUnitario) || 0,
            preco_custo: parseFloat(formLente.precoCusto) || 0,
            ncm: formLente.ncm,
            cest: formLente.cest,
            origem: parseInt(formLente.origem),
        };

        const { error } = await supabase.from('produtos').update(dados).eq('id', produtoEditando.id);

        if (!error) {
            fetchProdutos();
            resetForms();
            setModo("lista");
            mostrarMensagem("sucesso", "LENTE ATUALIZADA COM SUCESSO");
        } else {
            mostrarMensagem("erro", "ERRO AO ATUALIZAR: " + error.message);
        }
    };

    const handleAtualizarArmacao = async () => {
        if (!produtoEditando) return;

        const dados = {
            codigo: formArmacao.codigo,
            nome: formArmacao.nome,
            marca: formArmacao.marca,
            descricao: formArmacao.modelo,
            quantidade: parseInt(formArmacao.quantidade) || 0,
            preco_unitario: parseFloat(formArmacao.precoUnitario) || 0,
            preco_custo: parseFloat(formArmacao.precoCusto) || 0,
            ncm: formArmacao.ncm,
            cest: formArmacao.cest,
            origem: parseInt(formArmacao.origem),
        };

        const { error } = await supabase.from('produtos').update(dados).eq('id', produtoEditando.id);

        if (!error) {
            fetchProdutos();
            resetForms();
            setModo("lista");
            mostrarMensagem("sucesso", "ARMAÇÃO ATUALIZADA COM SUCESSO");
        } else {
            mostrarMensagem("erro", "ERRO AO ATUALIZAR: " + error.message);
        }
    };

    // ===== DELETE =====
    const handleExcluir = async (produto: ProdutoDb) => {
        if (!confirm(`Deseja realmente excluir "${produto.nome}"?`)) return;

        // Soft delete - apenas marca como inativo
        const { error } = await supabase.from('produtos').update({ ativo: false }).eq('id', produto.id);

        if (!error) {
            fetchProdutos();
            mostrarMensagem("sucesso", "PRODUTO EXCLUÍDO COM SUCESSO");
        } else {
            mostrarMensagem("erro", "ERRO AO EXCLUIR: " + error.message);
        }
    };

    // Filtrar produtos por tipo
    const lentes = produtosDb.filter(p => p.tipo === 'lente');
    const armacoes = produtosDb.filter(p => p.tipo === 'armacao');

    // Calcular totais
    const getTotais = () => {
        const totalLentes = lentes.reduce((acc, l) => acc + l.quantidade, 0);
        const totalArmacoes = armacoes.reduce((acc, a) => acc + a.quantidade, 0);
        const lentesOk = lentes.filter(l => calcularStatusEstoque(l.quantidade) === "disponivel").length;
        const lentesBaixo = lentes.filter(l => calcularStatusEstoque(l.quantidade) === "baixo").length;
        const lentesCritico = lentes.filter(l => calcularStatusEstoque(l.quantidade) === "critico").length;
        const armacoesOk = armacoes.filter(a => calcularStatusEstoque(a.quantidade) === "disponivel").length;
        const armacoesBaixo = armacoes.filter(a => calcularStatusEstoque(a.quantidade) === "baixo").length;
        const armacoesCritico = armacoes.filter(a => calcularStatusEstoque(a.quantidade) === "critico").length;

        return {
            totalLentes, totalArmacoes,
            lentesOk, lentesBaixo, lentesCritico,
            armacoesOk, armacoesBaixo, armacoesCritico,
        };
    };

    const totais = getTotais();

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <div>
                                <h1 className="text-xl font-bold tracking-wide text-white">ESTOQUE</h1>
                                <p className="text-sm text-gray-500 mt-1">Gerenciamento de produtos</p>
                            </div>

                            <div className="h-10 w-px bg-gray-800"></div>

                            {/* Seletor de Unidade */}
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">UNIDADE EXIBIDA</div>
                                <select
                                    value={unidadeSelecionada}
                                    onChange={(e) => setUnidadeSelecionada(e.target.value)}
                                    className="bg-transparent border-none text-sm font-bold text-white p-0 focus:outline-none cursor-pointer hover:text-green-500 transition-all"
                                >
                                    <option value="geral" className="bg-gray-900 text-white">ESTOQUE GERAL (TODAS)</option>
                                    {empresas.map(emp => (
                                        <option key={emp.id} value={emp.id} className="bg-gray-900 text-white">{emp.nome_fantasia.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Resumo rápido */}
                            <div className="flex items-center gap-6 text-sm">
                                <div className="text-center">
                                    <div className="text-gray-500 text-xs">LENTES</div>
                                    <div className="text-white font-mono">{totais.totalLentes} un</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-gray-500 text-xs">ARMAÇÕES</div>
                                    <div className="text-white font-mono">{totais.totalArmacoes} un</div>
                                </div>
                                <div className="h-8 w-px bg-gray-700"></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-500 font-mono" title="Disponível">{totais.lentesOk + totais.armacoesOk}</span>
                                    <span className="text-yellow-500 font-mono" title="Baixo Estoque">{totais.lentesBaixo + totais.armacoesBaixo}</span>
                                    <span className="text-red-500 font-mono" title="Crítico">{totais.lentesCritico + totais.armacoesCritico}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => { resetForms(); setModo(modo === "lista" ? "cadastro" : "lista"); }}
                                className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                            >
                                {modo === "lista" ? "+ NOVO PRODUTO" : "← VOLTAR"}
                            </button>
                        </div>
                    </div>

                    {mensagem && (
                        <div className={`mt-4 px-4 py-2 text-sm font-medium ${mensagem.tipo === "sucesso" ? "bg-green-900/50 border border-green-700 text-green-400" : "bg-red-900/50 border border-red-700 text-red-400"}`}>
                            {mensagem.texto}
                        </div>
                    )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-h-0">
                    {modo === "lista" ? (
                        <div className="flex flex-col h-full">
                            {/* Tabs */}
                            <div className="flex border-b border-gray-800 mb-4">
                                <button
                                    onClick={() => setTab("lentes")}
                                    className={`px-6 py-2 text-sm font-medium ${tab === "lentes"
                                        ? "bg-gray-800 text-white border-b-2 border-green-500"
                                        : "text-gray-400 hover:text-white"
                                        }`}
                                >
                                    LENTES ({lentes.length})
                                </button>
                                <button
                                    onClick={() => setTab("armacoes")}
                                    className={`px-6 py-2 text-sm font-medium ${tab === "armacoes"
                                        ? "bg-gray-800 text-white border-b-2 border-green-500"
                                        : "text-gray-400 hover:text-white"
                                        }`}
                                >
                                    ARMAÇÕES ({armacoes.length})
                                </button>
                            </div>

                            {/* Tabela */}
                            <div className="flex-1 overflow-auto">
                                {loading ? (
                                    <div className="p-4 text-gray-500 text-sm">Carregando...</div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-900 sticky top-0">
                                            <tr className="text-xs text-gray-500 border-b border-gray-800">
                                                <th className="text-left py-3 px-4">CÓDIGO</th>
                                                <th className="text-left py-3 px-4">PRODUTO</th>
                                                <th className="text-left py-3 px-4">MARCA</th>
                                                <th className="text-right py-3 px-4">CUSTO</th>
                                                <th className="text-right py-3 px-4">VENDA</th>
                                                <th className="text-center py-3 px-4">QTD</th>
                                                <th className="text-center py-3 px-4">STATUS</th>
                                                <th className="text-center py-3 px-4">AÇÕES</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(tab === "lentes" ? lentes : armacoes).map((produto) => {
                                                const status = calcularStatusEstoque(produto.quantidade);
                                                return (
                                                    <tr key={produto.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                                        <td className="py-3 px-4 font-mono text-gray-400">{produto.codigo || "—"}</td>
                                                        <td className="py-3 px-4 text-white">{produto.nome}</td>
                                                        <td className="py-3 px-4 text-gray-400">{produto.marca || "—"}</td>
                                                        <td className="py-3 px-4 text-right font-mono text-yellow-500">
                                                            R$ {formatarMoeda(produto.preco_custo || 0)}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-white">
                                                            R$ {formatarMoeda(produto.preco_unitario)}
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-mono text-white">
                                                            {produto.quantidade}
                                                        </td>
                                                        <td className={`py-3 px-4 text-center font-medium ${getStatusColor(status)}`}>
                                                            {getStatusLabel(status)}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <button
                                                                onClick={() => handleEditar(produto)}
                                                                className="text-blue-500 hover:text-blue-400 text-xs font-medium mr-3"
                                                            >
                                                                EDITAR
                                                            </button>
                                                            <button
                                                                onClick={() => handleExcluir(produto)}
                                                                className="text-red-500 hover:text-red-400 text-xs font-medium"
                                                            >
                                                                EXCLUIR
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Formulário de Cadastro/Edição */
                        <div className="grid grid-cols-2 gap-6">
                            {/* Cadastro de Lente */}
                            <Panel title={modo === "edicao" && produtoEditando?.tipo === "lente" ? "EDITAR LENTE" : "NOVA LENTE"} className="h-fit">
                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <CampoForm
                                            label="CÓDIGO *"
                                            value={formLente.codigo}
                                            onChange={(v) => setFormLente({ ...formLente, codigo: v })}
                                        />
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">TIPO</label>
                                            <select
                                                value={formLente.tipo}
                                                onChange={(e) => setFormLente({ ...formLente, tipo: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                            >
                                                <option value="Monofocal">Monofocal</option>
                                                <option value="Bifocal">Bifocal</option>
                                                <option value="Progressiva">Progressiva</option>
                                                <option value="Contato">Contato</option>
                                            </select>
                                        </div>
                                    </div>
                                    <CampoForm
                                        label="NOME *"
                                        value={formLente.nome}
                                        onChange={(v) => setFormLente({ ...formLente, nome: v })}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <CampoForm
                                            label="MARCA *"
                                            value={formLente.marca}
                                            onChange={(v) => setFormLente({ ...formLente, marca: v })}
                                        />
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">MATERIAL</label>
                                            <select
                                                value={formLente.material}
                                                onChange={(e) => setFormLente({ ...formLente, material: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                            >
                                                <option value="CR-39">CR-39</option>
                                                <option value="Policarbonato">Policarbonato</option>
                                                <option value="Trivex">Trivex</option>
                                                <option value="Alto Índice">Alto Índice</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <CampoForm
                                            label="QUANTIDADE"
                                            value={formLente.quantidade}
                                            onChange={(v) => setFormLente({ ...formLente, quantidade: v })}
                                            type="number"
                                        />
                                        <CampoForm
                                            label="PREÇO CUSTO"
                                            value={formLente.precoCusto}
                                            onChange={(v) => setFormLente({ ...formLente, precoCusto: v })}
                                            type="currency"
                                        />
                                        <CampoForm
                                            label="PREÇO VENDA"
                                            value={formLente.precoUnitario}
                                            onChange={(v) => setFormLente({ ...formLente, precoUnitario: v })}
                                            type="currency"
                                        />
                                    </div>
                                    <div className="pt-2 border-t border-gray-800">
                                        <div className="text-[10px] text-gray-500 font-bold mb-2 uppercase tracking-widest">Informações Fiscais</div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <CampoForm
                                                label="NCM"
                                                value={formLente.ncm}
                                                onChange={(v) => setFormLente({ ...formLente, ncm: v })}
                                            />
                                            <CampoForm
                                                label="CEST"
                                                value={formLente.cest}
                                                onChange={(v) => setFormLente({ ...formLente, cest: v })}
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <label className="text-xs text-gray-500 block mb-1">ORIGEM DO PRODUTO</label>
                                            <select
                                                value={formLente.origem}
                                                onChange={(e) => setFormLente({ ...formLente, origem: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                            >
                                                <option value="0">0 - Nacional</option>
                                                <option value="1">1 - Estrangeira (Importação Direta)</option>
                                                <option value="2">2 - Estrangeira (Adquirida no Mercado Interno)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={modo === "edicao" && produtoEditando?.tipo === "lente" ? handleAtualizarLente : handleSalvarLente}
                                        className="w-full px-4 py-2 bg-green-700 border border-green-600 text-sm font-medium text-white hover:bg-green-600"
                                    >
                                        {modo === "edicao" && produtoEditando?.tipo === "lente" ? "ATUALIZAR LENTE" : "SALVAR LENTE"}
                                    </button>
                                </div>
                            </Panel>

                            {/* Cadastro de Armação */}
                            <Panel title={modo === "edicao" && produtoEditando?.tipo === "armacao" ? "EDITAR ARMAÇÃO" : "NOVA ARMAÇÃO"} className="h-fit">
                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <CampoForm
                                            label="CÓDIGO *"
                                            value={formArmacao.codigo}
                                            onChange={(v) => setFormArmacao({ ...formArmacao, codigo: v })}
                                        />
                                        <CampoForm
                                            label="MODELO"
                                            value={formArmacao.modelo}
                                            onChange={(v) => setFormArmacao({ ...formArmacao, modelo: v })}
                                        />
                                    </div>
                                    <CampoForm
                                        label="NOME *"
                                        value={formArmacao.nome}
                                        onChange={(v) => setFormArmacao({ ...formArmacao, nome: v })}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <CampoForm
                                            label="MARCA *"
                                            value={formArmacao.marca}
                                            onChange={(v) => setFormArmacao({ ...formArmacao, marca: v })}
                                        />
                                        <CampoForm
                                            label="COR"
                                            value={formArmacao.cor}
                                            onChange={(v) => setFormArmacao({ ...formArmacao, cor: v })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <CampoForm
                                            label="QUANTIDADE"
                                            value={formArmacao.quantidade}
                                            onChange={(v) => setFormArmacao({ ...formArmacao, quantidade: v })}
                                            type="number"
                                        />
                                        <CampoForm
                                            label="PREÇO CUSTO"
                                            value={formArmacao.precoCusto}
                                            onChange={(v) => setFormArmacao({ ...formArmacao, precoCusto: v })}
                                            type="currency"
                                        />
                                        <CampoForm
                                            label="PREÇO VENDA"
                                            value={formArmacao.precoUnitario}
                                            onChange={(v) => setFormArmacao({ ...formArmacao, precoUnitario: v })}
                                            type="currency"
                                        />
                                    </div>
                                    <div className="pt-2 border-t border-gray-800">
                                        <div className="text-[10px] text-gray-500 font-bold mb-2 uppercase tracking-widest">Informações Fiscais</div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <CampoForm
                                                label="NCM"
                                                value={formArmacao.ncm}
                                                onChange={(v) => setFormArmacao({ ...formArmacao, ncm: v })}
                                            />
                                            <CampoForm
                                                label="CEST"
                                                value={formArmacao.cest}
                                                onChange={(v) => setFormArmacao({ ...formArmacao, cest: v })}
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <label className="text-xs text-gray-500 block mb-1">ORIGEM DO PRODUTO</label>
                                            <select
                                                value={formArmacao.origem}
                                                onChange={(e) => setFormArmacao({ ...formArmacao, origem: e.target.value })}
                                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                            >
                                                <option value="0">0 - Nacional</option>
                                                <option value="1">1 - Estrangeira (Importação Direta)</option>
                                                <option value="2">2 - Estrangeira (Adquirida no Mercado Interno)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        onClick={modo === "edicao" && produtoEditando?.tipo === "armacao" ? handleAtualizarArmacao : handleSalvarArmacao}
                                        className="w-full px-4 py-2 bg-green-700 border border-green-600 text-sm font-medium text-white hover:bg-green-600"
                                    >
                                        {modo === "edicao" && produtoEditando?.tipo === "armacao" ? "ATUALIZAR ARMAÇÃO" : "SALVAR ARMAÇÃO"}
                                    </button>
                                </div>
                            </Panel>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
