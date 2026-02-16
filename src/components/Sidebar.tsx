"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface MenuItem {
    label: string;
    href: string;
    disabled?: boolean;
    module?: string;
    action?: string;
}

const menuItems: MenuItem[] = [
    { label: "DASHBOARD", href: "/dashboard" },
    { label: "AGENDAMENTO", href: "/agendamento", module: "agendamentos", action: "view" },
    { label: "PACIENTES", href: "/pacientes", module: "pacientes", action: "view" },
    { label: "CLÍNICA", href: "/clinica", module: "clinica", action: "view" },
    { label: "VENDAS", href: "/vendas", module: "vendas", action: "view" },
    { label: "FINANCEIRO", href: "/financeiro", module: "financeiro", action: "view" },
    { label: "CMV", href: "/cmv", module: "cmv", action: "view" },
    { label: "ESTOQUE", href: "/estoque", module: "estoque", action: "view" },
    { label: "EMPRESAS", href: "/empresas", module: "empresas", action: "view" },
];

const adminItems: MenuItem[] = [
    { label: "USUÁRIOS", href: "/admin/users", module: "admin", action: "manage_users" },
    { label: "CARGOS", href: "/admin/roles", module: "admin", action: "manage_users" },
    { label: "AUDITORIA", href: "/admin/audit", module: "admin", action: "view_audit" },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { hasPermission, roleName } = useAuth();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const renderLink = (item: MenuItem) => {
        const isActive = pathname === item.href;
        if (item.module && !hasPermission(item.module, item.action || 'view')) return null;

        return (
            <li key={item.href}>
                <Link
                    href={item.href}
                    className={`block px-4 py-2 text-[10px] font-black border-l-2 tracking-widest ${isActive
                        ? "border-emerald-500 bg-emerald-500/5 text-white"
                        : "border-transparent text-gray-500 hover:text-white hover:bg-gray-800"
                        }`}
                >
                    {item.label}
                </Link>
            </li>
        );
    };

    return (
        <aside className="w-48 bg-gray-950 border-r border-gray-800 flex flex-col">
            <div className="p-4 border-b border-gray-800">
                <h1 className="text-white font-black text-sm tracking-tighter italic">ÓTICA DAVI</h1>
                <p className="text-[8px] text-emerald-500 font-bold tracking-[0.2em]">{roleName?.toUpperCase() || 'USUÁRIO'}</p>
            </div>

            <nav className="flex-1 py-4 overflow-y-auto">
                <ul className="space-y-1">
                    {menuItems.map(renderLink)}
                </ul>

                {(hasPermission('admin', 'manage_users') || hasPermission('admin', 'view_audit')) && (
                    <div className="mt-8">
                        <div className="px-4 mb-2 text-[8px] font-black text-gray-600 tracking-[0.3em] uppercase">Administração</div>
                        <ul className="space-y-1">
                            {adminItems.map(renderLink)}
                        </ul>
                    </div>
                )}
            </nav>

            <div className="p-4 border-t border-gray-800 space-y-4">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-950/30 rounded transition-all group"
                >
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    SAIR DO SISTEMA
                </button>
                <div className="text-[10px] text-gray-600 uppercase tracking-widest text-center">
                    SISTEMA v1.0.0
                </div>
            </div>
        </aside>
    );
}
