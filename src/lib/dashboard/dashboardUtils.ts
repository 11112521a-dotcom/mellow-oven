// ============================================================
// 📊 Dashboard Utility Functions
// Provides calculations and helpers for the Business Command Center
// 🛡️ Mellow Oven Standards Compliance:
// - #1: Pure functions, no side effects
// - #19: No magic numbers - all constants named
// - #10: First Principles Thinking
// ============================================================

import { ProductSaleLog, Market, Ingredient, DailyInventory, Product } from '../../../types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, format, differenceInDays, isWithinInterval } from 'date-fns';
import { th } from 'date-fns/locale';

// ============================================================
// Types
// ============================================================
export interface DateRange {
    from: Date;
    to: Date;
    label: string;
}

export interface ComparisonPeriod {
    id: string;
    label: string;
    periodA: DateRange;
    periodB: DateRange;
}

export interface MarketMetrics {
    marketId: string;
    marketName: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    soldQty: number;
    transactionCount: number;
    avgTransactionValue: number;
    topProducts: Array<{
        productId: string;
        productName: string;
        variantName?: string;
        revenue: number;
        profit: number;
        soldQty: number;
    }>;
}

export interface DetailedMarketData extends MarketMetrics {
    // Daily breakdown
    dailyBreakdown: Array<{
        date: string;
        revenue: number;
        profit: number;
        soldQty: number;
    }>;
    // Product breakdown (all products, not just top)
    productBreakdown: Array<{
        productId: string;
        productName: string;
        variantName?: string;
        revenue: number;
        cost: number;
        profit: number;
        margin: number;
        soldQty: number;
        avgPrice: number;
    }>;
    // Performance indicators
    bestDay: { date: string; revenue: number } | null;
    worstDay: { date: string; revenue: number } | null;
    avgDailyRevenue: number;
    avgDailyProfit: number;
}

export interface ComparisonMetrics {
    revenue: { current: number; previous: number; change: number; changePercent: number };
    profit: { current: number; previous: number; change: number; changePercent: number };
    soldQty: { current: number; previous: number; change: number; changePercent: number };
    margin: { current: number; previous: number; change: number; changePercent: number };
    transactionCount: { current: number; previous: number; change: number; changePercent: number };
}

// ============================================================
// Constants (Rule #19)
// ============================================================
export const COMPARISON_PRESETS = {
    TODAY_VS_YESTERDAY: 'today_vs_yesterday',
    THIS_WEEK_VS_LAST: 'this_week_vs_last',
    THIS_MONTH_VS_LAST: 'this_month_vs_last',
    LAST_7_DAYS_VS_PREVIOUS: 'last_7_days_vs_previous',
    LAST_30_DAYS_VS_PREVIOUS: 'last_30_days_vs_previous',
    CUSTOM: 'custom'
} as const;

export const TOP_PRODUCTS_LIMIT = 5;
export const MAX_DAILY_BREAKDOWN = 31;

// ============================================================
// Date Range Helpers
// ============================================================

/**
 * Get comparison periods based on preset
 */
export function getComparisonPeriod(preset: string, customA?: DateRange, customB?: DateRange): ComparisonPeriod {
    const today = new Date();
    const yesterday = subDays(today, 1);

    switch (preset) {
        case COMPARISON_PRESETS.TODAY_VS_YESTERDAY:
            return {
                id: preset,
                label: 'วันนี้ vs เมื่อวาน',
                periodA: { from: startOfDay(today), to: endOfDay(today), label: 'วันนี้' },
                periodB: { from: startOfDay(yesterday), to: endOfDay(yesterday), label: 'เมื่อวาน' }
            };

        case COMPARISON_PRESETS.THIS_WEEK_VS_LAST:
            const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
            const lastWeekStart = subWeeks(thisWeekStart, 1);
            const lastWeekEnd = subDays(thisWeekStart, 1);
            return {
                id: preset,
                label: 'สัปดาห์นี้ vs สัปดาห์ก่อน',
                periodA: { from: thisWeekStart, to: endOfDay(today), label: 'สัปดาห์นี้' },
                periodB: { from: lastWeekStart, to: endOfDay(lastWeekEnd), label: 'สัปดาห์ก่อน' }
            };

        case COMPARISON_PRESETS.THIS_MONTH_VS_LAST:
            const thisMonthStart = startOfMonth(today);
            const lastMonthStart = startOfMonth(subMonths(today, 1));
            const lastMonthEnd = endOfMonth(subMonths(today, 1));
            return {
                id: preset,
                label: 'เดือนนี้ vs เดือนก่อน',
                periodA: { from: thisMonthStart, to: endOfDay(today), label: format(today, 'MMMM', { locale: th }) },
                periodB: { from: lastMonthStart, to: endOfDay(lastMonthEnd), label: format(lastMonthStart, 'MMMM', { locale: th }) }
            };

        case COMPARISON_PRESETS.LAST_7_DAYS_VS_PREVIOUS:
            const last7Start = subDays(today, 6);
            const prev7Start = subDays(today, 13);
            const prev7End = subDays(today, 7);
            return {
                id: preset,
                label: '7 วันล่าสุด vs 7 วันก่อนหน้า',
                periodA: { from: startOfDay(last7Start), to: endOfDay(today), label: '7 วันล่าสุด' },
                periodB: { from: startOfDay(prev7Start), to: endOfDay(prev7End), label: '7 วันก่อนหน้า' }
            };

        case COMPARISON_PRESETS.LAST_30_DAYS_VS_PREVIOUS:
            const last30Start = subDays(today, 29);
            const prev30Start = subDays(today, 59);
            const prev30End = subDays(today, 30);
            return {
                id: preset,
                label: '30 วันล่าสุด vs 30 วันก่อนหน้า',
                periodA: { from: startOfDay(last30Start), to: endOfDay(today), label: '30 วันล่าสุด' },
                periodB: { from: startOfDay(prev30Start), to: endOfDay(prev30End), label: '30 วันก่อนหน้า' }
            };

        case COMPARISON_PRESETS.CUSTOM:
            if (customA && customB) {
                return {
                    id: preset,
                    label: `${customA.label} vs ${customB.label}`,
                    periodA: customA,
                    periodB: customB
                };
            }
            // Fallback to today vs yesterday
            return getComparisonPeriod(COMPARISON_PRESETS.TODAY_VS_YESTERDAY);

        default:
            return getComparisonPeriod(COMPARISON_PRESETS.TODAY_VS_YESTERDAY);
    }
}

