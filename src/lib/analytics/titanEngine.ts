// 🦅 Titan Analytics Engine
// The "Data Detective" that mines hard statistical truths from sales history.
// Independent of AI Forecasting. Deterministic Logic Only.

import { Product, ProductSaleLog } from '@/types';

// ================= TYPES =================

export type AnalysisPeriod = '30_DAYS' | '60_DAYS' | '90_DAYS';

export interface TitanInsight {
    type: 'CONDITION_SENSITIVITY' | 'TREND_ALERT' | 'CORRELATION_MATCH' | 'PARETO_RANK';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    targetProduct: string;
    targetProductId: string;
    title: string;
    description: string;
    metricLabel: string;
    metricValue: number; // e.g., Slope, Correlation Coefficient, % Difference
    actionableAdvice: string;
}

interface DailySales {
    date: string;
    qty: number;
    revenue: number; // Added for Pareto
    isRainy: boolean;
    isPayday: boolean;
    isWeekend: boolean;
}

// ================= MATH HELPERS =================

/**
 * Calculates the Pearson Correlation Coefficient (r)
 * Range: -1.0 to +1.0
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;
    return numerator / denominator;
}

/**
 * Calculates Linear Regression Slope (m)
 * Formula: m = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX^2)
 */
function calculateSlope(y: number[]): number {
    const n = y.length;
    if (n < 2) return 0;

    // x is just 0, 1, 2, ... n-1
    const x = Array.from({ length: n }, (_, i) => i);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = n * sumX2 - sumX * sumX;

    if (denominator === 0) return 0;
    return numerator / denominator;
}

/**
 * Validates sample size for statistical significance
 */
function isStatisticallySignificant(sampleSize: number): boolean {
    return sampleSize >= 3; // Tuned: Minimum 3 data points for faster "God Tier" detection
}

// ================= MODULES =================

/**
 * 👑 Module D: Pareto Principle (The Vital Few)
 * Identifies the 20% of products driving 80% of the revenue.
 */
/**
 * 🕵️‍♀️ Module E: Contextual Trio (The "Beer & Diapers" Engine)
 * Finds products that have a HIDDEN relationship only in specific contexts.
 * e.g., "Beer & Diapers don't usually sell together, but on FRIDAY EVENINGS they do."
 */
function analyzeContextualCorrelations(
    productName: string,
    productId: string,
    sales: DailySales[], // Target sales
    allProducts: { name: string, id: string, sales: DailySales[] }[]
): TitanInsight[] {
    const insights: TitanInsight[] = [];
    const contexts = [
        { name: 'Friday', filter: (d: DailySales) => new Date(d.date).getDay() === 5, icon: '📅' },
        { name: 'Weekend', filter: (d: DailySales) => new Date(d.date).getDay() === 0 || new Date(d.date).getDay() === 6, icon: '🏖️' },
        { name: 'Rainy Day', filter: (d: DailySales) => d.isRainy, icon: '🌧️' }
    ];

    // 1. Calculate Global Correlations first (Baseline)
    // We need a quick map of global R for comparison
    const targetMap = new Map(sales.map(s => [s.date, s.qty]));

    for (const context of contexts) {
        // Filter Target Sales by Context
        const contextSales = sales.filter(context.filter);
        if (contextSales.length < 4) continue; // Need enough data points for this context

        const contextMap = new Map(contextSales.map(s => [s.date, s.qty]));

        for (const other of allProducts) {
            if (other.id === productId) continue;

            // Align Data for CONTEXT
            const contextDates = other.sales.map(s => s.date).filter(d => contextMap.has(d));
            if (contextDates.length < 4) continue;

            const targetQtyContext = contextDates.map(d => contextMap.get(d) || 0);
            const otherQtyContext = contextDates.map(d => other.sales.find(s => s.date === d)?.qty || 0);

            const rContext = calculatePearsonCorrelation(targetQtyContext, otherQtyContext);

            // If Context Correlation is HIGH (> 0.7)
            if (rContext > 0.75) {
                // ...Check Global Correlation (Baseline)
                // Align Data for GLOBAL
                const commonDates = other.sales.map(s => s.date).filter(d => targetMap.has(d));
                const targetQtyGlobal = commonDates.map(d => targetMap.get(d) || 0);
                const otherQtyGlobal = commonDates.map(d => other.sales.find(s => s.date === d)?.qty || 0);

                const rGlobal = calculatePearsonCorrelation(targetQtyGlobal, otherQtyGlobal);

                // LIFT: Is the context correlation significantly stronger? (+0.3 lift)
                if (rContext > rGlobal + 0.3) {
                    insights.push({
                        type: 'CORRELATION_MATCH', // Reusing type but with special severity/title
                        severity: 'HIGH',
                        targetProduct: productName,
                        targetProductId: productId,
                        title: `${context.icon} ${context.name} Syndrome`,
                        description: `ปกติไม่ค่อยไปด้วยกัน (Global R ${rGlobal.toFixed(2)}) แต่พอถึง "${context.name}" กลับขายคู่กันดีมาก (Context R ${rContext.toFixed(2)}) กับสินค้า "${other.name}"`,
                        metricLabel: 'Correlation Lift',
                        metricValue: ((rContext - rGlobal) * 100), // Show % improvement
                        actionableAdvice: `ทุกๆ ${context.name} ลองจัดวางคู่กับ ${other.name} หรือทำโปรโมชั่นคู่กันเฉพาะวันนี้`
                    });
                }
            }
        }
    }

    // Limit distinct patterns (don't spam 10 friday insights)
    return insights.sort((a, b) => b.metricValue - a.metricValue).slice(0, 1);
}



