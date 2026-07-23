import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '@/src/store';
import { calculateOptimalProduction, calculateSmartForecast, calculateEcosystemForecast } from '@/src/lib/forecasting';
import type { ForecastOutput } from '@/src/lib/forecasting';
import { forecasterEngine } from '@/src/lib/forecasting/forecasterEngine';
import {
    getCalendarFactors,
    getMonthSeasonality,
    getUpcomingEvents,
    ThaiCalendarEvent
} from '@/src/lib/forecasting/thaiCalendar';
import {
    fetchWeatherForecast,
    getWeatherEmoji,
    getWeatherFactor,
    WeatherForecast
} from '@/src/lib/forecasting/weatherAPI';
import { Product, Variant } from '@/types';

import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, Area, ComposedChart, Line
} from 'recharts';
import { Save, Loader2, Calendar, CloudSun, Store, AlertTriangle, TrendingUp, Package, Target, ArrowUpRight, ArrowDownRight, Sparkles, ChevronDown, Brain, Zap, Info, Rocket, ShieldCheck, Eye, ChevronLeft, Trash2 } from 'lucide-react';
import { analyzeAccuracy } from '@/src/lib/forecasting/accuracyAnalytics';
import { AccuracyDashboard } from './AccuracyDashboard';
import { MarketScheduler } from './MarketScheduler';

interface ForecastResult {
    productId: string;
    productName: string;
    forecast: ForecastOutput;
    error?: string;
}

