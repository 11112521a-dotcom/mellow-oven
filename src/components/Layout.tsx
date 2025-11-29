import React, { useState } from 'react';
import { LayoutDashboard, Wallet, Package, ShoppingBag, Settings, Menu, TrendingUp, X } from 'lucide-react';
import { cn } from '../lib/utils';

import { useStore } from '@/src/store';

interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
    const { storeName } = useStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
        { id: 'sales', label: 'ขายหน้าร้าน (Log)', icon: ShoppingBag },
        { id: 'production', label: 'การผลิต (Smart Plan)', icon: TrendingUp },
        { id: 'inventory', label: 'สต็อก & จัดซื้อ', icon: Package },
        { id: 'financials', label: 'การเงิน (5 กระเป๋า)', icon: Wallet },
        { id: 'settings', label: 'ตั้งค่า', icon: Settings },
    ];

    const handleTabChange = (tabId: string) => {
        onTabChange(tabId);
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-cafe-50 text-cafe-900 font-sans flex">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-cafe-200 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-6 border-b border-cafe-100 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-cafe-700 flex items-center gap-2">
                            <span className="bg-cafe-600 text-white p-1 rounded">MO</span> {storeName}
                        </h1>
                        <p className="text-xs text-cafe-400 mt-1">Café Management System</p>
                    </div>
                    {/* Close Button for Mobile */}
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="md:hidden p-2 text-cafe-400 hover:text-cafe-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                activeTab === item.id
                                    ? "bg-cafe-100 text-cafe-800 font-medium shadow-sm"
                                    : "text-cafe-500 hover:bg-cafe-50 hover:text-cafe-700"
                            )}
                        >
                            <item.icon size={20} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-cafe-100">
                    <div className="bg-cafe-50 p-3 rounded-lg flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cafe-200 flex items-center justify-center text-cafe-600 font-bold">
                            O
                        </div>
                        <div>
                            <p className="text-sm font-medium text-cafe-800">Owner</p>
                            <p className="text-xs text-cafe-500">Admin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-cafe-200 z-30 px-4 py-3 flex justify-between items-center shadow-sm">
                <h1 className="text-lg font-bold text-cafe-700">{storeName}</h1>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-cafe-600 hover:bg-cafe-50 rounded-lg"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto mt-14 md:mt-0 w-full">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
