"use client";

import FormField from "@/components/ui/FormField";

interface PacienteFormProps {
    editFormData: any;
    setEditFormData: (data: any) => void;
    onSave: () => void;
    onCancel: () => void;
}

export function PacienteForm({ editFormData, setEditFormData, onSave, onCancel }: PacienteFormProps) {
    return (
        <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                    <FormField
                        label="NOME COMPLETO"
                        value={editFormData.nome || ""}
                        onChange={(v) => setEditFormData({ ...editFormData, nome: v })}
                    />
                    <FormField
                        label="TELEFONE"
                        value={editFormData.telefone || ""}
                        onChange={(v) => setEditFormData({ ...editFormData, telefone: v })}
                    />
                    <FormField
                        label="E-MAIL"
                        type="email"
                        value={editFormData.email || ""}
                        onChange={(v) => setEditFormData({ ...editFormData, email: v })}
                    />
                    <FormField
                        label="CPF"
                        value={editFormData.cpf || ""}
                        onChange={(v) => setEditFormData({ ...editFormData, cpf: v })}
                    />
                    <FormField
                        label="RG"
                        value={editFormData.rg || ""}
                        onChange={(v) => setEditFormData({ ...editFormData, rg: v })}
                    />
                </div>
                <div className="space-y-4">
                    <FormField
                        label="DATA DE NASCIMENTO"
                        type="date"
                        value={editFormData.dataNascimento || ""}
                        onChange={(v) => setEditFormData({ ...editFormData, dataNascimento: v })}
                    />
                    <FormField
                        label="NOME DO PAI"
                        value={editFormData.nomePai || ""}
                        onChange={(v) => setEditFormData({ ...editFormData, nomePai: v })}
                    />
                    <FormField
                        label="NOME DA MÃE"
                        value={editFormData.nomeMae || ""}
                        onChange={(v) => setEditFormData({ ...editFormData, nomeMae: v })}
                    />
                    <FormField
                        label="CEP"
                        value={editFormData.enderecoCep || ""}
                        onChange={(v) => setEditFormData({ ...editFormData, enderecoCep: v })}
                        placeholder="00000-000"
                    />
                    <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                            <FormField
                                label="LOGRADOURO"
                                value={editFormData.enderecoLogradouro || ""}
                                onChange={(v) => setEditFormData({ ...editFormData, enderecoLogradouro: v })}
                            />
                        </div>
                        <FormField
                            label="Nº"
                            value={editFormData.enderecoNumero || ""}
                            onChange={(v) => setEditFormData({ ...editFormData, enderecoNumero: v })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <FormField
                            label="BAIRRO"
                            value={editFormData.enderecoBairro || ""}
                            onChange={(v) => setEditFormData({ ...editFormData, enderecoBairro: v })}
                        />
                        <FormField
                            label="COMPLEMENTO"
                            value={editFormData.enderecoComplemento || ""}
                            onChange={(v) => setEditFormData({ ...editFormData, enderecoComplemento: v })}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                            <FormField
                                label="CIDADE"
                                value={editFormData.enderecoCidade || ""}
                                onChange={(v) => setEditFormData({ ...editFormData, enderecoCidade: v })}
                            />
                        </div>
                        <FormField
                            label="UF"
                            value={editFormData.enderecoEstado || ""}
                            onChange={(v) => setEditFormData({ ...editFormData, enderecoEstado: v.toUpperCase() })}
                            maxLength={2}
                        />
                    </div>
                    <FormField
                        label="OBSERVAÇÕES"
                        type="textarea"
                        rows={3}
                        value={editFormData.observacoes || ""}
                        onChange={(v) => setEditFormData({ ...editFormData, observacoes: v })}
                    />
                </div>
            </div>
            <div className="mt-8 pt-4 border-t border-gray-800 flex gap-2">
                <button
                    onClick={onSave}
                    className="px-6 py-2 bg-green-600 text-white text-xs font-bold hover:bg-green-500"
                >
                    SALVAR ALTERAÇÕES
                </button>
                <button
                    onClick={onCancel}
                    className="px-6 py-2 bg-gray-800 border border-gray-700 text-white text-xs font-bold hover:bg-gray-700"
                >
                    CANCELAR
                </button>
            </div>
        </div>
    );
}
