"use client";

import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { calcularStatusEstoque } from "@/data/vendasData";
import { supabase } from "@/lib/supabase";
import { imprimirRelatorioTransferencia } from "@/utils/reportUtils";

import { useEstoque, ProdutoDb } from "@/hooks/useEstoque";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useFeedback } from "@/hooks/useFeedback";
import { useTransferencias, Transferencia, NovaTransferenciaItem } from "@/hooks/useTransferencias";

import PageHeader from "@/components/ui/PageHeader";
import FeedbackMessage from "@/components/ui/FeedbackMessage";
import UnitSelector from "@/components/ui/UnitSelector";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import { EstoqueTabela } from "@/components/estoque/EstoqueTabela";
import { EstoqueLenteForm, EstoqueArmacaoForm, FormLente, FormArmacao } from "@/components/estoque/EstoqueForms";
import { TransferenciaTabela } from "@/components/estoque/TransferenciaTabela";

export default function EstoquePage() {
    const [tab, setTab] = useState<"lentes" | "armacoes" | "transferencias">("lentes");
    const [modo, setModo] = useState<"lista" | "cadastro" | "edicao" | "nova_transferencia" | "confirmar_recebimento" | "detalhes_transferencia" | "cancelar_transferencia">("lista");
    const [unidadeSelecionada, setUnidadeSelecionada] = useState<string>("geral");
    const [produtoEditando, setProdutoEditando] = useState<ProdutoDb | null>(null);

    const { empresas } = useEmpresas(false);
    const { produtosDb, loading, depositoCentral, salvarProduto, atualizarProduto, excluirProduto, trocarDepositoCentral } = useEstoque(unidadeSelecionada);
    const { mensagem, sucesso, erro } = useFeedback();
    const { transferencias, loading: loadingTransf, criarTransferencia, buscarPorProtocolo, confirmarRecebimento, cancelarTransferencia, marcarEnviado } = useTransferencias(unidadeSelecionada);

    // Transferência state
    const [transfDestinoId, setTransfDestinoId] = useState("");
    const [transfObs, setTransfObs] = useState("");
    const [transfItens, setTransfItens] = useState<{ produtoId: string; nome: string; quantidade: number; max: number }[]>([]);
    const [transfSelecionada, setTransfSelecionada] = useState<Transferencia | null>(null);

    // Confirmação state
    const [codigoProtocolo, setCodigoProtocolo] = useState("");
    const [transferenciaConfirmando, setTransferenciaConfirmando] = useState<Transferencia | null>(null);
    const [itensConfirmacao, setItensConfirmacao] = useState<{ itemId: string; nome: string; qtdEnviada: number; qtdRecebida: number }[]>([]);
    const [motivoParcial, setMotivoParcial] = useState("");
    const [motivoCancelamento, setMotivoCancelamento] = useState("");

    const [formLente, setFormLente] = useState<FormLente>({
        codigo: "", nome: "", tipo: "Monofocal", marca: "", material: "CR-39",
        quantidade: "", precoUnitario: "", precoCusto: "", ncm: "", cest: "", origem: "0",
    });

    const [formArmacao, setFormArmacao] = useState<FormArmacao>({
        codigo: "", nome: "", marca: "", modelo: "", cor: "",
        quantidade: "", precoUnitario: "", precoCusto: "", ncm: "", cest: "", origem: "0",
    });

    const resetForms = () => {
        setFormLente({ codigo: "", nome: "", tipo: "Monofocal", marca: "", material: "CR-39", quantidade: "", precoUnitario: "", precoCusto: "", ncm: "", cest: "", origem: "0" });
        setFormArmacao({ codigo: "", nome: "", marca: "", modelo: "", cor: "", quantidade: "", precoUnitario: "", precoCusto: "", ncm: "", cest: "", origem: "0" });
        setProdutoEditando(null);
    };

    const resetTransferencia = () => {
        setTransfDestinoId("");
        setTransfObs("");
        setTransfItens([]);
        setTransfSelecionada(null);
        setCodigoProtocolo("");
        setTransferenciaConfirmando(null);
        setItensConfirmacao([]);
        setMotivoParcial("");
        setMotivoCancelamento("");
    };

    // === Handlers de Produto (mantidos iguais) ===

    const handleSalvarLente = async () => {
        if (!formLente.codigo || !formLente.nome || !formLente.marca) {
            erro("PREENCHA OS CAMPOS OBRIGATÓRIOS");
            return;
        }
        const empresaId = depositoCentral?.id || parseInt(unidadeSelecionada) || 1;
        const dados = {
            codigo: formLente.codigo, nome: formLente.nome, marca: formLente.marca, tipo: 'lente',
            quantidade: parseInt(formLente.quantidade) || 0,
            preco_unitario: parseFloat(formLente.precoUnitario) || 0,
            preco_custo: parseFloat(formLente.precoCusto) || 0,
            ncm: formLente.ncm, cest: formLente.cest, origem: parseInt(formLente.origem),
            empresa_id: unidadeSelecionada === "geral" ? empresaId : parseInt(unidadeSelecionada),
            ativo: true,
        };
        const { error } = await salvarProduto(dados);
        if (!error) { resetForms(); setModo("lista"); sucesso("LENTE CADASTRADA COM SUCESSO"); }
        else { erro("ERRO AO SALVAR: " + error.message); }
    };

    const handleAtualizarLente = async () => {
        if (!produtoEditando) return;
        const dados = {
            codigo: formLente.codigo, nome: formLente.nome, marca: formLente.marca,
            quantidade: parseInt(formLente.quantidade) || 0,
            preco_unitario: parseFloat(formLente.precoUnitario) || 0,
            preco_custo: parseFloat(formLente.precoCusto) || 0,
            ncm: formLente.ncm, cest: formLente.cest, origem: parseInt(formLente.origem),
        };
        const { error } = await atualizarProduto(produtoEditando.id, dados);
        if (!error) { resetForms(); setModo("lista"); sucesso("LENTE ATUALIZADA COM SUCESSO"); }
        else { erro("ERRO AO ATUALIZAR: " + error.message); }
    };

    const handleSalvarArmacao = async () => {
        if (!formArmacao.codigo || !formArmacao.nome || !formArmacao.marca) {
            erro("PREENCHA OS CAMPOS OBRIGATÓRIOS");
            return;
        }
        const empresaId = depositoCentral?.id || parseInt(unidadeSelecionada) || 1;
        const dados = {
            codigo: formArmacao.codigo, nome: formArmacao.nome, marca: formArmacao.marca,
            tipo: 'armacao', descricao: formArmacao.modelo,
            quantidade: parseInt(formArmacao.quantidade) || 0,
            preco_unitario: parseFloat(formArmacao.precoUnitario) || 0,
            preco_custo: parseFloat(formArmacao.precoCusto) || 0,
            ncm: formArmacao.ncm, cest: formArmacao.cest, origem: parseInt(formArmacao.origem),
            empresa_id: unidadeSelecionada === "geral" ? empresaId : parseInt(unidadeSelecionada),
            ativo: true,
        };
        const { error } = await salvarProduto(dados);
        if (!error) { resetForms(); setModo("lista"); sucesso("ARMAÇÃO CADASTRADA COM SUCESSO"); }
        else { erro("ERRO AO SALVAR: " + error.message); }
    };

    const handleAtualizarArmacao = async () => {
        if (!produtoEditando) return;
        const dados = {
            codigo: formArmacao.codigo, nome: formArmacao.nome, marca: formArmacao.marca,
            descricao: formArmacao.modelo,
            quantidade: parseInt(formArmacao.quantidade) || 0,
            preco_unitario: parseFloat(formArmacao.precoUnitario) || 0,
            preco_custo: parseFloat(formArmacao.precoCusto) || 0,
            ncm: formArmacao.ncm, cest: formArmacao.cest, origem: parseInt(formArmacao.origem),
        };
        const { error } = await atualizarProduto(produtoEditando.id, dados);
        if (!error) { resetForms(); setModo("lista"); sucesso("ARMAÇÃO ATUALIZADA COM SUCESSO"); }
        else { erro("ERRO AO ATUALIZAR: " + error.message); }
    };

    const handleEditar = (produto: ProdutoDb) => {
        setProdutoEditando(produto);
        if (produto.tipo === 'lente') {
            setFormLente({
                codigo: produto.codigo || "", nome: produto.nome, tipo: "Monofocal",
                marca: produto.marca || "", material: "CR-39",
                quantidade: produto.quantidade.toString(),
                precoUnitario: produto.preco_unitario.toString(),
                precoCusto: (produto.preco_custo || 0).toString(),
                ncm: produto.ncm || "", cest: produto.cest || "",
                origem: (produto.origem || 0).toString(),
            });
            setTab("lentes");
        } else {
            setFormArmacao({
                codigo: produto.codigo || "", nome: produto.nome,
                marca: produto.marca || "", modelo: produto.descricao || "", cor: "",
                quantidade: produto.quantidade.toString(),
                precoUnitario: produto.preco_unitario.toString(),
                precoCusto: (produto.preco_custo || 0).toString(),
                ncm: produto.ncm || "", cest: produto.cest || "",
                origem: (produto.origem || 0).toString(),
            });
            setTab("armacoes");
        }
        setModo("edicao");
    };

    const handleExcluir = async (produto: ProdutoDb) => {
        if (!confirm(`Deseja realmente excluir "${produto.nome}"?`)) return;
        const { error } = await excluirProduto(produto.id);
        if (!error) { sucesso("PRODUTO EXCLUÍDO COM SUCESSO"); }
        else { erro("ERRO AO EXCLUIR: " + error.message); }
    };

    // === Handlers de Transferência ===

    const handleNovaTransferencia = async () => {
        if (!depositoCentral) { erro("NENHUM DEPÓSITO CENTRAL CONFIGURADO"); return; }

        // Buscar produtos do depósito central direto do banco (independente do filtro de unidade)
        const { data: produtosDeposito, error: errProd } = await supabase
            .from("produtos")
            .select("id, nome, marca, quantidade")
            .eq("empresa_id", depositoCentral.id)
            .eq("ativo", true)
            .gt("quantidade", 0)
            .order("nome");

        if (errProd || !produtosDeposito || produtosDeposito.length === 0) {
            erro("NENHUM PRODUTO DISPONÍVEL NO DEPÓSITO CENTRAL");
            return;
        }

        setTransfItens(produtosDeposito.map(p => ({ produtoId: p.id, nome: `${p.nome} (${p.marca})`, quantidade: 0, max: p.quantidade })));
        setModo("nova_transferencia");
    };

    const handleCriarTransferencia = async () => {
        if (!transfDestinoId) { erro("SELECIONE A LOJA DE DESTINO"); return; }
        if (!depositoCentral) return;

        const itensSelecionados = transfItens.filter(i => i.quantidade > 0);
        if (itensSelecionados.length === 0) { erro("SELECIONE AO MENOS 1 PRODUTO COM QUANTIDADE"); return; }

        const itens: NovaTransferenciaItem[] = itensSelecionados.map(i => ({ produto_id: i.produtoId, quantidade: i.quantidade }));
        const result = await criarTransferencia(depositoCentral.id, parseInt(transfDestinoId), itens, transfObs);

        if (!result.error) {
            sucesso(`TRANSFERÊNCIA CRIADA — PROTOCOLO TRAN-${String(result.protocolo).padStart(4, "0")}`);
            resetTransferencia();
            setModo("lista");
        } else {
            erro("ERRO AO CRIAR TRANSFERÊNCIA: " + result.error.message);
        }
    };

    const handleBuscarProtocolo = async () => {
        const num = parseInt(codigoProtocolo);
        if (!num) { erro("INSIRA UM NÚMERO DE PROTOCOLO VÁLIDO"); return; }
        const { data, error } = await buscarPorProtocolo(num);
        if (error || !data) { erro("PROTOCOLO NÃO ENCONTRADO"); return; }
        if (data.status !== "em_transito") { erro(`TRANSFERÊNCIA COM STATUS "${data.status.toUpperCase()}" — SÓ É POSSÍVEL CONFIRMAR TRANSFERÊNCIAS EM TRÂNSITO`); return; }
        setTransferenciaConfirmando(data);
        setItensConfirmacao(
            (data.itens || []).map(i => ({
                itemId: i.id, nome: i.produto?.nome || "—",
                qtdEnviada: i.quantidade_enviada, qtdRecebida: i.quantidade_enviada,
            }))
        );
    };

    const handleConfirmarRecebimento = async () => {
        if (!transferenciaConfirmando) return;
        const parcial = itensConfirmacao.some(i => i.qtdRecebida < i.qtdEnviada);
        if (parcial && !motivoParcial.trim()) { erro("INFORME O MOTIVO DO RECEBIMENTO PARCIAL"); return; }

        const itensParaConfirmar = itensConfirmacao.map(i => ({ itemId: i.itemId, quantidadeRecebida: i.qtdRecebida }));
        const { error } = await confirmarRecebimento(transferenciaConfirmando.id, itensParaConfirmar, parcial, motivoParcial);

        if (!error) {
            sucesso(parcial ? "RECEBIMENTO PARCIAL CONFIRMADO" : "RECEBIMENTO TOTAL CONFIRMADO — ESTOQUE ATUALIZADO");
            resetTransferencia();
            setModo("lista");
        } else {
            erro("ERRO AO CONFIRMAR: " + (error as any).message);
        }
    };

    const handleEnviarTransferencia = async (id: string) => {
        const { error } = await marcarEnviado(id);
        if (!error) { sucesso("TRANSFERÊNCIA MARCADA COMO EM TRÂNSITO"); }
        else { erro("ERRO: " + error.message); }
    };

    const handleCancelarTransferencia = async () => {
        if (!transfSelecionada) return;
        if (!motivoCancelamento.trim()) { erro("INFORME O MOTIVO DO CANCELAMENTO"); return; }
        const { error } = await cancelarTransferencia(transfSelecionada.id, motivoCancelamento);
        if (!error) { sucesso("TRANSFERÊNCIA CANCELADA"); resetTransferencia(); setModo("lista"); }
        else { erro("ERRO: " + error.message); }
    };

    const lentes = produtosDb.filter(p => p.tipo === 'lente');
    const armacoes = produtosDb.filter(p => p.tipo === 'armacao');
    const lojasDisponiveis = empresas.filter(e => !(e as any).is_deposito_central);

    const getTotais = () => {
        const totalLentes = lentes.reduce((acc, l) => acc + l.quantidade, 0);
        const totalArmacoes = armacoes.reduce((acc, a) => acc + a.quantidade, 0);
        const lentesOk = lentes.filter(l => calcularStatusEstoque(l.quantidade) === "disponivel").length;
        const lentesBaixo = lentes.filter(l => calcularStatusEstoque(l.quantidade) === "baixo").length;
        const lentesCritico = lentes.filter(l => calcularStatusEstoque(l.quantidade) === "critico").length;
        const armacoesOk = armacoes.filter(a => calcularStatusEstoque(a.quantidade) === "disponivel").length;
        const armacoesBaixo = armacoes.filter(a => calcularStatusEstoque(a.quantidade) === "baixo").length;
        const armacoesCritico = armacoes.filter(a => calcularStatusEstoque(a.quantidade) === "critico").length;
        return { totalLentes, totalArmacoes, lentesOk, lentesBaixo, lentesCritico, armacoesOk, armacoesBaixo, armacoesCritico };
    };

    const totais = getTotais();
    const transfPendentes = transferencias.filter(t => t.status === "pendente" || t.status === "em_transito").length;

    const getActionButton = () => {
        if (tab === "transferencias" && modo === "lista") {
            return (
                <div className="flex gap-2">
                    <button
                        onClick={() => { resetTransferencia(); setModo("confirmar_recebimento"); }}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                    >
                        CONFIRMAR RECEBIMENTO
                    </button>
                    <button
                        onClick={handleNovaTransferencia}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                    >
                        + NOVA TRANSFERÊNCIA
                    </button>
                </div>
            );
        }
        if (modo !== "lista") {
            return (
                <button
                    onClick={() => { resetForms(); resetTransferencia(); setModo("lista"); }}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                >
                    ← VOLTAR
                </button>
            );
        }
        return (
            <button
                onClick={() => { resetForms(); setModo("cadastro"); }}
                className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
                + NOVO PRODUTO
            </button>
        );
    };

    return (
        <MainLayout>
            <div className="h-full flex flex-col relative">
                {(loading || loadingTransf) && modo === "lista" && <LoadingOverlay message="CARREGANDO ESTOQUE..." />}

                <PageHeader
                    title="ESTOQUE"
                    subtitle={depositoCentral ? `Depósito: ${depositoCentral.cidade}` : "Gerenciamento de produtos"}
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
                                {transfPendentes > 0 && (
                                    <>
                                        <div className="h-8 w-px bg-gray-700"></div>
                                        <div className="text-center">
                                            <div className="text-gray-500 text-xs">PENDENTES</div>
                                            <div className="text-yellow-500 font-mono">{transfPendentes}</div>
                                        </div>
                                    </>
                                )}
                                <div className="h-8 w-px bg-gray-700"></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-500 font-mono" title="Disponível">{totais.lentesOk + totais.armacoesOk}</span>
                                    <span className="text-yellow-500 font-mono" title="Baixo Estoque">{totais.lentesBaixo + totais.armacoesBaixo}</span>
                                    <span className="text-red-500 font-mono" title="Crítico">{totais.lentesCritico + totais.armacoesCritico}</span>
                                </div>
                            </div>
                            {getActionButton()}
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
                    <div className="ml-6">
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                            DEPÓSITO CENTRAL (CNPJ)
                        </div>
                        <select
                            value={depositoCentral?.id || ""}
                            onChange={async (e) => {
                                const novoId = parseInt(e.target.value);
                                if (!novoId) return;
                                const { error } = await trocarDepositoCentral(novoId);
                                if (!error) { sucesso("DEPÓSITO CENTRAL ALTERADO COM SUCESSO"); }
                                else { erro("ERRO AO ALTERAR: " + error.message); }
                            }}
                            className="bg-transparent border-none text-sm font-bold text-cyan-400 p-0 focus:outline-none cursor-pointer hover:text-cyan-300 transition-all"
                        >
                            {depositoCentral && (
                                <option value={depositoCentral.id} className="bg-gray-900 text-cyan-400">
                                    {depositoCentral.cidade?.toUpperCase()} (ATUAL)
                                </option>
                            )}
                            {empresas.filter(e => e.id !== depositoCentral?.id).map(emp => (
                                <option key={emp.id} value={emp.id} className="bg-gray-900 text-white">
                                    {emp.nome_fantasia.toUpperCase()} — {emp.cidade?.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>
                </PageHeader>

                <FeedbackMessage mensagem={mensagem} />

                <div className="flex-1 min-h-0 mt-2">
                    {/* === MODO LISTA === */}
                    {modo === "lista" && (
                        <div className="flex flex-col h-full">
                            <div className="flex border-b border-gray-800 mb-4">
                                <button
                                    onClick={() => setTab("lentes")}
                                    className={`px-6 py-2 text-sm font-medium ${tab === "lentes" ? "bg-gray-800 text-white border-b-2 border-green-500" : "text-gray-400 hover:text-white"}`}
                                >
                                    LENTES ({lentes.length})
                                </button>
                                <button
                                    onClick={() => setTab("armacoes")}
                                    className={`px-6 py-2 text-sm font-medium ${tab === "armacoes" ? "bg-gray-800 text-white border-b-2 border-green-500" : "text-gray-400 hover:text-white"}`}
                                >
                                    ARMAÇÕES ({armacoes.length})
                                </button>
                                <button
                                    onClick={() => setTab("transferencias")}
                                    className={`px-6 py-2 text-sm font-medium ${tab === "transferencias" ? "bg-gray-800 text-white border-b-2 border-cyan-500" : "text-gray-400 hover:text-white"}`}
                                >
                                    TRANSFERÊNCIAS ({transferencias.length})
                                    {transfPendentes > 0 && (
                                        <span className="ml-2 text-xs text-yellow-500">● {transfPendentes}</span>
                                    )}
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto">
                                {tab === "transferencias" ? (
                                    <TransferenciaTabela
                                        transferencias={transferencias}
                                        onEnviar={handleEnviarTransferencia}
                                        onConfirmar={(t) => {
                                            setTransferenciaConfirmando(t);
                                            setItensConfirmacao(
                                                (t.itens || []).map(i => ({
                                                    itemId: i.id, nome: i.produto?.nome || "—",
                                                    qtdEnviada: i.quantidade_enviada, qtdRecebida: i.quantidade_enviada,
                                                }))
                                            );
                                            setModo("confirmar_recebimento");
                                        }}
                                        onCancelar={(t) => { setTransfSelecionada(t); setModo("cancelar_transferencia"); }}
                                        onDetalhes={(t) => { setTransfSelecionada(t); setModo("detalhes_transferencia"); }}
                                    />
                                ) : (
                                    <EstoqueTabela
                                        produtos={tab === "lentes" ? lentes : armacoes}
                                        onEditar={handleEditar}
                                        onExcluir={handleExcluir}
                                        mostrarLoja={unidadeSelecionada === "geral"}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* === CADASTRO/EDIÇÃO DE PRODUTO === */}
                    {(modo === "cadastro" || modo === "edicao") && (
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

                    {/* === NOVA TRANSFERÊNCIA (inline) === */}
                    {modo === "nova_transferencia" && (
                        <div className="overflow-y-auto h-full pb-6">
                            <div className="bg-gray-800/50 border border-gray-700 p-6 mb-6">
                                <h3 className="text-white text-sm font-bold mb-4">NOVA TRANSFERÊNCIA DO DEPÓSITO CENTRAL</h3>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">ORIGEM</label>
                                        <div className="text-sm text-cyan-400 font-mono">DEPÓSITO CENTRAL — {depositoCentral?.cidade?.toUpperCase()}</div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">DESTINO *</label>
                                        <select
                                            value={transfDestinoId}
                                            onChange={(e) => setTransfDestinoId(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-green-500"
                                        >
                                            <option value="">SELECIONE A LOJA</option>
                                            {lojasDisponiveis.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.nome_fantasia.toUpperCase()} — {emp.cidade?.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">OBSERVAÇÕES</label>
                                    <input
                                        value={transfObs}
                                        onChange={(e) => setTransfObs(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-green-500"
                                        placeholder="Observações opcionais..."
                                    />
                                </div>
                            </div>

                            <div className="bg-gray-800/50 border border-gray-700 p-6 mb-6">
                                <h4 className="text-white text-sm font-bold mb-4">SELECIONE OS PRODUTOS E QUANTIDADES</h4>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-xs text-gray-500 border-b border-gray-800">
                                            <th className="text-left py-2 px-3">PRODUTO</th>
                                            <th className="text-center py-2 px-3">DISPONÍVEL</th>
                                            <th className="text-center py-2 px-3">ENVIAR</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transfItens.map((item, idx) => (
                                            <tr key={item.produtoId} className="border-b border-gray-800/50">
                                                <td className="py-2 px-3 text-white">{item.nome}</td>
                                                <td className="py-2 px-3 text-center font-mono text-gray-400">{item.max}</td>
                                                <td className="py-2 px-3 text-center">
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={item.max}
                                                        value={item.quantidade}
                                                        onChange={(e) => {
                                                            const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), item.max);
                                                            setTransfItens(prev => prev.map((it, i) => i === idx ? { ...it, quantidade: val } : it));
                                                        }}
                                                        className="w-20 bg-gray-900 border border-gray-700 text-white text-sm px-2 py-1 text-center font-mono focus:outline-none focus:border-green-500"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                onClick={handleCriarTransferencia}
                                className="px-6 py-2 bg-gray-800 border border-gray-700 text-sm font-bold text-white hover:bg-gray-700 transition-colors"
                            >
                                CRIAR TRANSFERÊNCIA
                            </button>
                        </div>
                    )}

                    {/* === CONFIRMAR RECEBIMENTO (inline) === */}
                    {modo === "confirmar_recebimento" && (
                        <div className="overflow-y-auto h-full pb-6">
                            {!transferenciaConfirmando ? (
                                <div className="bg-gray-800/50 border border-gray-700 p-6">
                                    <h3 className="text-white text-sm font-bold mb-4">CONFIRMAR RECEBIMENTO</h3>
                                    <label className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">NÚMERO DO PROTOCOLO</label>
                                    <div className="flex gap-3 items-center">
                                        <span className="text-gray-500 text-sm font-mono">TRAN-</span>
                                        <input
                                            value={codigoProtocolo}
                                            onChange={(e) => setCodigoProtocolo(e.target.value.replace(/\D/g, ""))}
                                            className="w-32 bg-gray-900 border border-gray-700 text-white text-sm px-3 py-2 font-mono focus:outline-none focus:border-green-500"
                                            placeholder="0001"
                                        />
                                        <button
                                            onClick={handleBuscarProtocolo}
                                            className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                                        >
                                            BUSCAR
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-gray-800/50 border border-gray-700 p-6 mb-6">
                                        <h3 className="text-white text-sm font-bold mb-4">
                                            PROTOCOLO TRAN-{String(transferenciaConfirmando.numero_protocolo).padStart(4, "0")}
                                        </h3>
                                        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                                            <div>
                                                <span className="text-gray-500 text-xs">ORIGEM</span>
                                                <div className="text-cyan-400">{transferenciaConfirmando.empresa_origem?.cidade?.toUpperCase()}</div>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 text-xs">DESTINO</span>
                                                <div className="text-white">{transferenciaConfirmando.empresa_destino?.cidade?.toUpperCase()}</div>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 text-xs">DATA ENVIO</span>
                                                <div className="text-gray-400">{transferenciaConfirmando.data_envio ? new Date(transferenciaConfirmando.data_envio).toLocaleDateString("pt-BR") : "—"}</div>
                                            </div>
                                        </div>

                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-xs text-gray-500 border-b border-gray-800">
                                                    <th className="text-left py-2 px-3">PRODUTO</th>
                                                    <th className="text-center py-2 px-3">ENVIADO</th>
                                                    <th className="text-center py-2 px-3">RECEBIDO</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itensConfirmacao.map((item, idx) => (
                                                    <tr key={item.itemId} className="border-b border-gray-800/50">
                                                        <td className="py-2 px-3 text-white">{item.nome}</td>
                                                        <td className="py-2 px-3 text-center font-mono text-gray-400">{item.qtdEnviada}</td>
                                                        <td className="py-2 px-3 text-center">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={item.qtdEnviada}
                                                                value={item.qtdRecebida}
                                                                onChange={(e) => {
                                                                    const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), item.qtdEnviada);
                                                                    setItensConfirmacao(prev => prev.map((it, i) => i === idx ? { ...it, qtdRecebida: val } : it));
                                                                }}
                                                                className="w-20 bg-gray-900 border border-gray-700 text-white text-sm px-2 py-1 text-center font-mono focus:outline-none focus:border-green-500"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {itensConfirmacao.some(i => i.qtdRecebida < i.qtdEnviada) && (
                                        <div className="bg-gray-800/50 border border-yellow-500/30 p-6 mb-6">
                                            <label className="block text-[10px] text-yellow-500 uppercase font-bold tracking-wider mb-1">MOTIVO DO RECEBIMENTO PARCIAL *</label>
                                            <textarea
                                                value={motivoParcial}
                                                onChange={(e) => setMotivoParcial(e.target.value)}
                                                className="w-full bg-gray-900 border border-gray-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-yellow-500 min-h-[80px]"
                                                placeholder="Descreva o motivo do recebimento parcial..."
                                            />
                                        </div>
                                    )}

                                    <button
                                        onClick={handleConfirmarRecebimento}
                                        className="px-6 py-2 bg-gray-800 border border-gray-700 text-sm font-bold text-white hover:bg-gray-700 transition-colors"
                                    >
                                        CONFIRMAR RECEBIMENTO
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* === CANCELAR TRANSFERÊNCIA (inline) === */}
                    {modo === "cancelar_transferencia" && transfSelecionada && (
                        <div className="overflow-y-auto h-full pb-6">
                            <div className="bg-gray-800/50 border border-red-500/30 p-6 mb-6">
                                <h3 className="text-white text-sm font-bold mb-4">
                                    CANCELAR TRAN-{String(transfSelecionada.numero_protocolo).padStart(4, "0")}
                                </h3>
                                <p className="text-gray-400 text-sm mb-4">
                                    Destino: {transfSelecionada.empresa_destino?.cidade?.toUpperCase()} — {transfSelecionada.itens?.length || 0} itens
                                </p>
                                <label className="block text-[10px] text-red-500 uppercase font-bold tracking-wider mb-1">MOTIVO DO CANCELAMENTO *</label>
                                <textarea
                                    value={motivoCancelamento}
                                    onChange={(e) => setMotivoCancelamento(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 text-white text-sm px-3 py-2 focus:outline-none focus:border-red-500 min-h-[80px]"
                                    placeholder="Descreva o motivo do cancelamento..."
                                />
                            </div>
                            <button
                                onClick={handleCancelarTransferencia}
                                className="px-6 py-2 bg-red-900/50 border border-red-500/30 text-sm font-bold text-red-400 hover:bg-red-900 transition-colors"
                            >
                                CONFIRMAR CANCELAMENTO
                            </button>
                        </div>
                    )}

                    {/* === DETALHES DA TRANSFERÊNCIA (inline) === */}
                    {modo === "detalhes_transferencia" && transfSelecionada && (
                        <div className="overflow-y-auto h-full pb-6">
                            <div className="bg-gray-800/50 border border-gray-700 p-6">
                                <h3 className="text-white text-sm font-bold mb-4">
                                    DETALHES — TRAN-{String(transfSelecionada.numero_protocolo).padStart(4, "0")}
                                </h3>
                                <div className="grid grid-cols-4 gap-4 text-sm mb-6">
                                    <div>
                                        <span className="text-gray-500 text-xs">ORIGEM</span>
                                        <div className="text-cyan-400">{transfSelecionada.empresa_origem?.cidade?.toUpperCase() || "—"}</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-xs">DESTINO</span>
                                        <div className="text-white">{transfSelecionada.empresa_destino?.cidade?.toUpperCase() || "—"}</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-xs">STATUS</span>
                                        <div className="text-white">{transfSelecionada.status.toUpperCase().replace("_", " ")}</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-xs">DATA</span>
                                        <div className="text-gray-400">{new Date(transfSelecionada.data_criacao).toLocaleDateString("pt-BR")}</div>
                                    </div>
                                </div>
                                {transfSelecionada.observacoes && (
                                    <div className="mb-4">
                                        <span className="text-gray-500 text-xs">OBSERVAÇÕES</span>
                                        <div className="text-gray-300 text-sm">{transfSelecionada.observacoes}</div>
                                    </div>
                                )}
                                {transfSelecionada.motivo_parcial && (
                                    <div className="mb-4">
                                        <span className="text-yellow-500 text-xs">MOTIVO RECEBIMENTO PARCIAL</span>
                                        <div className="text-yellow-300 text-sm">{transfSelecionada.motivo_parcial}</div>
                                    </div>
                                )}
                                {transfSelecionada.motivo_cancelamento && (
                                    <div className="mb-4">
                                        <span className="text-red-500 text-xs">MOTIVO CANCELAMENTO</span>
                                        <div className="text-red-300 text-sm">{transfSelecionada.motivo_cancelamento}</div>
                                    </div>
                                )}
                                <table className="w-full text-sm mt-4">
                                    <thead>
                                        <tr className="text-xs text-gray-500 border-b border-gray-800">
                                            <th className="text-left py-2 px-3">PRODUTO</th>
                                            <th className="text-center py-2 px-3">ENVIADO</th>
                                            <th className="text-center py-2 px-3">RECEBIDO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(transfSelecionada.itens || []).map(item => (
                                            <tr key={item.id} className="border-b border-gray-800/50">
                                                <td className="py-2 px-3 text-white">{item.produto?.nome || "—"}</td>
                                                <td className="py-2 px-3 text-center font-mono text-gray-400">{item.quantidade_enviada}</td>
                                                <td className="py-2 px-3 text-center font-mono text-white">{item.quantidade_recebida ?? "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="mt-6">
                                    <button
                                        onClick={() => imprimirRelatorioTransferencia({
                                            protocolo: `TRAN-${String(transfSelecionada.numero_protocolo).padStart(4, "0")}`,
                                            status: transfSelecionada.status,
                                            origem: `${transfSelecionada.empresa_origem?.nome_fantasia?.toUpperCase() || "—"} — ${transfSelecionada.empresa_origem?.cidade?.toUpperCase() || ""}`,
                                            destino: `${transfSelecionada.empresa_destino?.nome_fantasia?.toUpperCase() || "—"} — ${transfSelecionada.empresa_destino?.cidade?.toUpperCase() || ""}`,
                                            dataCriacao: new Date(transfSelecionada.data_criacao).toLocaleDateString("pt-BR"),
                                            dataEnvio: transfSelecionada.data_envio ? new Date(transfSelecionada.data_envio).toLocaleDateString("pt-BR") : "",
                                            dataRecebimento: transfSelecionada.data_recebimento ? new Date(transfSelecionada.data_recebimento).toLocaleDateString("pt-BR") : "",
                                            operadorCriacao: "",
                                            operadorRecebimento: "",
                                            observacoes: transfSelecionada.observacoes || "",
                                            motivoParcial: transfSelecionada.motivo_parcial || "",
                                            motivoCancelamento: transfSelecionada.motivo_cancelamento || "",
                                            itens: (transfSelecionada.itens || []).map(i => ({
                                                codigo: i.produto?.codigo || "",
                                                nome: i.produto?.nome || "—",
                                                marca: i.produto?.marca || "",
                                                tipo: i.produto?.tipo || "",
                                                qtdEnviada: i.quantidade_enviada,
                                                qtdRecebida: i.quantidade_recebida,
                                            })),
                                        })}
                                        className="px-6 py-2 bg-gray-800 border border-gray-700 text-sm font-bold text-white hover:bg-gray-700 transition-colors"
                                    >
                                        IMPRIMIR PROTOCOLO
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
