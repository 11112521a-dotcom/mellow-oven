import { ProductSaleLog, Product } from '@/types';
import { fetchAndCleanData, DataCleaningResult } from './dataRetrieval';
import { calculateBaselineForecast } from './baselineForecast';
import { calculateWeatherImpact, applyWeatherAdjustment, WeatherCondition } from './weatherAdjustment';
import { calculateOptimalQuantity, NewsvendorParams, DistributionParams } from './newsvendorModel';
import { poissonCDF, calculateMean, calculateVariance, negativeBinomialCDF } from './statisticalUtils';
export { calculateDailyProduction, runBatchCalculatorTests, calculateStockTransfer, runStockTransferTests, runAllProductionTests } from './batchCalculator';
export type { BatchCalculationInput, BatchCalculationResult, StockTransferInput, StockTransferResult } from './batchCalculator';

export interface ForecastInput {
    marketId: string;
    marketName?: string;
    productId: string;
    variantId?: string;
    weatherForecast: WeatherCondition;
    product: Product;
    productSales: ProductSaleLog[];
    targetDate?: string; // NEW: Date we're forecasting for
}

export interface ForecastOutput {
    success: boolean;
    optimalQuantity: number;
    noData: boolean; // NEW: Flag when no data exists

    // Intermediate results
    baselineForecast: number;
    weatherAdjustedForecast: number;
    lambda: number;

    // Distribution info
    distributionType: 'poisson' | 'negativeBinomial';
    variance: number;

    // Decision metrics
    serviceLevelTarget: number;
    stockoutProbability: number;
    wasteProbability: number;

    // Confidence metrics
    confidenceLevel: 'high' | 'medium' | 'low' | 'none';
    dataPoints: number;
    sameDayDataPoints: number; // NEW: How many same-weekday records
    outliersRemoved: number;

    // Prediction interval (80% confidence)
    predictionInterval: {
        lower: number;
        upper: number;
    };

    // Economic analysis
    economics: {
        unitPrice: number;
        unitCost: number;
        expectedDemand: number;
        expectedSales: number;
        expectedWaste: number;
        expectedRevenue: number;
        expectedCost: number;
        expectedProfit: number;
    };

    // Raw data
    cleaningStats?: DataCleaningResult['stats'];
}

// Thai Holidays
const THAI_HOLIDAYS = [
    '2025-01-01', '2025-04-13', '2025-04-14', '2025-04-15',
    '2025-05-01', '2025-12-05', '2025-12-10', '2025-12-31'
];

/**
 * Main orchestrator: Calculate optimal production quantity
 * REFACTORED: Works from Day 1, uses day-of-week average
 */
