"use client";

import { useState, useEffect, useMemo } from "react";
import MainLayout from "@/components/MainLayout";
import PrescriptionBox from "@/components/vendas/PrescriptionBox";
import SaleForm from "@/components/vendas/SaleForm";
import StockList from "@/components/vendas/StockList";
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
} from "@/data/vendasData";
import { TSOData, abrirTSO } from "@/utils/tso";
import { CarneData, abrirCarne } from "@/utils/carne";
import { formatarMoeda, parseMoeda } from "@/utils/monetary";
import { fiscalService } from "@/services/fiscal";

// Interface para produto do Supabase
interface ProdutoSupabase {
    id: string;
    tipo: string;
    nome: string;
    codigo: string | null;
    marca: string | null;
    preco_unitario: number;
    quantidade: number;
    quantidade_minima: number;
}

// Interface para empresa do Supabase
interface EmpresaSupabase {
    id: number;
    nome_fantasia: string;
    telefone: string;
    cidade: string;
    estado: string;
    endereco: {
        logradouro: string;
        numero: string;
        complemento?: string;
        bairro: string;
        cidade: string;
        estado: string;
        cep: string;
    } | null;
    cnpj?: string;
}

// Interface para consulta do Supabase (receita)
interface ConsultaSupabase {
    id: string;
    paciente_id: string;
    data: string;
    queixa_principal: string | null;
    tipo_lente: string | null;
    observacoes_receita: string | null;
    exame_od_esferico: string | null;
    exame_od_cilindrico: string | null;
    exame_od_eixo: string | null;
    exame_od_adicao: string | null;
    exame_od_dnp: string | null;
    exame_oe_esferico: string | null;
    exame_oe_cilindrico: string | null;
    exame_oe_eixo: string | null;
    exame_oe_adicao: string | null;
    exame_oe_dnp: string | null;
    pacientes: {
        id: string;
        nome: string;
    } | null;
}

