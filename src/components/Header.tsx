"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Header() {
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
        <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
            <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-wider text-white">
                    ÓTICA VISION
                </span>
            </div>

            <div className="flex items-center gap-8">
                <span className="text-sm font-mono text-gray-400">{dataHora}</span>
                <div className="flex items-center gap-2 border-l border-gray-800 pl-8">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{roleName || 'OPERADOR'}</span>
                        <span className="text-xs font-bold text-white uppercase">{profile?.full_name || 'ADMIN'}</span>
                    </div>
                    <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg shadow-emerald-900/20">
                        {profile?.full_name?.substring(0, 1).toUpperCase() || 'A'}
                    </div>
                </div>
            </div>
        </header>
    );
}
