"use client";

import MainLayout from "@/components/MainLayout";
import FluxoEntradasGrid from "@/components/cmv/FluxoEntradasGrid";
import PageHeader from "@/components/ui/PageHeader";

export default function FluxoEntradasPage() {
    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                <PageHeader 
                    title="FLUXO DE CAIXA (ENTRADAS E SAÍDAS)"
                    subtitle="Controle diário de movimentação financeira real."
                />
                <div className="flex-1 overflow-hidden mt-4">
                    <FluxoEntradasGrid />
                </div>
            </div>
        </MainLayout>
    );
}
