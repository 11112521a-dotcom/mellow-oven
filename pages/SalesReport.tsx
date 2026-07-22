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
import { AnimatedSelect } from '@/src/components/ui/AnimatedSelect';
import { AnimatedButton } from '@/src/components/ui/AnimatedButton';
import { MarketComparisonTable, EnhancedComparisonView, EnhancedMarketDetailView } from '@/src/components/Dashboard';
import { DateRange } from '@/src/lib/dashboard/dashboardUtils';
import { calculateEnhancedMarketData, generateMarketPDFReport } from '@/src/lib/dashboard/marketAnalysisUtils'; // Import new utils
import { DetailedSalesReportModal } from '@/src/components/Reports/DetailedSalesReportModal';
import { runOracle, OraclePattern, runComboAnalysis, runCannibalismCheck } from '@/src/lib/oracle/oracleEngine';
import { OracleInsightCard } from '@/src/components/SalesReport/OracleInsightCard';
import { FileDown } from 'lucide-react'; // Ensure FileDown is imported
import { 
    calculateSalesSummary, 
    calculateProductGroups, 
    calculateDailyBreakdown, 
    calculatePerMarketProductData, 
    calculateWasteSummary 
} from '@/src/lib/salesAnalytics';
import { ProductSaleLog, Market } from '@/types';

interface EditSalesModalProps {
    isOpen: boolean;
    onClose: () => void;
    saleData: ProductSaleLog | null;
    onSave: (id: string, newQuantity: number, eatQty: number, giveawayQty: number) => void;
}

