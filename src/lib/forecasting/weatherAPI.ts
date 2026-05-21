// ============================================================
// 🌤️ Ensemble Weather API Integration (Open-Meteo + MET Norway + Local Climate Baseline)
// Auto-fetch and resolve weather forecasts using statistical consensus
// ============================================================

export type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'storm';

export interface SourceForecast {
    sourceName: string;
    condition: WeatherCondition;
    temperature: number;
    precipitation: number; // mm
    humidity: number;
    description: string;
}

export interface WeatherForecast {
    date: string;
    condition: WeatherCondition;      // Ensemble Consensus
    temperature: number;            // Consensus Weighted Average
    precipitation: number;          // Consensus Weighted Average
    humidity: number;               // Consensus Weighted Average
    description: string;            // Consensus Description
    consensusAgreement: number;     // Percentage of source agreement (e.g. 67% or 100%)
    sources: SourceForecast[];       // Individual source data for UI tooltip
}

export interface LocationCoords {
    latitude: number;
    longitude: number;
    name: string;
}

// Preset locations for Thailand
export const THAI_LOCATIONS: Record<string, LocationCoords> = {
    'sisaket': { latitude: 15.1186, longitude: 104.3220, name: 'ศรีสะเกษ' },
    'bangkok': { latitude: 13.7563, longitude: 100.5018, name: 'กรุงเทพฯ' },
    'chiangmai': { latitude: 18.7883, longitude: 98.9853, name: 'เชียงใหม่' },
    'khonkaen': { latitude: 16.4419, longitude: 102.8360, name: 'ขอนแก่น' },
    'udonthani': { latitude: 17.4156, longitude: 102.7872, name: 'อุดรธานี' },
    'ubon': { latitude: 15.2448, longitude: 104.8473, name: 'อุบลราชธานี' },
    'nakhonratchasima': { latitude: 14.9799, longitude: 102.0978, name: 'นครราชสีมา' },
};

interface ClimateBaseline {
    condition: WeatherCondition;
    temperature: number;
    precipitation: number;
    humidity: number;
    description: string;
}

// Monthly climate baselines for Sisaket/Thailand (Historical database for robust fallback)
export const CLIMATE_BASELINES: Record<string, Record<number, ClimateBaseline>> = {
    'sisaket': {
        0: { condition: 'sunny', temperature: 31.0, precipitation: 0.1, humidity: 60, description: 'สถิติเฉลี่ย: อากาศเย็นและแห้งแล้ง' }, // Jan
        1: { condition: 'sunny', temperature: 33.0, precipitation: 0.3, humidity: 62, description: 'สถิติเฉลี่ย: ปลายหนาวเริ่มร้อน' }, // Feb
        2: { condition: 'sunny', temperature: 36.0, precipitation: 0.8, humidity: 60, description: 'สถิติเฉลี่ย: ฤดูร้อน อากาศร้อนจัด' }, // Mar
        3: { condition: 'sunny', temperature: 37.0, precipitation: 1.5, humidity: 62, description: 'สถิติเฉลี่ย: ฤดูร้อน แห้งแล้งจัด' }, // Apr
        4: { condition: 'rain', temperature: 34.0, precipitation: 4.5, humidity: 72, description: 'สถิติเฉลี่ย: เริ่มฤดูฝน มีฝนฟ้าคะนองบางพื้นที่' }, // May
        5: { condition: 'rain', temperature: 33.0, precipitation: 5.0, humidity: 75, description: 'สถิติเฉลี่ย: ฤดูฝน ตกชุกบางช่วง' }, // Jun
        6: { condition: 'rain', temperature: 32.0, precipitation: 5.5, humidity: 78, description: 'สถิติเฉลี่ย: ฤดูฝน ตกชุกหนาแน่น' }, // Jul
        7: { condition: 'rain', temperature: 31.0, precipitation: 6.5, humidity: 82, description: 'สถิติเฉลี่ย: ฤดูฝน ตกชุกหนาแน่นสูง' }, // Aug
        8: { condition: 'storm', temperature: 31.0, precipitation: 8.0, humidity: 85, description: 'สถิติเฉลี่ย: ชุกที่สุดของปี ระวังพายุฝน' }, // Sep
        9: { condition: 'rain', temperature: 31.0, precipitation: 3.0, humidity: 75, description: 'สถิติเฉลี่ย: ปลายฝนต้นหนาว' }, // Oct
        10: { condition: 'sunny', temperature: 31.0, precipitation: 0.5, humidity: 65, description: 'สถิติเฉลี่ย: เริ่มต้นฤดูหนาว อากาศเย็น' }, // Nov
        11: { condition: 'sunny', temperature: 30.0, precipitation: 0.1, humidity: 62, description: 'สถิติเฉลี่ย: ฤดูหนาว อากาศเย็นสบาย' }  // Dec
    }
};

