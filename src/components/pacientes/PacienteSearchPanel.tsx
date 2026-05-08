"use client";

import { RefObject } from "react";
import { Paciente } from "@/types";

interface PacienteSearchPanelProps {
    termoBusca: string;
    setTermoBusca: (val: string) => void;
    inputBuscaRef: RefObject<HTMLInputElement | null>;
    listaPacientes: Paciente[];
    setListaPacientes: (lista: Paciente[]) => void;
    carregando: boolean;
    pacienteSelecionado: Paciente | null;
    setPacienteSelecionado: (pac: Paciente | null) => void;
}

export function PacienteSearchPanel({
    termoBusca,
    setTermoBusca,
    inputBuscaRef,
    listaPacientes,
    setListaPacientes,
    carregando,
    pacienteSelecionado,
    setPacienteSelecionado,
}: PacienteSearchPanelProps) {
    return (
        <div className="bg-gray-900 border border-gray-800 flex flex-col">
            <div className="border-b border-gray-800 px-4 py-3">
                <h2 className="text-sm font-bold text-white mb-2">PESQUISAR</h2>
                <div className="relative">
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    <input
                        ref={inputBuscaRef as any}
                        type="text"
                        value={termoBusca}
                        onChange={(e) => setTermoBusca(e.target.value)}
                        placeholder="Pesquisar paciente..."
                        className="w-full bg-gray-800 border border-gray-700 text-sm text-white pl-10 pr-3 py-2 focus:border-green-500 focus:outline-none"
                    />
                    {termoBusca && (
                        <button
                            onClick={() => {
                                setTermoBusca("");
                                setListaPacientes([]);
                                setPacienteSelecionado(null);
                                inputBuscaRef.current?.focus();
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                        >
                            ✕
                        </button>
                    )}
                </div>
                {listaPacientes.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                        {listaPacientes.length} resultado{listaPacientes.length !== 1 ? "s" : ""}
                    </p>
                )}
            </div>
            <div className="flex-1 overflow-auto">
                {carregando ? (
                    <div className="p-4 text-center text-xs text-gray-500">Carregando...</div>
                ) : termoBusca.length < 3 ? (
                    <div className="p-6 text-center">
                        <div className="text-gray-600 mb-2">
                            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-500">
                            Digite pelo menos <span className="text-green-500 font-bold">3 letras</span> para pesquisar
                        </p>
                    </div>
                ) : listaPacientes.length === 0 ? (
                    <div className="p-6 text-center">
                        <p className="text-xs text-gray-500">Nenhum paciente encontrado</p>
                    </div>
                ) : (
                    listaPacientes.map((paciente) => (
                        <button
                            key={paciente.id}
                            onClick={() => setPacienteSelecionado(paciente)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-800/50 transition-colors ${pacienteSelecionado?.id === paciente.id
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
    );
}
