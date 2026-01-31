import { ProductSaleLog } from '@/types';

// ============================================================
// 🧠 AUTO-SEASONALITY MODULE (Smart Brain 4.0 Upgrade)
// Self-Learning Multipliers for Day, Weather, Payday
// Uses Rolling MA + Factor + Median Aggregation
// ============================================================

export interface SeasonalityFactors {
    productId: string;
    marketId: string;

    // Layer 1: Rolling Baseline (30-day MA)
    baseline: number;

    // Layer 2: Self-Learned Multipliers
    weekdayFactors: Record<number, number>;   // 0=Sun, 1=Mon...6=Sat
    weatherFactors: Record<string, number>;   // 'sunny', 'rain', 'storm'
    paydayFactor: number;                     // Dates 25-5

    // Metadata
    dataPoints: number;
    lastUpdated: string;
    confidence: number;
}

// Helper: Check if date is in "Payday Period" (25th to 5th)
function isPaydayPeriod(date: Date): boolean {
    const d = date.getDate();
    return d >= 25 || d <= 5;
}

// Helper: Calculate Median (to cut outliers)
function calculateMedian(values: number[]): number {
    if (values.length === 0) return 1.0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

/**
 * 🚀 MAIN FUNCTION: Calculate Self-Learning Seasonality Factors
 * 
 * This function calculates multipliers for:
 * - Each day of week (Mon-Sun)
 * - Each weather condition (sunny, rain, storm, etc.)
 * - Payday periods (25th-5th of month)
 * 
 * All factors are learned from historical data using:
 * 1. Rolling 30-day Moving Average as baseline
 * 2. Factor = Actual / MA for each observation
 * 3. Median aggregation to handle outliers
 */
export function calculateSeasonalityFactors(
    sales: ProductSaleLog[],
    productId: string,
    marketId: string,
    lookbackDays: number = 90
): SeasonalityFactors {
    // Filter & Sort History
    const history = sales
        .filter(s =>
            (s.productId === productId || s.variantId === productId) &&
            s.marketId === marketId
        )
        .sort((a, b) => a.saleDate.localeCompare(b.saleDate));

    // Default return if not enough data
    if (history.length < 10) {
        return {
            productId,
            marketId,
            baseline: 0,
            weekdayFactors: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 },
            weatherFactors: {},
            paydayFactor: 1.0,
            dataPoints: history.length,
            lastUpdated: new Date().toISOString(),
            confidence: 0
        };
    }

    // Group by Date (aggregate daily totals)
    const dailyData: Record<string, { qty: number, weather?: string }> = {};
    history.forEach(s => {
        if (!dailyData[s.saleDate]) {
            dailyData[s.saleDate] = { qty: 0, weather: undefined };
        }
        dailyData[s.saleDate].qty += s.quantitySold;
        // Capture weather if available
        if (s.weatherCondition && !dailyData[s.saleDate].weather) {
            dailyData[s.saleDate].weather = s.weatherCondition;
        }
    });

    const dates = Object.keys(dailyData).sort();

    // Data Containers for Factor Collection
    const weekdaySamples: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const weatherSamples: Record<string, number[]> = {};
    const paydaySamples: number[] = [];
    const normalDaySamples: number[] = [];

    // ============================================================
    // STEP 1: Calculate Rolling MA & Weekday Factors
    // ============================================================
    dates.forEach((date) => {
        const targetDate = new Date(date);
        let maSum = 0;
        let maCount = 0;

        // Calculate 30-day Rolling MA (strictly BEFORE this date)
        for (let i = 1; i <= 30; i++) {
            const d = new Date(targetDate);
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            if (dailyData[dStr]) {
                maSum += dailyData[dStr].qty;
                maCount++;
            }
        }

        // Need at least 5 days of history to calculate factor
        if (maCount >= 5 && maSum > 0) {
            const baseline = maSum / maCount;
            const actual = dailyData[date].qty;

            // Raw Factor = Actual / Baseline
            const rawFactor = actual / baseline;

            // Safety filter (remove extreme outliers before collection)
            if (rawFactor > 0.1 && rawFactor < 5.0) {
                const dayIndex = new Date(date).getDay();
                weekdaySamples[dayIndex].push(rawFactor);
            }
        }
    });

    // Aggregate Weekday Factors using MEDIAN
    const finalWeekdayFactors: Record<number, number> = {};
    for (let i = 0; i <= 6; i++) {
        finalWeekdayFactors[i] = calculateMedian(weekdaySamples[i]);
    }

    // ============================================================
    // STEP 2: Calculate Weather & Payday Factors (Residual Analysis)
    // After removing weekday effect, what's left is the context effect
    // ============================================================
    dates.forEach((date) => {
        const targetDate = new Date(date);
        let maSum = 0;
        let maCount = 0;

        for (let i = 1; i <= 30; i++) {
            const d = new Date(targetDate);
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            if (dailyData[dStr]) {
                maSum += dailyData[dStr].qty;
                maCount++;
            }
        }

        if (maCount >= 5 && maSum > 0) {
            const baseline = maSum / maCount;
            const actual = dailyData[date].qty;
            const dayIndex = new Date(date).getDay();

            // Expected = Baseline * Weekday Factor
            const expected = baseline * finalWeekdayFactors[dayIndex];

            if (expected > 0) {
                // Residual = Actual / Expected (what weekday didn't explain)
                const residual = actual / expected;

                // Safety filter
                if (residual > 0.2 && residual < 4.0) {
                    // Capture Payday Effect
                    if (isPaydayPeriod(new Date(date))) {
                        paydaySamples.push(residual);
                    } else {
                        normalDaySamples.push(residual);
                    }

                    // Capture Weather Effect
                    const weather = dailyData[date].weather;
                    if (weather) {
                        if (!weatherSamples[weather]) weatherSamples[weather] = [];
                        weatherSamples[weather].push(residual);
                    }
                }
            }
        }
    });

    // Aggregate using MEDIAN
    const finalPaydayFactor = paydaySamples.length >= 3
        ? calculateMedian(paydaySamples)
        : 1.1; // Default 10% boost if not enough data

    const finalWeatherFactors: Record<string, number> = {};
    Object.keys(weatherSamples).forEach(w => {
        if (weatherSamples[w].length >= 2) {
            finalWeatherFactors[w] = calculateMedian(weatherSamples[w]);
        }
    });

    // ============================================================
    // STEP 3: Calculate Current Baseline (for next prediction)
    // ============================================================
    const today = new Date();
    let currentMaSum = 0;
    let currentMaCount = 0;
    for (let i = 1; i <= 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        if (dailyData[dStr]) {
            currentMaSum += dailyData[dStr].qty;
            currentMaCount++;
        }
    }
    const currentBaseline = currentMaCount > 0 ? currentMaSum / currentMaCount : 0;

    // Calculate confidence based on data quality
    const confidence = dates.length >= 30 ? 1.0 : dates.length / 30;

    return {
        productId,
        marketId,
        baseline: currentBaseline,
        weekdayFactors: finalWeekdayFactors,
        weatherFactors: finalWeatherFactors,
        paydayFactor: finalPaydayFactor,
        dataPoints: dates.length,
        lastUpdated: new Date().toISOString(),
        confidence
    };
}

