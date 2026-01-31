// ============================================================
// 📊 Enhanced Comparison Utilities
// Advanced comparison calculations for the Business Command Center
// 🛡️ Mellow Oven Standards Compliance:
// - #1: Pure functions, no side effects (Store-First Logic)
// - #19: No magic numbers - all constants named
// - #10: First Principles Thinking
// - #16: Memoization-ready pure functions
// ============================================================

import { ProductSaleLog, Market } from '../../../types';
import {
    format,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    subDays,
    subWeeks,
    subMonths,
    subYears,
    differenceInDays,
    isWeekend,
    getDay
} from 'date-fns';
import { th } from 'date-fns/locale';
import { DateRange, formatChange, getChangeIndicator } from './dashboardUtils';

// ============================================================
// Types
// ============================================================

export interface MetricChange {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
}

export interface ProductComparisonRow {
    productId: string;
    productName: string;
    variantName?: string;
    current: {
        revenue: number;
        profit: number;
        soldQty: number;
        avgPrice: number;
    };
    previous: {
        revenue: number;
        profit: number;
        soldQty: number;
        avgPrice: number;
    };
    change: {
        revenue: number;
        revenuePercent: number;
        profit: number;
        profitPercent: number;
        soldQty: number;
        soldQtyPercent: number;
    };
    isNew: boolean;      // Product didn't exist in previous period
    isGone: boolean;     // Product didn't exist in current period
    trend: 'up' | 'down' | 'same' | 'new' | 'gone';
}

export interface EnhancedComparisonMetrics {
    // Basic metrics
    revenue: MetricChange;
    profit: MetricChange;
    soldQty: MetricChange;
    margin: MetricChange;
    transactionCount: MetricChange;

    // Extended metrics
    cost: MetricChange;
    avgPrice: MetricChange;
    avgTransactionValue: MetricChange;

    // Working days analysis
    workingDays: { current: number; previous: number };
    revenuePerDay: MetricChange;
    profitPerDay: MetricChange;

    // Product analysis
    productBreakdown: ProductComparisonRow[];
    topGainers: ProductComparisonRow[];
    topLosers: ProductComparisonRow[];
    topPopularityDrops: ProductComparisonRow[];
    newProducts: ProductComparisonRow[];
    goneProducts: ProductComparisonRow[];

    // Daily patterns
    dailyBreakdown: {
        date: string;
        revenue: number;
        profit: number;
        soldQty: number;
        period: 'A' | 'B';
    }[];

    // Insights
    insights: ComparisonInsight[];
}

export interface ComparisonInsight {
    id: string;
    type: 'positive' | 'negative' | 'neutral' | 'warning';
    icon: string;
    title: string;
    description: string;
    metric?: string;
    value?: number;
}

// ============================================================
// Constants (Rule #19)
// ============================================================
const TOP_MOVERS_LIMIT = 5;
const SIGNIFICANT_CHANGE_THRESHOLD = 10; // 10% change is significant
const HIGH_GROWTH_THRESHOLD = 50; // 50% growth is high
const DECLINE_WARNING_THRESHOLD = -20; // -20% decline is a warning

// ============================================================
// Extended Comparison Presets
// ============================================================
export const EXTENDED_COMPARISON_PRESETS = {
    TODAY_VS_YESTERDAY: 'today_vs_yesterday',
    THIS_WEEK_VS_LAST: 'this_week_vs_last',
    THIS_MONTH_VS_LAST: 'this_month_vs_last',
    LAST_7_DAYS_VS_PREVIOUS: 'last_7_days_vs_previous',
    LAST_30_DAYS_VS_PREVIOUS: 'last_30_days_vs_previous',
    YEAR_OVER_YEAR_MONTH: 'year_over_year_month',
    CUSTOM: 'custom'
} as const;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Calculate working days (non-weekends) in a date range
 */
export function countWorkingDays(from: Date, to: Date): number {
    let count = 0;
    let current = startOfDay(from);
    const end = endOfDay(to);

    while (current <= end) {
        if (!isWeekend(current)) {
            count++;
        }
        current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }

    return count;
}

/**
 * Calculate metric change with safe division
 */
