import React, { useMemo } from 'react';
import { useStore } from '../../store';
import {
    TrendingUp, ShoppingBag, DollarSign, AlertCircle, Trash2, RotateCcw, Gift, BarChart3, Info, Calendar, ArrowUpRight
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

export const ConsignmentDashboard: React.FC = () => {
    const { consignmentOrders } = useStore();

    // 1. Filter settled orders for performance analytics
    const settledOrders = useMemo(() => {
        return consignmentOrders.filter(o => o.status === 'settled');
    }, [consignmentOrders]);

    // 2. Compute aggregate metrics
    const stats = useMemo(() => {
        let totalSentAll = 0;
        let totalSentSettled = 0;
        let totalSold = 0;
        let totalWaste = 0;
        let totalReturned = 0;
        let totalGiveaway = 0;
        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;

        consignmentOrders.forEach(o => {
            totalSentAll += o.totalQuantitySent;
        });

        settledOrders.forEach(o => {
            totalSentSettled += o.totalQuantitySent || 0;
            totalSold += o.totalQuantitySold || 0;
            totalWaste += o.totalQuantityWaste || 0;
            totalReturned += o.totalQuantityReturned || 0;
            totalGiveaway += o.totalQuantityGiveaway || 0;
            totalRevenue += o.totalRevenue || 0;
            totalCost += o.totalCost || 0;
            totalProfit += o.totalProfit || 0;
        });

        const sellThroughRate = totalSentSettled > 0 ? (totalSold / totalSentSettled) * 100 : 0;
        const wasteRate = totalSentSettled > 0 ? (totalWaste / totalSentSettled) * 100 : 0;
        const returnRate = totalSentSettled > 0 ? (totalReturned / totalSentSettled) * 100 : 0;
        const giveawayRate = totalSentSettled > 0 ? (totalGiveaway / totalSentSettled) * 100 : 0;

        return {
            totalSentAll,
            totalSentSettled,
            totalSold,
            totalWaste,
            totalReturned,
            totalGiveaway,
            totalRevenue,
            totalCost,
            totalProfit,
            sellThroughRate,
            wasteRate,
            returnRate,
            giveawayRate
        };
    }, [consignmentOrders, settledOrders]);

    // 3. Prepare Chart Data: Sales and Profit by Branch
    const branchData = useMemo(() => {
        const branchMap: Record<string, { name: string; revenue: number; profit: number; soldQty: number; sentQty: number }> = {};

        settledOrders.forEach(o => {
            const key = o.shopId || o.shopName || 'unknown';
            if (!branchMap[key]) {
                branchMap[key] = { name: o.shopName || 'ไม่ระบุชื่อร้าน', revenue: 0, profit: 0, soldQty: 0, sentQty: 0 };
            }
            branchMap[key].revenue += o.totalRevenue || 0;
            branchMap[key].profit += o.totalProfit || 0;
            branchMap[key].soldQty += o.totalQuantitySold || 0;
            branchMap[key].sentQty += o.totalQuantitySent || 0;
        });

        return Object.values(branchMap).sort((a, b) => b.revenue - a.revenue);
    }, [settledOrders]);

    // 4. Prepare Chart Data: Trend by Date (Settle Date)
    const trendData = useMemo(() => {
        const trendMap: Record<string, { date: string; revenue: number; profit: number }> = {};

        // Sort settled orders by date ascending
        const sorted = [...settledOrders].sort((a, b) => (a.settleDate || '').localeCompare(b.settleDate || ''));

        sorted.forEach(o => {
            let dateStr = 'N/A';
            if (o.settleDate) {
                const parsedDate = new Date(o.settleDate);
                if (!isNaN(parsedDate.getTime())) {
                    dateStr = parsedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                }
            }
            if (!trendMap[dateStr]) {
                trendMap[dateStr] = { date: dateStr, revenue: 0, profit: 0 };
            }
            trendMap[dateStr].revenue += o.totalRevenue || 0;
            trendMap[dateStr].profit += o.totalProfit || 0;
        });

        return Object.values(trendMap);
    }, [settledOrders]);

    // 5. Prepare Chart Data: Top Products
    const productData = useMemo(() => {
        const productMap: Record<string, { name: string; soldQty: number; revenue: number }> = {};

        settledOrders.forEach(o => {
            (o.items || []).forEach(item => {
                const label = item.variantName ? `${item.productName} (${item.variantName})` : item.productName || 'สินค้า';
                if (!productMap[label]) {
                    productMap[label] = { name: label, soldQty: 0, revenue: 0 };
                }
                productMap[label].soldQty += item.quantitySold || 0;
                productMap[label].revenue += item.lineTotal || 0;
            });
        });

        return Object.values(productMap)
            .sort((a, b) => b.soldQty - a.soldQty)
            .slice(0, 5); // Top 5
    }, [settledOrders]);

    // 6. Pie Chart Data: Overall Sent Quantity Breakdown
    const pieData = useMemo(() => {
        return [
            { name: 'ขายได้', value: stats.totalSold, color: '#10B981' },      // emerald-500
            { name: 'คืนสินค้า', value: stats.totalReturned, color: '#3B82F6' },  // blue-500
            { name: 'เสียหาย/เสีย', value: stats.totalWaste, color: '#EF4444' },    // red-500
            { name: 'แจก/กินเอง', value: stats.totalGiveaway, color: '#F59E0B' }  // amber-500
        ].filter(item => item.value > 0);
    }, [stats]);

    return (
        <div className="space-y-6">
            {/* KPI Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-5 text-white shadow-xl shadow-emerald-500/10 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-emerald-400 opacity-20 group-hover:scale-110 transition-transform duration-300">
                        <DollarSign size={140} />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">รายได้ฝากขายรวม</span>
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <TrendingUp size={16} />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black">฿{stats.totalRevenue.toLocaleString()}</h2>
                        <p className="text-xs text-emerald-100 flex items-center gap-1">
                            <ArrowUpRight size={12} />
                            จากบิลที่เคลียร์ยอดแล้ว
                        </p>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-5 text-white shadow-xl shadow-amber-500/10 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-amber-400 opacity-20 group-hover:scale-110 transition-transform duration-300">
                        <ShoppingBag size={140} />
                    </div>
                    <div className="relative z-10 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-amber-100 uppercase tracking-wider">กำไรสุทธิ</span>
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <DollarSign size={16} />
                            </div>
                        </div>
                        <h2 className="text-3xl font-black">฿{stats.totalProfit.toLocaleString()}</h2>
                        <p className="text-xs text-amber-100 flex items-center gap-1">
                            <Info size={12} />
                            หลังหักต้นทุนสินค้าและของเสีย
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">ประสิทธิภาพ (Sell-Through)</span>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                {stats.sellThroughRate.toFixed(1)}%
                            </span>
                        </div>
                        <h2 className="text-3xl font-black text-stone-800">{stats.totalSold.toLocaleString()} <span className="text-sm font-normal text-stone-400">ชิ้น</span></h2>
                        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats.sellThroughRate}%` }} />
                        </div>
                        <p className="text-xs text-stone-400 flex items-center gap-1">
                            ส่งทั้งหมด {stats.totalSentSettled.toLocaleString()} ชิ้น (เคลียร์แล้ว)
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">อัตราของเสีย & สูญหาย</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${stats.wasteRate > 10 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                {stats.wasteRate.toFixed(1)}%
                            </span>
                        </div>
                        <h2 className="text-3xl font-black text-stone-800">{stats.totalWaste.toLocaleString()} <span className="text-sm font-normal text-stone-400">ชิ้น</span></h2>
                        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-red-500 h-full rounded-full" style={{ width: `${stats.wasteRate}%` }} />
                        </div>
                        <p className="text-xs text-stone-400 flex items-center gap-1">
                            คืนสินค้าดี {stats.totalReturned.toLocaleString()} ชิ้น ({stats.returnRate.toFixed(1)}%)
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            {settledOrders.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-stone-200 text-stone-400">
                    <BarChart3 className="mx-auto mb-3 opacity-40" size={48} />
                    <p className="font-bold">ยังไม่พบบิลฝากขายที่เคลียร์ยอดแล้ว</p>
                    <p className="text-xs mt-1">ข้อมูลกราฟสถิติจะแสดงขึ้นเมื่อมีบิลที่เปลี่ยนสถานะเป็น "เคลียร์ยอดแล้ว"</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 1. Revenue & Profit Trend Chart */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-stone-800 flex items-center gap-2">
                                <Calendar size={18} className="text-emerald-500" />
                                แนวโน้มรายรับ - กำไรฝากขาย
                            </h3>
                        </div>
                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip formatter={(value) => [`฿${Number(value).toLocaleString()}`, '']} />
                                    <Legend />
                                    <Area type="monotone" dataKey="revenue" name="รายรับรวม" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                                    <Area type="monotone" dataKey="profit" name="กำไรสุทธิ" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 2. Sent Qty Breakdown Pie Chart */}
                    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between">
                        <h3 className="font-bold text-stone-800 flex items-center gap-2">
                            <ShoppingBag size={18} className="text-amber-500" />
                            สัดส่วนผลลัพธ์สินค้าฝากขาย
                        </h3>
                        <div className="h-48 w-full relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value} ชิ้น`, '']} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute text-center">
                                <p className="text-xs text-stone-400 font-semibold uppercase">ส่งทั้งหมด</p>
                                <p className="text-2xl font-black text-stone-800">{stats.totalSentSettled.toLocaleString()}</p>
                                <p className="text-[10px] text-stone-400">ชิ้น (เคลียร์ยอด)</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {pieData.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-1.5 bg-stone-50 rounded-xl">
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-stone-500 font-medium truncate">{item.name}</p>
                                        <p className="font-bold text-stone-700">{item.value.toLocaleString()} ชิ้น ({((item.value / stats.totalSentSettled) * 100).toFixed(1)}%)</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. Sales by Branch Bar Chart */}
                    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-stone-800 flex items-center gap-2">
                            <BarChart3 size={18} className="text-violet-500" />
                            เปรียบเทียบยอดขายรายสาขา
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                <BarChart data={branchData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                    <XAxis type="number" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="name" type="category" stroke="#4B5563" fontSize={11} tickLine={false} width={100} />
                                    <Tooltip formatter={(value) => [`฿${Number(value).toLocaleString()}`, '']} />
                                    <Bar dataKey="revenue" name="รายรับ" fill="#8B5CF6" radius={[0, 8, 8, 0]} barSize={14} />
                                    <Bar dataKey="profit" name="กำไร" fill="#EC4899" radius={[0, 8, 8, 0]} barSize={14} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 4. Top 5 Consignment Products Bar Chart */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-stone-800 flex items-center gap-2">
                            <ShoppingBag size={18} className="text-pink-500" />
                            5 อันดับสินค้าฝากขายดีที่สุด
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                <BarChart data={productData} margin={{ top: 20, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip formatter={(value) => [`${value} ชิ้น`, '']} />
                                    <Bar dataKey="soldQty" name="จำนวนที่ขายได้" fill="#10B981" radius={[8, 8, 0, 0]} barSize={24}>
                                        {productData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#6EE7B7'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
