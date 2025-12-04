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
 */
export function calculateWeatherImpact(
    data: CleanedSalesData[]
): WeatherImpact {
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
        const quantities = weatherGroups[weather as WeatherCondition];
        weatherAvg[weather as WeatherCondition] =
            quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
    });

    // Use sunny as baseline (or most common weather if sunny not available)
    const baseline = weatherAvg.sunny || Object.values(weatherAvg)[0] || 1;

    return {
        sunny: 1.0, // Baseline
        cloudy: (weatherAvg.cloudy || baseline) / baseline,
        rain: (weatherAvg.rain || baseline) / baseline,
        storm: (weatherAvg.storm || baseline) / baseline
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
