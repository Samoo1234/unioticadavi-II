interface Empresa {
    id: number;
    nome_fantasia: string;
    cidade?: string;
}

interface UnitSelectorProps {
    empresas: Empresa[];
    value: string | number;
    onChange: (value: string) => void;
    label?: string;
    showAll?: boolean;
    allLabel?: string;
    disabled?: boolean;
    showCidade?: boolean;
}

export default function UnitSelector({
    empresas,
    value,
    onChange,
    label = "UNIDADE",
    showAll = true,
    allLabel = "TODAS AS LOJAS",
    disabled = false,
    showCidade = false,
}: UnitSelectorProps) {
    return (
        <div>
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                {label}
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={`bg-transparent border-none text-sm font-bold text-white p-0 focus:outline-none transition-all ${
                    disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:text-green-500"
                }`}
            >
                {showAll && (
                    <option value="geral" className="bg-gray-900 text-white">
                        {allLabel}
                    </option>
                )}
                {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-gray-900 text-white">
                        {emp.nome_fantasia.toUpperCase()}
                        {showCidade && emp.cidade ? ` - ${emp.cidade.toUpperCase()}` : ""}
                    </option>
                ))}
            </select>
        </div>
    );
}
