"use client";

import { useState, useRef } from "react";
import { Exame, Prontuario, exameVazio, prontuarioVazio, ExameOcular } from "@/data/clinicaData";
import Panel from "./Panel";

interface ExamFormProps {
    exameInicial?: Exame;
    prontuarioInicial?: Prontuario;
    modoVisualizacao?: boolean;
    pacienteId?: string;
    agendamentoId?: string;
    onSalvarConsulta?: (dados: {
        prontuario: Prontuario;
        exame: Exame;
        examePerto?: Exame;
        tipoLente: string;
        observacoesReceita: string;
    }) => Promise<boolean>;
    onGerarReceita?: (dados: {
        exame: Exame;
        examePerto?: Exame;
        tipoLente: string;
        observacoesReceita: string;
    }) => void;
    onLimpar?: () => void;
}

interface InputFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "number";
    width?: string;
    disabled?: boolean;
}

function InputField({ label, value, onChange, type = "text", width = "w-20", disabled = false }: InputFieldProps) {
    return (
        <div className={width}>
            <label className="text-xs text-gray-500 block mb-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
        </div>
    );
}

interface TextAreaFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    rows?: number;
    disabled?: boolean;
}

function TextAreaField({ label, value, onChange, rows = 3, disabled = false }: TextAreaFieldProps) {
    return (
        <div>
            <label className="text-xs text-gray-500 block mb-1">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                disabled={disabled}
                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
        </div>
    );
}

interface OlhoRowProps {
    olho: ExameOcular;
    onChange: (field: keyof ExameOcular, value: string) => void;
    disabled?: boolean;
}

function OlhoRow({ olho, onChange, disabled = false }: OlhoRowProps) {
    return (
        <div className="flex items-end gap-3 py-2 border-b border-gray-800/50">
            <div className="w-12">
                <span className={`text-sm font-bold ${olho.olho === "OD" ? "text-green-500" : "text-yellow-500"}`}>
                    {olho.olho}
                </span>
            </div>
            <InputField
                label="ESFÉRICO"
                value={olho.esferico}
                onChange={(v) => onChange("esferico", v)}
                disabled={disabled}
            />
            <InputField
                label="CILÍNDRICO"
                value={olho.cilindrico}
                onChange={(v) => onChange("cilindrico", v)}
                disabled={disabled}
            />
            <InputField
                label="EIXO"
                value={olho.eixo}
                onChange={(v) => onChange("eixo", v)}
                disabled={disabled}
            />
            <InputField
                label="ADIÇÃO"
                value={olho.adicao}
                onChange={(v) => onChange("adicao", v)}
                disabled={disabled}
            />
            <InputField
                label="DNP"
                value={olho.dnp}
                onChange={(v) => onChange("dnp", v)}
                disabled={disabled}
            />
        </div>
    );
}

