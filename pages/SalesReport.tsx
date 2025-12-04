import React, { useState, useMemo } from 'react';
import { useStore } from '@/src/store';
import { formatCurrency } from '@/src/lib/utils';
import {
    TrendingUp,
    DollarSign,
    Package,
    ArrowLeft,
    Calendar,
    BarChart3,
    Percent,
    ShoppingBag,
    Edit2,
    ChevronDown,
    ChevronUp,
    Save,
    X
} from 'lucide-react';
import { RevenueTrendChart } from '@/src/components/SalesReport/RevenueTrendChart';
import { TopProductsChart } from '@/src/components/SalesReport/TopProductsChart';
import { MarketComparisonChart } from '@/src/components/SalesReport/MarketComparisonChart';
import { Modal } from '@/src/components/ui/Modal';
import { NumberInput } from '@/src/components/ui/NumberInput';

interface EditSalesModalProps {
    isOpen: boolean;
    onClose: () => void;
    saleData: any;
    onSave: (id: string, newQuantity: number) => void;
}

const EditSalesModal: React.FC<EditSalesModalProps> = ({ isOpen, onClose, saleData, onSave }) => {
    const [quantity, setQuantity] = useState(0);

    React.useEffect(() => {
        if (saleData) {
            setQuantity(saleData.quantity);
        }
    }, [saleData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (saleData) {
            onSave(saleData.id, quantity);
        }
    };

    if (!saleData) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="แก้ไขยอดขาย">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-cafe-50 p-4 rounded-lg mb-4">
                    <div className="text-sm text-cafe-500 mb-1">วันที่</div>
                    <div className="font-bold text-cafe-900">
                        {new Date(saleData.date).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-1">จำนวนที่ขาย (ชิ้น)</label>
                    <NumberInput
                        value={quantity}
                        onChange={setQuantity}
                        className="w-full p-2 border border-cafe-200 rounded-lg"
                        min={0}
                    />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-cafe-600 hover:bg-cafe-100 rounded-lg transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-cafe-600 text-white rounded-lg hover:bg-cafe-700 transition-colors"
                    >
                        บันทึก
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export const SalesReport: React.FC = () => {
    const { productSales, markets, products, updateProductSaleLog } = useStore();

    // Filter State - Default to TODAY
    const [datePreset, setDatePreset] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
    const [startDate, setStartDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedMarket, setSelectedMarket] = useState<string>('all');

    // Chart Toggle States
    const [topProductsMode, setTopProductsMode] = useState<'quantity' | 'revenue' | 'profit'>('revenue');
    const [marketComparisonMode, setMarketComparisonMode] = useState<'revenue' | 'profit' | 'quantity'>('revenue');

    // Expanded row state
    const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSale, setEditingSale] = useState<any>(null);

    const handleEditClick = (sale: any) => {
        setEditingSale(sale);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async (id: string, newQuantity: number) => {
        if (!editingSale) return;

        // Find the original report to get the price/cost info for recalculation
        const product = products.find(p => p.id === editingSale.productId);
        let defaultPrice = product?.price || 0;
        let defaultCost = product?.cost || 0;

        if (editingSale.variantId && product?.variants) {
            const variant = product.variants.find(v => v.id === editingSale.variantId);
            if (variant) {
                defaultPrice = variant.price;
                defaultCost = variant.cost;
            }
        }

        // Calculate from the existing sale data or product defaults
        const pricePerUnit = editingSale.quantity > 0 ? editingSale.revenue / editingSale.quantity : defaultPrice;
        const costPerUnit = editingSale.quantity > 0 ? editingSale.cost / editingSale.quantity : defaultCost;

        const newRevenue = newQuantity * pricePerUnit;
        const newCost = newQuantity * costPerUnit;
        const newProfit = newRevenue - newCost;

        await updateProductSaleLog(id, {
            quantitySold: newQuantity,
            totalRevenue: newRevenue,
            totalCost: newCost,
            grossProfit: newProfit
        });

        setIsEditModalOpen(false);
        setEditingSale(null);
    };

    // Apply Date Preset
    const applyDatePreset = (preset: typeof datePreset) => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        switch (preset) {
            case 'today':
                start = end = today;
                break;
            case 'yesterday':
                start = end = new Date(today.setDate(today.getDate() - 1));
                break;
            case 'week':
                start = new Date(today.setDate(today.getDate() - 7));
                end = new Date();
                break;
            case 'month':
                start = new Date(today.setMonth(today.getMonth() - 1));
                end = new Date();
                break;
        }

        if (preset !== 'custom') {
            setStartDate(start.toISOString().split('T')[0]);
            setEndDate(end.toISOString().split('T')[0]);
        }
        setDatePreset(preset);
    };

    // Filter Sales Data
    const filteredSales = useMemo(() => {
        return productSales.filter(sale => {
            const matchDate = sale.saleDate >= startDate && sale.saleDate <= endDate;
            const matchMarket = selectedMarket === 'all' || sale.marketId === selectedMarket;
            return matchDate && matchMarket;
        });
    }, [productSales, startDate, endDate, selectedMarket]);

    // Calculate Summary
    const summary = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalRevenue, 0);
        const totalCost = filteredSales.reduce((sum, s) => sum + s.totalCost, 0);
        const totalProfit = filteredSales.reduce((sum, s) => sum + s.grossProfit, 0);
        const totalQuantity = filteredSales.reduce((sum, s) => sum + s.quantitySold, 0);

        return {
            totalRevenue,
            totalCost,
            totalProfit,
            totalQuantity,
            profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        };
    }, [filteredSales]);

    // Group by Product with daily details
    const productGroups = useMemo(() => {
        const groups = filteredSales.reduce((acc, sale) => {
            const key = sale.variantId || sale.productId;

            if (!acc[key]) {
                acc[key] = {
                    productId: sale.productId,
                    variantId: sale.variantId,
                    productName: sale.variantName ? `${sale.productName} (${sale.variantName})` : sale.productName,
                    category: sale.category,
                    totalQuantity: 0,
                    totalRevenue: 0,
                    totalCost: 0,
                    totalProfit: 0,
                    dailySales: []
                };
            }

            acc[key].totalQuantity += sale.quantitySold;
            acc[key].totalRevenue += sale.totalRevenue;
            acc[key].totalCost += sale.totalCost;
            acc[key].totalProfit += sale.grossProfit;
            acc[key].dailySales.push({
                date: sale.saleDate,
                quantity: sale.quantitySold,
                revenue: sale.totalRevenue,
                cost: sale.totalCost,
                profit: sale.grossProfit,
                marketId: sale.marketId,
                id: sale.id, // Add ID for editing
                productId: sale.productId, // Add productId for price lookup
                variantId: sale.variantId
            });

            return acc;
        }, {} as Record<string, any>);

        return Object.values(groups).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
    }, [filteredSales]);

    // Prepare Revenue Trend Data
    const revenueTrendData = useMemo(() => {
        const dateMap = new Map<string, { revenue: number; profit: number }>();

        filteredSales.forEach(sale => {
            const existing = dateMap.get(sale.saleDate) || { revenue: 0, profit: 0 };
            dateMap.set(sale.saleDate, {
                revenue: existing.revenue + sale.totalRevenue,
                profit: existing.profit + sale.grossProfit
            });
        });

        return Array.from(dateMap.entries())
            .map(([date, data]) => ({
                date: new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
                revenue: data.revenue,
                profit: data.profit
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filteredSales]);

    // Prepare Top Products Data
    const topProductsData = useMemo(() => {
        return productGroups.slice(0, 10).map((product: any) => ({
            productName: product.productName,
            category: product.category,
            value: topProductsMode === 'quantity'
                ? product.totalQuantity
                : topProductsMode === 'revenue'
                    ? product.totalRevenue
                    : product.totalProfit
        }));
    }, [productGroups, topProductsMode]);

    // Prepare Market Comparison Data
    const marketComparisonData = useMemo(() => {
        const marketMap = new Map<string, { revenue: number; profit: number; quantity: number }>();

        filteredSales.forEach(sale => {
            const existing = marketMap.get(sale.marketId) || { revenue: 0, profit: 0, quantity: 0 };
            marketMap.set(sale.marketId, {
                revenue: existing.revenue + sale.totalRevenue,
                profit: existing.profit + sale.grossProfit,
                quantity: existing.quantity + sale.quantitySold
            });
        });

        return Array.from(marketMap.entries()).map(([marketId, data]) => {
            const market = markets.find(m => m.id === marketId);
            return {
                marketName: market?.name || marketId,
                revenue: data.revenue,
                profit: data.profit,
                quantity: data.quantity
            };
        });
    }, [filteredSales, markets]);

    const toggleExpand = (productId: string) => {
        setExpandedProduct(expandedProduct === productId ? null : productId);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => window.history.back()}
                    className="p-2 hover:bg-cafe-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={24} className="text-cafe-700" />
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-cafe-900">รายงานการขาย</h1>
                    <p className="text-cafe-500 mt-1">วิเคราะห์ยอดขายและกำไร</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-cafe-700 mb-2 flex items-center gap-2">
                            <Calendar size={16} />
                            ช่วงเวลา
                        </label>
                        <select
                            value={datePreset}
                            onChange={(e) => applyDatePreset(e.target.value as any)}
                            className="w-full p-3 border-2 border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent outline-none bg-white"
                        >
                            <option value="today">วันนี้</option>
                            <option value="yesterday">เมื่อวาน</option>
                            <option value="week">7 วันที่แล้ว</option>
                            <option value="month">30 วันที่แล้ว</option>
                            <option value="custom">กำหนดเอง</option>
                        </select>
                    </div>

                    {datePreset === 'custom' && (
                        <>
                            <div>
                                <label className="block text-sm font-semibold text-cafe-700 mb-2">วันที่เริ่ม</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-3 border-2 border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-cafe-700 mb-2">วันที่สิ้นสุด</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-3 border-2 border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent outline-none"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-cafe-700 mb-2">ตลาด</label>
                        <select
                            value={selectedMarket}
                            onChange={(e) => setSelectedMarket(e.target.value)}
                            className="w-full p-3 border-2 border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent outline-none bg-white"
                        >
                            <option value="all">ทั้งหมด</option>
                            {markets.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Cards - 5 cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl shadow-lg p-5">
                    <DollarSign size={28} className="opacity-80 mb-2" />
                    <p className="text-blue-100 text-xs mb-1">รายรับรวม</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl shadow-lg p-5">
                    <ShoppingBag size={28} className="opacity-80 mb-2" />
                    <p className="text-orange-100 text-xs mb-1">ต้นทุนรวม</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-lg p-5">
                    <TrendingUp size={28} className="opacity-80 mb-2" />
                    <p className="text-green-100 text-xs mb-1">กำไรรวม</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.totalProfit)}</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-lg p-5">
                    <Package size={28} className="opacity-80 mb-2" />
                    <p className="text-purple-100 text-xs mb-1">ปริมาณ</p>
                    <p className="text-2xl font-bold">{summary.totalQuantity}</p>
                    <p className="text-xs text-purple-100 mt-1">ชิ้น</p>
                </div>

                <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-2xl shadow-lg p-5">
                    <Percent size={28} className="opacity-80 mb-2" />
                    <p className="text-pink-100 text-xs mb-1">อัตรากำไร</p>
                    <p className="text-2xl font-bold">{summary.profitMargin.toFixed(1)}%</p>
                </div>
            </div>

            {/* Charts */}
            <div className="space-y-6">
                <RevenueTrendChart data={revenueTrendData} />

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Products Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                <BarChart3 size={20} />
                                Top 10 สินค้า
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setTopProductsMode('quantity')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${topProductsMode === 'quantity'
                                        ? 'bg-cafe-600 text-white'
                                        : 'bg-cafe-100 text-cafe-700 hover:bg-cafe-200'
                                        }`}
                                >
                                    จำนวน
                                </button>
                                <button
                                    onClick={() => setTopProductsMode('revenue')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${topProductsMode === 'revenue'
                                        ? 'bg-cafe-600 text-white'
                                        : 'bg-cafe-100 text-cafe-700 hover:bg-cafe-200'
                                        }`}
                                >
                                    รายรับ
                                </button>
                                <button
                                    onClick={() => setTopProductsMode('profit')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${topProductsMode === 'profit'
                                        ? 'bg-cafe-600 text-white'
                                        : 'bg-cafe-100 text-cafe-700 hover:bg-cafe-200'
                                        }`}
                                >
                                    กำไร
                                </button>
                            </div>
                        </div>
                        <TopProductsChart data={topProductsData} mode={topProductsMode} />
                    </div>

                    {/* Market Comparison Chart */}
                    <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                <BarChart3 size={20} />
                                เปรียบเทียบตลาด
                            </h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setMarketComparisonMode('revenue')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${marketComparisonMode === 'revenue'
                                        ? 'bg-cafe-600 text-white'
                                        : 'bg-cafe-100 text-cafe-700 hover:bg-cafe-200'
                                        }`}
                                >
                                    รายรับ
                                </button>
                                <button
                                    onClick={() => setMarketComparisonMode('profit')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${marketComparisonMode === 'profit'
                                        ? 'bg-cafe-600 text-white'
                                        : 'bg-cafe-100 text-cafe-700 hover:bg-cafe-200'
                                        }`}
                                >
                                    กำไร
                                </button>
                                <button
                                    onClick={() => setMarketComparisonMode('quantity')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${marketComparisonMode === 'quantity'
                                        ? 'bg-cafe-600 text-white'
                                        : 'bg-cafe-100 text-cafe-700 hover:bg-cafe-200'
                                        }`}
                                >
                                    จำนวน
                                </button>
                            </div>
                        </div>
                        <MarketComparisonChart data={marketComparisonData} mode={marketComparisonMode} />
                    </div>
                </div>
            </div>

            {/* Data Table with Expandable Rows */}
            <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden">
                <div className="p-5 bg-cafe-50 border-b border-cafe-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-cafe-900">รายละเอียดการขายรายเมนู</h3>
                    <p className="text-sm text-cafe-500">คลิกแถวเพื่อดูรายละเอียด</p>
                </div>

                {productGroups.length === 0 ? (
                    <div className="p-12 text-center text-cafe-500">
                        <p>ไม่มีข้อมูลในช่วงเวลานี้</p>
                        <p className="text-sm mt-2">ลองเปลี่ยนช่วงเวลาหรือตัวกรอง</p>
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
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-cafe-700">% กำไร</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cafe-50">
                                {productGroups.map((product: any) => {
                                    const profitMargin = (product.totalProfit / product.totalRevenue) * 100;
                                    const isExpanded = expandedProduct === (product.variantId || product.productId);

                                    return (
                                        <React.Fragment key={product.variantId || product.productId}>
                                            <tr
                                                className="hover:bg-cafe-50/50 transition-colors cursor-pointer"
                                                onClick={() => toggleExpand(product.variantId || product.productId)}
                                            >
                                                <td className="px-6 py-4">
                                                    <button className="text-cafe-500 hover:text-cafe-700">
                                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-cafe-900">{product.productName}</div>
                                                    <div className="text-xs text-cafe-500">{product.category}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-medium text-cafe-800">{product.totalQuantity}</td>
                                                <td className="px-6 py-4 text-right font-semibold text-cafe-900">{formatCurrency(product.totalRevenue)}</td>
                                                <td className="px-6 py-4 text-right font-bold text-green-600">{formatCurrency(product.totalProfit)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${profitMargin >= 60 ? 'bg-green-100 text-green-700' :
                                                        profitMargin >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {profitMargin.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>

                                            {/* Expandable Daily Details */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={6} className="p-0">
                                                        <div className="bg-cafe-50 p-4 border-t border-cafe-100">
                                                            <h4 className="text-md font-semibold text-cafe-800 mb-3">รายละเอียดรายวัน</h4>
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="text-cafe-600">
                                                                        <th className="text-left py-2">วันที่</th>
                                                                        <th className="text-center py-2">ตลาด</th>
                                                                        <th className="text-center py-2">จำนวน</th>
                                                                        <th className="text-right py-2">รายรับ</th>
                                                                        <th className="text-right py-2">กำไร</th>
                                                                        <th className="text-center py-2">แก้ไข</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {product.dailySales.map((sale: any, index: number) => (
                                                                        <tr key={index} className="border-t border-cafe-100">
                                                                            <td className="py-2 text-left">{new Date(sale.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</td>
                                                                            <td className="py-2 text-center">{markets.find(m => m.id === sale.marketId)?.name || sale.marketId}</td>
                                                                            <td className="py-2 text-center">{sale.quantity}</td>
                                                                            <td className="py-2 text-right">{formatCurrency(sale.revenue)}</td>
                                                                            <td className="py-2 text-right text-green-600">{formatCurrency(sale.profit)}</td>
                                                                            <td className="py-2 text-center">
                                                                                <button
                                                                                    onClick={() => handleEditClick(sale)}
                                                                                    className="text-cafe-500 hover:text-cafe-700 p-1 rounded-md hover:bg-cafe-100 transition-colors"
                                                                                >
                                                                                    <Edit2 size={16} />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                            <p className="text-xs text-cafe-500 mt-3">
                                                                💡 คลิกปุ่ม <Edit2 size={12} className="inline" /> เพื่อแก้ไขข้อมูลยอดขายในวันนั้น
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-cafe-900 text-white font-bold">
                                <tr>
                                    <td className="px-6 py-4"></td>
                                    <td className="px-6 py-4">รวมทั้งหมด</td>
                                    <td className="px-6 py-4 text-center text-lg">{summary.totalQuantity}</td>
                                    <td className="px-6 py-4 text-right text-lg">{formatCurrency(summary.totalRevenue)}</td>
                                    <td className="px-6 py-4 text-right text-lg text-green-300">{formatCurrency(summary.totalProfit)}</td>
                                    <td className="px-6 py-4 text-center text-lg">{summary.profitMargin.toFixed(1)}%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            <EditSalesModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                saleData={editingSale}
                onSave={handleSaveEdit}
            />
        </div>
    );
};

export default SalesReport;
