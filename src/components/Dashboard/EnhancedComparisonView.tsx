// ============================================================
// 📊 Enhanced Comparison View Component - REDESIGNED
// Modern card-based period-to-period comparison
// 🛡️ Mellow Oven Standards Compliance:
// - #17: Accessibility (aria-labels, button elements)
// - #22: 44px min button size
// - #16: Memoization for performance
// - #19: All constants named
// ============================================================

import React, { useMemo, useState } from 'react';
import {
    Calendar, TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronUp,
    Download, Package, Lightbulb, ArrowUpRight, ArrowDownRight, Minus,
    DollarSign, ShoppingCart, Percent, Clock, BarChart3, Layers, Target
} from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';
import {
    ProductComparisonRow as ProductComparisonRowData,
    ComparisonInsight,
    EXTENDED_COMPARISON_PRESETS,
    getExtendedComparisonPeriod,
    calculateEnhancedComparisonMetrics,
    exportComparisonToCSV,
    MetricChange
} from '@/src/lib/dashboard/comparisonUtils';
import { formatDateRange } from '@/src/lib/dashboard/dashboardUtils';
import { ProductSaleLog, Market } from '../../../types';
import { endOfDay, startOfDay, format } from 'date-fns';
import { th } from 'date-fns/locale';

interface EnhancedComparisonViewProps {
    sales: ProductSaleLog[];
    markets: Market[];
    selectedMarketId?: string;
    onMarketChange?: (marketId: string | undefined) => void;
}

// ============================================================
// Constants
// ============================================================
const PRESET_OPTIONS = [
    { id: EXTENDED_COMPARISON_PRESETS.TODAY_VS_YESTERDAY, label: '📅 วันนี้ vs เมื่อวาน', shortLabel: 'วันนี้' },
    { id: EXTENDED_COMPARISON_PRESETS.THIS_WEEK_VS_LAST, label: '📆 สัปดาห์นี้ vs ก่อน', shortLabel: 'สัปดาห์' },
    { id: EXTENDED_COMPARISON_PRESETS.THIS_MONTH_VS_LAST, label: '🗓️ เดือนนี้ vs ก่อน', shortLabel: 'เดือน' },
    { id: EXTENDED_COMPARISON_PRESETS.LAST_7_DAYS_VS_PREVIOUS, label: '📊 7 วันล่าสุด', shortLabel: '7 วัน' },
    { id: EXTENDED_COMPARISON_PRESETS.LAST_30_DAYS_VS_PREVIOUS, label: '📈 30 วันล่าสุด', shortLabel: '30 วัน' },
];

const PRODUCT_DISPLAY_LIMIT = 10;

