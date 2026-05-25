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
    { id: EXTENDED_COMPARISON_PRESETS.YEAR_OVER_YEAR_MONTH, label: '🎆 เทียบเดือนเดียวกันปีก่อน', shortLabel: 'เทียบปีก่อน' },
    { id: EXTENDED_COMPARISON_PRESETS.LAST_7_DAYS_VS_PREVIOUS, label: '📊 7 วันล่าสุด', shortLabel: '7 วัน' },
    { id: EXTENDED_COMPARISON_PRESETS.LAST_30_DAYS_VS_PREVIOUS, label: '📈 30 วันล่าสุด', shortLabel: '30 วัน' },
    { id: EXTENDED_COMPARISON_PRESETS.CUSTOM, label: '⚙️ กำหนดเอง (Custom)', shortLabel: 'กำหนดเอง' },
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
    
    // Custom Date Range states initialized with sensible defaults (last 7 days vs previous 7 days)
    const [customStartA, setCustomStartA] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [customEndA, setCustomEndA] = useState<string>(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [customStartB, setCustomStartB] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 15);
        return d.toISOString().split('T')[0];
    });
    const [customEndB, setCustomEndB] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() - 8);
        return d.toISOString().split('T')[0];
    });

    // Get durations of periods in days
    const durationA = useMemo(() => {
        if (!customStartA || !customEndA) return 0;
        const start = new Date(customStartA);
        const end = new Date(customEndA);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }, [customStartA, customEndA]);

    const durationB = useMemo(() => {
        if (!customStartB || !customEndB) return 0;
        const start = new Date(customStartB);
        const end = new Date(customEndB);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }, [customStartB, customEndB]);

    // Handlers for automatic calculation of Period B based on A
    const handleSetSameLengthB = () => {
        if (durationA <= 0 || !customStartA) return;
        const startA = new Date(customStartA);
        const startB = new Date(startA);
        startB.setDate(startB.getDate() - durationA);
        const endB = new Date(startA);
        endB.setDate(endB.getDate() - 1);
        
        setCustomStartB(startB.toISOString().split('T')[0]);
        setCustomEndB(endB.toISOString().split('T')[0]);
    };

    const handleSetPrevMonthB = () => {
        if (!customStartA || !customEndA) return;
        const startA = new Date(customStartA);
        const endA = new Date(customEndA);
        
        const startB = new Date(startA);
        startB.setMonth(startB.getMonth() - 1);
        const endB = new Date(endA);
        endB.setMonth(endB.getMonth() - 1);
        
        setCustomStartB(startB.toISOString().split('T')[0]);
        setCustomEndB(endB.toISOString().split('T')[0]);
    };

    const handleSetPrevYearB = () => {
        if (!customStartA || !customEndA) return;
        const startA = new Date(customStartA);
        const endA = new Date(customEndA);
        
        const startB = new Date(startA);
        startB.setFullYear(startB.getFullYear() - 1);
        const endB = new Date(endA);
        endB.setFullYear(endB.getFullYear() - 1);
        
        setCustomStartB(startB.toISOString().split('T')[0]);
        setCustomEndB(endB.toISOString().split('T')[0]);
    };

    // Get comparison periods
    const comparisonPeriod = useMemo(() => {
        if (activePreset === EXTENDED_COMPARISON_PRESETS.CUSTOM && customStartA && customEndA && customStartB && customEndB) {
            return getExtendedComparisonPeriod(activePreset, {
                from: startOfDay(new Date(customStartA)),
                to: endOfDay(new Date(customEndA)),
                label: `ช่วง A (${format(new Date(customStartA), 'd MMM', { locale: th })} - ${format(new Date(customEndA), 'd MMM yy', { locale: th })})`
            }, {
                from: startOfDay(new Date(customStartB)),
                to: endOfDay(new Date(customEndB)),
                label: `ช่วง B (${format(new Date(customStartB), 'd MMM', { locale: th })} - ${format(new Date(customEndB), 'd MMM yy', { locale: th })})`
            });
        }
        return getExtendedComparisonPeriod(activePreset);
    }, [activePreset, customStartA, customEndA, customStartB, customEndB]);

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
            <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-5 text-white">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <RefreshCw size={22} className="opacity-90 animate-spin-slow" />
                            เปรียบเทียบยอดขาย & กำไรต่างช่วงเวลา
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs mt-2 text-indigo-100 bg-black/10 px-3 py-2 rounded-lg border border-white/10">
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                                <strong>ช่วงหลัก (A):</strong> {formatDateRange(comparisonPeriod.periodA)}
                            </span>
                            <span className="opacity-50">vs</span>
                            <span className="flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                                <strong>ช่วงเปรียบเทียบ (B):</strong> {formatDateRange(comparisonPeriod.periodB)}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        {/* Preset Buttons */}
                        <div className="flex flex-wrap gap-1 bg-white/20 rounded-xl p-1">
                            {PRESET_OPTIONS.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => setActivePreset(preset.id)}
                                    className={`px-3 py-2 rounded-lg font-medium text-xs transition-all min-h-[36px] ${activePreset === preset.id
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
                ⚙️ CUSTOM DATE RANGE SELECTOR PANEL
               ═══════════════════════════════════════════════════════════════ */}
            {activePreset === EXTENDED_COMPARISON_PRESETS.CUSTOM && (
                <div className="bg-stone-50 border-b border-stone-200 p-4">
                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Period A Selection */}
                        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm relative flex flex-col justify-between">
                            <div>
                                <div className="absolute top-2.5 right-2.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                                    ช่วง A (ช่วงหลัก)
                                </div>
                                <h4 className="text-xs font-bold text-stone-700 mb-3 flex items-center gap-1.5">
                                    <Calendar size={14} className="text-indigo-500" />
                                    ระบุวันที่ช่วงเวลาหลัก (A)
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-stone-400 font-semibold mb-1">วันที่เริ่มต้น</label>
                                        <input
                                            type="date"
                                            value={customStartA}
                                            onChange={(e) => setCustomStartA(e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-stone-400 font-semibold mb-1">วันที่สิ้นสุด</label>
                                        <input
                                            type="date"
                                            value={customEndA}
                                            onChange={(e) => setCustomEndA(e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="mt-3 text-[10px] text-indigo-700 font-bold flex items-center gap-1 bg-indigo-50/70 border border-indigo-100 px-2.5 py-1 rounded-lg w-fit">
                                ⏱️ ระยะเวลาช่วง A: <span className="text-xs">{durationA}</span> วัน
                            </div>
                        </div>

                        {/* Period B Selection */}
                        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm relative flex flex-col justify-between">
                            <div>
                                <div className="absolute top-2.5 right-2.5 bg-amber-50 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                                    ช่วง B (ช่วงเทียบ)
                                </div>
                                <h4 className="text-xs font-bold text-stone-700 mb-3 flex items-center gap-1.5">
                                    <Calendar size={14} className="text-amber-600" />
                                    ระบุวันที่ช่วงเปรียบเทียบ (B)
                                </h4>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-[10px] text-stone-400 font-semibold mb-1">วันที่เริ่มต้น</label>
                                        <input
                                            type="date"
                                            value={customStartB}
                                            onChange={(e) => setCustomStartB(e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-stone-400 font-semibold mb-1">วันที่สิ้นสุด</label>
                                        <input
                                            type="date"
                                            value={customEndB}
                                            onChange={(e) => setCustomEndB(e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between gap-2 mt-2 pt-3 border-t border-stone-100 flex-wrap">
                                <div className="text-[10px] text-amber-800 font-bold flex items-center gap-1 bg-amber-50/70 border border-amber-100 px-2.5 py-1 rounded-lg w-fit">
                                    ⏱️ ระยะเวลาช่วง B: <span className="text-xs">{durationB}</span> วัน
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={handleSetSameLengthB}
                                        disabled={durationA <= 0}
                                        className="px-2 py-1 text-[10px] font-bold bg-amber-500 text-white hover:bg-amber-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-all min-h-[28px] flex items-center gap-1"
                                    >
                                        ⚡ ความยาวเท่ากับ A
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSetPrevMonthB}
                                        className="px-2 py-1 text-[10px] font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 active:scale-95 rounded-lg transition-all min-h-[28px] flex items-center gap-1 border border-stone-200"
                                    >
                                        🌙 ย้อนไป 1 เดือน
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSetPrevYearB}
                                        className="px-2 py-1 text-[10px] font-bold bg-stone-100 text-stone-700 hover:bg-stone-200 active:scale-95 rounded-lg transition-all min-h-[28px] flex items-center gap-1 border border-stone-200"
                                    >
                                        🎆 ย้อนไป 1 ปี
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Validation/Feedback Banner */}
                    <div className="max-w-4xl mx-auto mt-4 px-1">
                        {durationA !== durationB ? (
                            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900 shadow-sm animate-pulse-subtle">
                                <span className="text-base select-none">⚠️</span>
                                <div className="flex-1">
                                    <p className="font-bold text-amber-800">จำนวนวันเปรียบเทียบไม่เท่ากัน (Apple-to-Orange)</p>
                                    <p className="text-amber-700 mt-0.5 leading-relaxed">
                                        ช่วง A ({durationA} วัน) และ ช่วง B ({durationB} วัน) มีระยะเวลาไม่เท่ากัน ข้อมูลยอดขายรวมและกำไรสะสมอาจถูกเปรียบเทียบอย่างไม่สมเหตุสมผล แนะนำให้กดปุ่ม <strong className="text-amber-900 font-extrabold font-mono bg-amber-100 px-1 py-0.5 rounded">"⚡ ความยาวเท่ากับ A"</strong> เพื่อให้ข้อมูลจับคู่เทียบวันต่อวันได้อย่างแม่นยำ
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-emerald-955 shadow-sm">
                                <span className="text-base select-none">✨</span>
                                <div className="flex-1">
                                    <p className="font-bold text-emerald-800">ช่วงเวลาเทียบเท่ากันพอดี (Apple-to-Apple)</p>
                                    <p className="text-emerald-700 mt-0.5 leading-relaxed">
                                        ทั้งสองช่วงเวลามีระยะเวลาเท่ากันคือ {durationA} วัน การแสดงผลตัวชี้วัด สรุปวิเคราะห์ เปอร์เซ็นต์การเติบโต และความเคลื่อนไหวสินค้าจะมีความแม่นยำระดับ Geek สูงสุด!
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                                    <th className="text-right px-4 py-3 font-medium">
                                        <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-1.5"></span>
                                        {comparisonPeriod.periodA.label}
                                    </th>
                                    <th className="text-right px-4 py-3 font-medium">
                                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
                                        {comparisonPeriod.periodB.label}
                                    </th>
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
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                        {icon}
                    </div>
                    <span className="text-xs text-stone-600 font-semibold">{label}</span>
                </div>
                {/* Change Badge */}
                <div className={`flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${changeBg} ${changeColor}`}>
                    {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {metric.changePercent >= 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
                </div>
            </div>

            {/* Comparison values list */}
            <div className="space-y-1.5 border-t border-stone-100 pt-2.5">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        {periodA}
                    </span>
                    <span className="font-bold text-indigo-700">{formatValue(metric.current)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-stone-500 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        {periodB}
                    </span>
                    <span className="font-semibold text-amber-800">{formatValue(metric.previous)}</span>
                </div>
            </div>

            {subLabel && (
                <p className="text-[10px] text-stone-400 mt-1">{subLabel}</p>
            )}
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
            <td className="px-4 py-3 text-right font-bold text-indigo-700 bg-indigo-50/10">
                {formatCurrency(product.current.revenue)}
                <span className="block text-[11px] text-indigo-500 font-normal">{product.current.soldQty} ชิ้น</span>
            </td>
            <td className="px-4 py-3 text-right font-semibold text-amber-800 bg-amber-50/10">
                {formatCurrency(product.previous.revenue)}
                <span className="block text-[11px] text-amber-600 font-normal">{product.previous.soldQty} ชิ้น</span>
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
