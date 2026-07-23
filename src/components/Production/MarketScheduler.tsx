import React, { useState, useMemo } from 'react';
import { useStore } from '@/src/store';
import { Market } from '@/types';
import { Calendar, Plus, Trash2, Clock, MapPin, CheckCircle, XCircle, Store, AlertTriangle } from 'lucide-react';

const DAYS_MAP: Record<number, string> = {
    1: 'จันทร์ (Monday)',
    2: 'อังคาร (Tuesday)',
    3: 'พุธ (Wednesday)',
    4: 'พฤหัสบดี (Thursday)',
    5: 'ศุกร์ (Friday)',
    6: 'เสาร์ (Saturday)',
    0: 'อาทิตย์ (Sunday)'
};

const SORTED_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon -> Sun order for Thailand

export const MarketScheduler: React.FC = () => {
    const { markets, marketSchedules, addMarketSchedule, updateMarketSchedule, removeMarketSchedule } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [selectedMarketId, setSelectedMarketId] = useState('');
    const [selectedDay, setSelectedDay] = useState(1); // Default Monday

    // Active regular markets for dropdown
    const activeRegularMarkets = useMemo(() => {
        return markets.filter(m => m.isActive !== false && (m.type === 'market' || !m.type));
    }, [markets]);

    const handleAdd = () => {
        if (!selectedMarketId) {
            alert('กรุณาเลือกตลาด');
            return;
        }
        
        // Check if schedule already exists for this market and day
        const exists = marketSchedules.some(s => s.marketId === selectedMarketId && s.dayOfWeek === selectedDay);
        if (exists) {
            alert('ตารางตลาดนี้สำหรับวันนี้มีอยู่แล้ว!');
            return;
        }

        addMarketSchedule({
            marketId: selectedMarketId,
            dayOfWeek: selectedDay,
            isActive: true
        });
        
        setIsAdding(false);
        setSelectedMarketId('');
    };

    // Group schedules by market
    const groupedMarketSchedules = useMemo(() => {
        const map = new Map<string, {
            market: Market;
            schedules: typeof marketSchedules;
            activeDaysCount: number;
        }>();

        // Include markets that have schedules
        marketSchedules.forEach(schedule => {
            const market = markets.find(m => m.id === schedule.marketId);
            if (!market) return;

            if (!map.has(market.id)) {
                map.set(market.id, {
                    market,
                    schedules: [],
                    activeDaysCount: 0
                });
            }

            const group = map.get(market.id)!;
            group.schedules.push(schedule);
            if (schedule.isActive && market.isActive !== false) {
                group.activeDaysCount += 1;
            }
        });

        // Sort schedules inside each group by day order (Mon -> Sun)
        const result = Array.from(map.values()).map(group => {
            group.schedules.sort((a, b) => SORTED_DAYS.indexOf(a.dayOfWeek) - SORTED_DAYS.indexOf(b.dayOfWeek));
            return group;
        });

        // Sort groups: Regular markets first, then consignment, then inactive
        return result.sort((a, b) => {
            const aActive = a.market.isActive !== false;
            const bActive = b.market.isActive !== false;
            if (aActive !== bActive) return aActive ? -1 : 1;

            const aIsMarket = (a.market.type === 'market' || !a.market.type);
            const bIsMarket = (b.market.type === 'market' || !b.market.type);
            if (aIsMarket !== bIsMarket) return aIsMarket ? -1 : 1;

            return a.market.name.localeCompare(b.market.name, 'th');
        });
    }, [marketSchedules, markets]);

    const SHORT_DAYS_MAP: Record<number, string> = {
        1: 'จ',
        2: 'อ',
        3: 'พ',
        4: 'พฤ',
        5: 'ศ',
        6: 'ส',
        0: 'อา'
    };

    const handleToggleDayForMarket = async (marketId: string, dayNum: number) => {
        const existing = marketSchedules.find(s => s.marketId === marketId && s.dayOfWeek === dayNum);
        if (existing) {
            await updateMarketSchedule(existing.id, { isActive: !existing.isActive });
        } else {
            await addMarketSchedule({
                marketId,
                dayOfWeek: dayNum,
                isActive: true
            });
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-200 p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                        <Calendar className="text-cafe-500" size={20} />
                        ตารางตลาด (Market Schedule)
                    </h3>
                    <p className="text-sm text-cafe-500">
                        ตั้งค่าตารางเปิดขายตลาดนัด เพื่อให้ระบบ AI วิเคราะห์และทำนายแผนการผลิตล่วงหน้าอัตโนมัติ
                    </p>
                </div>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="bg-cafe-900 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-cafe-800 transition-colors shrink-0 shadow-sm"
                    >
                        <Plus size={16} /> เพิ่มตารางตลาด
                    </button>
                )}
            </div>

            {/* ADD FORM */}
            {isAdding && (
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 mb-6 flex flex-col md:flex-row items-end gap-4 animate-in fade-in duration-200">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                            <Store size={14} className="text-amber-600" />
                            เลือกตลาดนัด <span className="text-red-500">*</span>
                        </label>
                        <select 
                            value={selectedMarketId}
                            onChange={e => setSelectedMarketId(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white font-medium"
                        >
                            <option value="">-- เลือกตลาดนัด (เฉพาะที่เปิดใช้งาน) --</option>
                            {activeRegularMarkets.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                            <Clock size={14} className="text-amber-600" />
                            วันในสัปดาห์
                        </label>
                        <select 
                            value={selectedDay}
                            onChange={e => setSelectedDay(Number(e.target.value))}
                            className="w-full p-2.5 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white font-medium"
                        >
                            {SORTED_DAYS.map(dayNum => (
                                <option key={dayNum} value={dayNum}>{DAYS_MAP[dayNum]}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={handleAdd}
                            className="flex-1 bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                        >
                            บันทึก
                        </button>
                        <button 
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2.5 rounded-lg text-sm font-bold text-stone-600 hover:bg-stone-200 transition-colors"
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            )}

            {/* GROUPED CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {groupedMarketSchedules.length === 0 && !isAdding && (
                    <div className="col-span-full py-12 text-center text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                        <MapPin size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-stone-700">ยังไม่มีตารางเปิดขายตลาดนัด</p>
                        <p className="text-xs text-stone-400 mt-1">สามารถกดเปิดตารางที่หน้า "จัดการตลาด" หรือกดปุ่มเพิ่มตารางด้านบนได้ทันที</p>
                    </div>
                )}

                {groupedMarketSchedules.map(({ market, schedules, activeDaysCount }) => {
                    const isMarketActive = market.isActive !== false;
                    const isConsignment = market.type === 'consignment';

                    return (
                        <div 
                            key={market.id} 
                            className={`border rounded-2xl p-5 transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                                isMarketActive 
                                    ? 'border-stone-200 bg-white shadow-sm hover:shadow-md' 
                                    : 'border-stone-200 bg-stone-50/80 opacity-75'
                            }`}
                        >
                            {/* Color indicator line */}
                            <div 
                                className="absolute top-0 left-0 right-0 h-1.5" 
                                style={{ backgroundColor: isMarketActive ? (market.color || '#b08968') : '#a8a29e' }}
                            />

                            <div>
                                {/* Header Info */}
                                <div className="flex justify-between items-start gap-2 mb-3 pt-1">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md shrink-0"
                                            style={{ backgroundColor: isMarketActive ? (market.color || '#b08968') : '#9ca3af' }}
                                        >
                                            {isConsignment ? '🏬' : '🏪'}
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-stone-800 text-base leading-tight">
                                                {market.name}
                                            </h4>
                                            {market.location && (
                                                <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                                                    <MapPin size={12} className="shrink-0" />
                                                    <span className="truncate">{market.location}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Type & Active Status Badges */}
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        {!isMarketActive ? (
                                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                <AlertTriangle size={10} />
                                                ตลาดปิดอยู่
                                            </span>
                                        ) : isConsignment ? (
                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full font-bold">
                                                ฝากขาย / ส่งสาขา
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">
                                                ตลาดนัด
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Active Days Count Summary */}
                                <div className="mb-4">
                                    <p className="text-xs font-semibold text-stone-500 flex items-center gap-1.5">
                                        <Clock size={14} className="text-stone-400" />
                                        เปิดขาย {activeDaysCount} วัน/สัปดาห์
                                    </p>
                                </div>
                            </div>

                            {/* Days of Week Selectable Badges */}
                            <div className="pt-3 border-t border-stone-100">
                                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-2">
                                    📅 วันเปิดขายประจำสัปดาห์
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {SORTED_DAYS.map(dayNum => {
                                        const schedule = schedules.find(s => s.dayOfWeek === dayNum);
                                        const isActiveDay = schedule ? schedule.isActive && isMarketActive : false;

                                        return (
                                            <button
                                                key={dayNum}
                                                type="button"
                                                onClick={() => handleToggleDayForMarket(market.id, dayNum)}
                                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                                                    isActiveDay
                                                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm hover:bg-emerald-600'
                                                        : schedule
                                                        ? 'bg-stone-100 text-stone-400 border-stone-200 line-through hover:bg-stone-200'
                                                        : 'bg-white text-stone-300 border-dashed border-stone-200 hover:border-emerald-300 hover:text-emerald-600'
                                                }`}
                                                title={`${DAYS_MAP[dayNum]}: ${isActiveDay ? 'เปิดขายอยู่ (คลิกเพื่อปิด)' : 'ปิดขาย (คลิกเพื่อเปิด)'}`}
                                            >
                                                <span>{SHORT_DAYS_MAP[dayNum]}</span>
                                                {isActiveDay && <CheckCircle size={10} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
