import { ForecastOutput } from '@/src/lib/forecasting';

// Interface for saved forecast in database
export interface ProductionForecast {
    id: string;
    createdAt: string;

    // Context
    productId: string;
    productName: string;
    marketId: string;
    marketName: string;
    forecastForDate: string; // YYYY-MM-DD

    // Input parameters
    weatherForecast: string;
    historicalDataPoints: number;

    // Algorithm outputs
    baselineForecast: number;
    weatherAdjustedForecast: number;
    lambdaPoisson: number;
    optimalQuantity: number;

    // Risk metrics
    serviceLevelTarget: number;
    stockoutProbability: number;
    wasteProbability: number;

    // Economic metrics
    unitPrice: number;
    unitCost: number;
    expectedDemand: number;
    expectedProfit: number;

    // Confidence
    confidenceLevel: 'high' | 'medium' | 'low';
    predictionIntervalLower: number;
    predictionIntervalUpper: number;
    outliersRemoved: number;
}

// Helper to convert ForecastOutput to ProductionForecast
export function forecastOutputToDbFormat(
    output: ForecastOutput,
    productId: string,
    productName: string,
    marketId: string,
    marketName: string,
    forecastForDate: string,
    weatherForecast: string
): Omit<ProductionForecast, 'id' | 'createdAt'> {
    return {
        productId,
        productName,
        marketId,
        marketName,
        forecastForDate,
        weatherForecast,
        historicalDataPoints: output.dataPoints,
        baselineForecast: output.baselineForecast,
        weatherAdjustedForecast: output.weatherAdjustedForecast,
        lambdaPoisson: output.lambda,
        optimalQuantity: output.optimalQuantity,
        serviceLevelTarget: output.serviceLevelTarget,
        stockoutProbability: output.stockoutProbability,
        wasteProbability: output.wasteProbability,
        unitPrice: output.economics.unitPrice,
        unitCost: output.economics.unitCost,
        expectedDemand: output.economics.expectedDemand,
        expectedProfit: output.economics.expectedProfit,
        confidenceLevel: output.confidenceLevel,
        predictionIntervalLower: output.predictionInterval.lower,
        predictionIntervalUpper: output.predictionInterval.upper,
        outliersRemoved: output.outliersRemoved
    };
}
