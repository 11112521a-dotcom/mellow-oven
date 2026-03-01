// ============================================================
// 🏪 Market Analysis Utilities
// Deep-dive analysis functions for single market
// 🛡️ Mellow Oven Standards Compliance:
// - #12: Pure functions, no side effects
// - #19: All constants named
// - #20: Single responsibility
// ============================================================

import { ProductSaleLog, DailyInventory } from '../../store/types';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { calculateProductSeasonality, predictProduction } from './forecastingUtils';

// Helper to extend ProductSaleLog if types are not yet updated globally (Safety)
interface ExtendedProductSaleLog extends ProductSaleLog {
    eatQty?: number;
    giveawayQty?: number;
}

// ============================================================
// Types
// ============================================================

export interface EnhancedMarketMetrics {
    // Basic (existing)
    marketId: string;
    marketName: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    soldQty: number;
    transactionCount: number;

    // Extended
    revenuePerDay: number;
    profitPerDay: number;
    itemsPerTransaction: number;
    uniqueProductCount: number;
    avgTransactionValue: number;
    marketContribution: number; // % of total revenue

    // Working days
    activeDays: number;
}

export interface ProductAnalysis {
    productId: string;
    productName: string;
    variantName?: string;
    revenue: number;
    cost: number;
    profit: number;
    margin: number;
    soldQty: number;
    avgPrice: number;
    revenueShare: number; // % of market's revenue
    rank: number;
    eatQty?: number; // NEW
    giveawayQty?: number; // NEW
    // 🔮 Forecasting Integration
    suggestedProduction?: number; // For "Tomorrow"
    seasonalityScore?: number; // Confidence level
}

export interface ProductIntelligence {
    topProducts: ProductAnalysis[];      // Top 3 best sellers
    lowMarginProducts: ProductAnalysis[]; // Margin < LOW_MARGIN_THRESHOLD
    highMarginStars: ProductAnalysis[];   // Margin > HIGH_MARGIN_THRESHOLD
    allProducts: ProductAnalysis[];       // All products sorted by revenue
}

export interface DayOfWeekAnalysis {
    dayName: string;
    dayIndex: number; // 0=Sunday, 1=Monday, etc.
    revenue: number;
    profit: number;
    soldQty: number;
    transactionCount: number;
    avgRevenue: number;
    daysCount: number; // How many of this weekday in the data
    percentOfAvg: number; // % compared to overall average
    isBestDay: boolean;
    isWorstDay: boolean;
}

export interface DailyProductDetail {
    productId: string;
    productName: string;
    variantName?: string;
    quantity: number;
    revenue: number;
    profit: number;
    marketName?: string; // NEW
    // NEW: Inventory Data
    preparedQty?: number; // Produced + StockYesterday - WasteHome
    leftoverQty?: number; // Unsold
    eatQty?: number; // NEW
    giveawayQty?: number; // NEW
    wasteQty?: number; // NEW
}

export interface DailyBreakdown {
    date: string;
    dayName: string;
    revenue: number;
    profit: number;
    soldQty: number;
    transactionCount: number;
    margin: number;
    isBestDay: boolean;
    isWorstDay: boolean;
    products: DailyProductDetail[];
}

export type InsightType = 'positive' | 'negative' | 'neutral' | 'warning';

export interface MarketInsight {
    id: string;
    type: InsightType;
    icon: string;
    title: string;
    description: string;
    value?: number;
}

export interface EnhancedMarketData {
    metrics: EnhancedMarketMetrics;
    productIntelligence: ProductIntelligence;
    dayOfWeekAnalysis: DayOfWeekAnalysis[];
    dailyBreakdown: DailyBreakdown[];
    insights: MarketInsight[];
    dateRange: { from: string; to: string };
}

// ============================================================
// Constants
// ============================================================
const LOW_MARGIN_THRESHOLD = 20;
const HIGH_MARGIN_THRESHOLD = 40;
const TOP_PRODUCTS_LIMIT = 3;
const DAY_NAMES_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];



// ... existing ...