export const ProductionPlanner: React.FC = () => {
    const { products, markets, marketSchedules, saveForecast, productSales, dailyReports, productionForecasts, dailyInventory } = useStore();
    const [activeTab, setActiveTab] = useState<'plan' | 'accuracy' | 'schedule'>('plan');

    // State for Production Planner
    const [selectedDate, setSelectedDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });
    const [selectedWeather, setSelectedWeather] = useState<string>('sunny');
    const [selectedMarket, setSelectedMarket] = useState<string>(''); // Start empty, will sync with markets
    const [viewingMarketId, setViewingMarketId] = useState<string | null>(null); // For Accuracy Tab Navigation
    const [isCalculating, setIsCalculating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [results, setResults] = useState<ForecastResult[]>([]);

    // Smart Mode & Auto-Pilot State
    const [smartMode, setSmartMode] = useState(true); // Default ON
    const [autoPilot, setAutoPilot] = useState(true); // AI Auto-Pilot ON
    const [autoSavedDates, setAutoSavedDates] = useState<Record<string, boolean>>({});
    const [smartWeather, setSmartWeather] = useState<WeatherForecast | null>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<ThaiCalendarEvent[]>([]);
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);
    const [showWeatherDetails, setShowWeatherDetails] = useState(false);

    const getMarketName = (marketId: string) => {
        return markets.find(m => m.id === marketId)?.name || marketId;
    };

    // Auto-select active regular market matching marketSchedules for day of week when date changes
    useEffect(() => {
        if (selectedDate && marketSchedules && marketSchedules.length > 0) {
            const dateObj = new Date(selectedDate);
            const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

            const activeMarketIds = new Set(
                markets
                    .filter(m => m.isActive !== false && (m.type === 'market' || !m.type))
                    .map(m => m.id)
            );

            const scheduled = marketSchedules.find(s => 
                s.dayOfWeek === dayOfWeek && 
                s.isActive !== false && 
                activeMarketIds.has(s.marketId)
            );

            if (scheduled) {
                setSelectedMarket(scheduled.marketId);
            }
        }
    }, [selectedDate, marketSchedules, markets]);

    // Smart Mode: Auto-fetch weather and calendar events
    useEffect(() => {
        if (!smartMode) return;

        // Fetch weather for selected date
        const fetchSmartWeather = async () => {
            setIsFetchingWeather(true);
            try {
                const weather = await fetchWeatherForecast(selectedDate, 'sisaket');
                if (weather) {
                    setSmartWeather(weather);
                    setSelectedWeather(weather.condition); // Auto-update weather selector
                }
            } catch (error) {
                console.warn('Could not fetch weather:', error);
            } finally {
                setIsFetchingWeather(false);
            }
        };

        // Load upcoming events
        const events = getUpcomingEvents(selectedDate, 14);
        setUpcomingEvents(events);

        fetchSmartWeather();
    }, [smartMode, selectedDate]);

    // Smart calendar factors
    const calendarFactors = useMemo(() => {
        return getCalendarFactors(selectedDate);
    }, [selectedDate]);

    const monthSeasonality = useMemo(() => {
        return getMonthSeasonality(selectedDate);
    }, [selectedDate]);



    // Accuracy Calculations - ULTRA VERSION
    const accuracyAnalysis = useMemo(() => {
        if (activeTab !== 'accuracy') return null;
        return analyzeAccuracy(productionForecasts as any, productSales, products, dailyInventory, markets);
    }, [activeTab, productionForecasts, productSales, products, dailyInventory, markets]);

    const viewingMarketAnalysis = useMemo(() => {
        if (!viewingMarketId || !accuracyAnalysis) return null;
        // Filter forecasts for the selected market
        const filteredForecasts = productionForecasts.filter(f => f.marketId === viewingMarketId);
        return analyzeAccuracy(filteredForecasts as any, productSales, products, dailyInventory, markets);
    }, [viewingMarketId, accuracyAnalysis, productionForecasts, productSales, products, dailyInventory, markets]);

    // Auto-Calculate Logic
    const calculateForecasts = useCallback(async () => {
        if (products.length === 0) return;

        setIsCalculating(true);
        // Small delay to prevent UI flickering on fast inputs and allow loading state to show
        await new Promise(resolve => setTimeout(resolve, 300));

        const { productSales, markets } = useStore.getState();

        // 🛡️ กรองยอดขายย้อนหลัง เฉพาะตลาดนัดเท่านั้น (ไม่ดึงยอดขายจากฝากขาย/ส่งสาขา เข้ามาทำนาย AI 100%)
        const consignmentMarketIds = new Set(
            markets.filter(m => m.type === 'consignment').map(m => m.id)
        );
        const regularMarketSales = productSales.filter(s => 
            !s.marketId || !consignmentMarketIds.has(s.marketId)
        );

        // แสดงสินค้าที่ active ทั้งหมด
        const filteredProducts = products.filter(p => p.isActive !== false);

        const forecastItems: { id: string, name: string, product: Product, variant?: Variant }[] = [];
        filteredProducts.forEach(p => {
            if (p.variants && p.variants.length > 0) {
                p.variants.forEach(v => {
                    forecastItems.push({ id: v.id, name: `${p.name} - ${v.name}`, product: p, variant: v });
                });
            } else {
                forecastItems.push({ id: p.id, name: p.name, product: p });
            }
        });

        const inputsToProcess = forecastItems.map(item => {
            if (smartMode) {
                return {
                    product: item.variant ? { ...item.product, price: item.variant.price, cost: item.variant.cost } : item.product,
                    productId: item.product.id,
                    variantId: item.variant?.id,
                    marketId: selectedMarket,
                    marketName: getMarketName(selectedMarket),
                    targetDate: selectedDate,
                    productSales: regularMarketSales,
                    historicalForecasts: productionForecasts as any,
                    autoFetchWeather: false,
                    weatherCondition: selectedWeather as any
                };
            } else {
                return {
                    productId: item.product.id,
                    variantId: item.variant?.id,
                    marketId: selectedMarket,
                    marketName: getMarketName(selectedMarket),
                    weatherForecast: selectedWeather as any,
                    product: item.variant ? { ...item.product, price: item.variant.price, cost: item.variant.cost } : item.product,
                    productSales: regularMarketSales,
                    targetDate: selectedDate
                };
            }
        });

        try {
            const resultsFromWorker = await forecasterEngine.calculateBatchForecasts(inputsToProcess, smartMode);
            setResults(resultsFromWorker);
        } catch (error) {
            console.error('Worker failed:', error);
            // Fallback empty state
            setResults(forecastItems.map(item => ({
                productId: item.id,
                productName: item.name,
                forecast: {} as ForecastOutput,
                error: 'Worker calculation failed'
            })));
        }

        setIsCalculating(false);
    }, [products, selectedMarket, selectedWeather, selectedDate, smartMode, productionForecasts, productSales]); // Added dependencies

    // Trigger calculation on input change
    useEffect(() => {
        calculateForecasts();
    }, [calculateForecasts]);

    // AI Auto-Pilot: Auto-save predictions if target date does not have a saved forecast yet
    // 🛡️ Strict Rule: AI จะไม่มีวันบันทึกการทำนายเป็น "ทุกตลาด" (ต้องมี selectedMarket เฉพาะเจาะจงเท่านั้น)
    useEffect(() => {
        if (!autoPilot || !selectedMarket || selectedMarket === 'all' || results.length === 0 || isCalculating || isSaving) return;

        const dateKey = `${selectedDate}_${selectedMarket}`;
        const existingForecast = productionForecasts.find(
            f => (f as any).forecastForDate === selectedDate && f.marketId === selectedMarket
        );

        if (!existingForecast && !autoSavedDates[dateKey]) {
            const validResults = results.filter(r => !r.error && r.forecast && !r.forecast.noData);
            if (validResults.length > 0) {
                setIsSaving(true);
                const promises = validResults.map(r => saveForecast(
                    r.forecast,
                    r.productId,
                    r.productName,
                    selectedMarket,
                    getMarketName(selectedMarket),
                    selectedDate,
                    selectedWeather
                ));

                Promise.all(promises).then(() => {
                    setAutoSavedDates(prev => ({ ...prev, [dateKey]: true }));
                    setIsSaving(false);
                }).catch(err => {
                    console.error('Auto-pilot save failed:', err);
                    setIsSaving(false);
                });
            }
        }
    }, [selectedDate, selectedMarket, results, isCalculating, isSaving, productionForecasts, autoSavedDates, autoPilot, selectedWeather, saveForecast]);

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
        { value: 'storm', label: '⛈️ พายุ (Storm)' },
        { value: 'wind', label: '💨 ลมแรง (Windy)' },
        { value: 'cold', label: '❄️ หนาว (Cold)' }
    ];

    const totalProfit = results
        .filter(r => !r.error && r.forecast && !r.forecast.noData)
        .reduce((sum, r) => {
            // Calculate profit from optimal quantity × profit margin
            const product = products.find(p => p.id === r.productId || p.variants?.some(v => v.id === r.productId));
            const variant = product?.variants?.find(v => v.id === r.productId);
            const price = variant?.price || product?.price || 0;
            const cost = variant?.cost || product?.cost || 0;
            const margin = price - cost;
            return sum + (r.forecast.optimalQuantity * margin);
        }, 0);

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
                        onClick={() => setActiveTab('accuracy')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'accuracy' ? 'bg-white text-cafe-800 shadow-sm' : 'text-cafe-500 hover:text-cafe-800'}`}
                    >
                        🎯 ความแม่นยำ
                    </button>

                    <button
                        onClick={() => setActiveTab('schedule')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'schedule' ? 'bg-white text-cafe-800 shadow-sm' : 'text-cafe-500 hover:text-cafe-800'}`}
                    >
                        📍 ตารางตลาด
                    </button>
                </div>
            </div>

            {activeTab === 'schedule' && (
                <MarketScheduler />
            )}

            {activeTab === 'plan' ? (
                <div className="space-y-6">
                    {/* Controls Bar */}
                    <div className="bg-white p-4 rounded-xl border border-cafe-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between sticky top-[72px] md:top-4 z-20">
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
                                    className="pl-10 pr-10 py-2 bg-cafe-50 border border-cafe-200 rounded-lg text-sm focus:ring-2 focus:ring-cafe-500 outline-none appearance-none w-full md:w-auto"
                                >
                                    {weatherOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-cafe-400 pointer-events-none" size={16} />
                            </div>
                            <div className="relative">
                                <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400" size={18} />
                                <select
                                    value={selectedMarket}
                                    onChange={(e) => setSelectedMarket(e.target.value)}
                                    className="pl-10 pr-10 py-2 bg-cafe-50 border border-cafe-200 rounded-lg text-sm focus:ring-2 focus:ring-cafe-500 outline-none appearance-none w-full md:w-auto"
                                >
                                    <option value="">🌐 ทุกตลาด (รวมทั้งหมด)</option>
                                    {markets
                                        .filter(m => m.isActive !== false && (m.type === 'market' || !m.type))
                                        .map(market => (
                                            <option key={market.id} value={market.id}>{market.name}</option>
                                        ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-cafe-400 pointer-events-none" size={16} />
                            </div>

                            {/* Smart Mode Toggle */}
                            <button
                                onClick={() => setSmartMode(!smartMode)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${smartMode
                                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-200'
                                    : 'bg-cafe-100 text-cafe-600 hover:bg-cafe-200'
                                    }`}
                            >
                                <Brain size={18} className={smartMode ? 'animate-pulse' : ''} />
                                <span className="hidden md:inline">Smart Mode</span>
                                {smartMode && isFetchingWeather && <Loader2 size={14} className="animate-spin" />}
                            </button>

                            {/* Auto-Pilot Toggle */}
                            <button
                                onClick={() => setAutoPilot(!autoPilot)}
                                title="โหมด AI ทำนายและบันทึกแผนให้อัตโนมัติ"
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${autoPilot
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200'
                                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                    }`}
                            >
                                <Zap size={16} className={autoPilot ? 'text-yellow-300 fill-yellow-300' : ''} />
                                <span>Auto-Pilot {autoPilot ? 'ON' : 'OFF'}</span>
                            </button>
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

                    {/* Auto-Pilot Notification Banner */}
                    {autoPilot && autoSavedDates[`${selectedDate}_${selectedMarket}`] && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 px-4 flex items-center justify-between text-emerald-800 text-sm font-medium animate-in fade-in duration-300">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                                <span>🤖 <strong>AI Auto-Pilot:</strong> ระบบวิเคราะห์ยอดขายและบันทึกแผนการผลิตสำหรับวันที่นี้ให้อัตโนมัติเรียบร้อยแล้ว</span>
                            </div>
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">บันทึกสำเร็จ</span>
                        </div>
                    )}

                    {/* AI Insight Panel - How AI Calculates */}
                    {results.length > 0 && !isCalculating && (
                        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px] rounded-2xl animate-gradient-shift">
                            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                                        <span className="text-white text-xl">🧠</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 animate-pulse">SMART BRAIN 5.0 (GOD TIER) 🧠⚡</h3>
                                        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 mt-0.5">
                                            <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold">Adaptive Gain</span>
                                            <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded font-bold">Exponential Bias</span>
                                            <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-bold">Micro-Patterns</span>
                                        </div>
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
                                                    selectedWeather === 'rain' ? '🌧️ ~60%' : '⛈️ ~5%'}
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
                                    <p className="flex items-start gap-2">
                                        <span className="text-purple-500 mt-0.5">💡</span>
                                        <span>
                                            <strong>ระบบประมวลผล 5.0:</strong>
                                            <ul className="list-disc pl-4 mt-1 space-y-1 text-gray-500 font-normal">
                                                <li><strong>Exponential Bias:</strong> จับผิดตัวเองแบบ Real-time (React ไวขึ้น 300%)</li>
                                                <li><strong>Adaptive Gain:</strong> ยิ่งผิดบ่อย ยิ่งเร่งแก้อัตโนมัติ (Gain Boost)</li>
                                                <li><strong>Micro-Patterns:</strong> ตาทิพย์เห็นสิ่งที่คนไม่เห็น (Mid-Month Cycle, Rain+Weekend Synergy)</li>
                                                <li><strong>Economic Core:</strong> ใช้ Newsvendor Model + Auto-Seasonality คำนวณจุดคุ้มทุนสูงสุด</li>
                                            </ul>
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Smart Mode Insights Panel */}
                    {smartMode && !isCalculating && (
                        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-[2px] rounded-2xl">
                            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                                        <Zap className="text-white" size={22} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800">🧠 Smart Mode Active</h3>
                                        <p className="text-xs text-gray-500">ปรับอัตโนมัติตามอากาศจริง + ปฏิทินไทย + ฤดูกาล</p>
                                    </div>
                                </div>
                                {/* Detailed Factor Breakdown */}
                                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {/* 1. Day Factor */}
                                    <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                                        <p className="text-xs text-indigo-600 mb-1 font-semibold">📅 วัน{new Date(selectedDate).toLocaleDateString('th-TH', { weekday: 'long' })}</p>
                                        <p className="text-xl font-bold text-indigo-700">x1.00</p>
                                        <p className="text-[10px] text-indigo-400">Baseline Multiplier</p>
                                    </div>

                                    {/* 2. Weather Factor */}
                                    <div 
                                        className={`group relative rounded-xl p-3 border transition-all duration-300 ${
                                            smartWeather 
                                                ? 'bg-sky-50 hover:bg-sky-100 border-sky-100 hover:border-sky-200' 
                                                : 'bg-gray-50 border-gray-100'
                                        }`}
                                    >
                                        <p className="text-xs text-gray-600 mb-1 font-semibold flex items-center justify-between gap-1">
                                            <span className="flex items-center gap-1">
                                                {smartWeather ? getWeatherEmoji(smartWeather.condition) : <CloudSun size={12} />}
                                                สภาพอากาศ
                                            </span>
                                            {smartWeather && (
                                                <button 
                                                    onClick={() => setShowWeatherDetails(!showWeatherDetails)}
                                                    className="text-[9px] bg-sky-200 hover:bg-sky-300 text-sky-800 px-1 rounded font-medium flex items-center gap-0.5 transition-colors"
                                                >
                                                    โหวต {smartWeather.consensusAgreement}%
                                                    <ChevronDown size={8} className={`transform transition-transform ${showWeatherDetails ? 'rotate-180' : ''}`} />
                                                </button>
                                            )}
                                        </p>
                                        <p className={`text-xl font-bold ${smartWeather ? 'text-sky-700' : 'text-gray-400'}`}>
                                            {smartWeather
                                                ? `x${getWeatherFactor(selectedWeather as any).toFixed(2)}`
                                                : '-'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 truncate flex items-center justify-between">
                                            <span>{smartWeather ? smartWeather.description : 'รอข้อมูล...'}</span>
                                            {smartWeather && (
                                                <button 
                                                    onClick={() => setShowWeatherDetails(!showWeatherDetails)}
                                                    className="text-[9px] text-sky-500 hover:text-sky-700 underline font-medium"
                                                >
                                                    รายละเอียด
                                                </button>
                                            )}
                                        </p>

                                        {/* Dropdown breakdown */}
                                        {smartWeather && showWeatherDetails && (
                                            <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white border border-sky-100 rounded-xl p-3 shadow-xl max-h-60 overflow-y-auto">
                                                <p className="text-xs font-bold text-sky-950 mb-2 border-b border-sky-50 pb-1 flex items-center justify-between">
                                                    <span>📊 แหล่งข้อมูลสภาพอากาศ</span>
                                                    <span className="text-[9px] text-sky-600 font-normal">ความเห็นพ้อง {smartWeather.consensusAgreement}%</span>
                                                </p>
                                                <div className="space-y-1.5">
                                                    {smartWeather.sources?.map((src: any, idx: number) => (
                                                        <div key={idx} className="flex flex-col text-[10px] bg-slate-50/70 p-1.5 rounded border border-slate-100">
                                                            <div className="flex justify-between items-center font-medium text-slate-700">
                                                                <span>{src.sourceName}</span>
                                                                <span>{getWeatherEmoji(src.condition)} {src.condition.toUpperCase()}</span>
                                                            </div>
                                                            <div className="flex justify-between text-slate-400 mt-0.5 text-[9px]">
                                                                <span>🌡️ {src.temperature}°C</span>
                                                                <span>🌧️ {src.precipitation} มม. (RH {src.humidity}%)</span>
                                                            </div>
                                                            <span className="text-[9px] text-slate-500 italic mt-0.5 truncate">{src.description}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-2 text-[9px] text-sky-700 bg-sky-50 p-2 rounded leading-relaxed border border-sky-100/50">
                                                    <strong>มติมติสถิติ (Consensus):</strong> อุณหภูมิเฉลี่ย {smartWeather.temperature}°C, ปริมาณฝนเฉลี่ย {smartWeather.precipitation} มม., ความชื้นเฉลี่ย {smartWeather.humidity}%
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Payday Factor */}
                                    <div className={`rounded-xl p-3 border ${calendarFactors.isPayday ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                                        <p className="text-xs text-gray-600 mb-1 font-semibold flex items-center gap-1">
                                            💰 Payday Effect
                                        </p>
                                        <p className={`text-xl font-bold ${calendarFactors.isPayday ? 'text-emerald-700' : 'text-gray-400'}`}>
                                            {calendarFactors.isPayday ? 'x1.20' : 'x1.00'}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {calendarFactors.isPayday ? 'ช่วงเงินเดือนออก (+20%)' : 'ช่วงปกติ'}
                                        </p>
                                    </div>

                                    {/* 4. Seasonality/Event */}
                                    <div className={`rounded-xl p-3 border ${monthSeasonality.factor !== 1 || calendarFactors.event ? 'bg-rose-50 border-rose-100' : 'bg-gray-50 border-gray-100'}`}>
                                        <p className="text-xs text-gray-600 mb-1 font-semibold flex items-center gap-1">
                                            🎉 เทศกาล/ฤดู
                                        </p>
                                        <p className={`text-xl font-bold ${monthSeasonality.factor !== 1 || calendarFactors.event ? 'text-rose-700' : 'text-gray-400'}`}>
                                            x{((calendarFactors.event?.demandFactor || 1) * monthSeasonality.factor).toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-gray-400 truncate">
                                            {calendarFactors.event?.name || monthSeasonality.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Total Multiplier Badge */}
                                <div className="mt-3 flex justify-center">
                                    <div className="bg-gray-900 text-white px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg">
                                        <span>⚡ Total Impact:</span>
                                        <span className="text-yellow-400 font-bold text-sm">
                                            x{(
                                                1.0 *
                                                getWeatherFactor(selectedWeather as any) *
                                                (calendarFactors.isPayday ? 1.2 : 1.0) *
                                                ((calendarFactors.event?.demandFactor || 1) * monthSeasonality.factor)
                                            ).toFixed(2)}
                                        </span>
                                        <span className="text-gray-400">(Day × Weather × Payday × Event)</span>
                                    </div>
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
                                                {!result.error && !result.forecast.noData && (<>
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
                                                    {/* Badge Container */}
                                                    {/* Badge Container */}
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                        {/* 📐 Model Badge (New) */}
                                                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 font-medium">
                                                            <Brain size={10} />
                                                            {result.forecast.distributionType === 'negativeBinomial' ? 'Neg. Binomial' : 'Poisson Dist.'}
                                                        </span>

                                                        {/* 🚀 Momentum Badge */}
                                                        {(result.forecast as any).momentumTrend && Math.abs((result.forecast as any).momentumTrend) > 0.15 && (
                                                            <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${(result.forecast as any).momentumTrend > 0 ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                                <Rocket size={10} className={(result.forecast as any).momentumTrend < 0 ? 'rotate-180' : ''} />
                                                                Momentum
                                                            </span>
                                                        )}

                                                        {/* 🛡️ Volatility Badge */}
                                                        {(result.forecast as any).isHighVolatility && (
                                                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-medium">
                                                                <ShieldCheck size={10} />
                                                                Volatility Shield
                                                            </span>
                                                        )}

                                                        {/* 👁️ Uncensored Demand Badge */}
                                                        {(result.forecast as any).patternAdjustments?.some((a: any) => a.source.includes('Bias') || a.source.includes('กู้คืน')) && (
                                                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">
                                                                <Eye size={10} />
                                                                Uncensored
                                                            </span>
                                                        )}
                                                    </div>
                                                </>)}
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
                                                        {smartMode && (result.forecast as any).explanation ? (
                                                            <div className="p-2.5 bg-purple-50/70 rounded-xl space-y-1.5 border border-purple-100">
                                                                <p className="font-bold text-purple-950 mb-1 flex items-center gap-1">
                                                                    <Brain size={12} className="text-purple-600 animate-pulse" /> 
                                                                    การวิเคราะห์ AI (Smart Mode):
                                                                </p>
                                                                {(result.forecast as any).explanation.map((exp: string, idx: number) => (
                                                                    <div key={idx} className="flex items-start gap-1.5 text-[10px] text-purple-900 font-medium">
                                                                        <span className="text-purple-500">•</span>
                                                                        <span>{exp}</span>
                                                                    </div>
                                                                ))}
                                                                <div className="text-center text-[9px] text-purple-400 pt-1 border-t border-purple-100/50 mt-1">
                                                                    โมเดล: {result.forecast.distributionType === 'poisson' ? 'Poisson' : 'Negative Binomial'} | ช่วง: {result.forecast.predictionInterval.lower}-{result.forecast.predictionInterval.upper}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
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
                                                            </>
                                                        )}
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
            ) : (
                // Accuracy Tab Content - ULTRA VERSION
                <div className="space-y-6 animate-in fade-in">

                    {viewingMarketId ? (
                        // Market Detail View
                        <div className="space-y-4">
                            <button
                                onClick={() => setViewingMarketId(null)}
                                className="flex items-center gap-2 text-cafe-600 hover:text-cafe-900 bg-white px-4 py-2 rounded-lg shadow-sm border border-cafe-200 transition-all hover:bg-cafe-50"
                            >
                                <ChevronLeft size={20} />
                                <span className="font-bold">กลับไปหน้าภาพรวม</span>
                            </button>

                            {viewingMarketAnalysis ? (
                                <AccuracyDashboard data={viewingMarketAnalysis} />
                            ) : (
                                <div className="text-center py-12">
                                    <Loader2 className="animate-spin mx-auto text-cafe-400" size={32} />
                                    <p className="mt-2 text-cafe-500">กำลังวิเคราะห์ข้อมูล...</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Market Grid View (Command Center) */
                        <div className="space-y-6">

                            {/* 🎯 Global Accuracy Scoreboard (Overall Trend) - Moved to Top */}
                            {accuracyAnalysis && accuracyAnalysis.dailyTrend.length > 0 && (
                                <div className="bg-white border border-cafe-200 rounded-3xl p-8 shadow-sm">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h2 className="text-2xl font-bold text-cafe-900 flex items-center gap-3">
                                                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-purple-200">
                                                    <Target size={28} />
                                                </div>
                                                ภาพรวมความแม่นยำ (Overall Accuracy Trend)
                                            </h2>
                                            <p className="text-gray-500 mt-2 ml-[60px] text-base">
                                                วัดผลรวมทุกตลาด: เส้น <span className="text-purple-600 font-bold">สีม่วง</span> คือความแม่นยำ (%) | แท่ง <span className="text-red-400 font-bold">สีแดง</span> คือมูลค่าความเสียหาย (฿)
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <p className="text-sm text-gray-400 mb-1">ความแม่นยำเฉลี่ย (30 วัน)</p>
                                                <p className="text-4xl font-black text-cafe-900">
                                                    {accuracyAnalysis.summary.overallAccuracy.toFixed(1)}<span className="text-2xl text-gray-400">%</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-gray-400 mb-1">เงินจมรวม</p>
                                                <p className="text-4xl font-black text-red-500">
                                                    ฿{accuracyAnalysis.summary.totalWasteCost.toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-[400px] w-full">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                            <ComposedChart data={accuracyAnalysis.dailyTrend.slice(-30)} margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
                                                <defs>
                                                    <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(date) => new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    dy={15}
                                                />
                                                <YAxis
                                                    yAxisId="left"
                                                    domain={[0, 100]}
                                                    tick={{ fill: '#8b5cf6', fontSize: 12, fontWeight: 600 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    unit="%"
                                                />
                                                <YAxis
                                                    yAxisId="right"
                                                    orientation="right"
                                                    tick={{ fill: '#f87171', fontSize: 12 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={(val) => `฿${val}`}
                                                />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
                                                    formatter={(value: any, name: string) => {
                                                        if (name === 'Accuracy') return [`${parseFloat(value).toFixed(1)}%`, '🎯 ความแม่นยำ'];
                                                        if (name === 'Money Lost') return [`฿${value.toLocaleString()}`, '💸 มูลค่าความเสียหาย'];
                                                        return [value, name];
                                                    }}
                                                    labelFormatter={(label) => new Date(label).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                />
                                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

                                                {/* Candlestick-like Bars for Money Lost */}
                                                <Bar
                                                    yAxisId="right"
                                                    dataKey="totalWasteCost"
                                                    name="Money Lost"
                                                    fill="#f87171"
                                                    barSize={12}
                                                    radius={[4, 4, 4, 4]}
                                                    fillOpacity={0.6}
                                                />

                                                {/* Smooth Line for Accuracy */}
                                                <Area
                                                    yAxisId="left"
                                                    type="monotone"
                                                    dataKey="accuracy"
                                                    name="Accuracy"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={4}
                                                    fill="url(#accuracyGradient)"
                                                    dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#8b5cf6' }}
                                                    activeDot={{ r: 8, strokeWidth: 0, fill: '#8b5cf6' }}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-cafe-900 flex items-center gap-2">
                                    <Store className="text-gray-400" />
                                    แยกตามตลาด (Market Breakdown)
                                </h2>
                                <div className="text-sm text-cafe-500">
                                    เลือกตลาดเพื่อดูรายละเอียด
                                </div>
                            </div>

                            {/* Market Cards Grid */}

                            {/* Market Cards Grid */}
                            {accuracyAnalysis && accuracyAnalysis.marketAccuracy.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {accuracyAnalysis.marketAccuracy.map((market, idx) => (
                                        <div
                                            key={market.marketId}
                                            className="group relative bg-white border border-cafe-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:border-purple-200 hover:-translate-y-1 overflow-hidden"
                                        >
                                            {/* Click area for navigation */}
                                            <div
                                                className="absolute inset-0 cursor-pointer z-0"
                                                onClick={() => setViewingMarketId(market.marketId)}
                                            />

                                            {/* Delete Button (Z-Index higher to be clickable) */}
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(`คุณต้องการลบประวัติการทำนายทั้งหมดของ "${market.marketName}" ใช่ไหม? \n(ข้อมูลจะหายไปถาวร)`)) {
                                                        try {
                                                            const deleteForecasts = useStore.getState().deleteForecastsForMarket;
                                                            await deleteForecasts(market.marketId);
                                                            alert(`ลบประวัติการทำนายของ "${market.marketName}" เรียบร้อยแล้ว`);
                                                        } catch (err) {
                                                            console.error('Delete failed:', err);
                                                            alert('เกิดข้อผิดพลาดในการลบข้อมูล กรุณาลองใหม่อีกครั้ง');
                                                        }
                                                    }
                                                }}
                                                className="absolute top-4 right-4 z-10 p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shadow-sm bg-stone-50"
                                                title="ลบประวัติการทำนาย"
                                            >
                                                <Trash2 size={18} />
                                            </button>

                                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                                <Store size={80} className="text-purple-600" />
                                            </div>

                                            <div className="relative z-0 pointer-events-none">
                                                <div className="flex items-start justify-between mb-4 pr-8">
                                                    <div>
                                                        <div className="text-sm text-cafe-500 mb-1">Market</div>
                                                        <h3 className="text-xl font-bold text-cafe-900 group-hover:text-purple-700 transition-colors">
                                                            {market.marketName}
                                                        </h3>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-50 text-purple-600 font-bold group-hover:bg-purple-600 group-hover:text-white transition-all text-sm">
                                                        {idx + 1}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                    <div className="text-center p-3 bg-green-50 rounded-xl">
                                                        <div className={`text-2xl font-black ${market.accuracy >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                                            {market.accuracy.toFixed(0)}%
                                                        </div>
                                                        <div className="text-xs text-green-700 font-medium">ความแม่นยำ</div>
                                                    </div>
                                                    <div className="text-center p-3 bg-blue-50 rounded-xl">
                                                        <div className="text-2xl font-black text-blue-600">
                                                            {market.sampleSize}
                                                        </div>
                                                        <div className="text-xs text-blue-700 font-medium">วันที่มีข้อมูล</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-cafe-500 pt-4 border-t border-cafe-100">
                                                    <div className="flex items-center gap-1 text-orange-500">
                                                        <ArrowUpRight size={14} />
                                                        ผลิตเกิน {market.wasteQty}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-red-500">
                                                        <ArrowDownRight size={14} />
                                                        ของขาด {market.stockoutQty}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-cafe-50 rounded-2xl border-2 border-dashed border-cafe-200">
                                    <Target className="mx-auto text-cafe-300 mb-4" size={48} />
                                    <p className="text-cafe-500">ยังไม่มีข้อมูลการขายเพื่อวิเคราะห์</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )
            }
        </div >
    );
};
