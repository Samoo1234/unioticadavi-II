import { formatarMoeda, parseMoeda } from "@/utils/monetary";

interface FormFieldProps {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: "text" | "number" | "currency" | "date" | "email" | "select" | "textarea";
    disabled?: boolean;
    placeholder?: string;
    maxLength?: number;
    rows?: number;
    options?: { value: string; label: string }[];
    className?: string;
}

export default function FormField({
    label,
    value,
    onChange,
    type = "text",
    disabled = false,
    placeholder,
    maxLength,
    rows = 3,
    options,
    className = "",
}: FormFieldProps) {
    const baseClasses = "w-full bg-gray-800 border border-gray-700 text-sm text-white px-3 py-2 focus:border-green-500 focus:outline-none disabled:opacity-50";

    if (type === "select" && options) {
        return (
            <div className={className}>
                <label className="text-xs text-gray-500 block mb-1">{label}</label>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={baseClasses}
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    if (type === "textarea") {
        return (
            <div className={className}>
                <label className="text-xs text-gray-500 block mb-1">{label}</label>
                <textarea
                    rows={rows}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={baseClasses}
                />
            </div>
        );
    }

    const isCurrency = type === "currency";
    const inputValue = isCurrency ? formatarMoeda(value) : value;

    return (
        <div className={className}>
            <label className="text-xs text-gray-500 block mb-1">{label}</label>
            <input
                type={isCurrency ? "text" : type}
                value={inputValue}
                onChange={(e) => {
                    const val = e.target.value;
                    if (isCurrency) {
                        onChange(parseMoeda(val).toString());
                    } else {
                        onChange(val);
                    }
                }}
                disabled={disabled}
                placeholder={placeholder}
                maxLength={maxLength}
                className={`${baseClasses} ${isCurrency || type === "number" ? "text-right font-mono" : ""} ${maxLength === 2 ? "uppercase" : ""}`}
            />
        </div>
    );
}
