"use client";

import { Transferencia } from "@/hooks/useTransferencias";
import { imprimirRelatorioTransferencia, ReportTransferenciaData } from "@/utils/reportUtils";

const statusConfig: Record<string, { label: string; color: string }> = {
    pendente: { label: "PENDENTE", color: "text-yellow-500 bg-yellow-500/10" },
    em_transito: { label: "EM TRÂNSITO", color: "text-blue-400 bg-blue-400/10" },
    recebido: { label: "RECEBIDO", color: "text-green-500 bg-green-500/10" },
    recebido_parcial: { label: "PARCIAL", color: "text-orange-400 bg-orange-400/10" },
    cancelado: { label: "CANCELADO", color: "text-red-500 bg-red-500/10" },
};

function gerarDadosRelatorio(t: Transferencia): ReportTransferenciaData {
    return {
        protocolo: `TRAN-${String(t.numero_protocolo).padStart(4, "0")}`,
        status: t.status,
        origem: `${t.empresa_origem?.nome_fantasia?.toUpperCase() || "—"} — ${t.empresa_origem?.cidade?.toUpperCase() || ""}`,
        destino: `${t.empresa_destino?.nome_fantasia?.toUpperCase() || "—"} — ${t.empresa_destino?.cidade?.toUpperCase() || ""}`,
        dataCriacao: new Date(t.data_criacao).toLocaleDateString("pt-BR"),
        dataEnvio: t.data_envio ? new Date(t.data_envio).toLocaleDateString("pt-BR") : "",
        dataRecebimento: t.data_recebimento ? new Date(t.data_recebimento).toLocaleDateString("pt-BR") : "",
        operadorCriacao: "",
        operadorRecebimento: "",
        observacoes: t.observacoes || "",
        motivoParcial: t.motivo_parcial || "",
        motivoCancelamento: t.motivo_cancelamento || "",
        itens: (t.itens || []).map(i => ({
            codigo: i.produto?.codigo || "",
            nome: i.produto?.nome || "—",
            marca: i.produto?.marca || "",
            tipo: i.produto?.tipo || "",
            qtdEnviada: i.quantidade_enviada,
            qtdRecebida: i.quantidade_recebida,
        })),
    };
}

interface TransferenciaTabelaProps {
    transferencias: Transferencia[];
    onEnviar: (id: string) => void;
    onConfirmar: (transferencia: Transferencia) => void;
    onCancelar: (transferencia: Transferencia) => void;
    onDetalhes: (transferencia: Transferencia) => void;
}

export function TransferenciaTabela({
    transferencias, onEnviar, onConfirmar, onCancelar, onDetalhes
}: TransferenciaTabelaProps) {
    if (transferencias.length === 0) {
        return <div className="p-4 text-gray-500 text-sm text-center">Nenhuma transferência registrada.</div>;
    }

    return (
        <table className="w-full text-sm">
            <thead className="bg-gray-900 sticky top-0">
                <tr className="text-xs text-gray-500 border-b border-gray-800">
                    <th className="text-left py-3 px-4">PROTOCOLO</th>
                    <th className="text-left py-3 px-4">DESTINO</th>
                    <th className="text-center py-3 px-4">ITENS</th>
                    <th className="text-center py-3 px-4">STATUS</th>
                    <th className="text-left py-3 px-4">DATA</th>
                    <th className="text-center py-3 px-4">AÇÕES</th>
                </tr>
            </thead>
            <tbody>
                {transferencias.map((t) => {
                    const cfg = statusConfig[t.status] || statusConfig.pendente;
                    const totalItens = t.itens?.reduce((acc, i) => acc + i.quantidade_enviada, 0) || 0;
                    return (
                        <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                            <td className="py-3 px-4 font-mono text-cyan-400 font-bold">
                                TRAN-{String(t.numero_protocolo).padStart(4, "0")}
                            </td>
                            <td className="py-3 px-4 text-white">
                                {t.empresa_destino?.cidade?.toUpperCase() || "—"}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-white">
                                {totalItens} un
                            </td>
                            <td className="py-3 px-4 text-center">
                                <span className={`text-xs font-medium px-2 py-0.5 ${cfg.color}`}>
                                    {cfg.label}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-gray-400">
                                {new Date(t.data_criacao).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="py-3 px-4 text-center">
                                <button
                                    onClick={() => onDetalhes(t)}
                                    className="text-gray-400 hover:text-white text-xs font-medium mr-2"
                                >
                                    DETALHES
                                </button>
                                <button
                                    onClick={() => imprimirRelatorioTransferencia(gerarDadosRelatorio(t))}
                                    className="text-gray-400 hover:text-white text-xs font-medium mr-2"
                                >
                                    IMPRIMIR
                                </button>
                                {t.status === "pendente" && (
                                    <>
                                        <button
                                            onClick={() => onEnviar(t.id)}
                                            className="text-blue-500 hover:text-blue-400 text-xs font-medium mr-2"
                                        >
                                            ENVIAR
                                        </button>
                                        <button
                                            onClick={() => onCancelar(t)}
                                            className="text-red-500 hover:text-red-400 text-xs font-medium"
                                        >
                                            CANCELAR
                                        </button>
                                    </>
                                )}
                                {t.status === "em_transito" && (
                                    <button
                                        onClick={() => onConfirmar(t)}
                                        className="text-green-500 hover:text-green-400 text-xs font-medium"
                                    >
                                        CONFIRMAR
                                    </button>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
