import { CleanedSalesData } from './dataRetrieval';
import { weightedMovingAverage } from './statisticalUtils';

/**
 * STEP 2: Calculate baseline forecast using Time-Decay Weighted Moving Average
 * Gives higher weight to recent sales visits
 */
export function calculateBaselineForecast(
    data: CleanedSalesData[],
    decayRate: number = 0.05
): number {
    if (data.length === 0) return 0;

    const quantities = data.map(d => d.qtyCleaned);
    const daysAgo = data.map(d => d.daysAgo);

    return weightedMovingAverage(quantities, daysAgo, decayRate);
}