/**
 * Format date range for display
 */
export function formatDateRange(range: DateRange): string {
    const fromStr = format(range.from, 'd MMM', { locale: th });
    const toStr = format(range.to, 'd MMM', { locale: th });
    if (fromStr === toStr) return fromStr;
    return `${fromStr} - ${toStr}`;
}

// ============================================================
// Market Aggregation
// ============================================================

/**
 * Calculate metrics for a single market within a date range
 */
export function calculateMarketMetrics(
    sales: ProductSaleLog[],
    marketId: string,
    marketName: string,
    dateRange: DateRange
): MarketMetrics {
    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');

    const marketSales = sales.filter(s =>
        s.marketId === marketId &&
        s.saleDate >= fromStr &&
        s.saleDate <= toStr
    );

    const revenue = marketSales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const cost = marketSales.reduce((sum, s) => sum + s.totalCost, 0);
    const profit = marketSales.reduce((sum, s) => sum + s.grossProfit, 0);
    const soldQty = marketSales.reduce((sum, s) => sum + s.quantitySold, 0);
    const transactionCount = marketSales.length;

    // Group by product for top products
    const productMap: Record<string, { productId: string; productName: string; variantName?: string; revenue: number; profit: number; soldQty: number }> = {};
    marketSales.forEach(s => {
        const key = s.variantId || s.productId;
        if (!productMap[key]) {
            productMap[key] = {
                productId: key,
                productName: s.productName,
                variantName: s.variantName,
                revenue: 0,
                profit: 0,
                soldQty: 0
            };
        }
        productMap[key].revenue += s.totalRevenue;
        productMap[key].profit += s.grossProfit;
        productMap[key].soldQty += s.quantitySold;
    });

    const topProducts = Object.values(productMap)
        .sort((a, b) => b.profit - a.profit)
        .slice(0, TOP_PRODUCTS_LIMIT);

    return {
        marketId,
        marketName,
        revenue,
        cost,
        profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        soldQty,
        transactionCount,
        avgTransactionValue: transactionCount > 0 ? revenue / transactionCount : 0,
        topProducts
    };
}

/**
 * Calculate DETAILED metrics for a single market (full breakdown)
 */
