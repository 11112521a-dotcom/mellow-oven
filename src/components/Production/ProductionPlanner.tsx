import React, { useState, useMemo } from 'react';
import { useStore } from '@/src/store';
import { calculateOptimalProduction } from '@/src/lib/forecasting';
import type { ForecastOutput } from '@/src/lib/forecasting';
import { Product, Variant } from '@/types';
import {
    calculateMenuMatrix,
    performABCAnalysis,
    analyzeWaste
} from '@/src/lib/advancedAnalytics';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea, Cell
} from 'recharts';

interface ForecastResult {
    productId: string;
    productName: string;
    forecast: ForecastOutput;
    error?: string;
}

export const ProductionPlanner: React.FC = () => {
    const { products, markets, saveForecast, productSales, dailyReports } = useStore();
    const [activeTab, setActiveTab] = useState<'plan' | 'insights'>('plan');

    // State for Production Planner
    const [selectedDate, setSelectedDate] = useState(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    });
    const [selectedWeather, setSelectedWeather] = useState<string>('sunny');
    const [selectedMarket, setSelectedMarket] = useState<string>('storefront');
    const [isCalculating, setIsCalculating] = useState(false);
    const [results, setResults] = useState<ForecastResult[]>([]);

    const getMarketName = (marketId: string) => {
        return markets.find(m => m.id === marketId)?.name || marketId;
    };

    // Analytics Calculations
    const analyticsData = useMemo(() => {
        if (activeTab !== 'insights') return null;

        const matrix = calculateMenuMatrix(products, productSales);
        const abcItems = performABCAnalysis(products, productSales);

        // Extract production logs from dailyReports for waste analysis
        const allProductionLogs = dailyReports.flatMap(r => r.logs || []);
        const wasteItems = analyzeWaste(allProductionLogs, products);

        return { matrix, abcItems, wasteItems };
    }, [activeTab, products, productSales, dailyReports]);

    const handleCalculateAll = async () => {
        setIsCalculating(true);
        setResults([]);

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
                    weatherForecast: selectedWeather as any,
                    product: item.variant ? { ...item.product, price: item.variant.price, cost: item.variant.cost } : item.product,
                    productSales: productSales
                });

                forecastResults.push({
                    productId: item.id,
                    productName: item.name,
                    forecast
                });

                await saveForecast(
                    forecast,
                    item.id,
                    item.name,
                    selectedMarket,
                    getMarketName(selectedMarket),
                    selectedDate,
                    selectedWeather
                );
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
    };

    const weatherOptions = [
        { value: 'sunny', label: '☀️ Sunny' },
        { value: 'cloudy', label: '☁️ Cloudy' },
        { value: 'rain', label: '🌧️ Rain' },
        { value: 'storm', label: '⛈️ Storm' }
    ];

    const totalProfit = results
        .filter(r => !r.error)
        .reduce((sum, r) => sum + (r.forecast.expectedProfit || 0), 0);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6">
            {/* Header with Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl shadow-md">
                        🧬
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-cafe-900">Smart Analytics & Planner</h2>
                        <p className="text-sm text-cafe-500">วิเคราะห์ข้อมูลและวางแผนการผลิตด้วย AI</p>
                    </div>
                </div>

                <div className="flex bg-cafe-100 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('plan')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'plan' ? 'bg-white text-purple-600 shadow-sm' : 'text-cafe-600 hover:text-cafe-900'}`}
                    >
                        📅 Production Plan
                    </button>
                    <button
                        onClick={() => setActiveTab('insights')}
                        className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'insights' ? 'bg-white text-purple-600 shadow-sm' : 'text-cafe-600 hover:text-cafe-900'}`}
                    >
                        📊 ข้อมูลเชิงลึก (ใหม่)
                    </button>
                </div>
            </div>

            {activeTab === 'plan' ? (
                <>
                    {/* Input Section - Simplified */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-semibold text-cafe-700 mb-2">
                                    📅 วันที่ผลิต
                                </label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full px-4 py-2.5 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none bg-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-cafe-700 mb-2">
                                    🌦️ สภาพอากาศ
                                </label>
                                <select
                                    value={selectedWeather}
                                    onChange={(e) => setSelectedWeather(e.target.value)}
                                    className="w-full px-4 py-2.5 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none bg-white"
                                >
                                    {weatherOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-cafe-700 mb-2">
                                    🏪 ตลาด
                                </label>
                                <select
                                    value={selectedMarket}
                                    onChange={(e) => setSelectedMarket(e.target.value)}
                                    className="w-full px-4 py-2.5 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none bg-white"
                                >
                                    {markets.map(market => (
                                        <option key={market.id} value={market.id}>{market.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleCalculateAll}
                            disabled={isCalculating || products.length === 0}
                            className={`w-full py-3.5 px-6 rounded-xl font-bold text-white text-lg transition-all ${isCalculating || products.length === 0
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl active:scale-98'
                                }`}
                        >
                            {isCalculating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    กำลังคำนวณ {products.reduce((acc, p) => acc + (p.variants?.length || 1), 0)} เมนู...
                                </span>
                            ) : (
                                `🚀 คำนวณปริมาณผลิต (${products.reduce((acc, p) => acc + (p.variants?.length || 1), 0)} เมนู)`
                            )}
                        </button>
                    </div>

                    {/* Results - Simplified Table */}
                    {results.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-cafe-900">
                                    ผลการคำนวณ ({results.length} เมนู)
                                </h3>
                                <span className="text-sm text-cafe-500">
                                    {new Date(selectedDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-cafe-100 mb-4">
                                <table className="w-full">
                                    <thead className="bg-cafe-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-cafe-700">เมนู</th>
                                            <th className="px-6 py-3 text-center text-sm font-semibold text-cafe-700">ควรผลิต</th>
                                            <th className="px-6 py-3 text-center text-sm font-semibold text-cafe-700">ความเชื่อมั่น</th>
                                            <th className="px-6 py-3 text-right text-sm font-semibold text-cafe-700">กำไรคาดการณ์</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cafe-50">
                                        {results.map((result, index) => (
                                            <tr key={result.productId} className={`hover:bg-cafe-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-cafe-25'}`}>
                                                {result.error ? (
                                                    <>
                                                        <td className="px-6 py-3 font-semibold text-cafe-900">{result.productName}</td>
                                                        <td colSpan={3} className="px-6 py-3 text-center text-red-600 text-sm">
                                                            ⚠️ {result.error}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-6 py-3 font-semibold text-cafe-900">{result.productName}</td>
                                                        <td className="px-6 py-3 text-center">
                                                            <span className="text-3xl font-bold text-purple-600">
                                                                {result.forecast.optimalQuantity}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-center">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${result.forecast.confidenceLevel === 'high' ? 'bg-green-100 text-green-700' :
                                                                result.forecast.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-red-100 text-red-700'
                                                                }`}>
                                                                {result.forecast.confidenceLevel === 'high' ? '● สูง' :
                                                                    result.forecast.confidenceLevel === 'medium' ? '● ปานกลาง' : '● ต่ำ'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-3 text-right">
                                                            <div className="font-bold text-green-600 text-lg">
                                                                ฿{result.forecast.expectedProfit?.toLocaleString() || '0'}
                                                            </div>
                                                            <div className="text-xs text-cafe-500 mt-1">
                                                                <span className="text-red-600">ขาด: {(result.forecast.stockoutProbability * 100).toFixed(0)}%</span>
                                                                {' • '}
                                                                <span className="text-orange-600">เหลือ: {(result.forecast.wasteProbability * 100).toFixed(0)}%</span>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Total Profit */}
                            <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-cafe-700 font-semibold">💰 กำไรรวมที่คาดการณ์:</span>
                                    <span className="text-3xl font-bold text-green-600">
                                        ฿{totalProfit.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State */}
                    {results.length === 0 && !isCalculating && products.length > 0 && (
                        <div className="text-center py-12 text-cafe-400">
                            <div className="text-6xl mb-4">📊</div>
                            <p className="text-lg font-semibold text-cafe-600">เลือกวันที่และสภาพอากาศ แล้วกดคำนวณ</p>
                            <p className="text-sm mt-2">AI จะคำนวณปริมาณผลิตที่เหมาะสมให้ทั้ง {products.length} เมนู</p>
                        </div>
                    )}

                    {/* No Products */}
                    {products.length === 0 && (
                        <div className="text-center py-12 text-cafe-400">
                            <div className="text-6xl mb-4">🍞</div>
                            <p className="text-lg font-semibold text-cafe-600">ยังไม่มีเมนู</p>
                            <p className="text-sm mt-2">เพิ่มเมนูก่อนเพื่อใช้ระบบวางแผนการผลิต</p>
                        </div>
                    )}
                </>
            ) : (
                // Insights Tab Content
                <div className="space-y-6">
                    {/* Top Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Menu Matrix */}
                        <div className="lg:col-span-3 bg-white border border-cafe-200 rounded-xl p-4 shadow-sm">
                            <h3 className="text-lg font-bold text-cafe-800 mb-4">วิเคราะห์เมนู (Menu Engineering)</h3>
                            <div className="h-[300px]">
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

                        {/* Waste Watch */}
                        <div className="lg:col-span-2 bg-white border border-cafe-200 rounded-xl p-4 shadow-sm">
                            <h3 className="text-lg font-bold text-cafe-800 mb-4">🗑️ รายการของเสียสูงสุด 5 อันดับ</h3>
                            <div className="space-y-3">
                                {analyticsData?.wasteItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                                        <div>
                                            <div className="font-semibold text-cafe-900">{item.name}</div>
                                            <div className="text-xs text-cafe-500">เสีย {item.wasteQty} ชิ้น</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-red-600">-฿{item.wasteCost.toLocaleString()}</div>
                                            <div className="text-xs text-red-400">{item.percentOfTotalWaste.toFixed(1)}% ของยอดรวม</div>
                                        </div>
                                    </div>
                                ))}
                                {analyticsData?.wasteItems.length === 0 && (
                                    <div className="text-center py-8 text-cafe-400">ไม่มีข้อมูลของเสีย</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: ABC Analysis */}
                    <div className="bg-white border border-cafe-200 rounded-xl p-4 shadow-sm">
                        <h3 className="text-lg font-bold text-cafe-800 mb-4">📊 วิเคราะห์ ABC (สัดส่วนรายได้)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-cafe-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-cafe-700">เกรด</th>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-cafe-700">สินค้า</th>
                                        <th className="px-4 py-2 text-right text-sm font-semibold text-cafe-700">รายได้</th>
                                        <th className="px-4 py-2 text-right text-sm font-semibold text-cafe-700">สะสม %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-cafe-100">
                                    {analyticsData?.abcItems.slice(0, 10).map((item) => (
                                        <tr key={item.id} className="hover:bg-cafe-50">
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${item.class === 'A' ? 'bg-green-100 text-green-700' :
                                                    item.class === 'B' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    เกรด {item.class}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-cafe-900">{item.name}</td>
                                            <td className="px-4 py-2 text-right text-sm text-cafe-900">฿{item.revenue.toLocaleString()}</td>
                                            <td className="px-4 py-2 text-right text-sm text-cafe-500">{item.cumulativePercent.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {analyticsData?.abcItems && analyticsData.abcItems.length > 10 && (
                                <div className="text-center mt-2 text-xs text-cafe-500">แสดง 10 อันดับแรกจาก {analyticsData.abcItems.length} รายการ</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