// SAFETY: Simple in-memory cache for weather data
const weatherCache: Map<string, WeatherForecast> = new Map();

/**
 * Fetch monthly climate baseline for Thailand locations
 */
export function getLocalClimateBaseline(date: string, locationKey: string = 'sisaket'): ClimateBaseline {
    const targetDate = new Date(date);
    const month = targetDate.getMonth(); // 0-11
    const baselineSet = CLIMATE_BASELINES[locationKey] || CLIMATE_BASELINES['sisaket'];
    return baselineSet[month];
}

/**
 * Fetch forecast from Open-Meteo API
 */
async function fetchOpenMeteoForecast(
    date: string,
    coords: LocationCoords
): Promise<Omit<SourceForecast, 'sourceName'> | null> {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&daily=weather_code,temperature_2m_max,precipitation_sum,relative_humidity_2m_mean&timezone=Asia%2FBangkok`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Open-Meteo status: ${response.status}`);
        }
        
        const data = await response.json();
        const dateIndex = data.daily.time.findIndex((d: string) => d === date);
        
        if (dateIndex === -1) {
            return null;
        }
        
        const weatherCode = data.daily.weather_code[dateIndex];
        const temperature = data.daily.temperature_2m_max[dateIndex];
        const precipitation = data.daily.precipitation_sum[dateIndex];
        const humidity = data.daily.relative_humidity_2m_mean[dateIndex];
        
        const condition = wmoCodeToCondition(weatherCode);
        const description = wmoCodeToDescription(weatherCode);
        
        return {
            condition,
            temperature,
            precipitation,
            humidity,
            description
        };
    } catch (error) {
        console.warn('[Weather] Open-Meteo API failed:', error);
        return null;
    }
}

/**
 * Fetch forecast from MET Norway (yr.no) compact API
 */
async function fetchMetNorwayForecast(
    date: string,
    coords: LocationCoords
): Promise<Omit<SourceForecast, 'sourceName'> | null> {
    try {
        const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${coords.latitude}&lon=${coords.longitude}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                // MET Norway requests unique identifier to prevent aggressive rate limiting
                'User-Agent': 'MellowOvenForecast/1.0 (contact@mellowoven.com)'
            }
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`MET Norway status: ${response.status}`);
        }
        
        const data = await response.json();
        const timeseries = data.properties.timeseries;
        
        // Filter entries for the target date
        const dayEntries = timeseries.filter((item: any) => item.time.startsWith(date));
        
        if (dayEntries.length === 0) {
            return null;
        }
        
        // Find entry closest to 12:00 PM local time (05:00 UTC)
        let middayEntry = dayEntries.find((item: any) => item.time.includes('T05:00:00Z') || item.time.includes('T06:00:00Z'));
        if (!middayEntry) {
            middayEntry = dayEntries[Math.floor(dayEntries.length / 2)];
        }
        
        const details = middayEntry.data.instant.details;
        const temperature = details.air_temperature ?? 30;
        const humidity = details.relative_humidity ?? 70;
        
        // Extract max precipitation predicted for that date
        const precipValues = dayEntries.map((item: any) => {
            const next1 = item.data.next_1_hours?.details?.precipitation_amount;
            const next6 = item.data.next_6_hours?.details?.precipitation_amount;
            return next1 ?? next6 ?? 0;
        });
        const precipitation = Math.max(...precipValues, 0);
        
        // Determine symbol code
        const symbolCode = middayEntry.data.next_12_hours?.summary?.symbol_code ??
                           middayEntry.data.next_6_hours?.summary?.symbol_code ??
                           'clearsky_day';
                           
        const condition = metNorwaySymbolToCondition(symbolCode);
        const description = metNorwaySymbolToDescription(symbolCode);
        
        return {
            condition,
            temperature,
            precipitation,
            humidity,
            description
        };
    } catch (error) {
        console.warn('[Weather] MET Norway API failed:', error);
        return null;
    }
}

