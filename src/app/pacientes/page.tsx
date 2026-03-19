"use client";

import { useState, useRef } from "react";
import MainLayout from "@/components/MainLayout";

// Components
import PageHeader from "@/components/ui/PageHeader";
import FeedbackMessage from "@/components/ui/FeedbackMessage";
import { PacienteSearchPanel } from "@/components/pacientes/PacienteSearchPanel";
import { PacienteDetails } from "@/components/pacientes/PacienteDetails";
import { PacienteForm } from "@/components/pacientes/PacienteForm";

// Hooks
import { usePacientes } from "@/hooks/usePacientes";
import { useFeedback } from "@/hooks/useFeedback";
import { supabase } from "@/lib/supabase";

export default function PacientesPage() {
    const {
        listaPacientes, setListaPacientes,
        carregando,
        pacienteSelecionado, setPacienteSelecionado,
        termoBusca, setTermoBusca,
        salvarPaciente, adaptarDados
    } = usePacientes();

    const { mensagem, sucesso, erro } = useFeedback();
    
    const [editando, setEditando] = useState(false);
    const [editFormData, setEditFormData] = useState<any>(null);
    const inputBuscaRef = useRef<HTMLInputElement>(null);

    const handleEditar = () => {
        if (!pacienteSelecionado) return;
        setEditFormData({ ...pacienteSelecionado });
        setEditando(true);
    };

    const handleNovoPaciente = () => {
        setPacienteSelecionado(null);
        setEditFormData({
            nome: "", telefone: "", email: "", cpf: "", dataNascimento: "",
            nomePai: "", nomeMae: "", enderecoLogradouro: "", enderecoNumero: "",
            enderecoBairro: "", enderecoCidade: "", enderecoEstado: "", enderecoCep: "",
            enderecoComplemento: "", rg: "", observacoes: ""
        });
        setEditando(true);
    };

    const handleSalvar = async () => {
        if (!editFormData.nome) {
            erro("NOME É OBRIGATÓRIO");
            return;
        }

        try {
            const { error, data } = await salvarPaciente(editFormData);
            
            if (error) throw error;
            
            sucesso(editFormData.id ? "PACIENTE ATUALIZADO" : "PACIENTE CADASTRADO");
            setEditando(false);

            // Refetch data so the search results update
            const nomeSalvo = editFormData.nome;
            setTermoBusca(nomeSalvo);

            const targetId = editFormData.id || (data as any)?.id;
            const { data: refreshData } = await supabase
                .from('pacientes')
                .select('*')
                .ilike('nome', `%${nomeSalvo}%`)
                .order('nome')
                .limit(20);

            if (refreshData) {
                const adapted = adaptarDados(refreshData);
                setListaPacientes(adapted);
                if (targetId) {
                    const found = adapted.find(p => p.id === targetId);
                    if (found) setPacienteSelecionado(found);
                }
            }
        } catch (e: any) {
            console.error("Erro ao salvar paciente:", e);
            erro("ERRO AO SALVAR: " + e.message);
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
            <div className="h-full flex flex-col relative">
                <PageHeader
                    title="PACIENTES"
                    subtitle="Cadastro e histórico de pacientes"
                    rightContent={
                        <button
                            onClick={handleNovoPaciente}
                            disabled={editando}
                            className="px-4 py-2 bg-gray-800 border border-gray-700 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                        >
                            + NOVO PACIENTE
                        </button>
                    }
                />
                
                <FeedbackMessage mensagem={mensagem} />

                {/* Layout 2 colunas */}
                <div className="flex-1 grid grid-cols-3 gap-6 min-h-0 mt-2">
                    <PacienteSearchPanel
                        termoBusca={termoBusca}
                        setTermoBusca={setTermoBusca}
                        inputBuscaRef={inputBuscaRef}
                        listaPacientes={listaPacientes}
                        setListaPacientes={setListaPacientes}
                        carregando={carregando}
                        pacienteSelecionado={pacienteSelecionado}
                        setPacienteSelecionado={setPacienteSelecionado}
                    />

                    {/* Detalhes / Edição */}
                    <div className="col-span-2 bg-gray-900 border border-gray-800 flex flex-col">
                        <div className="border-b border-gray-800 px-4 py-3 shrink-0">
                            <h2 className="text-sm font-bold text-white">
                                {editando ? (editFormData?.id ? "EDITAR PACIENTE" : "NOVO PACIENTE") : "DETALHES"}
                            </h2>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto">
                            {editando && editFormData ? (
                                <PacienteForm
                                    editFormData={editFormData}
                                    setEditFormData={setEditFormData}
                                    onSave={handleSalvar}
                                    onCancel={handleCancelar}
                                />
                            ) : (
                                <PacienteDetails
                                    pacienteSelecionado={pacienteSelecionado}
                                    onEditar={handleEditar}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
