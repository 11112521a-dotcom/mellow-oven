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

/**
 * Calculate Mean
 */
export function calculateMean(data: number[]): number {
    if (data.length === 0) return 0;
    return data.reduce((sum, val) => sum + val, 0) / data.length;
}

/**
 * Calculate Variance
 */
export function calculateVariance(data: number[]): number {
    if (data.length === 0) return 0;
    const mean = calculateMean(data);
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
}

/**
 * Gamma Function (Approximation using Lanczos approximation)
 * Needed for Negative Binomial calculations
 */
function gamma(z: number): number {
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    let x = 0.99999999999980993;
    const c = [
        676.5203681218851, -1259.1392167224028, 771.32342877765313,
        -176.61502916214059, 12.507343278686905, -0.13857109526572012,
        9.9843695780195716e-6, 1.5056327351493116e-7
    ];
    for (let i = 0; i < c.length; i++) {
        x += c[i] / (z + i + 1);
    }
    const t = z + c.length - 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/**
 * Log Gamma Function
 */
function logGamma(z: number): number {
    return Math.log(gamma(z));
}

/**
 * Negative Binomial Probability Mass Function
 * P(X = k) = Gamma(k + r) / (k! * Gamma(r)) * p^r * (1-p)^k
 */
export function negativeBinomialPMF(k: number, r: number, p: number): number {
    if (k < 0) return 0;
    // Use log-gamma to avoid overflow with large factorials
    const logProb = logGamma(k + r) - logGamma(k + 1) - logGamma(r) +
        r * Math.log(p) + k * Math.log(1 - p);
    return Math.exp(logProb);
}

/**
 * Negative Binomial Cumulative Distribution Function
 */
export function negativeBinomialCDF(k: number, r: number, p: number): number {
    if (k < 0) return 0;
    let cdf = 0;
    for (let i = 0; i <= k; i++) {
        cdf += negativeBinomialPMF(i, r, p);
    }
    return Math.min(cdf, 1);
}

/**
 * Holt-Winters Triple Exponential Smoothing (Additive)
 * Level (L), Trend (T), Seasonality (S)
 */
export function holtWinters(
    data: number[],
    seasonLength: number = 7,
    alpha: number = 0.2, // Level smoothing
    beta: number = 0.1,  // Trend smoothing
    gamma: number = 0.1  // Seasonality smoothing
): number {
    if (data.length < seasonLength * 2) {
        // Fallback to simple average if not enough data for 2 seasons
        return calculateMean(data);
    }

    const n = data.length;
    let L = calculateMean(data.slice(0, seasonLength)); // Initial Level
    let T = (calculateMean(data.slice(seasonLength, seasonLength * 2)) - calculateMean(data.slice(0, seasonLength))) / seasonLength; // Initial Trend

    // Initial Seasonality Indices
    const S: number[] = [];
    for (let i = 0; i < seasonLength; i++) {
        S.push(data[i] - L);
    }

    // Iterative Smoothing
    for (let i = seasonLength; i < n; i++) {
        const lastL = L;
        const lastT = T;
        const seasonIdx = i % seasonLength;
        const lastS = S[seasonIdx];

        // Update Level
        L = alpha * (data[i] - lastS) + (1 - alpha) * (lastL + lastT);

        // Update Trend
        T = beta * (L - lastL) + (1 - beta) * lastT;

        // Update Seasonality
        S[seasonIdx] = gamma * (data[i] - L) + (1 - gamma) * lastS;
    }

    // Forecast for next period (m=1)
    const nextSeasonIdx = n % seasonLength;
    const forecast = L + T + S[nextSeasonIdx];

    return Math.max(0, forecast); // Ensure non-negative
}
