import { ProductSaleLog } from '../../../types';

// ============================================================
// 🧠 PROPHET PRO: Multi-Factor Forecasting System
// ============================================================

export interface SeasonalityMatrix {
    productId: string;
    baseline: number; // Current Rolling Moving Average (Last 30 days)

    // 📊 Layer 1: Time Factors
    weekdayMultipliers: Record<number, number>; // 0=Sun, 1=Mon...
    paydayMultiplier: number; // Boost during salary period (dates 25-5)

    // 🌤️ Layer 2: Context Factors (Optional overrides)
    weatherMultipliers: Record<string, number>; // 'sunny', 'rain', 'cloudy'...

    confidence: number;
}

// Helper: Check if date is in "Payday Mode" (25th of prev month to 5th of current)
function isPaydayPeriod(date: Date): boolean {
    const d = date.getDate();
    return d >= 25 || d <= 5;
}

// Helper: Calculate Median to cut outliers
function calculateMedian(values: number[]): number {
    if (values.length === 0) return 1.0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

export function calculateProductSeasonality(
    sales: ProductSaleLog[],
    productId: string,
    lookbackDays: number = 90 // Need more data for multi-layer analysis
): SeasonalityMatrix {
    // 1. Filter & Navigate History
    const history = sales
        .filter(s => s.productId === productId || s.variantId === productId)
        .sort((a, b) => a.saleDate.localeCompare(b.saleDate));

    if (history.length < 10) {
        return {
            productId,
            baseline: 0,
            weekdayMultipliers: { 0: 1, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 },
            paydayMultiplier: 1.0,
            weatherMultipliers: {},
            confidence: 0
        };
    }

    // Group by Date for identifying daily totals
    const dailyData: Record<string, { qty: number, weather?: string }> = {};
    history.forEach(s => {
        if (!dailyData[s.saleDate]) dailyData[s.saleDate] = { qty: 0, weather: s.weatherCondition };
        dailyData[s.saleDate].qty += s.quantitySold;
        // Prefer explicit weather if available
        if (s.weatherCondition && !dailyData[s.saleDate].weather) {
            dailyData[s.saleDate].weather = s.weatherCondition;
        }
    });

    const dates = Object.keys(dailyData).sort();

    // Data Containers for Decomposition
    const weekdaySamples: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const weatherSamples: Record<string, number[]> = {};
    const paydaySamples: number[] = [];

    // 2. Iterative Learning (The "Layered" Approach)

    // Step A: Calculate Rolling Baseline & Weekday Factors
    dates.forEach((date) => {
        // Calculate MA (Rolling 30 days strictly before this date)
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

            // Raw Ratio = Actual / Baseline
            const rawRatio = actual / baseline;

            if (rawRatio > 0.1 && rawRatio < 5.0) { // Safety filter
                const dayIndex = new Date(date).getDay();
                weekdaySamples[dayIndex].push(rawRatio);
            }
        }
    });

    // Resolve Step A: Finalize Weekday Multipliers
    const finalWeekdayMultipliers: Record<number, number> = {};
    for (let i = 0; i <= 6; i++) {
        finalWeekdayMultipliers[i] = calculateMedian(weekdaySamples[i]);
    }

    // Step B: Calculate Weather & Payday Factors (Residual Analysis)
    // We re-iterate to find what the Weekday Factor DIDN'T explain.
    dates.forEach((date) => {
        const targetDate = new Date(date);
        let maSum = 0;
        let maCount = 0;
        for (let i = 1; i <= 30; i++) {
            const d = new Date(targetDate);
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            if (dailyData[dStr]) maSum += dailyData[dStr].qty;
            if (dailyData[dStr]) maCount++;
        }

        if (maCount >= 5 && maSum > 0) {
            const baseline = maSum / maCount;
            const actual = dailyData[date].qty;

            // Expected Sales based on Baseline * Weekday
            const dayIndex = new Date(date).getDay();
            const expectedFromDay = baseline * finalWeekdayMultipliers[dayIndex];

            if (expectedFromDay > 0) {
                // Residual Ratio = Actual / ExpectedFromDay
                const residual = actual / expectedFromDay;

                // 1. Capture Payday Effect
                if (isPaydayPeriod(new Date(date))) {
                    if (residual > 0.2 && residual < 4.0) {
                        paydaySamples.push(residual);
                    }
                }

                // 2. Capture Weather Effect
                const weather = dailyData[date].weather;
                if (weather) {
                    if (!weatherSamples[weather]) weatherSamples[weather] = [];
                    if (residual > 0.1 && residual < 5.0) {
                        weatherSamples[weather].push(residual);
                    }
                }
            }
        }
    });

    // Resolve Step B
    const finalPaydayMultiplier = calculateMedian(paydaySamples) || 1.0; // Default to 1 if no data

    const finalWeatherMultipliers: Record<string, number> = {};
    Object.keys(weatherSamples).forEach(w => {
        finalWeatherMultipliers[w] = calculateMedian(weatherSamples[w]);
    });

    // 3. Current Baseline (for next Prediction)
    const latestDate = new Date();
    let currentMaSum = 0;
    let currentMaCount = 0;
    for (let i = 1; i <= 30; i++) {
        const d = new Date(latestDate);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        if (dailyData[dStr]) {
            currentMaSum += dailyData[dStr].qty;
            currentMaCount++;
        }
    }
    const currentBaseline = currentMaCount > 0 ? currentMaSum / currentMaCount : 0;

    return {
        productId,
        baseline: currentBaseline,
        weekdayMultipliers: finalWeekdayMultipliers,
        paydayMultiplier: finalPaydayMultiplier,
        weatherMultipliers: finalWeatherMultipliers,
        confidence: dates.length >= 20 ? 1.0 : dates.length / 20
    };
}

export function predictProduction(
    matrix: SeasonalityMatrix,
    targetDate: Date,
    predictedWeather?: string
): {
    prediction: number,
    breakdown: { base: number, day: number, weather: number, payday: number }
} {
    const dayIndex = targetDate.getDay();

    // Factor 1: Weekday
    const dayFactor = matrix.weekdayMultipliers[dayIndex] || 1.0;

    // Factor 2: Payday
    const paydayFactor = isPaydayPeriod(targetDate) ? matrix.paydayMultiplier : 1.0;

    // Factor 3: Weather (if provided and known)
    let weatherFactor = 1.0;
    if (predictedWeather && matrix.weatherMultipliers[predictedWeather]) {
        weatherFactor = matrix.weatherMultipliers[predictedWeather];
    }

    // Formula: Baseline * Day * Payday * Weather
    const rawPrediction = matrix.baseline * dayFactor * paydayFactor * weatherFactor;
    const finalPrediction = Math.max(0, Math.round(rawPrediction / 5) * 5);

    return {
        prediction: finalPrediction,
        breakdown: {
            base: Math.round(matrix.baseline),
            day: dayFactor,
            payday: paydayFactor,
            weather: weatherFactor
        }
    };
}
