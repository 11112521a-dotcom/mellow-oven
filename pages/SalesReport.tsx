// ============================================================
// 📊 Sales Report - ENHANCED
// Unified Sales Analytics with Market Comparison & Period Analysis
// 🛡️ Mellow Oven Standards Compliance:
// - #17: Accessibility (aria-labels, semantic HTML)
// - #22: 44px min button size
// - #16: Memoization for performance
// ============================================================

import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/src/store';
import { formatCurrency } from '@/src/lib/utils';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Calendar,
    BarChart3,
    Percent,
    ShoppingBag,
    Edit2,
    ChevronDown,
    ChevronUp,
    Save,
    X,
    Sparkles,
    Store,
    Clock,
    Award,
    Zap,
    Target,
    Activity,
    Trash2,
    FileText,
    LayoutGrid,
    RefreshCw
} from 'lucide-react';
import { RevenueTrendChart } from '@/src/components/SalesReport/RevenueTrendChart';
import { TopProductsChart } from '@/src/components/SalesReport/TopProductsChart';
import { MarketComparisonChart } from '@/src/components/SalesReport/MarketComparisonChart';
import { DayOfWeekChart } from '@/src/components/SalesReport/DayOfWeekChart';
import { WasteSummaryCard } from '@/src/components/SalesReport/WasteSummaryCard';
import { WeatherAnalysisCard, getWeatherIcon } from '@/src/components/SalesReport/WeatherAnalysisCard';
// Remove ExportPDFButton import

import { Modal } from '@/src/components/ui/Modal';
import { NumberInput } from '@/src/components/ui/NumberInput';
import { MarketComparisonTable, EnhancedComparisonView, EnhancedMarketDetailView } from '@/src/components/Dashboard';
import { DateRange } from '@/src/lib/dashboard/dashboardUtils';
import { calculateEnhancedMarketData, generateMarketPDFReport } from '@/src/lib/dashboard/marketAnalysisUtils'; // Import new utils
import { FileDown } from 'lucide-react'; // Ensure FileDown is imported

interface EditSalesModalProps {
    // ... existing interface ...
    isOpen: boolean;
    onClose: () => void;
    saleData: any;
    onSave: (id: string, newQuantity: number) => void;
}

