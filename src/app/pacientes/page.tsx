"use client";

import MainLayout from "@/components/MainLayout";
import { supabase } from "@/lib/supabase";
import { Paciente } from "@/data/mockData";
import { useEffect, useState } from "react";

export default function PacientesPage() {
    const [listaPacientes, setListaPacientes] = useState<Paciente[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
    const [editando, setEditando] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);
    const [mensagem, setMensagem] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

    useEffect(() => {
        fetchPacientes();
    }, []);

    const fetchPacientes = async (selecionarId?: string | number) => {
        setCarregando(true);
        const { data, error } = await supabase
            .from('pacientes')
            .select('*')
            .order('nome');

        if (!error && data) {
            const adaptedData = data.map((p: any) => ({
                id: p.id,
                nome: p.nome,
                telefone: p.telefone,
                email: p.email || "",
                cpf: p.cpf || "",
                dataNascimento: p.data_nascimento || "",
                ultimaConsulta: p.created_at,
                nomePai: p.nome_pai || "",
                nomeMae: p.nome_mae || "",
                enderecoCompleto: p.endereco_completo || "",
                enderecoLogradouro: p.endereco_logradouro || "",
                enderecoNumero: p.endereco_numero || "",
                enderecoBairro: p.endereco_bairro || "",
                enderecoCidade: p.endereco_cidade || "",
                enderecoEstado: p.endereco_estado || "",
                enderecoCep: p.endereco_cep || "",
                enderecoComplemento: p.endereco_complemento || "",
                rg: p.rg || "",
                observacoes: p.observacoes || ""
            }));
            setListaPacientes(adaptedData);

            if (selecionarId) {
                const found = adaptedData.find(p => p.id === selecionarId);
                if (found) setPacienteSelecionado(found);
            } else if (!pacienteSelecionado && adaptedData.length > 0) {
                setPacienteSelecionado(adaptedData[0]);
            }
        }
        setCarregando(false);
    };

    const mostrarMensagem = (tipo: "sucesso" | "erro", texto: string) => {
        setMensagem({ tipo, texto });
        setTimeout(() => setMensagem(null), 3000);
    };

    const handleEditar = () => {
        if (!pacienteSelecionado) return;
        setEditFormData({ ...pacienteSelecionado });
        setEditando(true);
    };

    const handleNovoPaciente = () => {
        setPacienteSelecionado(null);
        setEditFormData({
            nome: "",
            telefone: "",
            email: "",
            cpf: "",
            dataNascimento: "",
            nomePai: "",
            nomeMae: "",
            enderecoLogradouro: "",
            enderecoNumero: "",
            enderecoBairro: "",
            enderecoCidade: "",
            enderecoEstado: "",
            enderecoCep: "",
            enderecoComplemento: "",
            rg: "",
            observacoes: ""
        });
        setEditando(true);
    };

    const handleSalvar = async () => {
        if (!editFormData.nome) {
            mostrarMensagem("erro", "NOME É OBRIGATÓRIO");
            return;
        }

        try {
            const payload = {
                nome: editFormData.nome,
                telefone: editFormData.telefone,
                email: editFormData.email,
                cpf: editFormData.cpf,
                data_nascimento: editFormData.dataNascimento || null,
                nome_pai: editFormData.nomePai,
                nome_mae: editFormData.nomeMae,
                endereco_completo: `${editFormData.enderecoLogradouro}, ${editFormData.enderecoNumero} - ${editFormData.enderecoBairro}, ${editFormData.enderecoCidade} - ${editFormData.enderecoEstado}`,
                endereco_logradouro: editFormData.enderecoLogradouro,
                endereco_numero: editFormData.enderecoNumero,
                endereco_bairro: editFormData.enderecoBairro,
                endereco_cidade: editFormData.enderecoCidade,
                endereco_estado: editFormData.enderecoEstado,
                endereco_cep: editFormData.enderecoCep,
                endereco_complemento: editFormData.enderecoComplemento,
                rg: editFormData.rg,
                observacoes: editFormData.observacoes
            };

            let result;
            if (editFormData.id) {
                // Update
                result = await supabase
                    .from('pacientes')
                    .update(payload)
                    .eq('id', editFormData.id);
            } else {
                // Create
                result = await supabase
                    .from('pacientes')
                    .insert(payload)
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            mostrarMensagem("sucesso", editFormData.id ? "PACIENTE ATUALIZADO" : "PACIENTE CADASTRADO");
            setEditando(false);
            const targetId = editFormData.id || (result.data as any).id;
            fetchPacientes(targetId);
        } catch (error: any) {
            console.error("Erro ao salvar paciente:", error);
            mostrarMensagem("erro", "ERRO AO SALVAR: " + error.message);
        }
    };

    const handleCancelar = () => {
        setEditando(false);
        setEditFormData(null);
        if (!pacienteSelecionado && listaPacientes.length > 0) {
            setPacienteSelecionado(listaPacientes[0]);
        }
    };

    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Feedback Message */}
                {mensagem && (
                    <div className={`mb-4 px-4 py-2 border text-xs font-bold ${mensagem.tipo === "sucesso" ? "bg-green-500/10 border-green-500/50 text-green-500" : "bg-red-500/10 border-red-500/50 text-red-500"
                        }`}>
                        {mensagem.texto}
                    </div>
                )}

                {/* Título */}
                <div className="border-b border-gray-800 pb-4 mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-wide text-white">
                            PACIENTES
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Cadastro e histórico de pacientes
                        </p>
                    </div>
                    <button
                        onClick={handleNovoPaciente}
                        disabled={editando}
                        className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                    >
                        + NOVO PACIENTE
                    </button>
                </div>

                {/* Layout 2 colunas */}
                <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
                    {/* Lista de Pacientes */}
                    <div className="bg-gray-900 border border-gray-800 flex flex-col">
                        <div className="border-b border-gray-800 px-4 py-3">
                            <h2 className="text-sm font-bold text-white">LISTA</h2>
                            <p className="text-xs text-gray-500 mt-1">
                                {listaPacientes.length} registros
                            </p>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {carregando ? (
                                <div className="p-4 text-center text-xs text-gray-500">Carregando...</div>
                            ) : (
                                listaPacientes.map((paciente) => (
                                    <button
                                        key={paciente.id}
                                        onClick={() => setPacienteSelecionado(paciente)}
                                        className={`w-full text-left px-4 py-3 border-b border-gray-800/50 ${pacienteSelecionado?.id === paciente.id
                                            ? "bg-gray-800"
                                            : "hover:bg-gray-800/50"
                                            }`}
                                    >
                                        <div className="text-sm text-white">{paciente.nome}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {paciente.telefone}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Detalhes do Paciente */}
                    <div className="col-span-2 bg-gray-900 border border-gray-800">
                        <div className="border-b border-gray-800 px-4 py-3">
                            <h2 className="text-sm font-bold text-white">DETALHES</h2>
                        </div>

                        {editando && editFormData ? (
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">NOME COMPLETO</label>
                                            <input
                                                type="text"
                                                value={editFormData.nome || ""}
                                                onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">TELEFONE</label>
                                            <input
                                                type="text"
                                                value={editFormData.telefone || ""}
                                                onChange={(e) => setEditFormData({ ...editFormData, telefone: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">E-MAIL</label>
                                            <input
                                                type="email"
                                                value={editFormData.email || ""}
                                                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">CPF</label>
                                            <input
                                                type="text"
                                                value={editFormData.cpf || ""}
                                                onChange={(e) => setEditFormData({ ...editFormData, cpf: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">RG</label>
                                            <input
                                                type="text"
                                                value={editFormData.rg || ""}
                                                onChange={(e) => setEditFormData({ ...editFormData, rg: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">DATA DE NASCIMENTO</label>
                                            <input
                                                type="date"
                                                value={editFormData.dataNascimento || ""}
                                                onChange={(e) => setEditFormData({ ...editFormData, dataNascimento: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">NOME DO PAI</label>
                                            <input
                                                type="text"
                                                value={editFormData.nomePai || ""}
                                                onChange={(e) => setEditFormData({ ...editFormData, nomePai: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">NOME DA MÃE</label>
                                            <input
                                                type="text"
                                                value={editFormData.nomeMae || ""}
                                                onChange={(e) => setEditFormData({ ...editFormData, nomeMae: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">CEP</label>
                                            <input
                                                type="text"
                                                value={editFormData.enderecoCep || ""}
                                                onChange={(e) => setEditFormData({ ...editFormData, enderecoCep: e.target.value })}
                                                placeholder="00000-000"
                                                className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-2">
                                                <label className="text-xs text-gray-500 block mb-1">LOGRADOURO</label>
                                                <input
                                                    type="text"
                                                    value={editFormData.enderecoLogradouro || ""}
                                                    onChange={(e) => setEditFormData({ ...editFormData, enderecoLogradouro: e.target.value })}
                                                    className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">Nº</label>
                                                <input
                                                    type="text"
                                                    value={editFormData.enderecoNumero || ""}
                                                    onChange={(e) => setEditFormData({ ...editFormData, enderecoNumero: e.target.value })}
                                                    className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">BAIRRO</label>
                                                <input
                                                    type="text"
                                                    value={editFormData.enderecoBairro || ""}
                                                    onChange={(e) => setEditFormData({ ...editFormData, enderecoBairro: e.target.value })}
                                                    className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">COMPLEMENTO</label>
                                                <input
                                                    type="text"
                                                    value={editFormData.enderecoComplemento || ""}
                                                    onChange={(e) => setEditFormData({ ...editFormData, enderecoComplemento: e.target.value })}
                                                    className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="col-span-2">
                                                <label className="text-xs text-gray-500 block mb-1">CIDADE</label>
                                                <input
                                                    type="text"
                                                    value={editFormData.enderecoCidade || ""}
                                                    onChange={(e) => setEditFormData({ ...editFormData, enderecoCidade: e.target.value })}
                                                    className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 block mb-1">UF</label>
                                                <input
                                                    type="text"
                                                    maxLength={2}
                                                    value={editFormData.enderecoEstado || ""}
                                                    onChange={(e) => setEditFormData({ ...editFormData, enderecoEstado: e.target.value.toUpperCase() })}
                                                    className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none uppercase"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">OBSERVAÇÕES</label>
                                            <textarea
                                                rows={3}
                                                value={editFormData.observacoes || ""}
                                                onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
                                                className="w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-8 pt-4 border-t border-gray-800 flex gap-2">
                                    <button
                                        onClick={handleSalvar}
                                        className="px-6 py-2 bg-green-600 text-white text-xs font-bold hover:bg-green-500"
                                    >
                                        SALVAR ALTERAÇÕES
                                    </button>
                                    <button
                                        onClick={handleCancelar}
                                        className="px-6 py-2 bg-gray-800 border border-gray-700 text-white text-xs font-bold hover:bg-gray-700"
                                    >
                                        CANCELAR
                                    </button>
                                </div>
                            </div>
                        ) : pacienteSelecionado ? (
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-6">
                                    {/* Coluna 1 */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                                NOME COMPLETO
                                            </label>
                                            <div className="text-sm text-white uppercase">
                                                {pacienteSelecionado.nome}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                                TELEFONE
                                            </label>
                                            <div className="text-sm text-white">
                                                {pacienteSelecionado.telefone}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                                E-MAIL
                                            </label>
                                            <div className="text-sm text-white">
                                                {pacienteSelecionado.email || "-"}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                                CPF
                                            </label>
                                            <div className="text-sm text-white font-mono">
                                                {pacienteSelecionado.cpf || "-"}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                                RG
                                            </label>
                                            <div className="text-sm text-white font-mono">
                                                {pacienteSelecionado.rg || "-"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Coluna 2 */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                                DATA DE NASCIMENTO
                                            </label>
                                            <div className="text-sm text-white">
                                                {pacienteSelecionado.dataNascimento ? new Date(pacienteSelecionado.dataNascimento).toLocaleDateString("pt-BR") : "-"}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                                NOME DO PAI
                                            </label>
                                            <div className="text-sm text-white uppercase">
                                                {pacienteSelecionado.nomePai || "-"}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                                NOME DA MÃE
                                            </label>
                                            <div className="text-sm text-white uppercase">
                                                {pacienteSelecionado.nomeMae || "-"}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                                ENDEREÇO
                                            </label>
                                            <div className="text-sm text-white uppercase italic">
                                                {pacienteSelecionado.enderecoCep ? `${pacienteSelecionado.enderecoCep} • ` : ""}
                                                {pacienteSelecionado.enderecoLogradouro}, {pacienteSelecionado.enderecoNumero}
                                                <br />
                                                {pacienteSelecionado.enderecoBairro} - {pacienteSelecionado.enderecoCidade}/{pacienteSelecionado.enderecoEstado}
                                                {pacienteSelecionado.enderecoComplemento && <><br />{pacienteSelecionado.enderecoComplemento}</>}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                                ÚLTIMA CONSULTA
                                            </label>
                                            <div className="text-sm text-white">
                                                {new Date(pacienteSelecionado.ultimaConsulta).toLocaleDateString("pt-BR")}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500 block mb-1">
                                                OBSERVAÇÕES
                                            </label>
                                            <div className="text-sm text-gray-400">
                                                {pacienteSelecionado.observacoes || "-"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Ações */}
                                <div className="mt-8 pt-4 border-t border-gray-800 flex gap-2">
                                    <button
                                        onClick={handleEditar}
                                        className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-xs font-medium text-white hover:bg-gray-700"
                                    >
                                        EDITAR
                                    </button>
                                    <button className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-xs font-medium text-white hover:bg-gray-700">
                                        HISTÓRICO
                                    </button>
                                    <button
                                        onClick={() => window.location.href = `/agendamento?paciente=${pacienteSelecionado.nome}`}
                                        className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-xs font-medium text-white hover:bg-gray-700"
                                    >
                                        AGENDAR
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                Selecione um paciente na lista
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout >
    );
}
