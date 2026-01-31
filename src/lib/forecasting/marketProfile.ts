// ============================================================
// 🏪 Market Profile Intelligence
// Learn and track behavior patterns for each market
// ============================================================

import { ProductSaleLog } from '@/types';

// ============================================================
// Types
// ============================================================

export interface MarketProfile {
    marketId: string;
    marketName: string;

    // Traffic patterns
    avgBasketSize: number;          // Items per transaction
    avgTransactionValue: number;    // Revenue per transaction
    peakDayOfWeek: number;          // 0-6
    worstDayOfWeek: number;         // 0-6
    dayOfWeekFactors: Record<number, number>; // Factor per day

    // Sensitivity factors
    weatherSensitivity: number;     // 0-1 (0 = immune, 1 = very sensitive)
    paydaySensitivity: number;      // 0-2 (1 = normal effect)
    holidaySensitivity: number;     // 0-2

    // Product preferences
    topProducts: Array<{ productId: string; productName: string; avgQty: number }>;
    productMix: Record<string, number>; // productId -> avg daily qty

    // Reliability metrics
    salesVolatility: number;        // CV of daily sales
    dataPoints: number;             // Days of data
    lastUpdated: string;

    // Derived insights
    marketType: 'high-traffic' | 'medium-traffic' | 'low-traffic';
    reliability: 'high' | 'medium' | 'low';
}

export interface MarketComparison {
    metric: string;
    markets: Array<{ marketId: string; marketName: string; value: number; rank: number }>;
}

// ============================================================
// Analysis Functions
// ============================================================

/**
 * Build a market profile from sales data
 */
