"use client";

import Panel from "@/components/clinica/Panel";
import FormField from "@/components/ui/FormField";

export interface FormLente {
    codigo: string;
    nome: string;
    tipo: string;
    marca: string;
    material: string;
    quantidade: string;
    precoUnitario: string;
    precoCusto: string;
    ncm: string;
    cest: string;
    origem: string;
}

export interface FormArmacao {
    codigo: string;
    nome: string;
    marca: string;
    modelo: string;
    cor: string;
    quantidade: string;
    precoUnitario: string;
    precoCusto: string;
    ncm: string;
    cest: string;
    origem: string;
}

interface EstoqueLenteFormProps {
    form: FormLente;
    setForm: (form: FormLente) => void;
    onSave: () => void;
    isEdicao: boolean;
}

export function EstoqueLenteForm({ form, setForm, onSave, isEdicao }: EstoqueLenteFormProps) {
    return (
        <Panel title={isEdicao ? "EDITAR LENTE" : "NOVA LENTE"} className="h-fit">
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        label="CÓDIGO *"
                        value={form.codigo}
                        onChange={(v) => setForm({ ...form, codigo: v })}
                    />
                    <FormField
                        label="TIPO"
                        type="select"
                        value={form.tipo}
                        onChange={(v) => setForm({ ...form, tipo: v })}
                        options={[
                            { value: "Monofocal", label: "Monofocal" },
                            { value: "Bifocal", label: "Bifocal" },
                            { value: "Progressiva", label: "Progressiva" },
                            { value: "Contato", label: "Contato" },
                        ]}
                    />
                </div>
                <FormField
                    label="NOME *"
                    value={form.nome}
                    onChange={(v) => setForm({ ...form, nome: v })}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        label="MARCA *"
                        value={form.marca}
                        onChange={(v) => setForm({ ...form, marca: v })}
                    />
                    <FormField
                        label="MATERIAL"
                        type="select"
                        value={form.material}
                        onChange={(v) => setForm({ ...form, material: v })}
                        options={[
                            { value: "CR-39", label: "CR-39" },
                            { value: "Policarbonato", label: "Policarbonato" },
                            { value: "Trivex", label: "Trivex" },
                            { value: "Alto Índice", label: "Alto Índice" },
                        ]}
                    />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <FormField
                        label="QUANTIDADE"
                        value={form.quantidade}
                        onChange={(v) => setForm({ ...form, quantidade: v })}
                        type="number"
                    />
                    <FormField
                        label="PREÇO CUSTO"
                        value={form.precoCusto}
                        onChange={(v) => setForm({ ...form, precoCusto: v })}
                        type="currency"
                    />
                    <FormField
                        label="PREÇO VENDA"
                        value={form.precoUnitario}
                        onChange={(v) => setForm({ ...form, precoUnitario: v })}
                        type="currency"
                    />
                </div>
                <div className="pt-2 border-t border-gray-800">
                    <div className="text-[10px] text-gray-500 font-bold mb-2 uppercase tracking-widest">Informações Fiscais</div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            label="NCM"
                            value={form.ncm}
                            onChange={(v) => setForm({ ...form, ncm: v })}
                        />
                        <FormField
                            label="CEST"
                            value={form.cest}
                            onChange={(v) => setForm({ ...form, cest: v })}
                        />
                    </div>
                    <div className="mt-4">
                        <FormField
                            label="ORIGEM DO PRODUTO"
                            type="select"
                            value={form.origem}
                            onChange={(v) => setForm({ ...form, origem: v })}
                            options={[
                                { value: "0", label: "0 - Nacional" },
                                { value: "1", label: "1 - Estrangeira (Importação Direta)" },
                                { value: "2", label: "2 - Estrangeira (Adquirida no Mercado Interno)" },
                            ]}
                        />
                    </div>
                </div>
                <button
                    onClick={onSave}
                    className="w-full px-4 py-2 bg-green-700 border border-green-600 text-sm font-medium text-white hover:bg-green-600"
                >
                    {isEdicao ? "ATUALIZAR LENTE" : "SALVAR LENTE"}
                </button>
            </div>
        </Panel>
    );
}

interface EstoqueArmacaoFormProps {
    form: FormArmacao;
    setForm: (form: FormArmacao) => void;
    onSave: () => void;
    isEdicao: boolean;
}

export function EstoqueArmacaoForm({ form, setForm, onSave, isEdicao }: EstoqueArmacaoFormProps) {
    return (
        <Panel title={isEdicao ? "EDITAR ARMAÇÃO" : "NOVA ARMAÇÃO"} className="h-fit">
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        label="CÓDIGO *"
                        value={form.codigo}
                        onChange={(v) => setForm({ ...form, codigo: v })}
                    />
                    <FormField
                        label="MODELO"
                        value={form.modelo}
                        onChange={(v) => setForm({ ...form, modelo: v })}
                    />
                </div>
                <FormField
                    label="NOME *"
                    value={form.nome}
                    onChange={(v) => setForm({ ...form, nome: v })}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        label="MARCA *"
                        value={form.marca}
                        onChange={(v) => setForm({ ...form, marca: v })}
                    />
                    <FormField
                        label="COR"
                        value={form.cor}
                        onChange={(v) => setForm({ ...form, cor: v })}
                    />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <FormField
                        label="QUANTIDADE"
                        value={form.quantidade}
                        onChange={(v) => setForm({ ...form, quantidade: v })}
                        type="number"
                    />
                    <FormField
                        label="PREÇO CUSTO"
                        value={form.precoCusto}
                        onChange={(v) => setForm({ ...form, precoCusto: v })}
                        type="currency"
                    />
                    <FormField
                        label="PREÇO VENDA"
                        value={form.precoUnitario}
                        onChange={(v) => setForm({ ...form, precoUnitario: v })}
                        type="currency"
                    />
                </div>
                <div className="pt-2 border-t border-gray-800">
                    <div className="text-[10px] text-gray-500 font-bold mb-2 uppercase tracking-widest">Informações Fiscais</div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            label="NCM"
                            value={form.ncm}
                            onChange={(v) => setForm({ ...form, ncm: v })}
                        />
                        <FormField
                            label="CEST"
                            value={form.cest}
                            onChange={(v) => setForm({ ...form, cest: v })}
                        />
                    </div>
                    <div className="mt-4">
                        <FormField
                            label="ORIGEM DO PRODUTO"
                            type="select"
                            value={form.origem}
                            onChange={(v) => setForm({ ...form, origem: v })}
                            options={[
                                { value: "0", label: "0 - Nacional" },
                                { value: "1", label: "1 - Estrangeira (Importação Direta)" },
                                { value: "2", label: "2 - Estrangeira (Adquirida no Mercado Interno)" },
                            ]}
                        />
                    </div>
                </div>
                <button
                    onClick={onSave}
                    className="w-full px-4 py-2 bg-green-700 border border-green-600 text-sm font-medium text-white hover:bg-green-600"
                >
                    {isEdicao ? "ATUALIZAR ARMAÇÃO" : "SALVAR ARMAÇÃO"}
                </button>
            </div>
        </Panel>
    );
}
