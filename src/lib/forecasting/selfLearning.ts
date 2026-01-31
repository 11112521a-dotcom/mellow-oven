// ============================================================
// 🧠 Self-Learning Module 5.0: The God-Tier Evolution
// Features: Exponential Bias Tracking, Micro-Pattern Recognition, Adaptive Gain
// ============================================================

import { ProductSaleLog } from '@/types';

// ============================================================
// Types
// ============================================================

export interface ForecastError {
    productId: string;
    productName: string;
    marketId: string;
    forecastDate: string;
    dayOfWeek: number; // 0-6
    dayOfMonth: number; // 1-31
    forecastQty: number;
    actualQty: number;
    error: number; // forecast - actual (positive = over, negative = under)
    errorPercent: number;
    weather?: string;
    isPayday: boolean;
    isStockout: boolean; // New: Track if stockout occurred
    createdAt: string;
}

export interface BiasCorrection {
    productId: string;
    marketId: string;
    avgBias: number; // Simple Average
    exponentialBias: number; // Exponential Weighted Moving Average (Reacts faster)
    biasCount: number;
    dayOfWeekBias: Record<number, number>;
    recentTrend: number;
    momentumSlope: number;
    volatility: number;
    adaptiveGain: number; // Multiplier for correction strength (1.0 - 2.0)
    confidenceScore: number;
    lastUpdated: string;
}

export interface PatternInsight {
    type: 'weekday' | 'monthly' | 'weather' | 'momentum' | 'micro-cycle';
    productId: string;
    description: string;
    factor: number; // Multiplier (1.0 = no change)
    confidence: number;
    dataPoints: number;
    condition?: string; // e.g., "Only on Rainy Saturdays"
}

export interface LearningStats {
    totalForecasts: number;
    matchedForecasts: number;
    avgAccuracy: number;
    avgBias: number;
    improvementTrend: number;
    topPatterns: PatternInsight[];
}

// ============================================================
// Core Functions
// ============================================================

/**
 * Calculate forecast error from historical data
 */
export function calculateForecastErrors(
    forecasts: Array<{ productId: string; productName: string; marketId: string; forecastForDate: string; optimalQuantity: number; weatherForecast?: string }>,
    actualSales: ProductSaleLog[]
): ForecastError[] {
    const errors: ForecastError[] = [];

    for (const forecast of forecasts) {
        const actualSalesForDay = actualSales.filter(s =>
            s.saleDate === forecast.forecastForDate &&
            (s.productId === forecast.productId || s.variantId === forecast.productId) &&
            (!forecast.marketId || s.marketId === forecast.marketId)
        );

        if (actualSalesForDay.length === 0) continue;

        const actualQty = actualSalesForDay.reduce((sum, s) => sum + s.quantitySold, 0);
        const forecastDate = new Date(forecast.forecastForDate);
        const dayOfWeek = forecastDate.getDay();
        const dayOfMonth = forecastDate.getDate();
        const isPayday = dayOfMonth >= 25 || dayOfMonth <= 5;
        const isStockout = actualQty >= forecast.optimalQuantity * 0.95;

        const error = forecast.optimalQuantity - actualQty;
        const errorPercent = actualQty > 0 ? (error / actualQty) * 100 : 0;

        errors.push({
            productId: forecast.productId,
            productName: forecast.productName,
            marketId: forecast.marketId,
            forecastDate: forecast.forecastForDate,
            dayOfWeek,
            dayOfMonth,
            forecastQty: forecast.optimalQuantity,
            actualQty,
            error,
            errorPercent,
            weather: forecast.weatherForecast,
            isPayday,
            isStockout,
            createdAt: new Date().toISOString()
        });
    }

    return errors;
}

/**
 * Calculate bias correction with EXPONENTIAL WEIGHTING & UNCENSORING
 */
