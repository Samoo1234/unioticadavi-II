"use client";

import { Paciente } from "@/types";

interface PacienteDetailsProps {
    pacienteSelecionado: Paciente | null;
    onEditar: () => void;
}

export function PacienteDetails({ pacienteSelecionado, onEditar }: PacienteDetailsProps) {
    if (!pacienteSelecionado) {
        return (
            <div className="p-6 text-center text-gray-500 h-full flex items-center justify-center">
                Pesquise e selecione um paciente
            </div>
        );
    }

    return (
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
                            {pacienteSelecionado.ultimaConsulta ? new Date(pacienteSelecionado.ultimaConsulta).toLocaleDateString("pt-BR") : "-"}
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
                    onClick={onEditar}
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
    );
}
