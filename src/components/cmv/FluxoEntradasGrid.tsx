"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { imprimirRelatorioFluxoSemanal, ReportFluxoSemanalData } from "@/utils/reportUtils"

interface CategoriaFluxo {
    id: string;
    nome: string;
    tipo_sistema: string;
    tipo_fluxo: 'entrada' | 'saida';
    ordem: number;
}

interface ValorDiario {
    id?: string;
    data_referencia: string;
    categoria_id: string;
    valor: number;
}

interface EventoDiario {
    id?: string;
    data_referencia: string;
    observacao: string;
}

interface Empresa {
    id: string;
    nome_fantasia: string;
    cidade: string;
}

export default function FluxoEntradasGrid() {
    // Estado inicial: Hoje (A data que orientará a semana)
    const [currentDate, setCurrentDate] = useState(new Date());
    const [empresa, setEmpresa] = useState("TODAS");
    const [empresasList, setEmpresasList] = useState<Empresa[]>([]);
    
    const [categorias, setCategorias] = useState<CategoriaFluxo[]>([]);
    const [entradas, setEntradas] = useState<Record<string, ValorDiario>>({});
    const [eventos, setEventos] = useState<Record<string, EventoDiario>>({});
    const [loading, setLoading] = useState(true);

    const categoriasEntrada = categorias.filter(c => c.tipo_fluxo === 'entrada');
    const categoriasSaida = categorias.filter(c => c.tipo_fluxo === 'saida');

    useEffect(() => {
        carregarTudo();
    }, [currentDate, empresa]);

    const getWeekDays = () => {
        let dias = [];
        // Encontra a segunda-feira da semana de currentDate
        const d = new Date(currentDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(d.setDate(diff));

        // Gera iterativamente os dias de Segunda(0) a Sábado(5) da semana da data atual
        for (let i = 0; i < 6; i++) {
            const di = new Date(startOfWeek);
            di.setDate(startOfWeek.getDate() + i);
            dias.push(di);
        }
        return dias;
    };

    const diasDaSemana = getWeekDays();

    const carregarTudo = async () => {
        setLoading(true);
        
        // 1. Carregar Categorias e Empresas
        const [resCats, resEmpresas] = await Promise.all([
            supabase.from("cmv_entradas_categorias").select("*").eq("ativo", true).order("ordem"),
            supabase.from("empresas").select("id, nome_fantasia, cidade").eq("ativo", true).order("nome_fantasia")
        ]);

        if (resCats.data) setCategorias(resCats.data);
        if (resEmpresas.data) setEmpresasList(resEmpresas.data);

        // 2. Carregar Valores da Semana
        const dataInicio = diasDaSemana[0].toISOString().split('T')[0];
        const dataFim = diasDaSemana[5].toISOString().split('T')[0];

        let qVals = supabase
            .from("cmv_entradas_diarias")
            .select("*")
            .gte("data_referencia", dataInicio)
            .lte("data_referencia", dataFim);
        
        if (empresa !== "TODAS") {
            qVals = qVals.eq("empresa_id", empresa);
        }

        const { data: vals } = await qVals;

        const dictVals: Record<string, ValorDiario> = {};
        if (vals) {
            vals.forEach(v => {
                const key = `${v.data_referencia}_${v.categoria_id}`;
                if (dictVals[key]) {
                    dictVals[key].valor += Number(v.valor);
                } else {
                    dictVals[key] = { ...v, valor: Number(v.valor) };
                }
            });
        }
        setEntradas(dictVals);

        // 3. Carregar Eventos
        let qEvts = supabase
            .from("cmv_entradas_eventos")
            .select("*")
            .gte("data_referencia", dataInicio)
            .lte("data_referencia", dataFim);
            
        if (empresa !== "TODAS") {
            qEvts = qEvts.eq("empresa_id", empresa);
        }

        const { data: evts } = await qEvts;
            
        const dictEvts: Record<string, EventoDiario> = {};
        if (evts) {
            evts.forEach(e => { 
                if (dictEvts[e.data_referencia]) {
                    dictEvts[e.data_referencia].observacao += ` | ${e.observacao}`;
                } else {
                    dictEvts[e.data_referencia] = { ...e };
                }
            });
        }
        setEventos(dictEvts);

        setLoading(false);
    };

    const handleValorChange = async (data_ref: string, categoria_id: string, value: string) => {
        if (empresa === "TODAS") return; // View-only mode for consolidated
        const valNum = parseFloat(value) || 0;
        const key = `${data_ref}_${categoria_id}`;
        
        try {
            const payload = { empresa_id: Number(empresa), data_referencia: data_ref, categoria_id, valor: valNum };
            const { error } = await supabase.from("cmv_entradas_diarias").upsert(
                payload,
                { onConflict: "empresa_id, data_referencia, categoria_id" }
            );
            if (!error) {
                setEntradas(prev => ({...prev, [key]: { ...prev[key], ...payload }}));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleEventoChange = async (data_ref: string, obs: string) => {
        if (empresa === "TODAS") return; // View-only mode for consolidated
        // To allow clearing, we still call the DB even if empty
        try {
            const payload = { empresa_id: Number(empresa), data_referencia: data_ref, observacao: obs };
            const { error } = await supabase.from("cmv_entradas_eventos").upsert(
                payload,
                { onConflict: "empresa_id, data_referencia" }
            );
            if (!error) {
                setEventos(prev => ({...prev, [data_ref]: { ...prev[data_ref], ...payload }}));
            }
        } catch(e) {
            console.error(e);
        }
    };

    // --- Calculos ---
    const calcularTotalDia = (data_ref: string, tipo: 'entrada' | 'saida') => {
        let total = 0;
        const cats = tipo === 'entrada' ? categoriasEntrada : categoriasSaida;
        cats.forEach(c => {
            const key = `${data_ref}_${c.id}`;
            total += (entradas[key]?.valor || 0);
        });
        return total;
    };

    const calcularSaldoReal = (data_ref: string) => {
        return calcularTotalDia(data_ref, 'entrada') - calcularTotalDia(data_ref, 'saida');
    };

    const formatadorBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    // Helper hook auto scroll para card
    useEffect(() => {
        if (!loading) {
            const el = document.getElementById(`card-${currentDate.toISOString().split('T')[0]}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            }
        }
    }, [currentDate, loading]);

    const handlePrint = () => {
        const empresaSelecionada = empresasList.find(e => e.id.toString() === empresa);
        const dataInicio = diasDaSemana[0].toLocaleDateString('pt-BR');
        const dataFim = diasDaSemana[diasDaSemana.length - 1].toLocaleDateString('pt-BR');

        const diasStrings = diasDaSemana.map((d: Date) => 
            d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase() + ' ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        );

        const eventosArray = diasDaSemana.map(d => {
            const dr = d.toISOString().split('T')[0];
            return eventos[dr]?.observacao || '';
        });

        const mapCategoriasEntrada = categoriasEntrada.map(c => {
            let totalCat = 0;
            const valoresDia = diasDaSemana.map((d: Date) => {
                const dr = d.toISOString().split('T')[0];
                const key = `${dr}_${c.id}`;
                const v = entradas[key]?.valor ?? null;
                if (v !== null) totalCat += v;
                return v;
            });
            return { nome: c.nome, valores: valoresDia, total: totalCat };
        });

        const mapCategoriasSaida = categoriasSaida.map(c => {
            let totalCat = 0;
            const valoresDia = diasDaSemana.map((d: Date) => {
                const dr = d.toISOString().split('T')[0];
                const key = `${dr}_${c.id}`;
                const v = entradas[key]?.valor ?? null;
                if (v !== null) totalCat += v;
                return v;
            });
            return { nome: c.nome, valores: valoresDia, total: totalCat };
        });

        let totalGeralEntradas = 0;
        let totalGeralSaidas = 0;

        const totaisEntradasDia = diasDaSemana.map((d: Date) => {
            const dr = d.toISOString().split('T')[0];
            const sum = categoriasEntrada.reduce((acc, c) => acc + (entradas[`${dr}_${c.id}`]?.valor || 0), 0);
            totalGeralEntradas += sum;
            return sum;
        });

        const totaisSaidasDia = diasDaSemana.map((d: Date) => {
            const dr = d.toISOString().split('T')[0];
            const sum = categoriasSaida.reduce((acc, c) => acc + (entradas[`${dr}_${c.id}`]?.valor || 0), 0);
            totalGeralSaidas += sum;
            return sum;
        });

        const saldosPorDia = diasDaSemana.map((_, i) => totaisEntradasDia[i] - totaisSaidasDia[i]);
        const saldoFinalVisao = totalGeralEntradas - totalGeralSaidas;

        const reportData: ReportFluxoSemanalData = {
            titulo: "FECHAMENTO DE MOVIMENTO SEMANAL",
            unidade: empresa === "TODAS" ? "TODAS AS LOJAS (CONSOLIDADO)" : (empresaSelecionada?.cidade || empresaSelecionada?.nome_fantasia || "Loja Desconhecida").toUpperCase(),
            operador: "Admin",
            dataInicio,
            dataFim,
            diasDaSemana: diasStrings,
            categoriasEntrada: mapCategoriasEntrada,
            categoriasSaida: mapCategoriasSaida,
            totaisEntradaPorDia: totaisEntradasDia,
            totaisSaidaPorDia: totaisSaidasDia,
            saldosPorDia,
            eventosPorDia: eventosArray,
            totalGeralEntradas,
            totalGeralSaidas,
            saldoVisaoFinal: saldoFinalVisao
        };

        imprimirRelatorioFluxoSemanal(reportData);
    };

    if (loading && categorias.length === 0) return <div className="p-4 text-gray-400">Preparando fluxo...</div>;

    return (
        <div className="flex flex-col h-full bg-transparent overflow-y-auto overflow-x-hidden pb-12">
            {/* Oculta o header na hora de imprimir */}
            <div className="print:hidden flex flex-col gap-6">
                
                {/* 1. Header de Controles */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-gray-900 border border-gray-800 rounded-lg shadow-xl gap-4">
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="flex bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shrink-0">
                            <span className="px-3 py-2 bg-gray-800 text-gray-400 text-xs font-bold uppercase flex items-center border-r border-gray-700">Data Alvo</span>
                            <input 
                                type="date" 
                                className="bg-transparent text-white px-3 py-2 outline-none text-sm cursor-pointer hover:bg-gray-700/50 transition-colors"
                                value={currentDate.toISOString().split('T')[0]}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setCurrentDate(new Date(`${e.target.value}T12:00:00`)); 
                                    }
                                }}
                            />
                        </div>

                        <div className="flex bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shrink-0">
                            <span className="px-3 py-2 bg-gray-800 text-gray-400 text-xs font-bold uppercase flex items-center border-r border-gray-700">Empresa</span>
                            <select 
                                className="bg-transparent text-white px-3 py-2 outline-none text-sm min-w-[160px] cursor-pointer hover:bg-gray-700/50 transition-colors"
                                value={empresa}
                                onChange={(e) => setEmpresa(e.target.value)}
                            >
                                <option value="TODAS" className="bg-gray-800 text-white">Todas as Lojas</option>
                                {empresasList.map((emp: Empresa) => (
                                    <option key={emp.id} value={emp.id.toString()} className="bg-gray-800 text-white">{emp.cidade || emp.nome_fantasia}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-2 shrink-0 ml-auto">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            IMPRIMIR MATRIZ (SEMANA)
                        </button>
                    </div>
                </div>

                {/* 2. Navegador de Dias da Semana (Tabs) */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-2 2xl:p-4 shadow-lg overflow-x-auto">
                    <div className="flex items-center justify-between min-w-max gap-2">
                        <button onClick={() => setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; })} className="px-4 py-3 bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        
                        <div className="flex gap-2 flex-1 justify-center px-4">
                            {diasDaSemana.map((dia: Date) => {
                                const data_ref = dia.toISOString().split('T')[0];
                                const isSelected = data_ref === currentDate.toISOString().split('T')[0];
                                const diaNum = dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                const diaSemanaTexto = dia.toLocaleDateString('pt-BR', { weekday: 'short' });
                                
                                const temEvento = !!eventos[data_ref]?.observacao?.trim();
                                
                                return (
                                    <button 
                                        key={data_ref}
                                        onClick={() => setCurrentDate(dia)}
                                        className={`relative flex flex-col items-center justify-center w-28 py-2 rounded-lg border transition-all duration-300 ${isSelected ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-blue-500' : 'bg-gray-800/40 border-gray-800 hover:bg-gray-800 hover:border-gray-700'} `}
                                    >
                                        {temEvento && (
                                            <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" title="Este dia possui uma observação/evento"></div>
                                        )}
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-blue-400' : 'text-gray-500'}`}>{diaSemanaTexto}</span>
                                        <span className={`text-base font-medium mt-1 ${isSelected ? 'text-white' : 'text-gray-300'}`}>{diaNum}</span>
                                    </button>
                                );
                            })}
                        </div>
                        
                        <button onClick={() => setCurrentDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; })} className="px-4 py-3 bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>

                {/* 3. Área Principal de Lançamento (Dia Único) */}
                {(() => {
                    const data_ref = currentDate.toISOString().split('T')[0];
                    const obsValue = eventos[data_ref]?.observacao || "";
                    
                    return (
                        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            {/* Anotações do Dia */}
                            <div className="bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-800 rounded-lg p-4 flex items-center gap-4 shadow-lg focus-within:border-gray-600 transition-colors">
                                <div className="text-gray-500 flex flex-col justify-center items-center w-12 shrink-0">
                                    <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </div>
                                <input 
                                    type="text" 
                                    disabled={empresa === "TODAS"}
                                    className={`w-full bg-transparent text-lg focus:outline-none placeholder-gray-600 ${empresa === "TODAS" ? 'text-gray-500 cursor-not-allowed' : 'text-gray-200'}`}
                                    placeholder={empresa === "TODAS" ? "Selecione uma loja para registrar observações" : "Anotações e ocorrências deste dia (Ex: Feriado, Sangria de Manhã, Fechou cedo...)"}
                                    value={obsValue}
                                    onChange={(e) => setEventos(prev => ({...prev, [data_ref]: { ...prev[data_ref], data_referencia: data_ref, observacao: e.target.value }}))}
                                    onBlur={(e) => handleEventoChange(data_ref, e.target.value)}
                                />
                            </div>

                            {/* Colunas Entrada x Saída */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                                
                                {/* Coluna ENTRADAS */}
                                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
                                    <div className="bg-gradient-to-r from-green-900/20 to-transparent p-5 border-b border-gray-800 flex justify-between items-end">
                                        <div>
                                            <h2 className="text-green-500 font-bold tracking-widest text-xs uppercase mb-1">Entradas Registradas</h2>
                                            <p className="text-gray-400 text-sm">Receitas recebidas no dia</p>
                                        </div>
                                        <div className="text-2xl font-mono font-bold text-green-400">
                                            {formatadorBRL.format(calcularTotalDia(data_ref, 'entrada'))}
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        {categoriasEntrada.map((cat: CategoriaFluxo) => {
                                            const key = `${data_ref}_${cat.id}`;
                                            const isAuto = cat.tipo_sistema === 'pix' || cat.tipo_sistema === 'cartao';
                                            return (
                                                <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-gray-800/50 rounded-lg transition-colors group">
                                                    <span className="text-gray-300 font-medium">{cat.nome}</span>
                                                    <div className="relative w-40">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                                                        <input 
                                                            type="number"
                                                            disabled={isAuto || empresa === "TODAS"}
                                                            className={`w-full text-right bg-gray-950 border ${(isAuto || empresa === "TODAS") ? 'border-gray-800 text-gray-500 cursor-not-allowed' : 'border-gray-700 text-green-400 focus:border-green-500 focus:ring-1 focus:ring-green-500'} rounded-md py-2 px-3 pl-8 text-base font-mono outline-none transition-all shadow-inner`}
                                                            value={entradas[key]?.valor || ''}
                                                            onChange={(e) => {
                                                                const valNum = parseFloat(e.target.value) || 0;
                                                                setEntradas(prev => ({...prev, [key]: { ...prev[key], valor: valNum, data_referencia: data_ref, categoria_id: cat.id }}))
                                                            }}
                                                            onBlur={(e) => handleValorChange(data_ref, cat.id, e.target.value)}
                                                            placeholder={isAuto ? "Automático" : "0.00"}
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Coluna SAÍDAS */}
                                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
                                    <div className="bg-gradient-to-r from-red-900/20 to-transparent p-5 border-b border-gray-800 flex justify-between items-end">
                                        <div>
                                            <h2 className="text-red-500 font-bold tracking-widest text-xs uppercase mb-1">Saídas e Retiradas</h2>
                                            <p className="text-gray-400 text-sm">Pagamentos realizados no dia</p>
                                        </div>
                                        <div className="text-2xl font-mono font-bold text-red-400">
                                            {formatadorBRL.format(calcularTotalDia(data_ref, 'saida'))}
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        {categoriasSaida.map((cat: CategoriaFluxo) => {
                                            const key = `${data_ref}_${cat.id}`;
                                            return (
                                                <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-gray-800/50 rounded-lg transition-colors group">
                                                    <span className="text-gray-300 font-medium">{cat.nome}</span>
                                                    <div className="relative w-40">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                                                        <input 
                                                            type="number"
                                                            disabled={empresa === "TODAS"}
                                                            className={`w-full text-right bg-gray-950 border ${empresa === "TODAS" ? 'border-gray-800 text-gray-500 cursor-not-allowed' : 'border-gray-700 text-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'} rounded-md py-2 px-3 pl-8 text-base font-mono outline-none transition-all shadow-inner`}
                                                            value={entradas[key]?.valor || ''}
                                                            onChange={(e) => {
                                                                const valNum = parseFloat(e.target.value) || 0;
                                                                setEntradas(prev => ({...prev, [key]: { ...prev[key], valor: valNum, data_referencia: data_ref, categoria_id: cat.id }}))
                                                            }}
                                                            onBlur={(e) => handleValorChange(data_ref, cat.id, e.target.value)}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                            </div>

                            {/* SALDO REAL DO DIA SELECIONADO */}
                            <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden mt-4">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                                <div className="z-10 text-center md:text-left mb-4 md:mb-0">
                                    <p className="text-gray-400 text-sm font-medium tracking-wide uppercase mb-1">Fechamento do Dia</p>
                                    <h3 className="text-2xl text-white font-bold">Saldo Líquido Real</h3>
                                </div>
                                <div className="z-10">
                                    {(() => {
                                        const saldo = calcularSaldoReal(data_ref);
                                        const colorClass = saldo >= 0 ? "text-green-400" : "text-red-400";
                                        return (
                                            <div className={`text-4xl md:text-5xl font-mono font-bold tracking-tight ${colorClass}`}>
                                                {formatadorBRL.format(saldo)}
                                            </div>
                                        )
                                    })()}
                                </div>
                            </div>

                        </div>
                    );
                })()}

            </div>

            {/* AREA EXCLUSIVA PARA IMPRESSAO (Baseada no Print Excel) */}
            <div className="hidden print:block text-black bg-white w-full">
                <style dangerouslySetInnerHTML={{__html: `
                    @page { size: landscape; margin: 1cm; }
                    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                `}} />
                
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold uppercase text-black">FLUXO DE CAIXA ({diasDaSemana[0].toLocaleDateString('pt-BR')} até {diasDaSemana[5].toLocaleDateString('pt-BR')})</h1>
                </div>

                {/* Para facilitar a impressão, podemos desenhar por semanas */}
                <div className="space-y-12">
                    {(() => {
                        const semanas: Date[][] = [];
                        let semanaAtual: Date[] = [];
                        diasDaSemana.forEach((dia: Date, i: number) => {
                            semanaAtual.push(dia);
                            if (dia.getDay() === 6 || i === diasDaSemana.length - 1) { // Sábado fechou semana
                                semanas.push(semanaAtual);
                                semanaAtual = [];
                            }
                        });

                        return semanas.map((semana, sIdx) => (
                            <table key={sIdx} className="w-full text-xs border-collapse font-sans bg-white" style={{ border: '2px solid black' }}>
                                <thead>
                                    <tr className="bg-black text-yellow-400 text-center font-bold">
                                        <th className="p-2 border border-white text-left w-64 uppercase border-b-2">REGISTRO DIÁRIO DE CAIXA</th>
                                        {["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"].map((ds) => (
                                            <th key={ds} className="p-2 border border-white">{ds.substring(0,3).toUpperCase()}.</th>
                                        ))}
                                        <th className="p-2 border border-white uppercase bg-gray-800 text-white">TOTAIS</th>
                                    </tr>
                                    <tr className="bg-white border-b-2 border-black">
                                        <th className="p-1 border border-black text-left">
                                            <span className="text-blue-600 font-bold">DATA DA SEMANA</span>
                                        </th>
                                        {[1,2,3,4,5,6].map(wed => {
                                            const diaReal = semana.find(d => d.getDay() === wed);
                                            return <th key={wed} className="p-1 border border-black text-center text-blue-600">{diaReal ? diaReal.toLocaleDateString('pt-BR') : ''}</th>;
                                        })}
                                        <th className="p-1 border border-black bg-yellow-300"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-yellow-400 border-b-2 border-black font-bold">
                                        <td className="p-1 border border-black uppercase text-[10px]">1. RECEITA TOTAL (ANOTAÇÕES)</td>
                                        {[1,2,3,4,5,6].map(wed => {
                                            const diaReal = semana.find(d => d.getDay() === wed);
                                            const data_ref = diaReal?.toISOString().split('T')[0];
                                            return <td key={wed} className="p-1 border border-black text-center text-red-600 italic font-normal text-[10px]">{data_ref ? (eventos[data_ref]?.observacao || '') : ''}</td>;
                                        })}
                                        <td className="p-1 border border-black text-right text-gray-900 bg-yellow-200">-</td>
                                    </tr>
                                    
                                    {/* Linhas de Entrada */}
                                    {categoriasEntrada.map(cat => (
                                        <tr key={cat.id} className="border-b border-gray-400">
                                            <td className="p-1 border-r border-black pl-2">{cat.nome}</td>
                                            {[1,2,3,4,5,6].map(wed => {
                                                const diaReal = semana.find(d => d.getDay() === wed);
                                                const data_ref = diaReal?.toISOString().split('T')[0];
                                                const val = data_ref ? entradas[`${data_ref}_${cat.id}`]?.valor : null;
                                                return <td key={wed} className="p-1 border-r border-black text-right text-black">{val ? val.toFixed(2) : ''}</td>;
                                            })}
                                            {/* Subtotal da Linha na Semana */}
                                            <td className="p-1 border-l-2 border-black text-right font-bold bg-gray-100">
                                                {semana.reduce((acc: number, d: Date) => acc + (entradas[`${d.toISOString().split('T')[0]}_${cat.id}`]?.valor || 0), 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}

                                    <tr className="bg-yellow-400 font-bold border-t-2 border-black">
                                        <td className="p-1 border border-black text-left uppercase text-xs">TOTAL DE ENTRADAS:</td>
                                        {[1,2,3,4,5,6].map(wed => {
                                            const diaReal = semana.find(d => d.getDay() === wed);
                                            const data_ref = diaReal?.toISOString().split('T')[0];
                                            return <td key={wed} className="p-1 border border-black text-right text-xs">{data_ref ? calcularTotalDia(data_ref, 'entrada').toFixed(2) : ''}</td>;
                                        })}
                                        <td className="p-1 border border-black bg-yellow-200 text-right text-xs">
                                            {semana.reduce((acc: number, d: Date) => acc + calcularTotalDia(d.toISOString().split('T')[0], 'entrada'), 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    {/* SECAO DE SAIDAS ABAIXO DO YELLOW */}
                                    <tr className="bg-black text-white"><td colSpan={8} className="p-1 text-center font-bold">SAÍDAS (PAGAMENTOS E RETIRADAS)</td></tr>
                                    {categoriasSaida.map((cat: CategoriaFluxo) => (
                                        <tr key={cat.id} className="border-b border-gray-300">
                                            <td className="p-1 border-r border-black pl-2 text-red-600">{cat.nome}</td>
                                            {[1,2,3,4,5,6].map(wed => {
                                                const diaReal = semana.find(d => d.getDay() === wed);
                                                const data_ref = diaReal?.toISOString().split('T')[0];
                                                const val = data_ref ? entradas[`${data_ref}_${cat.id}`]?.valor : null;
                                                return <td key={wed} className="p-1 border-r border-black text-right text-red-600">{val ? val.toFixed(2) : ''}</td>;
                                            })}
                                            <td className="p-1 border-l-2 border-black text-right font-bold bg-gray-100 text-red-600">
                                                {semana.reduce((acc: number, d: Date) => acc + (entradas[`${d.toISOString().split('T')[0]}_${cat.id}`]?.valor || 0), 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}

                                    <tr className="bg-gray-300 font-bold border-t-2 border-black">
                                        <td className="p-1 border border-black text-left uppercase text-red-600 text-xs">TOTAL DE SAÍDAS:</td>
                                        {[1,2,3,4,5,6].map(wed => {
                                            const diaReal = semana.find(d => d.getDay() === wed);
                                            const data_ref = diaReal?.toISOString().split('T')[0];
                                            return <td key={wed} className="p-1 border border-black text-right text-xs text-red-600">{data_ref ? calcularTotalDia(data_ref, 'saida').toFixed(2) : ''}</td>;
                                        })}
                                        <td className="p-1 border border-black bg-gray-200 text-right text-xs text-red-600">
                                            {semana.reduce((acc: number, d: Date) => acc + calcularTotalDia(d.toISOString().split('T')[0], 'saida'), 0).toFixed(2)}
                                        </td>
                                    </tr>

                                    <tr className="bg-green-200 border-t-2 border-black font-bold text-sm">
                                        <td className="p-1 border border-black text-left uppercase text-green-900 border-b-2">SALDO REAL DE CAIXA:</td>
                                        {[1,2,3,4,5,6].map(wed => {
                                            const diaReal = semana.find(d => d.getDay() === wed);
                                            const data_ref = diaReal?.toISOString().split('T')[0];
                                            return <td key={wed} className="p-2 border border-black text-right text-green-900 border-b-2">{data_ref ? calcularSaldoReal(data_ref).toFixed(2) : ''}</td>;
                                        })}
                                        <td className="p-2 border border-black text-right text-green-900 border-b-2">
                                            {semana.reduce((acc: number, d: Date) => acc + calcularSaldoReal(d.toISOString().split('T')[0]), 0).toFixed(2)}
                                        </td>
                                    </tr>

                                </tbody>
                            </table>
                        ));
                    })()}
                </div>
            </div>
        </div>
    );
}
