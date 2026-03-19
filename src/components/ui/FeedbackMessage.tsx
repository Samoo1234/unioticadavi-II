export interface Mensagem {
    tipo: "sucesso" | "erro" | "info";
    texto: string;
}

interface FeedbackMessageProps {
    mensagem: Mensagem | null;
}

const estilos: Record<Mensagem["tipo"], string> = {
    sucesso: "bg-green-900/50 border border-green-700 text-green-400",
    erro: "bg-red-900/50 border border-red-700 text-red-400",
    info: "bg-yellow-900/50 border border-yellow-700 text-yellow-400",
};

export default function FeedbackMessage({ mensagem }: FeedbackMessageProps) {
    if (!mensagem) return null;

    return (
        <div className={`mt-4 px-4 py-2 text-sm font-medium ${estilos[mensagem.tipo]}`}>
            {mensagem.texto}
        </div>
    );
}
