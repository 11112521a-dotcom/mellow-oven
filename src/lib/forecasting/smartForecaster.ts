// ============================================================
// 🚀 Smart Forecaster v2.0
// Master orchestrator combining all intelligent forecasting modules
// ============================================================

import { ProductSaleLog, Product } from '@/types';
import { calculateOptimalProduction, ForecastOutput, ForecastInput } from './index';
import {
    calculateForecastErrors,
    calculateBiasCorrection,
    applyBiasCorrection,
    detectPatterns,
    calculateLearningStats,
    getSmartAdjustment,
    ForecastError,
    LearningStats,
    PatternInsight
} from './selfLearning';
import {
    fetchWeatherForecast,
    getWeatherFactor,
    getWeatherEmoji,
    WeatherCondition,
    WeatherForecast
} from './weatherAPI';
import {
    getCalendarFactors,
    getMonthSeasonality,
    getUpcomingEvents,
    ThaiCalendarEvent
} from './thaiCalendar';
import {
    buildMarketProfile,
    getMarketAdjustment,
    getProductRecommendation,
    MarketProfile
} from './marketProfile';

// ============================================================
// Types
// ============================================================

export interface SmartForecastInput {
    product: Product;
    productId: string;
    variantId?: string;
    marketId: string;
    marketName: string;
    targetDate: string;
    productSales: ProductSaleLog[];
    historicalForecasts?: Array<{ productId: string; productName: string; marketId: string; forecastForDate: string; optimalQuantity: number; weatherForecast?: string }>;
    autoFetchWeather?: boolean;
    location?: string; // For weather API
    weatherCondition?: WeatherCondition; // Custom override weather
    wasteRate?: number;    // Dynamic Profit Maximizer: recent waste rate
    stockoutRate?: number; // Dynamic Profit Maximizer: recent stockout rate
}

export interface SmartForecastOutput extends ForecastOutput {
    // Enhanced with smart adjustments
    smartAdjustedQuantity: number;

    // Weather info
    weatherForecast?: WeatherForecast;
    weatherFactor: number;

    // Calendar info
    calendarFactors: Array<{ name: string; factor: number }>;
    upcomingEvents: ThaiCalendarEvent[];
    seasonalityFactor: number;

    // Learning info
    learningApplied: boolean;
    biasCorrection: number;
    patternAdjustments: Array<{ source: string; delta: number; confidence: number }>;

    // Market profile
    marketProfile?: MarketProfile;
    marketAdjustment: number;

    // Overall confidence
    smartConfidence: number;

    // Explanation for UI
    explanation: string[];

    // Self-Learning 4.0 Stats
    momentumTrend?: number;
    volatility?: number;
    isHighVolatility?: boolean;
}

export interface SmartForecastSummary {
    totalProducts: number;
    avgConfidence: number;
    topPatterns: PatternInsight[];
    learningStats: LearningStats;
    upcomingEvents: ThaiCalendarEvent[];
    weatherSummary?: string;
}

// ============================================================
// Main Smart Forecasting Function
// ============================================================

/**
 * Calculate smart forecast with all intelligent adjustments
 */
