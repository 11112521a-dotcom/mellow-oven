// ============================================================
// 🧠 Business Insight Engine
// AI-powered actionable recommendations for bakery management
// 🛡️ Mellow Oven Standards Compliance:
// - #1: Store-First Logic (pure functions, no side effects)
// - #10: First Principles Thinking (based on real business logic)
// - #19: No Magic Numbers (constants defined)
// ============================================================

import { Ingredient, Product, ProductSaleLog, DailyInventory, PurchaseOrder, StockLog } from '../../../types';

// ============================================================
// Types
// ============================================================
export interface BusinessInsight {
    id: string;
    type: 'production' | 'pricing' | 'stock' | 'waste' | 'cashflow' | 'trend';
    severity: 'critical' | 'warning' | 'success' | 'info';
    title: string;
    message: string;
    recommendation?: string;
    action?: {
        label: string;
        navigateTo: string;
    };
    data?: Record<string, number | string>;
}

export interface InsightEngineInput {
    productSales: ProductSaleLog[];
    dailyInventory: DailyInventory[];
    ingredients: Ingredient[];
    products: Product[];
    purchaseOrders: PurchaseOrder[];
    stockLogs: StockLog[];
    todayStr: string;
}

// ============================================================
// Constants (Rule #19)
// ============================================================
const SELL_THROUGH_EXCELLENT = 90;
const SELL_THROUGH_GOOD = 70;
const SELL_THROUGH_WARNING = 50;
const WASTE_RATE_CRITICAL = 15;
const WASTE_RATE_WARNING = 10;
const PROFIT_MARGIN_EXCELLENT = 45;
const PROFIT_MARGIN_GOOD = 30;
const LOW_STOCK_DAYS = 3;
const TREND_SIGNIFICANT = 15; // 15% change is significant

// ============================================================
// Insight Generation Functions
// ============================================================

/**
 * 🏭 Production Optimization Insights
 * Analyzes sell-through rates and suggests production adjustments
 */
function generateProductionInsights(
    dailyInventory: DailyInventory[],
    products: Product[],
    todayStr: string
): BusinessInsight[] {
    const insights: BusinessInsight[] = [];
    const todayRecords = dailyInventory.filter(d => d.businessDate === todayStr);

    // Aggregate by product
    const productStats: Record<string, { produced: number; sold: number; waste: number; name: string }> = {};
    todayRecords.forEach(record => {
        const product = products.find(p => p.id === record.productId);
        if (!product) return;

        const key = record.productId;
        if (!productStats[key]) {
            productStats[key] = { produced: 0, sold: 0, waste: 0, name: product.name };
        }
        productStats[key].produced += record.producedQty || 0;
        productStats[key].sold += record.soldQty || 0;
        productStats[key].waste += record.wasteQty || 0;
    });

    // Analyze each product
    Object.entries(productStats).forEach(([productId, stats]) => {
        if (stats.produced === 0) return;

        const sellThrough = (stats.sold / stats.produced) * 100;
        const wasteRate = (stats.waste / stats.produced) * 100;

        // Overproduction warning
        if (sellThrough < SELL_THROUGH_WARNING && stats.produced >= 5) {
            const suggestedProduction = Math.ceil(stats.sold * 1.2); // 20% buffer
            insights.push({
                id: `production-over-${productId}`,
                type: 'production',
                severity: 'warning',
                title: '⚠️ ผลิตเยอะเกินไป',
                message: `${stats.name} ขายได้แค่ ${sellThrough.toFixed(0)}%`,
                recommendation: `แนะนำผลิตแค่ ${suggestedProduction} ชิ้น (ลดจาก ${stats.produced})`,
                action: { label: 'ดูสต็อก', navigateTo: 'inventory' },
                data: { sellThrough, currentProduction: stats.produced, suggestedProduction }
            });
        }

        // Underproduction success
        if (sellThrough >= SELL_THROUGH_EXCELLENT && stats.produced >= 3) {
            insights.push({
                id: `production-good-${productId}`,
                type: 'production',
                severity: 'success',
                title: '🎉 ขายหมด!',
                message: `${stats.name} ขายได้ ${sellThrough.toFixed(0)}%`,
                recommendation: 'ลองเพิ่มผลิตอีก 20% เพื่อไม่พลาดโอกาส',
                data: { sellThrough }
            });
        }

        // High waste warning
        if (wasteRate >= WASTE_RATE_CRITICAL) {
            insights.push({
                id: `waste-high-${productId}`,
                type: 'waste',
                severity: 'critical',
                title: '🔴 ของเสียสูงมาก',
                message: `${stats.name} เสีย ${stats.waste} ชิ้น (${wasteRate.toFixed(0)}%)`,
                recommendation: 'ตรวจสอบกระบวนการผลิตและเก็บรักษา',
                action: { label: 'ดูประวัติ', navigateTo: 'inventory' }
            });
        }
    });

    return insights;
}

/**
 * 📦 Stock Prediction Insights
 * Predicts when ingredients will run out
 */
