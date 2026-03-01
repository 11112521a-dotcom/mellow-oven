import React from 'react';
import { formatCurrency } from '@/src/lib/utils';

interface DayOfWeekData {
    day: string;
    dayIndex: number;
    revenue: number;
    profit: number;
    quantity: number;
}

interface DayOfWeekChartProps {
    data: DayOfWeekData[];
    mode?: 'revenue' | 'profit' | 'quantity';
}

const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const dayColors = [
    'from-red-400 to-red-500',      // Sunday
    'from-yellow-400 to-amber-500', // Monday
    'from-pink-400 to-pink-500',    // Tuesday
    'from-green-400 to-green-500',  // Wednesday
    'from-orange-400 to-orange-500',// Thursday
    'from-blue-400 to-blue-500',    // Friday
    'from-purple-400 to-purple-500' // Saturday
];

export const DayOfWeekChart: React.FC<DayOfWeekChartProps> = ({ data, mode = 'revenue' }) => {
    const getValue = (item: DayOfWeekData) => {
        switch (mode) {
            case 'quantity': return item.quantity;
            case 'profit': return item.profit;
            default: return item.revenue;
        }
    };

    const maxValue = Math.max(...data.map(getValue), 1);

    // Sort by dayIndex to ensure correct order
    const sortedData = [...data].sort((a, b) => a.dayIndex - b.dayIndex);

    // Find best and worst days
    const bestDay = sortedData.reduce((best, item) => getValue(item) > getValue(best) ? item : best, sortedData[0]);
    const worstDay = sortedData.reduce((worst, item) => getValue(item) < getValue(worst) ? item : worst, sortedData[0]);

    return (
        <div className="space-y-6 bg-white rounded-3xl shadow-sm border border-cafe-100 p-6 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-cafe-800 flex items-center gap-2">
                    <span className="bg-cafe-100 p-2 rounded-xl">📅</span> ยอดขายแยกตามวัน
                </h3>
                <div className="flex gap-2 text-xs">
                    <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-100 flex items-center gap-1 shadow-sm">
                        <span>🏆</span> <span className="font-semibold">{bestDay?.day}</span> ขายดีสุด
                    </span>
                    <span className="bg-red-50 text-red-700 px-3 py-1.5 rounded-full border border-red-100 flex items-center gap-1 shadow-sm">
                        <span>📉</span> <span className="font-semibold">{worstDay?.day}</span> ขายน้อยสุด
                    </span>
                </div>
            </div>

            <div className="flex items-end justify-between gap-3 flex-1 px-2 mt-4">
                {dayNames.map((dayName, index) => {
                    const dayData = sortedData.find(d => d.dayIndex === index);
                    const value = dayData ? getValue(dayData) : 0;
                    const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    const isBest = dayData === bestDay && value > 0;
                    const isWorst = dayData === worstDay && value > 0 && sortedData.length > 1;

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                            {/* Value Label */}
                            <div className="text-xs font-semibold text-cafe-500 h-6 flex items-end">
                                {mode === 'quantity'
                                    ? (value > 0 ? value : '-')
                                    : (value > 0 ? `฿${(value / 1000).toFixed(1)}k` : '-')
                                }
                            </div>

                            {/* Bar Container */}
                            <div className="w-full h-40 flex items-end justify-center relative group cursor-pointer">
                                {/* Invisible hover target area for easier tooltip triggering */}
                                <div className="absolute inset-0 z-20"></div>

                                <div
                                    className={`w-full max-w-[40px] rounded-t-xl bg-gradient-to-t ${dayColors[index]} transition-all duration-700 delay-[${index * 50}ms] shadow-sm relative z-10 
                                    ${isBest ? 'ring-2 ring-yellow-400 ring-offset-2 shadow-yellow-200/50 shadow-lg' : ''} 
                                    ${isWorst ? 'opacity-50 saturate-50' : 'group-hover:opacity-90 group-hover:-translate-y-1'}`}
                                    style={{ height: `${Math.max(height, 8)}%` }}
                                >
                                    {isBest && (
                                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xl drop-shadow-md animate-bounce">
                                            ⭐
                                        </div>
                                    )}
                                </div>

                                {/* Premium Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-30 pointer-events-none transition-all duration-200">
                                    <div className="bg-white text-cafe-800 text-xs rounded-xl px-4 py-3 shadow-xl border border-cafe-100 whitespace-nowrap min-w-[140px]">
                                        <div className="font-bold text-base mb-2 pb-2 border-b border-cafe-100 flex items-center justify-between">
                                            {dayData?.day || dayName}
                                            <span className={`w-3 h-3 rounded-full bg-gradient-to-tr ${dayColors[index]}`}></span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between gap-4">
                                                <span className="text-cafe-500">รายรับ:</span>
                                                <span className="font-semibold text-blue-600">{formatCurrency(dayData?.revenue || 0)}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-cafe-500">กำไร:</span>
                                                <span className="font-semibold text-green-600">{formatCurrency(dayData?.profit || 0)}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-cafe-500">จำนวน:</span>
                                                <span className="font-semibold text-purple-600">{(dayData?.quantity || 0).toLocaleString()} ชิ้น</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Tooltip Arrow pointing down */}
                                    <div className="w-3 h-3 bg-white border-b border-r border-cafe-100 transform rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2"></div>
                                </div>
                            </div>

                            {/* Day Label */}
                            <div className={`text-sm font-bold mt-1 px-2 py-1 rounded-lg w-full text-center
                                ${isBest ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                                    isWorst ? 'text-cafe-400' :
                                        'text-cafe-600 bg-cafe-50/50 border border-transparent group-hover:bg-cafe-50 group-hover:border-cafe-100 transition-colors'}`}>
                                {dayName}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary Insight */}
            <div className="bg-cafe-50 rounded-xl p-3 mt-4 text-xs text-cafe-600 flex items-center gap-2 border border-cafe-100">
                <span className="text-lg">💡</span>
                <span><strong>Insight:</strong> วัน<span className="font-bold text-cafe-800">{bestDay?.day}</span>ควรเตรียมวัตถุดิบและพนักงานให้พร้อมมากกว่าปกติ เพื่อรองรับยอดขายสูงสุด</span>
            </div>
        </div>
    );
};
