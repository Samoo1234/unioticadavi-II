"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
    ReceitaParaVenda,
    Venda,
    vendaVazia,
    Lente,
    Armacao,
    ItemVenda,
    calcularStatusEstoque,
    ProdutoSupabase,
    EmpresaSupabase,
    ConsultaSupabase,
} from "@/data/vendasData";
import { TSOData, abrirTSO } from "@/utils/tso";
import { CarneData, abrirCarne } from "@/utils/carne";
import { parseMoeda } from "@/utils/monetary";
import { fiscalService } from "@/services/fiscal";

export function useVendas() {
    const { profile } = useAuth();
    const [receitaSelecionada, setReceitaSelecionada] = useState<ReceitaParaVenda | null>(null);
    const [venda, setVenda] = useState<Venda>({ ...vendaVazia });
    const [produtosSupabase, setProdutosSupabase] = useState<ProdutoSupabase[]>([]);
    const [estoqueLentes, setEstoqueLentes] = useState<Lente[]>([]);
    const [estoqueArmacoes, setEstoqueArmacoes] = useState<Armacao[]>([]);
    const [receitasDb, setReceitasDb] = useState<ReceitaParaVenda[]>([]);
    const [empresas, setEmpresas] = useState<EmpresaSupabase[]>([]);
    const [empresaSelecionada, setEmpresaSelecionada] = useState<EmpresaSupabase | null>(null);
    const [vendaRealizada, setVendaRealizada] = useState<{ venda: Venda; receita: ReceitaParaVenda | null; vendaId: string; numeroVenda?: number } | null>(null);
    const [proximoNumeroVenda, setProximoNumeroVenda] = useState(1);
    const [numeroTSO, setNumeroTSO] = useState(1);
    const [dataHora, setDataHora] = useState("");
    const [caixaStatus, setCaixaStatus] = useState<"aberto" | "fechado">("fechado");
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [view, setView] = useState<"pdv" | "historico">("pdv");
    const [historicoVendas, setHistoricoVendas] = useState<any[]>([]);

    // Filtros do Histórico
    const [filtroCliente, setFiltroCliente] = useState("");
    const [filtroDataInicio, setFiltroDataInicio] = useState("");
    const [filtroDataFim, setFiltroDataFim] = useState("");

    // Estado para baixa de pagamento inline
    const [baixandoId, setBaixandoId] = useState<string | null>(null);
    const [baixaValor, setBaixaValor] = useState<number>(0);
    const [baixaForma, setBaixaForma] = useState<string>("Dinheiro");

    // Buscar status do caixa
    const fetchStatusCaixa = async () => {
        if (!empresaSelecionada) return;

        try {
            const hoje = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('caixas')
                .select('status')
                .eq('data', hoje)
                .eq('empresa_id', empresaSelecionada.id)
                .maybeSingle();

            if (error) {
                console.error("Erro ao verificar status do caixa (query):", error.message || error);
                return;
            }

            if (data && data.status === 'aberto') {
                setCaixaStatus("aberto");
            } else {
                setCaixaStatus("fechado");
            }
        } catch (error: any) {
            console.error("Erro ao verificar caixa:", error?.message || error || "Erro desconhecido");
        }
    };

    const fetchVendasCount = async () => {
        const { count, error } = await supabase
            .from('vendas')
            .select('*', { count: 'exact', head: true });

        if (!error && count !== null) {
            setProximoNumeroVenda(count + 1);
        }
    };

    const fetchProdutos = async () => {
        setCarregando(true);
        try {
            let query = supabase
                .from('produtos')
                .select('*')
                .eq('ativo', true);

            if (empresaSelecionada) {
                query = query.eq('empresa_id', empresaSelecionada.id);
            }

            const { data, error } = await query.order('nome');

            if (error) throw error;

            if (data) {
                setProdutosSupabase(data);

                // Converter para formato de lentes
                const lentesAdaptadas: Lente[] = data
                    .filter(p => p.tipo === 'lente')
                    .map((p, idx) => ({
                        id: idx + 1,
                        codigo: p.codigo || `LNT-${idx + 1}`,
                        nome: p.nome,
                        tipo: "Monofocal" as const,
                        marca: p.marca || "",
                        material: "CR-39" as const,
                        quantidade: p.quantidade,
                        precoUnitario: p.preco_unitario,
                        status: calcularStatusEstoque(p.quantidade),
                        supabaseId: p.id,
                    }));

                // Converter para formato de armações
                const armacoesAdaptadas: Armacao[] = data
                    .filter(p => p.tipo === 'armacao')
                    .map((p, idx) => ({
                        id: idx + 1,
                        codigo: p.codigo || `ARM-${idx + 1}`,
                        nome: p.nome,
                        marca: p.marca || "",
                        modelo: "",
                        cor: "",
                        quantidade: p.quantidade,
                        precoUnitario: p.preco_unitario,
                        status: calcularStatusEstoque(p.quantidade),
                        supabaseId: p.id,
                    }));

                setEstoqueLentes(lentesAdaptadas as any);
                setEstoqueArmacoes(armacoesAdaptadas as any);
            }
        } catch (error) {
            console.error("Erro ao buscar produtos:", error);
        } finally {
            setCarregando(false);
        }
    };

    // Buscar receitas (consultas com tipo_lente) do Supabase
    const fetchReceitas = async () => {
        try {
            const { data, error } = await supabase
                .from('consultas')
                .select(`
                    *,
                    pacientes (
                        id,
                        nome
                    )
                `)
                .not('tipo_lente', 'is', null)
                .neq('tipo_lente', '')
                .order('data', { ascending: false });

            if (error) {
                console.error("Erro ao buscar receitas:", JSON.stringify(error, null, 2));
                return;
            }

            if (data && data.length > 0) {
                const receitasFormatadas: ReceitaParaVenda[] = data.map((consulta: ConsultaSupabase, idx: number) => ({
                    id: consulta.id,
                    pacienteId: consulta.paciente_id || "",
                    pacienteNome: consulta.pacientes?.nome || "Paciente Desconhecido",
                    dataConsulta: consulta.data,
                    profissional: "Dr. Responsável",
                    olhoDireito: {
                        esferico: consulta.exame_od_esferico || "",
                        cilindrico: consulta.exame_od_cilindrico || "",
                        eixo: consulta.exame_od_eixo || "",
                        adicao: consulta.exame_od_adicao || "",
                        dnp: consulta.exame_od_dnp || "",
                    },
                    olhoEsquerdo: {
                        esferico: consulta.exame_oe_esferico || "",
                        cilindrico: consulta.exame_oe_cilindrico || "",
                        eixo: consulta.exame_oe_eixo || "",
                        adicao: consulta.exame_oe_adicao || "",
                        dnp: consulta.exame_oe_dnp || "",
                    },
                    tipoLente: consulta.tipo_lente || "",
                    observacoes: consulta.observacoes_receita || "",
                }));
                setReceitasDb(receitasFormatadas);
            } else {
                setReceitasDb([]);
            }
        } catch (error) {
            console.error("Erro inesperado ao buscar receitas:", error);
            setReceitasDb([]);
        }
    };

    // Buscar empresas do Supabase
    const fetchEmpresas = async () => {
        try {
            const { data, error } = await supabase
                .from('empresas')
                .select('*')
                .eq('ativo', true)
                .order('cidade');

            if (!error && data && data.length > 0) {
                setEmpresas(data);

                // Se o usuário tem unidade fixa, seleciona ela
                if (profile?.unit_id) {
                    const assignedUnit = data.find(u => u.id === profile.unit_id);
                    if (assignedUnit) {
                        setEmpresaSelecionada(assignedUnit);
                    } else {
                        console.warn("Unidade do usuário não encontrada ou inativa.");
                        setEmpresaSelecionada(data[0]);
                    }
                }
                // Auto-selecionar a primeira empresa se não houver selecionada
                else if (!empresaSelecionada) {
                    setEmpresaSelecionada(data[0]);
                }
            }
        } catch (error) {
            console.error("Erro ao buscar empresas:", error);
        }
    };

    const fetchHistorico = async () => {
        setCarregando(true);
        try {
            let query = supabase
                .from('vendas')
                .select('*, numero_venda, pacientes(nome), vendas_itens(*, produtos(nome, tipo)), vendas_pagamentos(*)');

            if (empresaSelecionada) {
                query = query.eq('empresa_id', empresaSelecionada.id);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            setHistoricoVendas(data || []);
        } catch (error) {
            console.error("Erro ao buscar histórico:", error);
        } finally {
            setCarregando(false);
        }
    };

    // Effects
    useEffect(() => {
        fetchProdutos();
        fetchReceitas();
        fetchEmpresas();
        fetchVendasCount();
        if (view === "historico") fetchHistorico();
        fetchStatusCaixa();
    }, [empresaSelecionada, view]);

    useEffect(() => {
        const atualizar = () => {
            const agora = new Date();
            setDataHora(
                agora.toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                })
            );
        };
        atualizar();
        const intervalo = setInterval(atualizar, 1000);
        return () => clearInterval(intervalo);
    }, []);

    useEffect(() => {
        if (mensagem) {
            const timer = setTimeout(() => setMensagem(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [mensagem]);


    const handleBaixarPagamento = async (vendaId: string, valor: number, forma: string) => {
        if (valor <= 0) {
            setMensagem({ tipo: "erro", texto: "INFORME UM VALOR VÁLIDO PARA BAIXA" });
            return;
        }

        if (caixaStatus !== "aberto") {
            setMensagem({ tipo: "erro", texto: "CAIXA FECHADO. ABRA O CAIXA NO FINANCEIRO PARA RECEBER." });
            return;
        }

        try {
            setCarregando(true);
            const dataHoje = new Date().toISOString().split('T')[0];

            // 1. Registrar pagamento
            const { error: erroPagto } = await supabase
                .from('vendas_pagamentos')
                .insert({
                    venda_id: vendaId,
                    valor: valor,
                    forma_pagamento: forma,
                    empresa_id: empresaSelecionada?.id,
                    data: dataHoje
                });
            if (erroPagto) throw erroPagto;

            // 2. Registrar no financeiro
            const { error: erroFin } = await supabase
                .from('financeiro_movimentacoes')
                .insert({
                    tipo: 'entrada',
                    origem_motivo: 'manual',
                    descricao: `RECEBIMENTO VENDA #${vendaId.slice(-4)}`,
                    valor: valor,
                    forma_pagamento: forma,
                    empresa_id: empresaSelecionada?.id,
                    data: dataHoje,
                    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                });
            if (erroFin) throw erroFin;

            setMensagem({ tipo: "sucesso", texto: "PAGAMENTO REGISTRADO COM SUCESSO!" });
            setBaixandoId(null);
            setBaixaValor(0);
            fetchHistorico();
        } catch (error: any) {
            console.error("Erro ao baixar pagamento:", error);
            setMensagem({ tipo: "erro", texto: "ERRO AO BAIXAR: " + error.message });
        } finally {
            setCarregando(false);
        }
    };

    const vendasFiltradas = useMemo(() => {
        return historicoVendas.filter(v => {
            const nome = v.pacientes?.nome?.toLowerCase() || "cliente avulso";
            const busca = filtroCliente.toLowerCase();
            const coincideNome = nome.includes(busca);

            const dataVenda = v.data_venda;
            const coincideInicio = !filtroDataInicio || dataVenda >= filtroDataInicio;
            const coincideFim = !filtroDataFim || dataVenda <= filtroDataFim;

            return coincideNome && coincideInicio && coincideFim;
        });
    }, [historicoVendas, filtroCliente, filtroDataInicio, filtroDataFim]);

    const handleGerarTSO = (saleData?: { venda: Venda; receita: ReceitaParaVenda | null; numeroVenda?: number }) => {
        const dataToUse = saleData || vendaRealizada;

        if (!dataToUse || !empresaSelecionada) {
            setMensagem({ tipo: "erro", texto: "Dados da venda não encontrados para gerar o TSO" });
            return;
        }

        const { venda: vendaFinal, receita, numeroVenda } = dataToUse;
        const hoje = new Date();
        const dataEntrega = new Date(hoje);
        dataEntrega.setDate(dataEntrega.getDate() + 7);

        const armacaoItem = vendaFinal.itens.find(i => i.tipo === "armacao");
        const lenteItem = vendaFinal.itens.find(i => i.tipo === "lente");

        const tsoData: TSOData = {
            empresa: empresaSelecionada,
            numeroReceituario: numeroVenda || numeroTSO,
            dataEmissao: hoje.toLocaleDateString("pt-BR"),
            dataEntrega: dataEntrega.toLocaleDateString("pt-BR"),
            hora: hoje.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            clienteCodigo: "-",
            clienteNome: vendaFinal.pacienteNome || "Cliente Avulso",
            solicitante: vendaFinal.pacienteNome || "Cliente Avulso",
            vendedor: "ADMIN",
            longeOD: {
                esferico: receita?.olhoDireito.esferico || "",
                cilindrico: receita?.olhoDireito.cilindrico || "",
                eixo: receita?.olhoDireito.eixo || "",
                dp: "",
                altura: "",
                dnp: receita?.olhoDireito.dnp || "",
            },
            longeOE: {
                esferico: receita?.olhoEsquerdo.esferico || "",
                cilindrico: receita?.olhoEsquerdo.cilindrico || "",
                eixo: receita?.olhoEsquerdo.eixo || "",
                dp: "",
                altura: "",
                dnp: receita?.olhoEsquerdo.dnp || "",
            },
            adicao: receita?.olhoDireito.adicao || "",
            armacao: armacaoItem ? {
                codigo: "-",
                descricao: armacaoItem.nome,
                valor: armacaoItem.precoTotal,
                tipo: "DIVERSOS"
            } : undefined,
            lente: lenteItem ? {
                codigo: "-",
                descricao: lenteItem.nome,
                valor: lenteItem.precoTotal,
                tipo: receita?.tipoLente || "DIVERSOS"
            } : undefined,
            valorTotal: vendaFinal.total,
            valorSaldo: vendaFinal.total,
            condPagto: vendaFinal.formaPagamento,
            observacao: receita?.observacoes || "",
            dataVenda: hoje.toLocaleDateString("pt-BR"),
        };

        abrirTSO(tsoData);
    };

    const handleGerarCarne = (saleData?: { venda: Venda; numeroVenda?: number }) => {
        const dataToUse = saleData || vendaRealizada;

        if (!dataToUse || !empresaSelecionada) {
            setMensagem({ tipo: "erro", texto: "Dados da venda não encontrados para gerar o carnê" });
            return;
        }

        const { venda: vendaFinal } = dataToUse;

        if (vendaFinal.formaPagamento !== "Parcelado") {
            setMensagem({ tipo: "erro", texto: "Carnê disponível apenas para vendas parceladas" });
            return;
        }

        const numParcelas = vendaFinal.parcelas || 1;
        const valorParcela = vendaFinal.total / numParcelas;
        const hoje = new Date();

        const parcelas = Array.from({ length: numParcelas }).map((_, i) => {
            const vencimento = new Date(hoje);
            vencimento.setMonth(hoje.getMonth() + (i + 1));

            return {
                numero: i + 1,
                vencimento: vencimento.toLocaleDateString("pt-BR"),
                valor: valorParcela
            };
        });

        const carneData: CarneData = {
            empresa: empresaSelecionada,
            clienteNome: vendaFinal.pacienteNome || "Cliente Avulso",
            vendaId: dataToUse.numeroVenda || "-",
            valorTotal: vendaFinal.total,
            parcelas
        };

        abrirCarne(carneData);
    };

    const handleEmitirNota = async (vendaId: string, modelo: 55 | 65 = 65) => {
        if (!vendaId || vendaId === "-") {
            setMensagem({ tipo: "erro", texto: "ID da venda inválido para emissão." });
            return;
        }

        try {
            setCarregando(true);
            const validation = await fiscalService.validarVendaParaEmissao(vendaId, modelo);

            if (!validation.valid) {
                setMensagem({
                    tipo: "erro",
                    texto: `[${modelo === 55 ? 'NF-e' : 'NFC-e'}] DADOS INCOMPLETOS: ${validation.errors[0]}`
                });
                return;
            }

            const response = await fiscalService.gerarPayloadFiscal(vendaId, modelo);
            setMensagem({
                tipo: "sucesso",
                texto: `${modelo === 55 ? 'NF-e' : 'NFC-e'} EMITIDA COM SUCESSO! (Modo Teste)`
            });
        } catch (error: any) {
            setMensagem({ tipo: "erro", texto: "ERRO NA EMISSÃO: " + error.message });
        } finally {
            setCarregando(false);
        }
    };

    const handleCarregarNaVenda = () => {
        if (receitaSelecionada) {
            setVenda({
                ...vendaVazia,
                receitaId: receitaSelecionada.id,
                pacienteId: receitaSelecionada.pacienteId,
                pacienteNome: receitaSelecionada.pacienteNome,
                dataVenda: new Date().toISOString().split("T")[0],
                status: "aberta",
            });
        }
    };

    const handleAddLente = (lente: Lente) => {
        const itemExistente = venda.itens.find((i) => i.tipo === "lente" && i.produtoId === lente.id);

        let novosItens: ItemVenda[];
        if (itemExistente) {
            novosItens = venda.itens.map((i) =>
                i.id === itemExistente.id
                    ? {
                        ...i,
                        quantidade: i.quantidade + 1,
                        precoTotal: (i.quantidade + 1) * i.precoUnitario,
                    }
                    : i
            );
        } else {
            const novoItem: ItemVenda = {
                id: Date.now(),
                tipo: "lente",
                produtoId: lente.id,
                nome: lente.nome,
                quantidade: 1,
                precoUnitario: lente.precoUnitario,
                precoTotal: lente.precoUnitario,
            };
            novosItens = [...venda.itens, novoItem];
        }

        const novoSubtotal = novosItens.reduce((acc, i) => acc + i.precoTotal, 0);
        setVenda({
            ...venda,
            itens: novosItens,
            subtotal: novoSubtotal,
            total: novoSubtotal - venda.desconto,
        });
    };

    const handleAddArmacao = (armacao: Armacao) => {
        const itemExistente = venda.itens.find((i) => i.tipo === "armacao" && i.produtoId === armacao.id);

        let novosItens: ItemVenda[];
        if (itemExistente) {
            novosItens = venda.itens.map((i) =>
                i.id === itemExistente.id
                    ? {
                        ...i,
                        quantidade: i.quantidade + 1,
                        precoTotal: (i.quantidade + 1) * i.precoUnitario,
                    }
                    : i
            );
        } else {
            const novoItem: ItemVenda = {
                id: Date.now(),
                tipo: "armacao",
                produtoId: armacao.id,
                nome: armacao.nome,
                quantidade: 1,
                precoUnitario: armacao.precoUnitario,
                precoTotal: armacao.precoUnitario,
            };
            novosItens = [...venda.itens, novoItem];
        }

        const novoSubtotal = novosItens.reduce((acc, i) => acc + i.precoTotal, 0);
        setVenda({
            ...venda,
            itens: novosItens,
            subtotal: novoSubtotal,
            total: novoSubtotal - venda.desconto,
        });
    };

    const handleFinalizarVenda = async () => {
        if (venda.itens.length === 0) {
            setMensagem({ tipo: "erro", texto: "ADICIONE ITENS À VENDA" });
            return;
        }

        if (caixaStatus !== "aberto") {
            setMensagem({ tipo: "erro", texto: "CAIXA FECHADO. ABRA O CAIXA NO FINANCEIRO PARA FINALIZAR A VENDA." });
            return;
        }

        try {
            setCarregando(true);
            const pacienteIdParaSalvar = venda.pacienteId && venda.pacienteId !== 0
                ? String(venda.pacienteId)
                : null;

            const { data: vendaCriada, error: erroVenda } = await supabase
                .from('vendas')
                .insert({
                    paciente_id: pacienteIdParaSalvar,
                    data_venda: new Date().toISOString().split('T')[0],
                    subtotal: venda.subtotal,
                    desconto: venda.desconto,
                    total: venda.total,
                    status: 'finalizada',
                    forma_pagamento: venda.formaPagamento || 'Dinheiro',
                    parcelas: venda.parcelas || 1,
                    valor_parcela: venda.parcelas ? (venda.total / venda.parcelas) : venda.total,
                    empresa_id: empresaSelecionada?.id,
                    observacoes: ''
                })
                .select()
                .single();

            if (erroVenda) throw erroVenda;

            for (const item of venda.itens) {
                const produto = produtosSupabase.find(p => p.nome === item.nome);
                if (produto) {
                    await supabase
                        .from('vendas_itens')
                        .insert({
                            venda_id: vendaCriada.id,
                            produto_id: produto.id,
                            quantidade: item.quantidade,
                            preco_unitario: item.precoUnitario,
                            preco_total: item.precoTotal
                        });

                    const novaQuantidade = Math.max(0, produto.quantidade - item.quantidade);
                    await supabase
                        .from('produtos')
                        .update({ quantidade: novaQuantidade })
                        .eq('id', produto.id);
                }
            }

            const { error: erroFin } = await supabase
                .from('financeiro_movimentacoes')
                .insert({
                    tipo: 'entrada',
                    origem_motivo: venda.formaPagamento === "Parcelado" ? 'venda_prazo' : 'manual',
                    descricao: `VENDA #${vendaCriada.numero_venda}`,
                    valor: venda.total,
                    forma_pagamento: venda.formaPagamento,
                    empresa_id: empresaSelecionada?.id,
                    venda_id: vendaCriada.id,
                    data: new Date().toISOString().split('T')[0],
                    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                });

            if (erroFin) console.error("Erro ao registrar no financeiro:", erroFin);

            if (venda.formaPagamento !== "Parcelado") {
                await supabase
                    .from('vendas_pagamentos')
                    .insert({
                        venda_id: vendaCriada.id,
                        valor: venda.total,
                        forma_pagamento: venda.formaPagamento,
                        empresa_id: empresaSelecionada?.id,
                        data: new Date().toISOString().split('T')[0]
                    });
            }

            await fetchProdutos();
            setVendaRealizada({
                venda: { ...venda },
                receita: receitaSelecionada,
                vendaId: vendaCriada.id,
                numeroVenda: vendaCriada.numero_venda
            });
            setProximoNumeroVenda(prev => prev + 1);
            setVenda({ ...vendaVazia });
            setReceitaSelecionada(null);
            setMensagem({ tipo: "sucesso", texto: "VENDA FINALIZADA! Clique em GERAR TSO para imprimir." });
        } catch (error: any) {
            console.error("Erro ao finalizar venda:", error);
            setMensagem({ tipo: "erro", texto: "ERRO AO FINALIZAR VENDA: " + error.message });
        } finally {
            setCarregando(false);
        }
    };

    const handleCancelarVenda = () => {
        setVenda({ ...vendaVazia });
        setReceitaSelecionada(null);
        setMensagem({ tipo: "erro", texto: "VENDA CANCELADA." });
    };

    return {
        profile,
        view, setView,
        receitaSelecionada, setReceitaSelecionada,
        venda, setVenda,
        produtosSupabase, estoqueLentes, estoqueArmacoes,
        receitasDb, empresas, empresaSelecionada, setEmpresaSelecionada,
        vendaRealizada, dataHora, caixaStatus, mensagem, setMensagem,
        carregando, historicoVendas, vendasFiltradas,
        filtroCliente, setFiltroCliente, filtroDataInicio, setFiltroDataInicio, filtroDataFim, setFiltroDataFim,
        baixandoId, setBaixandoId, baixaValor, setBaixaValor, baixaForma, setBaixaForma,
        handleFinalizarVenda, handleCancelarVenda, handleAddLente, handleAddArmacao,
        handleCarregarNaVenda, handleBaixarPagamento, handleGerarTSO, handleGerarCarne, handleEmitirNota
    };
}
