import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Cloud, CloudLightning, Save, RotateCcw, Wind, Snowflake, Sparkles, TrendingUp } from 'lucide-react';
import { useStore } from '@/src/store';
import {
    calculateAdvancedForecast,
    getSalesPattern,
    getSmartProductInsights
} from '@/src/lib/analytics';
import { SmartInsightsPanel, type SmartInsight } from '@/src/components/Production/SmartInsightsPanel';
import { ProductSalesTrend } from '@/src/components/Production/ProductSalesTrend';

const Production: React.FC = () => {
    const { products, markets, dailyReports } = useStore();
    const [selectedWeather, setSelectedWeather] = useState('Sunny');
    const [selectedMarketId, setSelectedMarketId] = useState<string>(markets[0]?.id || '');
    const [selectedProductForTrend, setSelectedProductForTrend] = useState<string>('');
    const [plans, setPlans] = useState<any[]>([]);

    useEffect(() => {
        const allLogs = dailyReports.flatMap(r => r.logs || []);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const newPlans = products.map(p => {
            // Use Advanced Forecasting
            const forecast = calculateAdvancedForecast(p.id, tomorrow, allLogs, {
                weather: selectedWeather,
                marketId: selectedMarketId,
                dailyReports
            });

            return {
                ...p,
                suggested: forecast.quantity,
                confidence: forecast.confidence,
                insights: forecast.insights,
                actual: 0
            };
        });
        setPlans(newPlans);

        // Set first product for trend view
        if (!selectedProductForTrend && products.length > 0) {
            setSelectedProductForTrend(products[0].id);
        }
    }, [products, selectedMarketId, selectedWeather, dailyReports, selectedProductForTrend]);

    const handleApplySuggestion = () => {
        setPlans(plans.map(p => ({ ...p, actual: p.suggested })));
    };

    // Calculate Summary Stats
    const totalExpectedCost = plans.reduce((acc, curr) => acc + (curr.cost * (curr.actual || curr.suggested)), 0);
    const totalExpectedRevenue = plans.reduce((acc, curr) => acc + (curr.price * (curr.actual || curr.suggested)), 0);
    const totalExpectedProfit = totalExpectedRevenue - totalExpectedCost;

    // Get Smart Insights
    const allLogs = dailyReports.flatMap(r => r.logs || []);
    const productInsights = getSmartProductInsights(products, allLogs);

    // Build global insights
    const globalInsights: SmartInsight[] = [
        {
            type: 'info',
            message: `AI แนะนำผลิตรวม ${plans.reduce((sum, p) => sum + p.suggested, 0)} ชิ้น สำหรับวันพรุ่งนี้`
        }
    ];

    if (selectedWeather === 'Rainy' || selectedWeather === 'Storm') {
        globalInsights.push({
            type: 'warning',
            message: '🌧️ สภาพอากาศไม่ดี อาจมียอดขายน้อยกว่าปกติ',
            action: 'ลดปริมาณผลิตลง 20-30%'
        });
    }

    if (selectedWeather === 'Sunny') {
        globalInsights.push({
            type: 'success',
            message: '☀️ อากาศแจ่มใส ยอดขายมักเพิ่มขึ้น!',
            action: 'พร้อมรับออเดอร์เพิ่มได้'
        });
    }

    // Add best sellers insight
    if (productInsights.bestSellers.length > 0) {
        const topSeller = productInsights.bestSellers[0];
        globalInsights.push({
            type: 'success',
            message: `🏆 ${topSeller.productName} ขายดีที่สุด! (Margin: ${topSeller.margin.toFixed(0)}%)`,
            action: 'พิจารณาเพิ่มผลิต'
        });
    }

    // Add underperformers insight
    if (productInsights.underperforming.length > 0) {
        const worstSeller = productInsights.underperforming[0];
        globalInsights.push({
            type: 'warning',
            message: `⚠️ ${worstSeller.productName} ขายช้า (เฉลี่ย ${worstSeller.avgSold.toFixed(1)} ชิ้น/วัน)`,
            action: 'ลดปริมาณผลิตหรือปรับราคา'
        });
    }

    // Get trend data for selected product
    const trendData = selectedProductForTrend
        ? getSalesPattern(selectedProductForTrend, allLogs, 14)
        : [];
    const selectedProduct = products.find(p => p.id === selectedProductForTrend);
    const selectedPlan = plans.find(p => p.id === selectedProductForTrend);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-cafe-900">แผนการผลิต & พยากรณ์ (Smart Production)</h2>
                <p className="text-sm md:text-base text-cafe-500">วางแผนสำหรับวันพรุ่งนี้ด้วย AI</p>
            </div>

            {/* Prediction Context Card */}
            <div className="bg-cafe-800 text-white rounded-2xl p-4 md:p-6 shadow-lg">
                <h3 className="text-base md:text-lg font-medium mb-4 flex items-center gap-2">
                    <CloudRain size={20} className="text-blue-300" />
                    ตั้งค่าปัจจัยแวดล้อม
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm text-cafe-200 mb-2">สภาพอากาศพรุ่งนี้</label>
                        <div className="flex space-x-2 overflow-x-auto pb-2">
                            {[
                                { id: 'Sunny', label: 'แดดจ้า', icon: <Sun size={24} /> },
                                { id: 'Cloudy', label: 'เมฆมาก', icon: <Cloud size={24} /> },
                                { id: 'Rainy', label: 'ฝนตก', icon: <CloudRain size={24} /> },
                                { id: 'Storm', label: 'พายุ', icon: <CloudLightning size={24} /> },
                                { id: 'Windy', label: 'ลมแรง', icon: <Wind size={24} /> },
                                { id: 'Cold', label: 'หนาว', icon: <Snowflake size={24} /> }
                            ].map(w => (
                                <button
                                    key={w.id}
                                    onClick={() => setSelectedWeather(w.id)}
                                    className={`
                                    p-3 rounded-xl border flex flex-col items-center justify-center min-w-[80px] h-20 transition
                                    ${selectedWeather === w.id
                                            ? 'bg-white text-cafe-900 border-white'
                                            : 'border-cafe-600 text-cafe-300 hover:bg-cafe-700'}`}
                                >
                                    {w.icon}
                                    <span className="text-xs mt-1">{w.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-cafe-200 mb-2">ตลาด / สถานที่ขาย</label>
                        <select
                            value={selectedMarketId}
                            onChange={(e) => setSelectedMarketId(e.target.value)}
                            className="w-full bg-cafe-700 border border-cafe-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-cafe-400"
                        >
                            {markets.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Smart Insights Panel */}
            <SmartInsightsPanel
                insights={globalInsights}
                confidence={plans.length > 0 ? Math.round(plans.reduce((sum, p) => sum + p.confidence, 0) / plans.length) : 0}
                expectedCost={totalExpectedCost}
                expectedProfit={totalExpectedProfit}
            />

            {/* Production List */}
            <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden">
                <div className="p-4 md:p-6 border-b border-cafe-100 flex justify-between items-center bg-cafe-50">
                    <h3 className="font-semibold text-cafe-800">รายการผลิตที่แนะนำ</h3>
                    <button
                        onClick={handleApplySuggestion}
                        className="text-xs md:text-sm text-cafe-600 hover:text-cafe-800 flex items-center gap-1 bg-white border border-cafe-300 px-3 py-1 rounded shadow-sm"
                    >
                        <RotateCcw size={14} /> ใช้ค่าแนะนำทั้งหมด
                    </button>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden p-4 space-y-3">
                    {plans.map((item) => (
                        <div key={item.id} className="bg-white border border-cafe-100 rounded-xl p-4 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold text-cafe-800">{item.name}</p>
                                    <p className="text-xs text-cafe-500">{item.flavor}</p>
                                </div>
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                                    {item.confidence}% แม่นยำ
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                    <p className="text-xs text-cafe-500">AI แนะนำ</p>
                                    <p className="text-lg font-bold text-blue-600">{item.suggested}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-cafe-500">จะผลิต</p>
                                    <input
                                        type="number"
                                        value={item.actual || ''}
                                        placeholder={item.suggested.toString()}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setPlans(plans.map(p => p.id === item.id ? { ...p, actual: val } : p));
                                        }}
                                        className="w-full px-2 py-1 border border-cafe-300 rounded text-center"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-cafe-600">
                                ต้นทุน: ฿{(item.cost * (item.actual || item.suggested)).toLocaleString()}
                            </p>
                            <button
                                onClick={() => setSelectedProductForTrend(item.id)}
                                className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <TrendingUp size={12} /> ดู Trend
                            </button>
                        </div>
                    ))}
                </div>

                {/* Desktop Table View */}
                <table className="w-full text-sm text-left text-cafe-700 hidden md:table">
                    <thead className="text-xs text-cafe-500 uppercase bg-cafe-50">
                        <tr>
                            <th className="px-6 py-3">สินค้า</th>
                            <th className="px-6 py-3">รสชาติ</th>
                            <th className="px-6 py-3 text-center bg-blue-50/50">AI แนะนำ (ชิ้น)</th>
                            <th className="px-6 py-3 text-center">ความมั่นใจ</th>
                            <th className="px-6 py-3 text-center bg-yellow-50/50">ผลิตจริง (ชิ้น)</th>
                            <th className="px-6 py-3">ต้นทุนคาดการณ์</th>
                            <th className="px-6 py-3 text-center">Trend</th>
                        </tr>
                    </thead>
                    <tbody>
                        {plans.map((item) => (
                            <tr key={item.id} className="border-b border-cafe-100 hover:bg-cafe-50">
                                <td className="px-6 py-4 font-medium">{item.name}</td>
                                <td className="px-6 py-4">{item.flavor}</td>
                                <td className="px-6 py-4 text-center font-semibold text-blue-600 bg-blue-50/30">
                                    {item.suggested}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                        {item.confidence}%
                                    </span>
                                </td>
                                <td className="px-6 py-4 bg-yellow-50/30">
                                    <input
                                        type="number"
                                        value={item.actual || ''}
                                        placeholder={item.suggested.toString()}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setPlans(plans.map(p => p.id === item.id ? { ...p, actual: val } : p));
                                        }}
                                        className="w-24 text-center p-1 border border-cafe-300 rounded focus:ring-2 focus:ring-cafe-500"
                                    />
                                </td>
                                <td className="px-6 py-4 text-cafe-500">
                                    ฿{(item.cost * (item.actual || item.suggested)).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => setSelectedProductForTrend(item.id)}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        <TrendingUp size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-cafe-50 font-semibold text-cafe-900">
                        <tr>
                            <td colSpan={5} className="px-6 py-4 text-right">ต้นทุนการผลิตรวมทั้งหมด:</td>
                            <td className="px-6 py-4">
                                ฿{totalExpectedCost.toLocaleString()}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Sales Trend Chart */}
            {selectedProduct && (
                <ProductSalesTrend
                    productName={selectedProduct.name}
                    data={trendData}
                    forecastToday={selectedPlan?.suggested}
                />
            )}

            <div className="flex justify-end">
                <button className="bg-cafe-800 text-white px-6 md:px-8 py-3 rounded-xl shadow-lg hover:bg-cafe-900 flex items-center gap-2 font-medium">
                    <Save size={20} />
                    บันทึกใบสั่งผลิต (Job Order)
                </button>
            </div>
        </div>
    );
};

export default Production;
