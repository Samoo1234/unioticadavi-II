import { ReactNode } from "react";

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    children?: ReactNode;
    rightContent?: ReactNode;
}

export default function PageHeader({ title, subtitle, children, rightContent }: PageHeaderProps) {
    return (
        <div className="border-b border-gray-800 pb-4 mb-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div>
                        <div className="text-xs text-gray-500">MÓDULO</div>
                        <div className="text-lg font-bold text-white uppercase tracking-tighter">
                            {title}
                        </div>
                        {subtitle && (
                            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                        )}
                    </div>
                    {children && (
                        <>
                            <div className="h-8 w-px bg-gray-700" />
                            {children}
                        </>
                    )}
                </div>
                {rightContent && (
                    <div className="flex items-center gap-6">
                        {rightContent}
                    </div>
                )}
            </div>
        </div>
    );
}
