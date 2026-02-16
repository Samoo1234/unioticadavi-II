"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import Panel from "@/components/clinica/Panel";
import ConfiguracaoHorariosComponent from "@/components/empresas/ConfiguracaoHorarios";
import { Empresa, empresaVazia, TipoEmpresa, ConfiguracaoHorarios } from "@/data/empresasData";
import { supabase } from "@/lib/supabase";

type Modo = "lista" | "cadastro" | "edicao" | "configurar";

interface CampoFormProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "email" | "tel";
    placeholder?: string;
    required?: boolean;
}

function CampoForm({ label, value, onChange, type = "text", placeholder, required }: CampoFormProps) {
    return (
        <div>
            <label className="text-xs text-gray-500 block mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
            />
        </div>
    );
}

export default function EmpresasPage() {
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [modo, setModo] = useState<Modo>("lista");
    const [empresaSelecionada, setEmpresaSelecionada] = useState<Empresa | null>(null);
    const [formData, setFormData] = useState<Omit<Empresa, "id" | "dataCadastro">>(empresaVazia);
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);
    const [processando, setProcessando] = useState(false);

    // Buscar empresas do Supabase
    useEffect(() => {
        fetchEmpresas();
    }, []);

    const adaptarEmpresa = (e: any): Empresa => ({
        id: e.id,
        tipo: e.tipo || 'Filial',
        razaoSocial: e.razao_social || '',
        nomeFantasia: e.nome_fantasia || '',
        cnpj: e.cnpj || '',
        inscricaoEstadual: e.inscricao_estadual || '',
        telefone: e.telefone || '',
        email: e.email || '',
        endereco: e.endereco || {
            logradouro: '',
            numero: '',
            bairro: '',
            cidade: e.cidade || '',
            estado: e.estado || '',
            cep: ''
        },
        responsavel: e.responsavel || '',
        ativo: e.ativo ?? true,
        dataCadastro: e.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        configuracaoHorarios: e.configuracao_horarios,
        regimeTributario: e.regime_tributario,
        certificadoSenha: e.certificado_senha,
        cscId: e.csc_id,
        cscToken: e.csc_token,
        ambiente: e.ambiente,
        certificadoB64: e.certificado_b64,
    });

    const fetchEmpresas = async () => {
        setCarregando(true);
        const { data, error } = await supabase
            .from('empresas')
            .select('*')
            .order('id', { ascending: true });

        if (!error && data) {
            setEmpresas(data.map(adaptarEmpresa));
        }
        setCarregando(false);
    };

    const mostrarMensagem = (tipo: "sucesso" | "erro", texto: string) => {
        setMensagem({ tipo, texto });
        setTimeout(() => setMensagem(null), 3000);
    };

    const handleNovaEmpresa = () => {
        setFormData(empresaVazia);
        setEmpresaSelecionada(null);
        setModo("cadastro");
    };

    const handleEditarEmpresa = (empresa: Empresa) => {
        setFormData({
            tipo: empresa.tipo,
            razaoSocial: empresa.razaoSocial,
            nomeFantasia: empresa.nomeFantasia,
            cnpj: empresa.cnpj,
            inscricaoEstadual: empresa.inscricaoEstadual,
            telefone: empresa.telefone,
            email: empresa.email,
            endereco: { ...empresa.endereco },
            responsavel: empresa.responsavel,
            ativo: empresa.ativo,
            regimeTributario: empresa.regimeTributario || "Simples Nacional",
            certificadoSenha: empresa.certificadoSenha || "",
            cscId: empresa.cscId || "",
            cscToken: empresa.cscToken || "",
            ambiente: empresa.ambiente || "Homologação",
            certificadoB64: empresa.certificadoB64 || "",
        } as any);
        setEmpresaSelecionada(empresa);
        setModo("edicao");
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = event.target?.result as string;
                setFormData({ ...formData, certificadoB64: base64 } as any);
                mostrarMensagem("sucesso", "CERTIFICADO CARREGADO");
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSalvar = async () => {
        if (processando) return;

        const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT_SUPABASE")), ms));

        try {
            setProcessando(true);
            console.log("Fluxo salvar iniciado. Modo:", modo);

            if (!formData.razaoSocial || !formData.nomeFantasia || !formData.cnpj) {
                mostrarMensagem("erro", "PREENCHA OS CAMPOS OBRIGATÓRIOS (Razão Social, Nome Fantasia, CNPJ)");
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            const dadosSupabase = {
                tipo: formData.tipo,
                razao_social: formData.razaoSocial,
                nome_fantasia: formData.nomeFantasia,
                cnpj: formData.cnpj,
                inscricao_estadual: formData.inscricaoEstadual,
                telefone: formData.telefone,
                email: formData.email,
                endereco: formData.endereco,
                cidade: formData.endereco.cidade,
                estado: formData.endereco.estado,
                responsavel: formData.responsavel,
                ativo: formData.ativo,
                regime_tributario: (formData as any).regimeTributario,
            };

            let resultado;

            if (modo === "cadastro") {
                console.log("Inserindo nova empresa...");
                const call = supabase.from('empresas').insert(dadosSupabase).select().single();
                resultado = await Promise.race([call, timeout(15000)]) as any;

                if (resultado.error) throw resultado.error;

                const nova = adaptarEmpresa(resultado.data);
                setEmpresas(prev => [...prev, nova]);
                mostrarMensagem("sucesso", "EMPRESA CADASTRADA COM SUCESSO");
            } else if (modo === "edicao" && empresaSelecionada) {
                console.log("Atualizando empresa ID:", empresaSelecionada.id);
                const call = supabase.from('empresas').update(dadosSupabase).eq('id', empresaSelecionada.id).select().single();
                resultado = await Promise.race([call, timeout(15000)]) as any;

                if (resultado.error) throw resultado.error;

                const editada = adaptarEmpresa(resultado.data);
                console.log("Dados atualizados recebidos:", editada);

                setEmpresas(prev => prev.map(e => e.id === editada.id ? editada : e));
                mostrarMensagem("sucesso", "EMPRESA ATUALIZADA COM SUCESSO");
            } else {
                return;
            }

            setModo("lista");
            setFormData(empresaVazia);
            setEmpresaSelecionada(null);

        } catch (err: any) {
            console.error("Erro em handleSalvar:", err);
            if (err.message === "TIMEOUT_SUPABASE") {
                mostrarMensagem("erro", "O SERVIDOR DEMOROU MUITO PARA RESPONDER. TENTE NOVAMENTE OU RECARREGUE A PÁGINA.");
            } else {
                mostrarMensagem("erro", "ERRO AO SALVAR: " + (err.message || "Erro desconhecido"));
            }
        } finally {
            setProcessando(false);
            console.log("Fluxo salvar finalizado.");
        }
    };

    const handleCancelar = () => {
        setModo("lista");
        setFormData(empresaVazia);
        setEmpresaSelecionada(null);
    };

    const handleToggleAtivo = (empresa: Empresa) => {
        const novoStatus = !empresa.ativo;
        supabase.from('empresas').update({ ativo: novoStatus }).eq('id', empresa.id).then(({ error }) => {
            if (!error) {
                setEmpresas(empresas.map((e) =>
                    e.id === empresa.id ? { ...e, ativo: novoStatus } : e
                ));
                mostrarMensagem("sucesso", `EMPRESA ${novoStatus ? "ATIVADA" : "DESATIVADA"}`);
            }
        });
    };

    const handleConfigurarHorarios = (empresa: Empresa) => {
        setEmpresaSelecionada(empresa);
        setModo("configurar");
    };

    const handleSalvarConfiguracao = async (config: ConfiguracaoHorarios) => {
        if (empresaSelecionada) {
            const { error } = await supabase
                .from('empresas')
                .update({ configuracao_horarios: config })
                .eq('id', empresaSelecionada.id);

            if (error) {
                mostrarMensagem("erro", "ERRO AO SALVAR CONFIGURAÇÃO");
                console.error(error);
            } else {
                setEmpresas(empresas.map((e) =>
                    e.id === empresaSelecionada.id
                        ? { ...e, configuracaoHorarios: config }
                        : e
                ));
                mostrarMensagem("sucesso", "CONFIGURAÇÃO SALVA COM SUCESSO!");
            }
        }
        setModo("lista");
        setEmpresaSelecionada(null);
    };

    const matriz = empresas.find((e) => e.tipo === "Matriz");
    const filiais = empresas.filter((e) => e.tipo === "Filial");

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold tracking-wide text-white">EMPRESAS</h1>
                            <p className="text-sm text-gray-500 mt-1">Matriz e Filiais</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-4 text-sm">
                                <div className="text-center">
                                    <div className="text-gray-500 text-xs">MATRIZ</div>
                                    <div className="text-white font-mono">{matriz ? 1 : 0}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-gray-500 text-xs">FILIAIS</div>
                                    <div className="text-white font-mono">{filiais.length}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-gray-500 text-xs">ATIVAS</div>
                                    <div className="text-green-500 font-mono">
                                        {empresas.filter((e) => e.ativo).length}
                                    </div>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-gray-700"></div>
                            {modo === "lista" ? (
                                <button
                                    onClick={handleNovaEmpresa}
                                    className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700"
                                >
                                    + NOVA EMPRESA
                                </button>
                            ) : (
                                <button
                                    onClick={handleCancelar}
                                    className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700"
                                >
                                    ← VOLTAR
                                </button>
                            )}
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

                {/* Conteúdo */}
                <div className="flex-1 min-h-0 overflow-auto">
                    {modo === "lista" ? (
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 lg:col-span-5">
                                <Panel title="MATRIZ" subtitle="Empresa principal">
                                    {matriz ? (
                                        <div className="p-4">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <div className="text-lg font-bold text-white uppercase">
                                                        {matriz.nomeFantasia}
                                                    </div>
                                                    <div className="text-sm text-gray-500 mt-1 uppercase">
                                                        {matriz.razaoSocial}
                                                    </div>
                                                </div>
                                                <span className={`text-xs font-medium px-2 py-1 ${matriz.ativo
                                                    ? "bg-green-900/50 text-green-400 border border-green-700"
                                                    : "bg-red-900/50 text-red-400 border border-red-700"
                                                    }`}>
                                                    {matriz.ativo ? "ATIVA" : "INATIVA"}
                                                </span>
                                            </div>

                                            <div className="space-y-3 text-sm">
                                                <div>
                                                    <span className="text-gray-500">CNPJ: </span>
                                                    <span className="text-white font-mono">{matriz.cnpj}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Telefone: </span>
                                                    <span className="text-white">{matriz.telefone}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Email: </span>
                                                    <span className="text-white">{matriz.email}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Endereço: </span>
                                                    <span className="text-white">
                                                        {matriz.endereco.logradouro}, {matriz.endereco.numero}
                                                        {matriz.endereco.complemento && ` - ${matriz.endereco.complemento}`}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Cidade: </span>
                                                    <span className="text-white">
                                                        {matriz.endereco.cidade}/{matriz.endereco.estado}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Responsável: </span>
                                                    <span className="text-white">{matriz.responsavel}</span>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-gray-700 flex gap-2">
                                                <button
                                                    onClick={() => handleEditarEmpresa(matriz)}
                                                    className="px-3 py-1.5 bg-gray-800 border border-gray-600 text-xs font-medium text-white hover:bg-gray-700"
                                                >
                                                    EDITAR
                                                </button>
                                                <button
                                                    onClick={() => handleConfigurarHorarios(matriz)}
                                                    className="px-3 py-1.5 bg-green-900/30 border border-green-700 text-xs font-medium text-green-400 hover:bg-green-900/50"
                                                >
                                                    CONFIGURAR HORÁRIOS
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center">
                                            <p className="text-gray-500 text-sm mb-4">Nenhuma matriz cadastrada</p>
                                            <button
                                                onClick={() => {
                                                    setFormData({ ...empresaVazia, tipo: "Matriz" });
                                                    setModo("cadastro");
                                                }}
                                                className="px-4 py-2 bg-green-700 border border-green-600 text-sm font-medium text-white hover:bg-green-600"
                                            >
                                                CADASTRAR MATRIZ
                                            </button>
                                        </div>
                                    )}
                                </Panel>
                            </div>

                            <div className="col-span-12 lg:col-span-7">
                                <Panel title="FILIAIS" subtitle={`${filiais.length} unidades`}>
                                    {filiais.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 text-sm">Nenhuma filial cadastrada</div>
                                    ) : (
                                        <div className="divide-y divide-gray-800/50">
                                            {filiais.map((filial) => (
                                                <div key={filial.id} className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-sm font-medium text-white uppercase">
                                                                    {filial.nomeFantasia}
                                                                </span>
                                                                <span className={`text-xs px-1.5 py-0.5 ${filial.ativo ? "text-green-500" : "text-red-500"}`}>
                                                                    {filial.ativo ? "ATIVA" : "INATIVA"}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">CNPJ: {filial.cnpj}</div>
                                                            <div className="text-xs text-gray-500 mt-1 uppercase">
                                                                {filial.endereco.cidade}/{filial.endereco.estado} • {filial.telefone}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleEditarEmpresa(filial)}
                                                                className="px-2 py-1 bg-gray-800 border border-gray-600 text-xs text-white hover:bg-gray-700"
                                                            >
                                                                EDITAR
                                                            </button>
                                                            <button
                                                                onClick={() => handleConfigurarHorarios(filial)}
                                                                className="px-2 py-1 bg-green-900/30 border border-green-700 text-xs text-green-400 hover:bg-green-900/50"
                                                            >
                                                                HORÁRIOS
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleAtivo(filial)}
                                                                className={`px-2 py-1 border text-xs ${filial.ativo ? "bg-red-900/30 border-red-700 text-red-400 hover:bg-red-900/50" : "bg-green-900/30 border-green-700 text-green-400 hover:bg-green-900/50"}`}
                                                            >
                                                                {filial.ativo ? "DESATIVAR" : "ATIVAR"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Panel>
                            </div>
                        </div>
                    ) : modo === "configurar" && empresaSelecionada ? (
                        <ConfiguracaoHorariosComponent
                            configuracao={empresaSelecionada.configuracaoHorarios || {
                                turnos: [
                                    { id: 1, nome: "Manhã", inicio: "08:00", fim: "12:00", ativo: true },
                                    { id: 2, nome: "Tarde", inicio: "14:00", fim: "18:00", ativo: true },
                                ],
                                intervaloMinutos: 30,
                                diasDisponiveis: [],
                                medicos: [],
                            }}
                            onSave={handleSalvarConfiguracao}
                            onCancel={handleCancelar}
                            nomeEmpresa={empresaSelecionada.nomeFantasia}
                            isMatriz={empresaSelecionada.tipo === "Matriz"}
                            medicosDisponiveis={matriz?.configuracaoHorarios?.medicos || []}
                        />
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-6">
                                <Panel title={modo === "cadastro" ? "NOVA EMPRESA" : "EDITAR EMPRESA"}>
                                    <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">TIPO <span className="text-red-500">*</span></label>
                                                <select
                                                    value={formData.tipo}
                                                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoEmpresa })}
                                                    disabled={matriz !== undefined && formData.tipo === "Matriz" && modo === "cadastro"}
                                                    className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none disabled:opacity-50"
                                                >
                                                    <option value="Matriz" disabled={matriz !== undefined && modo === "cadastro"}>Matriz</option>
                                                    <option value="Filial">Filial</option>
                                                </select>
                                            </div>
                                            <div className="flex items-end">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.ativo}
                                                        onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                                                        className="w-4 h-4 bg-gray-800 border-gray-700 text-green-500"
                                                    />
                                                    <span className="text-sm text-white">ATIVA</span>
                                                </label>
                                            </div>
                                        </div>

                                        <CampoForm label="RAZÃO SOCIAL" value={formData.razaoSocial} onChange={(v) => setFormData({ ...formData, razaoSocial: v })} required />
                                        <CampoForm label="NOME FANTASIA" value={formData.nomeFantasia} onChange={(v) => setFormData({ ...formData, nomeFantasia: v })} required />

                                        <div className="grid grid-cols-2 gap-4">
                                            <CampoForm label="CNPJ" value={formData.cnpj} onChange={(v) => setFormData({ ...formData, cnpj: v })} placeholder="00.000.000/0000-00" required />
                                            <CampoForm label="INSCRIÇÃO ESTADUAL" value={formData.inscricaoEstadual} onChange={(v) => setFormData({ ...formData, inscricaoEstadual: v })} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <CampoForm label="TELEFONE" value={formData.telefone} onChange={(v) => setFormData({ ...formData, telefone: v })} type="tel" placeholder="(00) 0000-0000" />
                                            <CampoForm label="EMAIL" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} type="email" />
                                        </div>

                                        <CampoForm label="RESPONSÁVEL" value={formData.responsavel} onChange={(v) => setFormData({ ...formData, responsavel: v })} />
                                    </div>
                                </Panel>

                                <Panel title="ENDEREÇO">
                                    <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-2">
                                                <CampoForm label="LOGRADOURO" value={formData.endereco.logradouro} onChange={(v) => setFormData({ ...formData, endereco: { ...formData.endereco, logradouro: v } })} />
                                            </div>
                                            <CampoForm label="NÚMERO" value={formData.endereco.numero} onChange={(v) => setFormData({ ...formData, endereco: { ...formData.endereco, numero: v } })} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <CampoForm label="COMPLEMENTO" value={formData.endereco.complemento || ""} onChange={(v) => setFormData({ ...formData, endereco: { ...formData.endereco, complemento: v } })} />
                                            <CampoForm label="BAIRRO" value={formData.endereco.bairro} onChange={(v) => setFormData({ ...formData, endereco: { ...formData.endereco, bairro: v } })} />
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="col-span-1">
                                                <CampoForm label="CEP" value={formData.endereco.cep} onChange={(v) => setFormData({ ...formData, endereco: { ...formData.endereco, cep: v } })} placeholder="00000-000" />
                                            </div>
                                            <CampoForm label="CIDADE" value={formData.endereco.cidade} onChange={(v) => setFormData({ ...formData, endereco: { ...formData.endereco, cidade: v } })} />
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">ESTADO</label>
                                                <select
                                                    value={formData.endereco.estado}
                                                    onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, estado: e.target.value } })}
                                                    className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                                >
                                                    <option value="">UF</option>
                                                    {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map(uf => (
                                                        <option key={uf} value={uf}>{uf}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </Panel>

                                {/* Configurações Fiscais */}
                                <div className="col-span-2">
                                    <Panel title="CONFIGURAÇÕES FISCAIS (NF-e/NFC-e)">
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs text-gray-500 block mb-1">REGIME TRIBUTÁRIO</label>
                                                        <select
                                                            value={(formData as any).regimeTributario}
                                                            onChange={(e) => setFormData({ ...formData, regimeTributario: e.target.value } as any)}
                                                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                                        >
                                                            <option value="Simples Nacional">Simples Nacional</option>
                                                            <option value="Simples Nacional - Excesso de Sublimite">Simples Nacional - Excesso de Sublimite</option>
                                                            <option value="Regime Normal">Regime Normal</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 block mb-1">AMBIENTE SEFAZ</label>
                                                        <select
                                                            value={(formData as any).ambiente}
                                                            onChange={(e) => setFormData({ ...formData, ambiente: e.target.value } as any)}
                                                            className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none"
                                                        >
                                                            <option value="Homologação">Homologação (Testes)</option>
                                                            <option value="Produção">Produção (Real)</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-gray-900/30 border border-gray-800 rounded">
                                                    <h3 className="text-xs font-bold text-gray-400 mb-3 tracking-widest uppercase">NFC-e (Consumidor)</h3>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <CampoForm label="CSC ID" value={(formData as any).cscId} onChange={(v) => setFormData({ ...formData, cscId: v } as any)} placeholder="000001" />
                                                        <CampoForm label="CSC TOKEN" value={(formData as any).cscToken} onChange={(v) => setFormData({ ...formData, cscToken: v } as any)} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="p-6 bg-gray-900/50 border border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center text-center">
                                                    <label className="text-xs font-bold text-gray-400 block mb-4 uppercase tracking-widest text-green-500">Certificado Digital (.pfx)</label>
                                                    <div className="w-full">
                                                        <input
                                                            type="file"
                                                            accept=".pfx"
                                                            id="cert-upload"
                                                            onChange={handleFileChange}
                                                            className="hidden"
                                                        />
                                                        <label
                                                            htmlFor="cert-upload"
                                                            className="cursor-pointer inline-block w-full py-3 px-6 bg-gray-800 border border-gray-700 text-xs font-bold text-white hover:bg-gray-700 transition-colors uppercase"
                                                        >
                                                            {(formData as any).certificadoB64 ? "✓ TROCAR CERTIFICADO DIGITAL" : "📁 SELECIONAR ARQUIVO .PFX"}
                                                        </label>
                                                        {(formData as any).certificadoB64 && (
                                                            <div className="mt-2 text-[10px] text-green-500 font-bold uppercase animate-pulse">
                                                                Arquivo carregado com sucesso
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <CampoForm label="SENHA DO CERTIFICADO" value={(formData as any).certificadoSenha} onChange={(v) => setFormData({ ...formData, certificadoSenha: v } as any)} />

                                                {/* Botões movidos para barra inferior */}
                                            </div>
                                        </div>
                                    </Panel>
                                </div>
                            </div>

                            {/* Barra de Ações Global */}
                            <div className="mt-6 pt-6 border-t border-gray-800 flex flex-col items-end gap-4">
                                {mensagem && (
                                    <div className={`px-4 py-2 text-sm font-medium rounded ${mensagem.tipo === "sucesso"
                                        ? "bg-green-900/50 border border-green-700 text-green-400"
                                        : "bg-red-900/50 border border-red-700 text-red-400"
                                        }`}>
                                        {mensagem.texto}
                                    </div>
                                )}
                                <div className="flex items-center justify-end gap-4 w-full">
                                    <button
                                        onClick={handleCancelar}
                                        className="px-6 py-3 bg-gray-800 border border-gray-700 text-sm font-bold text-white hover:bg-gray-700 rounded"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        onClick={handleSalvar}
                                        disabled={processando}
                                        className={`px-8 py-3 bg-green-600 border border-green-500 text-sm font-bold text-white hover:bg-green-500 transition-all shadow-[0_0_15px_rgba(34,197,94,0.2)] rounded ${processando ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {processando ? "SALVANDO..." : (modo === "cadastro" ? "CADASTRAR EMPRESA" : "SALVAR ALTERAÇÕES")}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
