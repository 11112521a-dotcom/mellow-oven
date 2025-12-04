import React, { useState, useEffect } from 'react';
import { useStore } from '@/src/store';
import { Product, DailyProductionLog, Variant } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import { NumberInput } from '@/src/components/ui/NumberInput';
import { Calendar, Store, Save, ShoppingCart } from 'lucide-react';

export const DailySalesForm: React.FC = () => {
    const { products, addTransaction, updateJarBalance, deductStockByRecipe, markets, addDailyReport, addProductSaleLog } = useStore();

    // State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMarketId, setSelectedMarketId] = useState<string>(markets[0]?.id || '');
    const [logs, setLogs] = useState<(DailyProductionLog & { product: Product, variant?: Variant })[]>([]);

    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Initialize logs
    useEffect(() => {
        if (products.length > 0 && logs.length === 0) {
            const initialLogs: (DailyProductionLog & { product: Product, variant?: Variant })[] = [];
            products.forEach(p => {
                if (p.variants && p.variants.length > 0) {
                    p.variants.forEach(v => {
                        initialLogs.push({
                            date,
                            productId: p.id,
                            variantId: v.id,
                            product: p,
                            variant: v,
                            preparedQty: 0,
                            soldQty: 0,
                            wasteQty: 0,
                            leftoverQty: 0,
                            sellOutTime: '',
                            missedOppQty: 0,
                            wasteReason: ''
                        });
                    });
                } else {
                    initialLogs.push({
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
                    });
                }
            });
            setLogs(initialLogs);
        }
    }, [products]);

    // Handle changes
    const handleLogChange = (index: number, field: keyof DailyProductionLog, value: any) => {
        const newLogs = [...logs];
        const log = newLogs[index];
        (log as any)[field] = value;

        // Auto-calculate Sold = Prepared - Waste - Leftover
        if (['preparedQty', 'wasteQty', 'leftoverQty'].includes(field)) {
            const prepared = Number(log.preparedQty) || 0;
            const waste = Number(log.wasteQty) || 0;
            const leftover = Number(log.leftoverQty) || 0;
            log.soldQty = Math.max(0, prepared - waste - leftover);
        }

        setLogs(newLogs);
    };

    // Calculations
    const totalRevenue = logs.reduce((sum, log) => sum + (log.soldQty * (log.variant ? log.variant.price : log.product.price)), 0);
    const totalSoldItems = logs.reduce((sum, log) => sum + log.soldQty, 0);
    const totalCOGS = logs.reduce((sum, log) => sum + (log.soldQty * (log.variant ? log.variant.cost : log.product.cost)), 0);
    const totalWasteCost = logs.reduce((sum, log) => sum + (log.wasteQty * (log.variant ? log.variant.cost : log.product.cost)), 0);
    const trueProfit = totalRevenue - totalCOGS - totalWasteCost;

    const handleSaveClick = () => {
        if (totalSoldItems === 0) {
            if (confirm('ยอดขายเป็น 0 ต้องการบันทึกหรือไม่?')) {
                setShowConfirmModal(true);
            }
        } else {
            setShowConfirmModal(true);
        }
    };

    const confirmSave = async () => {
        const marketName = markets.find(m => m.id === selectedMarketId)?.name || 'Unknown Market';

        // Add COGS to Working Capital
        updateJarBalance('Working', totalCOGS);

        // Add Gross Profit to Unallocated
        const { addUnallocatedProfit } = useStore.getState();
        await addUnallocatedProfit({
            id: crypto.randomUUID(),
            date: date,
            amount: trueProfit,
            source: `${marketName} (${totalSoldItems} items)`,
            createdAt: new Date().toISOString()
        });

        // Record Transactions
        addTransaction({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: totalCOGS,
            type: 'INCOME',
            toJar: 'Working',
            description: `💰 COGS @ ${marketName}`,
            category: 'Sales:COGS'
        });

        addTransaction({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: trueProfit,
            type: 'INCOME',
            description: `📊 Profit @ ${marketName}`,
            category: 'Sales:Profit'
        });

        // Record Product Sales Logs
        for (const log of logs) {
            if (log.soldQty > 0) {
                const price = log.variant ? log.variant.price : log.product.price;
                const cost = log.variant ? log.variant.cost : log.product.cost;
                const itemRevenue = log.soldQty * price;
                const itemCost = log.soldQty * cost;

                await addProductSaleLog({
                    id: crypto.randomUUID(),
                    recordedAt: new Date().toISOString(),
                    saleDate: date,
                    marketId: selectedMarketId,
                    marketName: marketName,
                    productId: log.productId,
                    productName: log.product.name,
                    category: log.product.category,
                    quantitySold: log.soldQty,
                    pricePerUnit: price,
                    totalRevenue: itemRevenue,
                    costPerUnit: cost,
                    totalCost: itemCost,
                    grossProfit: itemRevenue - itemCost,
                    variantId: log.variantId,
                    variantName: log.variant?.name
                });
            }
        }

        // Auto-Deduct Stock
        for (const log of logs) {
            if (log.soldQty > 0) await deductStockByRecipe(log.productId, log.soldQty, log.variantId);
            if (log.wasteQty > 0) await deductStockByRecipe(log.productId, log.wasteQty, log.variantId);
        }

        // Save Daily Report
        addDailyReport({
            id: crypto.randomUUID(),
            date,
            marketId: selectedMarketId,
            marketContext: {
                date,
                marketName,
                weather: 'Sunny'
            },
            startCashFloat: 1000,
            revenue: totalRevenue,
            cogsSold: totalCOGS,
            wasteCost: totalWasteCost,
            opexToday: 0,
            netProfit: trueProfit,
            allocations: { Working: 0, CapEx: 0, Opex: 0, Emergency: 0, Owner: 0 },
            billsCount: 0,
            aov: 0,
            sellThroughRate: (totalSoldItems / (totalSoldItems + logs.reduce((s, l) => s + l.wasteQty + l.leftoverQty, 0))) * 100,
            logs
        });

        setShowConfirmModal(false);
        alert(`✅ บันทึกสำเร็จ!\n\n💰 รายได้: ${formatCurrency(totalRevenue)}\n✅ ขายได้: ${totalSoldItems} ชิ้น\n💚 กำไร: ${formatCurrency(trueProfit)}`);

        // Reset form
        setLogs(products.map(p => ({
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
        })));
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header - Simplified */}
            <div className="bg-gradient-to-r from-cafe-800 to-cafe-900 p-6 rounded-2xl shadow-lg text-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-cafe-200 mb-2 flex items-center gap-2">
                            <Store size={16} />
                            ตลาด/สาขา
                        </label>
                        <select
                            value={selectedMarketId}
                            onChange={e => setSelectedMarketId(e.target.value)}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-white/50 outline-none backdrop-blur-sm"
                        >
                            {markets.map(m => (
                                <option key={m.id} value={m.id} className="text-cafe-900">{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cafe-200 mb-2 flex items-center gap-2">
                            <Calendar size={16} />
                            วันที่
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-white/50 outline-none backdrop-blur-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Product Table - Simplified */}
            <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden">
                <div className="p-5 bg-gradient-to-r from-cafe-50 to-white border-b border-cafe-100">
                    <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                        <ShoppingCart size={20} />
                        บันทึกยอดขายรายสินค้า
                    </h3>
                    <p className="text-sm text-cafe-500 mt-1">กรอกจำนวนที่เตรียมมา และของเสีย ระบบจะคำนวณยอดขายให้อัตโนมัติ</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-cafe-50 text-cafe-600 text-sm">
                            <tr>
                                <th className="px-6 py-4 text-left font-semibold">สินค้า</th>
                                <th className="px-4 py-4 text-center font-semibold w-32">เตรียมมา</th>
                                <th className="px-4 py-4 text-center font-semibold w-32">ของเสีย</th>
                                <th className="px-4 py-4 text-center font-semibold w-32">เหลือ</th>
                                <th className="px-6 py-4 text-center font-semibold w-40 bg-green-50">ขายได้</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cafe-100">
                            {logs.map((log, index) => (
                                <tr key={log.productId} className="hover:bg-cafe-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-cafe-900">{log.product.name}</div>
                                        <div className="text-xs text-cafe-500">
                                            {log.variant ? (
                                                <span className="text-blue-600 font-bold">{log.variant.name}</span>
                                            ) : (
                                                log.product.flavor
                                            )}
                                            {' · '}
                                            {formatCurrency(log.variant ? log.variant.price : log.product.price)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <NumberInput
                                            value={log.preparedQty || 0}
                                            onChange={val => handleLogChange(index, 'preparedQty', val)}
                                            className="w-full p-2.5 text-center bg-blue-50 text-blue-900 font-semibold rounded-lg border-2 border-blue-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <NumberInput
                                            value={log.wasteQty || 0}
                                            onChange={val => handleLogChange(index, 'wasteQty', val)}
                                            className="w-full p-2.5 text-center bg-red-50 text-red-900 font-semibold rounded-lg border-2 border-red-200 focus:ring-2 focus:ring-red-400 focus:border-transparent"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <NumberInput
                                            value={log.leftoverQty || 0}
                                            onChange={val => handleLogChange(index, 'leftoverQty', val)}
                                            className="w-full p-2.5 text-center bg-orange-50 text-orange-900 font-semibold rounded-lg border-2 border-orange-200 focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-6 py-3 bg-green-50/50">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">{log.soldQty}</div>
                                            <div className="text-xs text-cafe-500 mt-1">
                                                {formatCurrency(log.soldQty * log.product.price)}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-cafe-900 text-white font-bold">
                            <tr>
                                <td className="px-6 py-4">รวมทั้งหมด</td>
                                <td className="px-4 py-4 text-center text-lg">
                                    {logs.reduce((a, b) => a + (b.preparedQty || 0), 0)}
                                </td>
                                <td className="px-4 py-4 text-center text-lg text-red-300">
                                    {logs.reduce((a, b) => a + (b.wasteQty || 0), 0)}
                                </td>
                                <td className="px-4 py-4 text-center text-lg text-orange-300">
                                    {logs.reduce((a, b) => a + (b.leftoverQty || 0), 0)}
                                </td>
                                <td className="px-6 py-4 text-center text-2xl text-green-300">
                                    {totalSoldItems}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Footer - Simplified */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200 shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1 text-center md:text-left">
                        <p className="text-sm text-cafe-600 mb-1">ยอดขายรวม</p>
                        <h2 className="text-4xl font-bold text-cafe-900">{formatCurrency(totalRevenue)}</h2>
                        <div className="flex gap-4 mt-3 text-sm">
                            <span className="text-green-700">
                                <span className="font-semibold">กำไร:</span> {formatCurrency(trueProfit)}
                            </span>
                            <span className="text-cafe-600">
                                <span className="font-semibold">ขาย:</span> {totalSoldItems} ชิ้น
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveClick}
                        className="bg-gradient-to-r from-cafe-800 to-cafe-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-cafe-900 hover:to-black shadow-xl flex items-center gap-3 transition-all active:scale-95"
                    >
                        <Save size={24} />
                        บันทึกยอดขาย
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Save size={32} className="text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-cafe-900 mb-2">ยืนยันการบันทึก?</h3>
                            <p className="text-cafe-500 mb-6">กรุณาตรวจสอบความถูกต้องก่อนบันทึก</p>

                            <div className="bg-cafe-50 rounded-xl p-4 space-y-3 mb-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-cafe-600">💰 รายได้รวม</span>
                                    <span className="font-bold text-lg text-cafe-900">{formatCurrency(totalRevenue)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-cafe-600">📦 จำนวนที่ขาย</span>
                                    <span className="font-bold text-lg text-cafe-900">{totalSoldItems} ชิ้น</span>
                                </div>
                                <div className="pt-3 border-t border-cafe-200 flex justify-between items-center">
                                    <span className="text-green-600 font-semibold">💚 กำไรโดยประมาณ</span>
                                    <span className="font-bold text-xl text-green-600">{formatCurrency(trueProfit)}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-3 rounded-xl font-semibold text-cafe-600 hover:bg-cafe-50 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={confirmSave}
                                    className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 transition-all active:scale-95"
                                >
                                    ยืนยันบันทึก
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