/**
 * 🌪️ Module A: Contextual Sensitivity Matrix
 * Detects if a product is "Rain Sensitive" or "Payday Dependent"
 */
function analyzeSensitivity(
    productName: string,
    productId: string,
    dailySales: DailySales[]
): TitanInsight[] {
    const insights: TitanInsight[] = [];
    const avgNormal = dailySales.reduce((sum, d) => sum + d.qty, 0) / dailySales.length;

    if (avgNormal < 1) return []; // Ignore low volume items

    // 1. Weather Sensitivity (Rain vs No Rain)
    const rainyDays = dailySales.filter(d => d.isRainy);
    const sunnyDays = dailySales.filter(d => !d.isRainy);

    if (rainyDays.length >= 3 && sunnyDays.length >= 3) { // Tuned threshold
        const avgRain = rainyDays.reduce((sum, d) => sum + d.qty, 0) / rainyDays.length;
        const avgSun = sunnyDays.reduce((sum, d) => sum + d.qty, 0) / sunnyDays.length;

        // Calculate % Difference
        const diffPercent = ((avgRain - avgSun) / avgSun) * 100;

        if (diffPercent < -25) { // Tuned: -30 -> -25 (More sensitive)
            insights.push({
                type: 'CONDITION_SENSITIVITY',
                severity: diffPercent < -50 ? 'HIGH' : 'MEDIUM',
                targetProduct: productName,
                targetProductId: productId,
                title: '🌧️ โรคกลัวฝน (Rain Sensitive)',
                description: `ยอดขายตกลงเฉลี่ย ${Math.abs(diffPercent).toFixed(0)}% ในวันที่ฝนตก`,
                metricLabel: 'Impact',
                metricValue: diffPercent,
                actionableAdvice: `ลดการผลิตลง ${Math.abs(diffPercent * 0.8).toFixed(0)}% ในวันที่มีพยากรณ์ฝน`
            });
        }
    }

    // 2. Payday Boost (Payday vs Normal)
    const paydayDays = dailySales.filter(d => d.isPayday);
    const normalDays = dailySales.filter(d => !d.isPayday);

    if (paydayDays.length >= 3 && normalDays.length >= 3) { // Tuned threshold
        const avgPayday = paydayDays.reduce((sum, d) => sum + d.qty, 0) / paydayDays.length;
        const avgNormalDay = normalDays.reduce((sum, d) => sum + d.qty, 0) / normalDays.length;

        const diffPercent = ((avgPayday - avgNormalDay) / avgNormalDay) * 100;

        if (diffPercent > 15) { // Tuned: 20 -> 15 (More sensitive)
            insights.push({
                type: 'CONDITION_SENSITIVITY',
                severity: 'MEDIUM',
                targetProduct: productName,
                targetProductId: productId,
                title: '💰 ขวัญใจสิ้นเดือน (Payday Hero)',
                description: `ยอดขายพุ่งขึ้น ${diffPercent.toFixed(0)}% ช่วงเงินเดือนออก`,
                metricLabel: 'Boost',
                metricValue: diffPercent,
                actionableAdvice: `เตรียมสต็อกเพิ่ม ${diffPercent.toFixed(0)}% ช่วงวันที่ 25-5 ของเดือน`
            });
        }
    }

    return insights;
}

