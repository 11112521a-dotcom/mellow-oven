import React, { useState, useMemo } from 'react';
import { useStore } from '@/src/store';
import { calculateOptimalProduction, ForecastInput, ForecastOutput } from '@/src/lib/forecasting';
import { WeatherCondition } from '@/src/lib/forecasting/weatherAdjustment';
import { formatCurrency } from '@/src/lib/utils';
import { TrendingUp, Cloud, CloudRain, CloudSnow, Sun, Zap, AlertTriangle } from 'lucide-react';

export const ProductionPlannerDemo: React.FC = () => {
    const { products, markets, productSales } = useStore();

    const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
    const [selectedMarketId, setSelectedMarketId] = useState<string>(markets[0]?.id || '');
    const [weatherForecast, setWeatherForecast] = useState<WeatherCondition>('sunny');
    const [forecast, setForecast] = useState<ForecastOutput | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const selectedProduct = products.find(p => p.id === selectedProductId);
    const selectedMarket = markets.find(m => m.id === selectedMarketId);

    const handleCalculate = async () => {
        if (!selectedProduct) return;

        setIsCalculating(true);

        try {
            const input: ForecastInput = {
                marketId: selectedMarketId,
                marketName: selectedMarket?.name, // NEW: Fallback matching by name
                productId: selectedProductId,
                weatherForecast,
                product: selectedProduct,
                productSales
            };

            const result = await calculateOptimalProduction(input);
            setForecast(result);
        } catch (error) {
            console.error('Forecast calculation error:', error);
        } finally {
            setIsCalculating(false);
        }
    };

    const getWeatherIcon = (weather: WeatherCondition) => {
        switch (weather) {
            case 'sunny': return <Sun className="text-yellow-500" size={20} />;
            case 'cloudy': return <Cloud className="text-gray-500" size={20} />;
            case 'rain': return <CloudRain className="text-blue-500" size={20} />;
            case 'storm': return <CloudSnow className="text-purple-500" size={20} />;
        }
    };

    const getConfidenceBadge = (level: 'high' | 'medium' | 'low') => {
        const colors = {
            high: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            low: 'bg-red-100 text-red-800'
        };
        const stars = {
            high: '⭐⭐⭐',
            medium: '⭐⭐☆',
            low: '⭐☆☆'
        };

        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[level]}`}>
                {stars[level]} {level.toUpperCase()}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-2xl">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Zap size={28} />
                    🧬 Smart Production Planner (Demo)
                </h2>
                <p className="text-purple-100 mt-2">
                    AI-Powered Forecasting with Newsvendor Optimization
                </p>
            </div>

            {/* Input Panel */}
            <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-lg font-bold text-cafe-800 mb-4">📊 Input Parameters</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Product Selection */}
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-2">
                            🍰 Product
                        </label>
                        <select
                            value={selectedProductId}
                            onChange={(e) => setSelectedProductId(e.target.value)}
                            className="w-full p-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            {products.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (฿{p.price})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Market Selection */}
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-2">
                            🏪 Market
                        </label>
                        <select
                            value={selectedMarketId}
                            onChange={(e) => setSelectedMarketId(e.target.value)}
                            className="w-full p-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            {markets.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Weather Forecast */}
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-2">
                            🌤️ Weather Forecast
                        </label>
                        <select
                            value={weatherForecast}
                            onChange={(e) => setWeatherForecast(e.target.value as WeatherCondition)}
                            className="w-full p-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            <option value="sunny">☀️ Sunny</option>
                            <option value="cloudy">☁️ Cloudy</option>
                            <option value="rain">🌧️ Rain</option>
                            <option value="storm">⛈️ Storm</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleCalculate}
                    disabled={isCalculating}
                    className="mt-4 w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isCalculating ? '⏳ Calculating...' : '🚀 Calculate Optimal Production'}
                </button>
            </div>

            {/* Results Panel */}
            {forecast && (
                <div className="space-y-4">
                    {/* Main Result Card */}
                    <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-lg p-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-green-100 text-sm mb-1">Optimal Production Quantity</p>
                                <h1 className="text-6xl font-bold">{forecast.optimalQuantity}</h1>
                                <p className="text-green-100 mt-2">units recommended</p>
                            </div>
                            <div className="text-right">
                                {getConfidenceBadge(forecast.confidenceLevel)}
                                <p className="text-green-100 text-sm mt-2">
                                    Based on {forecast.dataPoints} data points
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Algorithm Breakdown */}
                    <div className="bg-white rounded-2xl shadow-md p-6">
                        <h3 className="text-lg font-bold text-cafe-800 mb-4">🔬 Algorithm Breakdown</h3>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                <span className="font-medium text-cafe-800">Step 1-2: Baseline Forecast</span>
                                <span className="text-blue-600 font-bold">{forecast.baselineForecast.toFixed(2)} units</span>
                            </div>


                            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                                <span className="font-medium text-cafe-800">Step 3: Weather Adjusted</span>
                                <span className="text-purple-600 font-bold">{forecast.weatherAdjustedForecast.toFixed(2)} units</span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                <span className="font-medium text-cafe-800">Step 4: Poisson λ (Lambda)</span>
                                <span className="text-green-600 font-bold">{forecast.lambda.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                                <span className="font-medium text-cafe-800">Step 5: Service Level Target</span>
                                <span className="text-orange-600 font-bold">{(forecast.serviceLevelTarget * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Risk & Economics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Risk Metrics */}
                        <div className="bg-white rounded-2xl shadow-md p-6">
                            <h3 className="text-lg font-bold text-cafe-800 mb-4">⚠️ Risk Assessment</h3>

                            <div className="space-y-3">
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-cafe-600">Stockout Probability</span>
                                        <span className="font-bold text-red-600">
                                            {isNaN(forecast.stockoutProbability) ? '0.0' : (forecast.stockoutProbability * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-red-500 h-2 rounded-full"
                                            style={{ width: `${forecast.stockoutProbability * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-cafe-600">Waste Probability</span>
                                        <span className="font-bold text-yellow-600">
                                            {isNaN(forecast.wasteProbability) ? '0.0' : (forecast.wasteProbability * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-yellow-500 h-2 rounded-full"
                                            style={{ width: `${forecast.wasteProbability * 100}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-cafe-50 rounded-lg">
                                    <p className="text-xs text-cafe-600 mb-1">Prediction Interval (80%)</p>
                                    <p className="font-bold text-cafe-800">
                                        {forecast.predictionInterval.lower} - {forecast.predictionInterval.upper} units
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Economic Metrics */}
                        <div className="bg-white rounded-2xl shadow-md p-6">
                            <h3 className="text-lg font-bold text-cafe-800 mb-4">💰 Economic Analysis</h3>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-cafe-600">Expected Demand:</span>
                                    <span className="font-medium">{forecast.economics.expectedDemand.toFixed(1)} units</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-cafe-600">Expected Sales:</span>
                                    <span className="font-medium">{forecast.economics.expectedSales.toFixed(1)} units</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-cafe-600">Expected Waste:</span>
                                    <span className="font-medium text-red-600">{forecast.economics.expectedWaste.toFixed(1)} units</span>
                                </div>

                                <hr className="my-3" />

                                <div className="flex justify-between text-sm">
                                    <span className="text-cafe-600">Expected Revenue:</span>
                                    <span className="font-bold text-green-600">
                                        {formatCurrency(forecast.economics.expectedRevenue)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-cafe-600">Expected Cost:</span>
                                    <span className="font-bold text-red-600">
                                        {formatCurrency(forecast.economics.expectedCost)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-cafe-600">Expected Profit:</span>
                                    <span className="font-bold text-purple-600">
                                        {formatCurrency(forecast.economics.expectedProfit)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Low Confidence Warning */}
                    {forecast.confidenceLevel === 'low' && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
                                <div>
                                    <h4 className="font-bold text-yellow-800">Low Confidence Warning</h4>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        This forecast is based on only {forecast.dataPoints} data points.
                                        For better accuracy, we recommend collecting more sales history for this market-product combination.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductionPlannerDemo;
