"use client";

import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";
import { formatarMoeda, parseMoeda } from "@/utils/monetary";

interface Empresa {
    id: number;
    nome_fantasia: string;
    cidade?: string;
}

interface Medico {
    id: number;
    nome: string;
}

interface Venda {
    id: string;
    numero_venda: number;
    data_venda: string;
    total: number;
    empresa_id?: number | null;
    medico_id?: number | null;
    pacientes?: { nome: string } | null;
    medicos?: { nome: string } | null;
}

interface CustoOS {
    id: number;
    empresa_id: number | null;
    data: string;
    valor_venda: number;
    custo_lentes: number;
    custo_armacoes: number;
    custo_mkt: number;
    outros_custos: number;
    medico_nome: string | null;
    numero_tco: string | null;
    empresas?: Empresa;
}

export default function CustoOSPage() {
    const [registros, setRegistros] = useState<CustoOS[]>([]);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [medicos, setMedicos] = useState<Medico[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

    // TSO Autocomplete
    const [tsoSuggestions, setTsoSuggestions] = useState<Venda[]>([]);
    const [showTsoSuggestions, setShowTsoSuggestions] = useState(false);
    const tsoInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        empresa_id: "",
        data: new Date().toISOString().split("T")[0],
        valor_venda: "",
        custo_lentes: "",
        custo_armacoes: "",
        custo_mkt: "",
        outros_custos: "",
        medico_nome: "",
        numero_tso: "",
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [regRes, empRes, medRes] = await Promise.all([
            supabase.from("custos_os").select("*, empresas(id, nome_fantasia, cidade)").order("data", { ascending: false }),
            supabase.from("empresas").select("id, nome_fantasia, cidade").eq("ativo", true).order("cidade"),
            supabase.from("medicos").select("id, nome").eq("ativo", true).order("nome"),
        ]);

        if (regRes.data) setRegistros(regRes.data);
        if (empRes.data) setEmpresas(empRes.data);
        if (medRes.data) setMedicos(medRes.data);
        setLoading(false);
    };

    // Buscar vendas para autocomplete do TSO
    const searchTso = async (termo: string, showRecent: boolean = false) => {
        // Se não tem termo mas quer mostrar recentes
        if ((!termo || termo.length < 1) && !showRecent) {
            setTsoSuggestions([]);
            setShowTsoSuggestions(false);
            return;
        }

        let query = supabase
            .from("vendas")
            .select("id, numero_venda, data_venda, total, empresa_id, medico_id, pacientes(nome)")
            .order("numero_venda", { ascending: false })
            .limit(15);

        // Se tem termo, filtrar por número
        if (termo && termo.length >= 1) {
            const numeroInt = parseInt(termo) || 0;
            if (numeroInt > 0) {
                query = query.eq("numero_venda", numeroInt);
            }
        }

        const { data } = await query;

        if (data && data.length > 0) {
            // Se buscou por número exato e não encontrou, buscar parcialmente
            if (termo && data.length === 0) {
                const { data: allData } = await supabase
                    .from("vendas")
                    .select("id, numero_venda, data_venda, total, empresa_id, medico_id, pacientes(nome)")
                    .order("numero_venda", { ascending: false })
                    .limit(20);

                if (allData) {
                    const filtered = allData.filter(v => v.numero_venda.toString().includes(termo)) as unknown as Venda[];
                    setTsoSuggestions(filtered);
                    setShowTsoSuggestions(filtered.length > 0);
                }
            } else {
                setTsoSuggestions(data as unknown as Venda[]);
                setShowTsoSuggestions(true);
            }
        } else if (showRecent) {
            // Se quer mostrar recentes e não tem termo
            const { data: recentes } = await supabase
                .from("vendas")
                .select("id, numero_venda, data_venda, total, empresa_id, medico_id, pacientes(nome)")
                .order("numero_venda", { ascending: false })
                .limit(10);

            if (recentes && recentes.length > 0) {
                setTsoSuggestions(recentes as unknown as Venda[]);
                setShowTsoSuggestions(true);
            }
        } else {
            setTsoSuggestions([]);
            setShowTsoSuggestions(false);
        }
    };

    const selectTso = async (venda: Venda) => {
        // Buscar itens da venda para calcular custos
        const { data: itens } = await supabase
            .from("vendas_itens")
            .select("quantidade, produtos(tipo, preco_custo)")
            .eq("venda_id", venda.id);

        let custoLentes = 0;
        let custoArmacoes = 0;

        if (itens) {
            itens.forEach((item: any) => {
                const produto = item.produtos;
                if (produto) {
                    const custo = (produto.preco_custo || 0) * (item.quantidade || 1);
                    if (produto.tipo === "lente") {
                        custoLentes += custo;
                    } else if (produto.tipo === "armacao") {
                        custoArmacoes += custo;
                    }
                }
            });
        }

        // Buscar médico se houver medico_id na venda
        let medicoNome = "";
        if (venda.medico_id) {
            const { data: medicoData } = await supabase
                .from("medicos")
                .select("nome")
                .eq("id", venda.medico_id)
                .single();
            if (medicoData) {
                medicoNome = medicoData.nome;
            }
        }

        setForm({
            ...form,
            empresa_id: venda.empresa_id ? venda.empresa_id.toString() : "",
            numero_tso: venda.numero_venda.toString(),
            valor_venda: venda.total.toString(),
            data: venda.data_venda,
            custo_lentes: custoLentes.toString(),
            custo_armacoes: custoArmacoes.toString(),
            medico_nome: medicoNome,
        });
        setShowTsoSuggestions(false);
    };

    const parseValor = (v: string) => parseFloat(v.replace(",", ".")) || 0;

    const handleSubmit = async () => {
        const dados = {
            empresa_id: form.empresa_id ? parseInt(form.empresa_id) : null,
            data: form.data,
            valor_venda: parseValor(form.valor_venda),
            custo_lentes: parseValor(form.custo_lentes),
            custo_armacoes: parseValor(form.custo_armacoes),
            custo_mkt: parseValor(form.custo_mkt),
            outros_custos: parseValor(form.outros_custos),
            medico_nome: form.medico_nome || null,
            numero_tco: form.numero_tso || null,
        };

        if (editandoId) {
            const { error } = await supabase.from("custos_os").update(dados).eq("id", editandoId);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao atualizar" });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Registro atualizado" });
                resetForm();
                fetchData();
            }
        } else {
            const { error } = await supabase.from("custos_os").insert(dados);
            if (error) {
                setMensagem({ tipo: "erro", texto: "Erro ao adicionar" });
            } else {
                setMensagem({ tipo: "sucesso", texto: "Registro adicionado" });
                resetForm();
                fetchData();
            }
        }
    };

    const resetForm = () => {
        setForm({
            empresa_id: "",
            data: new Date().toISOString().split("T")[0],
            valor_venda: "",
            custo_lentes: "",
            custo_armacoes: "",
            custo_mkt: "",
            outros_custos: "",
            medico_nome: "",
            numero_tso: "",
        });
        setEditandoId(null);
        setShowForm(false);
        setShowTsoSuggestions(false);
    };

    const handleEditar = (r: CustoOS) => {
        setForm({
            empresa_id: r.empresa_id?.toString() || "",
            data: r.data,
            valor_venda: r.valor_venda.toString(),
            custo_lentes: r.custo_lentes.toString(),
            custo_armacoes: r.custo_armacoes.toString(),
            custo_mkt: r.custo_mkt.toString(),
            outros_custos: r.outros_custos.toString(),
            medico_nome: r.medico_nome || "",
            numero_tso: r.numero_tco || "",
        });
        setEditandoId(r.id);
        setShowForm(true);
    };

    const handleExcluir = async (id: number) => {
        if (!confirm("Deseja excluir este registro?")) return;
        const { error } = await supabase.from("custos_os").delete().eq("id", id);
        if (!error) {
            setMensagem({ tipo: "sucesso", texto: "Registro excluído" });
            fetchData();
        }
    };

    const formatarValor = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const formatarData = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

    const calcularCustoTotal = (r: CustoOS) => r.custo_lentes + r.custo_armacoes + r.custo_mkt + r.outros_custos;
    const calcularMargem = (r: CustoOS) => r.valor_venda - calcularCustoTotal(r);
    const calcularMargemPercent = (r: CustoOS) => r.valor_venda > 0 ? ((calcularMargem(r) / r.valor_venda) * 100).toFixed(1) : "0";

    const totalVendas = registros.reduce((acc, r) => acc + r.valor_venda, 0);
    const totalCustos = registros.reduce((acc, r) => acc + calcularCustoTotal(r), 0);
    const margemTotal = totalVendas - totalCustos;

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs text-gray-500">CMV</div>
                            <div className="text-lg font-bold text-white">CUSTO DE OS</div>
                        </div>
                        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm font-medium">
                            NOVO REGISTRO
                        </button>
                    </div>

                    {/* Resumo */}
                    <div className="flex gap-6 mt-4">
                        <div className="text-sm"><span className="text-gray-500">VENDAS:</span> <span className="text-blue-400 font-bold">{formatarValor(totalVendas)}</span></div>
                        <div className="text-sm"><span className="text-gray-500">CUSTOS:</span> <span className="text-red-400 font-bold">{formatarValor(totalCustos)}</span></div>
                        <div className="text-sm"><span className="text-gray-500">MARGEM:</span> <span className="text-green-400 font-bold">{formatarValor(margemTotal)}</span></div>
                    </div>

                    {mensagem && (
                        <div className={`mt-4 px-4 py-2 text-sm font-medium ${mensagem.tipo === "sucesso" ? "bg-green-900/50 border border-green-700 text-green-400" : "bg-red-900/50 border border-red-700 text-red-400"}`}>
                            {mensagem.texto}
                        </div>
                    )}
                </div>

                {/* Formulário */}
                {showForm && (
                    <div className="bg-gray-900 border border-gray-800 p-4 mb-4">
                        <div className="grid grid-cols-4 gap-4 mb-4">
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">EMPRESA</label>
                                <select value={form.empresa_id} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm">
                                    <option value="">Selecione...</option>
                                    {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia}{e.cidade ? ` - ${e.cidade}` : ''}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">DATA</label>
                                <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm [color-scheme:dark]" />
                            </div>

                            {/* Campo TSO com Autocomplete */}
                            <div className="relative">
                                <label className="text-xs text-gray-500 block mb-1">Nº TSO</label>
                                <input
                                    ref={tsoInputRef}
                                    type="text"
                                    placeholder="Clique para ver recentes"
                                    value={form.numero_tso}
                                    onChange={(e) => {
                                        setForm({ ...form, numero_tso: e.target.value });
                                        searchTso(e.target.value);
                                    }}
                                    onFocus={() => searchTso(form.numero_tso, true)}
                                    onBlur={() => setTimeout(() => setShowTsoSuggestions(false), 200)}
                                    className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                                />
                                {showTsoSuggestions && tsoSuggestions.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 max-h-48 overflow-auto">
                                        {tsoSuggestions.map((v) => (
                                            <div
                                                key={v.id}
                                                onClick={() => selectTso(v)}
                                                className="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm"
                                            >
                                                <div className="text-white font-bold">TSO #{v.numero_venda}</div>
                                                <div className="text-gray-400 text-xs">
                                                    {formatarData(v.data_venda)} - {formatarValor(v.total)}
                                                    {v.pacientes?.nome && ` - ${v.pacientes.nome}`}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 block mb-1">MÉDICO</label>
                                <select
                                    value={form.medico_nome}
                                    onChange={(e) => setForm({ ...form, medico_nome: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                                >
                                    <option value="">Selecione...</option>
                                    {medicos.map(m => <option key={m.id} value={m.nome}>{m.nome}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">VALOR VENDA</label>
                                <input
                                    type="text"
                                    placeholder="R$ 0,00"
                                    value={formatarMoeda(form.valor_venda)}
                                    onChange={(e) => setForm({ ...form, valor_venda: parseMoeda(e.target.value).toString() })}
                                    className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm text-right font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">CUSTO LENTES</label>
                                <input
                                    type="text"
                                    placeholder="R$ 0,00"
                                    value={formatarMoeda(form.custo_lentes)}
                                    onChange={(e) => setForm({ ...form, custo_lentes: parseMoeda(e.target.value).toString() })}
                                    className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm text-right font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">CUSTO ARMAÇÕES</label>
                                <input
                                    type="text"
                                    placeholder="R$ 0,00"
                                    value={formatarMoeda(form.custo_armacoes)}
                                    onChange={(e) => setForm({ ...form, custo_armacoes: parseMoeda(e.target.value).toString() })}
                                    className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm text-right font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">CUSTO MKT</label>
                                <input
                                    type="text"
                                    placeholder="R$ 0,00"
                                    value={formatarMoeda(form.custo_mkt)}
                                    onChange={(e) => setForm({ ...form, custo_mkt: parseMoeda(e.target.value).toString() })}
                                    className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm text-right font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 block mb-1">OUTROS CUSTOS</label>
                                <input
                                    type="text"
                                    placeholder="R$ 0,00"
                                    value={formatarMoeda(form.outros_custos)}
                                    onChange={(e) => setForm({ ...form, outros_custos: parseMoeda(e.target.value).toString() })}
                                    className="w-full bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm text-right font-mono"
                                />
                            </div>
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
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">DATA</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">EMPRESA</th>
                                    <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">TSO</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">VENDA</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">CUSTO</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">MARGEM</th>
                                    <th className="text-right text-xs text-gray-400 font-medium px-4 py-3">AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registros.map((r) => (
                                    <tr key={r.id} className="border-t border-gray-800 hover:bg-gray-800/50">
                                        <td className="px-4 py-3 text-gray-400 text-sm">{formatarData(r.data)}</td>
                                        <td className="px-4 py-3 text-white text-sm">{r.empresas ? `${r.empresas.nome_fantasia}${r.empresas.cidade ? ` - ${r.empresas.cidade}` : ''}` : "-"}</td>
                                        <td className="px-4 py-3 text-gray-400 text-sm">{r.numero_tco || "-"}</td>
                                        <td className="px-4 py-3 text-right text-blue-400 text-sm font-mono">{formatarValor(r.valor_venda)}</td>
                                        <td className="px-4 py-3 text-right text-red-400 text-sm font-mono">{formatarValor(calcularCustoTotal(r))}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`text-sm font-mono ${calcularMargem(r) >= 0 ? "text-green-400" : "text-red-400"}`}>
                                                {formatarValor(calcularMargem(r))} ({calcularMargemPercent(r)}%)
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleEditar(r)} className="text-blue-500 hover:text-blue-400 text-xs font-medium mr-2">EDITAR</button>
                                            <button onClick={() => handleExcluir(r.id)} className="text-red-500 hover:text-red-400 text-xs font-medium">EXCLUIR</button>
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
