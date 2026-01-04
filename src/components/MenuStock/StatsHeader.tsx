import React from 'react';
import { Calendar, ShoppingBasket, ChefHat, Truck } from 'lucide-react';

interface StatsHeaderProps {
    date: string;
    onDateChange: (date: string) => void;
    stats: {
        totalStock: number;
        needProduction: number;
        sentToShop: number;
    };
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({ date, onDateChange, stats }) => {
    // Format date to Thai
    const formatThaiDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            {/* Date Picker - Center */}
            <div className="flex justify-center">
                <div className="inline-flex items-center gap-3 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg">
                    <Calendar size={20} className="text-gray-300" />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="bg-transparent border-none text-white font-medium focus:outline-none cursor-pointer"
                    />
                </div>
            </div>

            {/* Stats Cards - 3 Large Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Stock Card */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
                            <ShoppingBasket size={28} className="text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-amber-800/70 text-sm font-medium">ยอดสต็อกรวม</p>
                            <p className="text-4xl font-bold text-amber-600 mt-1">
                                {stats.totalStock.toLocaleString()}
                            </p>
                            <p className="text-amber-700/60 text-sm mt-1">ชิ้น ทั้งหมดในคลัง</p>
                        </div>
                    </div>
                </div>

                {/* Need Production Card */}
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-3xl p-6 shadow-sm border border-rose-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center">
                            <ChefHat size={28} className="text-rose-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-rose-800/70 text-sm font-medium">ต้องผลิตเพิ่ม</p>
                            <p className="text-4xl font-bold text-rose-600 mt-1">
                                {stats.needProduction.toLocaleString()}
                            </p>
                            <p className="text-rose-700/60 text-sm mt-1">ชิ้น เร่งด่วน</p>
                        </div>
                    </div>
                </div>

                {/* Sent to Shop Card */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-6 shadow-sm border border-violet-100 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center">
                            <Truck size={28} className="text-violet-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-violet-800/70 text-sm font-medium">ส่งเข้าร้านแล้ว</p>
                            <p className="text-4xl font-bold text-violet-600 mt-1">
                                {stats.sentToShop.toLocaleString()}
                            </p>
                            <p className="text-violet-700/60 text-sm mt-1">ชิ้น วันนี้</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
