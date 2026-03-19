interface LoadingOverlayProps {
    message?: string;
}

export default function LoadingOverlay({ message = "CARREGANDO DADOS..." }: LoadingOverlayProps) {
    return (
        <div className="absolute inset-0 flex items-center justify-center z-50">
            <div className="bg-gray-900/80 px-6 py-3 border border-gray-700 rounded shadow-xl">
                <div className="text-sm font-bold text-white flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-green-500 border-t-transparent animate-spin rounded-full" />
                    {message}
                </div>
            </div>
        </div>
    );
}
