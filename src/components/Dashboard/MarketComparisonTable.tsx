// ============================================================
// 🏪 Market Comparison Table Component
// Shows all markets in a comparison table with click-to-expand
// 🛡️ Mellow Oven Standards Compliance:
// - #17: Accessibility (aria-labels, button elements)
// - #22: 44px min button size
// - #16: Memoization for performance
// ============================================================

import React, { useMemo, useState } from 'react';
import { Store, TrendingUp, ChevronRight, Search, ArrowUpDown } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';
import { MarketMetrics, calculateAllMarketsMetrics, DateRange } from '@/src/lib/dashboard/dashboardUtils';
import { ProductSaleLog, Market } from '../../../types';

interface MarketComparisonTableProps {
    sales: ProductSaleLog[];
    markets: Market[];
    dateRange: DateRange;
    onViewMarketDetail: (marketId: string) => void;
}

type SortField = 'revenue' | 'profit' | 'soldQty' | 'margin';
type SortDirection = 'asc' | 'desc';

export const MarketComparisonTable: React.FC<MarketComparisonTableProps> = ({
    sales,
    markets,
    dateRange,
    onViewMarketDetail
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('revenue');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Calculate metrics for all markets
    const marketsMetrics = useMemo(() =>
        calculateAllMarketsMetrics(sales, markets, dateRange),
        [sales, markets, dateRange]
    );

    // Filter and sort
    const filteredMarkets = useMemo(() => {
        let result = marketsMetrics;

        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(m => m.marketName.toLowerCase().includes(query));
        }

        // Sort
        result = [...result].sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
        });

        return result;
    }, [marketsMetrics, searchQuery, sortField, sortDirection]);

    // Total across all markets
    const totals = useMemo(() => {
        return {
            revenue: marketsMetrics.reduce((sum, m) => sum + m.revenue, 0),
            profit: marketsMetrics.reduce((sum, m) => sum + m.profit, 0),
            soldQty: marketsMetrics.reduce((sum, m) => sum + m.soldQty, 0),
            margin: marketsMetrics.length > 0
                ? marketsMetrics.reduce((sum, m) => sum + m.profit, 0) / marketsMetrics.reduce((sum, m) => sum + m.revenue, 0) * 100
                : 0
        };
    }, [marketsMetrics]);

    // Handle sort click
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // Sort header component
    const SortableHeader: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
        <button
            onClick={() => handleSort(field)}
            className={`flex items-center gap-1 font-medium hover:text-indigo-600 transition-colors min-h-[44px] ${sortField === field ? 'text-indigo-600' : 'text-stone-600'
                }`}
            aria-label={`เรียงตาม ${label}`}
        >
            {label}
            <ArrowUpDown size={14} className={sortField === field ? 'opacity-100' : 'opacity-40'} />
        </button>
    );

    return (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 p-4 border-b border-orange-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-stone-800 flex items-center gap-2">
                            <Store size={18} className="text-orange-600" />
                            เปรียบเทียบตลาด
                        </h3>
                        <p className="text-sm text-stone-500 mt-1">
                            {markets.length} ตลาด · {dateRange.label}
                        </p>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ค้นหาตลาด..."
                            className="pl-10 pr-4 py-2 w-full md:w-64 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-violet-300 min-h-[44px]"
                            aria-label="ค้นหาตลาด"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Row */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-indigo-200 text-xs">รายรับรวม</p>
                        <p className="font-bold text-lg">{formatCurrency(totals.revenue)}</p>
                    </div>
                    <div>
                        <p className="text-indigo-200 text-xs">กำไรรวม</p>
                        <p className="font-bold text-lg">{formatCurrency(totals.profit)}</p>
                    </div>
                    <div>
                        <p className="text-indigo-200 text-xs">ขายรวม</p>
                        <p className="font-bold text-lg">{totals.soldQty.toLocaleString()} ชิ้น</p>
                    </div>
                    <div>
                        <p className="text-indigo-200 text-xs">Avg Margin</p>
                        <p className="font-bold text-lg">{totals.margin.toFixed(1)}%</p>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-stone-50 text-sm">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium text-stone-600">ตลาด</th>
                            <th className="text-right px-4 py-3">
                                <SortableHeader field="revenue" label="รายรับ" />
                            </th>
                            <th className="text-right px-4 py-3">
                                <SortableHeader field="profit" label="กำไร" />
                            </th>
                            <th className="text-right px-4 py-3">
                                <SortableHeader field="soldQty" label="ขายได้" />
                            </th>
                            <th className="text-right px-4 py-3">
                                <SortableHeader field="margin" label="Margin" />
                            </th>
                            <th className="text-right px-4 py-3 font-medium text-stone-600">Top Product</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {filteredMarkets.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                                    {searchQuery ? 'ไม่พบตลาดที่ค้นหา' : 'ไม่มีข้อมูลการขาย'}
                                </td>
                            </tr>
                        ) : (
                            filteredMarkets.map((market, idx) => (
                                <tr
                                    key={market.marketId}
                                    className="hover:bg-stone-50 transition-colors cursor-pointer group"
                                    onClick={() => onViewMarketDetail(market.marketId)}
                                >
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-amber-400 text-white' :
                                                idx === 1 ? 'bg-stone-300 text-white' :
                                                    idx === 2 ? 'bg-amber-600 text-white' :
                                                        'bg-stone-100 text-stone-500'
                                                }`}>
                                                {idx + 1}
                                            </span>
                                            <span className="font-medium text-stone-800">{market.marketName}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right font-bold text-stone-800">
                                        {formatCurrency(market.revenue)}
                                    </td>
                                    <td className="px-4 py-4 text-right font-bold text-emerald-600">
                                        {formatCurrency(market.profit)}
                                    </td>
                                    <td className="px-4 py-4 text-right text-stone-600">
                                        {market.soldQty.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${market.margin >= 40 ? 'bg-emerald-100 text-emerald-700' :
                                            market.margin >= 25 ? 'bg-amber-100 text-amber-700' :
                                                'bg-rose-100 text-rose-700'
                                            }`}>
                                            {market.margin.toFixed(1)}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-right text-stone-500 text-sm">
                                        <div className="flex flex-col items-end">
                                            <span>{market.topProducts[0]?.productName || '-'}</span>
                                            {market.topProducts[0]?.variantName && (
                                                <span className="text-xs text-stone-500 font-medium">({market.topProducts[0].variantName})</span>
                                            )}
                                        </div>                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600">
                                            <ChevronRight size={18} />
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="bg-stone-50 px-4 py-3 border-t border-stone-200 text-sm text-stone-500 text-center">
                คลิกที่แถวเพื่อดูรายละเอียดเพิ่มเติม
            </div>
        </div>
    );
};

export default MarketComparisonTable;
