"use client";

import { useState, useEffect, useMemo } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";

interface Empresa {
    id: number;
    nome_fantasia: string;
    cidade?: string;
}

interface Categoria {
    id: number;
    nome: string;
}

interface ContaPagamento {
    id: number;
    nome: string;
    tipo: string;
    saldo_inicial: number;
    ativo: boolean;
    extrato_contas?: { tipo: "entrada" | "saida"; valor: number }[];
}

interface ExtratoTransacao {
    id: number;
    conta_id: number;
    tipo: "entrada" | "saida";
    valor: number;
    descricao: string;
    data_transacao: string;
    referencia_tipo: string | null;
    referencia_id: number | null;
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
    competencia: string | null;
    valor_pago: number | null;
    recorrencia_grupo_id: string | null;
    conta_pagamento_id: number | null;
    empresas?: Empresa;
    categorias?: Categoria;
    contas_pagamento?: ContaPagamento;
}

export default function DespesasFixasPage() {
    const [despesas, setDespesas] = useState<DespesaFixa[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [sugestoesCredores, setSugestoesCredores] = useState<string[]>([]);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

    // Estados da aba de Contas de Pagamento
    const [abaAtiva, setAbaAtiva] = useState<"despesas" | "contas">("despesas");
    const [contas, setContas] = useState<ContaPagamento[]>([]);
    const [showFormConta, setShowFormConta] = useState(false);
    const [formConta, setFormConta] = useState({ nome: "", tipo: "banco", saldo_inicial: "" });
    const [editandoContaId, setEditandoContaId] = useState<number | null>(null);

    // Estados do extrato da conta selecionada
    const [contaSelecionadaId, setContaSelecionadaId] = useState<number | null>(null);
    const [extrato, setExtrato] = useState<ExtratoTransacao[]>([]);
    const [loadingExtrato, setLoadingExtrato] = useState(false);
    const [formTransacao, setFormTransacao] = useState({
        descricao: "",
        valor: "",
        tipo: "entrada",
        data_transacao: new Date().toISOString().split("T")[0]
    });

    // Estados para o fluxo de pagamento inline
    const [pagandoId, setPagandoId] = useState<number | null>(null);
    const [pagandoValor, setPagandoValor] = useState<string>("");
    const [pagandoContaId, setPagandoContaId] = useState<string>("");
    const [excluindoId, setExcluindoId] = useState<number | null>(null);

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
        competencia: new Date().toISOString().slice(0, 7),
    });

    const [recorrente, setRecorrente] = useState(false);

    const [mostrarSugestoesCredor, setMostrarSugestoesCredor] = useState(false);

    const filteredCredores = useMemo(() => {
        if (!form.credor || form.credor.trim().length < 1) return [];
        const term = form.credor.toLowerCase();
        return sugestoesCredores.filter((c) => c.toLowerCase().includes(term)).slice(0, 8);
    }, [form.credor, sugestoesCredores]);

    const fetchSugestoesCredores = async () => {
        const { data } = await supabase.from("despesas_fixas").select("credor");
        if (data) {
            const unique = Array.from(new Set(data.map((d: { credor: string | null }) => d.credor).filter(Boolean))) as string[];
            unique.sort((a, b) => a.localeCompare(b));
            setSugestoesCredores(unique);
        }
    };

    const fetchContas = async () => {
        const { data } = await supabase.from("contas_pagamento").select("*, extrato_contas(tipo, valor)").eq("ativo", true).order("nome");
        if (data) setContas(data as ContaPagamento[]);
    };

    const fetchExtrato = async (contaId: number) => {
        setLoadingExtrato(true);
        const { data, error } = await supabase
            .from("extrato_contas")
            .select("*")
            .eq("conta_id", contaId)
            .order("data_transacao", { ascending: false })
            .order("id", { ascending: false });
        if (!error && data) {
            setExtrato(data as ExtratoTransacao[]);
        }
        setLoadingExtrato(false);
    };

    useEffect(() => {
        if (contaSelecionadaId !== null) {
            fetchExtrato(contaSelecionadaId);
        } else {
            setExtrato([]);
        }
    }, [contaSelecionadaId]);

    const fetchRefs = async () => {
        const [empRes, catRes] = await Promise.all([
            supabase.from("empresas").select("id, nome_fantasia, cidade").eq("ativo", true).order("cidade"),
            supabase.from("categorias").select("*").eq("tipo", "fixa").order("nome"),
        ]);
        if (empRes.data) setEmpresas(empRes.data);
        if (catRes.data) setCategorias(catRes.data);
        fetchSugestoesCredores();
        fetchContas();
    };

    const fetchData = async () => {
        setLoading(true);
        let query = supabase.from("despesas_fixas").select("*, empresas(id, nome_fantasia, cidade), categorias(id, nome), contas_pagamento(id, nome)").order("data_vencimento", { ascending: false });

        if (filtros.empresa_id) query = query.eq("empresa_id", parseInt(filtros.empresa_id));
        if (filtros.status !== "todos") query = query.eq("status", filtros.status);

        const { data } = await query;
        if (data) setDespesas(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchRefs();
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtros]);

    const handleSubmit = async () => {
        if (!form.valor || !form.credor) {
            setMensagem({ tipo: "erro", texto: "Credor e Valor são obrigatórios" });
            return;
        }

        let competenciaFormatada = null;
        if (form.competencia) {
            const [y, m] = form.competencia.split("-");
            if (y && m) competenciaFormatada = `${m}/${y}`;
        }

        const [startYearStr, startMonthStr] = form.competencia.split("-");
        const startYear = parseInt(startYearStr);
        const startMonth = parseInt(startMonthStr);

        if (editandoId) {
            let dataVenc = null;
            if (form.dia_vencimento) {
                const maxDays = new Date(startYear, startMonth, 0).getDate();
                const targetDay = Math.min(parseInt(form.dia_vencimento), maxDays);
                dataVenc = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
            }

            const dados = {
                empresa_id: form.empresa_id ? parseInt(form.empresa_id) : null,
                categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
                credor: form.credor,
                valor: parseFloat(form.valor.replace(",", ".")),
                periodicidade: form.periodicidade,
                dia_vencimento: form.dia_vencimento ? parseInt(form.dia_vencimento) : null,
                data_vencimento: dataVenc,
                observacoes: form.observacoes || null,
                competencia: competenciaFormatada
            };

            const { error } = await supabase.from("despesas_fixas").update(dados).eq("id", editandoId);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao atualizar despesa" });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Despesa atualizada com sucesso" });
                resetForm();
                fetchData();
                fetchSugestoesCredores();
            }
        } else {
            if (recorrente && form.periodicidade === "mensal") {
                const grupoId = crypto.randomUUID();
                const dadosArray = [];

                for (let m = startMonth; m <= 12; m++) {
                    const maxDays = new Date(startYear, m, 0).getDate();
                    const targetDay = form.dia_vencimento ? Math.min(parseInt(form.dia_vencimento), maxDays) : null;
                    const dataVenc = targetDay ? `${startYear}-${String(m).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}` : null;
                    const compStr = `${String(m).padStart(2, '0')}/${startYear}`;

                    dadosArray.push({
                        empresa_id: form.empresa_id ? parseInt(form.empresa_id) : null,
                        categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
                        credor: form.credor,
                        valor: parseFloat(form.valor.replace(",", ".")),
                        periodicidade: form.periodicidade,
                        dia_vencimento: form.dia_vencimento ? parseInt(form.dia_vencimento) : null,
                        data_vencimento: dataVenc,
                        observacoes: form.observacoes || null,
                        competencia: compStr,
                        recorrencia_grupo_id: grupoId,
                        status: "ativo"
                    });
                }

                const { error } = await supabase.from("despesas_fixas").insert(dadosArray);
                if (error) {
                    setMensagem({ tipo: "erro", texto: "Erro ao adicionar despesas recorrentes" });
                } else {
                    setMensagem({ tipo: "sucesso", texto: `Lote de ${dadosArray.length} despesas gerado com sucesso!` });
                    resetForm();
                    fetchData();
                    fetchSugestoesCredores();
                }
            } else {
                let dataVenc = null;
                if (form.dia_vencimento) {
                    const maxDays = new Date(startYear, startMonth, 0).getDate();
                    const targetDay = Math.min(parseInt(form.dia_vencimento), maxDays);
                    dataVenc = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
                }

                const dados = {
                    empresa_id: form.empresa_id ? parseInt(form.empresa_id) : null,
                    categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
                    credor: form.credor,
                    valor: parseFloat(form.valor.replace(",", ".")),
                    periodicidade: form.periodicidade,
                    dia_vencimento: form.dia_vencimento ? parseInt(form.dia_vencimento) : null,
                    data_vencimento: dataVenc,
                    observacoes: form.observacoes || null,
                    competencia: competenciaFormatada,
                    status: "ativo"
                };

                const { error } = await supabase.from("despesas_fixas").insert(dados);
                if (error) {
                    setMensagem({ tipo: "erro", texto: "Erro ao adicionar despesa" });
                } else {
                    setMensagem({ tipo: "sucesso", texto: "Despesa adicionada com sucesso" });
                    resetForm();
                    fetchData();
                    fetchSugestoesCredores();
                }
            }
        }
    };

    const resetForm = () => {
        setForm({
            empresa_id: "",
            categoria_id: "",
            credor: "",
            valor: "",
            periodicidade: "mensal",
            dia_vencimento: "",
            observacoes: "",
            competencia: new Date().toISOString().slice(0, 7)
        });
        setRecorrente(false);
        setEditandoId(null);
        setShowForm(false);
    };

    const handleEditar = (d: DespesaFixa) => {
        let compForm = "";
        if (d.competencia) {
            const [m, y] = d.competencia.split("/");
            if (m && y) compForm = `${y}-${m}`;
        } else {
            compForm = new Date().toISOString().slice(0, 7);
        }

        setForm({
            empresa_id: d.empresa_id?.toString() || "",
            categoria_id: d.categoria_id?.toString() || "",
            credor: d.credor || "",
            valor: d.valor.toString(),
            periodicidade: d.periodicidade,
            dia_vencimento: d.dia_vencimento?.toString() || "",
            observacoes: d.observacoes || "",
            competencia: compForm
        });
        setRecorrente(false);
        setEditandoId(d.id);
        setShowForm(true);
    };

    const handlePagar = (d: DespesaFixa) => {
        setPagandoId(d.id);
        setPagandoValor(d.valor.toString());
        if (contas.length > 0) {
            setPagandoContaId(contas[0].id.toString());
        } else {
            setPagandoContaId("");
        }
    };

    const handleConfirmarPagamento = async (id: number) => {
        if (!pagandoValor) {
            setMensagem({ tipo: "erro", texto: "Valor do pagamento é obrigatório." });
            return;
        }
        if (!pagandoContaId) {
            setMensagem({ tipo: "erro", texto: "Selecione uma conta de pagamento." });
            return;
        }

        const valorNumerico = parseFloat(pagandoValor.replace(",", "."));
        if (isNaN(valorNumerico) || valorNumerico <= 0) {
            setMensagem({ tipo: "erro", texto: "Valor de pagamento inválido." });
            return;
        }

        const { error } = await supabase.from("despesas_fixas").update({
            status: "pago",
            data_pagamento: new Date().toISOString().split("T")[0],
            valor_pago: valorNumerico,
            conta_pagamento_id: parseInt(pagandoContaId)
        }).eq("id", id);

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao registrar pagamento." });
        } else {
            setMensagem({ tipo: "sucesso", texto: "Despesa paga com sucesso!" });
            setPagandoId(null);
            fetchData();
        }
    };

    const handleToggleStatus = async (id: number, status: string) => {
        let novoStatus: string;
        const updates: { status: string; data_pagamento?: string | null } = { status: "" };

        if (status === "pago") {
            if (!confirm("Deseja reativar esta despesa (alterar para ativa e remover data de pagamento)?")) return;
            novoStatus = "ativo";
            updates.data_pagamento = null;
        } else {
            novoStatus = status === "ativo" ? "inativo" : "ativo";
        }

        updates.status = novoStatus;

        const { error } = await supabase.from("despesas_fixas").update(updates).eq("id", id);
        if (!error) {
            setMensagem({ tipo: "sucesso", texto: status === "pago" ? "Despesa reativada com sucesso" : "Status atualizado" });
            fetchData();
        }
    };

    const handleExcluir = (id: number) => {
        setExcluindoId(id);
    };

    const handleConfirmarExclusao = async (d: DespesaFixa, tipo: "individual" | "cascata") => {
        if (tipo === "individual") {
            const { error } = await supabase.from("despesas_fixas").delete().eq("id", d.id);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao excluir despesa." });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Despesa excluída com sucesso." });
                fetchData();
                fetchSugestoesCredores();
            }
        } else if (tipo === "cascata" && d.recorrencia_grupo_id) {
            let query = supabase.from("despesas_fixas").delete()
                .eq("recorrencia_grupo_id", d.recorrencia_grupo_id)
                .eq("status", "ativo");

            if (d.data_vencimento) {
                query = query.gte("data_vencimento", d.data_vencimento);
            }

            const { error } = await query;
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao excluir recorrências futuras." });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Lançamento e parcelas futuras pendentes excluídos com sucesso." });
                fetchData();
                fetchSugestoesCredores();
            }
        }
        setExcluindoId(null);
    };

    const resetFormConta = () => {
        setFormConta({ nome: "", tipo: "banco", saldo_inicial: "" });
        setEditandoContaId(null);
        setShowFormConta(false);
    };

    const handleSubmitConta = async () => {
        if (!formConta.nome.trim()) {
            setMensagem({ tipo: "erro", texto: "Nome da conta é obrigatório" });
            return;
        }

        const saldo = parseFloat(formConta.saldo_inicial.replace(",", ".")) || 0;

        const dados = {
            nome: formConta.nome,
            tipo: formConta.tipo,
            saldo_inicial: saldo,
        };

        if (editandoContaId) {
            const { error } = await supabase.from("contas_pagamento").update(dados).eq("id", editandoContaId);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao atualizar conta" });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Conta atualizada com sucesso" });
                resetFormConta();
                fetchContas();
            }
        } else {
            const { error } = await supabase.from("contas_pagamento").insert(dados);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao adicionar conta" });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Conta adicionada com sucesso" });
                resetFormConta();
                fetchContas();
            }
        }
    };

    const handleEditarConta = (c: ContaPagamento) => {
        setFormConta({ nome: c.nome, tipo: c.tipo, saldo_inicial: c.saldo_inicial.toString() });
        setEditandoContaId(c.id);
        setShowFormConta(true);
    };

    const handleLancarTransacao = async () => {
        if (!contaSelecionadaId) return;
        if (!formTransacao.descricao.trim()) {
            setMensagem({ tipo: "erro", texto: "Descrição é obrigatória" });
            return;
        }
        const valorNumerico = parseFloat(formTransacao.valor.replace(",", ".")) || 0;
        if (valorNumerico <= 0) {
            setMensagem({ tipo: "erro", texto: "Valor deve ser maior que zero" });
            return;
        }

        const { error } = await supabase.from("extrato_contas").insert({
            conta_id: contaSelecionadaId,
            tipo: formTransacao.tipo,
            valor: valorNumerico,
            descricao: formTransacao.descricao,
            data_transacao: formTransacao.data_transacao
        });

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao lançar transação no extrato" });
        } else {
            setMensagem({ tipo: "sucesso", texto: "Transação lançada com sucesso!" });
            setFormTransacao({
                descricao: "",
                valor: "",
                tipo: "entrada",
                data_transacao: new Date().toISOString().split("T")[0]
            });
            fetchExtrato(contaSelecionadaId);
            fetchContas();
        }
    };

    const handleExcluirTransacao = async (t: ExtratoTransacao) => {
        if (t.referencia_tipo) {
            alert("Esta transação é vinculada a um pagamento de despesa e não pode ser excluída diretamente. Reative a despesa correspondente na aba de despesas para estornar o valor.");
            return;
        }

        if (!confirm(`Deseja excluir a transação "${t.descricao}"?`)) return;

        const { error } = await supabase.from("extrato_contas").delete().eq("id", t.id);

        if (error) {
            setMensagem({ tipo: "erro", texto: "Erro ao excluir transação" });
        } else {
            setMensagem({ tipo: "sucesso", texto: "Transação excluída com sucesso!" });
            if (contaSelecionadaId) {
                fetchExtrato(contaSelecionadaId);
                fetchContas();
            }
        }
    };

    const calculateSaldoAtual = (c: ContaPagamento) => {
        const fluxos = c.extrato_contas || [];
        const totalFluxo = fluxos.reduce((acc, f) => {
            return acc + (f.tipo === "entrada" ? f.valor : -f.valor);
        }, 0);
        return c.saldo_inicial + totalFluxo;
    };

    const handleExcluirConta = async (id: number) => {
        if (!confirm("Deseja inativar esta conta de pagamento? Ela não aparecerá mais nos novos lançamentos.")) return;
        const { error } = await supabase.from("contas_pagamento").update({ ativo: false }).eq("id", id);
        if (!error) {
            setMensagem({ tipo: "sucesso", texto: "Conta inativada com sucesso" });
            fetchContas();
        } else {
            setMensagem({ tipo: "erro", texto: "Erro ao inativar conta" });
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
                        <div className="flex items-end gap-6">
                            <div>
                                <div className="text-xs text-gray-500">CMV</div>
                                <div className="text-lg font-bold text-white uppercase">{abaAtiva === "despesas" ? "Despesas Fixas" : "Contas de Pagamento"}</div>
                            </div>
                            <div className="flex gap-2 border-b border-gray-800 pb-1">
                                <button 
                                    onClick={() => setAbaAtiva("despesas")} 
                                    className={`text-xs font-bold px-3 py-1 transition-all ${abaAtiva === "despesas" ? "text-green-500 border-b-2 border-green-500" : "text-gray-400 hover:text-white"}`}
                                >
                                    DESPESAS
                                </button>
                                <button 
                                    onClick={() => setAbaAtiva("contas")} 
                                    className={`text-xs font-bold px-3 py-1 transition-all ${abaAtiva === "contas" ? "text-green-500 border-b-2 border-green-500" : "text-gray-400 hover:text-white"}`}
                                >
                                    CONTAS DE PAGAMENTO
                                </button>
                            </div>
                        </div>
                        
                        {abaAtiva === "despesas" ? (
                            <div className="flex gap-4">
                                <select value={filtros.empresa_id} onChange={(e) => setFiltros({ ...filtros, empresa_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                    <option value="">Todas Empresas</option>
                                    {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}{e.cidade ? ` - ${e.cidade}` : ''}</option>)}
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
                        ) : (
                            <div className="flex gap-4">
                                <button onClick={() => { resetFormConta(); setShowFormConta(true); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium">
                                    NOVA CONTA
                                </button>
                            </div>
                        )}
                    </div>

                    {abaAtiva === "despesas" && (
                        <div className="mt-4">
                            <span className="text-gray-500 text-sm">TOTAL MENSAL (ATIVOS): </span>
                            <span className="text-yellow-400 font-bold">{formatarValor(totalMensal)}</span>
                        </div>
                    )}

                    {mensagem && (
                        <div className={`mt-4 px-4 py-2 text-sm font-medium ${mensagem.tipo === "sucesso" ? "bg-green-900/50 border border-green-700 text-green-400" : "bg-red-900/50 border border-red-700 text-red-400"}`}>
                            {mensagem.texto}
                        </div>
                    )}
                </div>

                {abaAtiva === "despesas" ? (
                    <>
                        {/* Formulário de Despesas */}
                        {showForm && (
                            <div className="bg-gray-900 border border-gray-800 p-4 mb-4">
                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="Credor *" 
                                            value={form.credor} 
                                            onChange={(e) => setForm({ ...form, credor: e.target.value })} 
                                            onFocus={() => setMostrarSugestoesCredor(true)}
                                            onBlur={() => setTimeout(() => setMostrarSugestoesCredor(false), 200)}
                                            autoComplete="off"
                                            className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm w-full" 
                                        />
                                        {mostrarSugestoesCredor && filteredCredores.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 max-h-48 overflow-y-auto rounded-md shadow-lg">
                                                {filteredCredores.map((credor) => (
                                                    <div
                                                        key={credor}
                                                        onClick={() => {
                                                            setForm({ ...form, credor });
                                                            setMostrarSugestoesCredor(false);
                                                        }}
                                                        className="px-3 py-2 cursor-pointer hover:bg-gray-800 text-sm text-white border-b border-gray-800 last:border-0 text-left"
                                                    >
                                                        {credor}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <input type="text" placeholder="Valor *" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm" />
                                    <select value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                        <option value="">Empresa...</option>
                                        {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}{e.cidade ? ` - ${e.cidade}` : ''}</option>)}
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
                                    <input type="month" value={form.competencia} onChange={(e) => setForm({ ...form, competencia: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm scheme-dark" />
                                    <input type="text" placeholder="Observações" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm" />
                                    
                                    {!editandoId && form.periodicidade === "mensal" && (
                                        <div className="col-span-4 flex items-center gap-2 mt-1">
                                            <input 
                                                type="checkbox" 
                                                id="recorrente" 
                                                checked={recorrente} 
                                                onChange={(e) => setRecorrente(e.target.checked)} 
                                                className="w-4 h-4 bg-gray-850 border border-gray-700 rounded text-green-600 focus:ring-green-500" 
                                            />
                                            <label htmlFor="recorrente" className="text-xs text-gray-300 select-none cursor-pointer">
                                                Repetir mensalmente até o final do ano corrente (31/12)?
                                            </label>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium">SALVAR</button>
                                    <button onClick={resetForm} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 text-sm font-medium">CANCELAR</button>
                                </div>
                            </div>
                        )}

                        {/* Lista de Despesas */}
                        <div className="flex-1 bg-gray-900 border border-gray-800 overflow-auto relative">
                            {loading && despesas.length === 0 ? (
                                <div className="p-4 text-gray-500 text-sm">Carregando...</div>
                            ) : (
                                <table className={`w-full transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                                    <thead className="bg-gray-800 sticky top-0">
                                        <tr>
                                            <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">CREDOR</th>
                                            <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">CATEGORIA</th>
                                            <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">EMPRESA</th>
                                            <th className="text-center text-xs text-gray-400 font-medium px-4 py-3">COMPETÊNCIA</th>
                                            <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">VALOR</th>
                                            <th className="text-center text-xs text-gray-400 font-medium px-4 py-3">PERIODICIDADE</th>
                                            <th className="text-center text-xs text-gray-400 font-medium px-4 py-3">STATUS</th>
                                            <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">AÇÕES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {despesas.map((d) => {
                                            if (pagandoId === d.id) {
                                                return (
                                                    <tr key={d.id} className="border-t border-gray-800 bg-gray-800/30">
                                                        <td className="px-4 py-3 text-white text-sm font-semibold">
                                                            {d.credor} <span className="text-[10px] text-green-500 block font-normal mt-0.5">Efetuando Pagamento...</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-400 text-sm">{d.categorias?.nome || "-"}</td>
                                                        <td className="px-4 py-3 text-gray-400 text-sm">{d.empresas ? `${d.empresas.nome_fantasia}${d.empresas.cidade ? ` - ${d.empresas.cidade}` : ''}` : "-"}</td>
                                                        <td className="px-4 py-3 text-center text-gray-400 text-sm font-mono">{d.competencia || "-"}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="inline-flex items-center gap-1">
                                                                <span className="text-xs text-gray-500">R$</span>
                                                                <input 
                                                                    type="text" 
                                                                    value={pagandoValor} 
                                                                    onChange={(e) => setPagandoValor(e.target.value)} 
                                                                    className="bg-gray-800 border border-gray-700 text-white px-2 py-1 text-sm font-mono w-24 text-right focus:outline-none focus:border-green-500"
                                                                    placeholder="Valor Pago"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-gray-400 text-sm">{d.periodicidade.toUpperCase()}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="text-xs px-2 py-1 bg-yellow-900/30 text-yellow-400 border border-yellow-800/50">
                                                                PAGANDO
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex flex-col items-end gap-1">
                                                                <select 
                                                                    value={pagandoContaId} 
                                                                    onChange={(e) => setPagandoContaId(e.target.value)} 
                                                                    className="bg-gray-800 border border-gray-700 text-white px-2 py-1 text-xs focus:outline-none mb-1 max-w-[150px]"
                                                                >
                                                                    <option value="">Selecione a Conta...</option>
                                                                    {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                                                </select>
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleConfirmarPagamento(d.id)} className="text-green-500 hover:text-green-400 text-[10px] font-bold">CONFIRMAR</button>
                                                                    <button onClick={() => setPagandoId(null)} className="text-gray-400 hover:text-gray-300 text-[10px] font-medium">CANCELAR</button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            if (excluindoId === d.id) {
                                                return (
                                                    <tr key={d.id} className="border-t border-gray-800 bg-red-950/20">
                                                        <td className="px-4 py-3 text-white text-sm font-semibold">
                                                            {d.credor} <span className="text-[10px] text-red-500 block font-normal mt-0.5">Excluindo Despesa...</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-400 text-sm">{d.categorias?.nome || "-"}</td>
                                                        <td className="px-4 py-3 text-gray-400 text-sm">{d.empresas ? `${d.empresas.nome_fantasia}${d.empresas.cidade ? ` - ${d.empresas.cidade}` : ''}` : "-"}</td>
                                                        <td className="px-4 py-3 text-center text-gray-400 text-sm font-mono">{d.competencia || "-"}</td>
                                                        <td className="px-4 py-3 text-right text-yellow-400 text-sm font-mono">{formatarValor(d.valor_pago || d.valor)}</td>
                                                        <td className="px-4 py-3 text-center text-gray-400 text-sm">{d.periodicidade.toUpperCase()}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="text-xs px-2 py-1 bg-red-900/30 text-red-400 border border-red-800/50">
                                                                EXCLUINDO
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className="text-[10px] text-gray-400 mb-1">Como deseja excluir esta despesa?</span>
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleConfirmarExclusao(d, "individual")} className="bg-red-900 hover:bg-red-800 text-white px-2 py-1 text-[10px] font-bold">APENAS ESTA</button>
                                                                    {d.recorrencia_grupo_id && (
                                                                        <button onClick={() => handleConfirmarExclusao(d, "cascata")} className="bg-red-700 hover:bg-red-650 text-white px-2 py-1 text-[10px] font-bold">ESTA E FUTURAS</button>
                                                                    )}
                                                                    <button onClick={() => setExcluindoId(null)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 text-[10px] font-medium">CANCELAR</button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr key={d.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                                    <td className="px-4 py-3 text-white text-sm">{d.credor}</td>
                                                    <td className="px-4 py-3 text-gray-400 text-sm">{d.categorias?.nome || "-"}</td>
                                                    <td className="px-4 py-3 text-gray-400 text-sm">{d.empresas ? `${d.empresas.nome_fantasia}${d.empresas.cidade ? ` - ${d.empresas.cidade}` : ''}` : "-"}</td>
                                                    <td className="px-4 py-3 text-center text-gray-400 text-sm font-mono">{d.competencia || "-"}</td>
                                                    <td className="px-4 py-3 text-right text-yellow-400 text-sm font-mono">
                                                        {d.status === "pago" && d.valor_pago !== null ? (
                                                            <div>
                                                                <div>{formatarValor(d.valor_pago)}</div>
                                                                {d.valor_pago !== d.valor && (
                                                                    <div className="text-[10px] text-gray-500 line-through">Prev: {formatarValor(d.valor)}</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            formatarValor(d.valor)
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-gray-400 text-sm">{d.periodicidade.toUpperCase()}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => handleToggleStatus(d.id, d.status)} className={`text-xs px-2 py-1 ${d.status === "ativo" ? "bg-green-900/50 text-green-400" : d.status === "pago" ? "bg-blue-900/50 text-blue-400" : "bg-gray-700 text-gray-400"}`}>
                                                            {d.status.toUpperCase()}
                                                        </button>
                                                        {d.status === "pago" && (
                                                            <div className="text-[10px] text-gray-500 mt-0.5">
                                                                via {d.contas_pagamento?.nome || d.forma_pagamento || "Dinheiro"}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {d.status === "ativo" && <button onClick={() => handlePagar(d)} className="text-green-500 hover:text-green-400 text-xs font-medium mr-2">PAGAR</button>}
                                                        <button onClick={() => handleEditar(d)} className="text-blue-500 hover:text-blue-400 text-xs font-medium mr-2">EDITAR</button>
                                                        <button onClick={() => handleExcluir(d.id)} className="text-red-500 hover:text-red-400 text-xs font-medium">EXCLUIR</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Formulário de Conta */}
                        {showFormConta && (
                            <div className="bg-gray-900 border border-gray-800 p-4 mb-4">
                                <div className="grid grid-cols-4 gap-4 mb-4">
                                    <input 
                                        type="text" 
                                        placeholder="Nome da Conta *" 
                                        value={formConta.nome} 
                                        onChange={(e) => setFormConta({ ...formConta, nome: e.target.value })} 
                                        className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm col-span-2" 
                                    />
                                    <select 
                                        value={formConta.tipo} 
                                        onChange={(e) => setFormConta({ ...formConta, tipo: e.target.value })} 
                                        className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                                    >
                                        <option value="banco">Banco / Conta Corrente</option>
                                        <option value="caixa_fisico">Caixa Físico / Espécie</option>
                                        <option value="carteira_digital">Carteira Digital / PIX</option>
                                    </select>
                                    <input 
                                        type="text" 
                                        placeholder="Saldo Inicial (R$)" 
                                        value={formConta.saldo_inicial} 
                                        onChange={(e) => setFormConta({ ...formConta, saldo_inicial: e.target.value })} 
                                        className="bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm" 
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleSubmitConta} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium">SALVAR</button>
                                    <button onClick={resetFormConta} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 text-sm font-medium">CANCELAR</button>
                                </div>
                            </div>
                        )}

                        {/* Tabela de Contas */}
                        <div className="flex-1 bg-gray-900 border border-gray-800 overflow-auto">
                            <table className="w-full">
                                <thead className="bg-gray-800 sticky top-0">
                                    <tr>
                                        <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">NOME DA CONTA</th>
                                        <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">TIPO</th>
                                        <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">SALDO INICIAL</th>
                                        <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">SALDO ATUAL</th>
                                        <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">AÇÕES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contas.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-3 text-gray-500 text-sm text-center">Nenhuma conta cadastrada.</td>
                                        </tr>
                                    ) : (
                                        contas.map((c) => (
                                            <tr key={c.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                                <td className="px-4 py-3 text-white text-sm">{c.nome}</td>
                                                <td className="px-4 py-3 text-gray-400 text-sm">
                                                    {c.tipo === "banco" ? "Banco / C. Corrente" : c.tipo === "caixa_fisico" ? "Caixa Físico" : "Carteira Digital / PIX"}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-mono text-gray-300">
                                                    {formatarValor(c.saldo_inicial)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-mono font-bold text-yellow-400">
                                                    {formatarValor(calculateSaldoAtual(c))}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => setContaSelecionadaId(c.id)} className="text-green-500 hover:text-green-400 text-xs font-medium mr-2">EXTRATO</button>
                                                    <button onClick={() => handleEditarConta(c)} className="text-blue-500 hover:text-blue-400 text-xs font-medium mr-2">EDITAR</button>
                                                    <button onClick={() => handleExcluirConta(c.id)} className="text-red-500 hover:text-red-400 text-xs font-medium">INATIVAR</button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Painel do Extrato da Conta Selecionada */}
                        {contaSelecionadaId !== null && (
                            <div className="mt-6 bg-gray-900 border border-gray-800 p-4">
                                <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-4">
                                    <div className="text-sm font-bold text-white uppercase">
                                        Extrato de Movimentações: {contas.find(c => c.id === contaSelecionadaId)?.nome}
                                    </div>
                                    <button onClick={() => setContaSelecionadaId(null)} className="text-xs text-red-500 hover:text-red-400 font-bold">
                                        FECHAR EXTRATO
                                    </button>
                                </div>

                                {/* Formulário de Lançamento Manual no Extrato */}
                                <div className="bg-gray-850 border border-gray-800 p-3 mb-4 rounded">
                                    <div className="text-xs font-bold text-gray-400 mb-2">NOVO LANÇAMENTO MANUAL</div>
                                    <div className="grid grid-cols-5 gap-3">
                                        <input 
                                            type="text" 
                                            placeholder="Descrição *" 
                                            value={formTransacao.descricao} 
                                            onChange={(e) => setFormTransacao({ ...formTransacao, descricao: e.target.value })} 
                                            className="bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-xs col-span-2" 
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Valor (R$) *" 
                                            value={formTransacao.valor} 
                                            onChange={(e) => setFormTransacao({ ...formTransacao, valor: e.target.value })} 
                                            className="bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-xs font-mono" 
                                        />
                                        <select 
                                            value={formTransacao.tipo} 
                                            onChange={(e) => setFormTransacao({ ...formTransacao, tipo: e.target.value })} 
                                            className="bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-xs"
                                        >
                                            <option value="entrada">Entrada (+)</option>
                                            <option value="saida">Saída (-)</option>
                                        </select>
                                        <input 
                                            type="date" 
                                            value={formTransacao.data_transacao} 
                                            onChange={(e) => setFormTransacao({ ...formTransacao, data_transacao: e.target.value })} 
                                            className="bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-xs scheme-dark" 
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 mt-3">
                                        <button onClick={handleLancarTransacao} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs font-medium">
                                            LANÇAR
                                        </button>
                                    </div>
                                </div>

                                {/* Lista de Transações do Extrato */}
                                <div className="max-h-64 overflow-auto">
                                    {loadingExtrato ? (
                                        <div className="text-gray-500 text-xs p-2">Carregando extrato...</div>
                                    ) : extrato.length === 0 ? (
                                        <div className="text-gray-500 text-xs p-2 text-center">Nenhuma movimentação registrada nesta conta.</div>
                                    ) : (
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-850 sticky top-0">
                                                <tr>
                                                    <th className="text-left text-gray-400 font-medium px-3 py-2">DATA</th>
                                                    <th className="text-left text-gray-400 font-medium px-3 py-2">DESCRIÇÃO</th>
                                                    <th className="text-center text-gray-400 font-medium px-3 py-2">TIPO</th>
                                                    <th className="text-right text-gray-400 font-medium px-3 py-2">VALOR</th>
                                                    <th className="text-right text-gray-400 font-medium px-3 py-2">AÇÕES</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {extrato.map((t) => (
                                                    <tr key={t.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                                                        <td className="px-3 py-2 text-gray-400 font-mono">{t.data_transacao.split("-").reverse().join("/")}</td>
                                                        <td className="px-3 py-2 text-white font-medium">
                                                            {t.descricao}
                                                            {t.referencia_tipo === "despesa_fixa" && (
                                                                <span className="ml-2 text-[9px] px-1 bg-blue-900/30 text-blue-400 border border-blue-800/30 rounded">
                                                                    Automático
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`px-1.5 py-0.5 font-bold rounded ${t.tipo === "entrada" ? "bg-green-950/40 text-green-400" : "bg-red-950/40 text-red-400"}`}>
                                                                {t.tipo === "entrada" ? "+" : "-"}
                                                            </span>
                                                        </td>
                                                        <td className={`px-3 py-2 text-right font-mono font-bold ${t.tipo === "entrada" ? "text-green-400" : "text-red-400"}`}>
                                                            {formatarValor(t.valor)}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            {t.referencia_tipo ? (
                                                                <span className="text-gray-600 text-[10px] italic">Bloqueado</span>
                                                            ) : (
                                                                <button onClick={() => handleExcluirTransacao(t)} className="text-red-500 hover:text-red-400 font-medium">
                                                                    EXCLUIR
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </MainLayout>
    );
}