function metNorwaySymbolToCondition(symbol: string): WeatherCondition {
    const s = symbol.toLowerCase();
    if (s.includes('thunder') || s.includes('storm') || s.includes('heavyrain')) {
        return 'storm';
    }
    if (s.includes('rain') || s.includes('sleet') || s.includes('snow') || s.includes('shower')) {
        return 'rain';
    }
    if (s.includes('cloud') || s.includes('fog') || s.includes('overcast')) {
        return 'cloudy';
    }
    return 'sunny';
}

function metNorwaySymbolToDescription(symbol: string): string {
    const s = symbol.toLowerCase();
    if (s.includes('thunder') || s.includes('storm')) return 'พายุฝนฟ้าคะนอง';
    if (s.includes('heavyrain')) return 'ฝนตกหนักมาก';
    if (s.includes('lightrain')) return 'ฝนตกเบาบาง';
    if (s.includes('rain')) return 'ฝนตก';
    if (s.includes('sleet')) return 'ฝนปนหิมะ';
    if (s.includes('snow')) return 'หิมะตก';
    if (s.includes('heavycloud') || s.includes('overcast')) return 'เมฆครึ้ม';
    if (s.includes('partlycloudy')) return 'เมฆบางส่วน';
    if (s.includes('cloudy')) return 'มีเมฆมาก';
    if (s.includes('fair')) return 'ท้องฟ้าโปร่งบางส่วน';
    if (s.includes('clearsky')) return 'ท้องฟ้าแจ่มใส';
    return 'สภาพอากาศปกติ';
}

/**
 * Fetch and aggregate weather forecasts from multiple sources
 * Free, no API keys, auto-failover, consensus-decision model
 */