// Helper to aggregate daily stats
// Support function for calculating daily breakdowns
function calculateDailyBreakdownInternal(sales: ProductSaleLog[], inventory: DailyInventory[] = []): DailyBreakdown[] {
    const dailyMap: Record<string, {
        revenue: number;
        cost: number;
        profit: number;
        soldQty: number;
        transactionCount: number;
        productMap: Record<string, DailyProductDetail>;
    }> = {};

    sales.forEach(s => {
        if (!dailyMap[s.saleDate]) {
            dailyMap[s.saleDate] = {
                revenue: 0,
                cost: 0,
                profit: 0,
                soldQty: 0,
                transactionCount: 0,
                productMap: {}
            };
        }
        const day = dailyMap[s.saleDate];
        day.revenue += s.totalRevenue;
        day.cost += s.totalCost;
        day.profit += s.grossProfit;
        day.soldQty += s.quantitySold;
        day.transactionCount += 1;

        // Track per-product details
        const productKey = `${s.marketId}-${s.variantId || s.productId}`;
        if (!day.productMap[productKey]) {
            day.productMap[productKey] = {
                productId: s.productId,
                productName: s.productName,
                variantName: s.variantName,
                marketName: s.marketName,
                quantity: 0, // Quantity Sold
                revenue: 0,
                profit: 0,
                eatQty: 0, // NEW
                giveawayQty: 0, // NEW
                wasteQty: 0 // NEW
            };
        }
        day.productMap[productKey].quantity += s.quantitySold;
        day.productMap[productKey].revenue += s.totalRevenue;
        day.productMap[productKey].profit += s.grossProfit;
        const sExt = s as ExtendedProductSaleLog;
        day.productMap[productKey].eatQty = (day.productMap[productKey].eatQty || 0) + (sExt.eatQty || 0); // NEW
        day.productMap[productKey].giveawayQty = (day.productMap[productKey].giveawayQty || 0) + (sExt.giveawayQty || 0); // NEW
        day.productMap[productKey].wasteQty = (day.productMap[productKey].wasteQty || 0) + (s.wasteQty || 0); // NEW
    });

    // Merge Inventory ... (rest of function)

    // Merge Inventory
    if (inventory.length > 0) {
        Object.keys(dailyMap).forEach(date => {
            const dayInventory = inventory.filter(i => i.businessDate === date);
            dayInventory.forEach(inv => {
                const prodIdPart = inv.variantId || inv.productId;
                const specificKey = inv.marketId ? `${inv.marketId}-${prodIdPart}` : null;

                // Strategy 1: Exact Match (if inventory has marketId)
                if (specificKey && dailyMap[date].productMap[specificKey]) {
                    const breakdown = dailyMap[date].productMap[specificKey];
                    breakdown.preparedQty = inv.toShopQty;
                    breakdown.leftoverQty = inv.unsoldShop;
                    return;
                }

                // Strategy 2: Fallback (Legacy data or missing marketId in inventory)
                // Find any sales entry for this product on this day
                // Note: If multiple markets sold the same product but we only have 1 global inventory record,
                // we assign it to the first found market to avoid data loss, though attribution might be imprecise.
                const fallbackKey = Object.keys(dailyMap[date].productMap).find(k =>
                    k.endsWith(`-${prodIdPart}`)
                );

                if (fallbackKey) {
                    const breakdown = dailyMap[date].productMap[fallbackKey];
                    // Only set if not already set (preserve data integrity if mixed records exist)
                    if (breakdown.preparedQty === undefined) {
                        breakdown.preparedQty = inv.toShopQty;
                        breakdown.leftoverQty = inv.unsoldShop;
                    }
                }
            });
        });
    }

    return Object.entries(dailyMap)
        .map(([date, data]) => ({
            date,
            dayName: new Date(date).toLocaleDateString('th-TH', { weekday: 'long' }),
            revenue: data.revenue,
            profit: data.profit,
            soldQty: data.soldQty,
            transactionCount: data.transactionCount,
            margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
            isBestDay: false,
            isWorstDay: false,
            products: Object.values(data.productMap).sort((a, b) => b.revenue - a.revenue)
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateEnhancedMarketData(
    sales: ProductSaleLog[],
    marketId: string,
    marketName: string,
    fromDate: string,
    toDate: string,
    totalRevenue: number,
    inventory: DailyInventory[] = []
): EnhancedMarketData {
    // 1. Filter Sales
    const marketSales = sales.filter(s => {
        const dateMatch = s.saleDate >= fromDate && s.saleDate <= toDate;
        const marketMatch = marketId === 'all' ? true : s.marketId === marketId;
        return dateMatch && marketMatch;
    });

    const marketRevenue = marketSales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const marketCost = marketSales.reduce((sum, s) => sum + s.totalCost, 0);
    const marketProfit = marketSales.reduce((sum, s) => sum + s.grossProfit, 0);
    const marketSoldQty = marketSales.reduce((sum, s) => sum + s.quantitySold, 0);
    const activeDays = new Set(marketSales.map(s => s.saleDate)).size;

    // 2. Product Intelligence
    const productMap = new Map<string, ProductAnalysis>();
    marketSales.forEach(sale => {
        const key = sale.variantId ? `${sale.productId}-${sale.variantId}` : sale.productId;
        if (!productMap.has(key)) {
            productMap.set(key, {
                productId: sale.productId,
                productName: sale.productName,
                variantName: sale.variantName,
                soldQty: 0, revenue: 0, cost: 0, profit: 0, margin: 0, rank: 0, revenueShare: 0,
                avgPrice: 0, // Initialize avgPrice
                eatQty: 0, // NEW
                giveawayQty: 0 // NEW
            });
        }
        const p = productMap.get(key)!;
        p.soldQty += sale.quantitySold;
        p.revenue += sale.totalRevenue;
        p.cost += sale.totalCost;
        p.profit += sale.grossProfit;
        const saleExt = sale as ExtendedProductSaleLog;
        p.eatQty = (p.eatQty || 0) + (saleExt.eatQty || 0); // NEW
        p.giveawayQty = (p.giveawayQty || 0) + (saleExt.giveawayQty || 0); // NEW
    });

    const allProducts = Array.from(productMap.values()).map(p => ({
        ...p,
        margin: p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0,
        revenueShare: marketRevenue > 0 ? (p.revenue / marketRevenue) * 100 : 0,
        avgPrice: p.soldQty > 0 ? p.revenue / p.soldQty : 0 // Calculate avgPrice
    })).sort((a, b) => b.revenue - a.revenue);

    allProducts.forEach((p, i) => p.rank = i + 1);

    // 3. Daily Breakdown
    const dailyBreakdown = calculateDailyBreakdownInternal(marketSales, inventory);
    if (dailyBreakdown.length > 0) {
        const maxRev = Math.max(...dailyBreakdown.map(d => d.revenue));
        const minRev = Math.min(...dailyBreakdown.map(d => d.revenue));
        dailyBreakdown.forEach(d => {
            if (d.revenue === maxRev && maxRev > 0) d.isBestDay = true;
            if (d.revenue === minRev && dailyBreakdown.length > 1) d.isWorstDay = true;
        });
    }

    // 4. Insights
    const insights: MarketInsight[] = [];
    const avgMargin = marketRevenue > 0 ? (marketProfit / marketRevenue) * 100 : 0;
    if (avgMargin > 40) insights.push({ id: 'high-margin', type: 'positive', icon: '🌟', title: 'กำไรดีเยี่ยม', description: 'Margin เฉลี่ยสูงกว่า 40%' });
    if (allProducts.length > 0 && allProducts[0].revenueShare > 30) insights.push({ id: 'top-heavy', type: 'neutral', icon: '👑', title: 'สินค้าฮีโร่', description: `${allProducts[0].productName} สร้างยอดขายหลัก (${allProducts[0].revenueShare.toFixed(0)}%)` });

    const itemsPerTx = marketSales.length > 0 ? marketSoldQty / marketSales.length : 0;
    if (itemsPerTx > 5) insights.push({ id: 'big-basket', type: 'positive', icon: '🛒', title: 'ตะกร้าใหญ่', description: 'ลูกค้าซื้อจำนวนชิ้นต่อครั้งเยอะ' });

    // 5. Day of Week Analysis
    const dayStats: Record<number, { revenue: number, count: number }> = {};
    marketSales.forEach(s => {
        const day = new Date(s.saleDate).getDay();
        if (!dayStats[day]) dayStats[day] = { revenue: 0, count: 0 };
        dayStats[day].revenue += s.totalRevenue;
        dayStats[day].count += 1;
    });

    const dayOfWeekAnalysis: DayOfWeekAnalysis[] = Object.keys(dayStats).map(key => {
        const dayIndex = Number(key);
        return {
            dayName: ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][dayIndex],
            dayIndex,
            revenue: dayStats[dayIndex].revenue,
            profit: 0, soldQty: 0, transactionCount: dayStats[dayIndex].count,
            avgRevenue: dayStats[dayIndex].revenue, daysCount: 1, percentOfAvg: 0,
            isBestDay: false, isWorstDay: false
        };
    });

    return {
        metrics: {
            revenue: marketRevenue,
            profit: marketProfit,
            cost: marketCost,
            soldQty: marketSoldQty,
            margin: avgMargin,
            transactionCount: marketSales.length,
            revenuePerDay: activeDays > 0 ? marketRevenue / activeDays : 0,
            profitPerDay: activeDays > 0 ? marketProfit / activeDays : 0,
            activeDays,
            itemsPerTransaction: itemsPerTx,
            uniqueProductCount: allProducts.length,
            marketName: marketName,
            marketContribution: totalRevenue > 0 ? (marketRevenue / totalRevenue) * 100 : 0,
            marketId: marketId,
            avgTransactionValue: marketSales.length > 0 ? marketRevenue / marketSales.length : 0
        },
        productIntelligence: {
            topProducts: allProducts.slice(0, 5),
            lowMarginProducts: allProducts.filter(p => p.margin < 20).sort((a, b) => a.margin - b.margin),
            highMarginStars: allProducts.filter(p => p.margin > 40),
            allProducts
        },
        dailyBreakdown,
        dayOfWeekAnalysis,
        dateRange: { from: fromDate, to: toDate },
        insights
    };
}

// ============================================================
// Smart Insights Generation
// ============================================================

function generateMarketInsights(
    metrics: EnhancedMarketMetrics,
    products: ProductIntelligence,
    dayOfWeek: DayOfWeekAnalysis[],
    daily: DailyBreakdown[]
): MarketInsight[] {
    const insights: MarketInsight[] = [];

    // 1. Best selling product
    if (products.topProducts.length > 0) {
        const top = products.topProducts[0];
        insights.push({
            id: 'top-product',
            type: 'positive',
            icon: '🏆',
            title: `${top.productName} ขายดีที่สุด`,
            description: `คิดเป็น ${top.revenueShare.toFixed(0)}% ของรายรับตลาดนี้`,
            value: top.revenueShare
        });
    }

    // 2. Best day of week
    const bestDay = dayOfWeek.find(d => d.isBestDay && d.daysCount > 0);
    if (bestDay && bestDay.percentOfAvg > 10) {
        insights.push({
            id: 'best-weekday',
            type: 'positive',
            icon: '📅',
            title: `วัน${bestDay.dayName}ขายดีที่สุด`,
            description: `สูงกว่าค่าเฉลี่ย ${bestDay.percentOfAvg.toFixed(0)}%`,
            value: bestDay.percentOfAvg
        });
    }

    // 3. Low margin warning
    if (products.lowMarginProducts.length > 0) {
        const count = products.lowMarginProducts.length;
        insights.push({
            id: 'low-margin',
            type: 'warning',
            icon: '⚠️',
            title: `${count} สินค้า Margin ต่ำ`,
            description: `มี ${count} รายการที่ Margin < ${LOW_MARGIN_THRESHOLD}%`,
            value: count
        });
    }

    // 4. High margin stars
    if (products.highMarginStars.length > 0) {
        const count = products.highMarginStars.length;
        insights.push({
            id: 'high-margin',
            type: 'positive',
            icon: '🌟',
            title: `${count} สินค้า Margin สูง`,
            description: `มี ${count} รายการที่ Margin > ${HIGH_MARGIN_THRESHOLD}%`,
            value: count
        });
    }

    // 5. Market contribution
    if (metrics.marketContribution >= 30) {
        insights.push({
            id: 'major-market',
            type: 'positive',
            icon: '🎯',
            title: 'ตลาดหลัก',
            description: `คิดเป็น ${metrics.marketContribution.toFixed(0)}% ของรายรับรวม`,
            value: metrics.marketContribution
        });
    }

    // 6. High items per transaction
    if (metrics.itemsPerTransaction >= 2) {
        insights.push({
            id: 'high-basket',
            type: 'positive',
            icon: '🛒',
            title: 'ตะกร้าใหญ่',
            description: `เฉลี่ย ${metrics.itemsPerTransaction.toFixed(1)} ชิ้น/รายการ`,
            value: metrics.itemsPerTransaction
        });
    }

    // 7. Profit margin overall
    if (metrics.margin >= HIGH_MARGIN_THRESHOLD) {
        insights.push({
            id: 'good-margin',
            type: 'positive',
            icon: '💰',
            title: 'กำไรดี',
            description: `Margin รวม ${metrics.margin.toFixed(1)}%`,
            value: metrics.margin
        });
    } else if (metrics.margin < LOW_MARGIN_THRESHOLD && metrics.margin >= 0) {
        insights.push({
            id: 'low-overall-margin',
            type: 'warning',
            icon: '📉',
            title: 'Margin ต่ำ',
            description: `Margin รวมเพียง ${metrics.margin.toFixed(1)}%`,
            value: metrics.margin
        });
    }

    // 8. Unique products
    if (metrics.uniqueProductCount >= 10) {
        insights.push({
            id: 'diverse-products',
            type: 'neutral',
            icon: '📦',
            title: 'สินค้าหลากหลาย',
            description: `ขาย ${metrics.uniqueProductCount} รายการที่แตกต่างกัน`,
            value: metrics.uniqueProductCount
        });
    }

    return insights;
}

// ============================================================
// Export Functions
// ============================================================

export function exportMarketToCSV(data: EnhancedMarketData): string {
    const lines: string[] = [];

    // Header
    lines.push(`รายงานตลาด: ${data.metrics.marketName}`);
    lines.push(`ช่วงเวลา: ${data.dateRange.from} ถึง ${data.dateRange.to}`);
    lines.push('');

    // Summary Metrics
    lines.push('=== สรุปภาพรวม ===');
    lines.push(`รายรับรวม,${data.metrics.revenue}`);
    lines.push(`ต้นทุนรวม,${data.metrics.cost}`);
    lines.push(`กำไรรวม,${data.metrics.profit}`);
    lines.push(`Margin,${data.metrics.margin.toFixed(2)}%`);
    lines.push(`จำนวนขาย,${data.metrics.soldQty} ชิ้น`);
    lines.push(`จำนวนรายการ,${data.metrics.transactionCount}`);
    lines.push(`รายรับ/วัน,${data.metrics.revenuePerDay.toFixed(2)}`);
    lines.push(`กำไร/วัน,${data.metrics.profitPerDay.toFixed(2)}`);
    lines.push(`ชิ้น/รายการ,${data.metrics.itemsPerTransaction.toFixed(2)}`);
    lines.push(`สินค้าที่ขาย,${data.metrics.uniqueProductCount} รายการ`);
    lines.push(`สัดส่วนตลาด,${data.metrics.marketContribution.toFixed(2)}%`);
    lines.push('');

    // Product breakdown
    lines.push('=== รายละเอียดสินค้า ===');
    lines.push('อันดับ,สินค้า,Variant,ขายได้,รายรับ,ต้นทุน,กำไร,Margin,ราคาเฉลี่ย,สัดส่วน%');
    data.productIntelligence.allProducts.forEach(p => {
        lines.push(`${p.rank},${p.productName},${p.variantName || '-'},${p.soldQty},${p.revenue},${p.cost},${p.profit},${p.margin.toFixed(1)}%,${p.avgPrice.toFixed(2)},${p.revenueShare.toFixed(1)}%`);
    });
    lines.push('');

    // Day of week
    lines.push('=== วิเคราะห์ตามวัน ===');
    lines.push('วัน,รายรับรวม,กำไร,ขายได้,จำนวนวัน,รายรับเฉลี่ย/วัน,เทียบค่าเฉลี่ย');
    data.dayOfWeekAnalysis.forEach(d => {
        lines.push(`${d.dayName},${d.revenue},${d.profit},${d.soldQty},${d.daysCount},${d.avgRevenue.toFixed(2)},${d.percentOfAvg >= 0 ? '+' : ''}${d.percentOfAvg.toFixed(1)}%`);
    });
    lines.push('');

    // Daily breakdown
    lines.push('=== รายละเอียดรายวัน ===');
    lines.push('วันที่,วัน,รายรับ,กำไร,ขายได้,รายการ,Margin');
    data.dailyBreakdown.forEach(d => {
        lines.push(`${d.date},${d.dayName},${d.revenue},${d.profit},${d.soldQty},${d.transactionCount},${d.margin.toFixed(1)}%`);
        // Add product details for CSV? Maybe just keep summary for now as requested.
        // User asked for "Check easily", so maybe details are better in UI/PDF.
    });

    return lines.join('\n');
}

// ============================================================
// PDF Export (Print-to-PDF)
// ============================================================

const formatCurrencyPDF = (value: number): string => {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

export function generateMarketPDFReport(data: EnhancedMarketData): void {
    const { metrics, productIntelligence, dailyBreakdown, dateRange, insights } = data; // Added insights
    const { allProducts } = productIntelligence;

    // Local Formatters
    const formatCurrencyPDF = (amount: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
    const formatNumberPDF = (num: number) => num.toLocaleString('th-TH');

    // Build HTML content - Beautiful Design MATCHING UI
    const html = `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>รายงานตลาด ${metrics.marketName}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; 
            font-size: 10px;
            color: #44403c; /* stone-700 */
            background: #fff;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
        }
        
        .page { padding: 24px; max-width: 100%; margin: 0 auto; }
        
        /* 🎨 HEADER HERO SECTION */
        .header-hero { 
            background: linear-gradient(135deg, #f59e0b, #f97316, #d97706); /* amber-500 via orange-500 to amber-600 */
            color: white;
            padding: 20px;
            border-radius: 16px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
        }
        
        .market-title { font-size: 24px; font-weight: 700; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
        .market-date { font-size: 11px; opacity: 0.9; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 6px; display: inline-block; }
        
        /* Stats Grid inside Header */
        .hero-stats-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 12px; 
        }
        
        .hero-stat {
            background: rgba(255, 255, 255, 0.2);
            padding: 12px;
            border-radius: 12px;
            backdrop-filter: blur(4px);
        }
        
        .hero-stat.highlight { background: rgba(255, 255, 255, 0.3); border: 1px solid rgba(255,255,255,0.4); }
        
        .hero-stat-label { font-size: 10px; opacity: 0.9; margin-bottom: 2px; display: flex; align-items: center; gap: 4px; }
        .hero-stat-value { font-size: 18px; font-weight: 700; }
        
        /* 💡 SMART INSIGHTS */
        .insights-section {
            background: #f5f3ff; /* violet/indigo-50 mix */
            border: 1px solid #e0e7ff;
            border-radius: 16px;
            padding: 12px 16px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        
        .insight-badge {
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 9px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
            border: 1px solid transparent;
        }
        
        .insight-positive { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
        .insight-warning { background: #fef3c7; color: #92400e; border-color: #fde68a; }
        .insight-neutral { background: #f5f5f4; color: #57534e; border-color: #e7e5e4; }
        
        /* 📊 METRICS GRID */
        .section-title { 
            font-size: 14px; 
            font-weight: 700; 
            color: #44403c;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 24px;
        }
        
        .metric-card {
            background: #fff;
            border-radius: 12px;
            padding: 12px;
            /* border: 1px solid #e7e5e4; replaced by specific colors below */
        }
        
        .metric-label { font-size: 10px; color: #57534e; margin-bottom: 4px; display: flex; align-items: center; gap: 4px; }
        .metric-value { font-size: 16px; font-weight: 700; color: #1c1917; }
        .metric-sub { font-size: 9px; color: #78716c; margin-top: 2px; }

        /* Metric Colors matching UI */
        .metric-sky { background: #f0f9ff; }
        .metric-emerald { background: #ecfdf5; }
        .metric-rose { background: #fff1f2; }
        .metric-violet { background: #f5f3ff; }
        .metric-amber { background: #fffbeb; }
        .metric-teal { background: #f0fdfa; }
        .metric-indigo { background: #eef2ff; }
        .metric-orange { background: #fff7ed; }

        /* 🛍️ PRODUCT ANALYSIS CARDS */
        .product-cards-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .analysis-card {
            border-radius: 12px;
            padding: 12px;
            border: 1px solid transparent;
        }
        
        .card-amber { background: #fffbeb; border-color: #fde68a; }
        .card-rose { background: #fff1f2; border-color: #fecaca; }
        .card-emerald { background: #ecfdf5; border-color: #a7f3d0; }
        
        .card-title { font-size: 11px; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 5px; }
        
        .mini-product-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px; 
            padding: 3px 0;
            border-bottom: 1px dashed rgba(0,0,0,0.05);
        }
        .mini-product-row:last-child { border-bottom: none; }
        
        /* 📄 TABLES */
        .table-container {
            border: 1px solid #e7e5e4;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 24px;
        }
        
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        
        th { 
            background: #fafaf9; 
            color: #57534e; 
            font-weight: 600; 
            text-align: left; 
            padding: 8px 10px;
            border-bottom: 1px solid #e7e5e4;
        }
        
        td { 
            padding: 8px 10px; 
            border-bottom: 1px solid #f5f5f4; 
            color: #44403c;
        }
        
        tr:last-child td { border-bottom: none; }
        tr:nth-child(even) { background: #fafaf9; }
        
        /* Badge Styles for Table */
        .table-badge { padding: 2px 6px; border-radius: 99px; font-size: 8px; font-weight: 600; display: inline-block; }
        .badge-emerald { background: #d1fae5; color: #047857; }
        .badge-amber { background: #fef3c7; color: #b45309; }
        .badge-rose { background: #ffe4e6; color: #be123c; }

        /* 📅 DAILY BREAKDOWN CARDS */
        .day-card {
            border: 2px solid #e7e5e4;
            border-radius: 12px;
            margin-bottom: 16px;
            overflow: hidden;
            page-break-inside: avoid;
        }
        
        .day-header {
            padding: 8px 12px;
            background: #f5f5f4;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e7e5e4;
        }
        
        .day-card.best { border-color: #6ee7b7; background: rgba(16, 185, 129, 0.02); }
        .day-card.best .day-header { background: #d1fae5; }
        
        .day-card.worst { border-color: #fda4af; background: rgba(244, 63, 94, 0.02); }
        .day-card.worst .day-header { background: #ffe4e6; }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-bold { font-weight: 700; }
        .text-stone-400 { color: #a8a29e; }
        .text-emerald { color: #059669; }
        .text-rose { color: #e11d48; }
        .text-amber { color: #d97706; }
        
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .page { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="page">
        <!-- 🎨 HEADER HERO -->
        <div class="header-hero">
            <div class="header-top">
                <div class="market-title">
                    <span>🏪</span> ${metrics.marketName}
                </div>
                <div class="market-date">📅 ${dateRange.from} - ${dateRange.to}</div>
            </div>
            
            <div class="hero-stats-grid">
                <div class="hero-stat">
                    <div class="hero-stat-label">💰 รายรับ</div>
                    <div class="hero-stat-value">${formatCurrencyPDF(metrics.revenue)}</div>
                </div>
                <div class="hero-stat highlight">
                    <div class="hero-stat-label">📈 กำไร</div>
                    <div class="hero-stat-value">${formatCurrencyPDF(metrics.profit)}</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-label">📦 ขายได้</div>
                    <div class="hero-stat-value">${formatNumberPDF(metrics.soldQty)} ชิ้น</div>
                </div>
                <div class="hero-stat">
                    <div class="hero-stat-label">🎯 สัดส่วน</div>
                    <div class="hero-stat-value">${metrics.marketContribution.toFixed(1)}%</div>
                </div>
            </div>
        </div>

        <!-- 💡 SMART INSIGHTS -->
        ${insights.length > 0 ? `
        <div class="insights-section">
            <div style="font-weight:700; color:#44403c; display:flex; align-items:center; gap:4px; margin-right:8px;">
                💡 สรุปอัตโนมัติ
            </div>
            ${insights.map(i => `
                <div class="insight-badge insight-${i.type}">
                    <span>${i.icon}</span> ${i.title}
                </div>
            `).join('')}
        </div>
        ` : ''}

        <!-- 📊 EXTENDED METRICS -->
        <div class="section-title">📊 ตัวชี้วัดละเอียด</div>
        <div class="metrics-grid">
            <div class="metric-card metric-sky">
                <div class="metric-label">💲 รายรับรวม</div>
                <div class="metric-value">${formatCurrencyPDF(metrics.revenue)}</div>
            </div>
            <div class="metric-card metric-emerald">
                <div class="metric-label">📈 กำไรสุทธิ</div>
                <div class="metric-value">${formatCurrencyPDF(metrics.profit)}</div>
                <div class="metric-sub">Margin ${metrics.margin.toFixed(1)}%</div>
            </div>
            <div class="metric-card metric-rose">
                <div class="metric-label">📉 ต้นทุนรวม</div>
                <div class="metric-value">${formatCurrencyPDF(metrics.cost)}</div>
            </div>
            <div class="metric-card metric-violet">
                <div class="metric-label">📦 ขายได้</div>
                <div class="metric-value">${formatNumberPDF(metrics.soldQty)} ชิ้น</div>
                <div class="metric-sub">${metrics.transactionCount} รายการ</div>
            </div>
            <div class="metric-card metric-amber">
                <div class="metric-label">🕒 รายรับ/วัน</div>
                <div class="metric-value">${formatCurrencyPDF(metrics.revenuePerDay)}</div>
                <div class="metric-sub">${metrics.activeDays} วันที่ขาย</div>
            </div>
            <div class="metric-card metric-teal">
                <div class="metric-label">📊 กำไร/วัน</div>
                <div class="metric-value">${formatCurrencyPDF(metrics.profitPerDay)}</div>
            </div>
            <div class="metric-card metric-indigo">
                <div class="metric-label">🛒 ชิ้น/รายการ</div>
                <div class="metric-value">${metrics.itemsPerTransaction.toFixed(1)}</div>
                <div class="metric-sub">เฉลี่ยต่อ transaction</div>
            </div>
            <div class="metric-card metric-orange">
                <div class="metric-label">📝 สินค้าที่ขาย</div>
                <div class="metric-value">${metrics.uniqueProductCount} รายการ</div>
            </div>
        </div>

        <!-- 🛍️ PRODUCT ANALYSIS -->
        <div class="section-title">🛍️ วิเคราะห์สินค้า</div>
        <div class="product-cards-grid">
            <!-- Top 3 -->
            <div class="analysis-card card-amber">
                <div class="card-title" style="color:#b45309">🏆 Top 3 ขายดี</div>
                ${productIntelligence.topProducts.slice(0, 3).map((p, i) => `
                    <div class="mini-product-row">
                        <div style="display:flex; gap:4px; overflow:hidden;">
                            <span style="font-weight:700; color:#b45309">${i + 1}.</span>
                            <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px;">${p.productName}</span>
                        </div>
                        <div style="font-weight:700; color:#b45309">${p.revenueShare.toFixed(0)}%</div>
                    </div>
                `).join('')}
            </div>

            <!-- Low Margin -->
            <div class="analysis-card card-rose">
                <div class="card-title" style="color:#be123c">⚠️ Margin ต่ำ (<20%)</div>
                ${productIntelligence.lowMarginProducts.length > 0 ?
            productIntelligence.lowMarginProducts.slice(0, 3).map(p => `
                    <div class="mini-product-row">
                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px;">${p.productName}</span>
                        <div style="font-weight:700; color:#be123c">${p.margin.toFixed(0)}%</div>
                    </div>
                    `).join('') : '<div style="color:#9ca3af; font-size:9px;">ไม่มีข้อมูล 🎉</div>'
        }
            </div>

            <!-- High Margin -->
            <div class="analysis-card card-emerald">
                <div class="card-title" style="color:#047857">🌟 Margin สูง (>40%)</div>
                ${productIntelligence.highMarginStars.length > 0 ?
            productIntelligence.highMarginStars.slice(0, 3).map(p => `
                    <div class="mini-product-row">
                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100px;">${p.productName}</span>
                        <div style="font-weight:700; color:#047857">${p.margin.toFixed(0)}%</div>
                    </div>
                    `).join('') : '<div style="color:#9ca3af; font-size:9px;">ไม่มีข้อมูล</div>'
        }
            </div>
        </div>
        
        <!-- 📦 ALL PRODUCTS TABLE -->
        <div class="section-title">📋 รายการสินค้าทั้งหมด (${allProducts.length})</div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%">#</th>
                        <th style="width: 35%">สินค้า</th>
                        <th class="text-right" style="width: 10%">ขายได้</th>
                        <th class="text-right" style="width: 15%">รายรับ</th>
                        <th class="text-right" style="width: 15%">กำไร</th>
                        <th class="text-right" style="width: 10%">Margin</th>
                        <th class="text-right" style="width: 10%">สัดส่วน</th>
                    </tr>
                </thead>
                <tbody>
                    ${allProducts.map(p => `
                    <tr>
                        <td>${p.rank}</td>
                        <td>${p.productName}${p.variantName ? ` <span class="text-stone-400">(${p.variantName})</span>` : ''}</td>
                        <td class="text-right text-bold">${formatNumberPDF(p.soldQty)}</td>
                        <td class="text-right">${formatCurrencyPDF(p.revenue)}</td>
                        <td class="text-right text-emerald">${formatCurrencyPDF(p.profit)}</td>
                        <td class="text-right">
                            <span class="table-badge ${p.margin >= 40 ? 'badge-emerald' : p.margin >= 20 ? 'badge-amber' : 'badge-rose'}">
                                ${p.margin.toFixed(0)}%
                            </span>
                        </td>
                        <td class="text-right text-stone-400">${p.revenueShare.toFixed(1)}%</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>

        </div>

        <!-- 📆 DAILY BREAKDOWN -->
        <div class="section-title">📆 รายละเอียดรายวัน</div>
        
        ${dailyBreakdown.map(day => `
        <div class="day-card ${day.isBestDay ? 'best' : day.isWorstDay ? 'worst' : ''}">
            <div class="day-header">
                <div style="display:flex; align-items:center; gap:8px;">
                    <div style="font-size:14px; font-weight:700; color:#44403c; white-space:nowrap;">
                        ${new Date(day.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div>
                        <div style="font-weight:700; color:#44403c;">
                            ${day.isBestDay ? '<span style="color:#059669; font-size:9px;">🏆 ดีที่สุด</span>' : ''}
                            ${day.isWorstDay ? '<span style="color:#e11d48; font-size:9px;">📉 แย่ที่สุด</span>' : ''}
                        </div>
                        <div style="font-size:9px; color:#78716c;">${day.transactionCount} รายการ • ${day.soldQty} ชิ้น</div>
                    </div>
                </div>
                <div class="text-right">
                    <div style="font-weight:700; font-size:12px;">${formatCurrencyPDF(day.revenue)}</div>
                    <div style="font-size:9px; color:#059669;">กำไร ${formatCurrencyPDF(day.profit)}</div>
                </div>
            </div>
            <div style="padding: 8px;">
                <table>
// ...
                    <thead>
                        <tr>
                            <th style="width: ${metrics.marketId === 'all' ? '25' : '35'}%; background:transparent; padding-top:0;">สินค้า</th>
                            ${metrics.marketId === 'all' ? '<th style="width: 13%; background:transparent; padding-top:0;">ตลาด</th>' : ''}
                            <th class="text-right text-amber" style="width: 10%; background:transparent; padding-top:0;">เอาไป</th>
                            <th class="text-right" style="width: 10%; background:transparent; padding-top:0;">ขายได้</th>
                            <th class="text-right text-rose" style="width: 10%; background:transparent; padding-top:0;">เหลือ</th>
                            <th class="text-right text-violet" style="width: 10%; background:transparent; padding-top:0;">กินแจก</th>
                            <th class="text-right text-rose" style="width: 10%; background:transparent; padding-top:0;">เสีย</th>
                            <th class="text-right" style="width: 12%; background:transparent; padding-top:0;">รายรับ</th>
                            <th class="text-right" style="width: 13%; background:transparent; padding-top:0;">กำไร</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${day.products.map(p => `
                        <tr>
                            <td style="border-bottom:1px dashed #f5f5f4;">${p.productName}${p.variantName ? ` <span class="text-stone-400">(${p.variantName})</span>` : ''}</td>
                            ${metrics.marketId === 'all' ? `<td style="border-bottom:1px dashed #f5f5f4; color:#78716c;">${p.marketName || '-'}</td>` : ''}
                            <td class="text-right text-amber text-bold" style="border-bottom:1px dashed #f5f5f4;">${p.preparedQty !== undefined ? formatNumberPDF(p.preparedQty) : '-'}</td>
                            <td class="text-right text-bold" style="border-bottom:1px dashed #f5f5f4;">${formatNumberPDF(p.quantity)}</td>
                            <td class="text-right text-rose" style="border-bottom:1px dashed #f5f5f4;">${p.leftoverQty !== undefined && p.leftoverQty > 0 ? formatNumberPDF(p.leftoverQty) : '-'}</td>
                            <td class="text-right text-violet" style="border-bottom:1px dashed #f5f5f4;">${(p.eatQty || 0) + (p.giveawayQty || 0) > 0 ? formatNumberPDF((p.eatQty || 0) + (p.giveawayQty || 0)) : '-'}</td>
                            <td class="text-right text-rose" style="border-bottom:1px dashed #f5f5f4;">${p.wasteQty !== undefined && p.wasteQty > 0 ? formatNumberPDF(p.wasteQty) : '-'}</td>
                            <td class="text-right" style="border-bottom:1px dashed #f5f5f4;">${formatCurrencyPDF(p.revenue)}</td>
                            <td class="text-right text-emerald" style="border-bottom:1px dashed #f5f5f4;">${formatCurrencyPDF(p.profit)}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        `).join('')}

        <div style="text-align:center; color:#a8a29e; margin-top:30px; font-size:9px;">
            สร้างโดย Mellow Oven • ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
    </div>
    <script>
        setTimeout(() => { window.print(); }, 800);
    </script>
</body>
</html>`;

    // Open print window
    const printWindow = window.open('', '_blank', 'width=1000,height=900');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    }
}
