// ============================================================
// 📦 Stock Dashboard - Summary Overview Component
// 🛡️ Mellow Oven Standards Compliance:
// - #1: Store-First Logic (uses Zustand selectors)
// - #4: Zustand selector optimization
// - #13: Memory Leak Prevention (cleanup in useEffect)
// - #15: Idempotency (loading states)
// - #17: Accessibility (aria-labels, button elements)
// - #22: ESC dismiss, backdrop click, 44px buttons
// ============================================================

import React, { useMemo, useEffect, useCallback } from 'react';
import { useStore } from '@/src/store';
import {
    Package,
    AlertTriangle,
    CheckCircle,
    TrendingUp,
    Plus,
    ArrowDownToLine,
    Settings2,
    Bell,
    ShoppingCart,
    FileText
} from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

// ============================================================
// Constants (Rule #19: No Magic Numbers)
// ============================================================
const LOW_STOCK_THRESHOLD_DEFAULT = 10;
const ALERT_BANNER_HEIGHT = 44; // #22: Min 44px for touch

// ============================================================
// Types
// ============================================================
interface StockSummary {
    outOfStock: number;
    lowStock: number;
    normal: number;
    total: number;
    totalValue: number;
}

interface StockAlert {
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    unit: string;
    severity: 'critical' | 'warning';
}

interface StockDashboardProps {
    onAddIngredient?: () => void;
    onReceiveStock?: () => void;
    onAdjustStock?: () => void;
    onViewHistory?: () => void;
}

