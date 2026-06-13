import React from 'react';
import { Package, RefreshCw, Calendar, Store } from 'lucide-react';
import { Market } from '@/types';

interface Props {
    date: string;
    onDateChange: (date: string) => void;
    onRefresh: () => void;
    stats: {
        totalStock: number;
        produced: number;
        sent: number;
        waste: number;
    };
    markets: Market[];
    selectedMarketId: string;
    onMarketChange: (id: string) => void;
}

export const MenuStockHeader: React.FC<Props> = ({ date, onDateChange, onRefresh, stats, markets, selectedMarketId, onMarketChange }) => {
    return (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cafe-800 via-cafe-700 to-cafe-900 p-6 text-white shadow-xl mb-6">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

            {/* Top Row: Title & Date */}
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center shadow-inner border border-white/10">
                        <Package size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            สต็อกเมนูรายวัน
                        </h1>
                        <p className="text-cafe-200 text-sm">Daily Stock Management System</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-lg p-1 pl-3 border border-white/10">
                        <Calendar size={16} className="text-cafe-200" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => onDateChange(e.target.value)}
                            className="bg-transparent border-none text-white font-medium focus:ring-0 text-sm py-1"
                        />
                    </div>
                    {/* Market Selector */}
                    <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-lg p-1 pl-3 border border-white/10 hidden md:flex">
                        <Store size={16} className="text-cafe-200" />
                        <select
                            value={selectedMarketId}
                            onChange={(e) => onMarketChange(e.target.value)}
                            className="bg-transparent border-none text-white font-medium focus:ring-0 text-sm py-1 cursor-pointer w-full"
                        >
                            <option value="" className="text-gray-900">-- เลือกตลาด/สาขา --</option>
                            {markets.map(m => (
                                <option key={m.id} value={m.id} className="text-gray-900">{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={onRefresh}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/10"
                        title="รีเฟรชข้อมูล"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Mobile Market Selector */}
            <div className="md:hidden mb-6 flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-lg p-2 pl-3 border border-white/10">
                <Store size={16} className="text-cafe-200" />
                <select
                    value={selectedMarketId}
                    onChange={(e) => onMarketChange(e.target.value)}
                    className="bg-transparent border-none text-white font-medium focus:ring-0 text-sm py-1 cursor-pointer w-full"
                >
                    <option value="" className="text-gray-900">-- เลือกตลาด/สาขา --</option>
                    {markets.map(m => (
                        <option key={m.id} value={m.id} className="text-gray-900">{m.name}</option>
                    ))}
                </select>
            </div>

            {/* Stats Grid */}
            <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="📦 สต็อกรวม" value={stats.totalStock} color="bg-emerald-500/20 text-emerald-100" />
                <StatCard label="🔥 ผลิตแล้ว" value={stats.produced} color="bg-blue-500/20 text-blue-100" />
                <StatCard label="🚚 ส่งแล้ว" value={stats.sent} color="bg-violet-500/20 text-violet-100" />
                <StatCard label="🗑️ ของเสีย" value={stats.waste} color="bg-red-500/20 text-red-100" />
            </div>
        </div>
    );
};

const StatCard = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className={`backdrop-blur-sm rounded-xl p-3 border border-white/5 ${color}`}>
        <p className="text-xs opacity-80 mb-1">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
    </div>
);