function calcChange(current: number, previous: number): MetricChange {
    const change = current - previous;
    const changePercent = previous > 0
        ? (change / previous) * 100
        : (current > 0 ? 100 : 0);

    return { current, previous, change, changePercent };
}

/**
 * Get product key for grouping
 */
function getProductKey(sale: ProductSaleLog): string {
    return sale.variantId || sale.productId;
}

/**
 * Get product display name
 */
function getProductDisplayName(sale: ProductSaleLog): string {
    return sale.variantName
        ? `${sale.productName} - ${sale.variantName}`
        : sale.productName;
}

// ============================================================
// Main Calculation Functions
// ============================================================

/**
 * Calculate ENHANCED comparison metrics between two periods
 * This is the main function for the upgraded comparison view
 */
export function calculateEnhancedComparisonMetrics(
    sales: ProductSaleLog[],
    periodA: DateRange,
    periodB: DateRange,
    marketId?: string
): EnhancedComparisonMetrics {
    // Filter sales by period
    const filterByPeriod = (range: DateRange): ProductSaleLog[] => {
        const fromStr = format(range.from, 'yyyy-MM-dd');
        const toStr = format(range.to, 'yyyy-MM-dd');
        return sales.filter(s => {
            const matchDate = s.saleDate >= fromStr && s.saleDate <= toStr;
            const matchMarket = !marketId || s.marketId === marketId;
            return matchDate && matchMarket;
        });
    };

    const salesA = filterByPeriod(periodA);
    const salesB = filterByPeriod(periodB);

    // ========== Basic Aggregations ==========
    const aggregateSales = (salesList: ProductSaleLog[]) => ({
        revenue: salesList.reduce((sum, s) => sum + s.totalRevenue, 0),
        cost: salesList.reduce((sum, s) => sum + s.totalCost, 0),
        profit: salesList.reduce((sum, s) => sum + s.grossProfit, 0),
        soldQty: salesList.reduce((sum, s) => sum + s.quantitySold, 0),
        transactionCount: salesList.length
    });

    const aggA = aggregateSales(salesA);
    const aggB = aggregateSales(salesB);

    // ========== Basic Metrics ==========
    const revenue = calcChange(aggA.revenue, aggB.revenue);
    const cost = calcChange(aggA.cost, aggB.cost);
    const profit = calcChange(aggA.profit, aggB.profit);
    const soldQty = calcChange(aggA.soldQty, aggB.soldQty);
    const transactionCount = calcChange(aggA.transactionCount, aggB.transactionCount);

    // Margin
    const marginA = aggA.revenue > 0 ? (aggA.profit / aggA.revenue) * 100 : 0;
    const marginB = aggB.revenue > 0 ? (aggB.profit / aggB.revenue) * 100 : 0;
    const margin: MetricChange = {
        current: marginA,
        previous: marginB,
        change: marginA - marginB,
        changePercent: marginB > 0 ? ((marginA - marginB) / marginB) * 100 : 0
    };

    // Average price per unit
    const avgPriceA = aggA.soldQty > 0 ? aggA.revenue / aggA.soldQty : 0;
    const avgPriceB = aggB.soldQty > 0 ? aggB.revenue / aggB.soldQty : 0;
    const avgPrice = calcChange(avgPriceA, avgPriceB);

    // Average transaction value
    const avgTxA = aggA.transactionCount > 0 ? aggA.revenue / aggA.transactionCount : 0;
    const avgTxB = aggB.transactionCount > 0 ? aggB.revenue / aggB.transactionCount : 0;
    const avgTransactionValue = calcChange(avgTxA, avgTxB);

    // ========== Working Days Analysis ==========
    const workingDaysA = countWorkingDays(periodA.from, periodA.to);
    const workingDaysB = countWorkingDays(periodB.from, periodB.to);
    const workingDays = { current: workingDaysA, previous: workingDaysB };

    const revenuePerDayA = workingDaysA > 0 ? aggA.revenue / workingDaysA : 0;
    const revenuePerDayB = workingDaysB > 0 ? aggB.revenue / workingDaysB : 0;
    const revenuePerDay = calcChange(revenuePerDayA, revenuePerDayB);

    const profitPerDayA = workingDaysA > 0 ? aggA.profit / workingDaysA : 0;
    const profitPerDayB = workingDaysB > 0 ? aggB.profit / workingDaysB : 0;
    const profitPerDay = calcChange(profitPerDayA, profitPerDayB);

    // ========== Product Breakdown ==========
    const productBreakdown = calculateProductBreakdown(salesA, salesB);
    const { topGainers, topLosers, topPopularityDrops, newProducts, goneProducts } = categorizeProducts(productBreakdown);

    // ========== Daily Breakdown ==========
    const dailyBreakdown = calculateDailyBreakdown(salesA, salesB, periodA, periodB);

    // ========== Generate Insights ==========
    const insights = generateInsights({
        revenue,
        profit,
        margin,
        soldQty,
        cost,
        transactionCount,
        avgTransactionValue,
        topGainers,
        topLosers,
        newProducts,
        workingDays,
        revenuePerDay,
        productBreakdown
    });

    return {
        revenue,
        profit,
        soldQty,
        margin,
        transactionCount,
        cost,
        avgPrice,
        avgTransactionValue,
        workingDays,
        revenuePerDay,
        profitPerDay,
        productBreakdown,
        topGainers,
        topLosers,
        topPopularityDrops,
        newProducts,
        goneProducts,
        dailyBreakdown,
        insights
    };
}