export function calculateBiasCorrection(
    errors: ForecastError[],
    productId: string,
    marketId: string
): BiasCorrection | null {
    const relevantErrors = errors.filter(e =>
        e.productId === productId &&
        (!marketId || e.marketId === marketId)
    );

    if (relevantErrors.length < 3) return null;

    // Sort by date (Oldest -> Newest for Exponential calculation)
    relevantErrors.sort((a, b) =>
        new Date(a.forecastDate).getTime() - new Date(b.forecastDate).getTime()
    );

    // 1. Demand Uncensoring Loop
    const adjustedErrors = relevantErrors.map(e => {
        let uncensoredActual = e.actualQty;
        if (e.isStockout) {
            uncensoredActual = Math.ceil(e.actualQty * 1.25); // Assume 25% lost demand
        }
        const trueBias = e.forecastQty - uncensoredActual;
        return { ...e, actualQty: uncensoredActual, error: trueBias };
    });

    // 2. Exponential Weighted Moving Average (EWMA) for Bias
    // Alpha higher = reacts faster to recent errors
    const alpha = 0.3;
    let ewmaBias = adjustedErrors[0].error;

    // Track directional consistency for Adaptive Gain
    let consistencyCounter = 0;

    adjustedErrors.slice(1).forEach(e => {
        ewmaBias = (alpha * e.error) + ((1 - alpha) * ewmaBias);

        // If error has same sign as EWMA, increase counter
        if ((e.error > 0 && ewmaBias > 0) || (e.error < 0 && ewmaBias < 0)) {
            consistencyCounter++;
        } else {
            consistencyCounter = 0; // Reset if direction changes
        }
    });

    // 3. Adaptive Gain: If consistently wrong, increase correction strength
    // Range: 1.0 (Normal) to 1.5 (Aggressive)
    const adaptiveGain = 1.0 + (Math.min(consistencyCounter, 5) * 0.1);

    // 4. Momentum Slope (Regression over last 5 points)
    const recent5 = adjustedErrors.slice(-5);
    let momentumSlope = 0;
    if (recent5.length >= 3) {
        const n = recent5.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        recent5.forEach((e, i) => {
            sumX += i;
            sumY += e.actualQty;
            sumXY += i * e.actualQty;
            sumXX += i * i;
        });
        momentumSlope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    // 5. Volatility & Bias per Day
    const dayOfWeekBias: Record<number, number> = {};
    for (let day = 0; day < 7; day++) {
        const dayErrors = adjustedErrors.filter(e => e.dayOfWeek === day);
        if (dayErrors.length >= 2) {
            dayOfWeekBias[day] = dayErrors.reduce((sum, e) => sum + e.error, 0) / dayErrors.length;
        }
    }

    const meanDemand = adjustedErrors.reduce((sum, e) => sum + e.actualQty, 0) / adjustedErrors.length;
    const variance = adjustedErrors.reduce((sum, e) => sum + Math.pow(e.actualQty - meanDemand, 2), 0) / adjustedErrors.length;
    const volatility = Math.sqrt(variance);

    // Confidence
    let confidenceScore = Math.min(100, adjustedErrors.length * 10);
    if (volatility > meanDemand * 0.5) confidenceScore *= 0.8;

    return {
        productId,
        marketId,
        avgBias: adjustedErrors.reduce((sum, e) => sum + e.error, 0) / adjustedErrors.length,
        exponentialBias: ewmaBias,
        biasCount: adjustedErrors.length,
        dayOfWeekBias,
        recentTrend: 0, // Deprecated in favor of EWMA
        momentumSlope,
        volatility,
        adaptiveGain,
        confidenceScore: Math.round(confidenceScore),
        lastUpdated: new Date().toISOString()
    };
}

/**
 * Apply bias correction: Now uses EXPONENTIAL bias with ADAPTIVE GAIN
 */
export function applyBiasCorrection(
    rawForecast: number,
    bias: BiasCorrection | null,
    dayOfWeek?: number
): { correctedForecast: number; correctionApplied: number; source: string } {
    if (!bias || bias.biasCount < 3) {
        return { correctedForecast: rawForecast, correctionApplied: 0, source: 'none' };
    }

    let correction = 0;
    let source = '';

    // Prefer weighted combination of EWMA and Day Bias
    const dayBias = (dayOfWeek !== undefined && bias.dayOfWeekBias[dayOfWeek] !== undefined)
        ? bias.dayOfWeekBias[dayOfWeek]
        : bias.exponentialBias;

    // Combine: 50% Day Specific + 50% General Trend (EWMA)
    const combinedBias = (dayBias + bias.exponentialBias) / 2;

    // Apply Adaptive Gain
    correction = combinedBias * bias.adaptiveGain;

    if (bias.adaptiveGain > 1.2) {
        source = `smart-adapt-${bias.adaptiveGain.toFixed(1)}x`;
    } else {
        source = 'smart-bias';
    }

    // Subtract correction (Error = Forecast - Actual, implies Forecast = Error + Actual... wait)
    // If Bias is +10 (Over-predicted by 10), we must SUBTRACT 10.
    // So Corrected = Raw - Correction.
    const correctedForecast = Math.max(0, Math.round(rawForecast - correction));

    return { correctedForecast, correctionApplied: correction, source };
}

/**
 * Detect Pattern 5.0: Micro-Patterns & Conditional Logic
 */
export function detectPatterns(
    errors: ForecastError[],
    productId: string
): PatternInsight[] {
    const patterns: PatternInsight[] = [];
    const productErrors = errors.filter(e => e.productId === productId);
    if (productErrors.length < 5) return patterns;

    const totalAvg = productErrors.reduce((sum, e) => sum + e.actualQty, 0) / productErrors.length;

    // 1. Micro-Cycle: Mid-Month Bump (Days 14-16)
    const midMonthErrors = productErrors.filter(e => e.dayOfMonth >= 14 && e.dayOfMonth <= 16);
    if (midMonthErrors.length >= 2) {
        const midAvg = midMonthErrors.reduce((s, e) => s + e.actualQty, 0) / midMonthErrors.length;
        const factor = midAvg / totalAvg;
        if (Math.abs(factor - 1) > 0.15) {
            patterns.push({
                type: 'micro-cycle',
                productId,
                description: `กลางเดือน (วันที่ 14-16) ยอด${factor > 1 ? 'พุ่ง' : 'ร่วง'} ${(Math.abs(factor - 1) * 100).toFixed(0)}%`,
                factor,
                confidence: 80,
                dataPoints: midMonthErrors.length,
                condition: 'dayOfMonth:14-16'
            });
        }
    }

    // 2. Weather + Weekend Combo
    const rainyWeekends = productErrors.filter(e =>
        (e.dayOfWeek === 0 || e.dayOfWeek === 6) &&
        (e.weather === 'rain' || e.weather === 'storm')
    );
    if (rainyWeekends.length >= 2) {
        const rwAvg = rainyWeekends.reduce((s, e) => s + e.actualQty, 0) / rainyWeekends.length;
        const weatherFactor = rwAvg / totalAvg;
        if (Math.abs(weatherFactor - 1) > 0.2) {
            patterns.push({
                type: 'weather',
                productId,
                description: `ฝนตกวันหยุด = ${weatherFactor > 1 ? 'ขายดี' : 'เงียบ'}ผิดปกติ`,
                factor: weatherFactor,
                confidence: 90,
                dataPoints: rainyWeekends.length,
                condition: 'rain+weekend'
            });
        }
    }

    // 3. Standard Weekday (Legacy support)
    const dayOfWeekAvg: Record<number, { sum: number, count: number }> = {};
    productErrors.forEach(e => {
        if (!dayOfWeekAvg[e.dayOfWeek]) dayOfWeekAvg[e.dayOfWeek] = { sum: 0, count: 0 };
        dayOfWeekAvg[e.dayOfWeek].sum += e.actualQty;
        dayOfWeekAvg[e.dayOfWeek].count++;
    });

    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
    for (let day = 0; day < 7; day++) {
        if (dayOfWeekAvg[day] && dayOfWeekAvg[day].count >= 3) {
            const dayAvg = dayOfWeekAvg[day].sum / dayOfWeekAvg[day].count;
            const factor = dayAvg / totalAvg;
            if (Math.abs(factor - 1) > 0.15) {
                patterns.push({
                    type: 'weekday',
                    productId,
                    description: `วัน${dayNames[day]} ${factor > 1 ? 'ขายดี' : 'ขายน้อย'} (${Math.abs((factor - 1) * 100).toFixed(0)}%)`,
                    factor,
                    confidence: Math.min(100, dayOfWeekAvg[day].count * 15),
                    dataPoints: dayOfWeekAvg[day].count
                });
            }
        }
    }

    patterns.sort((a, b) => b.confidence - a.confidence);
    return patterns;
}

/**
 * Calculate overall learning stats (Simplified)
 */
export function calculateLearningStats(
    errors: ForecastError[],
    productId?: string
): LearningStats {
    const relevantErrors = productId ? errors.filter(e => e.productId === productId) : errors;
    if (relevantErrors.length === 0) return {
        totalForecasts: 0, matchedForecasts: 0, avgAccuracy: 0, avgBias: 0, improvementTrend: 0, topPatterns: []
    };

    const avgError = relevantErrors.reduce((s, e) => s + Math.abs(e.errorPercent), 0) / relevantErrors.length;
    const avgBias = relevantErrors.reduce((s, e) => s + e.error, 0) / relevantErrors.length;

    // Recent trend
    const recent = relevantErrors.slice(-5);
    const older = relevantErrors.slice(0, Math.max(1, relevantErrors.length - 5));
    const recentErr = recent.reduce((s, e) => s + Math.abs(e.error), 0) / recent.length;
    const olderErr = older.reduce((s, e) => s + Math.abs(e.error), 0) / older.length;

    let patterns = [];
    if (productId) patterns = detectPatterns(errors, productId);

    return {
        totalForecasts: relevantErrors.length,
        matchedForecasts: relevantErrors.length,
        avgAccuracy: Math.max(0, 100 - avgError),
        avgBias,
        improvementTrend: olderErr - recentErr,
        topPatterns: patterns.slice(0, 5)
    };
}

/**
 * Get Smart Adjustment 5.0
 */
export function getSmartAdjustment(
    rawForecast: number,
    productId: string,
    marketId: string,
    dayOfWeek: number,
    dayOfMonth: number, // New Param
    weather: string, // New Param
    errors: ForecastError[]
): {
    adjustedForecast: number;
    adjustments: Array<{ source: string; delta: number; confidence: number }>;
    totalConfidence: number;
} {
    const adjustments: Array<{ source: string; delta: number; confidence: number }> = [];
    let adjustedForecast = rawForecast;

    // 1. Bias Correction (Exponential + Adaptive)
    const bias = calculateBiasCorrection(errors, productId, marketId);
    if (bias && bias.confidenceScore >= 20) {
        const biasResult = applyBiasCorrection(rawForecast, bias, dayOfWeek);
        if (biasResult.correctionApplied !== 0) {
            adjustments.push({
                source: `AI-Correction (${biasResult.source})`,
                delta: -Math.round(biasResult.correctionApplied),
                confidence: bias.confidenceScore
            });
            adjustedForecast = biasResult.correctedForecast;
        }

        // Momentum Force
        if (Math.abs(bias.momentumSlope) > 0.3) {
            const momentumDelta = Math.round(bias.momentumSlope * 0.8); // 80% strength
            if (momentumDelta !== 0) {
                adjustments.push({
                    source: `Momentum: ${momentumDelta > 0 ? 'Upward 🚀' : 'Downward 📉'}`,
                    delta: momentumDelta,
                    confidence: 80
                });
                adjustedForecast += momentumDelta;
            }
        }
    }

    // 2. Pattern Application (Micro-Cycles & Conditions)
    const patterns = detectPatterns(errors, productId);

    // Check Micro-Cycle (Mid-Month)
    const midMonthPattern = patterns.find(p => p.condition === 'dayOfMonth:14-16');
    if (midMonthPattern && dayOfMonth >= 14 && dayOfMonth <= 16) {
        const delta = adjustedForecast * (midMonthPattern.factor - 1);
        adjustments.push({ source: midMonthPattern.description, delta, confidence: midMonthPattern.confidence });
        adjustedForecast += delta;
    }

    // Check Weather+Weekend
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isRainy = weather === 'rain' || weather === 'storm';
    if (isWeekend && isRainy) {
        const wwPattern = patterns.find(p => p.condition === 'rain+weekend');
        if (wwPattern) {
            const delta = adjustedForecast * (wwPattern.factor - 1);
            adjustments.push({ source: wwPattern.description, delta, confidence: wwPattern.confidence });
            adjustedForecast += delta;
        }
    }

    return {
        adjustedForecast: Math.max(0, Math.round(adjustedForecast)),
        adjustments,
        totalConfidence: adjustments.length > 0
            ? adjustments.reduce((s, a) => s + a.confidence, 0) / adjustments.length
            : 0
    };
}

export default {
    calculateForecastErrors,
    calculateBiasCorrection,
    applyBiasCorrection,
    detectPatterns,
    calculateLearningStats,
    getSmartAdjustment
};
