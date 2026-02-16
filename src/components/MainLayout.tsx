import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { loading, user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-950">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!user) {
        return null; // The AuthProvider handles redirection
    }

    return (
        <div className="h-screen flex flex-col bg-gray-950">
            <Header onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} />
            <div className="flex-1 flex overflow-hidden relative">
                {/* Mobile Backdrop */}
                {isSidebarOpen && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                <main className="flex-1 overflow-auto p-4 lg:p-6 bg-gray-950">
                    {children}
                </main>
            </div>
        </div>
    );
}
