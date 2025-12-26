import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '@/src/store';
import { calculateOptimalProduction } from '@/src/lib/forecasting';
import type { ForecastOutput } from '@/src/lib/forecasting';
import { Product, Variant } from '@/types';
import {
    calculateMenuMatrix,
    calculateDemandVariability
} from '@/src/lib/advancedAnalytics';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Cell,
    BarChart, Bar, Legend
} from 'recharts';
import { Save, Loader2, Calendar, CloudSun, Store, AlertTriangle, TrendingUp, Package, Target, ArrowUpRight, ArrowDownRight, Sparkles, ChevronDown } from 'lucide-react';

interface ForecastResult {
    productId: string;
    productName: string;
    forecast: ForecastOutput;
    error?: string;
}

export const ProductionPlanner: React.FC = () => {
    const { products, markets, saveForecast, productSales, dailyReports, productionForecasts } = useStore();
    const [activeTab, setActiveTab] = useState<'plan' | 'insights' | 'accuracy'>('plan');

    // State for Production Planner
    const [selectedDate, setSelectedDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });
    const [selectedWeather, setSelectedWeather] = useState<string>('sunny');
    const [selectedMarket, setSelectedMarket] = useState<string>(''); // Start empty, will sync with markets
    const [isCalculating, setIsCalculating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [results, setResults] = useState<ForecastResult[]>([]);

    const getMarketName = (marketId: string) => {
        return markets.find(m => m.id === marketId)?.name || marketId;
    };

    // Auto-select "all markets" when markets load (FIX: use empty string for all markets)
    useEffect(() => {
        if (markets.length > 0 && selectedMarket === undefined) {
            setSelectedMarket(''); // Default to "all markets"
        }
    }, [markets, selectedMarket]);

    // Analytics Calculations
    const analyticsData = useMemo(() => {
        if (activeTab !== 'insights') return null;

        const matrix = calculateMenuMatrix(products, productSales);
        const demandVariability = calculateDemandVariability(products, productSales);

        return { matrix, demandVariability };
    }, [activeTab, products, productSales]);

    // Accuracy Calculations
    const accuracyData = useMemo(() => {
        if (activeTab !== 'accuracy') return null;

        // 1. Group forecasts by date
        const forecastsByDate = productionForecasts.reduce((acc, f) => {
            if (!acc[f.forecastForDate]) acc[f.forecastForDate] = [];
            acc[f.forecastForDate].push(f);
            return acc;
        }, {} as Record<string, typeof productionForecasts>);

        // 2. Compare with actual sales
        const comparisons = Object.keys(forecastsByDate).map(date => {
            const forecasts = forecastsByDate[date];
            const sales = productSales.filter(s => s.saleDate === date);

            let totalForecastQty = 0;
            let totalActualQty = 0;
            let matchCount = 0;

            forecasts.forEach(f => {
                // FIX: Match by productId OR variantId (forecast productId could be either)
                const actual = sales.find(s =>
                    s.productId === f.productId ||
                    s.variantId === f.productId ||
                    s.productName === f.productName // Fallback to name match
                );
                if (actual) {
                    totalForecastQty += f.optimalQuantity;
                    totalActualQty += actual.quantitySold;
                    matchCount++;
                }
            });

            const accuracy = totalActualQty > 0 ? 1 - (Math.abs(totalForecastQty - totalActualQty) / totalActualQty) : 0;

            return {
                date,
                forecasts,
                sales,
                totalForecastQty,
                totalActualQty,
                accuracy: Math.max(0, accuracy * 100), // Ensure not negative
                matchCount
            };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Newest first

        // 3. Calculate overall summary
        const totalDays = comparisons.length;
        const daysWithData = comparisons.filter(c => c.matchCount > 0).length;
        const overallAccuracy = daysWithData > 0
            ? comparisons.filter(c => c.matchCount > 0).reduce((sum, c) => sum + c.accuracy, 0) / daysWithData
            : 0;
        const totalForecasts = comparisons.reduce((sum, c) => sum + c.forecasts.length, 0);

        return { comparisons, summary: { totalDays, daysWithData, overallAccuracy, totalForecasts } };
    }, [activeTab, productionForecasts, productSales]);

    // Auto-Calculate Logic
    const calculateForecasts = useCallback(async () => {
        if (products.length === 0) return;

        setIsCalculating(true);
        // Small delay to prevent UI flickering on fast inputs and allow loading state to show
        await new Promise(resolve => setTimeout(resolve, 300));

        const forecastResults: ForecastResult[] = [];
        const { productSales } = useStore.getState();

        const forecastItems: { id: string, name: string, product: Product, variant?: Variant }[] = [];
        products.forEach(p => {
            if (p.variants && p.variants.length > 0) {
                p.variants.forEach(v => {
                    forecastItems.push({ id: v.id, name: `${p.name} - ${v.name}`, product: p, variant: v });
                });
            } else {
                forecastItems.push({ id: p.id, name: p.name, product: p });
            }
        });

        for (const item of forecastItems) {
            try {
                const forecast = await calculateOptimalProduction({
                    productId: item.product.id,
                    variantId: item.variant?.id,
                    marketId: selectedMarket,
                    marketName: getMarketName(selectedMarket),
                    weatherForecast: selectedWeather as any,
                    product: item.variant ? { ...item.product, price: item.variant.price, cost: item.variant.cost } : item.product,
                    productSales: productSales,
                    targetDate: selectedDate // NEW: Pass target date for day-of-week matching
                });

                forecastResults.push({
                    productId: item.id,
                    productName: item.name,
                    forecast
                });
            } catch (error) {
                forecastResults.push({
                    productId: item.id,
                    productName: item.name,
                    forecast: {} as ForecastOutput,
                    error: error instanceof Error ? error.message : 'Calculation failed'
                });
            }
        }

        setResults(forecastResults);
        setIsCalculating(false);
    }, [products, selectedMarket, selectedWeather, selectedDate]); // Added dependencies

    // Trigger calculation on input change
    useEffect(() => {
        calculateForecasts();
    }, [calculateForecasts]);

    const handleSavePlan = async () => {
        setIsSaving(true);
        try {
            // Optimistic/Parallel Save: Fire all requests at once
            const savePromises = results
                .filter(result => !result.error)
                .map(result => saveForecast(
                    result.forecast,
                    result.productId,
                    result.productName,
                    selectedMarket,
                    getMarketName(selectedMarket),
                    selectedDate,
                    selectedWeather
                ));

            await Promise.all(savePromises);

            // Show success feedback
            alert('บันทึกแผนการผลิตเรียบร้อยแล้ว!');
        } catch (error) {
            console.error('Failed to save plan:', error);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        } finally {
            setIsSaving(false);
        }
    };

    const weatherOptions = [
        { value: 'sunny', label: '☀️ แดดจัด (Sunny)' },
        { value: 'cloudy', label: '☁️ เมฆมาก (Cloudy)' },
        { value: 'rain', label: '🌧️ ฝนตก (Rain)' },
        { value: 'storm', label: '⛈️ พายุ (Storm)' }
    ];

    const totalProfit = results
        .filter(r => !r.error)
        .reduce((sum, r) => sum + (r.forecast.expectedProfit || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header with Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-cafe-900">Production Planner</h2>
                    <p className="text-sm text-cafe-500">วางแผนการผลิตอัจฉริยะ</p>
                </div>

                <div className="flex bg-cafe-100 p-1 rounded-lg self-start md:self-auto overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('plan')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'plan' ? 'bg-white text-cafe-800 shadow-sm' : 'text-cafe-500 hover:text-cafe-800'}`}
                    >
                        📅 แผนการผลิต
                    </button>
                    <button
                        onClick={() => setActiveTab('insights')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'insights' ? 'bg-white text-cafe-800 shadow-sm' : 'text-cafe-500 hover:text-cafe-800'}`}
                    >
                        📊 ข้อมูลเชิงลึก
                    </button>
                    <button
                        onClick={() => setActiveTab('accuracy')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'accuracy' ? 'bg-white text-cafe-800 shadow-sm' : 'text-cafe-500 hover:text-cafe-800'}`}
                    >
                        🎯 ความแม่นยำ
                    </button>
                </div>
            </div>

            {activeTab === 'plan' ? (
                <div className="space-y-6">
                    {/* Controls Bar */}
                    <div className="bg-white p-4 rounded-xl border border-cafe-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between sticky top-4 z-10">
                        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400" size={18} />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-cafe-50 border border-cafe-200 rounded-lg text-sm focus:ring-2 focus:ring-cafe-500 outline-none w-full md:w-auto"
                                />
                            </div>
                            <div className="relative">
                                <CloudSun className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400" size={18} />
                                <select
                                    value={selectedWeather}
                                    onChange={(e) => setSelectedWeather(e.target.value)}
                                    className="pl-10 pr-8 py-2 bg-cafe-50 border border-cafe-200 rounded-lg text-sm focus:ring-2 focus:ring-cafe-500 outline-none appearance-none w-full md:w-auto"
                                >
                                    {weatherOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative">
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400" size={18} />
                                <select
                                    value={selectedMarket}
                                    onChange={(e) => setSelectedMarket(e.target.value)}
                                    className="pl-10 pr-8 py-2 bg-cafe-50 border border-cafe-200 rounded-lg text-sm focus:ring-2 focus:ring-cafe-500 outline-none appearance-none w-full md:w-auto"
                                >
                                    <option value="">🌐 ทุกตลาด (รวมทั้งหมด)</option>
                                    {markets.map(market => (
                                        <option key={market.id} value={market.id}>{market.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-right hidden md:block">
                                <p className="text-xs text-cafe-500">กำไรคาดการณ์</p>
                                <p className="text-lg font-bold text-green-600">฿{totalProfit.toLocaleString()}</p>
                            </div>
                            <button
                                onClick={handleSavePlan}
                                disabled={isSaving || isCalculating || results.length === 0}
                                className="flex items-center gap-2 px-6 py-2.5 bg-cafe-900 text-white rounded-lg hover:bg-cafe-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                <span>บันทึกแผน</span>
                            </button>
                        </div>
                    </div>

                    {/* AI Insight Panel - How AI Calculates */}
                    {results.length > 0 && !isCalculating && (
                        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px] rounded-2xl animate-gradient-shift">
                            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                                        <span className="text-white text-xl">🧠</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">AI วิเคราะห์จากข้อมูลเหล่านี้</h3>
                                        <p className="text-xs text-gray-500">Newsvendor Model + Holt-Winters Smoothing</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-blue-50 rounded-xl p-3 text-center">
                                        <p className="text-xs text-blue-600 mb-1">📅 {new Date(selectedDate).toLocaleDateString('th-TH', { weekday: 'short' })}</p>
                                        <p className="text-xl font-bold text-blue-700">
                                            {results[0]?.forecast.sameDayDataPoints || 0} <span className="text-sm font-normal">วัน</span>
                                        </p>
                                        <p className="text-[10px] text-blue-400 mt-1">
                                            (ทั้งหมด {results[0]?.forecast.dataPoints || 0} วัน)
                                        </p>
                                    </div>
                                    <div className="bg-orange-50 rounded-xl p-3 text-center">
                                        <p className="text-xs text-orange-600 mb-1">🔍 Outliers กรองออก</p>
                                        <p className="text-xl font-bold text-orange-700">
                                            {results[0]?.forecast.outliersRemoved || 0} <span className="text-sm font-normal">รายการ</span>
                                        </p>
                                    </div>
                                    <div className="bg-purple-50 rounded-xl p-3 text-center">
                                        <p className="text-xs text-purple-600 mb-1">🌤️ Weather Factor</p>
                                        <p className="text-xl font-bold text-purple-700">
                                            {selectedWeather === 'sunny' ? '☀️ 100%' :
                                                selectedWeather === 'cloudy' ? '☁️ ~90%' :
                                                    selectedWeather === 'rain' ? '🌧️ ~70%' : '⛈️ ~50%'}
                                        </p>
                                    </div>
                                    <div className="bg-green-50 rounded-xl p-3 text-center">
                                        <p className="text-xs text-green-600 mb-1">💰 Payday Boost</p>
                                        <p className="text-xl font-bold text-green-700">
                                            {new Date(selectedDate).getDate() >= 25 || new Date(selectedDate).getDate() <= 5 ? '+20%' : 'ปกติ'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-600">
                                    <p className="flex items-center gap-2">
                                        <span className="text-purple-500">💡</span>
                                        <span><strong>วิธีคำนวณ:</strong> ใช้ค่าเฉลี่ยยอดขาย{new Date(selectedDate).toLocaleDateString('th-TH', { weekday: 'long' })}ก่อนหน้า × สภาพอากาศ × Payday แล้วใช้ Newsvendor Model หาจำนวนที่เหมาะสม</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Results Grid - Premium Cards */}
                    {isCalculating ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {results.map((result) => (
                                <div
                                    key={result.productId}
                                    className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${result.error
                                        ? 'border-red-200 bg-gradient-to-br from-red-50 to-orange-50'
                                        : 'border-cafe-100 bg-gradient-to-br from-white to-cafe-50 hover:border-cafe-300'
                                        }`}
                                >
                                    {/* NEW: Minimal Premium Card Design */}
                                    <div className="p-5">
                                        {/* Header Row */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1">
                                                <h3 className={`font-bold text-lg ${result.error ? 'text-red-600' : 'text-gray-800'}`}>
                                                    {result.productName}
                                                </h3>
                                                {!result.error && !result.forecast.noData && (
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        {/* Confidence Badge with explanation */}
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${result.forecast.confidenceLevel === 'high' ? 'bg-emerald-100 text-emerald-700' :
                                                            result.forecast.confidenceLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                                                                result.forecast.confidenceLevel === 'none' ? 'bg-gray-100 text-gray-500' :
                                                                    'bg-red-100 text-red-600'
                                                            }`}>
                                                            {result.forecast.confidenceLevel === 'high'
                                                                ? `🎯 แม่นยำ (${result.forecast.sameDayDataPoints}+ วันเดียวกัน)`
                                                                : result.forecast.confidenceLevel === 'medium'
                                                                    ? `📊 ปานกลาง (ข้อมูล ${result.forecast.dataPoints} วัน)`
                                                                    : result.forecast.confidenceLevel === 'none'
                                                                        ? '❓ ไม่มีข้อมูล'
                                                                        : `⚠️ ต่ำ (ข้อมูลน้อย)`}
                                                        </span>
                                                        {/* Day count in full text */}
                                                        {result.forecast.sameDayDataPoints > 0 && (
                                                            <span className="text-xs text-gray-400">
                                                                อ้างอิง {result.forecast.sameDayDataPoints} {new Date(selectedDate).toLocaleDateString('th-TH', { weekday: 'long' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Big Number */}
                                            {!result.error && !result.forecast.noData && (
                                                <div className="text-right">
                                                    <p className="text-4xl font-black text-cafe-700">{result.forecast.optimalQuantity}</p>
                                                    <p className="text-xs text-gray-400">ชิ้น</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content based on state */}
                                        {result.error ? (
                                            <div className="flex items-center gap-2 text-red-500 text-sm p-3 bg-red-50 rounded-xl">
                                                <AlertTriangle size={16} />
                                                <span>{result.error}</span>
                                            </div>
                                        ) : result.forecast.noData ? (
                                            <div className="text-center py-6">
                                                <Package size={32} className="mx-auto text-gray-300 mb-2" />
                                                <p className="text-gray-400 text-sm">ยังไม่มีข้อมูลการขาย</p>
                                                <p className="text-xs text-gray-300 mt-1">บันทึกยอดขายก่อนเพื่อให้ AI วิเคราะห์</p>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Stats Row - 2 columns only */}
                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    <div className="text-center p-3 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl">
                                                        <p className="text-2xl font-bold text-rose-500">{isNaN(result.forecast.stockoutProbability) ? '0' : (result.forecast.stockoutProbability * 100).toFixed(0)}%</p>
                                                        <p className="text-xs text-rose-400">ขาด</p>
                                                    </div>
                                                    <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                                                        <p className="text-2xl font-bold text-amber-500">{isNaN(result.forecast.wasteProbability) ? '0' : (result.forecast.wasteProbability * 100).toFixed(0)}%</p>
                                                        <p className="text-xs text-amber-400">เหลือ</p>
                                                    </div>
                                                </div>

                                                {/* Range Indicator */}
                                                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                                                    <span>ช่วง: {result.forecast.predictionInterval.lower} - {result.forecast.predictionInterval.upper}</span>
                                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-500">
                                                        {result.forecast.distributionType === 'poisson' ? 'Poisson' : 'NB'}
                                                    </span>
                                                </div>

                                                {/* Expandable Details */}
                                                <details className="group">
                                                    <summary className="cursor-pointer text-xs text-cafe-400 hover:text-cafe-600 flex items-center gap-1">
                                                        <ChevronDown size={12} className="group-open:rotate-180 transition-transform" />
                                                        📊 วิธีคิด
                                                    </summary>
                                                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-2">
                                                        {/* Step 1: Baseline */}
                                                        <div className="p-2 bg-blue-50 rounded-lg">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-medium text-blue-700">1️⃣ ค่าเฉลี่ยยอดขาย</span>
                                                                <span className="font-bold text-blue-800">{result.forecast.baselineForecast.toFixed(1)} ชิ้น</span>
                                                            </div>
                                                            <p className="text-[10px] text-blue-500 mt-1">
                                                                = เฉลี่ยจาก {result.forecast.sameDayDataPoints > 0 ? `${result.forecast.sameDayDataPoints} วันเดียวกัน` : `${result.forecast.dataPoints} วัน`}
                                                            </p>
                                                        </div>

                                                        {/* Step 2: Weather */}
                                                        <div className="p-2 bg-purple-50 rounded-lg">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-medium text-purple-700">2️⃣ ปรับสภาพอากาศ</span>
                                                                <span className="font-bold text-purple-800">{result.forecast.weatherAdjustedForecast.toFixed(1)} ชิ้น</span>
                                                            </div>
                                                            <p className="text-[10px] text-purple-500 mt-1">
                                                                = {result.forecast.baselineForecast.toFixed(1)} × {(result.forecast.weatherAdjustedForecast / result.forecast.baselineForecast * 100).toFixed(0)}% (ตามสภาพอากาศ)
                                                            </p>
                                                        </div>

                                                        {/* Step 3: Lambda & Payday */}
                                                        <div className="p-2 bg-amber-50 rounded-lg">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-medium text-amber-700">3️⃣ ค่าเฉลี่ยสุดท้าย (λ)</span>
                                                                <span className="font-bold text-amber-800">{result.forecast.lambda.toFixed(1)} ชิ้น</span>
                                                            </div>
                                                            <p className="text-[10px] text-amber-500 mt-1">
                                                                = รวม Payday Boost (ถ้าใกล้สิ้นเดือน +20%)
                                                            </p>
                                                        </div>

                                                        {/* Step 4: Newsvendor */}
                                                        <div className="p-2 bg-emerald-50 rounded-lg">
                                                            <div className="flex justify-between items-center">
                                                                <span className="font-medium text-emerald-700">4️⃣ จำนวนที่เหมาะสม</span>
                                                                <span className="font-bold text-emerald-800">{result.forecast.optimalQuantity} ชิ้น</span>
                                                            </div>
                                                            <p className="text-[10px] text-emerald-500 mt-1">
                                                                = Newsvendor Model @ {(result.forecast.serviceLevelTarget * 100).toFixed(0)}% Service Level
                                                            </p>
                                                            <p className="text-[10px] text-emerald-400">
                                                                (เลือกจำนวนที่ลดโอกาสขาดสินค้าให้น้อยที่สุด)
                                                            </p>
                                                        </div>

                                                        {/* Summary */}
                                                        <div className="text-center text-[10px] text-gray-400 pt-1 border-t border-gray-100">
                                                            Distribution: {result.forecast.distributionType === 'poisson' ? 'Poisson' : 'Negative Binomial'} | ช่วง: {result.forecast.predictionInterval.lower}-{result.forecast.predictionInterval.upper}
                                                        </div>
                                                    </div>
                                                </details>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {results.length === 0 && !isCalculating && products.length > 0 && (
                        <div className="text-center py-12 text-cafe-400 bg-cafe-50 rounded-xl border-2 border-dashed border-cafe-200">
                            <Package size={48} className="mx-auto mb-4 opacity-50" />
                            <p>ไม่มีรายการเมนูให้คำนวณ</p>
                        </div>
                    )}
                </div>
            ) : activeTab === 'insights' ? (
                // Insights Tab Content
                <div className="space-y-6 animate-in fade-in">
                    {/* Menu Matrix - Full Width */}
                    <div className="bg-white border border-cafe-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-cafe-800 mb-2">📊 วิเคราะห์เมนู (Menu Engineering)</h3>
                                <p className="text-sm text-cafe-600 max-w-2xl">
                                    วิเคราะห์เมนูตามหลัก BCG Matrix โดยจำแนกสินค้าเป็น 4 กลุ่มตาม<strong>ยอดขาย (Popularity)</strong> และ <strong>กำไรต่อชิ้น (Profitability)</strong>
                                    เพื่อวางแผนการผลิตและปรับปรุงเมนูให้เหมาะสม
                                </p>
                            </div>
                            <div className="flex-shrink-0 bg-cafe-50 rounded-xl p-3 text-xs text-cafe-600 border border-cafe-100">
                                <div className="font-semibold mb-1">📈 เส้นประ = ค่าเฉลี่ย</div>
                                <div>X: ยอดขายรวม | Y: กำไร/ชิ้น</div>
                            </div>
                        </div>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis type="number" dataKey="soldQty" name="Sold Qty" unit=" pcs" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis type="number" dataKey="profitPerUnit" name="Profit" unit="฿" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white/90 backdrop-blur-sm p-3 border border-cafe-100 shadow-xl rounded-xl">
                                                        <p className="font-bold text-cafe-900 mb-1">{data.name}</p>
                                                        <div className="space-y-1 text-xs text-cafe-600">
                                                            <div className="flex justify-between gap-4">
                                                                <span>ยอดขาย:</span>
                                                                <span className="font-semibold">{data.soldQty} ชิ้น</span>
                                                            </div>
                                                            <div className="flex justify-between gap-4">
                                                                <span>กำไร/ชิ้น:</span>
                                                                <span className="font-semibold">฿{data.profitPerUnit}</span>
                                                            </div>
                                                            <div className={`mt-2 px-2 py-1 rounded text-center font-bold text-white ${data.class === 'Star' ? 'bg-green-500' :
                                                                data.class === 'Plowhorse' ? 'bg-yellow-500' :
                                                                    data.class === 'Puzzle' ? 'bg-blue-500' : 'bg-red-500'
                                                                }`}>
                                                                {data.class}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    {/* Quadrant Backgrounds */}
                                    <ReferenceArea x1={analyticsData?.matrix.thresholds.avgSold} y1={analyticsData?.matrix.thresholds.avgProfit} fill="#22c55e" fillOpacity={0.05} />
                                    <ReferenceArea x2={analyticsData?.matrix.thresholds.avgSold} y1={analyticsData?.matrix.thresholds.avgProfit} fill="#3b82f6" fillOpacity={0.05} />
                                    <ReferenceArea x1={analyticsData?.matrix.thresholds.avgSold} y2={analyticsData?.matrix.thresholds.avgProfit} fill="#eab308" fillOpacity={0.05} />
                                    <ReferenceArea x2={analyticsData?.matrix.thresholds.avgSold} y2={analyticsData?.matrix.thresholds.avgProfit} fill="#ef4444" fillOpacity={0.05} />

                                    {/* Threshold Lines */}
                                    <ReferenceLine x={analyticsData?.matrix.thresholds.avgSold} stroke="#9ca3af" strokeDasharray="3 3" />
                                    <ReferenceLine y={analyticsData?.matrix.thresholds.avgProfit} stroke="#9ca3af" strokeDasharray="3 3" />

                                    {/* Quadrant Labels */}
                                    <ReferenceArea
                                        x1={analyticsData?.matrix.thresholds.avgSold}
                                        y1={analyticsData?.matrix.thresholds.avgProfit}
                                        fill="transparent"
                                        label={{ value: '⭐ STAR', position: 'insideTopRight', fill: '#15803d', fontSize: 12, fontWeight: 'bold' }}
                                    />
                                    <ReferenceArea
                                        x2={analyticsData?.matrix.thresholds.avgSold}
                                        y1={analyticsData?.matrix.thresholds.avgProfit}
                                        fill="transparent"
                                        label={{ value: '🧩 PUZZLE', position: 'insideTopLeft', fill: '#1d4ed8', fontSize: 12, fontWeight: 'bold' }}
                                    />
                                    <ReferenceArea
                                        x1={analyticsData?.matrix.thresholds.avgSold}
                                        y2={analyticsData?.matrix.thresholds.avgProfit}
                                        fill="transparent"
                                        label={{ value: '🐎 PLOWHORSE', position: 'insideBottomRight', fill: '#a16207', fontSize: 12, fontWeight: 'bold' }}
                                    />
                                    <ReferenceArea
                                        x2={analyticsData?.matrix.thresholds.avgSold}
                                        y2={analyticsData?.matrix.thresholds.avgProfit}
                                        fill="transparent"
                                        label={{ value: '🐕 DOG', position: 'insideBottomLeft', fill: '#b91c1c', fontSize: 12, fontWeight: 'bold' }}
                                    />

                                    <Scatter name="Menu Items" data={analyticsData?.matrix.data}>
                                        {analyticsData?.matrix.data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={
                                                entry.class === 'Star' ? '#22c55e' :
                                                    entry.class === 'Plowhorse' ? '#eab308' :
                                                        entry.class === 'Puzzle' ? '#3b82f6' : '#ef4444'
                                            } stroke="white" strokeWidth={2} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-100">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-lg">⭐</div>
                                <div>
                                    <div className="text-xs font-bold text-green-800">Star</div>
                                    <div className="text-[10px] text-green-600">กำไรสูง / ขายดี</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-100">
                                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-lg">🐎</div>
                                <div>
                                    <div className="text-xs font-bold text-yellow-800">Plowhorse</div>
                                    <div className="text-[10px] text-yellow-600">กำไรต่ำ / ขายดี</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-lg">🧩</div>
                                <div>
                                    <div className="text-xs font-bold text-blue-800">Puzzle</div>
                                    <div className="text-[10px] text-blue-600">กำไรสูง / ขายน้อย</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-100">
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-lg">🐕</div>
                                <div>
                                    <div className="text-xs font-bold text-red-800">Dog</div>
                                    <div className="text-[10px] text-red-600">กำไรต่ำ / ขายน้อย</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Demand Variability Matrix - Full Width */}
                    <div className="bg-white border border-cafe-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-cafe-800 mb-2">📈 วิเคราะห์ความผันผวน (Demand Variability)</h3>
                                <p className="text-sm text-cafe-600 max-w-2xl">
                                    ใช้ค่า <strong>Coefficient of Variation (CV = StdDev/Mean)</strong> วิเคราะห์ความเสถียรของยอดขายรายวัน
                                    ช่วยวางแผนการผลิตและจัดการ buffer สินค้าได้แม่นยำขึ้น
                                </p>
                            </div>
                            <div className="flex-shrink-0 bg-cafe-50 rounded-xl p-3 text-xs text-cafe-600 border border-cafe-100">
                                <div className="font-semibold mb-1">📊 สูตร CV</div>
                                <div>CV = ค่าเบี่ยงเบนมาตรฐาน / ค่าเฉลี่ย</div>
                                <div className="mt-1 text-cafe-500">CV ต่ำ = เสถียร | CV สูง = ผันผวน</div>
                            </div>
                        </div>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                    <XAxis type="number" dataKey="avgDailySales" name="Avg Daily" unit=" ชิ้น/วัน" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis type="number" dataKey="cv" name="CV" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ strokeDasharray: '3 3' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white/90 backdrop-blur-sm p-3 border border-cafe-100 shadow-xl rounded-xl">
                                                        <p className="font-bold text-cafe-900 mb-1">{data.name}</p>
                                                        <div className="space-y-1 text-xs text-cafe-600">
                                                            <div className="flex justify-between gap-4">
                                                                <span>เฉลี่ย/วัน:</span>
                                                                <span className="font-semibold">{data.avgDailySales.toFixed(1)} ชิ้น</span>
                                                            </div>
                                                            <div className="flex justify-between gap-4">
                                                                <span>CV (ความผันผวน):</span>
                                                                <span className="font-semibold">{(data.cv * 100).toFixed(0)}%</span>
                                                            </div>
                                                            <div className={`mt-2 px-2 py-1 rounded text-center font-bold text-white ${data.class === 'CashCow' ? 'bg-green-500' :
                                                                data.class === 'WildCard' ? 'bg-purple-500' :
                                                                    data.class === 'SlowMover' ? 'bg-blue-500' : 'bg-orange-500'
                                                                }`}>
                                                                {data.class === 'CashCow' ? '🐄 Cash Cow' :
                                                                    data.class === 'WildCard' ? '🃏 Wild Card' :
                                                                        data.class === 'SlowMover' ? '🐢 Slow Mover' : '❓ Question Mark'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    {/* Quadrant Backgrounds */}
                                    <ReferenceArea x1={analyticsData?.demandVariability.thresholds.avgVelocity} y2={analyticsData?.demandVariability.thresholds.avgCV} fill="#22c55e" fillOpacity={0.05} />
                                    <ReferenceArea x1={analyticsData?.demandVariability.thresholds.avgVelocity} y1={analyticsData?.demandVariability.thresholds.avgCV} fill="#a855f7" fillOpacity={0.05} />
                                    <ReferenceArea x2={analyticsData?.demandVariability.thresholds.avgVelocity} y2={analyticsData?.demandVariability.thresholds.avgCV} fill="#3b82f6" fillOpacity={0.05} />
                                    <ReferenceArea x2={analyticsData?.demandVariability.thresholds.avgVelocity} y1={analyticsData?.demandVariability.thresholds.avgCV} fill="#f97316" fillOpacity={0.05} />
                                    {/* Threshold Lines */}
                                    <ReferenceLine x={analyticsData?.demandVariability.thresholds.avgVelocity} stroke="#9ca3af" strokeDasharray="3 3" />
                                    <ReferenceLine y={analyticsData?.demandVariability.thresholds.avgCV} stroke="#9ca3af" strokeDasharray="3 3" />
                                    <Scatter name="Products" data={analyticsData?.demandVariability.data}>
                                        {analyticsData?.demandVariability.data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={
                                                entry.class === 'CashCow' ? '#22c55e' :
                                                    entry.class === 'WildCard' ? '#a855f7' :
                                                        entry.class === 'SlowMover' ? '#3b82f6' : '#f97316'
                                            } stroke="white" strokeWidth={2} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-100">
                                <span className="text-lg">🐄</span>
                                <div>
                                    <div className="text-xs font-bold text-green-800">Cash Cow</div>
                                    <div className="text-[10px] text-green-600">ขายดี+เสถียร</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 border border-purple-100">
                                <span className="text-lg">🃏</span>
                                <div>
                                    <div className="text-xs font-bold text-purple-800">Wild Card</div>
                                    <div className="text-[10px] text-purple-600">ขายดี+ผันผวน</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-100">
                                <span className="text-lg">🐢</span>
                                <div>
                                    <div className="text-xs font-bold text-blue-800">Slow Mover</div>
                                    <div className="text-[10px] text-blue-600">ขายช้า+เสถียร</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 border border-orange-100">
                                <span className="text-lg">❓</span>
                                <div>
                                    <div className="text-xs font-bold text-orange-800">Question Mark</div>
                                    <div className="text-[10px] text-orange-600">ขายช้า+ผันผวน</div>
                                </div>
                            </div>
                        </div>
                        {analyticsData?.demandVariability.data.length === 0 && (
                            <div className="text-center py-8 text-cafe-400">ต้องมีข้อมูลอย่างน้อย 2 วันขึ้นไป</div>
                        )}
                    </div>

                    {/* 🤖 AI Recommendation Cards */}
                    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px] rounded-2xl">
                        <div className="bg-white rounded-2xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                                    <Sparkles className="text-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">🤖 AI แนะนำสิ่งที่ควรทำ</h3>
                                    <p className="text-xs text-gray-500">จากการวิเคราะห์ Menu Engineering และ Demand Variability</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Star Recommendations */}
                                {analyticsData?.matrix.data.filter(d => d.class === 'Star').slice(0, 2).map((item, idx) => (
                                    <div key={`star-${idx}`} className="p-3 bg-green-50 rounded-xl border border-green-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-lg">⭐</span>
                                            <span className="font-bold text-green-800 text-sm">{item.name}</span>
                                        </div>
                                        <p className="text-xs text-green-700">
                                            💡 ดันต่อไป! ขายได้ {item.soldQty} ชิ้น กำไร ฿{item.profitPerUnit}/ชิ้น
                                        </p>
                                        <p className="text-xs text-green-600 mt-1">→ พิจารณาเพิ่มการผลิตและ stock</p>
                                    </div>
                                ))}

                                {/* Puzzle Recommendations */}
                                {analyticsData?.matrix.data.filter(d => d.class === 'Puzzle').slice(0, 2).map((item, idx) => (
                                    <div key={`puzzle-${idx}`} className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-lg">🧩</span>
                                            <span className="font-bold text-blue-800 text-sm">{item.name}</span>
                                        </div>
                                        <p className="text-xs text-blue-700">
                                            💡 กำไรดี ฿{item.profitPerUnit}/ชิ้น แต่ขายแค่ {item.soldQty} ชิ้น
                                        </p>
                                        <p className="text-xs text-blue-600 mt-1">→ โปรโมทเพิ่ม! หรือลองวางขายหน้าร้าน</p>
                                    </div>
                                ))}

                                {/* Dog Warning */}
                                {analyticsData?.matrix.data.filter(d => d.class === 'Dog').slice(0, 2).map((item, idx) => (
                                    <div key={`dog-${idx}`} className="p-3 bg-red-50 rounded-xl border border-red-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-lg">🐕</span>
                                            <span className="font-bold text-red-800 text-sm">{item.name}</span>
                                        </div>
                                        <p className="text-xs text-red-700">
                                            ⚠️ ขายแค่ {item.soldQty} ชิ้น กำไร ฿{item.profitPerUnit}/ชิ้น
                                        </p>
                                        <p className="text-xs text-red-600 mt-1">→ พิจารณาปรับสูตร หรือเลิกขาย</p>
                                    </div>
                                ))}

                                {/* Wild Card Warning */}
                                {analyticsData?.demandVariability.data.filter(d => d.class === 'WildCard').slice(0, 2).map((item, idx) => (
                                    <div key={`wild-${idx}`} className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-lg">🃏</span>
                                            <span className="font-bold text-purple-800 text-sm">{item.name}</span>
                                        </div>
                                        <p className="text-xs text-purple-700">
                                            📊 ยอดขายผันผวน CV {(item.cv * 100).toFixed(0)}%
                                        </p>
                                        <p className="text-xs text-purple-600 mt-1">→ เผื่อ buffer การผลิต หรือทำ pre-order</p>
                                    </div>
                                ))}
                            </div>

                            {analyticsData?.matrix.data.length === 0 && (
                                <div className="text-center py-8 text-gray-400">ยังไม่มีข้อมูลการขายเพียงพอ</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                // Accuracy Tab Content
                <div className="space-y-6 animate-in fade-in">
                    {/* Summary Card */}
                    {accuracyData?.summary && (
                        <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="text-center">
                                    <div className="text-4xl font-black mb-1">
                                        {accuracyData.summary.overallAccuracy.toFixed(1)}%
                                    </div>
                                    <div className="text-purple-200 text-sm">ความแม่นยำโดยรวม</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-4xl font-black mb-1">
                                        {accuracyData.summary.totalDays}
                                    </div>
                                    <div className="text-purple-200 text-sm">วันที่บันทึกแผน</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-4xl font-black mb-1">
                                        {accuracyData.summary.daysWithData}
                                    </div>
                                    <div className="text-purple-200 text-sm">วันที่มียอดขายจริง</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-4xl font-black mb-1">
                                        {accuracyData.summary.totalForecasts}
                                    </div>
                                    <div className="text-purple-200 text-sm">รายการที่วางแผน</div>
                                </div>
                            </div>
                            {accuracyData.summary.overallAccuracy >= 80 && (
                                <div className="mt-4 text-center bg-white/10 rounded-lg p-3">
                                    🎯 ยอดเยี่ยม! การพยากรณ์แม่นยำมาก
                                </div>
                            )}
                        </div>
                    )}

                    {/* Daily Comparisons */}
                    {accuracyData?.comparisons.map((data) => (
                        <div key={data.date} className="bg-white border border-cafe-200 rounded-xl p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-cafe-900">
                                        {new Date(data.date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </h3>
                                    <p className="text-sm text-cafe-500">
                                        มีข้อมูล {data.matchCount} รายการที่ตรงกัน
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className={`text-3xl font-black ${data.accuracy >= 80 ? 'text-green-600' : data.accuracy >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                                        {data.accuracy.toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-cafe-500">ความแม่นยำ</div>
                                </div>
                            </div>

                            {/* Comparison Chart */}
                            <div className="h-[300px] mb-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={data.forecasts.map(f => {
                                            // Use same matching logic as calculation
                                            const actual = data.sales.find(s =>
                                                s.productId === f.productId ||
                                                s.variantId === f.productId ||
                                                s.productName === f.productName
                                            );
                                            return {
                                                name: f.productName,
                                                Plan: f.optimalQuantity,
                                                Actual: actual?.quantitySold || 0
                                            };
                                        }).slice(0, 10)}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                        <XAxis dataKey="name" fontSize={10} />
                                        <YAxis />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="Plan" fill="#9333ea" radius={[4, 4, 0, 0]} name="แผนการผลิต" />
                                        <Bar dataKey="Actual" fill="#22c55e" radius={[4, 4, 0, 0]} name="ยอดขายจริง" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Detailed List */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-cafe-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-cafe-600">สินค้า</th>
                                            <th className="px-4 py-2 text-center text-cafe-600">แผน (ชิ้น)</th>
                                            <th className="px-4 py-2 text-center text-cafe-600">จริง (ชิ้น)</th>
                                            <th className="px-4 py-2 text-right text-cafe-600">ผลต่าง</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cafe-100">
                                        {data.forecasts.map(f => {
                                            // Use same matching logic
                                            const actual = data.sales.find(s =>
                                                s.productId === f.productId ||
                                                s.variantId === f.productId ||
                                                s.productName === f.productName
                                            );
                                            const actualQty = actual?.quantitySold || 0;
                                            const diff = actualQty - f.optimalQuantity;

                                            return (
                                                <tr key={f.productId} className="hover:bg-cafe-50">
                                                    <td className="px-4 py-2 font-medium text-cafe-900">{f.productName}</td>
                                                    <td className="px-4 py-2 text-center text-purple-600 font-bold">{f.optimalQuantity}</td>
                                                    <td className="px-4 py-2 text-center text-green-600 font-bold">{actualQty}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <span className={`flex items-center justify-end gap-1 font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                            {diff > 0 ? <ArrowUpRight size={14} /> : diff < 0 ? <ArrowDownRight size={14} /> : null}
                                                            {diff > 0 ? '+' : ''}{diff}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Improved Empty State */}
                    {(!accuracyData?.comparisons || accuracyData.comparisons.length === 0) && (
                        <div className="bg-gradient-to-br from-cafe-50 to-purple-50 rounded-2xl border-2 border-dashed border-cafe-200 p-8">
                            <div className="text-center">
                                <Target size={64} className="mx-auto mb-4 text-purple-400" />
                                <h3 className="text-xl font-bold text-cafe-800 mb-2">เริ่มวัดความแม่นยำ</h3>
                                <p className="text-cafe-600 mb-6">ทำตาม 3 ขั้นตอนนี้:</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                                    <div className="bg-white rounded-xl p-4 border border-cafe-100">
                                        <div className="text-2xl mb-2">📅</div>
                                        <div className="font-bold text-cafe-800">1. วางแผน</div>
                                        <div className="text-sm text-cafe-500">ไปที่ tab "แผนการผลิต" แล้วบันทึกแผน</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 border border-cafe-100">
                                        <div className="text-2xl mb-2">📝</div>
                                        <div className="font-bold text-cafe-800">2. บันทึกยอดขาย</div>
                                        <div className="text-sm text-cafe-500">เมื่อถึงวันนั้น บันทึกยอดขายจริง</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 border border-cafe-100">
                                        <div className="text-2xl mb-2">📊</div>
                                        <div className="font-bold text-cafe-800">3. ดูผลลัพธ์</div>
                                        <div className="text-sm text-cafe-500">กลับมาดูความแม่นยำที่นี่</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
