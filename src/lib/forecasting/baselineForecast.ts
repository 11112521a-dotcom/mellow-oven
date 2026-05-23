import { CleanedSalesData } from './dataRetrieval';
import { holtWinters, weightedMovingAverage, calculateMean } from './statisticalUtils';

/**
 * 🎯 Performs a fast Grid Search to find the optimal smoothing parameters (alpha, beta, gamma)
 * that minimize Mean Squared Error (MSE) on historical data for a specific product.
 */
function optimizeHoltWintersParameters(
    quantities: number[],
    seasonLength: number
): { alpha: number; beta: number; gamma: number } {
    const alphas = [0.1, 0.2, 0.3, 0.4];
    const betas = [0.05, 0.1, 0.2];
    const gammas = [0.05, 0.1, 0.2];

    let bestAlpha = 0.2;
    let bestBeta = 0.1;
    let bestGamma = 0.1;
    let minMSE = Infinity;

    // Evaluate over the last season to optimize for recency
    const evalStart = Math.max(seasonLength * 2, quantities.length - seasonLength);
    
    for (const a of alphas) {
        for (const b of betas) {
            for (const g of gammas) {
                let sumSE = 0;
                let count = 0;
                
                for (let i = evalStart; i < quantities.length; i++) {
                    const history = quantities.slice(0, i);
                    const forecast = holtWinters(history, seasonLength, a, b, g);
                    const error = forecast - quantities[i];
                    sumSE += error * error;
                    count++;
                }
                
                const mse = count > 0 ? sumSE / count : Infinity;
                if (mse < minMSE) {
                    minMSE = mse;
                    bestAlpha = a;
                    bestBeta = b;
                    bestGamma = g;
                }
            }
        }
    }
    
    return { alpha: bestAlpha, beta: bestBeta, gamma: bestGamma };
}

/**
 * STEP 2: Calculate baseline forecast using Holt-Winters Triple Exponential Smoothing
 * Captures Level, Trend, and Weekly Seasonality with Grid Search parameter tuning.
 */
export function calculateBaselineForecast(
    data: CleanedSalesData[],
    seasonLength: number = 7
): number {
    if (data.length === 0) return 0;

    // Sort data by date ascending (oldest to newest) for Holt-Winters
    const sortedData = [...data].sort((a, b) =>
        new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime()
    );

    const quantities = sortedData.map(d => d.qtyCleaned);

    // Use Holt-Winters with optimized parameters if we have enough data (at least 2 seasons)
    // Otherwise fallback to Weighted Moving Average
    if (quantities.length >= seasonLength * 2) {
        const { alpha, beta, gamma } = optimizeHoltWintersParameters(quantities, seasonLength);
        return holtWinters(quantities, seasonLength, alpha, beta, gamma);
    } else {
        const daysAgo = sortedData.map(d => d.daysAgo);
        return weightedMovingAverage(quantities, daysAgo);
    }
}
