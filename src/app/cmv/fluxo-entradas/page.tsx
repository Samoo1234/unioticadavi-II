"use client";

import MainLayout from "@/components/MainLayout";
import FluxoEntradasGrid from "@/components/cmv/FluxoEntradasGrid";
import PageHeader from "@/components/ui/PageHeader";

export default function FluxoEntradasPage() {
    return (
        <MainLayout>
            <div className="h-full flex flex-col">
                <PageHeader 
                    module="CMV"
                    title="FLUXO DE CAIXA - ENTRADAS"
                    description="Controle diário de receitas e recebimentos integrado com a Stone."
                />
                <div className="flex-1 overflow-hidden mt-4">
                    <FluxoEntradasGrid />
                </div>
            </div>
        </MainLayout>
    );
}
