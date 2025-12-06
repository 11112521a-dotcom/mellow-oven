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
    productId: string;
    variantId?: string;
    weatherForecast: WeatherCondition;
    product: Product; // For price/cost data
    productSales: ProductSaleLog[]; // Historical data
}

export interface ForecastOutput {
    success: boolean;
    optimalQuantity: number;

    // Intermediate results
    baselineForecast: number;
    weatherAdjustedForecast: number;
    lambda: number; // Expected Demand (Mean)

    // Distribution info
    distributionType: 'poisson' | 'negativeBinomial';
    variance: number;

    // Decision metrics
    serviceLevelTarget: number;
    stockoutProbability: number;
    wasteProbability: number;

    // Confidence metrics
    confidenceLevel: 'high' | 'medium' | 'low';
    dataPoints: number;
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

    // Raw data (for debugging/visualization)
    cleaningStats?: DataCleaningResult['stats'];
}

// Hardcoded Thai Holidays (Example list - in production this should be a config)
const THAI_HOLIDAYS = [
    '2025-01-01', '2025-04-13', '2025-04-14', '2025-04-15', // Songkran
    '2025-05-01', '2025-12-05', '2025-12-10', '2025-12-31'
];

/**
 * Main orchestrator: Calculate optimal production quantity
 * Implements all 5 steps of the forecasting algorithm
 */
export async function calculateOptimalProduction(
    input: ForecastInput
): Promise<ForecastOutput> {
    try {
        // STEP 1: Fetch and Clean Data (IQR Method with Payday/Holiday Logic)
        const cleaningResult = await fetchAndCleanData(
            input.productSales,
            input.marketId,
            input.productId,
            input.variantId,
            THAI_HOLIDAYS
        );

        const { cleanedData, stats } = cleaningResult;

        // Check minimum data requirement
        if (cleanedData.length < 3) {
            throw new Error('Insufficient data: need at least 3 sales records');
        }

        // STEP 2: Baseline Forecast (Holt-Winters Exponential Smoothing)
        const baselineForecast = calculateBaselineForecast(cleanedData);

        // STEP 3: Weather Adjustment
        const weatherImpact = calculateWeatherImpact(cleanedData);
        const weatherAdjustedForecast = applyWeatherAdjustment(
            baselineForecast,
            input.weatherForecast,
            weatherImpact
        );

        // Apply Payday Multiplier
        // Logic: If "Tomorrow" is a Payday (25th-5th), boost forecast by 20%
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const isPayday = (d: string) => {
            const day = new Date(d).getDate();
            return (day >= 25 && day <= 31) || (day >= 1 && day <= 5);
        };

        let paydayMultiplier = 1.0;
        if (isPayday(tomorrowStr)) {
            paydayMultiplier = 1.2; // Explicit boost for Payday
        }

        // Final Mean (Lambda) = Baseline * Weather * Payday
        const finalForecastMean = weatherAdjustedForecast * paydayMultiplier;

        // STEP 4: Determine Probability Distribution (Poisson vs Negative Binomial)
        const quantities = cleanedData.map(d => d.qtyCleaned);
        const mean = finalForecastMean; // Use our final adjusted forecast as the mean
        const historicalVariance = calculateVariance(quantities);

        // If historical variance is significantly higher than mean, use Negative Binomial
        // We use the forecasted mean, but historical variance ratio
        const varianceToMeanRatio = historicalVariance / (calculateMean(quantities) || 1);
        const estimatedVariance = mean * varianceToMeanRatio;

        let distribution: DistributionParams;
        let variance = mean; // Default for Poisson

        if (estimatedVariance > mean * 1.1) { // Threshold: Variance > 1.1 * Mean
            // Use Negative Binomial
            // Mean = r(1-p)/p
            // Variance = r(1-p)/p^2
            // p = Mean / Variance
            // r = Mean * p / (1-p)

            const p = mean / estimatedVariance;
            const r = (mean * p) / (1 - p);

            distribution = {
                type: 'negativeBinomial',
                r,
                p
            };
            variance = estimatedVariance;
        } else {
            // Use Poisson
            distribution = {
                type: 'poisson',
                lambda: mean
            };
        }

        // STEP 5: Newsvendor Optimization
        const newsvendorParams: NewsvendorParams = {
            sellingPrice: input.product.price,
            unitCost: input.product.cost,
            disposalCost: 0 // Assume no salvage value
        };

        const newsvendorResult = calculateOptimalQuantity(distribution, newsvendorParams);
        const Q = newsvendorResult.optimalQuantity;

        // Calculate risk metrics
        let stockoutProbability, wasteProbability;
        if (distribution.type === 'poisson') {
            stockoutProbability = 1 - poissonCDF(Q, distribution.lambda!);
            wasteProbability = poissonCDF(Q - 1, distribution.lambda!);
        } else {
            stockoutProbability = 1 - negativeBinomialCDF(Q, distribution.r!, distribution.p!);
            wasteProbability = negativeBinomialCDF(Q - 1, distribution.r!, distribution.p!);
        }

        // Prediction interval (80% confidence)
        // Approx using Normal approximation for simplicity or STD DEV
        const stdDev = Math.sqrt(variance);
        const predictionInterval = {
            lower: Math.max(0, Math.floor(mean - 1.28 * stdDev)),
            upper: Math.ceil(mean + 1.28 * stdDev)
        };

        // Confidence level based on data quantity
        const confidenceLevel: 'high' | 'medium' | 'low' =
            stats.totalPoints >= 14 ? 'high' // Increased requirement for Holt-Winters
                : stats.totalPoints >= 7 ? 'medium'
                    : 'low';

        // Economic analysis
        const expectedDemand = mean;
        const expectedSales = Math.min(expectedDemand, Q);
        const expectedWaste = Math.max(0, Q - expectedDemand);
        const expectedRevenue = expectedSales * input.product.price;
        const expectedCost = Q * input.product.cost;
        const expectedProfit = expectedRevenue - expectedCost;

        return {
            success: true,
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
        // Fallback: return conservative estimate
        console.error('Forecasting error:', error);

        return {
            success: false,
            optimalQuantity: 10, // Conservative default
            baselineForecast: 10,
            weatherAdjustedForecast: 10,
            lambda: 10,
            distributionType: 'poisson',
            variance: 10,
            serviceLevelTarget: 0.5,
            stockoutProbability: 0.5,
            wasteProbability: 0.5,
            confidenceLevel: 'low',
            dataPoints: 0,
            outliersRemoved: 0,
            predictionInterval: { lower: 5, upper: 15 },
            economics: {
                unitPrice: input.product.price,
                unitCost: input.product.cost,
                expectedDemand: 10,
                expectedSales: 10,
                expectedWaste: 0,
                expectedRevenue: 10 * input.product.price,
                expectedCost: 10 * input.product.cost,
                expectedProfit: 10 * (input.product.price - input.product.cost)
            }
        };
    }
}
