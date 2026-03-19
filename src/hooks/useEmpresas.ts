"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface EmpresaBasica {
    id: number;
    nome_fantasia: string;
    cidade?: string;
    estado?: string;
    telefone?: string;
    ativo?: boolean;
    [key: string]: any;
}

export function useEmpresas(ativasOnly = true) {
    const [empresas, setEmpresas] = useState<EmpresaBasica[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmpresas = async () => {
            setLoading(true);
            let query = supabase.from("empresas").select("*").order("cidade");

            if (ativasOnly) {
                query = query.eq("ativo", true);
            }

            const { data, error } = await query;

            if (!error && data) {
                setEmpresas(data);
            }
            setLoading(false);
        };

        fetchEmpresas();
    }, [ativasOnly]);

    return { empresas, loading };
}
