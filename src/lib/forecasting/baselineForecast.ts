import { CleanedSalesData } from './dataRetrieval';
import { holtWinters, weightedMovingAverage } from './statisticalUtils';

/**
 * STEP 2: Calculate baseline forecast using Holt-Winters Triple Exponential Smoothing
 * Captures Level, Trend, and Weekly Seasonality
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

    // Use Holt-Winters if we have enough data (at least 2 seasons + 1)
    // Otherwise fallback to Weighted Moving Average
    if (quantities.length >= seasonLength * 2) {
        return holtWinters(quantities, seasonLength);
    } else {
        const daysAgo = sortedData.map(d => d.daysAgo);
        return weightedMovingAverage(quantities, daysAgo);
    }
}
