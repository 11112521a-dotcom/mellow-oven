import React, { useState, useMemo } from 'react';
import { useStore } from '@/src/store';
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

    // Enhancing schedule items with current market info
    const enrichedSchedules = useMemo(() => {
        return marketSchedules.map(schedule => {
            const market = markets.find(m => m.id === schedule.marketId);
            return {
                ...schedule,
                marketName: market?.name || 'ไม่ระบุตลาด',
                marketLocation: market?.location,
                marketColor: market?.color || '#b08968',
                isMarketActive: market ? market.isActive !== false : false,
                isConsignment: market ? market.type === 'consignment' : false
            };
        }).sort((a, b) => {
            const orderA = SORTED_DAYS.indexOf(a.dayOfWeek);
            const orderB = SORTED_DAYS.indexOf(b.dayOfWeek);
            return orderA - orderB;
        });
    }, [marketSchedules, markets]);

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

            {/* SCHEDULE CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrichedSchedules.length === 0 && !isAdding && (
                    <div className="col-span-full py-12 text-center text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                        <MapPin size={48} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold text-stone-700">ยังไม่มีตารางเปิดขายตลาดนัด</p>
                        <p className="text-xs text-stone-400 mt-1">สามารถกดเปิดตารางที่หน้า "จัดการตลาด" หรือกดปุ่มเพิ่มตารางด้านบนได้ทันที</p>
                    </div>
                )}

                {enrichedSchedules.map(schedule => {
                    const isFullyActive = schedule.isActive && schedule.isMarketActive;

                    return (
                        <div 
                            key={schedule.id} 
                            className={`border rounded-2xl p-4 transition-all duration-200 relative overflow-hidden ${
                                isFullyActive 
                                    ? 'border-stone-200 bg-white shadow-sm hover:shadow-md' 
                                    : 'border-stone-200 bg-stone-50/80 opacity-70'
                            }`}
                        >
                            {/* Color indicator line */}
                            <div 
                                className="absolute top-0 left-0 right-0 h-1" 
                                style={{ backgroundColor: isFullyActive ? schedule.marketColor : '#a8a29e' }}
                            />

                            <div className="flex justify-between items-start mb-3 pt-1">
                                <div className="flex items-center gap-2.5">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${
                                        isFullyActive ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-500'
                                    }`}>
                                        <Clock size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">ทุกวัน</p>
                                        <p className="font-extrabold text-sm text-stone-800">
                                            {DAYS_MAP[schedule.dayOfWeek]?.split(' ')[0]}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => updateMarketSchedule(schedule.id, { isActive: !schedule.isActive })}
                                        className={`p-1.5 rounded-lg transition-colors ${
                                            schedule.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-stone-400 hover:bg-stone-200'
                                        }`}
                                        title={schedule.isActive ? 'ปิดตารางนี้' : 'เปิดตารางนี้'}
                                    >
                                        {schedule.isActive ? <CheckCircle size={18} /> : <XCircle size={18} />}
                                    </button>
                                    <button 
                                        onClick={() => removeMarketSchedule(schedule.id)}
                                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-50 transition-colors"
                                        title="ลบตาราง"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="text-amber-500 shrink-0" />
                                    <div>
                                        <span className="font-bold text-sm text-stone-800 block leading-tight">{schedule.marketName}</span>
                                        {schedule.marketLocation && (
                                            <span className="text-[10px] text-stone-400 block">{schedule.marketLocation}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Status Tag */}
                                {!schedule.isMarketActive ? (
                                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                                        <AlertTriangle size={10} />
                                        ตลาดปิดอยู่
                                    </span>
                                ) : schedule.isConsignment ? (
                                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold shrink-0">
                                        ฝากขาย
                                    </span>
                                ) : (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                                        schedule.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
                                    }`}>
                                        {schedule.isActive ? 'เปิดอยู่' : 'ปิดอยู่'}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