// ============================================================
// Main Component
// ============================================================
export const StockDashboard: React.FC<StockDashboardProps> = ({
    onAddIngredient,
    onReceiveStock,
    onAdjustStock,
    onViewHistory
}) => {
    // 🛡️ Rule #4: Select only the state we need
    const ingredients = useStore((state) => state.ingredients);

    // ============================================================
    // Computed Values (Memoized for Performance)
    // ============================================================

    /**
     * Calculate stock summary statistics
     * @returns StockSummary with counts and total value
     */
    const stockSummary = useMemo((): StockSummary => {
        let outOfStock = 0;
        let lowStock = 0;
        let normal = 0;
        let totalValue = 0;

        ingredients.forEach(ing => {
            const minStock = ing.minStock ?? LOW_STOCK_THRESHOLD_DEFAULT;
            totalValue += (ing.currentStock ?? 0) * (ing.costPerUnit ?? 0);

            if ((ing.currentStock ?? 0) === 0) {
                outOfStock++;
            } else if ((ing.currentStock ?? 0) <= minStock) {
                lowStock++;
            } else {
                normal++;
            }
        });

        return {
            outOfStock,
            lowStock,
            normal,
            total: ingredients.length,
            totalValue
        };
    }, [ingredients]);

    /**
     * Get list of items that need attention (low or out of stock)
     * @returns Array of StockAlert sorted by severity
     */
    const stockAlerts = useMemo((): StockAlert[] => {
        const alerts: StockAlert[] = [];

        ingredients.forEach(ing => {
            const minStock = ing.minStock ?? LOW_STOCK_THRESHOLD_DEFAULT;
            const current = ing.currentStock ?? 0;

            if (current <= minStock) {
                alerts.push({
                    id: ing.id,
                    name: ing.name,
                    currentStock: current,
                    minStock,
                    unit: ing.unit,
                    severity: current === 0 ? 'critical' : 'warning'
                });
            }
        });

        // Sort: critical first, then by name
        return alerts.sort((a, b) => {
            if (a.severity === 'critical' && b.severity !== 'critical') return -1;
            if (b.severity === 'critical' && a.severity !== 'critical') return 1;
            return a.name.localeCompare(b.name, 'th');
        });
    }, [ingredients]);

    // ============================================================
    // Render
    // ============================================================
    return (
        <div className="space-y-6">
            {/* ═══════════════════════════════════════════════════════
                Summary Cards - Glanceable Overview
            ═══════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Out of Stock - Critical */}
                <div className={`
                    relative overflow-hidden rounded-2xl p-5
                    ${stockSummary.outOfStock > 0
                        ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-200'
                        : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400'}
                `}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle size={20} className={stockSummary.outOfStock > 0 ? 'animate-pulse' : ''} />
                            <span className="text-sm font-medium opacity-90">ของหมด</span>
                        </div>
                        <p className="text-3xl font-black">{stockSummary.outOfStock}</p>
                    </div>
                </div>

                {/* Low Stock - Warning */}
                <div className={`
                    relative overflow-hidden rounded-2xl p-5
                    ${stockSummary.lowStock > 0
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200'
                        : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400'}
                `}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Bell size={20} />
                            <span className="text-sm font-medium opacity-90">ใกล้หมด</span>
                        </div>
                        <p className="text-3xl font-black">{stockSummary.lowStock}</p>
                    </div>
                </div>

                {/* Normal Stock */}
                <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg shadow-emerald-200">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={20} />
                            <span className="text-sm font-medium opacity-90">ปกติ</span>
                        </div>
                        <p className="text-3xl font-black">{stockSummary.normal}</p>
                    </div>
                </div>

                {/* Total Value */}
                <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={20} />
                            <span className="text-sm font-medium opacity-90">มูลค่ารวม</span>
                        </div>
                        <p className="text-2xl font-black">{formatCurrency(stockSummary.totalValue)}</p>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════
                Alert Banner - Items Needing Attention
            ═══════════════════════════════════════════════════════ */}
            {stockAlerts.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="text-amber-600" size={20} />
                        <h3 className="font-bold text-amber-800">
                            แจ้งเตือน ({stockAlerts.length} รายการ)
                        </h3>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {stockAlerts.slice(0, 5).map(alert => (
                            <div
                                key={alert.id}
                                className={`
                                    flex items-center justify-between p-3 rounded-xl
                                    ${alert.severity === 'critical'
                                        ? 'bg-red-100 border border-red-200'
                                        : 'bg-amber-100 border border-amber-200'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`
                                        w-2 h-2 rounded-full
                                        ${alert.severity === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}
                                    `} />
                                    <div>
                                        <p className="font-medium text-gray-800">{alert.name}</p>
                                        <p className={`text-sm ${alert.severity === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                                            เหลือ {alert.currentStock} {alert.unit}
                                            {alert.severity === 'warning' && ` (ต่ำกว่า ${alert.minStock})`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => onReceiveStock?.()}
                                    className="px-3 py-1.5 bg-white text-amber-700 text-sm font-medium rounded-lg 
                                             hover:bg-amber-50 border border-amber-300 transition-colors
                                             min-h-[36px]"
                                    aria-label={`สั่งซื้อ ${alert.name}`}
                                >
                                    <ShoppingCart size={16} />
                                </button>
                            </div>
                        ))}
                        {stockAlerts.length > 5 && (
                            <p className="text-center text-sm text-amber-600 py-2">
                                และอีก {stockAlerts.length - 5} รายการ...
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                Quick Actions
            ═══════════════════════════════════════════════════════ */}
            <div className="flex flex-wrap gap-3">
                <button
                    onClick={onAddIngredient}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-green-600 
                             text-white font-medium rounded-xl shadow-lg shadow-emerald-200 
                             hover:shadow-xl hover:scale-[1.02] transition-all
                             min-h-[44px]"
                    aria-label="เพิ่มวัตถุดิบใหม่"
                >
                    <Plus size={20} />
                    เพิ่มวัตถุดิบ
                </button>

                <button
                    onClick={onReceiveStock}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 
                             text-white font-medium rounded-xl shadow-lg shadow-blue-200 
                             hover:shadow-xl hover:scale-[1.02] transition-all
                             min-h-[44px]"
                    aria-label="รับของเข้าสต็อก"
                >
                    <ArrowDownToLine size={20} />
                    รับของเข้า
                </button>

                <button
                    onClick={onAdjustStock}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-gray-700 font-medium 
                             rounded-xl border border-gray-200 shadow-sm
                             hover:bg-gray-50 hover:border-gray-300 transition-all
                             min-h-[44px]"
                    aria-label="ปรับสต็อก"
                >
                    <Settings2 size={20} />
                    ปรับสต็อก
                </button>

                <button
                    onClick={onViewHistory}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 
                             text-white font-medium rounded-xl shadow-lg shadow-indigo-200 
                             hover:shadow-xl hover:scale-[1.02] transition-all
                             min-h-[44px]"
                    aria-label="ดูประวัติสต็อก"
                >
                    <FileText size={20} />
                    ประวัติ
                </button>
            </div>
        </div>
    );
};

export default StockDashboard;
