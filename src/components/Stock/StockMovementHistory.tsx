// ============================================================
// 📊 Stock Movement History Modal
// 🛡️ Mellow Oven Standards Compliance:
// - #1: Store-First Logic (uses Zustand stockLogs)
// - #4: Zustand selector optimization
// - #13: Memory Leak Prevention (cleanup in useEffect)
// - #17: Accessibility (aria-labels, semantic HTML)
// - #22: ESC dismiss, backdrop click, 44px buttons, scroll lock
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@/src/store';
import {
    X,
    Search,
    Filter,
    Download,
    TrendingUp,
    TrendingDown,
    Package,
    Calendar,
    FileText
} from 'lucide-react';
import { format, subDays, isWithinInterval, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

// ============================================================
// Types
// ============================================================
interface StockMovementHistoryProps {
    isOpen: boolean;
    onClose: () => void;
    ingredientId?: string; // Optional: filter to single ingredient
}

interface MovementEntry {
    id: string;
    date: Date;
    ingredientId: string;
    ingredientName: string;
    amount: number;
    reason: string;
    note?: string;
    unit: string;
}

type DateRange = '7days' | '30days' | '90days' | 'all';
type ReasonFilter = 'all' | 'PO' | 'USAGE' | 'WASTE' | 'SPILLAGE' | 'CORRECTION';

// ============================================================
// Constants
// ============================================================
const REASON_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    PO: { label: 'รับของเข้า', icon: '📥', color: 'bg-green-100 text-green-700' },
    USAGE: { label: 'ใช้งาน', icon: '📤', color: 'bg-blue-100 text-blue-700' },
    WASTE: { label: 'ของเสีย', icon: '🗑️', color: 'bg-red-100 text-red-700' },
    SPILLAGE: { label: 'หก/เสียหาย', icon: '💧', color: 'bg-orange-100 text-orange-700' },
    CORRECTION: { label: 'แก้ไข', icon: '🔧', color: 'bg-purple-100 text-purple-700' }
};