export async function calculateOptimalProduction(
    input: ForecastInput
): Promise<ForecastOutput> {
    try {
        // STEP 1: Fetch and Clean Data (with day-of-week filtering)
        const cleaningResult = await fetchAndCleanData(
            input.productSales,
            input.marketId,
            input.productId,
            input.variantId,
            THAI_HOLIDAYS,
            180,
            input.marketName,
            input.targetDate // NEW: Pass target date for day-of-week matching
        );

        const { cleanedData, sameDayData, stats } = cleaningResult;

        // NEW: Handle no data case gracefully
        if (cleanedData.length === 0) {
            return {
                success: false,
                noData: true,
                optimalQuantity: 0,
                baselineForecast: 0,
                weatherAdjustedForecast: 0,
                lambda: 0,
                distributionType: 'poisson',
                variance: 0,
                serviceLevelTarget: 0,
                stockoutProbability: 0,
                wasteProbability: 0,
                confidenceLevel: 'none',
                dataPoints: 0,
                sameDayDataPoints: 0,
                outliersRemoved: 0,
                predictionInterval: { lower: 0, upper: 0 },
                economics: {
                    unitPrice: input.product.price,
                    unitCost: input.product.cost,
                    expectedDemand: 0,
                    expectedSales: 0,
                    expectedWaste: 0,
                    expectedRevenue: 0,
                    expectedCost: 0,
                    expectedProfit: 0
                },
                cleaningStats: stats
            };
        }

        // STEP 2: Baseline Forecast
        // NEW: Prefer same-day average if available, else use Holt-Winters on all data
        let baselineForecast: number;
        if (sameDayData.length >= 2) {
            // Use same-day-of-week average (more relevant for weekly patterns)
            baselineForecast = stats.sameDayAverage;
        } else if (cleanedData.length >= 3) {
            // Use Holt-Winters for smoothing
            baselineForecast = calculateBaselineForecast(cleanedData);
        } else {
            // Simple average for 1-2 data points
            baselineForecast = stats.averageSales;
        }

        // STEP 3: Weather Adjustment
        const weatherImpact = cleanedData.length >= 3 ? calculateWeatherImpact(cleanedData) : null;
        const weatherAdjustedForecast = weatherImpact
            ? applyWeatherAdjustment(baselineForecast, input.weatherForecast, weatherImpact)
            : baselineForecast * (input.weatherForecast === 'rain' ? 0.7 : input.weatherForecast === 'storm' ? 0.4 : 1.0);

        // STEP 4: Payday Multiplier
        const targetDateStr = input.targetDate || new Date().toISOString().split('T')[0];
        const isPayday = (d: string) => {
            const day = new Date(d).getDate();
            return (day >= 25 && day <= 31) || (day >= 1 && day <= 5);
        };
        const paydayMultiplier = isPayday(targetDateStr) ? 1.2 : 1.0;

        // Final Mean (Lambda)
        const finalForecastMean = Math.max(1, weatherAdjustedForecast * paydayMultiplier);

        // STEP 5: Distribution & Newsvendor
        const quantities = cleanedData.map(d => d.qtyCleaned);
        const mean = finalForecastMean;

        // Simple variance estimation
        const historicalVariance = quantities.length >= 3 ? calculateVariance(quantities) : mean;
        const varianceToMeanRatio = historicalVariance / (calculateMean(quantities) || 1);
        const estimatedVariance = Math.max(mean, mean * varianceToMeanRatio);

        let distribution: DistributionParams;
        let variance = mean;

        if (estimatedVariance > mean * 1.1 && quantities.length >= 3) {
            const p = mean / estimatedVariance;
            const r = (mean * p) / (1 - p);
            distribution = { type: 'negativeBinomial', r, p };
            variance = estimatedVariance;
        } else {
            distribution = { type: 'poisson', lambda: mean };
        }

        // Newsvendor Optimization
        const newsvendorParams: NewsvendorParams = {
            sellingPrice: input.product.price,
            unitCost: input.product.cost,
            disposalCost: 0
        };

        const newsvendorResult = calculateOptimalQuantity(distribution, newsvendorParams);
        const Q = Math.max(1, newsvendorResult.optimalQuantity);

        // Risk metrics
        let stockoutProbability = 0.5, wasteProbability = 0.5;
        if (distribution.type === 'poisson' && distribution.lambda) {
            stockoutProbability = 1 - poissonCDF(Q, distribution.lambda);
            wasteProbability = poissonCDF(Q - 1, distribution.lambda);
        } else if (distribution.type === 'negativeBinomial' && distribution.r && distribution.p) {
            stockoutProbability = 1 - negativeBinomialCDF(Q, distribution.r, distribution.p);
            wasteProbability = negativeBinomialCDF(Q - 1, distribution.r, distribution.p);
        }

        // Prediction interval
        const stdDev = Math.sqrt(variance);
        const predictionInterval = {
            lower: Math.max(0, Math.floor(mean - 1.28 * stdDev)),
            upper: Math.ceil(mean + 1.28 * stdDev)
        };

        // Confidence level - ADJUSTED for fewer data requirement
        const confidenceLevel: 'high' | 'medium' | 'low' | 'none' =
            stats.sameDayPoints >= 4 ? 'high'
                : stats.sameDayPoints >= 2 ? 'medium'
                    : stats.totalPoints >= 3 ? 'medium'
                        : stats.totalPoints >= 1 ? 'low'
                            : 'none';

        // Economic analysis
        const expectedDemand = mean;
        const expectedSales = Math.min(expectedDemand, Q);
        const expectedWaste = Math.max(0, Q - expectedDemand);
        const expectedRevenue = expectedSales * input.product.price;
        const expectedCost = Q * input.product.cost;
        const expectedProfit = expectedRevenue - expectedCost;

        return {
            success: true,
            noData: false,
            optimalQuantity: Q,
            baselineForecast,
            weatherAdjustedForecast,
            lambda: mean,
            distributionType: distribution.type,
            variance,
            serviceLevelTarget: newsvendorResult.serviceLevelTarget,
            stockoutProbability,
            wasteProbability,
            confidenceLevel,
            dataPoints: stats.totalPoints,
            sameDayDataPoints: stats.sameDayPoints,
            outliersRemoved: stats.outliersDetected,
            predictionInterval,
            economics: {
                unitPrice: input.product.price,
                unitCost: input.product.cost,
                expectedDemand,
                expectedSales,
                expectedWaste,
                expectedRevenue,
                expectedCost,
                expectedProfit
            },
            cleaningStats: stats
        };

    } catch (error) {
        console.error('Forecasting error:', error);

        return {
            success: false,
            noData: true,
            optimalQuantity: 0,
            baselineForecast: 0,
            weatherAdjustedForecast: 0,
            lambda: 0,
            distributionType: 'poisson',
            variance: 0,
            serviceLevelTarget: 0,
            stockoutProbability: 0,
            wasteProbability: 0,
            confidenceLevel: 'none',
            dataPoints: 0,
            sameDayDataPoints: 0,
            outliersRemoved: 0,
            predictionInterval: { lower: 0, upper: 0 },
            economics: {
                unitPrice: input.product.price,
                unitCost: input.product.cost,
                expectedDemand: 0,
                expectedSales: 0,
                expectedWaste: 0,
                expectedRevenue: 0,
                expectedCost: 0,
                expectedProfit: 0
            }
        };
    }
}