/**
 * 📉 Module B: Trend Slope Detection
 * Detects "Dying Stars" (Consistent decline) and "Rising Stars" (Consistent growth)
 */
function analyzeTrend(
    productName: string,
    productId: string,
    dailySales: DailySales[]
): TitanInsight[] {
    const insights: TitanInsight[] = [];

    // Sort by date ascending
    const sortedSales = [...dailySales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate % Trend (Last 7 days vs Previous 7 days) to give user-friendly numbers
    const recentPeriod = sortedSales.slice(-7);
    const previousPeriod = sortedSales.slice(-14, -7);

    // If not enough data for previous period comparison, skip (or fallback to slope if really needed, but let's be strict for accuracy)
    if (previousPeriod.length < 3) return [];

    const avgRecent = recentPeriod.reduce((sum, d) => sum + d.qty, 0) / recentPeriod.length;
    const avgPrev = previousPeriod.reduce((sum, d) => sum + d.qty, 0) / previousPeriod.length;

    if (avgPrev === 0) return []; // Avoid division by zero

    const changePercent = ((avgRecent - avgPrev) / avgPrev) * 100;

    // Use Slope as a confirmation signal (to ensure it's a trend, not just noise)
    const slope = calculateSlope(sortedSales.map(d => d.qty));

    // Thresholds: Change > 20% AND Trend aligns
    if (changePercent < -20 && slope < 0) {
        insights.push({
            type: 'TREND_ALERT',
            severity: changePercent < -40 ? 'CRITICAL' : 'HIGH',
            targetProduct: productName,
            targetProductId: productId,
            title: '📉 ดาวร่วง (Dying Star)',
            description: `ยอดขายลดลง ${Math.abs(changePercent).toFixed(0)}% ในสัปดาห์ล่าสุด (เทียบกับสัปดาห์ก่อน)`,
            metricLabel: 'Drop',
            metricValue: changePercent,
            actionableAdvice: 'พิจารณาจัดโปรโมชั่นกระตุ้นด่วน หรือลดจำนวนการผลิตถาวร'
        });
    } else if (changePercent > 20 && slope > 0) {
        insights.push({
            type: 'TREND_ALERT',
            severity: 'MEDIUM',
            targetProduct: productName,
            targetProductId: productId,
            title: '🚀 ดาวรุ่ง (Rising Star)',
            description: `ยอดขายโตขึ้น +${changePercent.toFixed(0)}% ในสัปดาห์ล่าสุด`,
            metricLabel: 'Growth',
            metricValue: changePercent,
            actionableAdvice: 'อย่าให้ของขาด! โอกาสทองกำลังมา เติมของให้เต็ม'
        });
    }

    return insights;
}

/**
 * 🔗 Module C: Daily Macro Correlation
 * Finds products that surge together (Synchronized) or kill each other (Cannibalization)
 */
function analyzeCorrelations(
    targetProduct: { name: string, id: string, sales: DailySales[] },
    allProducts: { name: string, id: string, sales: DailySales[] }[]
): TitanInsight[] {
    const insights: TitanInsight[] = [];

    // Map target sales by date for easy lookup
    const targetMap = new Map(targetProduct.sales.map(s => [s.date, s.qty]));

    for (const other of allProducts) {
        if (other.id === targetProduct.id) continue;

        // Align data: Find intersection of dates
        const dates = other.sales.map(s => s.date).filter(date => targetMap.has(date));
        if (dates.length < 7) continue; // Tuned: 14 -> 7

        const targetQty = dates.map(d => targetMap.get(d) || 0);
        const otherQty = dates.map(d => other.sales.find(s => s.date === d)?.qty || 0);

        const r = calculatePearsonCorrelation(targetQty, otherQty);

        if (r > 0.7) { // Tuned: 0.75 -> 0.70
            insights.push({
                type: 'CORRELATION_MATCH',
                severity: 'MEDIUM',
                targetProduct: targetProduct.name,
                targetProductId: targetProduct.id,
                title: '💞 คู่แท้ (Soulmate)',
                description: `ขายดีพร้อมกับ "${other.name}" แทบทุกครั้ง (Correlation ${r.toFixed(2)})`,
                metricLabel: 'Correlation',
                metricValue: r,
                actionableAdvice: `ลองจัดโปรคู่ หรือวางขายใกล้กันกับ ${other.name}`
            });
        }
        else if (r < -0.55) { // Tuned: -0.6 -> -0.55
            insights.push({
                type: 'CORRELATION_MATCH',
                severity: 'HIGH',
                targetProduct: targetProduct.name,
                targetProductId: targetProduct.id,
                title: '🥊 คู่กัด (Cannibal)',
                description: `มักจะขายไม่ออก ถ้า "${other.name}" ขายดี (Correlation ${r.toFixed(2)})`,
                metricLabel: 'Correlation',
                metricValue: r,
                actionableAdvice: `เลี่ยงการผลิตเยอะพร้อมกันกับ ${other.name} หรือจัดโปรแยกกลุ่มลูกค้า`
            });
        }
    }

    // Limit to top 1 correlation per product to avoid noise
    return insights.sort((a, b) => Math.abs(b.metricValue) - Math.abs(a.metricValue)).slice(0, 1);
}

// ================= MAIN FUNCTION =================

export function runTitanAnalytics(
    salesHistory: ProductSaleLog[],
    products: Product[],
    daysToAnalyze = 60
): TitanInsight[] {
    const insights: TitanInsight[] = [];

    // 1. Preprocess Data: Group by Product & Date
    const productSalesMap = new Map<string, DailySales[]>();

    // Helper to check conditions
    const isPayday = (dateStr: string) => {
        const d = new Date(dateStr).getDate();
        return d >= 25 || d <= 5;
    };
    const isWeekend = (dateStr: string) => {
        const day = new Date(dateStr).getDay();
        return day === 0 || day === 6;
    };

    salesHistory.forEach(log => {
        if (!productSalesMap.has(log.productId)) {
            productSalesMap.set(log.productId, []);
        }

        // Merge if multiple records per day (shouldn't happen in safe data, but safe to handle)
        const dayRecord = productSalesMap.get(log.productId)!.find(d => d.date === log.saleDate);
        if (dayRecord) {
            dayRecord.qty += log.quantitySold;
            dayRecord.revenue += log.totalRevenue; // Merge revenue
        } else {
            productSalesMap.get(log.productId)!.push({
                date: log.saleDate,
                qty: log.quantitySold,
                revenue: log.totalRevenue, // Add revenue
                isRainy: log.weatherCondition === 'rain' || log.weatherCondition === 'storm',
                isPayday: isPayday(log.saleDate),
                isWeekend: isWeekend(log.saleDate)
            });
        }
    });

    // 2. Run Modules in Parallel (conceptually)
    const productList = Array.from(productSalesMap.entries()).map(([id, sales]) => ({
        id,
        name: products.find(p => p.id === id)?.name || 'Unknown',
        sales
    }));

    // Module D: Pareto Removed (User Request)

    productList.forEach(p => {
        // Module A: Sensitivity
        insights.push(...analyzeSensitivity(p.name, p.id, p.sales));

        // Module B: Trend
        insights.push(...analyzeTrend(p.name, p.id, p.sales));

        // Module C: Correlation
        // (Expensive op, limit to top 20% products ideally, but for now run all)
        insights.push(...analyzeCorrelations(p, productList));

        // Module E: Contextual Trio (Friday/Rain/Weekend)
        insights.push(...analyzeContextualCorrelations(p.name, p.id, p.sales, productList));
    });

    // Sort by Severity (Critical First)
    const severityScore = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    return insights.sort((a, b) => severityScore[b.severity] - severityScore[a.severity]);
}