export function buildMarketProfile(
    marketId: string,
    marketName: string,
    sales: ProductSaleLog[]
): MarketProfile {
    // Filter sales for this market
    const marketSales = sales.filter(s => s.marketId === marketId);

    if (marketSales.length === 0) {
        return createEmptyProfile(marketId, marketName);
    }

    // Group by date
    const salesByDate: Record<string, ProductSaleLog[]> = {};
    marketSales.forEach(s => {
        if (!salesByDate[s.saleDate]) salesByDate[s.saleDate] = [];
        salesByDate[s.saleDate].push(s);
    });

    const dates = Object.keys(salesByDate).sort();
    const dataPoints = dates.length;

    // Calculate basket size (items per transaction)
    // Assuming each sale record is a transaction - simplification
    const totalQty = marketSales.reduce((sum, s) => sum + s.quantitySold, 0);
    const totalTransactions = marketSales.length;
    const avgBasketSize = totalTransactions > 0 ? totalQty / totalTransactions : 0;

    // Calculate avg transaction value
    const totalRevenue = marketSales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Day of week analysis
    const dayOfWeekData: Record<number, { revenue: number; count: number }> = {};
    for (let day = 0; day < 7; day++) {
        dayOfWeekData[day] = { revenue: 0, count: 0 };
    }

    dates.forEach(date => {
        const dayOfWeek = new Date(date).getDay();
        const dayRevenue = salesByDate[date].reduce((sum, s) => sum + s.totalRevenue, 0);
        dayOfWeekData[dayOfWeek].revenue += dayRevenue;
        dayOfWeekData[dayOfWeek].count++;
    });

    // Calculate day of week factors
    const avgDailyRevenue = totalRevenue / dataPoints;
    const dayOfWeekFactors: Record<number, number> = {};
    let peakDayOfWeek = 0;
    let peakRevenue = 0;
    let worstDayOfWeek = 0;
    let worstRevenue = Infinity;

    for (let day = 0; day < 7; day++) {
        if (dayOfWeekData[day].count > 0) {
            const dayAvg = dayOfWeekData[day].revenue / dayOfWeekData[day].count;
            dayOfWeekFactors[day] = avgDailyRevenue > 0 ? dayAvg / avgDailyRevenue : 1;

            if (dayAvg > peakRevenue) {
                peakRevenue = dayAvg;
                peakDayOfWeek = day;
            }
            if (dayAvg < worstRevenue) {
                worstRevenue = dayAvg;
                worstDayOfWeek = day;
            }
        } else {
            dayOfWeekFactors[day] = 1;
        }
    }

    // Calculate sales volatility (CV)
    const dailyRevenues = dates.map(date =>
        salesByDate[date].reduce((sum, s) => sum + s.totalRevenue, 0)
    );
    const meanRevenue = dailyRevenues.reduce((a, b) => a + b, 0) / dailyRevenues.length;
    const variance = dailyRevenues.reduce((sum, r) => sum + Math.pow(r - meanRevenue, 2), 0) / dailyRevenues.length;
    const salesVolatility = meanRevenue > 0 ? Math.sqrt(variance) / meanRevenue : 0;

    // Top products
    const productSales: Record<string, { productId: string; productName: string; qty: number }> = {};
    marketSales.forEach(s => {
        const key = s.productId;
        if (!productSales[key]) {
            productSales[key] = { productId: s.productId, productName: s.productName, qty: 0 };
        }
        productSales[key].qty += s.quantitySold;
    });

    const topProducts = Object.values(productSales)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)
        .map(p => ({ ...p, avgQty: p.qty / dataPoints }));

    // Product mix (avg daily qty per product)
    const productMix: Record<string, number> = {};
    Object.entries(productSales).forEach(([pid, data]) => {
        productMix[pid] = data.qty / dataPoints;
    });

    // Determine market type by traffic
    const marketType: 'high-traffic' | 'medium-traffic' | 'low-traffic' =
        avgDailyRevenue >= 5000 ? 'high-traffic' :
            avgDailyRevenue >= 2000 ? 'medium-traffic' : 'low-traffic';

    // Determine reliability by data points
    const reliability: 'high' | 'medium' | 'low' =
        dataPoints >= 30 ? 'high' :
            dataPoints >= 14 ? 'medium' : 'low';

    // Default sensitivities (will be learned over time)
    const weatherSensitivity = 0.5; // Default: moderate
    const paydaySensitivity = 1.2;  // Default: +20% on payday
    const holidaySensitivity = 1.0; // Default: no effect

    return {
        marketId,
        marketName,
        avgBasketSize,
        avgTransactionValue,
        peakDayOfWeek,
        worstDayOfWeek,
        dayOfWeekFactors,
        weatherSensitivity,
        paydaySensitivity,
        holidaySensitivity,
        topProducts,
        productMix,
        salesVolatility,
        dataPoints,
        lastUpdated: new Date().toISOString(),
        marketType,
        reliability
    };
}

/**
 * Create empty profile for new/unknown market
 */
function createEmptyProfile(marketId: string, marketName: string): MarketProfile {
    return {
        marketId,
        marketName,
        avgBasketSize: 1,
        avgTransactionValue: 0,
        peakDayOfWeek: 6, // Assume Saturday
        worstDayOfWeek: 1, // Assume Monday
        dayOfWeekFactors: { 0: 1, 1: 0.8, 2: 0.9, 3: 0.9, 4: 1.0, 5: 1.1, 6: 1.2 },
        weatherSensitivity: 0.5,
        paydaySensitivity: 1.2,
        holidaySensitivity: 1.0,
        topProducts: [],
        productMix: {},
        salesVolatility: 0.3,
        dataPoints: 0,
        lastUpdated: new Date().toISOString(),
        marketType: 'medium-traffic',
        reliability: 'low'
    };
}

/**
 * Get day of week adjustment factor for a market
 */
export function getMarketDayFactor(
    profile: MarketProfile | null,
    dayOfWeek: number
): number {
    if (!profile || !profile.dayOfWeekFactors[dayOfWeek]) {
        // Default factors if no profile
        const defaults: Record<number, number> = {
            0: 1.15, // Sunday - markets usually busier
            1: 0.85, // Monday
            2: 0.90,
            3: 0.95,
            4: 1.00,
            5: 1.10,
            6: 1.20  // Saturday - busiest
        };
        return defaults[dayOfWeek] || 1.0;
    }

    return profile.dayOfWeekFactors[dayOfWeek];
}

