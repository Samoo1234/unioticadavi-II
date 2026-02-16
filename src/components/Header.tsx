"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
    onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
    const { profile, roleName } = useAuth();
    const [dataHora, setDataHora] = useState("");

    useEffect(() => {
        const atualizarHora = () => {
            const agora = new Date();
            const opcoes: Intl.DateTimeFormatOptions = {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            };
            setDataHora(agora.toLocaleString("pt-BR", opcoes).toUpperCase());
        };

        atualizarHora();
        const intervalo = setInterval(atualizarHora, 1000);

        return () => clearInterval(intervalo);
    }, []);

    return (
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuToggle}
                    className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                    aria-label="Menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <span className="text-base lg:text-lg font-bold tracking-wider text-white truncate max-w-[120px] lg:max-w-none">
                    ÓTICA DAVI
                </span>
            </div>

            <div className="flex items-center gap-4 lg:gap-8">
                <span className="hidden sm:block text-[10px] lg:text-sm font-mono text-gray-400">{dataHora}</span>
                <div className="flex items-center gap-2 border-l border-gray-800 pl-4 lg:pl-8">
                    <div className="hidden xs:flex flex-col items-end">
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{roleName || 'OPERADOR'}</span>
                        <span className="text-xs font-bold text-white uppercase line-clamp-1">{profile?.full_name?.split(' ')[0] || 'ADMIN'}</span>
                    </div>
                    <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg shadow-emerald-900/20">
                        {profile?.full_name?.substring(0, 1).toUpperCase() || 'A'}
                    </div>
                </div>
            </div>
        </header>
    );
}
