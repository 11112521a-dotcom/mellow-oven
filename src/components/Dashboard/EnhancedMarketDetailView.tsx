// ============================================================
// 🏪 Enhanced Market Detail View Component
// Deep-dive analysis for a single market - REDESIGNED
// 🛡️ Mellow Oven Standards Compliance:
// - #17: Accessibility (aria-labels, button elements)
// - #22: 44px min button size
// - #16: Memoization for performance
// - #19: All constants named
// ============================================================

import React, { useMemo } from 'react';
import {
    X, TrendingUp, TrendingDown, Package, Calendar, Award, AlertTriangle,
    BarChart3, Download, Lightbulb, Star,
    ShoppingCart, Clock, DollarSign, Layers,
    ChevronLeft, Store
} from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';
import {
    EnhancedMarketData,
    ProductAnalysis,
    DailyBreakdown,
    DailyProductDetail,
    MarketInsight,
    calculateEnhancedMarketData,
    exportMarketToCSV,
    generateMarketPDFReport
} from '@/src/lib/dashboard/marketAnalysisUtils';
import { ProductSaleLog, DailyInventory } from '../../../types';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// ============================================================
// Props & Constants
// ============================================================

interface EnhancedMarketDetailViewProps {
    marketId: string;
    marketName: string;
    sales: ProductSaleLog[];
    totalRevenue: number;
    fromDate: string;
    toDate: string;
    onClose: () => void;
    isModal?: boolean;
    inventory?: DailyInventory[]; // NEW
}



// ============================================================
// Main Component
// ============================================================