function generateStockInsights(
    ingredients: Ingredient[],
    stockLogs: StockLog[]
): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    // Calculate average daily usage for each ingredient
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    const last7DaysStr = last7Days.toISOString().split('T')[0];

    ingredients.forEach(ing => {
        const recentLogs = stockLogs.filter(log =>
            log.ingredientId === ing.id &&
            log.date >= last7DaysStr &&
            log.amount < 0 // Usage (negative amount)
        );

        const totalUsed = Math.abs(recentLogs.reduce((sum, log) => sum + log.amount, 0));
        const avgDailyUsage = totalUsed / 7;

        if (avgDailyUsage > 0 && ing.currentStock > 0) {
            const daysUntilEmpty = ing.currentStock / avgDailyUsage;

            if (daysUntilEmpty <= LOW_STOCK_DAYS) {
                insights.push({
                    id: `stock-low-${ing.id}`,
                    type: 'stock',
                    severity: daysUntilEmpty <= 1 ? 'critical' : 'warning',
                    title: daysUntilEmpty <= 1 ? '🔴 จะหมดวันนี้!' : '⚠️ ใกล้หมด',
                    message: `${ing.name} เหลือ ${ing.currentStock} ${ing.unit}`,
                    recommendation: `จะหมดใน ${daysUntilEmpty.toFixed(1)} วัน - ควรสั่งซื้อเพิ่ม`,
                    action: { label: 'สั่งของ', navigateTo: 'inventory' },
                    data: { daysUntilEmpty, avgDailyUsage }
                });
            }
        }
    });

    return insights;
}

/**
 * 📈 Sales Trend Insights
 * Compares today vs yesterday and identifies patterns
 */
function generateTrendInsights(
    productSales: ProductSaleLog[],
    todayStr: string
): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const todaySales = productSales.filter(s => s.saleDate === todayStr);
    const yesterdaySales = productSales.filter(s => s.saleDate === yesterdayStr);

    const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + s.totalRevenue, 0);

    if (yesterdayRevenue > 0) {
        const change = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;

        if (change >= TREND_SIGNIFICANT) {
            insights.push({
                id: 'trend-up',
                type: 'trend',
                severity: 'success',
                title: '📈 ยอดขายพุ่ง!',
                message: `รายได้วันนี้เพิ่มขึ้น ${change.toFixed(0)}% จากเมื่อวาน`,
                data: { change, todayRevenue, yesterdayRevenue }
            });
        } else if (change <= -TREND_SIGNIFICANT) {
            insights.push({
                id: 'trend-down',
                type: 'trend',
                severity: 'warning',
                title: '📉 ยอดขายลดลง',
                message: `รายได้วันนี้ลดลง ${Math.abs(change).toFixed(0)}% จากเมื่อวาน`,
                recommendation: 'ตรวจสอบสาเหตุ - วันหยุด? สภาพอากาศ? คู่แข่ง?',
                data: { change, todayRevenue, yesterdayRevenue }
            });
        }
    }

    return insights;
}

/**
 * 💰 Profit Margin Insights
 */
function generateProfitInsights(
    productSales: ProductSaleLog[],
    todayStr: string
): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    const todaySales = productSales.filter(s => s.saleDate === todayStr);
    const revenue = todaySales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const profit = todaySales.reduce((sum, s) => sum + s.grossProfit, 0);

    if (revenue > 0) {
        const margin = (profit / revenue) * 100;

        if (margin >= PROFIT_MARGIN_EXCELLENT) {
            insights.push({
                id: 'profit-excellent',
                type: 'cashflow',
                severity: 'success',
                title: '💰 Margin ยอดเยี่ยม!',
                message: `กำไร ${margin.toFixed(0)}% - สูงกว่าค่าเฉลี่ยธุรกิจเบเกอรี่`,
                data: { margin }
            });
        } else if (margin < PROFIT_MARGIN_GOOD) {
            insights.push({
                id: 'profit-low',
                type: 'cashflow',
                severity: 'warning',
                title: '⚠️ Margin ต่ำ',
                message: `กำไรแค่ ${margin.toFixed(0)}% - ควรทบทวนต้นทุน`,
                recommendation: 'ลองขึ้นราคาสินค้ายอดนิยม หรือลดต้นทุนวัตถุดิบ',
                action: { label: 'ดูต้นทุน', navigateTo: 'products' },
                data: { margin }
            });
        }
    }

    return insights;
}

// ============================================================
// Main Engine
// ============================================================

/**
 * 🧠 Generate all business insights
 * @param input - All required data for analysis
 * @returns Sorted list of actionable insights
 */
export function generateBusinessInsights(input: InsightEngineInput): BusinessInsight[] {
    const allInsights: BusinessInsight[] = [];

    // Generate insights from all categories
    allInsights.push(...generateProductionInsights(input.dailyInventory, input.products, input.todayStr));
    allInsights.push(...generateStockInsights(input.ingredients, input.stockLogs));
    allInsights.push(...generateTrendInsights(input.productSales, input.todayStr));
    allInsights.push(...generateProfitInsights(input.productSales, input.todayStr));

    // Sort by severity (critical first)
    const severityOrder: Record<BusinessInsight['severity'], number> = {
        critical: 0,
        warning: 1,
        success: 2,
        info: 3
    };

    return allInsights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

/**
 * Get severity color classes
 */
export function getInsightColors(severity: BusinessInsight['severity']): {
    bg: string;
    border: string;
    text: string;
    icon: string;
} {
    switch (severity) {
        case 'critical':
            return { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'text-rose-500' };
        case 'warning':
            return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500' };
        case 'success':
            return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-500' };
        case 'info':
        default:
            return { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', icon: 'text-sky-500' };
    }
}