// ============================================================
// Main Component
// ============================================================
export const StockMovementHistory: React.FC<StockMovementHistoryProps> = ({
    isOpen,
    onClose,
    ingredientId
}) => {
    // 🛡️ Rule #4: Select only needed state
    const stockLogs = useStore((state) => state.stockLogs);
    const ingredients = useStore((state) => state.ingredients);

    // Filters
    const [dateRange, setDateRange] = useState<DateRange>('30days');
    const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // #22: ESC key to dismiss
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // #22: Scroll lock
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = originalOverflow; };
        }
    }, [isOpen]);

    // #22: Backdrop click
    const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    }, [onClose]);

    // Create ingredient lookup map
    const ingredientMap = useMemo(() => {
        const map: Record<string, { name: string; unit: string }> = {};
        ingredients.forEach(ing => {
            map[ing.id] = { name: ing.name, unit: ing.unit };
        });
        return map;
    }, [ingredients]);

    // Process and filter movements
    const movements = useMemo((): MovementEntry[] => {
        // Calculate date range
        const now = new Date();
        let startDate: Date | null = null;

        switch (dateRange) {
            case '7days': startDate = subDays(now, 7); break;
            case '30days': startDate = subDays(now, 30); break;
            case '90days': startDate = subDays(now, 90); break;
            case 'all': startDate = null; break;
        }

        return stockLogs
            .map(log => {
                const ing = ingredientMap[log.ingredientId];
                return {
                    id: log.id,
                    date: parseISO(log.date),
                    ingredientId: log.ingredientId,
                    ingredientName: ing?.name || 'Unknown',
                    amount: log.amount,
                    reason: log.reason,
                    note: log.note,
                    unit: ing?.unit || ''
                };
            })
            .filter(m => {
                // Date filter
                if (startDate && !isWithinInterval(m.date, { start: startDate, end: now })) {
                    return false;
                }
                // Ingredient filter
                if (ingredientId && m.ingredientId !== ingredientId) {
                    return false;
                }
                // Reason filter
                if (reasonFilter !== 'all' && m.reason !== reasonFilter) {
                    return false;
                }
                // Search filter
                if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    return m.ingredientName.toLowerCase().includes(query) ||
                        (m.note?.toLowerCase() || '').includes(query);
                }
                return true;
            })
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [stockLogs, ingredientMap, dateRange, reasonFilter, searchQuery, ingredientId]);

    // Summary stats
    const summary = useMemo(() => {
        const incoming = movements.filter(m => m.amount > 0).reduce((sum, m) => sum + m.amount, 0);
        const outgoing = movements.filter(m => m.amount < 0).reduce((sum, m) => sum + Math.abs(m.amount), 0);
        return { incoming, outgoing, total: movements.length };
    }, [movements]);

    // Export to CSV
    const handleExport = useCallback(() => {
        const headers = ['วันที่', 'วัตถุดิบ', 'จำนวน', 'หน่วย', 'เหตุผล', 'หมายเหตุ'];
        const rows = movements.map(m => [
            format(m.date, 'yyyy-MM-dd HH:mm'),
            m.ingredientName,
            m.amount.toString(),
            m.unit,
            REASON_LABELS[m.reason]?.label || m.reason,
            m.note || ''
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-movement-${format(new Date(), 'yyyyMMdd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [movements]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-title"
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white flex items-center justify-between">
                    <h2 id="history-title" className="text-lg font-bold flex items-center gap-2">
                        <FileText size={20} />
                        ประวัติการเคลื่อนไหวสต็อก
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="ปิด"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 p-4 border-b border-stone-200 bg-stone-50">
                    <div className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm">
                        <div className="flex items-center gap-2 text-green-600 mb-1">
                            <TrendingUp size={16} />
                            <span className="text-sm font-medium">รับเข้า</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700">+{summary.incoming.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm">
                        <div className="flex items-center gap-2 text-red-600 mb-1">
                            <TrendingDown size={16} />
                            <span className="text-sm font-medium">จ่ายออก</span>
                        </div>
                        <p className="text-2xl font-bold text-red-700">-{summary.outgoing.toLocaleString()}</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm">
                        <div className="flex items-center gap-2 text-indigo-600 mb-1">
                            <Package size={16} />
                            <span className="text-sm font-medium">รายการ</span>
                        </div>
                        <p className="text-2xl font-bold text-indigo-700">{summary.total}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-stone-200 flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="ค้นหาวัตถุดิบ หรือ หมายเหตุ..."
                            className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                        />
                    </div>

                    {/* Date Range */}
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-stone-400" />
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as DateRange)}
                            className="px-3 py-2 border border-stone-300 rounded-lg text-sm min-h-[44px]"
                        >
                            <option value="7days">7 วัน</option>
                            <option value="30days">30 วัน</option>
                            <option value="90days">90 วัน</option>
                            <option value="all">ทั้งหมด</option>
                        </select>
                    </div>

                    {/* Reason Filter */}
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-stone-400" />
                        <select
                            value={reasonFilter}
                            onChange={(e) => setReasonFilter(e.target.value as ReasonFilter)}
                            className="px-3 py-2 border border-stone-300 rounded-lg text-sm min-h-[44px]"
                        >
                            <option value="all">ทุกประเภท</option>
                            <option value="PO">📥 รับของเข้า</option>
                            <option value="USAGE">📤 ใช้งาน</option>
                            <option value="WASTE">🗑️ ของเสีย</option>
                            <option value="SPILLAGE">💧 หก/เสียหาย</option>
                            <option value="CORRECTION">🔧 แก้ไข</option>
                        </select>
                    </div>

                    {/* Export */}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 transition-colors min-h-[44px]"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>

                {/* Movement List */}
                <div className="flex-1 overflow-y-auto">
                    {movements.length === 0 ? (
                        <div className="p-8 text-center text-stone-500">
                            <Package size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="font-medium">ไม่พบรายการ</p>
                            <p className="text-sm">ลองเปลี่ยนตัวกรองหรือช่วงวันที่</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="sticky top-0 bg-stone-100 text-sm">
                                <tr>
                                    <th className="text-left p-3 font-medium text-stone-600">วันที่/เวลา</th>
                                    <th className="text-left p-3 font-medium text-stone-600">วัตถุดิบ</th>
                                    <th className="text-right p-3 font-medium text-stone-600">จำนวน</th>
                                    <th className="text-center p-3 font-medium text-stone-600">เหตุผล</th>
                                    <th className="text-left p-3 font-medium text-stone-600">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {movements.map(m => {
                                    const reasonInfo = REASON_LABELS[m.reason] || { label: m.reason, icon: '📝', color: 'bg-gray-100 text-gray-700' };
                                    return (
                                        <tr key={m.id} className="border-b border-stone-100 hover:bg-stone-50">
                                            <td className="p-3 text-sm">
                                                <div className="font-medium">{format(m.date, 'd MMM', { locale: th })}</div>
                                                <div className="text-stone-400 text-xs">{format(m.date, 'HH:mm')}</div>
                                            </td>
                                            <td className="p-3 font-medium">{m.ingredientName}</td>
                                            <td className={`p-3 text-right font-bold ${m.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {m.amount >= 0 ? '+' : ''}{m.amount} {m.unit}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${reasonInfo.color}`}>
                                                    {reasonInfo.icon} {reasonInfo.label}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm text-stone-500 max-w-[200px] truncate">
                                                {m.note || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-200 bg-stone-50 text-right">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-stone-200 text-stone-700 rounded-lg font-medium hover:bg-stone-300 transition-colors min-h-[44px]"
                    >
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockMovementHistory;