export function calculateDetailedMarketData(
    sales: ProductSaleLog[],
    marketId: string,
    marketName: string,
    dateRange: DateRange
): DetailedMarketData {
    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');

    const marketSales = sales.filter(s =>
        s.marketId === marketId &&
        s.saleDate >= fromStr &&
        s.saleDate <= toStr
    );

    // Basic metrics
    const baseMetrics = calculateMarketMetrics(sales, marketId, marketName, dateRange);

    // Daily breakdown
    const dailyMap: Record<string, { revenue: number; profit: number; soldQty: number }> = {};
    marketSales.forEach(s => {
        if (!dailyMap[s.saleDate]) {
            dailyMap[s.saleDate] = { revenue: 0, profit: 0, soldQty: 0 };
        }
        dailyMap[s.saleDate].revenue += s.totalRevenue;
        dailyMap[s.saleDate].profit += s.grossProfit;
        dailyMap[s.saleDate].soldQty += s.quantitySold;
    });

    const dailyBreakdown = Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Product breakdown (ALL products)
    const productMap: Record<string, {
        productId: string; productName: string; variantName?: string;
        revenue: number; cost: number; profit: number; soldQty: number;
    }> = {};
    marketSales.forEach(s => {
        const key = s.variantId || s.productId;
        if (!productMap[key]) {
            productMap[key] = {
                productId: s.productId,
                productName: s.productName,
                variantName: s.variantName,
                revenue: 0,
                cost: 0,
                profit: 0,
                soldQty: 0
            };
        }
        productMap[key].revenue += s.totalRevenue;
        productMap[key].cost += s.totalCost;
        productMap[key].profit += s.grossProfit;
        productMap[key].soldQty += s.quantitySold;
    });

    const productBreakdown = Object.values(productMap)
        .map(p => ({
            ...p,
            margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
            avgPrice: p.soldQty > 0 ? p.revenue / p.soldQty : 0
        }))
        .sort((a, b) => b.profit - a.profit);

    // Best/Worst days
    const sortedDays = [...dailyBreakdown].sort((a, b) => b.revenue - a.revenue);
    const bestDay = sortedDays.length > 0 ? { date: sortedDays[0].date, revenue: sortedDays[0].revenue } : null;
    const worstDay = sortedDays.length > 0 ? { date: sortedDays[sortedDays.length - 1].date, revenue: sortedDays[sortedDays.length - 1].revenue } : null;

    // Averages
    const daysCount = dailyBreakdown.length || 1;
    const avgDailyRevenue = baseMetrics.revenue / daysCount;
    const avgDailyProfit = baseMetrics.profit / daysCount;

    return {
        ...baseMetrics,
        dailyBreakdown,
        productBreakdown,
        bestDay,
        worstDay,
        avgDailyRevenue,
        avgDailyProfit
    };
}

/**
 * Calculate metrics for ALL markets
 */
export function calculateAllMarketsMetrics(
    sales: ProductSaleLog[],
    markets: Market[],
    dateRange: DateRange
): MarketMetrics[] {
    return markets.map(market =>
        calculateMarketMetrics(sales, market.id, market.name, dateRange)
    ).sort((a, b) => b.revenue - a.revenue);
}

// ============================================================
// Comparison Calculations
// ============================================================

/**
 * Calculate comparison metrics between two periods
 */
export function calculateComparisonMetrics(
    sales: ProductSaleLog[],
    periodA: DateRange,
    periodB: DateRange,
    marketId?: string // Optional: filter by market
): ComparisonMetrics {
    const filterSales = (range: DateRange) => {
        const fromStr = format(range.from, 'yyyy-MM-dd');
        const toStr = format(range.to, 'yyyy-MM-dd');
        return sales.filter(s => {
            const matchDate = s.saleDate >= fromStr && s.saleDate <= toStr;
            const matchMarket = !marketId || s.marketId === marketId;
            return matchDate && matchMarket;
        });
    };

    const salesA = filterSales(periodA);
    const salesB = filterSales(periodB);

    const metricsA = {
        revenue: salesA.reduce((sum, s) => sum + s.totalRevenue, 0),
        profit: salesA.reduce((sum, s) => sum + s.grossProfit, 0),
        soldQty: salesA.reduce((sum, s) => sum + s.quantitySold, 0),
        transactionCount: salesA.length
    };

    const metricsB = {
        revenue: salesB.reduce((sum, s) => sum + s.totalRevenue, 0),
        profit: salesB.reduce((sum, s) => sum + s.grossProfit, 0),
        soldQty: salesB.reduce((sum, s) => sum + s.quantitySold, 0),
        transactionCount: salesB.length
    };

    const calcChange = (current: number, previous: number) => {
        const change = current - previous;
        const changePercent = previous > 0 ? (change / previous) * 100 : (current > 0 ? 100 : 0);
        return { current, previous, change, changePercent };
    };

    const marginA = metricsA.revenue > 0 ? (metricsA.profit / metricsA.revenue) * 100 : 0;
    const marginB = metricsB.revenue > 0 ? (metricsB.profit / metricsB.revenue) * 100 : 0;

    return {
        revenue: calcChange(metricsA.revenue, metricsB.revenue),
        profit: calcChange(metricsA.profit, metricsB.profit),
        soldQty: calcChange(metricsA.soldQty, metricsB.soldQty),
        margin: { current: marginA, previous: marginB, change: marginA - marginB, changePercent: marginB > 0 ? ((marginA - marginB) / marginB) * 100 : 0 },
        transactionCount: calcChange(metricsA.transactionCount, metricsB.transactionCount)
    };
}

/**
 * Get change indicator (up/down/same)
 */
export function getChangeIndicator(changePercent: number): 'up' | 'down' | 'same' {
    if (changePercent > 0.5) return 'up';
    if (changePercent < -0.5) return 'down';
    return 'same';
}

/**
 * Format change for display
 */
export function formatChange(value: number, isPercent = false): string {
    const prefix = value > 0 ? '+' : '';
    if (isPercent) {
        return `${prefix}${value.toFixed(1)}%`;
    }
    return `${prefix}${value.toLocaleString()}`;
}