export const EnhancedComparisonView: React.FC<EnhancedComparisonViewProps> = ({
    sales,
    markets,
    selectedMarketId,
    onMarketChange
}) => {
    const [activePreset, setActivePreset] = useState<string>(EXTENDED_COMPARISON_PRESETS.THIS_MONTH_VS_LAST);
    const [showAllProducts, setShowAllProducts] = useState(false);
    const [customDateA, setCustomDateA] = useState<string>('');
    const [customDateB, setCustomDateB] = useState<string>('');

    // Get comparison periods
    const comparisonPeriod = useMemo(() => {
        if (activePreset === EXTENDED_COMPARISON_PRESETS.CUSTOM && customDateA && customDateB) {
            return getExtendedComparisonPeriod(activePreset, {
                from: startOfDay(new Date(customDateA)),
                to: endOfDay(new Date(customDateA)),
                label: format(new Date(customDateA), 'd MMM yyyy', { locale: th })
            }, {
                from: startOfDay(new Date(customDateB)),
                to: endOfDay(new Date(customDateB)),
                label: format(new Date(customDateB), 'd MMM yyyy', { locale: th })
            });
        }
        return getExtendedComparisonPeriod(activePreset);
    }, [activePreset, customDateA, customDateB]);

    // Calculate enhanced metrics
    const metrics = useMemo(() =>
        calculateEnhancedComparisonMetrics(
            sales,
            comparisonPeriod.periodA,
            comparisonPeriod.periodB,
            selectedMarketId
        ),
        [sales, comparisonPeriod, selectedMarketId]
    );

    // Products to display
    const displayProducts = useMemo(() => {
        if (showAllProducts) return metrics.productBreakdown;
        return metrics.productBreakdown.slice(0, PRODUCT_DISPLAY_LIMIT);
    }, [metrics.productBreakdown, showAllProducts]);

    // Handle CSV export
    const handleExport = () => {
        const csv = exportComparisonToCSV(metrics, comparisonPeriod.periodA, comparisonPeriod.periodB);
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comparison_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            {/* ═══════════════════════════════════════════════════════════════
                🎨 HEADER - Title, Period Selector, Filters
               ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 p-5 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <RefreshCw size={22} className="opacity-80" />
                            เปรียบเทียบช่วงเวลา
                        </h3>
                        <p className="text-indigo-100 mt-1 text-sm">
                            {formatDateRange(comparisonPeriod.periodA)} vs {formatDateRange(comparisonPeriod.periodB)}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        {/* Preset Buttons */}
                        <div className="flex gap-1 bg-white/20 rounded-xl p-1">
                            {PRESET_OPTIONS.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => setActivePreset(preset.id)}
                                    className={`px-3 py-2 rounded-lg font-medium text-sm transition-all min-h-[40px] ${activePreset === preset.id
                                        ? 'bg-white text-violet-700 shadow-sm'
                                        : 'text-white/90 hover:bg-white/20'
                                        }`}
                                    aria-pressed={activePreset === preset.id}
                                >
                                    {preset.shortLabel}
                                </button>
                            ))}
                        </div>

                        {/* Market Filter */}
                        {onMarketChange && (
                            <select
                                value={selectedMarketId || 'all'}
                                onChange={(e) => onMarketChange(e.target.value === 'all' ? undefined : e.target.value)}
                                className="px-3 py-2 bg-white/20 rounded-lg border border-white/30 text-white font-medium min-h-[44px] outline-none focus:ring-2 focus:ring-white/50 text-sm backdrop-blur-sm"
                                aria-label="เลือกตลาด"
                            >
                                <option value="all" className="text-stone-800">🏪 ทุกตลาด</option>
                                {markets.map((market) => (
                                    <option key={market.id} value={market.id} className="text-stone-800">
                                        {market.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        {/* Export Button */}
                        <button
                            onClick={handleExport}
                            className="p-2.5 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-all min-h-[44px] min-w-[44px] backdrop-blur-sm"
                            title="ส่งออก CSV"
                            aria-label="ส่งออก CSV"
                        >
                            <Download size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                💡 INSIGHTS BADGES
               ═══════════════════════════════════════════════════════════════ */}
            {metrics.insights.length > 0 && (
                <div className="p-4 border-b border-stone-100 bg-gradient-to-r from-amber-50/50 via-yellow-50/50 to-orange-50/50">
                    <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={16} className="text-amber-500" />
                        <span className="text-sm font-bold text-stone-700">สรุปอัตโนมัติ</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {metrics.insights.map((insight) => (
                            <InsightBadge key={insight.id} insight={insight} />
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                📊 MAIN METRICS - Card Grid Layout
               ═══════════════════════════════════════════════════════════════ */}
            <div className="p-5">
                {/* Primary Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <MetricCard
                        icon={<DollarSign size={20} />}
                        iconBg="bg-sky-100 text-sky-600"
                        label="รายรับ"
                        metric={metrics.revenue}
                        format="currency"
                        periodA={comparisonPeriod.periodA.label}
                        periodB={comparisonPeriod.periodB.label}
                    />
                    <MetricCard
                        icon={<TrendingUp size={20} />}
                        iconBg="bg-emerald-100 text-emerald-600"
                        label="กำไร"
                        metric={metrics.profit}
                        format="currency"
                        periodA={comparisonPeriod.periodA.label}
                        periodB={comparisonPeriod.periodB.label}
                        highlight
                    />
                    <MetricCard
                        icon={<Package size={20} />}
                        iconBg="bg-violet-100 text-violet-600"
                        label="ขายได้"
                        metric={metrics.soldQty}
                        format="qty"
                        periodA={comparisonPeriod.periodA.label}
                        periodB={comparisonPeriod.periodB.label}
                    />
                    <MetricCard
                        icon={<Percent size={20} />}
                        iconBg="bg-amber-100 text-amber-600"
                        label="Profit Margin"
                        metric={metrics.margin}
                        format="percent"
                        periodA={comparisonPeriod.periodA.label}
                        periodB={comparisonPeriod.periodB.label}
                    />
                </div>

                {/* Secondary Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                        icon={<Layers size={20} />}
                        iconBg="bg-rose-100 text-rose-600"
                        label="ต้นทุน"
                        metric={metrics.cost}
                        format="currency"
                        periodA={comparisonPeriod.periodA.label}
                        periodB={comparisonPeriod.periodB.label}
                        invertColor
                        compact
                    />
                    <MetricCard
                        icon={<ShoppingCart size={20} />}
                        iconBg="bg-indigo-100 text-indigo-600"
                        label="จำนวนรายการ"
                        metric={metrics.transactionCount}
                        format="number"
                        periodA={comparisonPeriod.periodA.label}
                        periodB={comparisonPeriod.periodB.label}
                        compact
                    />
                    <MetricCard
                        icon={<Target size={20} />}
                        iconBg="bg-teal-100 text-teal-600"
                        label="ราคาเฉลี่ย/ชิ้น"
                        metric={metrics.avgPrice}
                        format="currency"
                        periodA={comparisonPeriod.periodA.label}
                        periodB={comparisonPeriod.periodB.label}
                        compact
                    />
                    <MetricCard
                        icon={<Clock size={20} />}
                        iconBg="bg-orange-100 text-orange-600"
                        label="รายรับ/วัน"
                        metric={metrics.revenuePerDay}
                        format="currency"
                        periodA={comparisonPeriod.periodA.label}
                        periodB={comparisonPeriod.periodB.label}
                        subLabel={`${metrics.workingDays.current} vs ${metrics.workingDays.previous} วัน`}
                        compact
                    />
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                🔥 TOP MOVERS - Always Visible
               ═══════════════════════════════════════════════════════════════ */}

            <div className="px-5 pb-4" key={comparisonPeriod.periodA.label + activePreset}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Top Gainers */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                                <TrendingUp size={16} className="text-white" />
                            </div>
                            <span className="font-bold text-emerald-800">🔥 โตขึ้นมากที่สุด</span>
                        </div>
                        <div className="space-y-2 flex-grow">
                            {metrics.topGainers.length > 0 ? (
                                metrics.topGainers.slice(0, 5).map((p, idx) => (
                                    <div key={p.productId} className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full text-xs font-bold text-white flex items-center justify-center ${idx === 0 ? 'bg-emerald-500' : 'bg-emerald-400'
                                                }`}>
                                                {idx + 1}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="text-stone-700 font-medium truncate max-w-[140px]">
                                                    {p.productName}
                                                </span>
                                                {p.variantName && (
                                                    <span className="text-stone-500 font-medium text-xs truncate max-w-[80px]">
                                                        ({p.variantName})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-emerald-600 font-bold">
                                            <ArrowUpRight size={16} />
                                            +{p.change.revenuePercent.toFixed(0)}%
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-full min-h-[100px] text-stone-400 text-sm">
                                    ไม่มีรายการที่เติบโตโดดเด่น
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Losers */}
                    <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-200 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center">
                                <TrendingDown size={16} className="text-white" />
                            </div>
                            <span className="font-bold text-rose-800">⚠️ ลดลงมาก</span>
                        </div>
                        <div className="space-y-2 flex-grow">
                            {metrics.topLosers.length > 0 ? (
                                metrics.topLosers.slice(0, 5).map((p, idx) => (
                                    <div key={p.productId} className="flex items-center justify-between bg-white/60 rounded-xl px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full text-xs font-bold text-white flex items-center justify-center ${idx === 0 ? 'bg-rose-500' : 'bg-rose-400'
                                                }`}>
                                                {idx + 1}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="text-stone-700 font-medium truncate max-w-[140px]">
                                                    {p.productName}
                                                </span>
                                                {p.variantName && (
                                                    <span className="text-stone-500 font-medium text-xs truncate max-w-[80px]">
                                                        ({p.variantName})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-rose-600 font-bold">
                                            <ArrowDownRight size={16} />
                                            {p.change.revenuePercent.toFixed(0)}%
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-full min-h-[100px] text-stone-400 text-sm">
                                    ไม่มีรายการที่ลดลงผิดปกติ
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                📦 PRODUCT COMPARISON TABLE
               ═══════════════════════════════════════════════════════════════ */}
            <div className="border-t border-stone-200">
                <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Package size={18} className="text-indigo-500" />
                            <span className="font-bold text-stone-800">เปรียบเทียบรายสินค้า</span>
                            <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                                {metrics.productBreakdown.length} รายการ
                            </span>
                        </div>
                    </div>

                    {/* Product Table */}
                    <div className="bg-stone-50 rounded-xl overflow-hidden border border-stone-200">
                        <table className="w-full text-sm">
                            <thead className="bg-stone-100 text-stone-600">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium">สินค้า</th>
                                    <th className="text-right px-4 py-3 font-medium">{comparisonPeriod.periodA.label}</th>
                                    <th className="text-right px-4 py-3 font-medium">{comparisonPeriod.periodB.label}</th>
                                    <th className="text-right px-4 py-3 font-medium w-32">เปลี่ยนแปลง</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 bg-white">
                                {displayProducts.map((product, idx) => (
                                    <ProductTableRow
                                        key={product.productId + (product.variantName || '')}
                                        product={product}
                                        rank={idx + 1}
                                    />
                                ))}
                            </tbody>
                        </table>

                        {/* Show More Button */}
                        {metrics.productBreakdown.length > PRODUCT_DISPLAY_LIMIT && (
                            <div className="p-3 border-t border-stone-200 bg-stone-50">
                                <button
                                    onClick={() => setShowAllProducts(!showAllProducts)}
                                    className="w-full flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm py-2 hover:bg-indigo-50 rounded-lg transition-colors min-h-[44px]"
                                >
                                    {showAllProducts ? (
                                        <>ย่อรายการ <ChevronUp size={16} /></>
                                    ) : (
                                        <>ดูทั้งหมด ({metrics.productBreakdown.length - PRODUCT_DISPLAY_LIMIT} รายการเพิ่มเติม) <ChevronDown size={16} /></>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                📊 SUMMARY FOOTER
               ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 p-4 border-t border-indigo-100">
                <div className="flex flex-wrap gap-6 justify-center">
                    <SummaryItem
                        label="รายรับ"
                        value={metrics.revenue.change}
                        percent={metrics.revenue.changePercent}
                    />
                    <SummaryItem
                        label="กำไร"
                        value={metrics.profit.change}
                        percent={metrics.profit.changePercent}
                    />
                    <SummaryItem
                        label="ขายได้"
                        value={metrics.soldQty.change}
                        percent={metrics.soldQty.changePercent}
                        isCurrency={false}
                        unit="ชิ้น"
                    />
                </div>
            </div>
        </div>
    );
};

// ============================================================
// Helper Components
// ============================================================

interface MetricCardProps {
    icon: React.ReactNode;
    iconBg: string;
    label: string;
    metric: MetricChange;
    format: 'currency' | 'qty' | 'percent' | 'number';
    periodA: string;
    periodB: string;
    highlight?: boolean;
    invertColor?: boolean;
    compact?: boolean;
    subLabel?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
    icon, iconBg, label, metric, format: formatType, periodA, periodB,
    highlight, invertColor, compact, subLabel
}) => {
    const formatValue = (value: number) => {
        switch (formatType) {
            case 'currency': return formatCurrency(value);
            case 'qty': return `${value.toLocaleString()} ชิ้น`;
            case 'percent': return `${value.toFixed(1)}%`;
            case 'number': return value.toLocaleString();
            default: return value.toString();
        }
    };

    const isPositive = invertColor ? metric.changePercent <= 0 : metric.changePercent >= 0;
    const changeColor = isPositive ? 'text-emerald-600' : 'text-rose-600';
    const changeBg = isPositive ? 'bg-emerald-100' : 'bg-rose-100';

    return (
        <div className={`rounded-2xl p-4 border transition-all hover:shadow-md ${highlight
            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'
            : 'bg-white border-stone-200'
            }`}>
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
                    {icon}
                </div>
                <span className="text-sm text-stone-600 font-medium">{label}</span>
            </div>

            {/* Current Value */}
            <p className={`font-bold text-stone-800 ${compact ? 'text-lg' : 'text-2xl'}`}>
                {formatValue(metric.current)}
            </p>

            {/* Previous Value */}
            <p className="text-xs text-stone-400 mt-0.5">
                {periodB}: {formatValue(metric.previous)}
            </p>

            {subLabel && (
                <p className="text-xs text-stone-400">{subLabel}</p>
            )}

            {/* Change Badge */}
            <div className="mt-2 flex items-center gap-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${changeBg} ${changeColor}`}>
                    {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {metric.changePercent >= 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
                </div>
            </div>
        </div>
    );
};

const InsightBadge: React.FC<{ insight: ComparisonInsight }> = ({ insight }) => {
    const bgColor = {
        positive: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        negative: 'bg-rose-100 text-rose-800 border-rose-200',
        neutral: 'bg-stone-100 text-stone-700 border-stone-200',
        warning: 'bg-amber-100 text-amber-800 border-amber-200'
    }[insight.type];

    return (
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${bgColor} flex items-center gap-1.5`}>
            <span>{insight.icon}</span>
            <span>{insight.title}</span>
        </div>
    );
};

interface ProductComparisonRowProps {
    product: ProductComparisonRowData;
    rank: number;
}

const ProductTableRow: React.FC<ProductComparisonRowProps> = ({ product, rank }) => {
    const isTopThree = rank <= 3;
    const rankColors = ['bg-amber-400', 'bg-stone-300', 'bg-amber-600'];
    const isPositive = product.change.revenuePercent >= 0;

    return (
        <tr className={`hover:bg-stone-50 transition-colors ${isTopThree ? 'bg-amber-50/30' : ''}`}>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    {isTopThree && (
                        <span className={`w-5 h-5 rounded-full text-xs font-bold text-white flex items-center justify-center ${rankColors[rank - 1]}`}>
                            {rank}
                        </span>
                    )}
                    <div>
                        <span className="font-medium text-stone-800">{product.productName}</span>
                        {product.variantName && (
                            <span className="text-stone-500 font-medium text-xs ml-1">({product.variantName})</span>
                        )}
                        {product.isNew && (
                            <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">ใหม่</span>
                        )}
                        {product.isGone && (
                            <span className="ml-2 text-xs bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">หายไป</span>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 text-right font-bold text-stone-800">
                {formatCurrency(product.current.revenue)}
                <span className="block text-xs text-stone-400 font-normal">{product.current.soldQty} ชิ้น</span>
            </td>
            <td className="px-4 py-3 text-right text-stone-500">
                {formatCurrency(product.previous.revenue)}
                <span className="block text-xs text-stone-400">{product.previous.soldQty} ชิ้น</span>
            </td>
            <td className="px-4 py-3 text-right">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                    {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {product.change.revenuePercent >= 0 ? '+' : ''}{product.change.revenuePercent.toFixed(0)}%
                </div>
            </td>
        </tr>
    );
};

interface SummaryItemProps {
    label: string;
    value: number;
    percent: number;
    isCurrency?: boolean;
    unit?: string;
}

const SummaryItem: React.FC<SummaryItemProps> = ({
    label, value, percent, isCurrency = true, unit
}) => {
    const isPositive = percent >= 0;
    const color = isPositive ? 'text-emerald-600' : 'text-rose-600';

    return (
        <div className="flex items-center gap-2">
            <span className="text-stone-500 text-sm">{label}:</span>
            <span className={`font-bold ${color}`}>
                {value >= 0 ? '+' : ''}
                {isCurrency ? `฿${value.toLocaleString()}` : `${value.toLocaleString()} ${unit || ''}`}
            </span>
            <span className={`text-xs ${color} bg-white px-2 py-0.5 rounded-full border ${isPositive ? 'border-emerald-200' : 'border-rose-200'
                }`}>
                {percent >= 0 ? '+' : ''}{percent.toFixed(1)}%
            </span>
        </div>
    );
};

export default EnhancedComparisonView;
