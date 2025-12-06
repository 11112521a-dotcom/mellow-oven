import React from 'react';
import { formatCurrency } from '@/src/lib/utils';
import { Sun, Cloud, CloudRain, CloudLightning, HelpCircle } from 'lucide-react';

interface WeatherData {
    condition: string;
    revenue: number;
    profit: number;
    quantity: number;
    days: number;
}

interface WeatherAnalysisProps {
    data: WeatherData[];
}

const weatherIcons: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    'sunny': { icon: <Sun size={24} />, color: 'text-yellow-500', bg: 'from-yellow-100 to-orange-50' },
    'cloudy': { icon: <Cloud size={24} />, color: 'text-gray-500', bg: 'from-gray-100 to-slate-50' },
    'rain': { icon: <CloudRain size={24} />, color: 'text-blue-500', bg: 'from-blue-100 to-cyan-50' },
    'storm': { icon: <CloudLightning size={24} />, color: 'text-purple-500', bg: 'from-purple-100 to-violet-50' },
};

const weatherLabels: Record<string, string> = {
    'sunny': 'แดดออก ☀️',
    'cloudy': 'มีเมฆ ☁️',
    'rain': 'ฝนตก 🌧️',
    'storm': 'พายุ ⛈️',
};

export const WeatherAnalysisCard: React.FC<WeatherAnalysisProps> = ({ data }) => {
    if (data.length === 0) {
        return (
            <div className="bg-gradient-to-br from-cafe-50 to-amber-50 rounded-2xl p-6 border border-cafe-100">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 bg-cafe-200 rounded-xl flex items-center justify-center">
                        <HelpCircle size={24} className="text-cafe-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-cafe-800">🌦️ Weather Analysis</h3>
                        <p className="text-xs text-cafe-500">ยังไม่มีข้อมูลสภาพอากาศ</p>
                    </div>
                </div>
                <p className="text-sm text-cafe-500 text-center py-4">
                    บันทึกสภาพอากาศในหน้าบันทึกยอดขายเพื่อดู insight
                </p>
            </div>
        );
    }

    // Find best and worst weather
    const sortedByRevenue = [...data].sort((a, b) => b.revenue - a.revenue);
    const bestWeather = sortedByRevenue[0];
    const worstWeather = sortedByRevenue[sortedByRevenue.length - 1];

    // Calculate average per day for each weather
    const avgData = data.map(d => ({
        ...d,
        avgRevenue: d.days > 0 ? d.revenue / d.days : 0,
        avgProfit: d.days > 0 ? d.profit / d.days : 0,
    }));

    const maxRevenue = Math.max(...data.map(d => d.revenue), 1);

    return (
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl overflow-hidden border border-sky-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-4 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            🌦️
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">สภาพอากาศ vs ยอดขาย</h3>
                            <p className="text-white/80 text-xs">Weather Impact Analysis</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
                {/* Weather Cards */}
                <div className="grid grid-cols-2 gap-3">
                    {avgData.map((weather) => {
                        const config = weatherIcons[weather.condition] || weatherIcons.sunny;
                        const isBest = weather.condition === bestWeather?.condition;
                        const isWorst = weather.condition === worstWeather?.condition && data.length > 1;
                        const barWidth = (weather.revenue / maxRevenue) * 100;

                        return (
                            <div
                                key={weather.condition}
                                className={`bg-gradient-to-br ${config.bg} rounded-xl p-3 border ${isBest ? 'border-green-300 ring-2 ring-green-200' : isWorst ? 'border-red-200' : 'border-white'}`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={config.color}>{config.icon}</span>
                                    <div className="flex-1">
                                        <span className="text-sm font-bold text-cafe-800">
                                            {weatherLabels[weather.condition] || weather.condition}
                                        </span>
                                        {isBest && <span className="ml-1 text-xs">🏆</span>}
                                    </div>
                                    <span className="text-xs text-cafe-500">{weather.days} วัน</span>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-2 bg-white/50 rounded-full overflow-hidden mb-2">
                                    <div
                                        className={`h-full rounded-full ${isBest ? 'bg-green-500' : isWorst ? 'bg-red-400' : 'bg-blue-400'}`}
                                        style={{ width: `${barWidth}%` }}
                                    />
                                </div>

                                <div className="flex justify-between text-xs">
                                    <span className="text-cafe-500">รายรับรวม</span>
                                    <span className="font-bold text-cafe-800">{formatCurrency(weather.revenue)}</span>
                                </div>
                                <div className="flex justify-between text-xs mt-1">
                                    <span className="text-cafe-500">เฉลี่ย/วัน</span>
                                    <span className="font-medium text-cafe-700">{formatCurrency(weather.avgRevenue)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Insight */}
                {bestWeather && worstWeather && bestWeather.condition !== worstWeather.condition && (
                    <div className="bg-sky-100 border border-sky-200 rounded-xl p-3 text-sm">
                        <span className="font-bold text-sky-700">💡 Insight: </span>
                        <span className="text-sky-800">
                            วัน{weatherLabels[bestWeather.condition]}ขายดีกว่าวัน{weatherLabels[worstWeather.condition]}
                            <strong className="text-green-600 ml-1">
                                {((bestWeather.revenue / Math.max(worstWeather.revenue, 1) - 1) * 100).toFixed(0)}%
                            </strong>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper function to get weather icon
export const getWeatherIcon = (condition?: string) => {
    switch (condition?.toLowerCase()) {
        case 'sunny': return <Sun size={14} className="text-yellow-500" />;
        case 'cloudy': return <Cloud size={14} className="text-gray-400" />;
        case 'rain': return <CloudRain size={14} className="text-blue-500" />;
        case 'storm': return <CloudLightning size={14} className="text-purple-500" />;
        default: return null;
    }
};