const EditSalesModal: React.FC<EditSalesModalProps> = ({ isOpen, onClose, saleData, onSave }) => {
    const [quantity, setQuantity] = useState(0);
    const [eatQty, setEatQty] = useState(0);
    const [giveawayQty, setGiveawayQty] = useState(0);

    React.useEffect(() => {
        if (saleData) {
            setQuantity(saleData.quantitySold);
            setEatQty(saleData.eatQty || 0);
            setGiveawayQty(saleData.giveawayQty || 0);
        }
    }, [saleData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (saleData) onSave(saleData.id, quantity, eatQty, giveawayQty);
    };

    if (!saleData) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="แก้ไขยอดขาย">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gradient-to-r from-cafe-50 to-amber-50 p-4 rounded-xl border border-cafe-100">
                    <div className="text-sm text-cafe-500 mb-1">📅 วันที่</div>
                    <div className="font-bold text-cafe-900">
                        {new Date(saleData.saleDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div className="text-sm text-cafe-500 mt-2 mb-1">🍞 สินค้า</div>
                    <div className="font-bold text-cafe-900">
                        {saleData.productName} {saleData.variantName ? `(${saleData.variantName})` : ''}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-2">💰 จำนวนที่ขาย (ชิ้น)</label>
                        <NumberInput
                            value={quantity}
                            onChange={setQuantity}
                            className="w-full p-3 border-2 border-cafe-200 rounded-xl focus:border-cafe-500 focus:ring-2 focus:ring-cafe-200 bg-white"
                            min={0}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-orange-700 mb-2">😋 กินเอง (ชิ้น)</label>
                            <NumberInput
                                value={eatQty}
                                onChange={setEatQty}
                                className="w-full p-3 border-2 border-orange-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 bg-orange-50/50"
                                min={0}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-pink-700 mb-2">🎁 แจกฟรี (ชิ้น)</label>
                            <NumberInput
                                value={giveawayQty}
                                onChange={setGiveawayQty}
                                className="w-full p-3 border-2 border-pink-200 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-200 bg-pink-50/50"
                                min={0}
                            />
                        </div>
                    </div>
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

// Helper to format date as YYYY-MM-DD in Local Timezone
const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const SalesReport: React.FC = () => {
    const productSales = useStore((state) => state.productSales);
    const markets = useStore((state) => state.markets);
    const products = useStore((state) => state.products);
    const updateProductSaleLog = useStore((state) => state.updateProductSaleLog);
    const specialOrders = useStore((state) => state.specialOrders);
    const dailyInventory = useStore((state) => state.dailyInventory);
    const fetchInventoryByDateRange = useStore((state) => state.fetchInventoryByDateRange);
    const externalShops = useStore((state) => state.externalShops);

    const globalDateFilter = useStore((state) => state.globalDateFilter);
    const setGlobalDateFilter = useStore((state) => state.setGlobalDateFilter);

    const datePreset = globalDateFilter.preset as 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | '3months' | '6months' | 'thisYear' | 'custom';
    const startDate = globalDateFilter.fromDate;
    const endDate = globalDateFilter.toDate;

    const setStartDate = (date: string) => {
        setGlobalDateFilter({ ...globalDateFilter, fromDate: date, preset: 'custom', label: 'กำหนดเอง' });
    };

    const setEndDate = (date: string) => {
        setGlobalDateFilter({ ...globalDateFilter, toDate: date, preset: 'custom', label: 'กำหนดเอง' });
    };

    // NEW: Fetch inventory when date range changes
    useEffect(() => {
        if (startDate && endDate) {
            fetchInventoryByDateRange(startDate, endDate);
        }
    }, [startDate, endDate]);
    const [selectedMarket, setSelectedMarket] = useState<string>('all');
    const [saleTypeFilter, setSaleTypeFilter] = useState<'all' | 'market' | 'consignment'>('all'); // NEW: Filter for Market vs Consignment
    const [topProductsMode, setTopProductsMode] = useState<'quantity' | 'revenue' | 'profit'>('revenue');
    const [marketComparisonMode, setMarketComparisonMode] = useState<'revenue' | 'profit' | 'quantity'>('revenue');
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailedReportOpen, setIsDetailedReportOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<ProductSaleLog | null>(null);

    const getMarketName = (id: string) => {
        const foundPOS = markets.find(m => m.id === id);
        if (foundPOS) return foundPOS.name;
        const foundShop = externalShops.find(s => s.id === id);
        if (foundShop) return `ฝากขาย: ${foundShop.name}`;
        const saleLog = productSales.find(s => s.marketId === id);
        if (saleLog && saleLog.marketName) return saleLog.marketName;
        return 'Unknown Market';
    };

    // Oracle Core State
    const [oraclePatterns, setOraclePatterns] = useState<OraclePattern[]>([]);
    const [isOracleLoading, setIsOracleLoading] = useState(false);

    // Run Oracle on Top Products (Effect)
    useEffect(() => {
        if (productSales.length === 0 || products.length === 0) return;

        const runAnalysis = async () => {
            setIsOracleLoading(true);
            try {
                // Filter by market if selected
                const relevantSales = selectedMarket === 'all'
                    ? productSales
                    : productSales.filter(s => s.marketId === selectedMarket);

                // 1. Identify Top Products (Limit to Top 5 for performance)
                const productRevenueMap = new Map<string, number>();
                relevantSales.forEach(s => {
                    const rev = productRevenueMap.get(s.productId) || 0;
                    productRevenueMap.set(s.productId, rev + s.totalRevenue);
                });
                const topProductIds = Array.from(productRevenueMap.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(e => e[0]);

                // 2. Run Oracle for each top product
                const allPatterns: OraclePattern[] = [];

                for (const pid of topProductIds) {
                    const productHistory = relevantSales.filter(s => s.productId === pid);
                    const product = products.find(p => p.id === pid);

                    if (product && productHistory.length > 5) { // Min data check
                        const patterns = await runOracle(
                            product.name,
                            pid,
                            productHistory,
                            relevantSales // Context
                        );
                        allPatterns.push(...patterns);
                    }
                }

                // 3. Run Combo & Cannibalism Analysis (New Features)
                const comboPatterns = await runComboAnalysis(relevantSales);
                const cannibalPatterns = await runCannibalismCheck(relevantSales);

                allPatterns.push(...comboPatterns);
                allPatterns.push(...cannibalPatterns);

                // 4. Set Results (Sort by Lift Impact)
                setOraclePatterns(allPatterns.sort((a, b) => Math.abs(b.metrics.lift) - Math.abs(a.metrics.lift)));
            } catch (error) {
                console.error("Oracle Analysis Failed:", error);
            } finally {
                setIsOracleLoading(false);
            }
        };

        // Debounce
        const timer = setTimeout(runAnalysis, 800);
        return () => clearTimeout(timer);
    }, [productSales, products, selectedMarket]);

    // ... (rest of component) ...

    const [activeTab, setActiveTab] = useState<'sales' | 'markets' | 'comparison' | 'patterns'>('sales');
    const [selectedMarketForDetail, setSelectedMarketForDetail] = useState<string | null>(null);
    const [comparisonMarketId, setComparisonMarketId] = useState<string | undefined>(undefined);

    // DateRange object for MarketComparisonTable compatibility
    const dateRangeObj = useMemo((): DateRange => ({
        from: new Date(startDate + 'T00:00:00'),
        to: new Date(endDate + 'T23:59:59'),
        label: datePreset === 'today' ? 'วันนี้' : datePreset === 'thisMonth' ? 'เดือนนี้' : 'กำหนดเอง'
    }), [startDate, endDate, datePreset]);

    const handleEditClick = (sale: ProductSaleLog) => {
        setEditingSale(sale);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (id: string, newQuantity: number, eatQty: number, giveawayQty: number) => {
        if (!editingSale) return;
        const product = products.find(p => p.id === editingSale.productId);
        let defaultPrice = product?.price || 0;
        let defaultCost = product?.cost || 0;
        if (editingSale.variantId && product?.variants) {
            const variant = product.variants.find(v => v.id === editingSale.variantId);
            if (variant) { defaultPrice = variant.price; defaultCost = variant.cost; }
        }
        const pricePerUnit = editingSale.quantitySold > 0 ? editingSale.totalRevenue / editingSale.quantitySold : defaultPrice;
        const costPerUnit = editingSale.quantitySold > 0 ? editingSale.totalCost / editingSale.quantitySold : defaultCost;

        // Calculate totals
        // Revenue comes ONLY from sold quantity
        const totalRevenue = newQuantity * pricePerUnit;

        // Cost comes from Sold + Eat + Giveaway (all are used)
        const totalUsedQty = newQuantity + eatQty + giveawayQty;
        const totalCost = totalUsedQty * costPerUnit;

        // Gross Profit = Revenue - Total Cost
        const grossProfit = totalRevenue - totalCost;

        await updateProductSaleLog(id, {
            quantitySold: newQuantity,
            eatQty: eatQty, // Note: db naming convention might differ, check store slice
            giveawayQty: giveawayQty,
            totalRevenue: totalRevenue,
            totalCost: totalCost,
            grossProfit: grossProfit
        });
        setIsEditModalOpen(false);
        setEditingSale(null);
    };

    // Helper to format date as YYYY-MM-DD in Local Timezone
    // Fixes bug where toISOString() returns yesterday's date due to UTC shift
    // moved outside component

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

        let label = 'กำหนดเอง';
        if (preset === 'today') label = 'วันนี้';
        else if (preset === 'yesterday') label = 'เมื่อวาน';
        else if (preset === 'thisWeek') label = 'สัปดาห์นี้';
        else if (preset === 'thisMonth') label = 'เดือนนี้';

        if (preset !== 'custom') {
            setGlobalDateFilter({
                preset,
                fromDate: formatDateLocal(start),
                toDate: formatDateLocal(end),
                label
            });
        } else {
            setGlobalDateFilter({
                ...globalDateFilter,
                preset: 'custom',
                label: 'กำหนดเอง'
            });
        }
    };

    const filteredSales = useMemo(() => {
        return productSales.filter(sale => {
            const matchDate = sale.saleDate >= startDate && sale.saleDate <= endDate;
            const matchMarket = selectedMarket === 'all' || sale.marketId === selectedMarket;
            
            let matchType = true;
            if (saleTypeFilter !== 'all') {
                const isConsignment = externalShops.some(s => s.id === sale.marketId) || sale.marketName?.startsWith('ฝากขาย:');
                if (saleTypeFilter === 'market' && isConsignment) matchType = false;
                if (saleTypeFilter === 'consignment' && !isConsignment) matchType = false;
            }

            return matchDate && matchMarket && matchType;
        });
    }, [productSales, startDate, endDate, selectedMarket, saleTypeFilter, externalShops]);

    // For Comparison View: Include all date ranges so Period B (e.g. June) is not truncated by top date filter
    const comparisonSales = useMemo(() => {
        return productSales.filter(sale => {
            let matchType = true;
            if (saleTypeFilter !== 'all') {
                const isConsignment = externalShops.some(s => s.id === sale.marketId) || sale.marketName?.startsWith('ฝากขาย:');
                if (saleTypeFilter === 'market' && isConsignment) matchType = false;
                if (saleTypeFilter === 'consignment' && !isConsignment) matchType = false;
            }
            return matchType;
        });
    }, [productSales, saleTypeFilter, externalShops]);

    const summary = useMemo(() => calculateSalesSummary(filteredSales), [filteredSales]);

    const productGroups = useMemo(() => calculateProductGroups(filteredSales), [filteredSales]);

    const revenueTrendData = useMemo(() => {
        const dateMap = new Map<string, { revenue: number; profit: number }>();
        filteredSales.forEach(sale => {
            const existing = dateMap.get(sale.saleDate) || { revenue: 0, profit: 0 };
            dateMap.set(sale.saleDate, { revenue: existing.revenue + sale.totalRevenue, profit: existing.profit + sale.grossProfit });
        });
        return Array.from(dateMap.entries())
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, data]) => ({
                date: new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
                revenue: data.revenue,
                profit: data.profit
            }));
    }, [filteredSales]);

    const dailyBreakdownData = useMemo(() => calculateDailyBreakdown(filteredSales, externalShops), [filteredSales, externalShops]);

    const perMarketProductData = useMemo(() => calculatePerMarketProductData(filteredSales, markets), [filteredSales, markets]);

    const topProductsData = useMemo(() => productGroups.slice(0, 10).map((product) => ({ productName: product.productName, category: product.category, value: topProductsMode === 'quantity' ? product.totalQuantity : topProductsMode === 'revenue' ? product.totalRevenue : product.totalProfit })), [productGroups, topProductsMode]);

    const bottomProductsData = useMemo(() => {
        const sorted = [...productGroups].sort((a, b) => a.totalQuantity - b.totalQuantity);
        return sorted.slice(0, 5).map((product) => ({
            productName: product.productName,
            category: product.category,
            value: topProductsMode === 'quantity' ? product.totalQuantity : topProductsMode === 'revenue' ? product.totalRevenue : product.totalProfit,
            totalQuantity: product.totalQuantity,
            totalRevenue: product.totalRevenue,
            totalProfit: product.totalProfit
        }));
    }, [productGroups, topProductsMode]);

    const marketComparisonData = useMemo(() => {
        const marketMap = new Map<string, { marketName: string; revenue: number; profit: number; quantity: number; isConsignment: boolean }>();
        filteredSales.forEach(sale => {
            const isConsignment = externalShops.some(s => s.id === sale.marketId) || sale.marketName?.startsWith('ฝากขาย:');
            const existing = marketMap.get(sale.marketId) || { marketName: sale.marketName || sale.marketId, revenue: 0, profit: 0, quantity: 0, isConsignment };
            marketMap.set(sale.marketId, {
                marketName: existing.marketName,
                revenue: existing.revenue + sale.totalRevenue,
                profit: existing.profit + sale.grossProfit,
                quantity: existing.quantity + sale.quantitySold,
                isConsignment: existing.isConsignment
            });
        });
        return Array.from(marketMap.entries()).map(([marketId, data]) => ({
            marketName: markets.find(m => m.id === marketId)?.name || data.marketName,
            revenue: data.revenue,
            profit: data.profit,
            quantity: data.quantity,
            isConsignment: data.isConsignment
        }));
    }, [filteredSales, markets, externalShops]);

    const wasteSummary = useMemo(() => calculateWasteSummary(filteredSales), [filteredSales]);

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
            
            let matchType = true;
            if (saleTypeFilter !== 'all') {
                const isConsignment = externalShops.some(s => s.id === sale.marketId) || sale.marketName?.startsWith('ฝากขาย:');
                if (saleTypeFilter === 'market' && isConsignment) matchType = false;
                if (saleTypeFilter === 'consignment' && !isConsignment) matchType = false;
            }

            return matchDate && matchMarket && matchType;
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

    const enhancedData = useMemo(() => {
        const marketName = selectedMarket === 'all' ? 'ทุกตลาด' : getMarketName(selectedMarket);
        const totalRev = productSales.reduce((sum, s) => sum + s.totalRevenue, 0);
        return calculateEnhancedMarketData(
            productSales,
            selectedMarket,
            marketName,
            startDate,
            endDate,
            totalRev,
            dailyInventory
        );
    }, [productSales, selectedMarket, markets, externalShops, startDate, endDate, dailyInventory]);

    const handleExportPDF = () => {
        generateMarketPDFReport(enhancedData);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Warm Cafe Header */}
            <div className="relative rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-100 p-6 sm:p-8 z-20">
                {/* Subtle decorative elements */}
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none z-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-200/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
                </div>

                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 z-10">
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
                        <AnimatedSelect
                            value={datePreset}
                            onChange={(val) => applyDatePreset(val as 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | '3months' | '6months' | 'thisYear' | 'custom')}
                            icon={Clock}
                            options={[
                                { value: 'today', label: 'วันนี้' },
                                { value: 'yesterday', label: 'เมื่อวาน' },
                                { value: 'thisWeek', label: 'สัปดาห์นี้' },
                                { value: 'lastWeek', label: 'สัปดาห์ที่แล้ว' },
                                { value: 'thisMonth', label: 'เดือนนี้' },
                                { value: 'lastMonth', label: 'เดือนที่แล้ว' },
                                { value: '3months', label: '3 เดือนล่าสุด' },
                                { value: '6months', label: '6 เดือนล่าสุด' },
                                { value: 'thisYear', label: 'ปีนี้ทั้งหมด' },
                                { value: 'custom', label: '📅 เลือกช่วงวัน...' }
                            ]}
                        />

                        {/* Custom Date Range Picker */}
                        {datePreset === 'custom' && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 flex items-center gap-2 border border-amber-100 shadow-sm animate-in fade-in slide-in-from-left-4">
                                <Calendar size={16} className="text-amber-600" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="bg-transparent border-none text-stone-700 focus:ring-0 w-32 cursor-pointer outline-none"
                                />
                                <span className="text-stone-400">ถึง</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="bg-transparent border-none text-stone-700 focus:ring-0 w-32 cursor-pointer outline-none"
                                />
                            </div>
                        )}
                        
                        {/* Sale Type Filter Toggle */}
                        <AnimatedSelect
                            value={saleTypeFilter}
                            onChange={(val) => setSaleTypeFilter(val as 'all' | 'market' | 'consignment')}
                            icon={Package}
                            options={[
                                { value: 'all', label: 'ทั้งหมด' },
                                { value: 'market', label: '🏪 ไปขายตลาด' },
                                { value: 'consignment', label: '📦 ฝากขาย' }
                            ]}
                        />

                        <AnimatedSelect
                            value={selectedMarket}
                            onChange={(val) => setSelectedMarket(val)}
                            icon={Store}
                            options={[
                                { value: 'all', label: 'ทุกตลาด' },
                                ...markets.map(m => ({ value: m.id, label: m.name })),
                                ...externalShops.map(s => ({ value: s.id, label: `ฝากขาย: ${s.name}` }))
                            ]}
                        />

                        {/* Export PDF Button */}
                        <AnimatedButton
                            onClick={handleExportPDF}
                            icon={FileDown}
                            variant="outline"
                            glow
                            title="Export PDF"
                        >
                            Export PDF
                        </AnimatedButton>


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
                <button
                    onClick={() => setActiveTab('patterns')}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all min-h-[44px] whitespace-nowrap ${activeTab === 'patterns'
                        ? 'bg-purple-100 text-purple-800 border-2 border-purple-300 shadow-sm'
                        : 'bg-white/80 text-stone-600 hover:bg-purple-50 border border-stone-200 hover:border-purple-200'
                        }`}
                    aria-pressed={activeTab === 'patterns'}
                >
                    <Sparkles size={18} className={activeTab === 'patterns' ? 'text-purple-600' : ''} />
                    🧠 วิเคราะห์
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                📑 TAB CONTENT
               ═══════════════════════════════════════════════════════════════ */}

            {/* 🏪 MARKET DETAIL PAGE MODE */}
            {selectedMarketForDetail ? (
                <EnhancedMarketDetailView
                    marketId={selectedMarketForDetail}
                    marketName={getMarketName(selectedMarketForDetail)}
                    sales={filteredSales}
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
                    {activeTab === 'markets' && (() => {
                        let displayMarkets = [...markets];
                        if (saleTypeFilter === 'consignment') {
                            displayMarkets = externalShops.map(s => ({...s, name: `ฝากขาย: ${s.name}`}) as Market);
                        } else if (saleTypeFilter === 'all') {
                            displayMarkets = [
                                ...markets, 
                                ...externalShops.map(s => ({...s, name: `ฝากขาย: ${s.name}`}) as Market)
                            ];
                        }
                        
                        return (
                            <MarketComparisonTable
                                sales={filteredSales}
                                markets={displayMarkets}
                                dateRange={dateRangeObj}
                                onViewMarketDetail={(marketId) => setSelectedMarketForDetail(marketId)}
                            />
                        );
                    })()}

                    {/* TAB: COMPARISON */}
                    {activeTab === 'comparison' && (() => {
                        let displayMarkets = [...markets];
                        if (saleTypeFilter === 'consignment') {
                            displayMarkets = externalShops.map(s => ({...s, name: `ฝากขาย: ${s.name}`}) as Market);
                        } else if (saleTypeFilter === 'all') {
                            displayMarkets = [
                                ...markets, 
                                ...externalShops.map(s => ({...s, name: `ฝากขาย: ${s.name}`}) as Market)
                            ];
                        }
                        return (
                            <EnhancedComparisonView
                                sales={comparisonSales}
                                markets={displayMarkets}
                                selectedMarketId={selectedMarket === 'all' ? undefined : selectedMarket}
                            />
                        );
                    })()}

                    {/* TAB: PATTERNS (New Oracle Core) */}
                    {activeTab === 'patterns' && (
                        <div className="animate-in fade-in zoom-in duration-300">
                            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white mb-6 shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="relative z-10">
                                    <h2 className="text-2xl font-bold flex items-center gap-3 mb-2">
                                        <Sparkles className="text-yellow-300" />
                                        The Oracle Core
                                    </h2>
                                    <p className="text-indigo-100 max-w-2xl">
                                        ระบบวิเคราะห์รูปแบบการขายอัจฉริยะ 7 มิติ (Chrono, Weather, Market, etc.)
                                        ช่วยค้นหา "The Perfect Storm" และ "Silent Killer" ที่ซ่อนอยู่ในข้อมูลของคุณ
                                    </p>
                                </div>
                            </div>

                            <OracleInsightCard patterns={oraclePatterns} isLoading={isOracleLoading} />
                        </div>
                    )}

                    {/* TAB: SALES - Original Sales Report Content */}
                    {activeTab === 'sales' && (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard icon={<DollarSign size={28} />} label="รายรับรวม" value={formatCurrency(summary.totalRevenue)} gradient="from-blue-500 to-blue-600" delay={0} growth={growthData.revenueGrowth} />
                                <StatCard icon={<TrendingUp size={28} />} label="กำไรสุทธิ" value={formatCurrency(summary.totalProfit)} gradient="from-emerald-500 to-green-600" delay={50} growth={growthData.profitGrowth} />
                                <StatCard icon={<Package size={28} />} label="ขายได้" value={summary.totalQuantity} subValue="ชิ้น" gradient="from-violet-500 to-purple-600" delay={100} growth={growthData.quantityGrowth} />
                                <StatCard icon={<Target size={28} />} label="Margin" value={`${summary.profitMargin.toFixed(1)}%`} gradient="from-pink-500 to-rose-600" delay={150} />
                                
                                <StatCard icon={<ShoppingBag size={28} />} label="ต้นทุน" value={formatCurrency(summary.totalCost)} gradient="from-orange-500 to-orange-600" delay={200} />
                                <div className={`relative overflow-hidden rounded-2xl shadow-lg p-5 transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 hover:shadow-xl ${wasteSummary.totalWasteCost > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'} text-white`}>
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                                    <div className="relative">
                                        <div className="opacity-80 mb-2"><Trash2 size={28} /></div>
                                        <p className="text-white/70 text-xs mb-1">🗑️ ของเสีย</p>
                                        <p className="text-2xl font-bold">{wasteSummary.totalWasteCost > 0 ? `-${formatCurrency(wasteSummary.totalWasteCost)}` : '฿0'}</p>
                                        <p className="text-xs text-white/60 mt-1">{wasteSummary.totalWasteQty} ชิ้น</p>
                                    </div>
                                </div>
                                <StatCard icon={<Activity size={28} />} label="กิน/แจกฟรี" value={`${summary.totalEatGiveaway} ชิ้น`} subValue={`-${formatCurrency(summary.totalEatGiveawayCost)}`} gradient="from-amber-500 to-yellow-600" delay={250} />
                                <StatCard icon={<Calendar size={28} />} label="เฉลี่ย/วัน" value={formatCurrency(summary.avgRevenuePerDay)} subValue={`กำไร ${formatCurrency(summary.avgProfitPerDay)}`} gradient="from-teal-500 to-emerald-600" delay={300} />

                                <StatCard icon={<ShoppingBag size={28} />} label="ชิ้น/รายการ" value={enhancedData.metrics.itemsPerTransaction.toFixed(1)} subValue="ชิ้นเฉลี่ยต่อบิล" gradient="from-sky-500 to-blue-600" delay={350} />
                                <StatCard icon={<DollarSign size={28} />} label="มูลค่าเฉลี่ย/บิล" value={formatCurrency(enhancedData.metrics.avgTransactionValue)} subValue="ยอดขายเฉลี่ยต่อบิล" gradient="from-indigo-500 to-purple-600" delay={400} />
                                <StatCard icon={<Calendar size={28} />} label="จำนวนวันขาย" value={`${enhancedData.metrics.activeDays} วัน`} subValue="วันที่มีการขายในระบบ" gradient="from-teal-500 to-emerald-600" delay={450} />
                                <StatCard icon={<Package size={28} />} label="เมนูที่ขาย" value={`${enhancedData.metrics.uniqueProductCount} เมนู`} subValue="ประเภทสินค้าที่ทำเงิน" gradient="from-amber-500 to-orange-600" delay={500} />
                            </div>



                            {/* UNIFIED SALES ANALYTICS DASHBOARD */}
                            <div className="bg-white rounded-3xl shadow-sm border border-cafe-200 mb-6 overflow-hidden">
                                <div className="p-6 md:p-8 bg-gradient-to-r from-cafe-50 to-white border-b border-cafe-100">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-cafe-500 p-2.5 rounded-xl shadow-inner text-white">
                                            <Activity size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-cafe-900">กระดานวิเคราะห์ยอดขายแบบรวม (Unified Analytics)</h2>
                                            <p className="text-sm text-cafe-500">แสดงแนวโน้ม, ยอดขายรายวัน, สินค้าขายดี และเปรียบเทียบตลาดในที่เดียว</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col">
                                    {/* Top Half: Revenue Trend & Day of Week */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-cafe-100">
                                        <div className="p-6 md:p-8">
                                            <RevenueTrendChart data={revenueTrendData} />
                                        </div>
                                        <div className="p-6 md:p-8 bg-cafe-50/30">
                                            <DayOfWeekChart data={dayOfWeekData} />
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className="h-px w-full bg-cafe-100"></div>

                                    {/* Bottom Half: Top Products & Market Comparison */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-cafe-100">
                                        <div className="p-6 md:p-8 bg-cafe-50/30 flex flex-col h-full">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                                    <span className="bg-cafe-100 p-2 rounded-xl">🏆</span> Top 10 สินค้า
                                                </h3>
                                                <div className="flex gap-1 bg-white rounded-lg p-1 border border-cafe-100 shadow-sm">
                                                    {['quantity', 'revenue', 'profit'].map(mode => (
                                                        <button key={mode} onClick={() => setTopProductsMode(mode as 'quantity' | 'revenue' | 'profit')}
                                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${topProductsMode === mode ? 'bg-cafe-100 text-cafe-800' : 'text-cafe-600 hover:text-cafe-800'}`}>
                                                            {mode === 'quantity' ? 'จำนวน' : mode === 'revenue' ? 'รายรับ' : 'กำไร'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <TopProductsChart data={topProductsData} mode={topProductsMode} />
                                        </div>
                                        
                                        <div className="p-6 md:p-8">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                                    <span className="bg-cafe-100 p-2 rounded-xl">⚡</span> เปรียบเทียบตลาด
                                                </h3>
                                                <div className="flex gap-1 bg-white rounded-lg p-1 border border-cafe-100 shadow-sm">
                                                    {['revenue', 'profit', 'quantity'].map(mode => (
                                                        <button key={mode} onClick={() => setMarketComparisonMode(mode as 'revenue' | 'profit' | 'quantity')}
                                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${marketComparisonMode === mode ? 'bg-cafe-100 text-cafe-800' : 'text-cafe-600 hover:text-cafe-800'}`}>
                                                            {mode === 'quantity' ? 'จำนวน' : mode === 'revenue' ? 'รายรับ' : 'กำไร'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                {marketComparisonData.filter(d => !d.isConsignment).length > 0 && (
                                                    <MarketComparisonChart 
                                                        data={marketComparisonData.filter(d => !d.isConsignment)} 
                                                        mode={marketComparisonMode} 
                                                        customTitle={marketComparisonMode === 'quantity' ? 'จำนวนสินค้า (ตลาด)' : marketComparisonMode === 'revenue' ? 'รายรับ (ตลาด)' : 'กำไร (ตลาด)'}
                                                        customIcon="🏪"
                                                    />
                                                )}
                                                
                                                {marketComparisonData.filter(d => d.isConsignment).length > 0 && (
                                                    <MarketComparisonChart 
                                                        data={marketComparisonData.filter(d => d.isConsignment)} 
                                                        mode={marketComparisonMode} 
                                                        customTitle={marketComparisonMode === 'quantity' ? 'จำนวนสินค้า (ฝากขาย)' : marketComparisonMode === 'revenue' ? 'รายรับ (ฝากขาย)' : 'กำไร (ฝากขาย)'}
                                                        customIcon="📦"
                                                    />
                                                )}

                                                {marketComparisonData.length === 0 && (
                                                    <div className="h-72 flex flex-col items-center justify-center text-cafe-400 bg-cafe-50/50 rounded-2xl border border-dashed border-cafe-200">
                                                        <span className="text-2xl mb-2">📊</span>
                                                        <p>ไม่พบข้อมูลยอดขาย</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info Row (Weather/Waste & Daily Breakdown) */}
                            <div className="mt-6 space-y-6">
                                {/* Weather OR Waste */}
                                {weatherData.length > 0 ? (
                                    <div className="w-full lg:w-1/2">
                                        <WeatherAnalysisCard data={weatherData} />
                                    </div>
                                ) : (
                                    <div className="w-full lg:w-1/2">
                                        <WasteSummaryCard
                                            totalWasteQty={wasteSummary.totalWasteQty}
                                            totalWasteCost={wasteSummary.totalWasteCost}
                                            wasteByProduct={wasteSummary.byProduct}
                                            totalRevenue={summary.totalRevenue}
                                        />
                                    </div>
                                )}

                                {/* Daily Breakdown Table */}
                                <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6 hover:shadow-lg transition-shadow flex flex-col max-h-[600px]">
                                    <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2 mb-4 shrink-0">
                                        <Calendar size={20} className="text-blue-500" />
                                        รายงานการขายรายวัน
                                    </h3>
                                    <div className="overflow-x-auto overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                        <table className="w-full text-sm">
                                            <thead className="bg-cafe-50 sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th className="px-3 py-2 text-left font-semibold text-cafe-700 rounded-tl-lg">วันที่</th>
                                                    <th className="px-3 py-2 text-left font-semibold text-cafe-700">ตลาด</th>
                                                    <th className="px-3 py-2 text-center font-semibold text-cafe-700">อากาศ</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-cafe-700">รายได้</th>
                                                    <th className="px-3 py-2 text-right font-semibold text-cafe-700">กำไร</th>
                                                    <th className="px-3 py-2 text-center font-semibold text-cafe-700">ขาย</th>
                                                    <th className="px-3 py-2 text-center font-semibold text-cafe-700">กิน/แจก</th>
                                                    <th className="px-3 py-2 text-center font-semibold text-cafe-700 rounded-tr-lg">เสีย</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-cafe-100">
                                                {(() => {
                                                    const validDays = dailyBreakdownData.filter(d => d.revenue > 0);
                                                    const maxRev = validDays.length > 0 ? Math.max(...validDays.map(d => d.revenue)) : 0;
                                                    const minRev = validDays.length > 0 ? Math.min(...validDays.map(d => d.revenue)) : -1;
                                                    
                                                    return dailyBreakdownData.map((day, i) => {
                                                        const isBest = day.revenue === maxRev && maxRev > 0;
                                                        const isWorst = day.revenue === minRev && minRev >= 0 && maxRev !== minRev;
                                                        const marketNamesStr = day.marketNames?.join(', ') || '-';
                                                        
                                                        return (
                                                            <tr key={day.date} className={`hover:bg-cafe-50 transition-colors ${isBest ? 'bg-emerald-50/50' : isWorst ? 'bg-red-50/50' : ''}`}>
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    <div className="font-medium text-cafe-900">{new Date(day.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</div>
                                                                </td>
                                                                <td className="px-3 py-2 text-left text-sm text-cafe-600 max-w-[150px] truncate" title={marketNamesStr}>
                                                                    {marketNamesStr}
                                                                </td>
                                                                <td className="px-3 py-2 text-center">
                                                                    {getWeatherIcon(day.weather)}
                                                                </td>
                                                                <td className="px-3 py-2 text-right font-bold text-cafe-900">
                                                                    {formatCurrency(day.revenue)}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-green-600 font-semibold">
                                                                    {formatCurrency(day.profit)}
                                                                </td>
                                                                <td className="px-3 py-2 text-center text-cafe-800">
                                                                    {day.quantity}
                                                                </td>
                                                                <td className={`px-3 py-2 text-center ${day.eatGiveaway > 0 ? 'text-amber-600 font-medium' : 'text-cafe-300'}`}>
                                                                    {day.eatGiveaway > 0 ? day.eatGiveaway : '-'}
                                                                </td>
                                                                <td className={`px-3 py-2 text-center ${day.waste > 0 ? 'text-red-600 font-medium' : 'text-cafe-300'}`}>
                                                                    {day.waste > 0 ? day.waste : '-'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    });
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* NEW: Worst Sellers Panel */}
                            <div className="mt-6">
                                {/* Top 5 Worst Selling Products */}
                                {bottomProductsData.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-orange-200 p-6 hover:shadow-lg transition-shadow flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                                    <TrendingDown className="text-orange-500" size={20} />
                                                    ⚠️ Top 5 เมนูขายช้า
                                                </h3>
                                                <span className="text-xs text-orange-600 bg-orange-100 px-3 py-1 rounded-full">ควรพิจารณา</span>
                                            </div>
                                            <p className="text-sm text-cafe-500 mb-4">เมนูที่ขายได้น้อยที่สุดในช่วงเวลา - พิจารณาปรับแผนการผลิตหรือยกเลิก</p>
                                            <div className="space-y-3">
                                                {bottomProductsData.map((product, index: number) => (
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
                                    </div>
                                )}
                            </div>

                            {/* NEW: Per-Market Product Breakdown */}
                            <div className="space-y-4 mb-6">
                                <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                    <Store className="text-orange-500" size={20} />
                                    รายละเอียดแยกตามตลาด (Per-Market Breakdown)
                                </h3>
                                {perMarketProductData.length === 0 ? (
                                    <div className="bg-white rounded-2xl p-8 text-center border border-cafe-100">
                                        <p className="text-cafe-500">ไม่มีข้อมูลตลาดในช่วงเวลานี้</p>
                                    </div>
                                ) : (
                                    perMarketProductData.map(market => (
                                        <details key={market.marketId} className="group bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                                            <summary className="flex items-center justify-between p-5 cursor-pointer bg-gradient-to-r hover:from-orange-50 hover:to-white transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                                                        <Store size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-cafe-900 text-lg">{market.marketName}</h4>
                                                        <div className="flex items-center gap-3 text-sm text-cafe-500 mt-1">
                                                            <span>ขาย {market.quantity} ชิ้น</span>
                                                            {market.eatGiveaway > 0 && <span className="text-amber-600">แจก {market.eatGiveaway} ชิ้น</span>}
                                                            {market.waste > 0 && <span className="text-red-500">เสีย {market.waste} ชิ้น</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right hidden sm:block">
                                                        <div className="font-bold text-cafe-900 text-lg">{formatCurrency(market.revenue)}</div>
                                                        <div className="text-sm text-green-600 font-medium">กำไร {formatCurrency(market.profit)}</div>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-cafe-50 flex items-center justify-center group-open:rotate-180 transition-transform text-cafe-500">
                                                        <ChevronDown size={20} />
                                                    </div>
                                                </div>
                                            </summary>
                                            <div className="p-0 border-t border-cafe-100 bg-cafe-50/30 overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-white border-b border-cafe-100">
                                                        <tr>
                                                            <th className="px-5 py-3 text-left font-semibold text-cafe-700">สินค้า</th>
                                                            <th className="px-5 py-3 text-center font-semibold text-cafe-700">ขาย (ชิ้น)</th>
                                                            <th className="px-5 py-3 text-right font-semibold text-cafe-700">รายได้</th>
                                                            <th className="px-5 py-3 text-right font-semibold text-cafe-700">ต้นทุน</th>
                                                            <th className="px-5 py-3 text-right font-semibold text-cafe-700">กำไร</th>
                                                            <th className="px-5 py-3 text-center font-semibold text-cafe-700">กิน/แจก</th>
                                                            <th className="px-5 py-3 text-center font-semibold text-cafe-700">เสีย</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-cafe-100">
                                                        {market.products.map((p, idx: number) => (
                                                            <tr key={idx} className="hover:bg-white transition-colors">
                                                                <td className="px-5 py-3">
                                                                    <div className="font-medium text-cafe-900">{p.productName}</div>
                                                                    <div className="text-xs text-cafe-500">{p.category}</div>
                                                                </td>
                                                                <td className="px-5 py-3 text-center font-medium text-cafe-800">{p.quantity}</td>
                                                                <td className="px-5 py-3 text-right font-semibold text-cafe-900">{formatCurrency(p.revenue)}</td>
                                                                <td className="px-5 py-3 text-right text-orange-600">{formatCurrency(p.cost)}</td>
                                                                <td className="px-5 py-3 text-right font-bold text-green-600">{formatCurrency(p.profit)}</td>
                                                                <td className={`px-5 py-3 text-center ${p.eatGiveaway > 0 ? 'text-amber-600 font-medium' : 'text-cafe-300'}`}>{p.eatGiveaway > 0 ? p.eatGiveaway : '-'}</td>
                                                                <td className={`px-5 py-3 text-center ${p.waste > 0 ? 'text-red-600 font-medium' : 'text-cafe-300'}`}>{p.waste > 0 ? p.waste : '-'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </details>
                                    ))
                                )}
                            </div>

                            {/* NEW: Interactive Daily Stock & Sales Breakdown Accordion */}
                            <div className="space-y-4 mb-6">
                                <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                    <Calendar className="text-orange-500" size={20} />
                                    รายละเอียดสต็อกและยอดขายรายวัน (Daily Stock & Sales Breakdown)
                                </h3>
                                {enhancedData.dailyBreakdown.length === 0 ? (
                                    <div className="bg-white rounded-2xl p-8 text-center border border-cafe-100">
                                        <p className="text-cafe-500">ไม่มีข้อมูลรายวันในช่วงเวลานี้</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {enhancedData.dailyBreakdown.map((day) => {
                                            const totalEatQty = day.products.reduce((sum, p) => sum + (p.eatQty || 0), 0);
                                            const totalGiveawayQty = day.products.reduce((sum, p) => sum + (p.giveawayQty || 0), 0);
                                            const totalWasteQty = day.products.reduce((sum, p) => sum + (p.wasteQty || 0), 0);
                                            const formattedDate = new Date(day.date).toLocaleDateString('th-TH', { 
                                                day: 'numeric', 
                                                month: 'long', 
                                                year: 'numeric',
                                                weekday: 'long' 
                                            });
                                            
                                            const marketProducts = day.products.filter(p => !p.marketName?.startsWith('ฝากขาย:'));
                                            const consignmentProducts = day.products.filter(p => p.marketName?.startsWith('ฝากขาย:'));
                                            
                                            const uniqueMarkets = Array.from(new Set(day.products.map(p => p.marketName).filter(Boolean)));
                                            const marketShops = uniqueMarkets.filter(m => !m.startsWith('ฝากขาย:'));
                                            const consignmentShops = uniqueMarkets
                                                .filter(m => m.startsWith('ฝากขาย:'))
                                                .map(m => m.replace('ฝากขาย:', '').trim());

                                            const marketRevenue = marketProducts.reduce((sum, p) => sum + p.revenue, 0);
                                            const marketProfit = marketProducts.reduce((sum, p) => sum + p.profit, 0);
                                            const consignmentRevenue = consignmentProducts.reduce((sum, p) => sum + p.revenue, 0);
                                            const consignmentProfit = consignmentProducts.reduce((sum, p) => sum + p.profit, 0);

                                            return (
                                                <details key={day.date} className="group bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                                                    <summary className="flex flex-col md:flex-row md:items-center justify-between p-5 cursor-pointer bg-gradient-to-r hover:from-amber-50/50 hover:to-white transition-colors min-h-[44px] gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                                                                <Calendar size={20} />
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-cafe-900 text-base">{formattedDate}</h4>
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cafe-500 mt-1">
                                                                    <span>ขาย {day.soldQty} ชิ้น</span>
                                                                    {(totalEatQty + totalGiveawayQty) > 0 && (
                                                                        <span className="text-amber-600 font-medium">กิน/แจก {totalEatQty + totalGiveawayQty} ชิ้น</span>
                                                                    )}
                                                                    {totalWasteQty > 0 && (
                                                                        <span className="text-red-500 font-medium">เสีย {totalWasteQty} ชิ้น</span>
                                                                    )}
                                                                    {marketShops.length > 0 && (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                                            <Store size={12} className="text-blue-600" />
                                                                            {marketShops.join(', ')}
                                                                        </span>
                                                                    )}
                                                                    {consignmentShops.length > 0 && (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                                                            <Package size={12} className="text-purple-600" />
                                                                            ฝากขาย: {consignmentShops.join(', ')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-6 self-end md:self-center ml-14 md:ml-0">
                                                            <div className="flex gap-4 md:gap-6">
                                                                {marketRevenue > 0 && (
                                                                    <div className="text-right border-r border-cafe-100 pr-4 md:pr-6">
                                                                        <div className="text-[10px] text-blue-600 font-medium uppercase tracking-wider mb-0.5">🏪 ตลาด</div>
                                                                        <div className="font-bold text-cafe-900">{formatCurrency(marketRevenue)}</div>
                                                                        <div className="text-[11px] text-green-600 font-semibold">กำไร {formatCurrency(marketProfit)}</div>
                                                                    </div>
                                                                )}
                                                                {consignmentRevenue > 0 && (
                                                                    <div className="text-right border-r border-cafe-100 pr-4 md:pr-6">
                                                                        <div className="text-[10px] text-purple-600 font-medium uppercase tracking-wider mb-0.5">📦 ฝากขาย</div>
                                                                        <div className="font-bold text-cafe-900">{formatCurrency(consignmentRevenue)}</div>
                                                                        <div className="text-[11px] text-green-600 font-semibold">กำไร {formatCurrency(consignmentProfit)}</div>
                                                                    </div>
                                                                )}
                                                                <div className="text-right">
                                                                    <div className="text-[10px] text-amber-600 font-medium uppercase tracking-wider mb-0.5">รวมทั้งหมด</div>
                                                                    <div className="font-bold text-cafe-900 text-base">{formatCurrency(day.revenue)}</div>
                                                                    <div className="text-[11px] text-green-600 font-semibold">กำไร {formatCurrency(day.profit)}</div>
                                                                </div>
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full bg-cafe-50 flex items-center justify-center shrink-0 group-open:rotate-180 transition-transform text-cafe-500">
                                                                <ChevronDown size={20} />
                                                            </div>
                                                        </div>
                                                    </summary>
                                                    <div className="p-0 border-t border-cafe-100 bg-cafe-50/30 overflow-x-auto">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-white border-b border-cafe-100">
                                                                <tr>
                                                                    <th className="px-5 py-3 text-left font-semibold text-cafe-700">สินค้า</th>
                                                                    <th className="px-5 py-3 text-center font-semibold text-cafe-700">เอาไป (เตรียม)</th>
                                                                    <th className="px-5 py-3 text-center font-semibold text-cafe-700">ขายได้ (ชิ้น)</th>
                                                                    <th className="px-5 py-3 text-center font-semibold text-cafe-700">เหลือ (หน้าร้าน)</th>
                                                                    <th className="px-5 py-3 text-center font-semibold text-cafe-700">กิน/แจก</th>
                                                                    <th className="px-5 py-3 text-center font-semibold text-cafe-700">เสีย</th>
                                                                    <th className="px-5 py-3 text-right font-semibold text-cafe-700">รายรับ</th>
                                                                    <th className="px-5 py-3 text-right font-semibold text-cafe-700">กำไร</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-cafe-100">
                                                                {(() => {
                                                                    const marketProducts = day.products.filter(p => !p.marketName?.startsWith('ฝากขาย:'));
                                                                    const consignmentProducts = day.products.filter(p => p.marketName?.startsWith('ฝากขาย:'));

                                                                    const renderRow = (p: typeof day.products[0], idx: number, isConsignment: boolean) => {
                                                                        const eatGiveaway = (p.eatQty || 0) + (p.giveawayQty || 0);
                                                                        const displayName = isConsignment && p.marketName 
                                                                            ? p.marketName.replace('ฝากขาย:', '').trim()
                                                                            : p.marketName;

                                                                        return (
                                                                            <tr key={`${p.productId}-${idx}`} className="hover:bg-white transition-colors">
                                                                                <td className="px-5 py-3">
                                                                                    <div className="font-semibold text-cafe-900">{p.productName}</div>
                                                                                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                                                        {p.variantName && <span className="text-[10px] text-cafe-400">{p.variantName}</span>}
                                                                                        {p.marketName && (
                                                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                                                                                                isConsignment 
                                                                                                    ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                                                                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                                                                            }`}>
                                                                                                {isConsignment ? `📦 ฝากขาย: ${displayName}` : `🏪 ${displayName}`}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-5 py-3 text-center font-medium text-stone-600">
                                                                                    {p.preparedQty !== undefined ? `${p.preparedQty} ชิ้น` : '-'}
                                                                                </td>
                                                                                <td className="px-5 py-3 text-center font-bold text-cafe-800">
                                                                                    {p.quantity}
                                                                                </td>
                                                                                <td className="px-5 py-3 text-center font-medium text-stone-600">
                                                                                    {p.leftoverQty !== undefined ? `${p.leftoverQty} ชิ้น` : '-'}
                                                                                </td>
                                                                                <td className={`px-5 py-3 text-center font-medium ${eatGiveaway > 0 ? 'text-amber-600' : 'text-cafe-300'}`}>
                                                                                    {eatGiveaway > 0 ? `${eatGiveaway} ชิ้น` : '-'}
                                                                                </td>
                                                                                <td className={`px-5 py-3 text-center font-medium ${p.wasteQty && p.wasteQty > 0 ? 'text-red-600' : 'text-cafe-300'}`}>
                                                                                    {p.wasteQty && p.wasteQty > 0 ? `${p.wasteQty} ชิ้น` : '-'}
                                                                                </td>
                                                                                <td className="px-5 py-3 text-right font-semibold text-cafe-900">
                                                                                    {formatCurrency(p.revenue)}
                                                                                </td>
                                                                                <td className="px-5 py-3 text-right font-bold text-green-600">
                                                                                    {formatCurrency(p.profit)}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    };

                                                                    return (
                                                                        <>
                                                                            {marketProducts.length > 0 && (
                                                                                <>
                                                                                    <tr className="bg-blue-50/20 border-b border-blue-100/50">
                                                                                        <td colSpan={8} className="px-5 py-2.5 font-bold text-blue-900 text-[10px] uppercase tracking-wider">
                                                                                            🏪 ยอดขายตลาด / หน้าร้าน
                                                                                        </td>
                                                                                    </tr>
                                                                                    {marketProducts.map((p, idx) => renderRow(p, idx, false))}
                                                                                </>
                                                                            )}
                                                                            {consignmentProducts.length > 0 && (
                                                                                <>
                                                                                    <tr className="bg-purple-50/20 border-b border-purple-100/50">
                                                                                        <td colSpan={8} className="px-5 py-2.5 font-bold text-purple-900 text-[10px] uppercase tracking-wider">
                                                                                            📦 ยอดขายฝากร้าน (Consignment)
                                                                                        </td>
                                                                                    </tr>
                                                                                    {consignmentProducts.map((p, idx) => renderRow(p, idx, true))}
                                                                                </>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </details>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Data Table */}
                            <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="p-6 bg-gradient-to-r from-cafe-50 to-white border-b border-cafe-100">
                                    <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                        <BarChart3 size={20} />
                                        รายละเอียดการขายรายเมนู
                                    </h3>
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
                                                    <th className="px-6 py-4 text-center text-sm font-semibold text-cafe-700">กิน/แจก</th>
                                                    <th className="px-6 py-4 text-center text-sm font-semibold text-cafe-700">เสีย</th>
                                                    <th className="px-6 py-4 text-right text-sm font-semibold text-cafe-700">รายรับ</th>
                                                    <th className="px-6 py-4 text-right text-sm font-semibold text-cafe-700">กำไร</th>
                                                    <th className="px-6 py-4 text-right text-sm font-semibold text-cafe-700">💰 กำไร/ชิ้น</th>
                                                    <th className="px-6 py-4 text-center text-sm font-semibold text-cafe-700">% กำไร</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-cafe-50">
                                                {productGroups.map((product) => {
                                                    const profitMargin = product.totalRevenue > 0 ? (product.totalProfit / product.totalRevenue) * 100 : 0;
                                                    const profitPerItem = product.totalQuantity > 0 ? product.totalProfit / product.totalQuantity : 0;
                                                    const isExpanded = expandedProduct === (product.variantId || product.productId);
                                                    return (
                                                        <React.Fragment key={product.variantId || product.productId}>
                                                            <tr className="hover:bg-cafe-50/50 transition-colors cursor-pointer" onClick={() => toggleExpand(product.variantId || product.productId)}>
                                                                <td className="px-6 py-4"><button className="text-cafe-500 hover:text-cafe-700">{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button></td>
                                                                <td className="px-6 py-4"><div className="font-semibold text-cafe-900">{product.productName}</div><div className="text-xs text-cafe-500">{product.category}</div></td>
                                                                <td className="px-6 py-4 text-center font-medium text-cafe-800">{product.totalQuantity}</td>
                                                                <td className={`px-6 py-4 text-center font-medium ${product.totalEatGiveaway > 0 ? 'text-amber-600' : 'text-cafe-300'}`}>{product.totalEatGiveaway > 0 ? product.totalEatGiveaway : '-'}</td>
                                                                <td className={`px-6 py-4 text-center font-medium ${product.totalWaste > 0 ? 'text-red-600' : 'text-cafe-300'}`}>{product.totalWaste > 0 ? product.totalWaste : '-'}</td>
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
                                                                    <td colSpan={9} className="p-0">
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
                                                                                {product.dailySales.map((sale, index: number) => (
                                                                                    <div key={index} className="bg-white rounded-xl p-4 border border-cafe-100 hover:shadow-md transition-shadow">
                                                                                        {/* Row 1: Date, Market, Weather */}
                                                                                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-cafe-100">
                                                                                            <div className="flex items-center gap-4">
                                                                                                <div className="text-center min-w-[50px]">
                                                                                                    <div className="text-lg font-bold text-cafe-800">{new Date(sale.saleDate).toLocaleDateString('th-TH', { day: 'numeric' })}</div>
                                                                                                    <div className="text-xs text-cafe-500">{new Date(sale.saleDate).toLocaleDateString('th-TH', { month: 'short' })}</div>
                                                                                                </div>
                                                                                                <div className="h-8 w-px bg-cafe-200"></div>
                                                                                                <div>
                                                                                                    <div className="text-sm font-medium text-cafe-800">{markets.find(m => m.id === sale.marketId)?.name || sale.marketName || '-'}</div>
                                                                                                    {sale.weatherCondition && (
                                                                                                        <div className="flex items-center gap-1 text-xs text-cafe-500 mt-0.5">
                                                                                                            {getWeatherIcon(sale.weatherCondition)}
                                                                                                            <span>{sale.weatherCondition === 'sunny' ? 'แดดออก' : sale.weatherCondition === 'cloudy' ? 'มีเมฆ' : sale.weatherCondition === 'rain' ? 'ฝนตก' : sale.weatherCondition === 'storm' ? 'พายุ' : sale.weatherCondition}</span>
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
                                                                                                <div className="font-bold text-blue-800">{sale.quantitySold} ชิ้น</div>
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
                                                                                                <div className="font-bold text-cafe-800">{formatCurrency(sale.totalRevenue)}</div>
                                                                                            </div>
                                                                                            <div className="bg-green-50 rounded-lg p-2">
                                                                                                <div className="text-xs text-green-600">กำไร</div>
                                                                                                <div className="font-bold text-green-700">{formatCurrency(sale.grossProfit)}</div>
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
                                                    <td className="px-6 py-5 text-center text-xl text-amber-300">{summary.totalEatGiveaway > 0 ? summary.totalEatGiveaway : '-'}</td>
                                                    <td className="px-6 py-5 text-center text-xl text-red-300">{wasteSummary.totalWasteQty > 0 ? wasteSummary.totalWasteQty : '-'}</td>
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
                            <DetailedSalesReportModal isOpen={isDetailedReportOpen} onClose={() => setIsDetailedReportOpen(false)} defaultMarketId={selectedMarket} />


                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default SalesReport;
