import React, { useState } from 'react';
import { DailySalesForm } from '@/src/components/POS/DailySalesForm';
import { MenuManager } from '@/src/components/POS/MenuManager';
import { MarketManager } from '@/src/components/POS/MarketManager';
import { Settings, ClipboardList, Store } from 'lucide-react';

const Sales: React.FC = () => {
    const [mode, setMode] = useState<'LOG' | 'MENU' | 'MARKET'>('LOG');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-cafe-800 mb-2 flex items-center gap-2">
                        <span className="w-2 h-8 bg-cafe-600 rounded-full"></span>
                        บันทึกยอดขาย (Daily Sales Log)
                    </h2>
                    <p className="text-cafe-500">บันทึกข้อมูลการขายประจำวัน</p>
                </div>

                <div className="flex bg-white p-1 rounded-xl border border-cafe-200 shadow-sm">
                    <button
                        onClick={() => setMode('LOG')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${mode === 'LOG' ? 'bg-cafe-600 text-white shadow-sm' : 'text-cafe-500 hover:bg-cafe-50'}`}
                    >
                        <ClipboardList size={16} /> บันทึกยอด
                    </button>
                    <button
                        onClick={() => setMode('MENU')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${mode === 'MENU' ? 'bg-cafe-600 text-white shadow-sm' : 'text-cafe-500 hover:bg-cafe-50'}`}
                    >
                        <Settings size={16} /> จัดการเมนู
                    </button>
                    <button
                        onClick={() => setMode('MARKET')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${mode === 'MARKET' ? 'bg-cafe-600 text-white shadow-sm' : 'text-cafe-500 hover:bg-cafe-50'}`}
                    >
                        <Store size={16} /> จัดการตลาด
                    </button>
                </div>
            </header>

            {mode === 'LOG' && <DailySalesForm />}
            {mode === 'MENU' && <MenuManager />}
            {mode === 'MARKET' && <MarketManager />}
        </div>
    );
};

export default Sales;