/**
 * Get product recommendation for a market
 */
export function getProductRecommendation(
    profile: MarketProfile,
    productId: string
): {
    avgDailyQty: number;
    isTopProduct: boolean;
    recommendation: string;
} {
    const avgDailyQty = profile.productMix[productId] || 0;
    const isTopProduct = profile.topProducts.some(p => p.productId === productId);

    let recommendation = '';
    if (isTopProduct) {
        recommendation = 'สินค้าขายดีในตลาดนี้ - แนะนำเตรียมเผื่อ';
    } else if (avgDailyQty > 0) {
        recommendation = `ขายเฉลี่ย ${avgDailyQty.toFixed(1)} ชิ้น/วัน`;
    } else {
        recommendation = 'ยังไม่เคยขายในตลาดนี้';
    }

    return { avgDailyQty, isTopProduct, recommendation };
}

/**
 * Compare markets on key metrics
 */
export function compareMarkets(profiles: MarketProfile[]): MarketComparison[] {
    if (profiles.length === 0) return [];

    const comparisons: MarketComparison[] = [];

    // Revenue comparison
    const revenueRanked = [...profiles]
        .map(p => ({
            marketId: p.marketId,
            marketName: p.marketName,
            value: p.avgTransactionValue * (p.dataPoints > 0 ? p.dataPoints : 1)
        }))
        .sort((a, b) => b.value - a.value)
        .map((m, idx) => ({ ...m, rank: idx + 1 }));
    comparisons.push({ metric: 'Total Revenue', markets: revenueRanked });

    // Basket size comparison
    const basketRanked = [...profiles]
        .map(p => ({
            marketId: p.marketId,
            marketName: p.marketName,
            value: p.avgBasketSize
        }))
        .sort((a, b) => b.value - a.value)
        .map((m, idx) => ({ ...m, rank: idx + 1 }));
    comparisons.push({ metric: 'Basket Size', markets: basketRanked });

    // Stability (inverse of volatility)
    const stabilityRanked = [...profiles]
        .map(p => ({
            marketId: p.marketId,
            marketName: p.marketName,
            value: 1 - p.salesVolatility // Higher = more stable
        }))
        .sort((a, b) => b.value - a.value)
        .map((m, idx) => ({ ...m, rank: idx + 1 }));
    comparisons.push({ metric: 'Sales Stability', markets: stabilityRanked });

    return comparisons;
}

/**
 * Get smart adjustment based on market profile
 */
export function getMarketAdjustment(
    baseQty: number,
    profile: MarketProfile | null,
    dayOfWeek: number,
    isPayday: boolean
): {
    adjustedQty: number;
    factors: Array<{ name: string; factor: number }>;
} {
    const factors: Array<{ name: string; factor: number }> = [];
    let adjustedQty = baseQty;

    if (!profile) {
        return { adjustedQty, factors };
    }

    // Apply day of week factor
    const dayFactor = getMarketDayFactor(profile, dayOfWeek);
    if (Math.abs(dayFactor - 1) > 0.05) {
        factors.push({
            name: `วัน${getDayName(dayOfWeek)} (${profile.marketName})`,
            factor: dayFactor
        });
        adjustedQty *= dayFactor;
    }

    // Apply payday sensitivity
    if (isPayday && profile.paydaySensitivity !== 1.0) {
        factors.push({ name: 'Payday Effect', factor: profile.paydaySensitivity });
        adjustedQty *= profile.paydaySensitivity;
    }

    return {
        adjustedQty: Math.max(0, Math.round(adjustedQty)),
        factors
    };
}

// Helper
function getDayName(dayOfWeek: number): string {
    const names = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
    return names[dayOfWeek] || '';
}

export default {
    buildMarketProfile,
    getMarketDayFactor,
    getProductRecommendation,
    compareMarkets,
    getMarketAdjustment
};
