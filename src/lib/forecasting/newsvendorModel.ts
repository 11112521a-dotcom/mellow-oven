import { poissonCDF } from './statisticalUtils';

export interface NewsvendorParams {
    sellingPrice: number;
    unitCost: number;
    disposalCost: number; // Cost to dispose waste (usually 0 or negative for salvage value)
}

export interface NewsvendorResult {
    optimalQuantity: number;
    criticalRatio: number;
    costUnderage: number; // Cu: profit lost per unit if sold out
    costOverage: number;  // Co: cost per unit if waste
    serviceLevelTarget: number; // Same as critical ratio
}

/**
 * STEP 5: Newsvendor Model to find optimal production quantity
 * Balances cost of stockout vs. cost of waste to maximize profit
 */
export function calculateCriticalRatio(params: NewsvendorParams): number {
    const Cu = params.sellingPrice - params.unitCost; // Cost of Underage (profit lost)
    const Co = params.unitCost + params.disposalCost; // Cost of Overage (waste cost)

    // Critical Ratio (CR) = Cu / (Cu + Co)
    // This is the target service level
    return Cu / (Cu + Co);
}

/**
 * Find optimal quantity Q* using Newsvendor Model
 * Q* is the quantity where P(Demand ≤ Q*) ≥ Critical Ratio
 */
export function calculateOptimalQuantity(
    lambda: number, // Expected demand (from Poisson λ)
    params: NewsvendorParams
): NewsvendorResult {
    const criticalRatio = calculateCriticalRatio(params);

    // Find Q* using Poisson CDF
    let Q = 0;
    let cumulativeProbability = 0;

    // Iterate until we exceed the critical ratio
    const maxIterations = Math.ceil(lambda * 3); // Safety limit

    while (cumulativeProbability < criticalRatio && Q < maxIterations) {
        Q++;
        cumulativeProbability = poissonCDF(Q, lambda);
    }

    return {
        optimalQuantity: Q,
        criticalRatio,
        costUnderage: params.sellingPrice - params.unitCost,
        costOverage: params.unitCost + params.disposalCost,
        serviceLevelTarget: criticalRatio
    };
}
