import { poissonCDF, negativeBinomialCDF } from './statisticalUtils';

export interface NewsvendorParams {
    sellingPrice: number;
    unitCost: number;
    disposalCost: number; // Cost to dispose waste (usually 0 or negative for salvage value)
}

export interface DistributionParams {
    type: 'poisson' | 'negativeBinomial';
    lambda?: number; // For Poisson
    r?: number;      // For Negative Binomial
    p?: number;      // For Negative Binomial
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
    // Edge Case: guard against Cu + Co = 0
    const denominator = Cu + Co;
    return denominator > 0 ? Cu / denominator : 0.5; // Default to 50% service level if both costs are 0
}

/**
 * Find optimal quantity Q* using Newsvendor Model
 * Q* is the quantity where P(Demand ≤ Q*) ≥ Critical Ratio
 */
export function calculateOptimalQuantity(
    distribution: DistributionParams,
    params: NewsvendorParams
): NewsvendorResult {
    const criticalRatio = calculateCriticalRatio(params);

    // Find Q* using CDF
    let Q = 0;
    let cumulativeProbability = 0;

    // Safety limit to prevent infinite loops
    // Use lambda or r/p to estimate mean for safety limit
    const estimatedMean = distribution.type === 'poisson'
        ? (distribution.lambda || 10)
        : (distribution.r && distribution.p ? (distribution.r * (1 - distribution.p) / distribution.p) : 10);

    const maxIterations = Math.ceil(estimatedMean * 5) + 50;

    while (cumulativeProbability < criticalRatio && Q < maxIterations) {
        Q++;

        if (distribution.type === 'poisson') {
            cumulativeProbability = poissonCDF(Q, distribution.lambda || 0);
        } else {
            cumulativeProbability = negativeBinomialCDF(Q, distribution.r || 1, distribution.p || 0.5);
        }
    }

    return {
        optimalQuantity: Q,
        criticalRatio,
        costUnderage: params.sellingPrice - params.unitCost,
        costOverage: params.unitCost + params.disposalCost,
        serviceLevelTarget: criticalRatio
    };
}