/**
 * Calculate product-by-product comparison
 */
function calculateProductBreakdown(
    salesA: ProductSaleLog[],
    salesB: ProductSaleLog[]
): ProductComparisonRow[] {
    // Group by product
    const groupByProduct = (salesList: ProductSaleLog[]) => {
        const map: Record<string, {
            productId: string;
            productName: string;
            variantName?: string;
            revenue: number;
            profit: number;
            soldQty: number;
        }> = {};

        salesList.forEach(s => {
            const key = getProductKey(s);
            if (!map[key]) {
                map[key] = {
                    productId: s.productId,
                    productName: s.productName,
                    variantName: s.variantName,
                    revenue: 0,
                    profit: 0,
                    soldQty: 0
                };
            }
            map[key].revenue += s.totalRevenue;
            map[key].profit += s.grossProfit;
            map[key].soldQty += s.quantitySold;
        });

        return map;
    };

    const productsA = groupByProduct(salesA);
    const productsB = groupByProduct(salesB);

    // Combine all product keys
    const allKeys = new Set([...Object.keys(productsA), ...Object.keys(productsB)]);

    const breakdown: ProductComparisonRow[] = [];

    allKeys.forEach(key => {
        const a = productsA[key];
        const b = productsB[key];

        const current = a ? {
            revenue: a.revenue,
            profit: a.profit,
            soldQty: a.soldQty,
            avgPrice: a.soldQty > 0 ? a.revenue / a.soldQty : 0
        } : { revenue: 0, profit: 0, soldQty: 0, avgPrice: 0 };

        const previous = b ? {
            revenue: b.revenue,
            profit: b.profit,
            soldQty: b.soldQty,
            avgPrice: b.soldQty > 0 ? b.revenue / b.soldQty : 0
        } : { revenue: 0, profit: 0, soldQty: 0, avgPrice: 0 };

        const revenueChange = current.revenue - previous.revenue;
        const profitChange = current.profit - previous.profit;
        const soldQtyChange = current.soldQty - previous.soldQty;

        const isNew = !b && !!a;
        const isGone = !a && !!b;

        let trend: 'up' | 'down' | 'same' | 'new' | 'gone' = 'same';
        if (isNew) trend = 'new';
        else if (isGone) trend = 'gone';
        else if (revenueChange > 0) trend = 'up';
        else if (revenueChange < 0) trend = 'down';

        breakdown.push({
            productId: a?.productId || b?.productId || key,
            productName: a?.productName || b?.productName || 'Unknown',
            variantName: a?.variantName || b?.variantName,
            current,
            previous,
            change: {
                revenue: revenueChange,
                revenuePercent: previous.revenue > 0 ? (revenueChange / previous.revenue) * 100 : (current.revenue > 0 ? 100 : 0),
                profit: profitChange,
                profitPercent: previous.profit > 0 ? (profitChange / previous.profit) * 100 : (current.profit > 0 ? 100 : 0),
                soldQty: soldQtyChange,
                soldQtyPercent: previous.soldQty > 0 ? (soldQtyChange / previous.soldQty) * 100 : (current.soldQty > 0 ? 100 : 0)
            },
            isNew,
            isGone,
            trend
        });
    });

    // Sort by current revenue descending
    return breakdown.sort((a, b) => b.current.revenue - a.current.revenue);
}