const EditSalesModal: React.FC<EditSalesModalProps> = ({ isOpen, onClose, saleData, onSave }) => {
    const [quantity, setQuantity] = useState(0);

    React.useEffect(() => {
        if (saleData) setQuantity(saleData.quantity);
    }, [saleData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (saleData) onSave(saleData.id, quantity);
    };

    if (!saleData) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="แก้ไขยอดขาย">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gradient-to-r from-cafe-50 to-amber-50 p-4 rounded-xl border border-cafe-100">
                    <div className="text-sm text-cafe-500 mb-1">📅 วันที่</div>
                    <div className="font-bold text-cafe-900">
                        {new Date(saleData.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-2">จำนวนที่ขาย (ชิ้น)</label>
                    <NumberInput
                        value={quantity}
                        onChange={setQuantity}
                        className="w-full p-3 border-2 border-cafe-200 rounded-xl focus:border-cafe-500 focus:ring-2 focus:ring-cafe-200"
                        min={0}
                    />
                </div>
                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2">
                        <X size={18} /> ยกเลิก
                    </button>
                    <button type="submit" className="flex-1 px-4 py-3 bg-gradient-to-r from-cafe-600 to-cafe-800 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2">
                        <Save size={18} /> บันทึก
                    </button>
                </div>
            </form>
        </Modal>
    );
};

// Premium Stat Card Component with Growth Indicator
const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subValue?: string;
    gradient: string;
    delay?: number;
    growth?: number; // NEW: Growth percentage
}> = ({ icon, label, value, subValue, gradient, delay = 0, growth }) => (
    <div
        className={`relative overflow-hidden bg-gradient-to-br ${gradient} text-white rounded-2xl shadow-lg p-5 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl`}
        style={{ animationDelay: `${delay}ms` }}
    >
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-12 h-12 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Growth Badge */}
        {growth !== undefined && growth !== 0 && (
            <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${growth > 0 ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'}`}>
                {growth > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
            </div>
        )}

        <div className="relative">
            <div className="opacity-80 mb-2">{icon}</div>
            <p className="text-white/70 text-xs mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subValue && <p className="text-xs text-white/60 mt-1">{subValue}</p>}
        </div>
    </div>
);

export const SalesReport: React.FC = () => {
    const { productSales, markets, products, updateProductSaleLog, specialOrders, dailyInventory, fetchInventoryByDateRange } = useStore();

    const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | '3months' | '6months' | 'thisYear' | 'custom'>('today');
    const [startDate, setStartDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // NEW: Fetch inventory when date range changes
    useEffect(() => {
        if (startDate && endDate) {
            console.log('Fetching inventory for range:', startDate, endDate);
            fetchInventoryByDateRange(startDate, endDate);
        }
    }, [startDate, endDate]);
    const [selectedMarket, setSelectedMarket] = useState<string>('all');
    const [topProductsMode, setTopProductsMode] = useState<'quantity' | 'revenue' | 'profit'>('revenue');
    const [marketComparisonMode, setMarketComparisonMode] = useState<'revenue' | 'profit' | 'quantity'>('revenue');
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<any>(null);


    // Tab navigation for different views
    const [activeTab, setActiveTab] = useState<'sales' | 'markets' | 'comparison'>('sales');
    const [selectedMarketForDetail, setSelectedMarketForDetail] = useState<string | null>(null);
    const [comparisonMarketId, setComparisonMarketId] = useState<string | undefined>(undefined);

    // DateRange object for MarketComparisonTable compatibility
    const dateRangeObj = useMemo((): DateRange => ({
        from: new Date(startDate + 'T00:00:00'),
        to: new Date(endDate + 'T23:59:59'),
        label: datePreset === 'today' ? 'วันนี้' : datePreset === 'thisMonth' ? 'เดือนนี้' : 'กำหนดเอง'
    }), [startDate, endDate, datePreset]);

    const handleEditClick = (sale: any) => {
        setEditingSale(sale);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (id: string, newQuantity: number) => {
        if (!editingSale) return;
        const product = products.find(p => p.id === editingSale.productId);
        let defaultPrice = product?.price || 0;
        let defaultCost = product?.cost || 0;
        if (editingSale.variantId && product?.variants) {
            const variant = product.variants.find(v => v.id === editingSale.variantId);
            if (variant) { defaultPrice = variant.price; defaultCost = variant.cost; }
        }
        const pricePerUnit = editingSale.quantity > 0 ? editingSale.revenue / editingSale.quantity : defaultPrice;
        const costPerUnit = editingSale.quantity > 0 ? editingSale.cost / editingSale.quantity : defaultCost;
        await updateProductSaleLog(id, {
            quantitySold: newQuantity,
            totalRevenue: newQuantity * pricePerUnit,
            totalCost: newQuantity * costPerUnit,
            grossProfit: newQuantity * (pricePerUnit - costPerUnit)
        });
        setIsEditModalOpen(false);
        setEditingSale(null);
    };

    const applyDatePreset = (preset: typeof datePreset) => {
        const now = new Date();
        let start = new Date(), end = new Date();

        switch (preset) {
            case 'today':
                start = end = new Date();
                break;
            case 'yesterday':
                start = end = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                break;
            case 'thisWeek': {
                // Start of this week (Monday)
                const dayOfWeek = now.getDay();
                const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
                start = new Date(now.getTime() - diff * 24 * 60 * 60 * 1000);
                end = new Date();
                break;
            }
            case 'lastWeek': {
                // Last week (Mon-Sun)
                const dayOfWeek = now.getDay();
                const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const thisMonday = new Date(now.getTime() - diff * 24 * 60 * 60 * 1000);
                start = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
                end = new Date(thisMonday.getTime() - 24 * 60 * 60 * 1000);
                break;
            }
            case 'thisMonth':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date();
                break;
            case 'lastMonth': {
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of prev month
                break;
            }
            case '3months':
                start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                end = new Date();
                break;
            case '6months':
                start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                end = new Date();
                break;
            case 'thisYear':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date();
                break;
        }

        if (preset !== 'custom') {
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(end.toISOString().split('T')[0]);
        }
        setDatePreset(preset);
    };

    const filteredSales = useMemo(() => {
        return productSales.filter(sale => {
            const matchDate = sale.saleDate >= startDate && sale.saleDate <= endDate;
            const matchMarket = selectedMarket === 'all' || sale.marketId === selectedMarket;
            return matchDate && matchMarket;
        });
    }, [productSales, startDate, endDate, selectedMarket]);

    const summary = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalRevenue, 0);
        const totalCost = filteredSales.reduce((sum, s) => sum + s.totalCost, 0);
        const totalProfit = filteredSales.reduce((sum, s) => sum + s.grossProfit, 0);
        const totalQuantity = filteredSales.reduce((sum, s) => sum + s.quantitySold, 0);
        return { totalRevenue, totalCost, totalProfit, totalQuantity, profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0 };
    }, [filteredSales]);

    const productGroups = useMemo(() => {
        const groups = filteredSales.reduce((acc, sale) => {
            const key = sale.variantId || sale.productId;
            if (!acc[key]) acc[key] = {
                productId: sale.productId,
                variantId: sale.variantId,
                productName: sale.variantName ? `${sale.productName} (${sale.variantName})` : sale.productName,
                category: sale.category,
                totalQuantity: 0,
                totalRevenue: 0,
                totalCost: 0,
                totalProfit: 0,
                totalWaste: 0, // NEW: Total waste quantity
                dailySales: []
            };
            acc[key].totalQuantity += sale.quantitySold;
            acc[key].totalRevenue += sale.totalRevenue;
            acc[key].totalCost += sale.totalCost;
            acc[key].totalProfit += sale.grossProfit;
            acc[key].totalWaste += sale.wasteQty || 0; // NEW: Accumulate waste
            // Enhanced dailySales with more data
            acc[key].dailySales.push({
                date: sale.saleDate,
                quantity: sale.quantitySold,
                revenue: sale.totalRevenue,
                cost: sale.totalCost,
                profit: sale.grossProfit,
                marketId: sale.marketId,
                id: sale.id,
                productId: sale.productId,
                variantId: sale.variantId,
                pricePerUnit: sale.pricePerUnit, // NEW
                costPerUnit: sale.costPerUnit,   // NEW
                wasteQty: sale.wasteQty || 0,    // NEW
                weather: sale.weatherCondition   // NEW
            });
            return acc;
        }, {} as Record<string, any>);
        return Object.values(groups).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
    }, [filteredSales]);

    const revenueTrendData = useMemo(() => {
        const dateMap = new Map<string, { revenue: number; profit: number }>();
        filteredSales.forEach(sale => {
            const existing = dateMap.get(sale.saleDate) || { revenue: 0, profit: 0 };
            dateMap.set(sale.saleDate, { revenue: existing.revenue + sale.totalRevenue, profit: existing.profit + sale.grossProfit });
        });
        return Array.from(dateMap.entries()).map(([date, data]) => ({ date: new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }), revenue: data.revenue, profit: data.profit })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filteredSales]);

    const topProductsData = useMemo(() => productGroups.slice(0, 10).map((product: any) => ({ productName: product.productName, category: product.category, value: topProductsMode === 'quantity' ? product.totalQuantity : topProductsMode === 'revenue' ? product.totalRevenue : product.totalProfit })), [productGroups, topProductsMode]);

    // Bottom 5 Products - Worst Sellers (sorted by quantity ascending)
    const bottomProductsData = useMemo(() => {
        const sorted = [...productGroups].sort((a: any, b: any) => a.totalQuantity - b.totalQuantity);
        return sorted.slice(0, 5).map((product: any) => ({
            productName: product.productName,
            category: product.category,
            value: topProductsMode === 'quantity' ? product.totalQuantity : topProductsMode === 'revenue' ? product.totalRevenue : product.totalProfit,
            totalQuantity: product.totalQuantity,
            totalRevenue: product.totalRevenue,
            totalProfit: product.totalProfit
        }));
    }, [productGroups, topProductsMode]);

    const marketComparisonData = useMemo(() => {
        const marketMap = new Map<string, { revenue: number; profit: number; quantity: number }>();
        filteredSales.forEach(sale => {
            const existing = marketMap.get(sale.marketId) || { revenue: 0, profit: 0, quantity: 0 };
            marketMap.set(sale.marketId, { revenue: existing.revenue + sale.totalRevenue, profit: existing.profit + sale.grossProfit, quantity: existing.quantity + sale.quantitySold });
        });
        return Array.from(marketMap.entries()).map(([marketId, data]) => ({ marketName: markets.find(m => m.id === marketId)?.name || marketId, revenue: data.revenue, profit: data.profit, quantity: data.quantity }));
    }, [filteredSales, markets]);

    // NEW: Waste Summary Data
    const wasteSummary = useMemo(() => {
        const wasteByProduct: Record<string, { productName: string; wasteQty: number; wasteCost: number }> = {};
        let totalWasteQty = 0;
        let totalWasteCost = 0;

        filteredSales.forEach(sale => {
            const wasteQty = sale.wasteQty || 0;
            if (wasteQty > 0) {
                const wasteCost = wasteQty * sale.costPerUnit;
                totalWasteQty += wasteQty;
                totalWasteCost += wasteCost;

                const key = sale.variantId || sale.productId;
                const productName = sale.variantName ? `${sale.productName} (${sale.variantName})` : sale.productName;
                if (!wasteByProduct[key]) {
                    wasteByProduct[key] = { productName, wasteQty: 0, wasteCost: 0 };
                }
                wasteByProduct[key].wasteQty += wasteQty;
                wasteByProduct[key].wasteCost += wasteCost;
            }
        });

        const sortedWasteProducts = Object.values(wasteByProduct).sort((a, b) => b.wasteCost - a.wasteCost);
        return { totalWasteQty, totalWasteCost, wasteByProduct: sortedWasteProducts };
    }, [filteredSales]);

    // NEW: Day of Week Analysis
    const dayOfWeekData = useMemo(() => {
        const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
        const dayMap: Record<number, { revenue: number; profit: number; quantity: number }> = {};

        filteredSales.forEach(sale => {
            const dayIndex = new Date(sale.saleDate).getDay();
            if (!dayMap[dayIndex]) {
                dayMap[dayIndex] = { revenue: 0, profit: 0, quantity: 0 };
            }
            dayMap[dayIndex].revenue += sale.totalRevenue;
            dayMap[dayIndex].profit += sale.grossProfit;
            dayMap[dayIndex].quantity += sale.quantitySold;
        });

        return Object.entries(dayMap).map(([dayIndex, data]) => ({
            day: dayNames[parseInt(dayIndex)],
            dayIndex: parseInt(dayIndex),
            ...data
        }));
    }, [filteredSales]);

    // NEW: Weather Analysis
    const weatherData = useMemo(() => {
        const weatherMap: Record<string, { revenue: number; profit: number; quantity: number; days: Set<string> }> = {};

        filteredSales.forEach(sale => {
            const condition = sale.weatherCondition || 'unknown';
            if (condition === 'unknown') return; // Skip if no weather data

            if (!weatherMap[condition]) {
                weatherMap[condition] = { revenue: 0, profit: 0, quantity: 0, days: new Set() };
            }
            weatherMap[condition].revenue += sale.totalRevenue;
            weatherMap[condition].profit += sale.grossProfit;
            weatherMap[condition].quantity += sale.quantitySold;
            weatherMap[condition].days.add(sale.saleDate);
        });

        return Object.entries(weatherMap).map(([condition, data]) => ({
            condition,
            revenue: data.revenue,
            profit: data.profit,
            quantity: data.quantity,
            days: data.days.size
        }));
    }, [filteredSales]);

    // NEW: Growth Comparison (compare with previous period)
    const growthData = useMemo(() => {
        // Calculate date range length
        const start = new Date(startDate);
        const end = new Date(endDate);
        const periodLength = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Calculate previous period dates
        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - periodLength + 1);

        const prevStartStr = prevStart.toISOString().split('T')[0];
        const prevEndStr = prevEnd.toISOString().split('T')[0];

        // Get previous period sales
        const prevSales = productSales.filter(sale => {
            const matchDate = sale.saleDate >= prevStartStr && sale.saleDate <= prevEndStr;
            const matchMarket = selectedMarket === 'all' || sale.marketId === selectedMarket;
            return matchDate && matchMarket;
        });

        const prevRevenue = prevSales.reduce((sum, s) => sum + s.totalRevenue, 0);
        const prevProfit = prevSales.reduce((sum, s) => sum + s.grossProfit, 0);
        const prevQuantity = prevSales.reduce((sum, s) => sum + s.quantitySold, 0);

        const revenueGrowth = prevRevenue > 0 ? ((summary.totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
        const profitGrowth = prevProfit > 0 ? ((summary.totalProfit - prevProfit) / prevProfit) * 100 : 0;
        const quantityGrowth = prevQuantity > 0 ? ((summary.totalQuantity - prevQuantity) / prevQuantity) * 100 : 0;

        return { revenueGrowth, profitGrowth, quantityGrowth, prevRevenue, prevProfit, prevQuantity };
    }, [productSales, startDate, endDate, selectedMarket, summary]);

    // ... (existing code)

    const toggleExpand = (productId: string) => setExpandedProduct(expandedProduct === productId ? null : productId);

    const handleExportPDF = () => {
        const marketName = selectedMarket === 'all' ? 'ทุกตลาด' : markets.find(m => m.id === selectedMarket)?.name || 'ตลาด';
        const totalRev = productSales.reduce((sum, s) => sum + s.totalRevenue, 0);

        const data = calculateEnhancedMarketData(
            productSales,
            selectedMarket,
            marketName,
            startDate,
            endDate,
            totalRev,
            dailyInventory
        );

        generateMarketPDFReport(data);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Warm Cafe Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-100 p-6 sm:p-8">
                {/* ... (existing header content) ... */}
                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* ... (existing title) ... */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                            <Activity size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 flex items-center gap-2">
                                รายงานการขาย
                                <Sparkles className="text-amber-500" size={20} />
                            </h1>
                            <p className="text-stone-500 mt-1">Sales Analytics Dashboard</p>
                        </div>
                    </div>

                    {/* Filters in Header */}
                    <div className="flex flex-wrap gap-3">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2 border border-amber-100 shadow-sm">
                            <Clock size={18} className="text-amber-600" />
                            <select
                                value={datePreset}
                                onChange={(e) => applyDatePreset(e.target.value as any)}
                                className="bg-transparent border-none text-stone-700 font-medium focus:ring-0 cursor-pointer"
                            >
                                <option value="today">วันนี้</option>
                                <option value="yesterday">เมื่อวาน</option>
                                <option value="thisWeek">สัปดาห์นี้</option>
                                <option value="lastWeek">สัปดาห์ที่แล้ว</option>
                                <option value="thisMonth">เดือนนี้</option>
                                <option value="lastMonth">เดือนที่แล้ว</option>
                                <option value="3months">3 เดือนล่าสุด</option>
                                <option value="6months">6 เดือนล่าสุด</option>
                                <option value="thisYear">ปีนี้ทั้งหมด</option>
                                <option value="custom">📅 เลือกช่วงวัน...</option>
                            </select>
                        </div>

                        {/* Custom Date Range Picker */}
                        {datePreset === 'custom' && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 border border-amber-100 shadow-sm">
                                <Calendar size={16} className="text-amber-600" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="bg-transparent border-none text-stone-700 focus:ring-0 w-32"
                                />
                                <span className="text-stone-400">ถึง</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="bg-transparent border-none text-stone-700 focus:ring-0 w-32"
                                />
                            </div>
                        )}

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2 border border-amber-100 shadow-sm">
                            <Store size={18} className="text-amber-600" />
                            <select
                                value={selectedMarket}
                                onChange={(e) => setSelectedMarket(e.target.value)}
                                className="bg-transparent border-none text-stone-700 font-medium focus:ring-0 cursor-pointer"
                            >
                                <option value="all">ทุกตลาด</option>
                                {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>

                        {/* Export PDF Button */}
                        <button
                            onClick={handleExportPDF}
                            className="bg-white/80 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2 border border-amber-100 shadow-sm text-stone-700 hover:bg-white transition-all"
                            title="Export PDF"
                        >
                            <FileDown size={18} className="text-amber-600" />
                            <span className="font-medium">Export PDF</span>
                        </button>


                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                📑 TAB NAVIGATION - Sales / Markets / Comparison
               ═══════════════════════════════════════════════════════════════ */}
            <div className="flex flex-wrap gap-2 p-1 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                <button
                    onClick={() => { setActiveTab('sales'); setSelectedMarketForDetail(null); }}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all min-h-[44px] whitespace-nowrap ${activeTab === 'sales'
                        ? 'bg-amber-100 text-amber-800 border-2 border-amber-300 shadow-sm'
                        : 'bg-white/80 text-stone-600 hover:bg-amber-50 border border-stone-200 hover:border-amber-200'
                        }`}
                    aria-pressed={activeTab === 'sales'}
                >
                    <BarChart3 size={18} className={activeTab === 'sales' ? 'text-amber-600' : ''} />
                    📊 รายงานขาย
                </button>
                <button
                    onClick={() => { setActiveTab('markets'); setSelectedMarketForDetail(null); }}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all min-h-[44px] whitespace-nowrap ${activeTab === 'markets'
                        ? 'bg-orange-100 text-orange-800 border-2 border-orange-300 shadow-sm'
                        : 'bg-white/80 text-stone-600 hover:bg-orange-50 border border-stone-200 hover:border-orange-200'
                        }`}
                    aria-pressed={activeTab === 'markets'}
                >
                    <Store size={18} className={activeTab === 'markets' ? 'text-orange-600' : ''} />
                    🏪 ตามตลาด
                </button>
                <button
                    onClick={() => setActiveTab('comparison')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all min-h-[44px] whitespace-nowrap ${activeTab === 'comparison'
                        ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300 shadow-sm'
                        : 'bg-white/80 text-stone-600 hover:bg-yellow-50 border border-stone-200 hover:border-yellow-200'
                        }`}
                    aria-pressed={activeTab === 'comparison'}
                >
                    <RefreshCw size={18} className={activeTab === 'comparison' ? 'text-yellow-600' : ''} />
                    📈 เปรียบเทียบ
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                📑 TAB CONTENT
               ═══════════════════════════════════════════════════════════════ */}

            {/* 🏪 MARKET DETAIL PAGE MODE */}
            {selectedMarketForDetail ? (
                <EnhancedMarketDetailView
                    marketId={selectedMarketForDetail}
                    marketName={markets.find(m => m.id === selectedMarketForDetail)?.name || 'Unknown Market'}
                    sales={productSales}
                    totalRevenue={filteredSales.reduce((sum, s) => sum + s.totalRevenue, 0)}
                    fromDate={startDate}
                    toDate={endDate}
                    onClose={() => setSelectedMarketForDetail(null)}
                    isModal={false}
                    inventory={dailyInventory} // Pass inventory data
                />
            ) : (
                <>
                    {/* TAB: MARKETS */}
                    {activeTab === 'markets' && (
                        <MarketComparisonTable
                            sales={productSales}
                            markets={markets}
                            dateRange={dateRangeObj}
                            onViewMarketDetail={(marketId) => setSelectedMarketForDetail(marketId)}
                        />
                    )}

                    {/* TAB: COMPARISON */}
                    {activeTab === 'comparison' && (
                        <EnhancedComparisonView
                            sales={productSales}
                            markets={markets}
                            selectedMarketId={selectedMarket === 'all' ? undefined : selectedMarket}
                        />
                    )}

                    {/* TAB: SALES - Original Sales Report Content */}
                    {activeTab === 'sales' && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                <StatCard icon={<DollarSign size={28} />} label="รายรับรวม" value={formatCurrency(summary.totalRevenue)} gradient="from-blue-500 to-blue-600" delay={0} growth={growthData.revenueGrowth} />
                                <StatCard icon={<TrendingUp size={28} />} label="กำไรสุทธิ" value={formatCurrency(summary.totalProfit)} gradient="from-emerald-500 to-green-600" delay={50} growth={growthData.profitGrowth} />
                                <StatCard icon={<Package size={28} />} label="ขายได้" value={summary.totalQuantity} subValue="ชิ้น" gradient="from-violet-500 to-purple-600" delay={100} growth={growthData.quantityGrowth} />
                                <StatCard icon={<Target size={28} />} label="Margin" value={`${summary.profitMargin.toFixed(1)}%`} gradient="from-pink-500 to-rose-600" delay={150} />
                                <StatCard icon={<ShoppingBag size={28} />} label="ต้นทุน" value={formatCurrency(summary.totalCost)} gradient="from-orange-500 to-red-500" delay={200} />
                                {/* Waste Card - Special Highlight */}
                                <div className={`relative overflow-hidden rounded-2xl shadow-lg p-5 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl ${wasteSummary.totalWasteCost > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'} text-white`}>
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative">
                                        <div className="opacity-80 mb-2"><Trash2 size={28} /></div>
                                        <p className="text-white/70 text-xs mb-1">🗑️ Waste</p>
                                        <p className="text-2xl font-bold">{wasteSummary.totalWasteCost > 0 ? `-${formatCurrency(wasteSummary.totalWasteCost)}` : '฿0'}</p>
                                        <p className="text-xs text-white/60 mt-1">{wasteSummary.totalWasteQty} ชิ้น</p>
                                    </div>
                                </div>
                            </div>

                            {/* NEW: Moneyball Insights Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Day of Week Chart */}
                                <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6 hover:shadow-lg transition-shadow">
                                    <DayOfWeekChart data={dayOfWeekData} />
                                </div>

                                {/* Weather Analysis OR Waste Details */}
                                {weatherData.length > 0 ? (
                                    <WeatherAnalysisCard data={weatherData} />
                                ) : (
                                    <WasteSummaryCard
                                        totalWasteQty={wasteSummary.totalWasteQty}
                                        totalWasteCost={wasteSummary.totalWasteCost}
                                        wasteByProduct={wasteSummary.wasteByProduct}
                                        totalRevenue={summary.totalRevenue}
                                    />
                                )}
                            </div>

                            {/* Charts */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6 hover:shadow-lg transition-shadow">
                                    <RevenueTrendChart data={revenueTrendData} />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Top Products */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6 hover:shadow-lg transition-shadow">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                                <Award className="text-yellow-500" size={20} />
                                                Top 10 สินค้า
                                            </h3>
                                            <div className="flex gap-1 bg-cafe-100 rounded-lg p-1">
                                                {['quantity', 'revenue', 'profit'].map(mode => (
                                                    <button key={mode} onClick={() => setTopProductsMode(mode as any)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${topProductsMode === mode ? 'bg-white shadow text-cafe-800' : 'text-cafe-600 hover:text-cafe-800'}`}>
                                                        {mode === 'quantity' ? 'จำนวน' : mode === 'revenue' ? 'รายรับ' : 'กำไร'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <TopProductsChart data={topProductsData} mode={topProductsMode} />
                                    </div>

                                    {/* Market Comparison */}
                                    <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6 hover:shadow-lg transition-shadow">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                                <Zap className="text-amber-500" size={20} />
                                                เปรียบเทียบตลาด
                                            </h3>
                                            <div className="flex gap-1 bg-cafe-100 rounded-lg p-1">
                                                {['revenue', 'profit', 'quantity'].map(mode => (
                                                    <button key={mode} onClick={() => setMarketComparisonMode(mode as any)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${marketComparisonMode === mode ? 'bg-white shadow text-cafe-800' : 'text-cafe-600 hover:text-cafe-800'}`}>
                                                        {mode === 'quantity' ? 'จำนวน' : mode === 'revenue' ? 'รายรับ' : 'กำไร'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <MarketComparisonChart data={marketComparisonData} mode={marketComparisonMode} />
                                    </div>
                                </div>
                            </div>

                            {/* Bottom 5 Worst Selling Products */}
                            {bottomProductsData.length > 0 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-orange-200 p-6 hover:shadow-lg transition-shadow">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                            <TrendingDown className="text-orange-500" size={20} />
                                            ⚠️ Top 5 เมนูขายช้า
                                        </h3>
                                        <span className="text-xs text-orange-600 bg-orange-100 px-3 py-1 rounded-full">ควรพิจารณา</span>
                                    </div>
                                    <p className="text-sm text-cafe-500 mb-4">เมนูที่ขายได้น้อยที่สุดในช่วงเวลา - พิจารณาปรับแผนการผลิตหรือยกเลิก</p>
                                    <div className="space-y-3">
                                        {bottomProductsData.map((product: any, index: number) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-red-500 text-white' : index === 1 ? 'bg-orange-500 text-white' : 'bg-amber-400 text-white'}`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-cafe-900">{product.productName}</div>
                                                        <div className="text-xs text-cafe-500">{product.category}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-orange-700">{product.totalQuantity} ชิ้น</div>
                                                    <div className="text-xs text-cafe-500">รายได้: {formatCurrency(product.totalRevenue)}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Data Table */}
                            <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="p-6 bg-gradient-to-r from-cafe-50 to-white border-b border-cafe-100">
                                    <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                        <BarChart3 size={20} />
                                        รายละเอียดการขายรายเมนู
                                    </h3>
                                    <p className="text-sm text-cafe-500 mt-1">คลิกแถวเพื่อดูรายละเอียดและแก้ไขยอดขาย</p>
                                </div>

                                {productGroups.length === 0 ? (
                                    <div className="p-16 text-center">
                                        <Package className="mx-auto text-cafe-200 mb-4" size={48} />
                                        <p className="text-cafe-500">ไม่มีข้อมูลในช่วงเวลานี้</p>
                                        <p className="text-sm text-cafe-400 mt-2">ลองเปลี่ยนช่วงเวลาหรือตัวกรอง</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-cafe-50 border-b border-cafe-100">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-sm font-semibold text-cafe-700 w-10"></th>
                                                    <th className="px-6 py-4 text-left text-sm font-semibold text-cafe-700">เมนู</th>
                                                    <th className="px-6 py-4 text-center text-sm font-semibold text-cafe-700">จำนวน</th>
                                                    <th className="px-6 py-4 text-right text-sm font-semibold text-cafe-700">รายรับ</th>
                                                    <th className="px-6 py-4 text-right text-sm font-semibold text-cafe-700">กำไร</th>
                                                    <th className="px-6 py-4 text-right text-sm font-semibold text-cafe-700">💰 กำไร/ชิ้น</th>
                                                    <th className="px-6 py-4 text-center text-sm font-semibold text-cafe-700">% กำไร</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-cafe-50">
                                                {productGroups.map((product: any) => {
                                                    const profitMargin = product.totalRevenue > 0 ? (product.totalProfit / product.totalRevenue) * 100 : 0;
                                                    const profitPerItem = product.totalQuantity > 0 ? product.totalProfit / product.totalQuantity : 0;
                                                    const isExpanded = expandedProduct === (product.variantId || product.productId);
                                                    return (
                                                        <React.Fragment key={product.variantId || product.productId}>
                                                            <tr className="hover:bg-cafe-50/50 transition-colors cursor-pointer" onClick={() => toggleExpand(product.variantId || product.productId)}>
                                                                <td className="px-6 py-4"><button className="text-cafe-500 hover:text-cafe-700">{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button></td>
                                                                <td className="px-6 py-4"><div className="font-semibold text-cafe-900">{product.productName}</div><div className="text-xs text-cafe-500">{product.category}</div></td>
                                                                <td className="px-6 py-4 text-center font-medium text-cafe-800">{product.totalQuantity}</td>
                                                                <td className="px-6 py-4 text-right font-semibold text-cafe-900">{formatCurrency(product.totalRevenue)}</td>
                                                                <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(product.totalProfit)}</td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <span className={`px-2 py-1 rounded-lg text-sm font-bold ${profitPerItem >= 30 ? 'bg-emerald-100 text-emerald-700' : profitPerItem >= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                                        ฿{profitPerItem.toFixed(0)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${profitMargin >= 60 ? 'bg-green-100 text-green-700' : profitMargin >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {profitMargin.toFixed(1)}%
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                            {isExpanded && (
                                                                <tr>
                                                                    <td colSpan={7} className="p-0">
                                                                        <div className="bg-gradient-to-r from-cafe-50 to-amber-50 p-5 border-t border-cafe-100">
                                                                            <div className="flex items-center justify-between mb-4">
                                                                                <h4 className="text-md font-bold text-cafe-800 flex items-center gap-2">
                                                                                    <Calendar size={16} />
                                                                                    รายละเอียดรายวัน
                                                                                </h4>
                                                                                {/* Summary badges */}
                                                                                <div className="flex gap-2">
                                                                                    {product.totalWaste > 0 && (
                                                                                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                                                                                            🗑️ Waste รวม: {product.totalWaste} ชิ้น
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* Daily Sales Cards */}
                                                                            <div className="grid gap-3">
                                                                                {product.dailySales.map((sale: any, index: number) => (
                                                                                    <div key={index} className="bg-white rounded-xl p-4 border border-cafe-100 hover:shadow-md transition-shadow">
                                                                                        {/* Row 1: Date, Market, Weather */}
                                                                                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-cafe-100">
                                                                                            <div className="flex items-center gap-4">
                                                                                                <div className="text-center min-w-[50px]">
                                                                                                    <div className="text-lg font-bold text-cafe-800">{new Date(sale.date).toLocaleDateString('th-TH', { day: 'numeric' })}</div>
                                                                                                    <div className="text-xs text-cafe-500">{new Date(sale.date).toLocaleDateString('th-TH', { month: 'short' })}</div>
                                                                                                </div>
                                                                                                <div className="h-8 w-px bg-cafe-200"></div>
                                                                                                <div>
                                                                                                    <div className="text-sm font-medium text-cafe-800">{markets.find(m => m.id === sale.marketId)?.name || '-'}</div>
                                                                                                    {sale.weather && (
                                                                                                        <div className="flex items-center gap-1 text-xs text-cafe-500 mt-0.5">
                                                                                                            {getWeatherIcon(sale.weather)}
                                                                                                            <span>{sale.weather === 'sunny' ? 'แดดออก' : sale.weather === 'cloudy' ? 'มีเมฆ' : sale.weather === 'rain' ? 'ฝนตก' : sale.weather === 'storm' ? 'พายุ' : sale.weather}</span>
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                            <button onClick={() => handleEditClick(sale)} className="p-2 text-cafe-500 hover:text-cafe-700 hover:bg-cafe-100 rounded-lg transition-colors">
                                                                                                <Edit2 size={16} />
                                                                                            </button>
                                                                                        </div>

                                                                                        {/* Row 2: Stats Grid */}
                                                                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
                                                                                            <div className="bg-blue-50 rounded-lg p-2">
                                                                                                <div className="text-xs text-blue-600">ขายได้</div>
                                                                                                <div className="font-bold text-blue-800">{sale.quantity} ชิ้น</div>
                                                                                            </div>
                                                                                            <div className="bg-violet-50 rounded-lg p-2">
                                                                                                <div className="text-xs text-violet-600">ราคา/ชิ้น</div>
                                                                                                <div className="font-bold text-violet-800">฿{sale.pricePerUnit?.toFixed(0) || '-'}</div>
                                                                                            </div>
                                                                                            <div className="bg-orange-50 rounded-lg p-2">
                                                                                                <div className="text-xs text-orange-600">ต้นทุน/ชิ้น</div>
                                                                                                <div className="font-bold text-orange-800">฿{sale.costPerUnit?.toFixed(0) || '-'}</div>
                                                                                            </div>
                                                                                            <div className="bg-cafe-50 rounded-lg p-2">
                                                                                                <div className="text-xs text-cafe-600">รายรับรวม</div>
                                                                                                <div className="font-bold text-cafe-800">{formatCurrency(sale.revenue)}</div>
                                                                                            </div>
                                                                                            <div className="bg-green-50 rounded-lg p-2">
                                                                                                <div className="text-xs text-green-600">กำไร</div>
                                                                                                <div className="font-bold text-green-700">{formatCurrency(sale.profit)}</div>
                                                                                            </div>
                                                                                            {/* Waste */}
                                                                                            <div className={`rounded-lg p-2 ${sale.wasteQty > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                                                                                                <div className={`text-xs ${sale.wasteQty > 0 ? 'text-red-600' : 'text-gray-500'}`}>🗑️ ของเสีย</div>
                                                                                                <div className={`font-bold ${sale.wasteQty > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                                                                                                    {sale.wasteQty > 0 ? `${sale.wasteQty} ชิ้น` : '-'}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-gradient-to-r from-cafe-900 to-cafe-800 text-white font-bold">
                                                <tr>
                                                    <td className="px-6 py-5"></td>
                                                    <td className="px-6 py-5 text-lg">🏆 รวมทั้งหมด</td>
                                                    <td className="px-6 py-5 text-center text-xl">{summary.totalQuantity}</td>
                                                    <td className="px-6 py-5 text-right text-xl">{formatCurrency(summary.totalRevenue)}</td>
                                                    <td className="px-6 py-5 text-right text-xl text-green-300">{formatCurrency(summary.totalProfit)}</td>
                                                    <td className="px-6 py-5 text-right text-lg">
                                                        ฿{summary.totalQuantity > 0 ? (summary.totalProfit / summary.totalQuantity).toFixed(0) : 0}
                                                    </td>
                                                    <td className="px-6 py-5 text-center text-xl">{summary.profitMargin.toFixed(1)}%</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Special Orders Section - SEPARATE from regular sales */}
                            {specialOrders.filter(o => o.status !== 'cancelled').length > 0 && (
                                <div className="bg-white rounded-2xl shadow-lg overflow-hidden mt-6">
                                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 text-white">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <ShoppingBag size={20} />
                                            ออเดอร์พิเศษ (แยกจากยอดขายปกติ)
                                        </h3>
                                        <p className="text-purple-100 text-sm mt-1">ข้อมูลนี้ไม่รวมในยอดขายด้านบน และไม่ส่งผลต่อ AI พยากรณ์</p>
                                    </div>

                                    <div className="p-4">
                                        {/* Special Orders Summary */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                            <div className="bg-purple-50 rounded-lg p-3 text-center">
                                                <p className="text-xs text-purple-600">จำนวนออเดอร์</p>
                                                <p className="text-xl font-bold text-purple-800">
                                                    {specialOrders.filter(o => o.status !== 'cancelled').length}
                                                </p>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                                <p className="text-xs text-green-600">รายได้รวม</p>
                                                <p className="text-xl font-bold text-green-800">
                                                    {formatCurrency(specialOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.totalRevenue, 0))}
                                                </p>
                                            </div>
                                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                                                <p className="text-xs text-blue-600">จำนวนสินค้า</p>
                                                <p className="text-xl font-bold text-blue-800">
                                                    {specialOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.totalQuantity, 0)} ชิ้น
                                                </p>
                                            </div>
                                            <div className="bg-emerald-50 rounded-lg p-3 text-center">
                                                <p className="text-xs text-emerald-600">กำไร</p>
                                                <p className="text-xl font-bold text-emerald-800">
                                                    {formatCurrency(specialOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.grossProfit, 0))}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Special Orders List */}
                                        <div className="space-y-2">
                                            {specialOrders.filter(o => o.status !== 'cancelled').map(order => (
                                                <div key={order.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-sm font-bold text-purple-600">{order.orderNumber}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                                order.status === 'producing' ? 'bg-purple-100 text-purple-700' :
                                                                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                {order.status === 'delivered' ? 'ส่งแล้ว' :
                                                                    order.status === 'producing' ? 'กำลังผลิต' :
                                                                        order.status === 'confirmed' ? 'ยืนยันแล้ว' : 'รอยืนยัน'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {order.items.map(i => `${i.productName} x${i.quantity}`).join(', ')}
                                                        </p>
                                                        {order.customerName && (
                                                            <p className="text-xs text-gray-400">ลูกค้า: {order.customerName}</p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-green-600">{formatCurrency(order.totalRevenue)}</p>
                                                        <p className="text-xs text-gray-400">ส่ง {order.deliveryDate}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <EditSalesModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} saleData={editingSale} onSave={handleSaveEdit} />


                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default SalesReport;
