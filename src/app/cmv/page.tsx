"use client";

import MainLayout from "@/components/MainLayout";
import Link from "next/link";

const cmvModules = [
    { name: "FORNECEDORES", href: "/cmv/fornecedores", description: "Cadastro de fornecedores" },
    { name: "TIPOS FORNECEDORES", href: "/cmv/tipos-fornecedores", description: "Tipos de fornecedores" },
    { name: "TÍTULOS", href: "/cmv/titulos", description: "Contas a pagar/receber" },
    { name: "EXTRATO TÍTULOS", href: "/cmv/extrato-titulos", description: "Relatório de títulos" },
    { name: "CATEGORIAS", href: "/cmv/categorias", description: "Categorias de despesas" },
    { name: "DESPESAS FIXAS", href: "/cmv/despesas-fixas", description: "Despesas fixas mensais" },
    { name: "DESPESAS DIVERSAS", href: "/cmv/despesas-diversas", description: "Despesas variáveis" },
    { name: "EXTRATO DESPESAS", href: "/cmv/extrato-despesas", description: "Relatório de despesas" },
    { name: "CUSTO OS", href: "/cmv/custo-os", description: "Custos por ordem de serviço" },
    { name: "RELATÓRIO OS", href: "/cmv/relatorio-os", description: "Relatório de OS" },
];

export default function CMVPage() {
    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-800 pb-4 mb-6">
                    <div className="text-xs text-gray-500">MÓDULO</div>
                    <div className="text-lg font-bold text-white">CMV - GESTÃO DE CUSTOS</div>
                </div>

                {/* Grid de Módulos */}
                <div className="grid grid-cols-3 gap-4">
                    {cmvModules.map((module) => (
                        <Link
                            key={module.href}
                            href={module.href}
                            className="bg-gray-900 border border-gray-800 p-4 hover:border-green-500 transition-colors group"
                        >
                            <div className="text-sm font-bold text-white group-hover:text-green-500">
                                {module.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {module.description}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </MainLayout>
    );
}
