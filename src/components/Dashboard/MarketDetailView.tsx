// ============================================================
// 🏪 Market Detail View Component
// Shows comprehensive detailed data for a selected market
// 🛡️ Mellow Oven Standards Compliance:
// - #17: Accessibility (aria-labels, button elements)
// - #22: 44px min button size
// - #16: Memoization for performance
// ============================================================

import React, { useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Package, Calendar, Award, AlertTriangle, BarChart3, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';
import { DetailedMarketData } from '@/src/lib/dashboard/dashboardUtils';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

interface MarketDetailViewProps {
    data: DetailedMarketData;
    onClose: () => void;
    onNavigateToProduct?: (productId: string) => void;
}

// ============================================================
// Constants (Rule #19)
// ============================================================
const PRODUCT_DISPLAY_LIMIT = 10;
const DAILY_DISPLAY_LIMIT = 7;

export const MarketDetailView: React.FC<MarketDetailViewProps> = ({
    data,
    onClose,
    onNavigateToProduct
}) => {
    const [showAllProducts, setShowAllProducts] = React.useState(false);
    const [showAllDays, setShowAllDays] = React.useState(false);

    // Products to display
    const displayedProducts = useMemo(() => {
        if (showAllProducts) return data.productBreakdown;
        return data.productBreakdown.slice(0, PRODUCT_DISPLAY_LIMIT);
    }, [data.productBreakdown, showAllProducts]);

    // Days to display
    const displayedDays = useMemo(() => {
        const sorted = [...data.dailyBreakdown].sort((a, b) => b.date.localeCompare(a.date));
        if (showAllDays) return sorted;
        return sorted.slice(0, DAILY_DISPLAY_LIMIT);
    }, [data.dailyBreakdown, showAllDays]);

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    // Handle ESC key
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Lock body scroll
    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="market-detail-title"
        >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 id="market-detail-title" className="text-2xl font-bold flex items-center gap-3">
                                🏪 {data.marketName}
                            </h2>
                            <p className="text-amber-100 mt-1">รายละเอียดการขายทั้งหมด</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-white/20 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="ปิด"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* ═══════════════════════════════════════════════════════════════
                        📊 KEY METRICS GRID
                       ═══════════════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            label="รายรับรวม"
                            value={formatCurrency(data.revenue)}
                            icon={<TrendingUp className="text-sky-500" size={20} />}
                            bgColor="bg-sky-50"
                        />
                        <MetricCard
                            label="กำไรสุทธิ"
                            value={formatCurrency(data.profit)}
                            subValue={`Margin ${data.margin.toFixed(1)}%`}
                            icon={<TrendingUp className="text-emerald-500" size={20} />}
                            bgColor="bg-emerald-50"
                        />
                        <MetricCard
                            label="ขายได้"
                            value={`${data.soldQty} ชิ้น`}
                            subValue={`${data.transactionCount} รายการ`}
                            icon={<Package className="text-violet-500" size={20} />}
                            bgColor="bg-violet-50"
                        />
                        <MetricCard
                            label="เฉลี่ย/รายการ"
                            value={formatCurrency(data.avgTransactionValue)}
                            icon={<BarChart3 className="text-amber-500" size={20} />}
                            bgColor="bg-amber-50"
                        />
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
                        📈 PERFORMANCE INDICATORS
                       ═══════════════════════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100">
                            <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                <Award size={18} />
                                <span className="font-medium text-sm">วันที่ขายดีที่สุด</span>
                            </div>
                            {data.bestDay ? (
                                <>
                                    <p className="text-lg font-bold text-emerald-700">
                                        {format(new Date(data.bestDay.date), 'd MMM yyyy', { locale: th })}
                                    </p>
                                    <p className="text-sm text-emerald-600">{formatCurrency(data.bestDay.revenue)}</p>
                                </>
                            ) : (
                                <p className="text-stone-400">ไม่มีข้อมูล</p>
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-4 border border-rose-100">
                            <div className="flex items-center gap-2 text-rose-600 mb-2">
                                <AlertTriangle size={18} />
                                <span className="font-medium text-sm">วันที่ขายน้อยที่สุด</span>
                            </div>
                            {data.worstDay ? (
                                <>
                                    <p className="text-lg font-bold text-rose-700">
                                        {format(new Date(data.worstDay.date), 'd MMM yyyy', { locale: th })}
                                    </p>
                                    <p className="text-sm text-rose-600">{formatCurrency(data.worstDay.revenue)}</p>
                                </>
                            ) : (
                                <p className="text-stone-400">ไม่มีข้อมูล</p>
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-100">
                            <div className="flex items-center gap-2 text-sky-600 mb-2">
                                <Calendar size={18} />
                                <span className="font-medium text-sm">ค่าเฉลี่ยต่อวัน</span>
                            </div>
                            <p className="text-lg font-bold text-sky-700">{formatCurrency(data.avgDailyRevenue)}</p>
                            <p className="text-sm text-sky-600">กำไร {formatCurrency(data.avgDailyProfit)}</p>
                        </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
                        📦 PRODUCT BREAKDOWN TABLE
                       ═══════════════════════════════════════════════════════════════ */}
                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                        <div className="bg-stone-50 px-4 py-3 border-b border-stone-200 flex items-center justify-between">
                            <h3 className="font-bold text-stone-700 flex items-center gap-2">
                                <Package size={18} className="text-indigo-500" />
                                รายละเอียดสินค้า ({data.productBreakdown.length} รายการ)
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-stone-50 text-stone-600">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-medium">สินค้า</th>
                                        <th className="text-right px-4 py-3 font-medium">ขายได้</th>
                                        <th className="text-right px-4 py-3 font-medium">รายรับ</th>
                                        <th className="text-right px-4 py-3 font-medium">ต้นทุน</th>
                                        <th className="text-right px-4 py-3 font-medium">กำไร</th>
                                        <th className="text-right px-4 py-3 font-medium">Margin</th>
                                        <th className="text-right px-4 py-3 font-medium">ราคาเฉลี่ย</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {displayedProducts.map((product, idx) => (
                                        <tr
                                            key={product.productId + (product.variantName || '')}
                                            className={`hover:bg-stone-50 transition-colors ${idx < 3 ? 'bg-amber-50/30' : ''}`}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    {idx < 3 && (
                                                        <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${idx === 0 ? 'bg-amber-400 text-white' :
                                                            idx === 1 ? 'bg-stone-300 text-white' :
                                                                'bg-amber-600 text-white'
                                                            }`}>
                                                            {idx + 1}
                                                        </span>
                                                    )}
                                                    <span className="font-medium text-stone-800">
                                                        {product.productName}
                                                        {product.variantName && (
                                                            <span className="text-stone-500 ml-1">({product.variantName})</span>
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">{product.soldQty}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(product.revenue)}</td>
                                            <td className="px-4 py-3 text-right text-stone-500">{formatCurrency(product.cost)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(product.profit)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.margin >= 40 ? 'bg-emerald-100 text-emerald-700' :
                                                    product.margin >= 25 ? 'bg-amber-100 text-amber-700' :
                                                        'bg-rose-100 text-rose-700'
                                                    }`}>
                                                    {product.margin.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-stone-600">{formatCurrency(product.avgPrice)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {data.productBreakdown.length > PRODUCT_DISPLAY_LIMIT && (
                            <div className="px-4 py-3 border-t border-stone-200">
                                <button
                                    onClick={() => setShowAllProducts(!showAllProducts)}
                                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm min-h-[44px]"
                                >
                                    {showAllProducts ? (
                                        <>ย่อรายการ <ChevronUp size={16} /></>
                                    ) : (
                                        <>ดูทั้งหมด ({data.productBreakdown.length - PRODUCT_DISPLAY_LIMIT} รายการเพิ่มเติม) <ChevronDown size={16} /></>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ═══════════════════════════════════════════════════════════════
                        📅 DAILY BREAKDOWN
                       ═══════════════════════════════════════════════════════════════ */}
                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                        <div className="bg-stone-50 px-4 py-3 border-b border-stone-200">
                            <h3 className="font-bold text-stone-700 flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-500" />
                                รายละเอียดรายวัน ({data.dailyBreakdown.length} วัน)
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-stone-50 text-stone-600">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-medium">วันที่</th>
                                        <th className="text-right px-4 py-3 font-medium">รายรับ</th>
                                        <th className="text-right px-4 py-3 font-medium">กำไร</th>
                                        <th className="text-right px-4 py-3 font-medium">ขายได้</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {displayedDays.map((day) => (
                                        <tr key={day.date} className="hover:bg-stone-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-stone-800">
                                                {format(new Date(day.date), 'EEEE d MMM', { locale: th })}
                                            </td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(day.revenue)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(day.profit)}</td>
                                            <td className="px-4 py-3 text-right">{day.soldQty} ชิ้น</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {data.dailyBreakdown.length > DAILY_DISPLAY_LIMIT && (
                            <div className="px-4 py-3 border-t border-stone-200">
                                <button
                                    onClick={() => setShowAllDays(!showAllDays)}
                                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm min-h-[44px]"
                                >
                                    {showAllDays ? (
                                        <>ย่อรายการ <ChevronUp size={16} /></>
                                    ) : (
                                        <>ดูทั้งหมด ({data.dailyBreakdown.length - DAILY_DISPLAY_LIMIT} วันเพิ่มเติม) <ChevronDown size={16} /></>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-stone-200 p-4 bg-stone-50">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors min-h-[44px]"
                    >
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// Helper Components
// ============================================================

const MetricCard: React.FC<{
    label: string;
    value: string;
    subValue?: string;
    icon: React.ReactNode;
    bgColor: string;
}> = ({ label, value, subValue, icon, bgColor }) => (
    <div className={`${bgColor} rounded-xl p-4`}>
        <div className="flex items-center gap-2 mb-2">
            {icon}
            <span className="text-sm text-stone-600">{label}</span>
        </div>
        <p className="text-xl font-bold text-stone-800">{value}</p>
        {subValue && <p className="text-xs text-stone-500 mt-1">{subValue}</p>}
    </div>
);

export default MarketDetailView;
