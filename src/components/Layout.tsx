import React, { useState } from 'react';
import { LayoutDashboard, Wallet, Package, ShoppingBag, Menu, TrendingUp, X, LogOut, Tag, Sparkles, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '@/src/store';

export interface LayoutProps {
    children: React.ReactNode;
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
    const { storeName, user, userRole, signOut } = useStore();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
        { id: 'sales', label: 'ขายหน้าร้าน', icon: ShoppingBag },
        { id: 'salesreport', label: 'รายงานการขาย', icon: TrendingUp },
        { id: 'menustock', label: 'สต็อกเมนู', icon: Package },
        { id: 'production', label: 'การผลิต (AI)', icon: TrendingUp },
        { id: 'promotion', label: 'โปรโมชั่น', icon: Tag },
        { id: 'inventory', label: 'สต็อก & จัดซื้อ', icon: Package },
        { id: 'financials', label: 'การเงิน', icon: Wallet },
        { id: 'settings', label: 'ตั้งค่า', icon: Settings },
    ];

    const handleTabChange = (tabId: string) => {
        onTabChange(tabId);
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-[#FFFBF5] text-stone-900 font-sans flex">
            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar - Warm Cafe Style */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-amber-50/80 via-white to-orange-50/30 border-r border-amber-100/80 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shadow-xl shadow-amber-100/20",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo Header */}
                <div className="p-5 border-b border-amber-100/60 bg-gradient-to-r from-amber-50 to-orange-50/50">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                                <span className="text-white font-bold text-sm">MO</span>
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-stone-800 flex items-center gap-1.5">
                                    {storeName}
                                    <Sparkles size={14} className="text-amber-500" />
                                </h1>
                                <p className="text-xs text-amber-600/70">Café Management</p>
                            </div>
                        </div>
                        {/* Close Button for Mobile */}
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="md:hidden p-2 text-stone-400 hover:text-stone-600 hover:bg-amber-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                                activeTab === item.id
                                    ? "bg-gradient-to-r from-amber-100 to-orange-100/80 text-amber-900 font-semibold shadow-sm border-l-4 border-l-amber-500 pl-3"
                                    : "text-stone-500 hover:bg-amber-50/80 hover:text-stone-700 border-l-4 border-l-transparent"
                            )}
                        >
                            <item.icon size={20} className={activeTab === item.id ? "text-amber-600" : ""} />
                            <span className="text-sm">{item.label}</span>
                            {activeTab === item.id && (
                                <span className="ml-auto w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                            )}
                        </button>
                    ))}
                </nav>

                {/* User Section */}
                <div className="p-3 border-t border-amber-100/60">
                    <div className="bg-gradient-to-r from-stone-50 to-amber-50/50 p-3 rounded-xl flex items-center justify-between gap-2 border border-amber-100/50">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {user?.email?.[0].toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-stone-700 truncate">{user?.email?.split('@')[0]}</p>
                                <p className="text-xs text-amber-600/70 capitalize">{userRole || 'Staff'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => signOut()}
                            className="p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            title="ออกจากระบบ"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 z-50 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs">MO</span>
                    </div>
                    <h1 className="text-lg font-bold text-stone-800">{storeName}</h1>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="p-2 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto mt-14 md:mt-0 w-full bg-[#FFFBF5]">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
};