/**
 * 🎯 Apply Seasonality Factors to get adjusted forecast
 * 
 * Formula: Baseline * Weekday * Payday * Weather
 */
export function applySeasonalityFactors(
    factors: SeasonalityFactors,
    targetDate: Date,
    weather?: string
): {
    adjustedForecast: number;
    breakdown: {
        baseline: number;
        weekdayFactor: number;
        paydayFactor: number;
        weatherFactor: number;
    };
} {
    const dayIndex = targetDate.getDay();

    // Get factors (default to 1.0 if not available)
    const weekdayFactor = factors.weekdayFactors[dayIndex] || 1.0;
    const paydayFactor = isPaydayPeriod(targetDate) ? factors.paydayFactor : 1.0;
    const weatherFactor = weather && factors.weatherFactors[weather]
        ? factors.weatherFactors[weather]
        : 1.0;

    // Formula: Baseline * Weekday * Payday * Weather
    const adjustedForecast = factors.baseline * weekdayFactor * paydayFactor * weatherFactor;

    return {
        adjustedForecast: Math.max(0, Math.round(adjustedForecast)),
        breakdown: {
            baseline: Math.round(factors.baseline * 10) / 10,
            weekdayFactor: Math.round(weekdayFactor * 100) / 100,
            paydayFactor: Math.round(paydayFactor * 100) / 100,
            weatherFactor: Math.round(weatherFactor * 100) / 100
        }
    };
}

export default {
    calculateSeasonalityFactors,
    applySeasonalityFactors
};
