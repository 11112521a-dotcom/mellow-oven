import React, { useState, useMemo } from 'react';
import { useStore } from '@/src/store';
import { 
    Calendar, Store, CheckCircle2, XCircle, Bot, Sparkles, AlertCircle, 
    ChevronLeft, ChevronRight, Info, ShieldAlert, FileText, Check 
} from 'lucide-react';
import { MarketTripLog } from '@/types';

export const AutoMarketTripLogger: React.FC = () => {
    const { 
        markets, 
        marketSchedules, 
        productSales, 
        productionForecasts, 
        marketTripLogs, 
        toggleMarketTripStatus 
    } = useStore();

    // Generate date range (from past 7 days to future 7 days)
    const dateList = useMemo(() => {
        const dates: string[] = [];
        const today = new Date();
        
        for (let i = -7; i <= 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }
        return dates;
    }, []);

    const activeMarkets = useMemo(() => {
        return markets.filter(m => m.isActive !== false && (m.type === 'market' || !m.type));
    }, [markets]);

    const activeMarketIds = useMemo(() => {
        return new Set(activeMarkets.map(m => m.id));
    }, [activeMarkets]);

    const daysName = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
                    <Bot size={220} />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <div className="flex items-center gap-2 text-amber-200 text-xs font-bold uppercase tracking-wider mb-2">
                        <Sparkles size={16} />
                        <span>AI Auto-Pilot & Market Trip Tracker</span>
                    </div>
                    <h2 className="text-2xl font-black mb-2">🚗 ระบบบันทึกการออกตลาดและตรวจจับอัตโนมัติ</h2>
                    <p className="text-amber-100 text-sm leading-relaxed">
                        ระบบจะไปสืบค้นตลาดนัดประจำวันให้อัตโนมัติ หากวันไหนคุณไม่ได้เข้ามาบันทึกยอด AI Auto-Pilot จะดึงยอดขายจากหน้าขายหน้าร้านมาลงบันทึกให้เอง หากวันไหนหยุดไม่ได้ไปตลาด สามารถกดสวิตช์ <strong className="text-white underline">"ไม่ได้ไป"</strong> เพื่อสั่งให้ AI ข้ามการคำนวณมั่วได้ทันที
                    </p>
                </div>
            </div>

            {/* List of Days & Markets */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-amber-600" />
                        <h3 className="font-bold text-stone-800 text-base">ตารางตรวจจับการออกตลาดประจำวัน</h3>
                        <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                            ย้อนหลัง 7 วัน - ล่วงหน้า 7 วัน
                        </span>
                    </div>
                </div>

                <div className="divide-y divide-stone-100">
                    {dateList.map((dateStr) => {
                        const dateObj = new Date(dateStr);
                        const dayOfWeek = dateObj.getDay();
                        const isToday = dateStr === new Date().toISOString().split('T')[0];

                        // Find market matching schedule
                        const scheduled = marketSchedules.find(s => 
                            s.dayOfWeek === dayOfWeek && 
                            s.isActive !== false && 
                            activeMarketIds.has(s.marketId)
                        );

                        const targetMarket = scheduled ? activeMarkets.find(m => m.id === scheduled.marketId) : null;

                        // Check existing trip log override
                        const tripLog = targetMarket ? marketTripLogs.find(l => l.date === dateStr && l.marketId === targetMarket.id) : null;
                        const isSkipped = tripLog?.status === 'skipped';
                        const isAutoLogged = tripLog?.status === 'auto_logged' || tripLog?.isAutoSaved;

                        // Check actual sales log on this date
                        const hasSales = targetMarket ? productSales.some(s => s.saleDate === dateStr && s.marketId === targetMarket.id) : false;

                        // Check forecast log on this date
                        const hasForecast = targetMarket ? productionForecasts.some(f => f.forecastForDate === dateStr && f.marketId === targetMarket.id) : false;

                        return (
                            <div 
                                key={dateStr}
                                className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                    isToday ? 'bg-amber-50/50' : 'hover:bg-stone-50/60'
                                }`}
                            >
                                {/* Date & Market Info */}
                                <div className="flex items-start gap-4">
                                    <div className={`text-center px-3 py-2 rounded-xl min-w-[70px] border ${
                                        isToday 
                                            ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-sm' 
                                            : 'bg-stone-100 text-stone-700 border-stone-200'
                                    }`}>
                                        <div className="text-[10px] uppercase tracking-wide opacity-80">วัน{daysName[dayOfWeek]}</div>
                                        <div className="text-lg font-black leading-tight">
                                            {dateObj.getDate()}
                                        </div>
                                        <div className="text-[10px] opacity-80">
                                            {dateObj.toLocaleDateString('th-TH', { month: 'short' })}
                                        </div>
                                    </div>

                                    <div>
                                        {targetMarket ? (
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-extrabold text-stone-800 flex items-center gap-1.5">
                                                        🏪 {targetMarket.name}
                                                    </span>
                                                    {isSkipped && (
                                                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md border border-red-200 flex items-center gap-1">
                                                            <XCircle size={12} /> ไม่ได้ไปตลาด (ข้าม AI)
                                                        </span>
                                                    )}
                                                    {!isSkipped && isAutoLogged && (
                                                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1">
                                                            <Bot size={12} /> AI บันทึกให้อัตโนมัติ
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-stone-500">
                                                    <span className="flex items-center gap-1">
                                                        {hasSales ? (
                                                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                                                <Check size={14} /> บันทึกขายหน้าร้านแล้ว
                                                            </span>
                                                        ) : (
                                                            <span className="text-stone-400">ยังไม่มีบันทึกขาย</span>
                                                        )}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1">
                                                        {hasForecast ? (
                                                            <span className="text-amber-600 font-semibold flex items-center gap-1">
                                                                <Check size={14} /> บันทึกแผนทำนายแล้ว
                                                            </span>
                                                        ) : (
                                                            <span className="text-stone-400">ยังไม่มีแผนทำนาย</span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <span className="text-stone-400 text-sm font-medium italic">
                                                    ☕ ไม่มีตารางตลาดนัดประจำวันนี้ (พักออกตลาด)
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Controls */}
                                {targetMarket && (
                                    <div className="flex items-center gap-2 self-end md:self-center">
                                        <button
                                            type="button"
                                            onClick={() => toggleMarketTripStatus(dateStr, targetMarket.id, 'visited', targetMarket.name)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                                !isSkipped
                                                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                                                    : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                                            }`}
                                        >
                                            <CheckCircle2 size={14} />
                                            🟢 ไปตลาด
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => toggleMarketTripStatus(dateStr, targetMarket.id, 'skipped', targetMarket.name)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                                                isSkipped
                                                    ? 'bg-red-500 text-white border-red-600 shadow-sm'
                                                    : 'bg-stone-100 text-stone-500 border-stone-200 hover:bg-stone-200'
                                            }`}
                                        >
                                            <XCircle size={14} />
                                            🔴 ไม่ได้ไป (ข้าม AI)
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
