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
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                    📅 ยอดขายแยกตามวัน
                </h3>
                <div className="flex gap-2 text-xs">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        🏆 {bestDay?.day} ขายดีสุด
                    </span>
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        📉 {worstDay?.day} ขายน้อยสุด
                    </span>
                </div>
            </div>

            <div className="flex items-end justify-between gap-2 h-48 px-2">
                {dayNames.map((dayName, index) => {
                    const dayData = sortedData.find(d => d.dayIndex === index);
                    const value = dayData ? getValue(dayData) : 0;
                    const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    const isBest = dayData === bestDay && value > 0;
                    const isWorst = dayData === worstDay && value > 0 && sortedData.length > 1;

                    return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                            {/* Value Label */}
                            <div className="text-xs font-medium text-cafe-600 h-8 flex items-end">
                                {mode === 'quantity'
                                    ? (value > 0 ? value : '-')
                                    : (value > 0 ? `฿${(value / 1000).toFixed(1)}k` : '-')
                                }
                            </div>

                            {/* Bar */}
                            <div className="w-full h-32 flex items-end justify-center">
                                <div
                                    className={`w-8 rounded-t-lg bg-gradient-to-t ${dayColors[index]} transition-all duration-500 hover:scale-105 relative group ${isBest ? 'ring-2 ring-yellow-400 ring-offset-1' : ''} ${isWorst ? 'opacity-60' : ''}`}
                                    style={{ height: `${Math.max(height, 4)}%` }}
                                >
                                    {isBest && (
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-500">
                                            ⭐
                                        </div>
                                    )}

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                        <div className="bg-cafe-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                            <div className="font-bold">{dayData?.day || dayName}</div>
                                            <div>รายรับ: {formatCurrency(dayData?.revenue || 0)}</div>
                                            <div>กำไร: {formatCurrency(dayData?.profit || 0)}</div>
                                            <div>จำนวน: {dayData?.quantity || 0} ชิ้น</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Day Label */}
                            <div className={`text-sm font-bold ${isBest ? 'text-yellow-600' : isWorst ? 'text-red-400' : 'text-cafe-700'}`}>
                                {dayName}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="flex justify-center gap-4 text-xs text-cafe-500 pt-2 border-t border-cafe-100">
                <span>💡 <strong>Insight:</strong> วัน{bestDay?.day}ควรเตรียมของเยอะกว่าปกติ</span>
            </div>
        </div>
    );
};
