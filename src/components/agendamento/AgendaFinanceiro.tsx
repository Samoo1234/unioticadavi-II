"use client";

import { RegistroFinanceiroAgendamento, TipoFinanceiroAgendamento, SituacaoFinanceiroAgendamento, PagamentoAgendamento, FormaPagamento, formasPagamento } from "@/data/financeiroData";
import { formatarMoeda, parseMoeda } from "@/utils/monetary";

interface AgendaFinanceiroProps {
    registrosFin: RegistroFinanceiroAgendamento[];
    onUpdateRegistro: (registroId: string | number, field: keyof RegistroFinanceiroAgendamento, value: any) => void;
    onAddPagamento: (registroId: string | number) => void;
    onRemovePagamento: (registroId: string | number, index: number) => void;
    onUpdatePagamento: (registroId: string | number, index: number, field: keyof PagamentoAgendamento, value: any) => void;
    onSalvarFinanceiro: (registroId: string | number) => void;
    financeiroIndividualId: string | number | null;
}

export default function AgendaFinanceiro({
    registrosFin,
    onUpdateRegistro,
    onAddPagamento,
    onRemovePagamento,
    onUpdatePagamento,
    onSalvarFinanceiro,
    financeiroIndividualId,
}: AgendaFinanceiroProps) {
    return (
        <>
            {/* Tabela Financeira */}
            <div className="bg-gray-900 border border-gray-800 overflow-x-auto">
                <table className="w-full min-w-[1200px]">
                    <thead>
                        <tr className="border-b border-gray-800 text-left bg-gray-800/30">
                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Cliente</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase w-32">R$</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase w-40">Tipo</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase w-80">Forma de Pagamento</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase w-40">Situação</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Observações</th>
                            <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase w-32 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {registrosFin.map((reg) => {
                            const totalPagamentos = reg.pagamentos.reduce((acc, p) => acc + p.valor, 0);

                            return (
                                <tr key={reg.id} className="border-b border-gray-800 hover:bg-gray-800/20 transition-colors">
                                    <td className="px-4 py-4 text-sm font-medium text-white uppercase">{reg.pacienteNome}</td>
                                    <td className="px-4 py-4">
                                        <input
                                            type="text"
                                            value={formatarMoeda(reg.valorTotal)}
                                            onChange={(e) => onUpdateRegistro(reg.id, "valorTotal", parseMoeda(e.target.value))}
                                            className="w-full bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none text-right font-mono"
                                            placeholder="0,00"
                                        />
                                    </td>
                                    <td className="px-4 py-4">
                                        <select
                                            value={reg.tipo}
                                            onChange={(e) => onUpdateRegistro(reg.id, "tipo", e.target.value as TipoFinanceiroAgendamento)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                        >
                                            <option value="">Selecione</option>
                                            <option value="Particular">Particular</option>
                                            <option value="Convênio">Convênio</option>
                                            <option value="Campanha">Campanha</option>
                                            <option value="Exames">Exames</option>
                                            <option value="Revisão">Revisão</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="space-y-2">
                                            {reg.pagamentos.map((pag, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <select
                                                        value={pag.forma}
                                                        onChange={(e) => onUpdatePagamento(reg.id, idx, "forma", e.target.value as FormaPagamento)}
                                                        className="flex-1 bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-xs"
                                                    >
                                                        {formasPagamento.map(f => (
                                                            <option key={f.id} value={f.nome}>{f.nome}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        value={formatarMoeda(pag.valor)}
                                                        onChange={(e) => onUpdatePagamento(reg.id, idx, "valor", parseMoeda(e.target.value))}
                                                        className="w-24 bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-xs text-right font-mono"
                                                        placeholder="0,00"
                                                    />
                                                    <button
                                                        onClick={() => onRemovePagamento(reg.id, idx)}
                                                        className="p-1.5 bg-gray-700/50 text-gray-400 hover:text-red-500"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => onAddPagamento(reg.id)}
                                                className="w-full py-2 px-3 bg-[#0a0f2c] border border-blue-900/50 text-white text-xs font-bold hover:bg-[#151c4d] flex items-center justify-center gap-2"
                                            >
                                                <span className="text-lg leading-none">+</span> ADICIONAR FORMA DE PAGAMENTO
                                            </button>
                                            <div className="text-xs font-bold mt-1">
                                                <span className="text-blue-400">Total: R$ / R$ {totalPagamentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                {totalPagamentos === reg.valorTotal && reg.valorTotal > 0 && (
                                                    <span className="text-green-500 ml-1">✓</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <select
                                            value={reg.situacao}
                                            onChange={(e) => onUpdateRegistro(reg.id, "situacao", e.target.value as SituacaoFinanceiroAgendamento)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                        >
                                            <option value="">Selecione</option>
                                            <option value="Caso Clínico">Caso Clínico</option>
                                            <option value="Efetivação">Efetivação</option>
                                            <option value="Perda">Perda</option>
                                        </select>
                                    </td>
                                    <td className="px-4 py-4">
                                        <input
                                            type="text"
                                            value={reg.observacoes}
                                            onChange={(e) => onUpdateRegistro(reg.id, "observacoes", e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                                            placeholder="..."
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <button
                                            onClick={() => onSalvarFinanceiro(reg.id)}
                                            className="px-6 py-2 bg-[#0a0f2c] border border-blue-900/50 text-white text-xs font-bold hover:bg-blue-900 transition-colors uppercase"
                                        >
                                            Salvar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Resumo — apenas na visão financeira do dia (não individual) */}
            {!financeiroIndividualId && (
                <div className="mt-8 space-y-6">
                    <h2 className="text-lg font-bold text-white uppercase tracking-tight">Resumo</h2>
                    <div className="grid grid-cols-2 gap-8">
                        {/* Por Tipo */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-400 uppercase">Por Tipo</h3>
                            <table className="w-full text-sm text-left border border-gray-800 bg-gray-900/50">
                                <thead>
                                    <tr className="border-b border-gray-800 bg-gray-800/30">
                                        <th className="px-4 py-2 font-medium text-gray-400">Tipo</th>
                                        <th className="px-4 py-2 font-medium text-gray-400">Quantidade</th>
                                        <th className="px-4 py-2 font-medium text-gray-400">Total (R$)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {(["Particular", "Convênio", "Campanha", "Exames", "Revisão"] as TipoFinanceiroAgendamento[]).map(t => {
                                        const filtrados = registrosFin.filter(r => r.tipo === t);
                                        const total = filtrados.reduce((acc, r) => acc + (r.valorTotal || 0), 0);
                                        return (
                                            <tr key={t} className="text-gray-300">
                                                <td className="px-4 py-2 uppercase">{t}</td>
                                                <td className="px-4 py-2">{filtrados.length}</td>
                                                <td className="px-4 py-2">{total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="bg-gray-800/20 font-bold text-white">
                                        <td className="px-4 py-2">Total</td>
                                        <td className="px-4 py-2">{registrosFin.length}</td>
                                        <td className="px-4 py-2">
                                            {registrosFin.reduce((acc, r) => acc + (r.valorTotal || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Por Forma de Pagamento */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-gray-400 uppercase">Por Forma de Pagamento</h3>
                            <table className="w-full text-sm text-left border border-gray-800 bg-gray-900/50">
                                <thead>
                                    <tr className="border-b border-gray-800 bg-gray-800/30">
                                        <th className="px-4 py-2 font-medium text-gray-400">Forma de Pagamento</th>
                                        <th className="px-4 py-2 font-medium text-gray-400">Quantidade</th>
                                        <th className="px-4 py-2 font-medium text-gray-400">Total (R$)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {(["Dinheiro", "Cartão", "PIX"] as FormaPagamento[]).map(f => {
                                        let count = 0;
                                        let total = 0;
                                        registrosFin.forEach(r => {
                                            const pagamentosDessaForma = r.pagamentos.filter(p => p.forma === f);
                                            if (pagamentosDessaForma.length > 0) {
                                                count += pagamentosDessaForma.length;
                                                total += pagamentosDessaForma.reduce((acc, p) => acc + p.valor, 0);
                                            }
                                        });
                                        return (
                                            <tr key={f} className="text-gray-300">
                                                <td className="px-4 py-2 uppercase">{f}</td>
                                                <td className="px-4 py-2">{count}</td>
                                                <td className="px-4 py-2">{total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
