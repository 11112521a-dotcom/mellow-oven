// ============================================================
// 📊 Comparison View Component
// Flexible period-to-period comparison with multiple presets
// 🛡️ Mellow Oven Standards Compliance:
// - #17: Accessibility (aria-labels, button elements)
// - #22: 44px min button size
// - #19: All constants named
// ============================================================

import React, { useMemo, useState } from 'react';
import { Calendar, ArrowRight, TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';
import {
    ComparisonPeriod,
    ComparisonMetrics,
    COMPARISON_PRESETS,
    getComparisonPeriod,
    calculateComparisonMetrics,
    formatDateRange,
    getChangeIndicator,
    formatChange,
    DateRange
} from '@/src/lib/dashboard/dashboardUtils';
import { ProductSaleLog, Market } from '../../../types';

interface ComparisonViewProps {
    sales: ProductSaleLog[];
    markets: Market[];
    selectedMarketId?: string;
    onMarketChange?: (marketId: string | undefined) => void;
}

// ============================================================
// Preset Options
// ============================================================
const PRESET_OPTIONS = [
    { id: COMPARISON_PRESETS.TODAY_VS_YESTERDAY, label: '📅 วันนี้ vs เมื่อวาน', shortLabel: 'วันนี้' },
    { id: COMPARISON_PRESETS.THIS_WEEK_VS_LAST, label: '📆 สัปดาห์นี้ vs ก่อน', shortLabel: 'สัปดาห์' },
    { id: COMPARISON_PRESETS.THIS_MONTH_VS_LAST, label: '🗓️ เดือนนี้ vs ก่อน', shortLabel: 'เดือน' },
    { id: COMPARISON_PRESETS.LAST_7_DAYS_VS_PREVIOUS, label: '📊 7 วันล่าสุด', shortLabel: '7 วัน' },
    { id: COMPARISON_PRESETS.LAST_30_DAYS_VS_PREVIOUS, label: '📈 30 วันล่าสุด', shortLabel: '30 วัน' },
];

export const ComparisonView: React.FC<ComparisonViewProps> = ({
    sales,
    markets,
    selectedMarketId,
    onMarketChange
}) => {
    const [activePreset, setActivePreset] = useState<string>(COMPARISON_PRESETS.TODAY_VS_YESTERDAY);
    const [showPresetDropdown, setShowPresetDropdown] = useState(false);

    // Get comparison period
    const comparisonPeriod = useMemo(() =>
        getComparisonPeriod(activePreset),
        [activePreset]
    );

    // Calculate comparison metrics
    const metrics = useMemo(() =>
        calculateComparisonMetrics(
            sales,
            comparisonPeriod.periodA,
            comparisonPeriod.periodB,
            selectedMarketId
        ),
        [sales, comparisonPeriod, selectedMarketId]
    );

    // Change indicator component
    const ChangeIndicator: React.FC<{ value: number; isInverted?: boolean }> = ({ value, isInverted }) => {
        const indicator = getChangeIndicator(value);
        const isPositive = isInverted ? indicator === 'down' : indicator === 'up';
        const isNegative = isInverted ? indicator === 'up' : indicator === 'down';

        if (indicator === 'same') {
            return (
                <span className="flex items-center gap-1 text-stone-500 text-sm">
                    <Minus size={14} /> เท่าเดิม
                </span>
            );
        }

        return (
            <span className={`flex items-center gap-1 text-sm font-bold ${isPositive ? 'text-emerald-600' :
                isNegative ? 'text-rose-600' :
                    'text-stone-500'
                }`}>
                {indicator === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {formatChange(value, true)}
            </span>
        );
    };

    return (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            {/* Header with Preset Selector */}
            <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-4 border-b border-amber-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-stone-800 flex items-center gap-2">
                            <RefreshCw size={18} className="text-amber-600" />
                            เปรียบเทียบช่วงเวลา
                        </h3>
                        <p className="text-sm text-stone-500 mt-1">
                            {formatDateRange(comparisonPeriod.periodA)} vs {formatDateRange(comparisonPeriod.periodB)}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {/* Preset Buttons (Desktop) */}
                        <div className="hidden md:flex gap-2">
                            {PRESET_OPTIONS.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => setActivePreset(preset.id)}
                                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-all min-h-[44px] ${activePreset === preset.id
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'bg-white text-stone-600 hover:bg-amber-50 border border-stone-200 hover:border-amber-300'
                                        }`}
                                    aria-pressed={activePreset === preset.id}
                                >
                                    {preset.shortLabel}
                                </button>
                            ))}
                        </div>

                        {/* Preset Dropdown (Mobile) */}
                        <div className="md:hidden relative">
                            <button
                                onClick={() => setShowPresetDropdown(!showPresetDropdown)}
                                className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-stone-200 text-stone-700 font-medium min-h-[44px]"
                            >
                                {PRESET_OPTIONS.find(p => p.id === activePreset)?.shortLabel}
                                <ChevronDown size={16} />
                            </button>
                            {showPresetDropdown && (
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 z-20 overflow-hidden">
                                    {PRESET_OPTIONS.map((preset) => (
                                        <button
                                            key={preset.id}
                                            onClick={() => {
                                                setActivePreset(preset.id);
                                                setShowPresetDropdown(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 text-sm transition-colors min-h-[44px] ${activePreset === preset.id
                                                ? 'bg-indigo-50 text-indigo-700 font-medium'
                                                : 'text-stone-700 hover:bg-stone-50'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Market Filter */}
                        {onMarketChange && (
                            <select
                                value={selectedMarketId || 'all'}
                                onChange={(e) => onMarketChange(e.target.value === 'all' ? undefined : e.target.value)}
                                className="px-4 py-2 bg-white rounded-xl border border-stone-200 text-stone-700 font-medium min-h-[44px] outline-none focus:ring-2 focus:ring-indigo-300"
                                aria-label="เลือกตลาด"
                            >
                                <option value="all">🏪 ทุกตลาด</option>
                                {markets.map((market) => (
                                    <option key={market.id} value={market.id}>
                                        {market.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-stone-50 text-sm text-stone-600">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">ตัวชี้วัด</th>
                            <th className="text-right px-4 py-3 font-medium">{comparisonPeriod.periodA.label}</th>
                            <th className="text-right px-4 py-3 font-medium">{comparisonPeriod.periodB.label}</th>
                            <th className="text-right px-4 py-3 font-medium">เปลี่ยนแปลง</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {/* Revenue */}
                        <tr className="hover:bg-stone-50 transition-colors">
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                                        💰
                                    </span>
                                    <span className="font-medium text-stone-800">รายรับ</span>
                                </div>
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-stone-800">
                                {formatCurrency(metrics.revenue.current)}
                            </td>
                            <td className="px-4 py-4 text-right text-stone-500">
                                {formatCurrency(metrics.revenue.previous)}
                            </td>
                            <td className="px-4 py-4 text-right">
                                <ChangeIndicator value={metrics.revenue.changePercent} />
                            </td>
                        </tr>

                        {/* Profit */}
                        <tr className="hover:bg-stone-50 transition-colors">
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        📈
                                    </span>
                                    <span className="font-medium text-stone-800">กำไร</span>
                                </div>
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-emerald-600">
                                {formatCurrency(metrics.profit.current)}
                            </td>
                            <td className="px-4 py-4 text-right text-stone-500">
                                {formatCurrency(metrics.profit.previous)}
                            </td>
                            <td className="px-4 py-4 text-right">
                                <ChangeIndicator value={metrics.profit.changePercent} />
                            </td>
                        </tr>

                        {/* Sold Qty */}
                        <tr className="hover:bg-stone-50 transition-colors">
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                                        📦
                                    </span>
                                    <span className="font-medium text-stone-800">ขายได้</span>
                                </div>
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-stone-800">
                                {metrics.soldQty.current.toLocaleString()} ชิ้น
                            </td>
                            <td className="px-4 py-4 text-right text-stone-500">
                                {metrics.soldQty.previous.toLocaleString()} ชิ้น
                            </td>
                            <td className="px-4 py-4 text-right">
                                <ChangeIndicator value={metrics.soldQty.changePercent} />
                            </td>
                        </tr>

                        {/* Margin */}
                        <tr className="hover:bg-stone-50 transition-colors">
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                                        📊
                                    </span>
                                    <span className="font-medium text-stone-800">Profit Margin</span>
                                </div>
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-stone-800">
                                {metrics.margin.current.toFixed(1)}%
                            </td>
                            <td className="px-4 py-4 text-right text-stone-500">
                                {metrics.margin.previous.toFixed(1)}%
                            </td>
                            <td className="px-4 py-4 text-right">
                                <ChangeIndicator value={metrics.margin.changePercent} />
                            </td>
                        </tr>

                        {/* Transaction Count */}
                        <tr className="hover:bg-stone-50 transition-colors">
                            <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                                        🛒
                                    </span>
                                    <span className="font-medium text-stone-800">จำนวนรายการ</span>
                                </div>
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-stone-800">
                                {metrics.transactionCount.current.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-right text-stone-500">
                                {metrics.transactionCount.previous.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-right">
                                <ChangeIndicator value={metrics.transactionCount.changePercent} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Summary Footer */}
            <div className="bg-gradient-to-r from-stone-50 to-stone-100 p-4 border-t border-stone-200">
                <div className="flex flex-wrap gap-4 justify-center text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-stone-500">รายรับเพิ่ม/ลด:</span>
                        <span className={`font-bold ${metrics.revenue.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatChange(metrics.revenue.change)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-stone-500">กำไรเพิ่ม/ลด:</span>
                        <span className={`font-bold ${metrics.profit.change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatChange(metrics.profit.change)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparisonView;
