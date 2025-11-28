import React, { useState, useEffect } from 'react';
import { useStore } from '@/src/store';
import { Product, DailyProductionLog } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import { calculateForecast } from '@/src/lib/analytics';
import { NumberInput } from '@/src/components/ui/NumberInput';
import { Calendar, DollarSign, Receipt, Save, Calculator, Clock, AlertCircle, Activity, Store } from 'lucide-react';

export const DailySalesForm: React.FC = () => {
    const { products, addTransaction, updateJarBalance, deductStockByRecipe, markets, addDailyReport } = useStore();

    // Header State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMarketId, setSelectedMarketId] = useState<string>(markets[0]?.id || '');
    const [float, setFloat] = useState<number>(1000); // Default float
    const [ordersCount, setOrdersCount] = useState<number>(0);

    // Table State
    const [logs, setLogs] = useState<(DailyProductionLog & { product: Product })[]>([]);

    // Initialize logs when products change
    useEffect(() => {
        if (products.length > 0 && logs.length === 0) {
            const initialLogs = products.map(p => ({
                date,
                productId: p.id,
                product: p,
                preparedQty: 0,
                soldQty: 0,
                wasteQty: 0,
                leftoverQty: 0,
                sellOutTime: '',
                missedOppQty: 0,
                wasteReason: ''
            }));
            setLogs(initialLogs);
        }
    }, [products]);

    // Handle Input Changes
    const handleLogChange = (index: number, field: keyof DailyProductionLog, value: any) => {
        const newLogs = [...logs];
        const log = newLogs[index];

        // Update field
        (log as any)[field] = value;

        // Auto-calculate Sold
        // Sold = Prepared - Waste - Leftover
        if (['preparedQty', 'wasteQty', 'leftoverQty'].includes(field)) {
            const prepared = Number(log.preparedQty) || 0;
            const waste = Number(log.wasteQty) || 0;
            const leftover = Number(log.leftoverQty) || 0;
            log.soldQty = Math.max(0, prepared - waste - leftover);
        }

        setLogs(newLogs);
    };

    // Calculate Totals
    const totalRevenue = logs.reduce((sum, log) => sum + (log.soldQty * log.product.price), 0);
    const totalSoldItems = logs.reduce((sum, log) => sum + log.soldQty, 0);
    const totalWasteItems = logs.reduce((sum, log) => sum + log.wasteQty, 0);

    // Calculate True Profit (Revenue - COGS - WasteCost)
    const totalCOGS = logs.reduce((sum, log) => sum + (log.soldQty * log.product.cost), 0);
    const totalWasteCost = logs.reduce((sum, log) => sum + (log.wasteQty * log.product.cost), 0);
    const trueProfit = totalRevenue - totalCOGS - totalWasteCost;

    const handleSave = () => {
        if (totalSoldItems === 0 && !confirm('ยอดขายเป็น 0 ต้องการบันทึกหรือไม่?')) return;

        const marketName = markets.find(m => m.id === selectedMarketId)?.name || 'Unknown Market';

        // 1. Update Finance (Add Revenue to Working Capital)
        updateJarBalance('Working', totalRevenue);

        // 2. Record Transactions - INDIVIDUAL PRODUCT SALES
        logs.forEach(log => {
            if (log.soldQty > 0) {
                const productRevenue = log.soldQty * log.product.price;
                addTransaction({
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                    amount: productRevenue,
                    type: 'INCOME',
                    toJar: 'Working',
                    description: `${log.product.name} x${log.soldQty} @ ${marketName}`,
                    category: `Sales:${log.product.category}`
                });
            }
        });

        // 3. Record Daily Summary Transaction
        addTransaction({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: totalRevenue,
            type: 'INCOME',
            toJar: 'Working',
            description: `📊 Daily Summary (${date}) @ ${marketName} - ${totalSoldItems} items`,
            category: 'Sales:Summary'
        });

        // 4. Auto-Deduct Stock & Record Waste Cost
        logs.forEach(log => {
            if (log.soldQty > 0) {
                deductStockByRecipe(log.productId, log.soldQty);
            }
            if (log.wasteQty > 0) {
                deductStockByRecipe(log.productId, log.wasteQty);
            }
        });

        // 5. Save Daily Report
        addDailyReport({
            id: crypto.randomUUID(),
            date,
            marketId: selectedMarketId,
            marketContext: {
                date,
                marketName,
                weather: 'Sunny' // Placeholder
            },
            startCashFloat: float,
            revenue: totalRevenue,
            cogsSold: totalCOGS,
            wasteCost: totalWasteCost,
            opexToday: 0, // Placeholder
            netProfit: trueProfit,
            allocations: { Working: 0, CapEx: 0, Opex: 0, Emergency: 0, Owner: 0 }, // Placeholder
            billsCount: ordersCount,
            aov: ordersCount > 0 ? totalRevenue / ordersCount : 0,
            sellThroughRate: (totalSoldItems / (totalSoldItems + totalWasteItems + logs.reduce((s, l) => s + l.leftoverQty, 0))) * 100,
            logs
        });

        alert(`บันทึกยอดขายเรียบร้อย!\nยอดขายรวม: ${formatCurrency(totalRevenue)}\nกำไรสุทธิ (True Profit): ${formatCurrency(trueProfit)}\n(หักต้นทุนขาย ${formatCurrency(totalCOGS)} และของเสีย ${formatCurrency(totalWasteCost)})\n\n✅ บันทึก Transaction แยกแต่ละสินค้าแล้ว`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Context */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-100 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                    <label className="block text-sm font-medium text-cafe-600 mb-1 flex items-center gap-2">
                        <Store size={16} /> เลือกตลาด/สาขา
                    </label>
                    <select
                        value={selectedMarketId}
                        onChange={e => setSelectedMarketId(e.target.value)}
                        className="w-full p-3 bg-cafe-50 border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none font-medium text-cafe-900"
                    >
                        {markets.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-cafe-600 mb-1 flex items-center gap-2">
                        <DollarSign size={16} /> เงินทอนเริ่มต้น (Float)
                    </label>
                    <NumberInput
                        value={float}
                        onChange={val => setFloat(val)}
                        className="w-full p-3 bg-cafe-50 border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none font-medium text-cafe-900"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-cafe-600 mb-1 flex items-center gap-2">
                        <Receipt size={16} /> จำนวนบิล (Orders Count)
                    </label>
                    <NumberInput
                        value={ordersCount}
                        onChange={val => setOrdersCount(val)}
                        className="w-full p-3 bg-cafe-50 border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none font-medium text-cafe-900"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-cafe-600 mb-1 flex items-center gap-2">
                        <Calendar size={16} /> วันที่ปิดยอด
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full p-3 bg-cafe-50 border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none font-medium text-cafe-900"
                    />
                </div>
            </div>

            {/* Product Performance Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden">
                <div className="p-6 border-b border-cafe-100 bg-cafe-50/50">
                    <h3 className="text-lg font-bold text-cafe-800 flex items-center gap-2">
                        <Calculator size={20} /> รายละเอียดสินค้า (Product Performance)
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-cafe-50 text-cafe-500 text-xs uppercase tracking-wider">
                                <th className="p-4 font-medium">สินค้า</th>
                                <th className="p-4 font-medium text-center w-24">เตรียมมา</th>
                                <th className="p-4 font-medium text-center w-24">ของเสีย</th>
                                <th className="p-4 font-medium text-center w-24">เหลือดี</th>
                                <th className="p-4 font-medium text-center w-24 bg-green-50 text-green-700">ขายได้</th>
                                <th className="p-4 font-medium text-center w-32">เวลาหมด</th>
                                <th className="p-4 font-medium text-center w-24">พลาดขาย</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cafe-100">
                            {logs.map((log, index) => (
                                <tr key={log.productId} className="hover:bg-cafe-50/30 transition-colors group">
                                    <td className="p-4">
                                        <div className="font-medium text-cafe-800">{log.product.name}</div>
                                        <div className="text-xs text-cafe-400">{log.product.flavor}</div>
                                    </td>
                                    <td className="p-2">
                                        <NumberInput
                                            value={log.preparedQty || 0}
                                            onChange={val => handleLogChange(index, 'preparedQty', val)}
                                            className="w-full p-2 text-center bg-cafe-800 text-white rounded-lg border-none focus:ring-2 focus:ring-cafe-400 placeholder-cafe-400/50"
                                            placeholder="0"
                                        />
                                        {calculateForecast(log.productId, date, useStore.getState().dailyReports.flatMap(r => r.logs)) > 0 && (
                                            <div className="text-[10px] text-center text-cafe-400 mt-1 flex justify-center items-center gap-1">
                                                <Activity size={10} />
                                                แนะนำ: {calculateForecast(log.productId, date, useStore.getState().dailyReports.flatMap(r => r.logs))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2">
                                        <NumberInput
                                            value={log.wasteQty || 0}
                                            onChange={val => handleLogChange(index, 'wasteQty', val)}
                                            className="w-full p-2 text-center bg-red-50 text-red-600 rounded-lg border border-red-100 focus:ring-2 focus:ring-red-200"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <NumberInput
                                            value={log.leftoverQty || 0}
                                            onChange={val => handleLogChange(index, 'leftoverQty', val)}
                                            className="w-full p-2 text-center bg-cafe-800 text-white rounded-lg border-none focus:ring-2 focus:ring-cafe-400"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="p-2 bg-green-50/30">
                                        <div className="w-full p-2 text-center font-bold text-green-600 text-lg">
                                            {log.soldQty}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <div className="relative">
                                            <input
                                                type="time"
                                                value={log.sellOutTime || ''}
                                                onChange={e => handleLogChange(index, 'sellOutTime', e.target.value)}
                                                className="w-full p-2 text-center bg-cafe-800 text-white rounded-lg border-none focus:ring-2 focus:ring-cafe-400 text-xs"
                                            />
                                            {!log.sellOutTime && <Clock size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-cafe-400 pointer-events-none" />}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        <NumberInput
                                            value={log.missedOppQty || 0}
                                            onChange={val => handleLogChange(index, 'missedOppQty', val)}
                                            className="w-full p-2 text-center bg-cafe-800 text-white rounded-lg border-none focus:ring-2 focus:ring-cafe-400"
                                            placeholder="0"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-cafe-100 font-bold text-cafe-900">
                            <tr>
                                <td className="p-4 text-right">รวมทั้งหมด</td>
                                <td className="p-4 text-center">{logs.reduce((a, b) => a + (b.preparedQty || 0), 0)}</td>
                                <td className="p-4 text-center text-red-600">{totalWasteItems}</td>
                                <td className="p-4 text-center">{logs.reduce((a, b) => a + (b.leftoverQty || 0), 0)}</td>
                                <td className="p-4 text-center text-green-700 text-lg">{totalSoldItems}</td>
                                <td colSpan={2}></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Footer Action */}
            <div className="flex justify-end items-center gap-6 bg-white p-6 rounded-2xl shadow-lg border border-cafe-100 sticky bottom-6">
                <div className="text-right">
                    <p className="text-sm text-cafe-500">ยอดขายรวม (Revenue)</p>
                    <h2 className="text-3xl font-bold text-cafe-900">{formatCurrency(totalRevenue)}</h2>
                    <p className="text-xs text-green-600 mt-1">
                        กำไรสุทธิ (Est. Profit): <span className="font-bold">{formatCurrency(trueProfit)}</span>
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    className="bg-cafe-800 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-cafe-900 shadow-lg shadow-cafe-200 flex items-center gap-2 transition-transform active:scale-95"
                >
                    <Save size={24} /> คำนวณและบันทึกยอด
                </button>
            </div>
        </div>
    );
};
