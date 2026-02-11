// Formatar número para moeda (ex: 1234.56 -> "1.234,56")
export function formatarMoeda(valor: number | string): string {
    const num = typeof valor === "string" ? parseFloat(valor) || 0 : valor;
    return new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
}

// Converter string de input para número (ex: "1.234,56" -> 1234.56)
export function parseMoeda(valorStr: string): number {
    const apenasNumeros = valorStr.replace(/\D/g, "");
    if (!apenasNumeros) return 0;
    return Number(apenasNumeros) / 100;
}
