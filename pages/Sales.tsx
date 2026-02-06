import React, { useState } from 'react';
import { DailySalesForm } from '@/src/components/POS/DailySalesForm';
import { MenuManager2 } from '@/src/components/POS/MenuManager2';
import { MarketManager } from '@/src/components/POS/MarketManager';
import { Settings, ClipboardList, Store, ShoppingBag, Sparkles } from 'lucide-react';

const Sales: React.FC = () => {
    const [mode, setMode] = useState<'LOG' | 'MENU' | 'MARKET'>('LOG');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Warm Cafe Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-100 p-6 sm:p-8">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-200/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Title Section */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                            <ShoppingBag size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                                บันทึกยอดขาย
                                <Sparkles size={18} className="text-amber-500" />
                            </h1>
                            <p className="text-stone-500 text-sm">Daily Sales Log</p>
                        </div>
                    </div>

                    {/* Mode Switcher */}
                    <div className="flex bg-white/80 backdrop-blur-sm p-1.5 rounded-2xl border border-amber-100 shadow-sm">
                        <button
                            onClick={() => setMode('LOG')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${mode === 'LOG'
                                ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                                : 'text-stone-500 hover:bg-amber-50 hover:text-stone-700'
                                }`}
                        >
                            <ClipboardList size={16} />
                            <span className="hidden sm:inline">บันทึกยอด</span>
                        </button>
                        <button
                            onClick={() => setMode('MENU')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${mode === 'MENU'
                                ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                                : 'text-stone-500 hover:bg-amber-50 hover:text-stone-700'
                                }`}
                        >
                            <Settings size={16} />
                            <span className="hidden sm:inline">จัดการเมนู</span>
                        </button>
                        <button
                            onClick={() => setMode('MARKET')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${mode === 'MARKET'
                                ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                                : 'text-stone-500 hover:bg-amber-50 hover:text-stone-700'
                                }`}
                        >
                            <Store size={16} />
                            <span className="hidden sm:inline">จัดการตลาด</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content - Keep existing components */}
            {mode === 'LOG' && <DailySalesForm />}
            {mode === 'MENU' && <MenuManager2 />}
            {mode === 'MARKET' && <MarketManager />}
        </div>
    );
};

export default Sales;
