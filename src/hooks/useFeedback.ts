"use client";

import { useState, useCallback } from "react";
import { Mensagem } from "@/components/ui/FeedbackMessage";

export function useFeedback(duration = 3000) {
    const [mensagem, setMensagem] = useState<Mensagem | null>(null);

    const mostrarMensagem = useCallback((tipo: Mensagem["tipo"], texto: string) => {
        setMensagem({ tipo, texto });
        setTimeout(() => setMensagem(null), duration);
    }, [duration]);

    const sucesso = useCallback((texto: string) => mostrarMensagem("sucesso", texto), [mostrarMensagem]);
    const erro = useCallback((texto: string) => mostrarMensagem("erro", texto), [mostrarMensagem]);
    const info = useCallback((texto: string) => mostrarMensagem("info", texto), [mostrarMensagem]);

    return { mensagem, mostrarMensagem, sucesso, erro, info };
}
