"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerificarIndexPage() {
    const [hash, setHash] = useState("");
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleVerificar = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = hash.trim();
        if (!trimmed) {
            setError("Cole o código da receita para verificar");
            return;
        }
        router.push(`/verificar/${trimmed}`);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-900/20 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md p-8 relative z-10">
                <div className="flex flex-col items-center mb-10">
                    <div className="text-5xl mb-4">🔐</div>
                    <h1 className="text-2xl font-black text-white tracking-widest uppercase">Verificar Receita</h1>
                    <p className="text-gray-500 text-xs mt-2 uppercase tracking-[0.3em]">Autenticação Blockchain</p>
                </div>

                <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800 p-8 rounded-3xl shadow-2xl">
                    <form onSubmit={handleVerificar} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">
                                Código da Receita
                            </label>
                            <textarea
                                value={hash}
                                onChange={(e) => { setHash(e.target.value); setError(null); }}
                                className="w-full bg-gray-950 border border-gray-800 text-emerald-400 font-mono text-sm px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all placeholder-gray-700 resize-none"
                                placeholder="Cole aqui o código hash da receita..."
                                rows={3}
                                required
                            />
                            <p className="text-[10px] text-gray-600 mt-1 ml-1 uppercase tracking-wider">
                                O código está no rodapé da receita impressa ou no QR Code
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-900/30 border border-red-700/50 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Verificar Autenticidade
                        </button>
                    </form>
                </div>

                <div className="text-center mt-6">
                    <a
                        href="/login"
                        className="text-gray-600 hover:text-gray-400 text-[10px] uppercase tracking-widest font-bold transition-colors"
                    >
                        ← Voltar ao Login
                    </a>
                </div>

                <p className="text-center text-gray-600 text-[10px] mt-6 uppercase tracking-widest">
                    Sistema de Verificação Blockchain • Ótica Davi
                </p>
            </div>
        </div>
    );
}