export async function calculateSmartForecast(
    input: SmartForecastInput
): Promise<SmartForecastOutput> {
    const {
        product,
        productId,
        variantId,
        marketId,
        marketName,
        targetDate,
        productSales,
        historicalForecasts = [],
        autoFetchWeather = false,
        location = 'sisaket'
    } = input;

    const explanation: string[] = [];
    const targetDayOfWeek = new Date(targetDate).getDay();

    // 1. Get base forecast from existing system
    let weather: WeatherCondition = input.weatherCondition || 'sunny';
    let weatherForecast: WeatherForecast | undefined;

    // Optionally auto-fetch weather, or retrieve ensemble metadata if overridden
    try {
        const fetchedWeather = await fetchWeatherForecast(targetDate, location);
        if (fetchedWeather) {
            weatherForecast = fetchedWeather;
            if (!input.weatherCondition) {
                weather = fetchedWeather.condition;
            } else if (fetchedWeather.condition !== input.weatherCondition) {
                // Keep the fetched forecast details but override the specific condition for display
                weatherForecast = {
                    ...fetchedWeather,
                    condition: input.weatherCondition,
                    description: `ผู้ใช้ปรับสภาพอากาศเป็น: ${getWeatherEmoji(input.weatherCondition)} (${input.weatherCondition.toUpperCase()})`
                };
            }
        }
    } catch (e) {
        console.warn('[SmartForecaster] Failed to fetch ensemble weather forecast:', e);
    }

    // Add weather explanation
    explanation.push(`🌤️ สภาพอากาศ: ${weatherForecast?.description || weather} (${getWeatherEmoji(weather)})`);

    const baseForecastInput: ForecastInput = {
        product,
        productId,
        variantId,
        marketId,
        marketName,
        targetDate,
        productSales,
        weatherForecast: weather,
        wasteRate: input.wasteRate,
        stockoutRate: input.stockoutRate
    };

    const baseForecast = await calculateOptimalProduction(baseForecastInput);

    let smartQty = baseForecast.optimalQuantity;
    let smartConfidence = getConfidenceScore(baseForecast.confidenceLevel);

    // 2. Apply Self-Learning adjustments
    let biasCorrection = 0;
    let patternAdjustments: Array<{ source: string; delta: number; confidence: number }> = [];
    let learningApplied = false;
    let momentumTrend = 0;
    let volatility = 0;
    let isHighVolatility = false;

    if (historicalForecasts.length >= 5) {
        // Calculate past errors
        const errors = calculateForecastErrors(historicalForecasts, productSales);
        const forecastId = variantId || productId;
        const productErrors = errors.filter(e => e.productId === forecastId);

        if (productErrors.length >= 3) {
            // Get detailed stats (Self-Learning 4.0)
            const biasStats = calculateBiasCorrection(productErrors, forecastId, marketId);
            if (biasStats) {
                momentumTrend = biasStats.momentumSlope;
                volatility = biasStats.volatility;
                // Simple threshold for high volatility UI flag
                isHighVolatility = biasStats.volatility > 5 && biasStats.confidenceScore < 60;
            }

            // Get smart adjustment
            const targetDayOfMonth = new Date(targetDate).getDate();
            const smartAdj = getSmartAdjustment(
                smartQty,
                forecastId,
                marketId,
                targetDayOfWeek,
                targetDayOfMonth,
                weather,
                productErrors
            );

            if (smartAdj.adjustments.length > 0) {
                smartQty = smartAdj.adjustedForecast;
                patternAdjustments = smartAdj.adjustments;
                biasCorrection = patternAdjustments.reduce((sum, a) => sum + a.delta, 0);
                learningApplied = true;
                smartConfidence = Math.min(100, smartConfidence + smartAdj.totalConfidence * 0.2);

                explanation.push(`🧠 ปรับจาก Self-Learning: ${biasCorrection >= 0 ? '+' : ''}${biasCorrection.toFixed(1)} ชิ้น`);
            }
        }
    }

    // 3. Apply Calendar factors
    const calendarInfo = getCalendarFactors(targetDate);
    const calendarFactors = calendarInfo.factors;

    if (calendarInfo.totalFactor !== 1.0) {
        smartQty = Math.round(smartQty * calendarInfo.totalFactor);
        calendarFactors.forEach(f => {
            explanation.push(`📅 ${f.name}: ×${f.factor.toFixed(2)}`);
        });
    }

    // 4. Apply seasonality
    const seasonality = getMonthSeasonality(targetDate);
    const seasonalityFactor = seasonality.factor;

    if (Math.abs(seasonalityFactor - 1.0) > 0.05) {
        smartQty = Math.round(smartQty * seasonalityFactor);
        explanation.push(`📊 ฤดูกาล (${seasonality.description}): ×${seasonalityFactor.toFixed(2)}`);
    }

    // 5. Apply Market Profile adjustments
    const marketProfile = buildMarketProfile(marketId, marketName, productSales);
    const isSeasonalityApplied = !!(baseForecast.seasonalityFactors && baseForecast.seasonalityFactors.confidence > 0.5);
    const marketAdj = getMarketAdjustment(
        smartQty,
        marketProfile,
        targetDayOfWeek,
        calendarInfo.isPayday,
        !isSeasonalityApplied, // applyWeekday
        !isSeasonalityApplied  // applyPayday
    );

    const marketAdjustment = marketAdj.adjustedQty - smartQty;
    if (marketAdjustment !== 0) {
        smartQty = marketAdj.adjustedQty;
        marketAdj.factors.forEach(f => {
            explanation.push(`🏪 ${f.name}: ×${f.factor.toFixed(2)}`);
        });
    }

    // 6. Get upcoming events for UI
    const upcomingEvents = getUpcomingEvents(targetDate, 14);

    // 7. Ensure smart quantity is reasonable
    smartQty = Math.max(0, smartQty);

    // Final explanation summary
    if (smartQty !== baseForecast.optimalQuantity) {
        const diff = smartQty - baseForecast.optimalQuantity;
        explanation.push(`✅ ผลสุดท้าย: ${baseForecast.optimalQuantity} → ${smartQty} (${diff >= 0 ? '+' : ''}${diff} ชิ้น)`);
    }

    return {
        ...baseForecast,
        optimalQuantity: smartQty, // Overwrite with smart adjusted quantity for seamless UI/DB saving integration
        smartAdjustedQuantity: smartQty,
        weatherForecast,
        weatherFactor: marketProfile.weatherFactors?.[weather] ?? getWeatherFactor(weather),
        calendarFactors,
        upcomingEvents,
        seasonalityFactor,
        learningApplied,
        biasCorrection,
        patternAdjustments,
        marketProfile,
        marketAdjustment,
        smartConfidence,
        explanation,
        momentumTrend,
        volatility,
        isHighVolatility
    };
}

