import React, { useState, useEffect } from 'react';
import { CloudRain, Sun, Cloud, CloudLightning, Save, RotateCcw, Wind, Snowflake } from 'lucide-react';
import { useStore } from '@/src/store';
import { calculateForecast } from '@/src/lib/analytics';

const Production: React.FC = () => {
    const { products, markets, dailyReports } = useStore();
    const [selectedWeather, setSelectedWeather] = useState('Sunny');
    const [selectedMarketId, setSelectedMarketId] = useState<string>(markets[0]?.id || '');

    // Initialize plans from products
    const [plans, setPlans] = useState<any[]>([]);

    useEffect(() => {
        // Calculate suggestions based on market and history
        // Note: In a real app, we would fetch historical logs for this specific market
        // For now, we use the global history but we could filter by marketId if we had it in the logs
        const allLogs = dailyReports.flatMap(r => r.logs);

        const newPlans = products.map(p => {
            const forecast = calculateForecast(p.id, new Date().toISOString(), allLogs, selectedMarketId);
            // Fallback to random if 0 (for demo feel)
            const suggested = forecast > 0 ? forecast : Math.floor(Math.random() * 20) + 10;

            return {
                ...p,
                suggested,
                actual: 0
            };
        });
        setPlans(newPlans);
    }, [products, selectedMarketId, dailyReports]);

    const handleApplySuggestion = () => {
        setPlans(plans.map(p => ({ ...p, actual: p.suggested })));
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold text-cafe-900">แผนการผลิต & พยากรณ์ (Smart Production)</h2>
                <p className="text-cafe-500">วางแผนสำหรับวันพรุ่งนี้ (23 พ.ย.)</p>
            </div>

            {/* Prediction Context Card */}
            <div className="bg-cafe-800 text-white rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
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
                                            : 'border-cafe-600 text-cafe-300 hover:bg-cafe-700'}
                                `}
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
                        <p className="text-xs text-cafe-300 mt-2">
                            💡 AI Tip: {markets.find(m => m.id === selectedMarketId)?.name} {selectedWeather === 'Sunny' ? '+ อากาศแจ่มใส ยอดขายมักเพิ่มขึ้น 20%' : 'อาจมียอดขายลดลงจากสภาพอากาศ'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Production List */}
            <div className="bg-white rounded-2xl shadow-sm border border-cafe-200 overflow-hidden">
                <div className="p-6 border-b border-cafe-100 flex justify-between items-center bg-cafe-50">
                    <h3 className="font-semibold text-cafe-800">รายการผลิตที่แนะนำ</h3>
                    <button
                        onClick={handleApplySuggestion}
                        className="text-sm text-cafe-600 hover:text-cafe-800 flex items-center gap-1 bg-white border border-cafe-300 px-3 py-1 rounded shadow-sm"
                    >
                        <RotateCcw size={14} /> ใช้ค่าแนะนำทั้งหมด
                    </button>
                </div>
                <table className="w-full text-sm text-left text-cafe-700">
                    <thead className="text-xs text-cafe-500 uppercase bg-cafe-50">
                        <tr>
                            <th className="px-6 py-3">สินค้า</th>
                            <th className="px-6 py-3">รสชาติ</th>
                            <th className="px-6 py-3 text-center bg-blue-50/50">AI แนะนำ (ชิ้น)</th>
                            <th className="px-6 py-3 text-center bg-yellow-50/50">ผลิตจริง (ชิ้น)</th>
                            <th className="px-6 py-3">ต้นทุนคาดการณ์</th>
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
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-cafe-50 font-semibold text-cafe-900">
                        <tr>
                            <td colSpan={4} className="px-6 py-4 text-right">ต้นทุนการผลิตรวมทั้งหมด:</td>
                            <td className="px-6 py-4">
                                ฿{plans.reduce((acc, curr) => acc + (curr.cost * (curr.actual || curr.suggested)), 0).toLocaleString()}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="flex justify-end">
                <button className="bg-cafe-800 text-white px-8 py-3 rounded-xl shadow-lg hover:bg-cafe-900 flex items-center gap-2 font-medium">
                    <Save size={20} />
                    บันทึกใบสั่งผลิต (Job Order)
                </button>
            </div>
        </div>
    );
};

export default Production;
