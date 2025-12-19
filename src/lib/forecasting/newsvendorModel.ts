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
    if (denominator <= 0) return 0.5; // Default to 50% service level

    let cr = Cu / denominator;

    // FIX: Cap critical ratio at 0.90 for perishable goods
    // 99% was too aggressive and caused over-production
    // 90% means we accept 10% stockout risk to avoid excessive waste
    cr = Math.min(cr, 0.90);
    cr = Math.max(cr, 0.10);

    return cr;
}

/**
 * Find optimal quantity Q* using Newsvendor Model
 * Q* is the quantity where P(Demand ≤ Q*) >= Critical Ratio
 */
export function calculateOptimalQuantity(
    distribution: DistributionParams,
    params: NewsvendorParams
): NewsvendorResult {
    const criticalRatio = calculateCriticalRatio(params);

    // Find Q* using CDF
    let Q = 0;
    let cumulativeProbability = 0;

    // Estimate mean for safety limit
    const estimatedMean = distribution.type === 'poisson'
        ? (distribution.lambda || 10)
        : (distribution.r && distribution.p ? (distribution.r * (1 - distribution.p) / distribution.p) : 10);

    // FIX: More conservative max - 2x mean is plenty for perishable goods
    const maxQuantity = Math.ceil(estimatedMean * 2) + 5;

    while (cumulativeProbability < criticalRatio && Q < maxQuantity) {
        Q++;

        if (distribution.type === 'poisson') {
            cumulativeProbability = poissonCDF(Q, distribution.lambda || 0);
        } else {
            cumulativeProbability = negativeBinomialCDF(Q, distribution.r || 1, distribution.p || 0.5);
        }
    }

    // FIX: Sanity check - Q should never exceed 2x the mean
    if (Q > estimatedMean * 2) {
        Q = Math.ceil(estimatedMean * 1.2); // Fallback to 20% above mean
    }

    // Additional check: Q should not exceed mean + 2 standard deviations
    // For a simple estimate, use 1.5x mean as a reasonable upper bound
    const reasonableMax = Math.ceil(estimatedMean * 1.5);
    if (Q > reasonableMax && estimatedMean > 5) {
        Q = reasonableMax;
    }

    return {
        optimalQuantity: Math.max(1, Q), // Ensure at least 1
        criticalRatio,
        costUnderage: params.sellingPrice - params.unitCost,
        costOverage: params.unitCost + params.disposalCost,
        serviceLevelTarget: criticalRatio
    };
}