/**
 * Categorize products into gainers, losers, new, gone
 */
function categorizeProducts(breakdown: ProductComparisonRow[]) {
    // Filter thresholds
    const MIN_REVENUE = 100; // Ignore products with very low revenue
    const SIGNIFICANT_PCT = 5; // Min % change to be relevant

    const activeProducts = breakdown.filter(p => !p.isNew && !p.isGone && p.current.revenue > MIN_REVENUE);

    const sortedByGrowth = [...activeProducts].sort((a, b) => b.change.revenuePercent - a.change.revenuePercent);

    const topGainers = sortedByGrowth
        .filter(p => p.change.revenuePercent >= SIGNIFICANT_PCT)
        .slice(0, TOP_MOVERS_LIMIT);

    const topLosers = sortedByGrowth
        .filter(p => p.change.revenuePercent <= -SIGNIFICANT_PCT)
        .sort((a, b) => a.change.revenuePercent - b.change.revenuePercent)
        .slice(0, TOP_MOVERS_LIMIT);

    // Filter for Quantity Drop (Absolute volume)
    const topPopularityDrops = [...activeProducts]
        .filter(p => p.previous.soldQty > 5 && p.change.soldQtyPercent <= -SIGNIFICANT_PCT) // Min 5 prev sales & significant drop
        .sort((a, b) => a.change.soldQty - b.change.soldQty) // Most negative first (biggest drop in count)
        .slice(0, TOP_MOVERS_LIMIT);

    const newProducts = breakdown.filter(p => p.isNew && p.current.revenue > MIN_REVENUE);
    const goneProducts = breakdown.filter(p => p.isGone && p.previous.revenue > MIN_REVENUE);

    return { topGainers, topLosers, topPopularityDrops, newProducts, goneProducts };
}

/**
 * Calculate daily breakdown for both periods
 */