/**
 * Calculate smart forecasts for multiple products
 */
export async function calculateBatchSmartForecasts(
    inputs: SmartForecastInput[]
): Promise<{
    forecasts: SmartForecastOutput[];
    summary: SmartForecastSummary;
}> {
    const forecasts: SmartForecastOutput[] = [];

    for (const input of inputs) {
        try {
            const forecast = await calculateSmartForecast(input);
            forecasts.push(forecast);
        } catch (error) {
            console.error(`Failed to forecast ${input.productId}:`, error);
        }
    }

    // Build summary
    const avgConfidence = forecasts.length > 0
        ? forecasts.reduce((sum, f) => sum + f.smartConfidence, 0) / forecasts.length
        : 0;

    // Get learning stats from all data
    const allErrors: ForecastError[] = [];
    if (inputs[0]?.historicalForecasts) {
        const errors = calculateForecastErrors(
            inputs[0].historicalForecasts,
            inputs[0].productSales
        );
        allErrors.push(...errors);
    }

    const learningStats = calculateLearningStats(allErrors);
    const upcomingEvents = inputs[0]
        ? getUpcomingEvents(inputs[0].targetDate, 14)
        : [];

    // Weather summary
    const weatherSummary = forecasts[0]?.weatherForecast
        ? `${getWeatherEmoji(forecasts[0].weatherForecast.condition)} ${forecasts[0].weatherForecast.description}`
        : undefined;

    return {
        forecasts,
        summary: {
            totalProducts: forecasts.length,
            avgConfidence,
            topPatterns: learningStats.topPatterns.slice(0, 5),
            learningStats,
            upcomingEvents,
            weatherSummary
        }
    };
}

// Helper
function getConfidenceScore(level: string): number {
    switch (level) {
        case 'high': return 85;
        case 'medium': return 65;
        case 'low': return 45;
        case 'none': return 20;
        default: return 50;
    }
}

export default {
    calculateSmartForecast,
    calculateBatchSmartForecasts
};