export const EnhancedMarketDetailView: React.FC<EnhancedMarketDetailViewProps> = ({
    marketId,
    marketName,
    sales,
    totalRevenue,
    fromDate,
    toDate,
    onClose,
    isModal = true,
    inventory = [] // Default empty
}) => {
    // Calculate enhanced data
    const data = useMemo(() =>
        calculateEnhancedMarketData(sales, marketId, marketName, fromDate, toDate, totalRevenue, inventory),
        [sales, marketId, marketName, fromDate, toDate, totalRevenue, inventory]
    );

    // Handle backdrop click (modal only)
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (isModal && e.target === e.currentTarget) onClose();
    };

    // Handle ESC key (modal only)
    React.useEffect(() => {
        if (!isModal) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, isModal]);

    // Lock body scroll (modal only)
    React.useEffect(() => {
        if (!isModal) return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [isModal]);

    // Handle CSV export
    const handleExportCSV = () => {
        const csv = exportMarketToCSV(data);
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `market_${marketName}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Handle PDF export
    const handleExportPDF = () => {
        generateMarketPDFReport(data);
    };

    // ============================================================
    // Render Content
    // ============================================================
    const renderContent = () => (
        <>
            {/* ═══════════════════════════════════════════════════════════════
                🎨 HEADER
               ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 text-white">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        {!isModal && (
                            <button
                                onClick={onClose}
                                className="p-3 -ml-2 hover:bg-white/20 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                aria-label="กลับ"
                            >
                                <ChevronLeft size={28} />
                            </button>
                        )}
                        <div>
                            <h2 id="market-detail-title" className="text-2xl font-bold flex items-center gap-3">
                                <Store size={28} className="opacity-80" />
                                {marketName}
                            </h2>
                            <p className="text-amber-100 mt-1 flex items-center gap-2">
                                <Calendar size={14} />
                                {format(new Date(fromDate), 'd MMM', { locale: th })} - {format(new Date(toDate), 'd MMM yyyy', { locale: th })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportPDF}
                            className="p-3 hover:bg-white/20 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="ส่งออก PDF"
                            title="ส่งออก PDF"
                        >
                            <Download size={20} />
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="p-3 hover:bg-white/20 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="ส่งออก CSV"
                            title="ส่งออก CSV"
                        >
                            <BarChart3 size={20} />
                        </button>
                        {isModal && (
                            <button
                                onClick={onClose}
                                className="p-3 hover:bg-white/20 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                aria-label="ปิด"
                            >
                                <X size={24} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <QuickStat icon="💰" label="รายรับ" value={formatCurrency(data.metrics.revenue)} />
                    <QuickStat icon="📈" label="กำไร" value={formatCurrency(data.metrics.profit)} highlight />
                    <QuickStat icon="📦" label="ขายได้" value={`${data.metrics.soldQty} ชิ้น`} />
                    <QuickStat icon="🎯" label="สัดส่วน" value={`${data.metrics.marketContribution.toFixed(1)}%`} />
                </div>
            </div>

            <div className={`p-6 space-y-6 ${isModal ? 'max-h-[70vh] overflow-y-auto' : ''}`}>
                {/* ═══════════════════════════════════════════════════════════════
                        💡 SMART INSIGHTS
                       ═══════════════════════════════════════════════════════════════ */}
                {data.insights.length > 0 && (
                    <div className="bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Lightbulb size={18} className="text-amber-500" />
                            <span className="font-bold text-stone-700">สรุปอัตโนมัติ</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {data.insights.map((insight) => (
                                <InsightBadge key={insight.id} insight={insight} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════
                        📊 EXTENDED METRICS GRID (Always Visible)
                       ═══════════════════════════════════════════════════════════════ */}
                <section>
                    <h3 className="font-bold text-stone-700 mb-3 flex items-center gap-2">
                        📊 ตัวชี้วัดละเอียด
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <MetricCard
                            icon={<DollarSign size={18} className="text-sky-500" />}
                            label="รายรับรวม"
                            value={formatCurrency(data.metrics.revenue)}
                            bgColor="bg-sky-50"
                        />
                        <MetricCard
                            icon={<TrendingUp size={18} className="text-emerald-500" />}
                            label="กำไรสุทธิ"
                            value={formatCurrency(data.metrics.profit)}
                            subValue={`Margin ${data.metrics.margin.toFixed(1)}%`}
                            bgColor="bg-emerald-50"
                        />
                        <MetricCard
                            icon={<TrendingDown size={18} className="text-rose-500" />}
                            label="ต้นทุนรวม"
                            value={formatCurrency(data.metrics.cost)}
                            bgColor="bg-rose-50"
                        />
                        <MetricCard
                            icon={<Package size={18} className="text-violet-500" />}
                            label="ขายได้"
                            value={`${data.metrics.soldQty} ชิ้น`}
                            subValue={`${data.metrics.transactionCount} รายการ`}
                            bgColor="bg-violet-50"
                        />
                        <MetricCard
                            icon={<Clock size={18} className="text-amber-500" />}
                            label="รายรับ/วัน"
                            value={formatCurrency(data.metrics.revenuePerDay)}
                            subValue={`${data.metrics.activeDays} วันที่ขาย`}
                            bgColor="bg-amber-50"
                        />
                        <MetricCard
                            icon={<BarChart3 size={18} className="text-teal-500" />}
                            label="กำไร/วัน"
                            value={formatCurrency(data.metrics.profitPerDay)}
                            bgColor="bg-teal-50"
                        />
                        <MetricCard
                            icon={<ShoppingCart size={18} className="text-indigo-500" />}
                            label="ชิ้น/รายการ"
                            value={data.metrics.itemsPerTransaction.toFixed(1)}
                            subValue="เฉลี่ยต่อ transaction"
                            bgColor="bg-indigo-50"
                        />
                        <MetricCard
                            icon={<Layers size={18} className="text-orange-500" />}
                            label="สินค้าที่ขาย"
                            value={`${data.metrics.uniqueProductCount} รายการ`}
                            subValue="สินค้าที่แตกต่างกัน"
                            bgColor="bg-orange-50"
                        />
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                        �️ PRODUCT INTELLIGENCE (Always Visible)
                       ═══════════════════════════════════════════════════════════════ */}
                <section>
                    <h3 className="font-bold text-stone-700 mb-3 flex items-center gap-2">
                        🛍️ สินค้า ({data.productIntelligence.allProducts.length} รายการ)
                    </h3>

                    {/* Top 3 + Alerts */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        {/* Top 3 Products */}
                        <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Award size={16} className="text-amber-600" />
                                <span className="text-sm font-bold text-amber-700">🏆 Top 3 ขายดี</span>
                            </div>
                            <div className="space-y-1.5">
                                {data.productIntelligence.topProducts.map((p, idx) => (
                                    <div key={p.productId} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-5 h-5 rounded-full text-xs font-bold text-white flex items-center justify-center ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-stone-400' : 'bg-amber-600'
                                                }`}>
                                                {idx + 1}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="text-stone-700 truncate max-w-[120px]">{p.productName}</span>
                                                {p.variantName && <span className="text-xs text-stone-500 font-medium">({p.variantName})</span>}
                                            </div>
                                        </div>
                                        <span className="font-bold text-amber-700">{p.revenueShare.toFixed(0)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Low Margin */}
                        <div className="bg-rose-50 rounded-xl p-3 border border-rose-200">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={16} className="text-rose-600" />
                                <span className="text-sm font-bold text-rose-700">⚠️ Margin ต่ำ (&lt;20%)</span>
                            </div>
                            <div className="space-y-1">
                                {data.productIntelligence.lowMarginProducts.length > 0 ? (
                                    data.productIntelligence.lowMarginProducts.slice(0, 3).map((p) => (
                                        <div key={p.productId} className="flex items-center justify-between text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-stone-700 truncate max-w-[120px]">{p.productName}</span>
                                                {p.variantName && <span className="text-xs text-stone-500 font-medium">({p.variantName})</span>}
                                            </div>
                                            <span className="font-bold text-rose-600">{p.margin.toFixed(0)}%</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-stone-400 text-sm">ไม่มี 🎉</p>
                                )}
                            </div>
                        </div>

                        {/* High Margin Stars */}
                        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                            <div className="flex items-center gap-2 mb-2">
                                <Star size={16} className="text-emerald-600" />
                                <span className="text-sm font-bold text-emerald-700">🌟 Margin สูง (&gt;40%)</span>
                            </div>
                            <div className="space-y-1">
                                {data.productIntelligence.highMarginStars.length > 0 ? (
                                    data.productIntelligence.highMarginStars.slice(0, 3).map((p) => (
                                        <div key={p.productId} className="flex items-center justify-between text-sm">
                                            <div className="flex flex-col">
                                                <span className="text-stone-700 truncate max-w-[120px]">{p.productName}</span>
                                                {p.variantName && <span className="text-xs text-stone-400">({p.variantName})</span>}
                                            </div>
                                            <span className="font-bold text-emerald-600">{p.margin.toFixed(0)}%</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-stone-400 text-sm">ไม่มี</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Full Product Table */}
                    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-stone-50 text-stone-600">
                                    <tr>
                                        <th className="text-left px-3 py-2 font-medium">#</th>
                                        <th className="text-left px-3 py-2 font-medium">สินค้า</th>
                                        <th className="text-right px-3 py-2 font-medium">ขาย</th>
                                        <th className="text-right px-3 py-2 font-medium">รายรับ</th>
                                        <th className="text-right px-3 py-2 font-medium">ต้นทุน</th>
                                        <th className="text-right px-3 py-2 font-medium">กำไร</th>
                                        <th className="text-right px-3 py-2 font-medium">Margin</th>
                                        <th className="text-right px-3 py-2 font-medium text-purple-600">🔮 เป้าผลิต</th>
                                        <th className="text-right px-3 py-2 font-medium">สัดส่วน</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {data.productIntelligence.allProducts.map((product) => (
                                        <ProductRow key={product.productId + (product.variantName || '')} product={product} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════════
                        📆 DAILY BREAKDOWN WITH PRODUCTS (Card-based, Always Visible)
                       ═══════════════════════════════════════════════════════════════ */}
                <section>
                    <h3 className="font-bold text-stone-700 mb-3 flex items-center gap-2">
                        📆 รายละเอียดรายวัน ({data.dailyBreakdown.length} วัน)
                    </h3>

                    <div className="space-y-4">
                        {data.dailyBreakdown.map((day) => (
                            <DailyCard key={day.date} day={day} />
                        ))}
                    </div>
                </section>
            </div>

            {/* Footer */}
            {isModal && (
                <div className="border-t border-stone-200 p-4 bg-stone-50">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors min-h-[44px]"
                    >
                        ปิด
                    </button>
                </div>
            )}

            {!isModal && (
                <div className="border-t border-stone-200 p-4 bg-gradient-to-r from-amber-50 to-orange-50">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-3 px-6 py-4 bg-white text-stone-700 border border-amber-200 rounded-2xl font-bold hover:bg-amber-50 hover:border-amber-300 transition-all shadow-sm hover:shadow-md min-h-[44px] group"
                    >
                        <ChevronLeft size={24} className="text-amber-600 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-lg">กลับไปหน้าภาพรวมตลาด</span>
                    </button>
                </div>
            )}
        </>
    );

    // ============================================================
    // Return - Modal or Page wrapper
    // ============================================================

    if (isModal) {
        return (
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto"
                onClick={handleBackdropClick}
                role="dialog"
                aria-modal="true"
                aria-labelledby="market-detail-title"
            >
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl my-8 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    {renderContent()}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden animate-in fade-in duration-300">
            {renderContent()}
        </div>
    );
};

// ============================================================
// Helper Components
// ============================================================

const QuickStat: React.FC<{ icon: string; label: string; value: string; highlight?: boolean }> = ({
    icon, label, value, highlight
}) => (
    <div className={`rounded-xl p-2.5 ${highlight ? 'bg-white/30' : 'bg-white/20'}`}>
        <div className="flex items-center gap-1.5">
            <span>{icon}</span>
            <span className="text-xs text-amber-100">{label}</span>
        </div>
        <p className={`font-bold ${highlight ? 'text-white text-lg' : 'text-white'}`}>{value}</p>
    </div>
);

const MetricCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue?: string;
    bgColor: string;
}> = ({ icon, label, value, subValue, bgColor }) => (
    <div className={`${bgColor} rounded-xl p-3`}>
        <div className="flex items-center gap-2 mb-1.5">
            {icon}
            <span className="text-xs text-stone-600">{label}</span>
        </div>
        <p className="text-lg font-bold text-stone-800">{value}</p>
        {subValue && <p className="text-xs text-stone-500 mt-0.5">{subValue}</p>}
    </div>
);

const InsightBadge: React.FC<{ insight: MarketInsight }> = ({ insight }) => {
    const bgColor = {
        positive: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        negative: 'bg-rose-100 text-rose-800 border-rose-200',
        neutral: 'bg-stone-100 text-stone-700 border-stone-200',
        warning: 'bg-amber-100 text-amber-800 border-amber-200'
    }[insight.type];

    return (
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${bgColor} flex items-center gap-1.5`} title={insight.description}>
            <span>{insight.icon}</span>
            <span>{insight.title}</span>
        </div>
    );
};

const ProductRow: React.FC<{ product: ProductAnalysis }> = ({ product }) => {
    const isTopThree = product.rank <= 3;
    const rankColors = ['bg-amber-400', 'bg-stone-300', 'bg-amber-600'];

    return (
        <tr className={`hover:bg-stone-50 transition-colors ${isTopThree ? 'bg-amber-50/30' : ''}`}>
            <td className="px-3 py-2.5">
                {isTopThree ? (
                    <span className={`w-5 h-5 rounded-full text-xs font-bold text-white flex items-center justify-center ${rankColors[product.rank - 1]}`}>
                        {product.rank}
                    </span>
                ) : (
                    <span className="text-stone-400 text-xs">{product.rank}</span>
                )}
            </td>
            <td className="px-3 py-2.5">
                <span className="font-medium text-stone-800">{product.productName}</span>
                {product.variantName && (
                    <span className="text-stone-400 text-xs ml-1">({product.variantName})</span>
                )}
            </td>
            <td className="px-3 py-2.5 text-right font-medium">{product.soldQty}</td>
            <td className="px-3 py-2.5 text-right">{formatCurrency(product.revenue)}</td>
            <td className="px-3 py-2.5 text-right text-stone-500">{formatCurrency(product.cost)}</td>
            <td className="px-3 py-2.5 text-right font-bold text-emerald-600">{formatCurrency(product.profit)}</td>
            <td className="px-3 py-2.5 text-right">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${product.margin >= 40 ? 'bg-emerald-100 text-emerald-700' :
                    product.margin >= 20 ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                    }`}>
                    {product.margin.toFixed(1)}%
                </span>
            </td>
            <td className="px-3 py-2.5 text-right font-medium text-purple-600 bg-purple-50/50">
                {product.suggestedProduction ? (
                    <div className="flex flex-col items-end">
                        <span className="text-lg">{product.suggestedProduction}</span>
                        {product.seasonalityScore && product.seasonalityScore > 0.8 && (
                            <span className="text-[10px] text-emerald-500 font-normal">แม่นยำสูง</span>
                        )}
                    </div>
                ) : '-'}
            </td>
            <td className="px-3 py-2.5 text-right text-stone-600">{product.revenueShare.toFixed(1)}%</td>
        </tr>
    );
};

// ============================================================
// NEW: Daily Card with Per-Product Details
// ============================================================

const DailyCard: React.FC<{ day: DailyBreakdown }> = ({ day }) => {
    const borderColor = day.isBestDay ? 'border-emerald-300 bg-emerald-50/30' :
        day.isWorstDay ? 'border-rose-300 bg-rose-50/30' :
            'border-stone-200';

    return (
        <div className={`rounded-2xl border-2 ${borderColor} overflow-hidden`}>
            {/* Day Header */}
            <div className={`px-4 py-3 flex items-center justify-between ${day.isBestDay ? 'bg-emerald-100' : day.isWorstDay ? 'bg-rose-100' : 'bg-stone-100'}`}>
                <div className="flex items-center gap-3">
                    <div className="text-left min-w-[80px]">
                        <p className="text-lg font-bold text-stone-800">
                            {format(new Date(day.date), 'd MMMM yyyy', { locale: th })}
                        </p>
                    </div>
                    <div>
                        <p className="font-bold text-stone-700 flex items-center gap-2">
                            {day.dayName}
                            {day.isBestDay && <span className="text-emerald-600">🏆 วันที่ดีที่สุด</span>}
                            {day.isWorstDay && <span className="text-rose-600">📉 วันที่แย่ที่สุด</span>}
                        </p>
                        <p className="text-xs text-stone-500">
                            {day.transactionCount} รายการ • {day.soldQty} ชิ้น
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-stone-800">{formatCurrency(day.revenue)}</p>
                    <p className="text-sm text-emerald-600 font-medium">กำไร {formatCurrency(day.profit)}</p>
                </div>
            </div>

            {/* Products Sold This Day */}
            <div className="p-3">
                <table className="w-full text-sm">
                    <thead className="text-stone-500 text-xs">
                        <tr>
                            <th className="text-left py-1 font-medium">สินค้า</th>
                            {day.products.some(p => p.marketName) && <th className="text-left py-1 font-medium text-stone-500">ตลาด</th>}
                            <th className="text-right py-1 font-medium text-amber-600">เอาไป (ชิ้น)</th>
                            <th className="text-right py-1 font-medium text-stone-700">ขายได้ (ชิ้น)</th>
                            <th className="text-right py-1 font-medium text-rose-500">เหลือ (ชิ้น)</th>
                            <th className="text-right py-1 font-medium text-violet-500">กินแจก</th>
                            <th className="text-right py-1 font-medium text-rose-500">เสีย</th>
                            <th className="text-right py-1 font-medium">รายรับ</th>
                            <th className="text-right py-1 font-medium">กำไร</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {day.products.map((p) => (
                            <tr key={p.productId + (p.variantName || '')} className="hover:bg-stone-50">
                                <td className="py-1.5">
                                    <span className="text-stone-700 text-xs sm:text-sm">{p.productName}</span>
                                    {p.variantName && (
                                        <span className="text-stone-400 text-xs ml-1">({p.variantName})</span>
                                    )}
                                </td>
                                {day.products.some(prod => prod.marketName) && (
                                    <td className="py-1.5 text-left text-xs text-stone-500 font-medium">
                                        {p.marketName || '-'}
                                    </td>
                                )}
                                <td className="py-1.5 text-right font-medium text-amber-600">
                                    {p.preparedQty !== undefined ? p.preparedQty : '-'}
                                </td>
                                <td className="py-1.5 text-right font-bold text-stone-800">{p.quantity}</td>
                                <td className="py-1.5 text-right font-medium text-rose-500">
                                    {p.leftoverQty !== undefined && p.leftoverQty > 0 ? p.leftoverQty : (p.leftoverQty === 0 ? <span className="text-stone-300">-</span> : '-')}
                                </td>
                                <td className="py-1.5 text-right font-medium text-violet-500">
                                    {(p.eatQty || 0) + (p.giveawayQty || 0) > 0 ? (p.eatQty || 0) + (p.giveawayQty || 0) : '-'}
                                </td>
                                <td className="py-1.5 text-right font-medium text-rose-500">
                                    {p.wasteQty !== undefined && p.wasteQty > 0 ? p.wasteQty : '-'}
                                </td>
                                <td className="py-1.5 text-right text-stone-600">{formatCurrency(p.revenue)}</td>
                                <td className="py-1.5 text-right font-medium text-emerald-600">{formatCurrency(p.profit)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div >
    );
};

export default EnhancedMarketDetailView;
