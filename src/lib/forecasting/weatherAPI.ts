// ============================================================
// 🌤️ Weather API Integration (Open-Meteo - Free, No API Key)
// Auto-fetch weather forecast for production planning
// ============================================================

export type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'storm';

export interface WeatherForecast {
    date: string;
    condition: WeatherCondition;
    temperature: number;
    precipitation: number; // mm
    humidity: number;
    description: string;
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

/**
 * Fetch weather forecast from Open-Meteo API
 * Free, no API key required, rate limit: generous
 */
export async function fetchWeatherForecast(
    date: string,
    location: LocationCoords | string = 'sisaket'
): Promise<WeatherForecast | null> {
    try {
        const coords = typeof location === 'string'
            ? THAI_LOCATIONS[location] || THAI_LOCATIONS['sisaket']
            : location;

        const targetDate = new Date(date);
        const today = new Date();
        const daysAhead = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Open-Meteo only forecasts up to 16 days ahead
        if (daysAhead > 16 || daysAhead < 0) {
            console.log('Date out of forecast range, using historical average');
            return null;
        }

        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&daily=weather_code,temperature_2m_max,precipitation_sum,relative_humidity_2m_mean&timezone=Asia%2FBangkok`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }

        const data = await response.json();

        // Find the correct day index
        const dateIndex = data.daily.time.findIndex((d: string) => d === date);
        if (dateIndex === -1) {
            return null;
        }

        const weatherCode = data.daily.weather_code[dateIndex];
        const temperature = data.daily.temperature_2m_max[dateIndex];
        const precipitation = data.daily.precipitation_sum[dateIndex];
        const humidity = data.daily.relative_humidity_2m_mean[dateIndex];

        // Convert WMO weather code to our conditions
        const condition = wmoCodeToCondition(weatherCode);
        const description = wmoCodeToDescription(weatherCode);

        return {
            date,
            condition,
            temperature,
            precipitation,
            humidity,
            description
        };
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        return null;
    }
}

/**
 * Convert WMO Weather Code to our simplified conditions
 * https://open-meteo.com/en/docs#weathervariables
 */
function wmoCodeToCondition(code: number): WeatherCondition {
    if (code <= 1) return 'sunny';      // Clear sky, mainly clear
    if (code <= 3) return 'cloudy';     // Partly cloudy, overcast
    if (code <= 49) return 'cloudy';    // Fog, depositing rime fog
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
        45: 'หมอก',
        48: 'หมอกเยือกแข็ง',
        51: 'ฝนปรอยเบา',
        53: 'ฝนปรอย',
        55: 'ฝนปรอยหนัก',
        61: 'ฝนเบา',
        63: 'ฝนปานกลาง',
        65: 'ฝนหนัก',
        80: 'ฝนกระหน่ำเบา',
        81: 'ฝนกระหน่ำ',
        82: 'ฝนกระหน่ำหนัก',
        95: 'พายุฝนฟ้าคะนอง',
        96: 'พายุฝนฟ้าคะนองและลูกเห็บเบา',
        99: 'พายุฝนฟ้าคะนองและลูกเห็บหนัก'
    };
    return descriptions[code] || 'ไม่ทราบ';
}

/**
 * Get weather adjustment factor for forecasting
 */
export function getWeatherFactor(condition: WeatherCondition): number {
    const factors: Record<WeatherCondition, number> = {
        'sunny': 1.0,      // Baseline
        'cloudy': 0.90,    // Slightly lower
        'rain': 0.60,      // Significant drop (User: "Not many people")
        'storm': 0.05      // User: "Don't go selling" (Essentially zero)
    };
    return factors[condition] || 1.0;
}

/**
 * Get weather emoji for display
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
    getWeatherFactor,
    getWeatherEmoji,
    THAI_LOCATIONS
};