export default function VendasPage() {
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
    const [caixaStatus, setCaixaStatus] = useState<"aberto" | "fechado">("aberto");
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

    // Buscar produtos, receitas e empresas do Supabase
    useEffect(() => {
        fetchProdutos();
        fetchReceitas();
        fetchEmpresas();
        fetchVendasCount();
        if (view === "historico") fetchHistorico();
    }, [empresaSelecionada, view]);

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
        let query = supabase
            .from('produtos')
            .select('*')
            .eq('ativo', true);

        if (empresaSelecionada) {
            query = query.eq('empresa_id', empresaSelecionada.id);
        }

        const { data, error } = await query.order('nome');

        if (!error && data) {
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
        setCarregando(false);
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
                    id: consulta.id, // Keep the UUID
                    pacienteId: consulta.paciente_id || "", // Keep as UUID string
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
                .order('nome_fantasia');

            if (!error && data && data.length > 0) {
                setEmpresas(data);

                // Se o usuário tem unidade fixa, seleciona ela
                if (profile?.unit_id) {
                    const assignedUnit = data.find(u => u.id === profile.unit_id);
                    if (assignedUnit) {
                        setEmpresaSelecionada(assignedUnit);
                    } else {
                        // Caso a unidade do usuário não seja encontrada (ex: inativa), fallback segura
                        console.warn("Unidade do usuário não encontrada ou inativa.");
                        setEmpresaSelecionada(data[0]);
                    }
                }
                // Auto-selecionar a primeira empresa se não houver selecionada ainda
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

    const handleBaixarPagamento = async (vendaId: string, valor: number, forma: string) => {
        if (valor <= 0) {
            setMensagem({ tipo: "erro", texto: "INFORME UM VALOR VÁLIDO PARA BAIXA" });
            return;
        }

        try {
            setCarregando(true);

            // 1. Registrar o pagamento na tabela de vendas_pagamentos
            const { error: erroPagto } = await supabase
                .from('vendas_pagamentos')
                .insert({
                    venda_id: vendaId,
                    valor: valor,
                    forma_pagamento: forma,
                    empresa_id: empresaSelecionada?.id,
                    data: new Date().toISOString().split('T')[0]
                });

            if (erroPagto) throw erroPagto;

            // 2. Registrar no financeiro (financeiro_movimentacoes)
            const { error: erroFin } = await supabase
                .from('financeiro_movimentacoes')
                .insert({
                    tipo: 'entrada',
                    origem_motivo: 'manual',
                    descricao: `RECEBIMENTO VENDA #${vendaId.slice(-4)}`,
                    valor: valor,
                    forma_pagamento: forma,
                    empresa_id: empresaSelecionada?.id,
                    data: new Date().toISOString().split('T')[0],
                    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                });

            if (erroFin) throw erroFin;

            setMensagem({ tipo: "sucesso", texto: "PAGAMENTO REGISTRADO COM SUCESSO!" });
            setBaixandoId(null);
            setBaixaValor(0);
            fetchHistorico(); // Atualiza a lista
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

    // Removido useEffect duplicado de fetchHistorico

    // Função para gerar TSO
    const handleGerarTSO = (saleData?: { venda: Venda; receita: ReceitaParaVenda | null; numeroVenda?: number }) => {
        const dataToUse = saleData || vendaRealizada;

        if (!dataToUse || !empresaSelecionada) {
            setMensagem({ tipo: "erro", texto: "Dados da venda não encontrados para gerar o TSO" });
            return;
        }

        const { venda: vendaFinal, receita, numeroVenda } = dataToUse;
        const hoje = new Date();
        const dataEntrega = new Date(hoje);
        dataEntrega.setDate(dataEntrega.getDate() + 7); // Entrega em 7 dias

        // Encontrar armação e lente nos itens
        const armacaoItem = vendaFinal.itens.find(i => i.tipo === "armacao");
        const lenteItem = vendaFinal.itens.find(i => i.tipo === "lente");

        const tsoData: TSOData = {
            empresa: empresaSelecionada,
            numeroReceituario: numeroVenda || numeroTSO,
            dataEmissao: hoje.toLocaleDateString("pt-BR"),
            dataEntrega: dataEntrega.toLocaleDateString("pt-BR"),
            hora: hoje.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            clienteCodigo: "-", // Removido clienteCodigo conforme solicitado anteriormente
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

    // Função para gerar Carnê
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

    // Função para emitir Nota Fiscal
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

    // Limpar mensagem após 3 segundos
    useEffect(() => {
        if (mensagem) {
            const timer = setTimeout(() => setMensagem(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [mensagem]);

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
            // Incrementar quantidade (para óculos, normalmente são 2 lentes)
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
            // Adicionar novo item
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

        try {
            setCarregando(true);
            // 1. Criar a venda no Supabase
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

            // 2. Inserir itens da venda e atualizar estoque
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

            // 3. Registrar no Financeiro (fluxo de caixa ou registro de faturamento)
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

            // 4. Registrar o pagamento inicial se não for parcelado (no histórico de pagamentos)
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

            // 4. Finalização
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

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header da Venda - Contexto do Atendimento */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div>
                                <div className="text-xs text-gray-500">MÓDULO</div>
                                <div className="text-lg font-bold text-white uppercase tracking-tighter">Vendas</div>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div className="flex bg-gray-900 border border-gray-800 p-0.5 rounded">
                                <button
                                    onClick={() => setView("pdv")}
                                    className={`px-4 py-1.5 text-xs font-bold transition-all ${view === "pdv" ? "bg-gray-800 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
                                >
                                    LANÇAR VENDA
                                </button>
                                <button
                                    onClick={() => setView("historico")}
                                    className={`px-4 py-1.5 text-xs font-bold transition-all ${view === "historico" ? "bg-gray-800 text-white shadow-lg" : "text-gray-500 hover:text-gray-300"}`}
                                >
                                    HISTÓRICO
                                </button>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">UNIDADE</div>
                                <select
                                    value={empresaSelecionada?.id || ""}
                                    disabled={!!profile?.unit_id}
                                    onChange={(e) => {
                                        const emp = empresas.find(em => em.id === Number(e.target.value));
                                        if (emp) setEmpresaSelecionada(emp);
                                    }}
                                    className={`bg-transparent border-none text-sm font-bold text-white p-0 focus:outline-none transition-all ${profile?.unit_id ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:text-green-500'}`}
                                >
                                    {empresas.map(emp => (
                                        <option key={emp.id} value={emp.id} className="bg-gray-900 text-white">{emp.nome_fantasia}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div>
                                <div className="text-xs text-gray-500">CAIXA</div>
                                <div className={`text-sm font-medium ${caixaStatus === "aberto" ? "text-green-500" : "text-red-500"}`}>
                                    {caixaStatus.toUpperCase()}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {view === "pdv" && venda.pacienteNome && (
                                <div className="mr-4">
                                    <div className="text-[10px] text-gray-500 uppercase">CLIENTE EM ATENDIMENTO</div>
                                    <div className="text-sm font-bold text-white">{venda.pacienteNome}</div>
                                </div>
                            )}
                            {vendaRealizada && view === "pdv" && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleGerarTSO()}
                                        className="px-4 py-1.5 bg-gray-800 border border-gray-700 text-xs font-bold text-gray-200 hover:bg-gray-700 hover:text-white transition-all flex items-center gap-2"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                        GERAR TSO
                                    </button>
                                    {vendaRealizada.venda.formaPagamento === "Parcelado" && (
                                        <button
                                            onClick={() => handleGerarCarne()}
                                            className="px-4 py-1.5 bg-gray-800 border border-gray-700 text-xs font-bold text-gray-200 hover:bg-gray-700 hover:text-white transition-all flex items-center gap-2"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                            GERAR CARNÊ
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEmitirNota(vendaRealizada.vendaId, 65)}
                                        className="px-4 py-1.5 bg-green-900 border border-green-700 text-xs font-bold text-white hover:bg-green-700 transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                        EMITIR CUPOM (NFC-e)
                                    </button>
                                    <button
                                        onClick={() => handleEmitirNota(vendaRealizada.vendaId, 55)}
                                        className="px-4 py-1.5 bg-blue-900 border border-blue-700 text-xs font-bold text-white hover:bg-blue-700 transition-all flex items-center gap-2"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-white opacity-50"></span>
                                        EMITIR NOTA (NF-e)
                                    </button>
                                </div>
                            )}
                            <div className="text-right">
                                <div className="text-xs text-gray-500">DATA/HORA</div>
                                <div className="text-sm font-mono text-white">{dataHora}</div>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500">OPERADOR</div>
                                <div className="text-sm text-white">ADMIN</div>
                            </div>
                        </div>
                    </div>

                    {/* Mensagem de feedback */}
                    {mensagem && (
                        <div className={`mt-4 px-4 py-2 text-sm font-medium ${mensagem.tipo === "sucesso"
                            ? "bg-green-900/50 border border-green-700 text-green-400"
                            : "bg-red-900/50 border border-red-700 text-red-400"
                            }`}>
                            {mensagem.texto}
                        </div>
                    )}
                </div>

                {/* Conteúdo dinâmico baseado na view */}
                {view === "pdv" ? (
                    <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
                        {/* Coluna 1 - Receitas (Esquerda) */}
                        <div className="col-span-3">
                            <PrescriptionBox
                                receitas={receitasDb}
                                receitaSelecionada={receitaSelecionada}
                                onSelectReceita={setReceitaSelecionada}
                                onCarregarNaVenda={handleCarregarNaVenda}
                            />
                        </div>

                        {/* Coluna 2 - Venda (Centro - Foco Principal) */}
                        <div className="col-span-6">
                            <SaleForm
                                venda={venda}
                                receita={receitaSelecionada}
                                onUpdateVenda={setVenda}
                                onFinalizarVenda={handleFinalizarVenda}
                                onCancelarVenda={handleCancelarVenda}
                            />
                        </div>

                        {/* Coluna 3 - Estoque (Direita) */}
                        <div className="col-span-3">
                            <StockList
                                lentes={estoqueLentes}
                                armacoes={estoqueArmacoes}
                                onAddLente={handleAddLente}
                                onAddArmacao={handleAddArmacao}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-gray-900 border border-gray-800 flex flex-col min-h-0">
                        {/* Filtros do Histórico */}
                        <div className="p-4 border-b border-gray-800 flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Buscar Cliente</label>
                                <input
                                    type="text"
                                    value={filtroCliente}
                                    onChange={(e) => setFiltroCliente(e.target.value)}
                                    placeholder="Nome do paciente..."
                                    className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div className="w-40">
                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Início</label>
                                <input
                                    type="date"
                                    value={filtroDataInicio}
                                    onChange={(e) => setFiltroDataInicio(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-blue-500 focus:outline-none [color-scheme:dark]"
                                />
                            </div>
                            <div className="w-40">
                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Fim</label>
                                <input
                                    type="date"
                                    value={filtroDataFim}
                                    onChange={(e) => setFiltroDataFim(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-blue-500 focus:outline-none [color-scheme:dark]"
                                />
                            </div>
                            <div className="pt-5">
                                <button
                                    onClick={() => {
                                        setFiltroCliente("");
                                        setFiltroDataInicio("");
                                        setFiltroDataFim("");
                                    }}
                                    className="px-3 py-1.5 bg-gray-700 text-gray-300 text-xs font-bold hover:bg-gray-600 transition-all"
                                >
                                    LIMPAR
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-800/50 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Data</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Parcelas</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pagamento (Dar Baixa)</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Documentos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {vendasFiltradas.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">Nenhuma venda encontrada com os filtros atuais</td>
                                        </tr>
                                    ) : (
                                        vendasFiltradas.map((v) => {
                                            const totalPago = v.vendas_pagamentos?.reduce((acc: number, p: any) => acc + Number(p.valor), 0) || 0;
                                            const saldoDevedor = v.total - totalPago;
                                            const quitado = saldoDevedor <= 0.01;

                                            return (
                                                <tr key={v.id} className="hover:bg-gray-800/20 transition-all">
                                                    <td className="px-6 py-4 text-sm font-mono text-gray-400">
                                                        {new Date(v.created_at).toLocaleDateString("pt-BR")}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-bold text-white uppercase">
                                                        {v.pacientes?.nome || "Cliente Avulso"}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-mono text-green-500 font-bold whitespace-nowrap">
                                                        R$ {v.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-mono text-gray-300">
                                                        {v.parcelas || 1}x {v.valor_parcela ? `de R$ ${Number(v.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ""}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {quitado ? (
                                                            <span className="text-[10px] font-bold bg-green-900/30 text-green-500 px-2 py-1 rounded">QUITADO</span>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <div className="relative">
                                                                    <span className="absolute left-2 top-1.5 text-[10px] text-gray-500">R$</span>
                                                                    <input
                                                                        type="text"
                                                                        value={baixandoId === v.id ? formatarMoeda(baixaValor) : ""}
                                                                        placeholder={v.valor_parcela ? Number(v.valor_parcela).toFixed(2) : saldoDevedor.toFixed(2)}
                                                                        className="w-24 pl-6 pr-2 py-1 bg-gray-800 border border-gray-700 text-xs text-white focus:border-green-500 focus:outline-none font-mono"
                                                                        onChange={(e) => {
                                                                            setBaixandoId(v.id);
                                                                            setBaixaValor(parseMoeda(e.target.value));
                                                                        }}
                                                                    />
                                                                </div>
                                                                <select
                                                                    className="bg-gray-800 border border-gray-700 text-[10px] text-white py-1 focus:outline-none"
                                                                    onChange={(e) => setBaixaForma(e.target.value)}
                                                                >
                                                                    <option value="Dinheiro">DINHEIRO</option>
                                                                    <option value="PIX">PIX</option>
                                                                    <option value="Cartao Debito">DÉBITO</option>
                                                                    <option value="Cartao Credito">CRÉDITO</option>
                                                                </select>
                                                                <button
                                                                    onClick={() => handleBaixarPagamento(v.id, baixandoId === v.id ? baixaValor : 0, baixaForma)}
                                                                    disabled={carregando}
                                                                    className={`p-1 border rounded transition-all ${carregando ? "bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed" : "bg-green-900/40 border-green-800 text-green-500 hover:bg-green-700 hover:text-white"}`}
                                                                    title="Confirmar Baixa"
                                                                >
                                                                    {carregando && baixandoId === v.id ? "..." : "✓"}
                                                                </button>
                                                            </div>
                                                        )}
                                                        {!quitado && (
                                                            <div className="mt-1 text-[10px] text-gray-500 italic">
                                                                Faltam R$ {saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    const vendaAdaptada: Venda = {
                                                                        ...vendaVazia,
                                                                        total: v.total,
                                                                        pacienteNome: v.pacientes?.nome || "Cliente Avulso",
                                                                        formaPagamento: v.forma_pagamento,
                                                                        itens: v.vendas_itens.map((item: any) => ({
                                                                            tipo: item.produtos?.tipo || "lente",
                                                                            nome: item.produtos?.nome || "Produto",
                                                                            precoTotal: item.preco_total
                                                                        }))
                                                                    };
                                                                    handleGerarTSO({ venda: vendaAdaptada, receita: null });
                                                                }}
                                                                className="px-3 py-1 bg-blue-900/30 border border-blue-800 text-blue-400 text-[10px] font-bold hover:bg-blue-800 hover:text-white transition-all uppercase"
                                                            >
                                                                TSO
                                                            </button>
                                                            {v.forma_pagamento === "Parcelado" && (
                                                                <button
                                                                    onClick={() => {
                                                                        const vendaAdaptada: Venda = {
                                                                            ...vendaVazia,
                                                                            total: v.total,
                                                                            pacienteNome: v.pacientes?.nome || "Cliente Avulso",
                                                                            formaPagamento: "Parcelado",
                                                                            parcelas: v.parcelas || 1
                                                                        };
                                                                        handleGerarCarne({ venda: vendaAdaptada, numeroVenda: v.numero_venda });
                                                                    }}
                                                                    className="px-3 py-1 bg-orange-900/30 border border-orange-800 text-orange-400 text-[10px] font-bold hover:bg-orange-800 hover:text-white transition-all uppercase"
                                                                >
                                                                    CARNÊ
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleEmitirNota(v.id, 65)}
                                                                className="px-2 py-0.5 bg-green-900/40 border border-green-800 text-green-500 text-[9px] font-bold hover:bg-green-700 hover:text-white transition-all uppercase"
                                                                title="Emitir Cupom Fiscal"
                                                            >
                                                                NFC-e
                                                            </button>
                                                            <button
                                                                onClick={() => handleEmitirNota(v.id, 55)}
                                                                className="px-2 py-0.5 bg-blue-900/40 border border-blue-800 text-blue-400 text-[9px] font-bold hover:bg-blue-700 hover:text-white transition-all uppercase"
                                                                title="Emitir Nota Fiscal Completa"
                                                            >
                                                                NF-e
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
