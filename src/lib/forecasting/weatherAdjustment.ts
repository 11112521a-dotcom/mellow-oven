import { CleanedSalesData } from './dataRetrieval';

export type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'storm';

export interface WeatherImpact {
    sunny: number;
    cloudy: number;
    rain: number;
    storm: number;
}

/**
 * STEP 3: Calculate weather impact coefficients for specific market
 * Uses historical data to determine how weather affects sales
 * If product-specific data is insufficient (< 3 records), falls back to market-level learned factors or defaults
 */
export function calculateWeatherImpact(
    data: CleanedSalesData[],
    marketWeatherFactors?: Record<string, number>
): WeatherImpact {
    const DEFAULT_WEATHER_FACTORS: Record<WeatherCondition, number> = {
        sunny: 1.0,
        cloudy: 0.90,
        rain: 0.60,
        storm: 0.05
    };

    // Group sales by weather condition
    const weatherGroups = data.reduce((acc, sale) => {
        const weather = (sale.weatherCondition || 'sunny') as WeatherCondition;
        if (!acc[weather]) acc[weather] = [];
        acc[weather].push(sale.qtyCleaned);
        return acc;
    }, {} as Record<WeatherCondition, number[]>);

    // Calculate average for each weather condition
    const weatherAvg: Partial<Record<WeatherCondition, number>> = {};
    Object.keys(weatherGroups).forEach(weather => {
        const quantities = weatherGroups[weather as WeatherCondition] || [];
        if (quantities.length > 0) {
            weatherAvg[weather as WeatherCondition] =
                quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
        }
    });

    // Use sunny as baseline (or most common weather if sunny not available)
    const sunnyAvg = weatherAvg.sunny || 0;
    const allQuantities = Object.values(weatherGroups).flat();
    const overallAvg = allQuantities.length > 0 ? allQuantities.reduce((a, b) => a + b, 0) / allQuantities.length : 1;
    const baseline = sunnyAvg > 0 ? sunnyAvg : (overallAvg > 0 ? overallAvg : 1);

    const getFactorForCondition = (condition: WeatherCondition): number => {
        const group = weatherGroups[condition];
        // If we have at least 3 records for this product in this weather condition, compute dynamically
        if (group && group.length >= 3 && weatherAvg[condition] !== undefined) {
            return weatherAvg[condition]! / baseline;
        }
        // Fall back to market profile learned factors or default system factors
        return marketWeatherFactors?.[condition] ?? DEFAULT_WEATHER_FACTORS[condition];
    };

    return {
        sunny: 1.0, // Sunny is always baseline (1.0)
        cloudy: getFactorForCondition('cloudy'),
        rain: getFactorForCondition('rain'),
        storm: getFactorForCondition('storm')
    };
}

/**
 * Apply weather adjustment to baseline forecast
 */
export function applyWeatherAdjustment(
    baselineForecast: number,
    weatherForecast: WeatherCondition,
    weatherImpact: WeatherImpact
): number {
    const adjustmentFactor = weatherImpact[weatherForecast] || 1.0;
    return baselineForecast * adjustmentFactor;
}