export async function fetchWeatherForecast(
    date: string,
    location: LocationCoords | string = 'sisaket'
): Promise<WeatherForecast | null> {
    const locationKey = typeof location === 'string' ? location : 'sisaket';
    const coords = typeof location === 'string'
        ? THAI_LOCATIONS[location] || THAI_LOCATIONS['sisaket']
        : location;

    const cacheKey = `${date}_${coords.name}`;

    // 1. Check Cache first
    const cached = weatherCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        const targetDate = new Date(date);
        const today = new Date();
        // Reset time to construct daysAhead calculation reliably
        const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const daysAhead = Math.ceil((targetMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

        // Get local climate baseline (always available virtual source)
        const localBaseline = getLocalClimateBaseline(date, locationKey);
        const localSource: SourceForecast = {
            sourceName: 'สถิติภูมิอากาศท้องถิ่น (Sisaket Baseline)',
            condition: localBaseline.condition,
            temperature: localBaseline.temperature,
            precipitation: localBaseline.precipitation,
            humidity: localBaseline.humidity,
            description: localBaseline.description
        };

        const sources: SourceForecast[] = [];

        // Check if query is in range for live forecast APIs (Open-Meteo/MET Norway support up to 14-16 days)
        const canFetchLive = daysAhead >= 0 && daysAhead <= 15;

        if (canFetchLive) {
            // Call live APIs in parallel
            const [openMeteoResult, metNorwayResult] = await Promise.allSettled([
                fetchOpenMeteoForecast(date, coords),
                fetchMetNorwayForecast(date, coords)
            ]);

            if (openMeteoResult.status === 'fulfilled' && openMeteoResult.value) {
                sources.push({
                    sourceName: 'Open-Meteo API',
                    ...openMeteoResult.value
                });
            }

            if (metNorwayResult.status === 'fulfilled' && metNorwayResult.value) {
                sources.push({
                    sourceName: 'MET Norway (yr.no)',
                    ...metNorwayResult.value
                });
            }
        }

        // Always merge with historical baseline as the 3rd source anchor (or 1st fallback if offline)
        sources.push(localSource);

        // -------------------------------------------------------------
        // STATISTICAL ENSEMBLE DECISION CORE
        // -------------------------------------------------------------
        
        // Define credibility weights
        const weights: Record<string, number> = {
            'Open-Meteo API': 0.40,
            'MET Norway (yr.no)': 0.40,
            'สถิติภูมิอากาศท้องถิ่น (Sisaket Baseline)': 0.20
        };

        // A. Voting for the Condition
        const votes: Record<WeatherCondition, number> = {
            'sunny': 0,
            'cloudy': 0,
            'rain': 0,
            'storm': 0
        };

        sources.forEach(src => {
            const weight = weights[src.sourceName] ?? 0.20;
            votes[src.condition] += weight;
        });

        // Determine winning condition (ties default to worst case for sell-out safety)
        const conditionPriority: WeatherCondition[] = ['storm', 'rain', 'cloudy', 'sunny'];
        let winningCondition: WeatherCondition = 'sunny';
        let maxScore = -1;

        conditionPriority.forEach(cond => {
            const score = votes[cond];
            if (score > maxScore) {
                maxScore = score;
                winningCondition = cond;
            }
        });

        // Calculate consensus agreement percentage
        const agreeingSources = sources.filter(src => src.condition === winningCondition).length;
        const consensusAgreement = Math.round((agreeingSources / sources.length) * 100);

        // B. Weighted Average for temperature, precipitation, and humidity
        let sumTemp = 0;
        let sumPrecip = 0;
        let sumHum = 0;
        let sumWeight = 0;

        sources.forEach(src => {
            const weight = weights[src.sourceName] ?? 0.20;
            sumTemp += src.temperature * weight;
            sumPrecip += src.precipitation * weight;
            sumHum += src.humidity * weight;
            sumWeight += weight;
        });

        const consensusTemp = Math.round((sumTemp / sumWeight) * 10) / 10;
        const consensusPrecip = Math.round((sumPrecip / sumWeight) * 10) / 10;
        const consensusHum = Math.round(sumHum / sumWeight);

        // C. Synthesize description
        let consensusDescription = '';
        const primaryLiveSource = sources.find(src => src.sourceName !== 'สถิติภูมิอากาศท้องถิ่น (Sisaket Baseline)' && src.condition === winningCondition);
        if (primaryLiveSource) {
            consensusDescription = primaryLiveSource.description;
        } else {
            // Fallback description templates
            if (winningCondition === 'sunny') {
                consensusDescription = consensusTemp > 35 ? 'ฟ้าใส อากาศร้อนจัด' : 'ท้องฟ้าแจ่มใส';
            } else if (winningCondition === 'cloudy') {
                consensusDescription = 'มีเมฆมากครึ้มฟ้าครึ้มฝน';
            } else if (winningCondition === 'rain') {
                consensusDescription = `มีโอกาสเกิดฝนตกเฉลี่ย (${consensusPrecip} มม.)`;
            } else {
                consensusDescription = `ระวังพายุฝนฟ้าคะนองตกหนัก (${consensusPrecip} มม.)`;
            }
        }

        const ensembleForecast: WeatherForecast = {
            date,
            condition: winningCondition,
            temperature: consensusTemp,
            precipitation: consensusPrecip,
            humidity: consensusHum,
            description: consensusDescription,
            consensusAgreement,
            sources
        };

        weatherCache.set(cacheKey, ensembleForecast);
        return ensembleForecast;

    } catch (error) {
        console.error('[Weather] Ensemble calculation failed, using absolute default:', error);
        return getDefaultWeather(date);
    }
}

/**
 * DEFAULT FALLBACK Weather structure
 */
function getDefaultWeather(date: string): WeatherForecast {
    const baseline = getLocalClimateBaseline(date, 'sisaket');
    const defaultSource: SourceForecast = {
        sourceName: 'สถิติภูมิอากาศท้องถิ่น (Sisaket Baseline)',
        condition: baseline.condition,
        temperature: baseline.temperature,
        precipitation: baseline.precipitation,
        humidity: baseline.humidity,
        description: baseline.description
    };

    return {
        date,
        condition: baseline.condition,
        temperature: baseline.temperature,
        precipitation: baseline.precipitation,
        humidity: baseline.humidity,
        description: 'ดึงข้อมูลพยากรณ์สดล้มเหลว (ใช้สถิติท้องถิ่นแทน)',
        consensusAgreement: 100,
        sources: [defaultSource]
    };
}

/**
 * Convert WMO Weather Code (Open-Meteo) to simplified conditions
 */
function wmoCodeToCondition(code: number): WeatherCondition {
    if (code <= 1) return 'sunny';      // Clear sky, mainly clear
    if (code <= 3) return 'cloudy';     // Partly cloudy, overcast
    if (code <= 49) return 'cloudy';    // Fog
    if (code <= 63) return 'rain';      // Slight/Moderate Rain
    if (code === 65) return 'storm';    // Heavy Rain -> Storm (User rule)
    if (code <= 69) return 'rain';      // Other rain
    if (code <= 80) return 'rain';      // Slight showers
    if (code <= 82) return 'storm';     // Violent showers -> Storm
    if (code <= 86) return 'rain';      // Snow showers
    if (code >= 95) return 'storm';     // Thunderstorm
    return 'cloudy';
}

function wmoCodeToDescription(code: number): string {
    const descriptions: Record<number, string> = {
        0: 'ฟ้าใส',
        1: 'ส่วนใหญ่แจ่มใส',
        2: 'มีเมฆบางส่วน',
        3: 'มีเมฆมาก',
        45: 'มีหมอกจัด',
        48: 'หมอกน้ำค้างแข็ง',
        51: 'ฝนปรอยเบา',
        53: 'ฝนปรอยปกติ',
        55: 'ฝนปรอยหนัก',
        61: 'ฝนตกเบา',
        63: 'ฝนตกปานกลาง',
        65: 'ฝนตกหนักมาก',
        80: 'ฝนกระหน่ำเบา',
        81: 'ฝนกระหน่ำปกติ',
        82: 'ฝนกระหน่ำรุนแรง',
        95: 'พายุฝนฟ้าคะนอง',
        96: 'พายุฝนฟ้าคะนองและลูกเห็บเบา',
        99: 'พายุฝนฟ้าคะนองฝนตกหนักมาก'
    };
    return descriptions[code] || 'ไม่ทราบสภาวะ';
}

/**
 * Get weather adjustment factor for sales forecasting multipliers
 */
export function getWeatherFactor(condition: WeatherCondition): number {
    const factors: Record<WeatherCondition, number> = {
        'sunny': 1.0,      // Baseline
        'cloudy': 0.90,    // Slightly lower
        'rain': 0.60,      // Significant drop (less foot traffic)
        'storm': 0.05      // Dangerous/heavy storms (essentially do not sell)
    };
    return factors[condition] || 1.0;
}

/**
 * Get emoji corresponding to condition
 */
export function getWeatherEmoji(condition: WeatherCondition): string {
    const emojis: Record<WeatherCondition, string> = {
        'sunny': '☀️',
        'cloudy': '☁️',
        'rain': '🌧️',
        'storm': '⛈️'
    };
    return emojis[condition] || '🌤️';
}

export default {
    fetchWeatherForecast,
    getLocalClimateBaseline,
    getWeatherFactor,
    getWeatherEmoji,
    THAI_LOCATIONS,
    CLIMATE_BASELINES
};
