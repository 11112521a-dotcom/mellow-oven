import { ProductSaleLog, Product } from '@/types';
import { fetchAndCleanData, DataCleaningResult } from './dataRetrieval';
import { calculateBaselineForecast } from './baselineForecast';
import { calculateWeatherImpact, applyWeatherAdjustment, WeatherCondition } from './weatherAdjustment';
import { calculateOptimalQuantity, NewsvendorParams } from './newsvendorModel';
import { poissonCDF } from './statisticalUtils';

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
    lambda: number; // Poisson parameter

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

/**
 * Main orchestrator: Calculate optimal production quantity
 * Implements all 5 steps of the forecasting algorithm
 */
export async function calculateOptimalProduction(
    input: ForecastInput
): Promise<ForecastOutput> {
    try {
        // STEP 1: Fetch and Clean Data (IQR Method)
        const cleaningResult = await fetchAndCleanData(
            input.productSales,
            input.marketId,
            input.productId,
            input.variantId
        );

        const { cleanedData, stats } = cleaningResult;

        // Check minimum data requirement
        if (cleanedData.length < 3) {
            throw new Error('Insufficient data: need at least 3 sales records');
        }

        // STEP 2: Baseline Forecast (Time-Decay Weighted Average)
        const baselineForecast = calculateBaselineForecast(cleanedData);

        // STEP 3: Weather Adjustment
        const weatherImpact = calculateWeatherImpact(cleanedData);
        const weatherAdjustedForecast = applyWeatherAdjustment(
            baselineForecast,
            input.weatherForecast,
            weatherImpact
        );

        // STEP 4: Poisson Lambda (Expected Demand)
        const lambda = weatherAdjustedForecast;

        // STEP 5: Newsvendor Optimization
        const newsvendorParams: NewsvendorParams = {
            sellingPrice: input.product.price,
            unitCost: input.product.cost,
            disposalCost: 0 // Assume no salvage value
        };

        const newsvendorResult = calculateOptimalQuantity(lambda, newsvendorParams);
        const Q = newsvendorResult.optimalQuantity;

        // Calculate risk metrics
        const stockoutProbability = 1 - poissonCDF(Q, lambda);
        const wasteProbability = poissonCDF(Q - 1, lambda);

        // Prediction interval (80% confidence using ±1.28 standard deviations)
        const stdDev = Math.sqrt(lambda); // For Poisson, variance = λ
        const predictionInterval = {
            lower: Math.max(0, Math.floor(lambda - 1.28 * stdDev)),
            upper: Math.ceil(lambda + 1.28 * stdDev)
        };

        // Confidence level based on data quantity
        const confidenceLevel: 'high' | 'medium' | 'low' =
            stats.totalPoints >= 10 ? 'high'
                : stats.totalPoints >= 5 ? 'medium'
                    : 'low';

        // Economic analysis
        const expectedDemand = lambda;
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
            lambda,
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