export default function ExamForm({
    exameInicial,
    prontuarioInicial,
    modoVisualizacao = false,
    pacienteId,
    agendamentoId,
    onSalvarConsulta,
    onGerarReceita,
    onLimpar
}: ExamFormProps) {
    const [prontuario, setProntuario] = useState<Prontuario>(prontuarioInicial || prontuarioVazio);
    const [exame, setExame] = useState<Exame>(exameInicial || exameVazio);
    const [examePerto, setExamePerto] = useState<Exame>({
        ...exameVazio,
        id: 0,
        consultaId: 0,
    });
    const [tipoLente, setTipoLente] = useState("");
    const [observacoesReceita, setObservacoesReceita] = useState("");
    const [salvando, setSalvando] = useState(false);
    const salvandoRef = useRef(false);

    const atualizarOlho = (olho: "olhoDireito" | "olhoEsquerdo", field: keyof ExameOcular, value: string) => {
        setExame((prev) => ({
            ...prev,
            [olho]: {
                ...prev[olho],
                [field]: value,
            },
        }));
    };

    const atualizarOlhoPerto = (olho: "olhoDireito" | "olhoEsquerdo", field: keyof ExameOcular, value: string) => {
        setExamePerto((prev) => ({
            ...prev,
            [olho]: {
                ...prev[olho],
                [field]: value,
            },
        }));
    };

    return (
        <Panel title="EXAME / PRONTUÁRIO" subtitle="Atendimento atual" className="h-full">
            <div className="p-4 space-y-6">
                {/* BLOCO 1: PRONTUÁRIO */}
                <div>
                    <div className="text-xs font-bold text-gray-400 mb-3 pb-2 border-b border-gray-700">
                        PRONTUÁRIO
                    </div>
                    <div className="space-y-4">
                        <TextAreaField
                            label="QUEIXA PRINCIPAL"
                            value={prontuario.queixaPrincipal}
                            onChange={(v) => setProntuario((p) => ({ ...p, queixaPrincipal: v }))}
                            rows={2}
                            disabled={modoVisualizacao}
                        />
                        <TextAreaField
                            label="ANAMNESE"
                            value={prontuario.anamnese}
                            onChange={(v) => setProntuario((p) => ({ ...p, anamnese: v }))}
                            rows={3}
                            disabled={modoVisualizacao}
                        />
                        <TextAreaField
                            label="OBSERVAÇÕES CLÍNICAS"
                            value={prontuario.observacoesClinicas}
                            onChange={(v) => setProntuario((p) => ({ ...p, observacoesClinicas: v }))}
                            rows={2}
                            disabled={modoVisualizacao}
                        />
                    </div>
                </div>

                {/* BLOCO 2: EXAME */}
                <div>
                    <div className="text-xs font-bold text-gray-400 mb-3 pb-2 border-b border-gray-700">
                        EXAME {(tipoLente === "Bifocal" || tipoLente === "Progressiva") && <span className="text-green-500">- LONGE</span>}
                    </div>
                    <div className="space-y-1">
                        <OlhoRow
                            olho={exame.olhoDireito}
                            onChange={(field, value) => atualizarOlho("olhoDireito", field, value)}
                            disabled={modoVisualizacao}
                        />
                        <OlhoRow
                            olho={exame.olhoEsquerdo}
                            onChange={(field, value) => atualizarOlho("olhoEsquerdo", field, value)}
                            disabled={modoVisualizacao}
                        />
                    </div>
                </div>

                {/* BLOCO 2.1: EXAME PARA PERTO (apenas Bifocal/Progressiva) */}
                {(tipoLente === "Bifocal" || tipoLente === "Progressiva") && (
                    <div>
                        <div className="text-xs font-bold text-gray-400 mb-3 pb-2 border-b border-gray-700">
                            EXAME <span className="text-yellow-500">- PERTO</span>
                        </div>
                        <div className="space-y-1">
                            <OlhoRow
                                olho={examePerto.olhoDireito}
                                onChange={(field, value) => atualizarOlhoPerto("olhoDireito", field, value)}
                                disabled={modoVisualizacao}
                            />
                            <OlhoRow
                                olho={examePerto.olhoEsquerdo}
                                onChange={(field, value) => atualizarOlhoPerto("olhoEsquerdo", field, value)}
                                disabled={modoVisualizacao}
                            />
                        </div>
                    </div>
                )}

                {/* BLOCO 3: RECEITA */}
                <div>
                    <div className="text-xs font-bold text-gray-400 mb-3 pb-2 border-b border-gray-700">
                        RECEITA
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-gray-500 block mb-1">TIPO DE LENTE</label>
                            <select
                                value={tipoLente}
                                onChange={(e) => setTipoLente(e.target.value)}
                                disabled={modoVisualizacao}
                                className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 text-sm text-white focus:border-green-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">Selecione...</option>
                                <option value="Monofocal">Monofocal</option>
                                <option value="Bifocal">Bifocal</option>
                                <option value="Progressiva">Progressiva</option>
                                <option value="Lentes de Contato">Lentes de Contato</option>
                            </select>
                        </div>
                        <TextAreaField
                            label="OBSERVAÇÕES DA RECEITA"
                            value={observacoesReceita}
                            onChange={setObservacoesReceita}
                            rows={2}
                            disabled={modoVisualizacao}
                        />
                    </div>
                </div>

                {/* AÇÕES */}
                {!modoVisualizacao && (
                    <div className="pt-4 border-t border-gray-700 flex gap-3">
                        <button
                            onClick={async () => {
                                if (salvandoRef.current) return;
                                if (!onSalvarConsulta) {
                                    alert("Função de salvar não configurada");
                                    return;
                                }

                                salvandoRef.current = true;
                                setSalvando(true);

                                try {
                                    const sucesso = await onSalvarConsulta({
                                        prontuario,
                                        exame,
                                        examePerto: (tipoLente === "Bifocal" || tipoLente === "Progressiva") ? examePerto : undefined,
                                        tipoLente,
                                        observacoesReceita
                                    });
                                } finally {
                                    setSalvando(false);
                                    salvandoRef.current = false;
                                }
                            }}
                            disabled={salvando}
                            className="px-4 py-2 bg-green-700 border border-green-600 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {salvando ? "SALVANDO..." : "SALVAR CONSULTA"}
                        </button>
                        <button
                            onClick={() => {
                                if (!onGerarReceita) {
                                    alert("Função de gerar receita não configurada");
                                    return;
                                }
                                if (!tipoLente) {
                                    alert("Selecione o tipo de lente antes de gerar a receita");
                                    return;
                                }
                                onGerarReceita({
                                    exame,
                                    examePerto: (tipoLente === "Bifocal" || tipoLente === "Progressiva") ? examePerto : undefined,
                                    tipoLente,
                                    observacoesReceita
                                });
                            }}
                            className="px-4 py-2 bg-gray-800 border border-gray-600 text-sm font-medium text-white hover:bg-gray-700"
                        >
                            GERAR RECEITA
                        </button>
                        <button
                            onClick={() => {
                                if (onLimpar) {
                                    onLimpar();
                                }
                                // Reset local state
                                setProntuario(prontuarioVazio);
                                setExame(exameVazio);
                                setExamePerto({ ...exameVazio, id: 0, consultaId: 0 });
                                setTipoLente("");
                                setObservacoesReceita("");
                            }}
                            className="px-4 py-2 bg-gray-800 border border-gray-600 text-sm font-medium text-white hover:bg-gray-700"
                        >
                            LIMPAR
                        </button>
                    </div>
                )}
            </div>
        </Panel>
    );
}
