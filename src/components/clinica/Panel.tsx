interface PanelProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    className?: string;
}

export default function Panel({ children, title, subtitle, className = "" }: PanelProps) {
    return (
        <div className={`bg-gray-900 border border-gray-800 flex flex-col ${className}`}>
            {(title || subtitle) && (
                <div className="border-b border-gray-800 px-4 py-3">
                    {title && (
                        <h2 className="text-sm font-bold text-white tracking-wide">{title}</h2>
                    )}
                    {subtitle && (
                        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                    )}
                </div>
            )}
            <div className="flex-1 overflow-auto">
                {children}
            </div>
        </div>
    );
}
