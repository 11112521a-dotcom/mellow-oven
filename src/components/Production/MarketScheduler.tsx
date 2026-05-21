import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { Calendar, Plus, Trash2, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';

const DAYS_OF_WEEK = [
    'อาทิตย์ (Sunday)',
    'จันทร์ (Monday)',
    'อังคาร (Tuesday)',
    'พุธ (Wednesday)',
    'พฤหัสบดี (Thursday)',
    'ศุกร์ (Friday)',
    'เสาร์ (Saturday)'
];

export const MarketScheduler: React.FC = () => {
    const { markets, marketSchedules, addMarketSchedule, updateMarketSchedule, removeMarketSchedule } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [selectedMarketId, setSelectedMarketId] = useState('');
    const [selectedDay, setSelectedDay] = useState(0);

    const handleAdd = () => {
        if (!selectedMarketId) {
            alert('กรุณาเลือกตลาด');
            return;
        }
        
        // Check if schedule already exists
        const exists = marketSchedules.some(s => s.marketId === selectedMarketId && s.dayOfWeek === selectedDay);
        if (exists) {
            alert('ตารางนี้มีอยู่แล้ว!');
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

    const getMarketName = (id: string) => markets.find(m => m.id === id)?.name || 'ไม่ระบุ';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-200 p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                        <Calendar className="text-cafe-500" />
                        ตารางตลาด (Market Schedule)
                    </h3>
                    <p className="text-sm text-cafe-500">ตั้งค่าตารางเพื่อรับแผนการผลิตอัตโนมัติ 1-3 วันล่วงหน้า</p>
                </div>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="bg-cafe-900 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-cafe-800 transition-colors"
                    >
                        <Plus size={16} /> เพิ่มตาราง
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-cafe-50 p-4 rounded-xl border border-cafe-100 mb-6 flex flex-col md:flex-row items-end gap-4">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-semibold text-cafe-700 mb-1">เลือกตลาด</label>
                        <select 
                            value={selectedMarketId}
                            onChange={e => setSelectedMarketId(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-cafe-200 focus:ring-2 focus:ring-cafe-500 outline-none text-sm"
                        >
                            <option value="">-- เลือกตลาด --</option>
                            {markets.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-semibold text-cafe-700 mb-1">วันในสัปดาห์</label>
                        <select 
                            value={selectedDay}
                            onChange={e => setSelectedDay(Number(e.target.value))}
                            className="w-full p-2.5 rounded-lg border border-cafe-200 focus:ring-2 focus:ring-cafe-500 outline-none text-sm"
                        >
                            {DAYS_OF_WEEK.map((day, idx) => (
                                <option key={idx} value={idx}>{day}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={handleAdd}
                            className="flex-1 bg-green-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-green-600 transition-colors"
                        >
                            บันทึก
                        </button>
                        <button 
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2.5 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                        >
                            ยกเลิก
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {marketSchedules.length === 0 && !isAdding && (
                    <div className="col-span-full py-8 text-center text-gray-400">
                        <MapPin size={48} className="mx-auto mb-3 opacity-20" />
                        <p>ยังไม่มีตารางตลาด</p>
                        <p className="text-xs mt-1">เพิ่มตารางเพื่อให้ AI คำนวณแผนการผลิตล่วงหน้าอัตโนมัติ</p>
                    </div>
                )}
                {marketSchedules.map(schedule => (
                    <div key={schedule.id} className={`border rounded-xl p-4 transition-all ${schedule.isActive ? 'border-cafe-200 bg-white shadow-sm' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${schedule.isActive ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'}`}>
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">ทุกวัน</p>
                                    <p className="font-bold text-sm text-gray-800">{DAYS_OF_WEEK[schedule.dayOfWeek].split(' ')[0]}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button 
                                    onClick={() => updateMarketSchedule(schedule.id, { isActive: !schedule.isActive })}
                                    className={`p-1.5 rounded-lg transition-colors ${schedule.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}
                                    title={schedule.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                                >
                                    {schedule.isActive ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                </button>
                                <button 
                                    onClick={() => removeMarketSchedule(schedule.id)}
                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                                    title="ลบตาราง"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-cafe-400" />
                                <span className="font-semibold text-cafe-700">{getMarketName(schedule.marketId)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
