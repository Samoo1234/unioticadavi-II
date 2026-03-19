"use client";

import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { calcularStatusEstoque } from "@/data/vendasData";

// Hooks
import { useEstoque, ProdutoDb } from "@/hooks/useEstoque";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useFeedback } from "@/hooks/useFeedback";

// Components
import PageHeader from "@/components/ui/PageHeader";
import FeedbackMessage from "@/components/ui/FeedbackMessage";
import UnitSelector from "@/components/ui/UnitSelector";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { EstoqueTabela } from "@/components/estoque/EstoqueTabela";
import { EstoqueLenteForm, EstoqueArmacaoForm, FormLente, FormArmacao } from "@/components/estoque/EstoqueForms";

export default function EstoquePage() {
    const [tab, setTab] = useState<"lentes" | "armacoes">("lentes");
    const [modo, setModo] = useState<"lista" | "cadastro" | "edicao">("lista");
    const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("geral");
    const [produtoEditando, setProdutoEditando] = useState<ProdutoDb | null>(null);

    const { empresas } = useEmpresas(false);
    const { produtosDb, loading, salvarProduto, atualizarProduto, excluirProduto } = useEstoque(unidadeSelecionada);
    const { mensagem, sucesso, erro } = useFeedback();

    const [formLente, setFormLente] = useState<FormLente>({
        codigo: "", nome: "", tipo: "Monofocal", marca: "", material: "CR-39",
        quantidade: "", precoUnitario: "", precoCusto: "", ncm: "", cest: "", origem: "0",
    });

    const [formArmacao, setFormArmacao] = useState<FormArmacao>({
        codigo: "", nome: "", marca: "", modelo: "", cor: "",
        quantidade: "", precoUnitario: "", precoCusto: "", ncm: "", cest: "", origem: "0",
    });

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

    const handleSalvarLente = async () => {
        if (!formLente.codigo || !formLente.nome || !formLente.marca) {
            erro("PREENCHA OS CAMPOS OBRIGATÓRIOS");
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

        const { error } = await salvarProduto(dados);
        if (!error) {
            resetForms();
            setModo("lista");
            sucesso("LENTE CADASTRADA COM SUCESSO");
        } else {
            erro("ERRO AO SALVAR: " + error.message);
        }
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

        const { error } = await atualizarProduto(produtoEditando.id, dados);
        if (!error) {
            resetForms();
            setModo("lista");
            sucesso("LENTE ATUALIZADA COM SUCESSO");
        } else {
            erro("ERRO AO ATUALIZAR: " + error.message);
        }
    };

    const handleSalvarArmacao = async () => {
        if (!formArmacao.codigo || !formArmacao.nome || !formArmacao.marca) {
            erro("PREENCHA OS CAMPOS OBRIGATÓRIOS");
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

        const { error } = await salvarProduto(dados);
        if (!error) {
            resetForms();
            setModo("lista");
            sucesso("ARMAÇÃO CADASTRADA COM SUCESSO");
        } else {
            erro("ERRO AO SALVAR: " + error.message);
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

        const { error } = await atualizarProduto(produtoEditando.id, dados);
        if (!error) {
            resetForms();
            setModo("lista");
            sucesso("ARMAÇÃO ATUALIZADA COM SUCESSO");
        } else {
            erro("ERRO AO ATUALIZAR: " + error.message);
        }
    };

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

    const handleExcluir = async (produto: ProdutoDb) => {
        if (!confirm(`Deseja realmente excluir "${produto.nome}"?`)) return;

        const { error } = await excluirProduto(produto.id);
        if (!error) {
            sucesso("PRODUTO EXCLUÍDO COM SUCESSO");
        } else {
            erro("ERRO AO EXCLUIR: " + error.message);
        }
    };

    const lentes = produtosDb.filter(p => p.tipo === 'lente');
    const armacoes = produtosDb.filter(p => p.tipo === 'armacao');

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
            <div className="h-full flex flex-col relative">
                {loading && modo === "lista" && <LoadingOverlay message="CARREGANDO ESTOQUE..." />}

                <PageHeader
                    title="ESTOQUE"
                    subtitle="Gerenciamento de produtos"
                    rightContent={
                        <>
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
                        </>
                    }
                >
                    <UnitSelector
                        label="UNIDADE EXIBIDA"
                        empresas={empresas}
                        value={unidadeSelecionada}
                        onChange={setUnidadeSelecionada}
                        allLabel="ESTOQUE GERAL (TODAS)"
                    />
                </PageHeader>

                <FeedbackMessage mensagem={mensagem} />

                <div className="flex-1 min-h-0 mt-2">
                    {modo === "lista" ? (
                        <div className="flex flex-col h-full">
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

                            <div className="flex-1 overflow-auto">
                                <EstoqueTabela
                                    produtos={tab === "lentes" ? lentes : armacoes}
                                    onEditar={handleEditar}
                                    onExcluir={handleExcluir}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-6 pb-6 overflow-y-auto h-full">
                            <EstoqueLenteForm
                                form={formLente}
                                setForm={setFormLente}
                                onSave={modo === "edicao" && produtoEditando?.tipo === "lente" ? handleAtualizarLente : handleSalvarLente}
                                isEdicao={modo === "edicao" && produtoEditando?.tipo === "lente"}
                            />
                            <EstoqueArmacaoForm
                                form={formArmacao}
                                setForm={setFormArmacao}
                                onSave={modo === "edicao" && produtoEditando?.tipo === "armacao" ? handleAtualizarArmacao : handleSalvarArmacao}
                                isEdicao={modo === "edicao" && produtoEditando?.tipo === "armacao"}
                            />
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