function calculateDailyBreakdown(
    salesA: ProductSaleLog[],
    salesB: ProductSaleLog[],
    periodA: DateRange,
    periodB: DateRange
) {
    const dailyMap: Record<string, { revenue: number; profit: number; soldQty: number; period: 'A' | 'B' }> = {};

    salesA.forEach(s => {
        if (!dailyMap[s.saleDate]) {
            dailyMap[s.saleDate] = { revenue: 0, profit: 0, soldQty: 0, period: 'A' };
        }
        dailyMap[s.saleDate].revenue += s.totalRevenue;
        dailyMap[s.saleDate].profit += s.grossProfit;
        dailyMap[s.saleDate].soldQty += s.quantitySold;
        dailyMap[s.saleDate].period = 'A';
    });

    salesB.forEach(s => {
        if (!dailyMap[s.saleDate]) {
            dailyMap[s.saleDate] = { revenue: 0, profit: 0, soldQty: 0, period: 'B' };
        }
        dailyMap[s.saleDate].revenue += s.totalRevenue;
        dailyMap[s.saleDate].profit += s.grossProfit;
        dailyMap[s.saleDate].soldQty += s.quantitySold;
        dailyMap[s.saleDate].period = 'B';
    });

    return Object.entries(dailyMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate automatic insights from the comparison data
 */
/**
 * Generate automatic insights from the comparison data (Smart Analyst 2.0)
 */
function generateInsights(data: {
    revenue: MetricChange;
    profit: MetricChange;
    margin: MetricChange;
    soldQty: MetricChange;
    cost: MetricChange;
    transactionCount: MetricChange;
    avgTransactionValue: MetricChange;
    topGainers: ProductComparisonRow[];
    topLosers: ProductComparisonRow[];
    newProducts: ProductComparisonRow[];
    workingDays: { current: number; previous: number };
    revenuePerDay: MetricChange;
    productBreakdown: ProductComparisonRow[];
}): ComparisonInsight[] {
    const insights: ComparisonInsight[] = [];

    // 1. 🛒 Customer Behavior & Sales Mechanics
    if (data.revenue.change > 0 && data.transactionCount.change <= 0) {
        // Revenue UP but Transactions Flat/Down = Basket Size Driven
        insights.push({
            id: 'basket-driven',
            type: 'positive',
            icon: '🛍️',
            title: 'ลูกค้าจ่ายหนักขึ้น',
            description: `ยอดขายโตเพราะยอดต่อบิลสูงขึ้น (+${data.avgTransactionValue.changePercent.toFixed(1)}%) แม้คนเข้าเท่าเดิม/ลดลง`,
            metric: 'avgTicket',
            value: data.avgTransactionValue.changePercent
        });
    } else if (data.transactionCount.changePercent > 0) {
        // Transactions UP
        insights.push({
            id: 'traffic-driven',
            type: 'positive',
            icon: '👥',
            title: 'คนเข้าร้านเยอะ',
            description: `ลูกค้าเพิ่มขึ้น ${data.transactionCount.changePercent.toFixed(1)}% ช่วยดันยอดขายให้เติบโต`,
            metric: 'traffic',
            value: data.transactionCount.changePercent
        });
    }

    if (data.revenue.change > 0 && data.soldQty.change < 0) {
        // Revenue UP but Sold Qty Down = Price/Mix Driven
        insights.push({
            id: 'price-mix-driven',
            type: 'neutral',
            icon: '🏷️',
            title: 'ราคาดีช่วยดัน',
            description: `ยอดขายโตได้แม้ขายจำนวนชิ้นลดลง (-${Math.abs(data.soldQty.changePercent).toFixed(1)}%) น่าจะมาจากการขายของแพงขึ้น`,
            metric: 'price',
            value: data.soldQty.changePercent
        });
    }

    // 2. ⚙️ Operational Efficiency
    if (data.revenue.change <= 0 && data.profit.change > 0) {
        // Revenue Flat/Down but Profit UP = Cost Control
        insights.push({
            id: 'cost-control-win',
            type: 'positive',
            icon: '🛡️',
            title: 'คุมต้นทุนเยี่ยม',
            description: `แม้รายรับไม่โต แต่กำไรเพิ่มขึ้นได้เพราะคุมต้นทุนดี (-${Math.abs(data.cost.changePercent).toFixed(1)}%)`,
            metric: 'cost',
            value: data.cost.changePercent
        });
    } else if (data.revenue.changePercent > 5 && data.profit.changePercent < 0) {
        // Revenue UP > 5% but Profit DOWN = Efficiency Drop
        insights.push({
            id: 'efficiency-drop',
            type: 'warning',
            icon: '💸',
            title: 'กำไรหดตัว',
            description: `ยอดขายโตแต่กำไรลดลง! ต้นทุนพุ่งสูงกว่ารายรับ (${data.cost.changePercent.toFixed(1)}%) ต้องรีบเช็ค Margin`,
            metric: 'margin',
            value: data.profit.changePercent
        });
    }

    // 3. 🛍️ Product Strategy
    // Instant Hit (New product in Top 5 revenue)
    const top5ProductIds = data.productBreakdown.slice(0, 5).map(p => p.productId);
    const instantHit = data.newProducts.find(p => top5ProductIds.includes(p.productId));
    if (instantHit) {
        insights.push({
            id: 'instant-hit',
            type: 'positive',
            icon: '⭐',
            title: 'สินค้าใหม่ดาวรุ่ง',
            description: `"${instantHit.productName}" มาใหม่ก็ติด Top 5 ทันที! (ยอดขาย ฿${instantHit.current.revenue.toLocaleString()})`,
            metric: 'product',
            value: instantHit.current.revenue
        });
    }

    // Pareto Risk (Top 3 > 70% Revenue)
    const totalRev = data.revenue.current;
    if (totalRev > 0) {
        const top3Rev = data.productBreakdown.slice(0, 3).reduce((sum, p) => sum + p.current.revenue, 0);
        const concentration = (top3Rev / totalRev) * 100;
        if (concentration > 75) {
            insights.push({
                id: 'pareto-risk',
                type: 'warning',
                icon: '⚖️',
                title: 'พึ่งพาตัวท็อปหนัก',
                description: `Top 3 สินค้ากินส่วนแบ่งถึง ${concentration.toFixed(0)}% ของรายรับรวม มีความเสี่ยงถ้าความนิยมลดลง`,
                metric: 'risk',
                value: concentration
            });
        }
    }

    // 4. 🚨 Anomalies (Quiet Achiever)
    // Product started small (rank > 10 or low rev) and grew > 100%
    const quietAchiever = data.topGainers.find(p => {
        const isNew = p.isNew;
        const lowBase = p.previous.revenue < (totalRev * 0.05); // Less than 5% of total
        const hugeGrowth = p.change.revenuePercent > 100;
        return !isNew && lowBase && hugeGrowth;
    });

    if (quietAchiever) {
        insights.push({
            id: 'quiet-achiever',
            type: 'positive',
            icon: '🐎',
            title: 'ม้ามืดมาแรง',
            description: `"${quietAchiever.productName}" โตระเบิด +${quietAchiever.change.revenuePercent.toFixed(0)}% จากฐานเล็กๆ น่าจับตามอง`,
            metric: 'growth',
            value: quietAchiever.change.revenuePercent
        });
    }



    // Basic Revenue/Margin Insights (Fallback if no special insights)
    if (insights.length < 2) {
        if (data.revenue.changePercent >= 20) {
            insights.push({
                id: 'revenue-surge',
                type: 'positive',
                icon: '🚀',
                title: 'ยอดขายพุ่งแรง!',
                description: `รายรับเติบโต +${data.revenue.changePercent.toFixed(1)}% เยี่ยมมาก`,
                metric: 'revenue',
                value: data.revenue.changePercent
            });
        } else if (data.revenue.changePercent <= -20) {
            insights.push({
                id: 'revenue-alarm',
                type: 'negative',
                icon: '🚨',
                title: 'ยอดขายตกหนัก',
                description: `หายไป -${Math.abs(data.revenue.changePercent).toFixed(1)}% ต้องหาสาเหตุด่วน`,
                metric: 'revenue',
                value: data.revenue.changePercent
            });
        }
    }

    return insights;
}

// ============================================================
// Extended Period Presets
// ============================================================

/**
 * Get extended comparison period including Year-over-Year
 */
export function getExtendedComparisonPeriod(
    preset: string,
    customA?: DateRange,
    customB?: DateRange
): { periodA: DateRange; periodB: DateRange; label: string } {
    const today = new Date();

    if (preset === EXTENDED_COMPARISON_PRESETS.YEAR_OVER_YEAR_MONTH) {
        const thisMonthStart = startOfMonth(today);
        const lastYearSameMonth = subYears(thisMonthStart, 1);
        const lastYearMonthEnd = endOfMonth(lastYearSameMonth);

        return {
            label: 'เทียบปีก่อน (เดือนเดียวกัน)',
            periodA: {
                from: thisMonthStart,
                to: endOfDay(today),
                label: format(today, 'MMMM yyyy', { locale: th })
            },
            periodB: {
                from: lastYearSameMonth,
                to: lastYearMonthEnd,
                label: format(lastYearSameMonth, 'MMMM yyyy', { locale: th })
            }
        };
    }

    if (preset === EXTENDED_COMPARISON_PRESETS.CUSTOM && customA && customB) {
        return {
            label: `${customA.label} vs ${customB.label}`,
            periodA: customA,
            periodB: customB
        };
    }

    // Fallback to existing presets
    const yesterday = subDays(today, 1);

    switch (preset) {
        case EXTENDED_COMPARISON_PRESETS.TODAY_VS_YESTERDAY:
            return {
                label: 'วันนี้ vs เมื่อวาน',
                periodA: { from: startOfDay(today), to: endOfDay(today), label: 'วันนี้' },
                periodB: { from: startOfDay(yesterday), to: endOfDay(yesterday), label: 'เมื่อวาน' }
            };

        case EXTENDED_COMPARISON_PRESETS.THIS_WEEK_VS_LAST:
            const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
            const lastWeekStart = subWeeks(thisWeekStart, 1);
            const lastWeekEnd = subDays(thisWeekStart, 1);
            return {
                label: 'สัปดาห์นี้ vs ก่อน',
                periodA: { from: thisWeekStart, to: endOfDay(today), label: 'สัปดาห์นี้' },
                periodB: { from: lastWeekStart, to: endOfDay(lastWeekEnd), label: 'สัปดาห์ก่อน' }
            };

        case EXTENDED_COMPARISON_PRESETS.THIS_MONTH_VS_LAST:
            const thisMonthStart = startOfMonth(today);
            const lastMonthStart = startOfMonth(subMonths(today, 1));
            const lastMonthEnd = endOfMonth(subMonths(today, 1));
            return {
                label: 'เดือนนี้ vs ก่อน',
                periodA: { from: thisMonthStart, to: endOfDay(today), label: format(today, 'MMMM', { locale: th }) },
                periodB: { from: lastMonthStart, to: lastMonthEnd, label: format(lastMonthStart, 'MMMM', { locale: th }) }
            };

        case EXTENDED_COMPARISON_PRESETS.LAST_7_DAYS_VS_PREVIOUS:
            return {
                label: '7 วันล่าสุด vs ก่อน',
                periodA: { from: startOfDay(subDays(today, 6)), to: endOfDay(today), label: '7 วันล่าสุด' },
                periodB: { from: startOfDay(subDays(today, 13)), to: endOfDay(subDays(today, 7)), label: '7 วันก่อนหน้า' }
            };

        case EXTENDED_COMPARISON_PRESETS.LAST_30_DAYS_VS_PREVIOUS:
            return {
                label: '30 วันล่าสุด vs ก่อน',
                periodA: { from: startOfDay(subDays(today, 29)), to: endOfDay(today), label: '30 วันล่าสุด' },
                periodB: { from: startOfDay(subDays(today, 59)), to: endOfDay(subDays(today, 30)), label: '30 วันก่อนหน้า' }
            };

        default:
            return {
                label: 'วันนี้ vs เมื่อวาน',
                periodA: { from: startOfDay(today), to: endOfDay(today), label: 'วันนี้' },
                periodB: { from: startOfDay(yesterday), to: endOfDay(yesterday), label: 'เมื่อวาน' }
            };
    }
}

// ============================================================
// Export Utilities
// ============================================================

/**
 * Convert comparison data to CSV format
 */
export function exportComparisonToCSV(
    metrics: EnhancedComparisonMetrics,
    periodA: DateRange,
    periodB: DateRange
): string {
    const lines: string[] = [];

    // Header
    lines.push('ตัวชี้วัด,' + periodA.label + ',' + periodB.label + ',เปลี่ยนแปลง,เปลี่ยนแปลง %');

    // Metrics
    lines.push(`รายรับ,${metrics.revenue.current},${metrics.revenue.previous},${metrics.revenue.change},${metrics.revenue.changePercent.toFixed(1)}%`);
    lines.push(`กำไร,${metrics.profit.current},${metrics.profit.previous},${metrics.profit.change},${metrics.profit.changePercent.toFixed(1)}%`);
    lines.push(`ต้นทุน,${metrics.cost.current},${metrics.cost.previous},${metrics.cost.change},${metrics.cost.changePercent.toFixed(1)}%`);
    lines.push(`ขายได้,${metrics.soldQty.current},${metrics.soldQty.previous},${metrics.soldQty.change},${metrics.soldQty.changePercent.toFixed(1)}%`);
    lines.push(`Margin %,${metrics.margin.current.toFixed(1)},${metrics.margin.previous.toFixed(1)},${metrics.margin.change.toFixed(1)},${metrics.margin.changePercent.toFixed(1)}%`);
    lines.push(`รายการ,${metrics.transactionCount.current},${metrics.transactionCount.previous},${metrics.transactionCount.change},${metrics.transactionCount.changePercent.toFixed(1)}%`);

    // Product breakdown
    lines.push('');
    lines.push('รายละเอียดสินค้า');
    lines.push('สินค้า,รายรับ (ปัจจุบัน),รายรับ (ก่อน),เปลี่ยนแปลง %');
    metrics.productBreakdown.slice(0, 20).forEach(p => {
        const name = p.variantName ? `${p.productName} - ${p.variantName}` : p.productName;
        lines.push(`${name},${p.current.revenue},${p.previous.revenue},${p.change.revenuePercent.toFixed(1)}%`);
    });

    return lines.join('\n');
}
