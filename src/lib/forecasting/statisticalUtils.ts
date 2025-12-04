// Statistical utility functions for forecasting

/**
 * Calculate factorial (n!)
 */
export function factorial(n: number): number {
    if (n === 0 || n === 1) return 1;
    if (n < 0) return 0;

    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

/**
 * Poisson Probability Mass Function: P(X = k)
 * P(X = k) = (λ^k × e^(-λ)) / k!
 */
export function poissonPMF(k: number, lambda: number): number {
    if (k < 0 || lambda <= 0) return 0;
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

/**
 * Poisson Cumulative Distribution Function: P(X ≤ k)
 */
export function poissonCDF(k: number, lambda: number): number {
    if (k < 0) return 0;
    if (lambda <= 0) return 1;

    let cdf = 0;
    const maxK = Math.min(k, Math.floor(lambda + 10 * Math.sqrt(lambda)));

    for (let i = 0; i <= maxK; i++) {
        cdf += poissonPMF(i, lambda);
    }

    return Math.min(cdf, 1);
}

/**
 * Calculate Interquartile Range (IQR) and detect outliers
 */
export function calculateIQR(data: number[]): {
    Q1: number;
    Q3: number;
    IQR: number;
    median: number;
    lowerBound: number;
    upperBound: number;
} {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;

    const Q1 = sorted[Math.floor(n * 0.25)];
    const Q3 = sorted[Math.floor(n * 0.75)];
    const median = sorted[Math.floor(n * 0.5)];
    const IQR = Q3 - Q1;

    return {
        Q1,
        Q3,
        IQR,
        median,
        lowerBound: Q1 - 1.5 * IQR,
        upperBound: Q3 + 1.5 * IQR
    };
}

/**
 * Remove outliers using IQR method
 */
export function removeOutliers(data: number[]): {
    cleaned: number[];
    outliers: number[];
    stats: ReturnType<typeof calculateIQR>;
} {
    const stats = calculateIQR(data);
    const cleaned: number[] = [];
    const outliers: number[] = [];

    data.forEach(value => {
        if (value >= stats.lowerBound && value <= stats.upperBound) {
            cleaned.push(value);
        } else {
            outliers.push(value);
        }
    });

    return { cleaned, outliers, stats };
}

/**
 * Calculate time-decay weight for exponential smoothing
 * w_i = exp(-α × days_ago)
 */
export function timeDecayWeight(daysAgo: number, decayRate: number = 0.05): number {
    return Math.exp(-decayRate * daysAgo);
}

/**
 * Calculate weighted average with time decay
 */
export function weightedMovingAverage(
    values: number[],
    daysAgo: number[],
    decayRate: number = 0.05
): number {
    if (values.length === 0 || values.length !== daysAgo.length) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (let i = 0; i < values.length; i++) {
        const weight = timeDecayWeight(daysAgo[i], decayRate);
        weightedSum += values[i] * weight;
        totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(data: number[]): number {
    if (data.length === 0) return 0;

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;

    return Math.sqrt(variance);
}
