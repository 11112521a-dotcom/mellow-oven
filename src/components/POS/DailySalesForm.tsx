import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@/src/store';
import { Product, DailyProductionLog, Variant } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import { NumberInput } from '@/src/components/ui/NumberInput';
import { Calendar, Store, Save, ShoppingCart, Package, TrendingUp, AlertCircle, Check, X, Sparkles, ArrowRight, Sun, Cloud, CloudRain, CloudLightning, ChevronDown, ChevronUp, Wind, ThermometerSnowflake, UtensilsCrossed } from 'lucide-react';

// Weather type
type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'wind' | 'cold' | null;

// Confirmation Modal (Same pattern as Stock Log) — supports async onConfirm with loading state
const ConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    children: React.ReactNode;
}> = ({ isOpen, onClose, onConfirm, title, children }) => {
    const [isLoading, setIsLoading] = React.useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            console.error('[DailySalesForm] Save error:', error);
            alert('❌ เกิดข้อผิดพลาดในการบันทึกยอดขาย กรุณาลองใหม่อีกครั้ง\n\n' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Save size={24} />
                        {title}
                    </h2>
                </div>
                <div className="p-6">{children}</div>
                <div className="flex gap-3 p-4 bg-gray-50 border-t">
                    <button onClick={onClose} disabled={isLoading} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <X size={18} /> ยกเลิก
                    </button>
                    <button onClick={handleConfirm} disabled={isLoading} className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium transition-all hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Check size={18} />
                        )}
                        {isLoading ? 'กำลังบันทึก...' : 'ยืนยันบันทึก'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Success Modal - Beautiful card with sales breakdown
const SuccessModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    data: {
        revenue: number;
        wasteHome: number;
        wasteShop: number;
        cogsTotal: number;
        profit: number;
    } | null;
}> = ({ isOpen, onClose, data }) => {
    if (!isOpen || !data) return null;

    const formatMoney = (n: number) => `฿${n.toLocaleString()}`;
    const totalWaste = data.wasteHome + data.wasteShop;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
                    <div className="relative">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check size={32} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black">บันทึกสำเร็จ! 🎉</h2>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Revenue */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100">
                        <div className="flex justify-between items-center">
                            <span className="text-amber-700 font-medium">💰 รายได้วันนี้</span>
                            <span className="text-2xl font-black text-amber-600">{formatMoney(data.revenue)}</span>
                        </div>
                    </div>

                    {/* Waste Breakdown */}
                    {totalWaste > 0 && (
                        <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl p-4 border border-red-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-red-600 font-medium">🗑️ ของเสียวันนี้</span>
                                <span className="text-lg font-bold text-red-500">{formatMoney(totalWaste)}</span>
                            </div>
                            <div className="text-sm text-red-400 space-y-1 pl-6">
                                {data.wasteHome > 0 && <div>• เสียที่บ้าน: {formatMoney(data.wasteHome)}</div>}
                                {data.wasteShop > 0 && <div>• เสียที่ร้าน: {formatMoney(data.wasteShop)}</div>}
                            </div>
                        </div>
                    )}

                    {/* COGS + Waste */}
                    <div className="bg-gradient-to-r from-stone-50 to-slate-50 rounded-2xl p-4 border border-stone-100">
                        <div className="flex justify-between items-center">
                            <span className="text-stone-600 font-medium">📦 COGS + ของเสีย</span>
                            <span className="text-lg font-bold text-stone-700">{formatMoney(data.cogsTotal)}</span>
                        </div>
                    </div>

                    {/* Profit */}
                    <div className={`rounded-2xl p-4 border ${data.profit >= 0 ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100' : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-100'}`}>
                        <div className="flex justify-between items-center">
                            <span className={`font-medium ${data.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>✨ กำไรสุทธิ</span>
                            <span className={`text-2xl font-black ${data.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatMoney(data.profit)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t">
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-bold transition-all hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                        <Sparkles size={18} />
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

const SalesLogRow = React.memo<{
    item: DailyProductionLog & { product: Product, variant?: Variant, logIndex: number };
    handleLogChange: (index: number, field: keyof DailyProductionLog, value: number) => void;
}>(({ item, handleLogChange }) => {
    const available = item.preparedQty || 0;
    const waste = item.wasteQty || 0;
    const leftover = item.leftoverQty || 0;
    const free = item.freeQty || 0;
    const sold = item.soldQty || 0;
    const isOverflow = (waste + leftover + free) > available;

    return (
        <div
            className={`bg-white rounded-xl shadow-sm border p-3 ${isOverflow ? 'border-red-400 ring-2 ring-red-200' : 'border-cafe-100'}`}
        >
            {/* Header Row */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {item.variant && (
                        <span className="font-bold text-cafe-800 truncate">{item.variant.name}</span>
                    )}
                    {!item.variant && (
                        <span className="text-xs text-cafe-400">{item.product.category}</span>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{available}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isOverflow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{sold}</span>
                </div>
            </div>

            {/* Overflow Warning */}
            {isOverflow && (
                <div className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1 mb-2 flex items-center gap-1">
                    <AlertCircle size={12} /> ยอดรวมเกินจำนวนของ!
                </div>
            )}

            {/* Input Row */}
            <div className="flex items-center gap-2">
                {/* Waste */}
                <div className="flex items-center gap-1 bg-red-50 rounded-lg px-2 py-1.5 flex-1">
                    <span className="text-xs text-red-600">🗑️ เสีย</span>
                    <NumberInput
                        value={waste}
                        onChange={val => handleLogChange(item.logIndex, 'wasteQty', val)}
                        className="w-12 text-center text-sm font-bold bg-white border border-red-200 rounded ml-auto"
                    />
                </div>

                {/* กินแจก (Free) */}
                <div className="flex items-center gap-1 bg-violet-50 rounded-lg px-2 py-1.5 flex-1">
                    <UtensilsCrossed size={12} className="text-violet-500 shrink-0" />
                    <span className="text-xs text-violet-600">กินแจก</span>
                    <NumberInput
                        value={free}
                        onChange={val => handleLogChange(item.logIndex, 'freeQty', val)}
                        className="w-12 text-center text-sm font-bold bg-white border border-violet-200 rounded ml-auto"
                    />
                </div>

                {/* Leftover */}
                <div className="flex items-center gap-1 bg-amber-50 rounded-lg px-2 py-1.5 flex-1">
                    <span className="text-xs text-amber-600">📦 เหลือ</span>
                    <NumberInput
                        value={leftover}
                        onChange={val => handleLogChange(item.logIndex, 'leftoverQty', val)}
                        className="w-12 text-center text-sm font-bold bg-white border border-amber-200 rounded ml-auto"
                    />
                </div>
            </div>
        </div>
    );
});

const WEATHER_OPTIONS = [
    { id: 'sunny', icon: <Sun size={20} />, label: 'แดด', color: 'text-yellow-300 bg-yellow-500/30' },
    { id: 'cloudy', icon: <Cloud size={20} />, label: 'เมฆ', color: 'text-gray-300 bg-gray-500/30' },
    { id: 'rain', icon: <CloudRain size={20} />, label: 'ฝน', color: 'text-blue-300 bg-blue-500/30' },
    { id: 'storm', icon: <CloudLightning size={20} />, label: 'พายุ', color: 'text-purple-300 bg-purple-500/30' },
    { id: 'wind', icon: <Wind size={20} />, label: 'ลมแรง', color: 'text-teal-300 bg-teal-500/30' },
    { id: 'cold', icon: <ThermometerSnowflake size={20} />, label: 'หนาว', color: 'text-cyan-300 bg-cyan-500/30' },
];

export const DailySalesForm: React.FC = () => {
    const {
        products, markets, fetchData, dailyInventory, fetchDailyInventory, saveDailyMarketSales, productSales
    } = useStore();

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMarketId, setSelectedMarketId] = useState<string>(''); // Start empty - require user to select
    const [logs, setLogs] = useState<(DailyProductionLog & { product: Product, variant?: Variant })[]>([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [weather, setWeather] = useState<WeatherCondition>(null); // NEW: Weather state
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()); // NEW: For collapsible groups
    const [hasSaved, setHasSaved] = useState(false); // FIX: Track if already saved to prevent duplicate entries

    // Success Modal State
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successData, setSuccessData] = useState<{
        revenue: number;
        wasteHome: number;
        wasteShop: number;
        cogsTotal: number;
        profit: number;
    } | null>(null);

    // Fetch daily inventory on date change (to get "To Shop" values)
    useEffect(() => {
        fetchDailyInventory(date);
        setHasSaved(false); // FIX: Reset hasSaved when date changes
    }, [date, fetchDailyInventory]);

    // FIX: Reset hasSaved when market changes
    useEffect(() => {
        setHasSaved(false);
    }, [selectedMarketId]);

    // Initialize logs with "Available" from daily_inventory
    useEffect(() => {
        if (products.length > 0) {
            const initialLogs: (DailyProductionLog & { product: Product, variant?: Variant })[] = [];

            // กรองสินค้าตามสาขา/ตลาดที่เลือก (แสดงเฉพาะเมื่อเลือกตลาดแล้วเท่านั้น ป้องกันแสดงข้อมูลมั่ว)
            const filteredProducts = products.filter(p => {
                if (p.isActive === false) return false;
                if (!selectedMarketId) return false; // ไม่เลือกตลาด จะไม่แสดงสินค้าเพื่อป้อนข้อมูล
                
                // Filter by market selection (Hide if product has specific markets and selectedMarketId is not one of them)
                if (p.marketIds && p.marketIds.length > 0) {
                    if (!p.marketIds.includes(selectedMarketId)) return false;
                }
                return true;
            });

            // ตรวจสอบว่าเคยมีการบันทึกยอดขายของวันนี้และตลาดนี้แล้วหรือยัง โดยเช็กว่ามียอดบันทึกใน productSales หรือไม่
            const isSalesAlreadyLogged = productSales.some(
                s => s.saleDate === date && s.marketId === selectedMarketId
            );

            filteredProducts.forEach(p => {
                if (p.variants && p.variants.length > 0) {
                    // For products WITH variants - look up each variant separately
                    p.variants.forEach(v => {
                        // 🆕 Skip inactive variants (พักขาย)
                        if (v.isActive === false) return;

                        // Match by BOTH productId, variantId AND marketId
                        const inventoryRecord = dailyInventory.find(
                            d => d.businessDate === date &&
                                d.productId === p.id &&
                                d.variantId === v.id &&
                                (selectedMarketId ? d.marketId === selectedMarketId : !d.marketId)
                        );
                        
                        const preparedQty = inventoryRecord?.toShopQty || 0;
                        const soldQty = isSalesAlreadyLogged && inventoryRecord ? (inventoryRecord.soldQty ?? preparedQty) : preparedQty;
                        const wasteQty = isSalesAlreadyLogged && inventoryRecord ? (inventoryRecord.wasteQty ?? 0) : 0;
                        const freeQty = isSalesAlreadyLogged && inventoryRecord ? (inventoryRecord.eatQty ?? 0) : 0;
                        const leftoverQty = isSalesAlreadyLogged && inventoryRecord ? (inventoryRecord.unsoldShop ?? 0) : 0;

                        initialLogs.push({
                            date,
                            productId: p.id,
                            variantId: v.id,
                            product: p,
                            variant: v,
                            preparedQty,
                            soldQty,
                            wasteQty,
                            leftoverQty,
                            freeQty
                        });
                    });
                } else {
                    // For products WITHOUT variants - look up by productId, variantId AND marketId
                    const inventoryRecord = dailyInventory.find(
                        d => d.businessDate === date &&
                            d.productId === p.id &&
                            !d.variantId &&
                            (selectedMarketId ? d.marketId === selectedMarketId : !d.marketId)
                    );
                    
                    const preparedQty = inventoryRecord?.toShopQty || 0;
                    const soldQty = isSalesAlreadyLogged && inventoryRecord ? (inventoryRecord.soldQty ?? preparedQty) : preparedQty;
                    const wasteQty = isSalesAlreadyLogged && inventoryRecord ? (inventoryRecord.wasteQty ?? 0) : 0;
                    const freeQty = isSalesAlreadyLogged && inventoryRecord ? (inventoryRecord.eatQty ?? 0) : 0;
                    const leftoverQty = isSalesAlreadyLogged && inventoryRecord ? (inventoryRecord.unsoldShop ?? 0) : 0;

                    initialLogs.push({
                        date,
                        productId: p.id,
                        product: p,
                        preparedQty,
                        soldQty,
                        wasteQty,
                        leftoverQty,
                        freeQty
                    });
                }
            });
            setLogs(initialLogs);
        }
    }, [products, dailyInventory, date, selectedMarketId, productSales]);

    const handleLogChange = useCallback(<K extends keyof DailyProductionLog>(
        index: number,
        field: K,
        value: DailyProductionLog[K]
    ) => {
        setLogs(prevLogs => {
            const newLogs = [...prevLogs];
            const log = { ...newLogs[index], [field]: value };

            // Auto-calculate: Sold = Available - Waste - Leftover - Free(กินแจก)
            if (['wasteQty', 'leftoverQty', 'freeQty'].includes(field as string)) {
                const available = Number(log.preparedQty) || 0;
                const waste = Number(log.wasteQty) || 0;
                const leftover = Number(log.leftoverQty) || 0;
                const free = Number(log.freeQty) || 0;
                log.soldQty = Math.max(0, available - waste - leftover - free);
            }

            newLogs[index] = log;
            return newLogs;
        });
    }, []);

    // Group logs by product for grid display
    const groupedLogs = useMemo(() => {
        const groups: Map<string, {
            product: Product;
            items: (DailyProductionLog & { product: Product, variant?: Variant, logIndex: number })[];
            hasVariants: boolean;
            totalAvailable: number;
            totalSold: number;
        }> = new Map();

        logs.forEach((log, index) => {
            const productId = log.productId;
            if (!groups.has(productId)) {
                groups.set(productId, {
                    product: log.product,
                    items: [],
                    hasVariants: !!log.variant,
                    totalAvailable: 0,
                    totalSold: 0
                });
            }
            const group = groups.get(productId)!;
            group.items.push({ ...log, logIndex: index });
            group.totalAvailable += log.preparedQty || 0;
            group.totalSold += log.soldQty || 0;
        });

        return groups;
    }, [logs]);

    // Toggle group expansion
    const toggleGroup = useCallback((productId: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    }, []);

    // Calculations
    const {
        totalRevenue,
        totalSoldItems,
        totalCOGS,
        totalWasteCost,
        totalLeftover,
        totalFreeQty,
        totalFreeCost,
        trueProfit
    } = useMemo(() => {
        let revenue = 0, soldItems = 0, cogs = 0, wasteCost = 0, leftover = 0, freeQty = 0, freeCost = 0;
        logs.forEach(log => {
            const cost = log.variant ? (log.variant.cost || log.product.cost) : log.product.cost;
            const price = log.variant ? log.variant.price : log.product.price;
            
            revenue += log.soldQty * price;
            soldItems += log.soldQty;
            cogs += log.soldQty * cost;
            wasteCost += log.wasteQty * cost;
            leftover += (log.leftoverQty || 0);
            freeQty += (log.freeQty || 0);
            freeCost += (log.freeQty || 0) * cost;
        });
        return {
            totalRevenue: revenue,
            totalSoldItems: soldItems,
            totalCOGS: cogs,
            totalWasteCost: wasteCost,
            totalLeftover: leftover,
            totalFreeQty: freeQty,
            totalFreeCost: freeCost,
            trueProfit: revenue - cogs - wasteCost - freeCost
        };
    }, [logs]);

    // Get current market name for UI
    const marketName = useMemo(() => {
        return markets.find(m => m.id === selectedMarketId)?.name || 'Unknown Market';
    }, [markets, selectedMarketId]);


    const handleSaveClick = () => {
        // Validate market selection
        if (!selectedMarketId) {
            alert('⚠️ กรุณาเลือกตลาดก่อนบันทึกยอดขาย!');
            return;
        }
        // FIX: Warn if already saved to prevent duplicate entries
        if (hasSaved) {
            const confirmAgain = window.confirm(
                '⚠️ คุณบันทึกยอดขายสำหรับวันนี้ไปแล้ว!\n\n' +
                'การบันทึกซ้ำอาจทำให้ข้อมูลซ้ำซ้อน\n' +
                'ต้องการบันทึกอีกครั้งหรือไม่?'
            );
            if (!confirmAgain) return;
        }
        setShowConfirmModal(true);
    };

    const confirmSave = async () => {
        const logsToSave = logs
            .filter(log => log.preparedQty > 0 || log.soldQty > 0 || log.wasteQty > 0 || log.freeQty > 0 || log.leftoverQty > 0)
            .map(log => ({
                productId: log.productId,
                variantId: log.variantId,
                preparedQty: log.preparedQty,
                soldQty: log.soldQty,
                wasteQty: log.wasteQty || 0,
                freeQty: log.freeQty || 0,
                pricePerUnit: log.variant ? log.variant.price : log.product.price,
                costPerUnit: log.variant ? (log.variant.cost || log.product.cost) : log.product.cost,
                productName: log.product.name,
                category: log.product.category,
                variantName: log.variant?.name
            }));

        // บันทึกผ่าน action ใน store (ซึ่งลบตัวเก่า ป้องกันยอดเบิ้ล และตัดสต็อกแบบ delta)
        await saveDailyMarketSales({
            date,
            marketId: selectedMarketId,
            marketName,
            weatherCondition: weather,
            logs: logsToSave,
            totalRevenue,
            totalCOGS,
            totalWasteCost,
            trueProfit
        });

        // Reset logs
        setLogs(logs.map(log => ({
            ...log,
            preparedQty: 0,
            soldQty: 0,
            wasteQty: 0,
            leftoverQty: 0,
            freeQty: 0
        })));

        // FIX: Mark as saved to prevent duplicate entries
        setHasSaved(true);

        // Calculate waste at home from daily_inventory (wastageQty logged in MenuStockPlanner)
        const wasteHomeTotal = logs.reduce((sum, log) => {
            const invRecord = dailyInventory.find(d =>
                d.businessDate === date &&
                d.productId === log.productId &&
                (d.variantId || '') === (log.variantId || '') &&
                !d.marketId // ของที่บ้านคือ marketId เป็น null
            );
            if (invRecord?.wasteQty) {
                const unitCost = log.variant ? (log.variant.cost || log.product.cost) : log.product.cost;
                return sum + (invRecord.wasteQty * unitCost);
            }
            return sum;
        }, 0);

        // Show success modal with breakdown
        setSuccessData({
            revenue: totalRevenue,
            wasteHome: wasteHomeTotal,
            wasteShop: totalWasteCost, // Waste entered in this form
            cogsTotal: totalCOGS + totalWasteCost + wasteHomeTotal,
            profit: trueProfit - wasteHomeTotal // Deduct wasteHome too
        });
        setShowSuccessModal(true);
    };

    const totalAvailable = logs.reduce((sum, log) => sum + (log.preparedQty || 0), 0);
    const hasNoStock = totalAvailable === 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Warm Cafe Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-100 p-6 sm:p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-200/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                            <ShoppingCart size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                                บันทึกยอดขาย
                                <Sparkles className="text-amber-500" size={20} />
                            </h1>
                            <p className="text-stone-500">Daily Sales Log - เชื่อมกับสต็อกอัตโนมัติ</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2 border border-amber-100 shadow-sm">
                            <Store size={18} className="text-amber-600" />
                            <select
                                value={selectedMarketId}
                                onChange={e => setSelectedMarketId(e.target.value)}
                                className="bg-transparent border-none text-stone-700 font-medium focus:ring-0 cursor-pointer"
                            >
                                <option value="">-- เลือกตลาด --</option>
                                 {markets
                                    .filter(m => m.isActive !== false && (m.type === 'market' || !m.type))
                                    .map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                            </select>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2 border border-amber-100 shadow-sm">
                            <Calendar size={18} className="text-amber-600" />
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="bg-transparent border-none text-stone-700 font-medium focus:ring-0 cursor-pointer"
                            />
                        </div>

                        {/* Weather Selector */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-2 flex items-center gap-1 border border-amber-100 shadow-sm">
                            <span className="text-stone-500 text-sm px-2">อากาศ:</span>
                            {WEATHER_OPTIONS.map(w => (
                                <button
                                    key={w.id}
                                    type="button"
                                    onClick={() => setWeather(weather === w.id ? null : w.id as WeatherCondition)}
                                    className={`p-2 rounded-lg transition-all ${weather === w.id
                                        ? w.color + ' ring-2 ring-amber-400/50 scale-110'
                                        : 'text-stone-400 hover:bg-amber-50'
                                        }`}
                                    title={w.label}
                                >
                                    {w.icon}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stock Connection Banner */}
            {hasNoStock ? (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="text-amber-500" size={24} />
                    <div>
                        <p className="font-bold text-amber-800">ยังไม่มีของส่งมาจากสต็อก</p>
                        <p className="text-sm text-amber-600">กรุณาไปหน้า "สต็อกเมนู" และกรอก "ส่งไปร้าน" ก่อน</p>
                    </div>
                    <ArrowRight className="text-amber-400 ml-auto" />
                </div>
            ) : (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3">
                    <Package className="text-green-500" size={24} />
                    <div>
                        <p className="font-bold text-green-800">ของพร้อมขาย: {totalAvailable} ชิ้น</p>
                        <p className="text-sm text-green-600">ดึงจากสต็อกเมนูอัตโนมัติ ✨</p>
                    </div>
                </div>
            )}

            {/* Product Cards - Grouped Grid Layout */}
            {hasSaved ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-green-100 shadow-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                        <Check size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-stone-700">บันทึกยอดขายสำเร็จแล้ว! 🎉</h3>
                        <p className="text-stone-400 text-sm mt-1">ข้อมูลยอดขายและของเหลือของตลาดนี้ได้รับการบันทึกเรียบร้อยแล้วครับ</p>
                    </div>
                </div>
            ) : !selectedMarketId ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-amber-100 shadow-sm flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 animate-pulse">
                        <Store size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-stone-700">กรุณาเลือกตลาด/สาขา</h3>
                        <p className="text-stone-400 text-sm mt-1">กรุณาเลือกตลาดหรือสาขาที่ต้องการบันทึกยอดขายจากเมนูด้านบนก่อนนะครับ</p>
                    </div>
                </div>
            ) : logs.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-cafe-100 shadow-sm flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center text-stone-400">
                        <Package size={32} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-stone-700">ไม่พบเมนูที่ส่งมาขาย</h3>
                        <p className="text-stone-400 text-sm mt-1">ไม่มีสินค้าที่พร้อมขายส่งมาที่ตลาดนี้นะครับ (กรุณากรอก "ส่งไปร้าน" ในหน้าสต็อกเมนูก่อน)</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {Array.from(groupedLogs.entries()).map(([productId, group]) => {
                        const isExpanded = expandedGroups.has(productId);
                        const hasVariants = group.hasVariants;

                        return (
                            <div key={productId} className="bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden">
                                {/* Group Header */}
                                <div
                                    className="px-4 py-3 flex items-center justify-between cursor-pointer transition-colors bg-gradient-to-r from-cafe-600 to-cafe-700 text-white hover:from-cafe-700 hover:to-cafe-800"
                                    onClick={() => hasVariants && toggleGroup(productId)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-white">
                                            {group.product.name}
                                        </span>
                                        {hasVariants && (
                                            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                                {group.items.length} รส
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-1 rounded-full font-bold bg-blue-400/30 text-white">
                                            📦 {group.totalAvailable}
                                        </span>
                                        <span className="text-xs px-2 py-1 rounded-full font-bold bg-green-400/30 text-white">
                                            ✅ {group.totalSold}
                                        </span>
                                        {hasVariants && (
                                            isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />
                                        )}
                                    </div>
                                </div>

                                {/* Items Grid - Always show for single products, toggle for groups */}
                                {(!hasVariants || isExpanded) && (
                                    <div className={`p-3 ${hasVariants ? 'bg-cafe-50' : ''}`}>
                                        <div className={`grid gap-3 ${hasVariants ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
                                            {group.items.map(item => (
                                                <SalesLogRow
                                                    key={`${item.productId}-${item.variantId || ''}`}
                                                    item={item}
                                                    handleLogChange={handleLogChange as any}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Summary Footer */}
            {!hasSaved && logs.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200 shadow-lg">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex-1 text-center md:text-left">
                            <p className="text-sm text-cafe-600 mb-1">ยอดขายรวม</p>
                            <h2 className="text-4xl font-bold text-cafe-900">{formatCurrency(totalRevenue)}</h2>
                            <div className="flex gap-4 mt-3 text-sm flex-wrap">
                                <span className="text-green-700">
                                    <TrendingUp size={14} className="inline mr-1" />
                                    กำไร: {formatCurrency(trueProfit)}
                                </span>
                                <span className="text-cafe-600">ขาย: {totalSoldItems} ชิ้น</span>
                                {totalFreeQty > 0 && <span className="text-violet-600">🍽️ กินแจก: {totalFreeQty} ชิ้น</span>}
                                <span className="text-amber-600">เหลือคืน: {totalLeftover} ชิ้น</span>
                            </div>
                        </div>
                        <button
                            onClick={handleSaveClick}
                            disabled={totalAvailable === 0}
                            className="bg-gradient-to-r from-cafe-800 to-cafe-900 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-cafe-900 hover:to-black shadow-xl flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Save size={20} />
                            บันทึกยอดขาย
                        </button>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmSave}
                title="ยืนยันบันทึกยอดขาย"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>ยอดขายรวม</span>
                            <span className="font-bold text-xl text-cafe-800">{formatCurrency(totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>ต้นทุนสินค้า</span>
                            <span className="text-red-600">-{formatCurrency(totalCOGS)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>ของเสีย</span>
                            <span className="text-red-600">-{formatCurrency(totalWasteCost)}</span>
                        </div>
                        {totalFreeCost > 0 && (
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>🍽️ กินแจก ({totalFreeQty} ชิ้น)</span>
                                <span className="text-violet-600">-{formatCurrency(totalFreeCost)}</span>
                            </div>
                        )}
                        <hr className="my-3" />
                        <div className="flex justify-between font-bold text-lg">
                            <span className="text-green-700">กำไรสุทธิ</span>
                            <span className="text-green-700">{formatCurrency(trueProfit)}</span>
                        </div>
                    </div>
                    <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg flex items-center gap-2">
                        <AlertCircle size={16} />
                        ของเหลือ {totalLeftover} ชิ้น จะถูกบันทึกกลับเข้าสต็อกอัตโนมัติ
                    </div>
                </div>
            </ConfirmModal>

            {/* Success Modal - Shows after saving */}
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    setSelectedMarketId('');
                    setHasSaved(false);
                }}
                data={successData}
            />
        </div>
    );
};
