import React, { useState } from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import {
    Target, ArrowUpRight, ArrowDownRight, Package, AlertTriangle,
    ChevronDown, Store, Info, Trash2
} from 'lucide-react';
import { AccuracyAnalysisResult } from '@/src/lib/forecasting/accuracyAnalytics';

interface Props {
    data: AccuracyAnalysisResult;
    title?: string; // Optional title override
}

export const AccuracyDashboard: React.FC<Props> = ({ data, title }) => {
    if (!data) return null;

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Enhanced Summary Card */}
            {data.summary && (
                <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <div className="text-center">
                            <div className="text-4xl font-black mb-1">
                                {data.summary.overallAccuracy.toFixed(1)}%
                            </div>
                            <div className="text-purple-200 text-sm">ความแม่นยำ</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-black mb-1 flex items-center justify-center gap-1">
                                {data.summary.overallBiasPercent >= 0 ? (
                                    <ArrowUpRight size={24} className="text-orange-300" />
                                ) : (
                                    <ArrowDownRight size={24} className="text-blue-300" />
                                )}
                                {Math.abs(data.summary.overallBiasPercent).toFixed(0)}%
                            </div>
                            <div className="text-purple-200 text-sm">
                                {data.summary.overallBiasPercent >= 0 ? 'มักผลิตเกิน' : 'มักผลิตขาด'}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-black mb-1 text-orange-300">
                                {data.summary.totalWasteQty}
                            </div>
                            <div className="text-purple-200 text-sm">🗑️ ผลิตเกิน (ชิ้น)</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-black mb-1 text-red-300">
                                {data.summary.totalStockoutQty}
                            </div>
                            <div className="text-purple-200 text-sm">⚠️ ขาดขาย (ชิ้น)</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold mb-1 text-orange-300">
                                ฿{data.summary.totalWasteCost.toLocaleString()}
                            </div>
                            <div className="text-purple-200 text-sm">💸 ต้นทุนเสีย</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold mb-1 text-red-300">
                                ฿{data.summary.totalStockoutRevenue.toLocaleString()}
                            </div>
                            <div className="text-purple-200 text-sm">📉 โอกาสเสีย</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
                        <div className="text-center text-sm">
                            <span className="text-purple-200">📅 บันทึกแผน:</span> {data.summary.totalDays} วัน
                        </div>
                        <div className="text-center text-sm">
                            <span className="text-purple-200">✅ มียอดขาย:</span> {data.summary.daysWithData} วัน
                        </div>
                        <div className="text-center text-sm">
                            <span className="text-purple-200">📦 ทั้งหมด:</span> {data.summary.totalForecasts} รายการ
                        </div>
                    </div>
                    {data.summary.overallAccuracy >= 80 && (
                        <div className="mt-4 text-center bg-white/10 rounded-lg p-3">
                            🎯 ยอดเยี่ยม! การพยากรณ์แม่นยำมาก
                        </div>
                    )}
                </div>
            )}

            {/* Day-of-Week Analysis */}
            {data.dayAccuracy && (
                <div className="bg-white border border-cafe-200 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-cafe-900 mb-4 flex items-center gap-2">
                        📅 ความแม่นยำแบ่งตามวัน
                    </h3>
                    <div className="grid grid-cols-7 gap-2">
                        {data.dayAccuracy.map((day) => (
                            <div key={day.day} className={`p-3 rounded-xl text-center ${day.sampleSize === 0 ? 'bg-gray-100' :
                                day.accuracy >= 80 ? 'bg-green-50 border border-green-200' :
                                    day.accuracy >= 60 ? 'bg-yellow-50 border border-yellow-200' :
                                        'bg-red-50 border border-red-200'
                                }`}>
                                <div className="text-xs text-gray-600 mb-1">{day.dayName}</div>
                                <div className={`text-xl font-black ${day.sampleSize === 0 ? 'text-gray-400' :
                                    day.accuracy >= 80 ? 'text-green-600' :
                                        day.accuracy >= 60 ? 'text-yellow-600' : 'text-red-500'
                                    }`}>
                                    {day.sampleSize === 0 ? '-' : `${day.accuracy.toFixed(0)}%`}
                                </div>
                                <div className="text-[10px] text-gray-400">{day.sampleSize} วัน</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Product Accuracy Ranking */}
            {data.productAccuracy && data.productAccuracy.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Top Performers */}
                    <div className="bg-white border border-green-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center gap-2">
                            🏆 สินค้าที่ทายแม่นที่สุด
                        </h3>
                        <div className="space-y-2">
                            {data.productAccuracy.filter(p => p.sampleSize > 0).slice(0, 5).map((product, idx) => (
                                <div key={product.productId} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                                    <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '✅'}</span>
                                    <div className="flex-1 text-sm font-medium text-gray-800 truncate">{product.productName}</div>
                                    <div className="text-green-700 font-bold">{product.accuracy.toFixed(0)}%</div>
                                </div>
                            ))}
                            {data.productAccuracy.filter(p => p.sampleSize > 0).length === 0 && (
                                <div className="text-center text-gray-400 py-4">ยังไม่มีข้อมูล</div>
                            )}
                        </div>
                    </div>

                    {/* Need Improvement */}
                    <div className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                            ⚠️ สินค้าที่ต้องปรับปรุง
                        </h3>
                        <div className="space-y-2">
                            {data.productAccuracy.filter(p => p.sampleSize > 0).slice(-5).reverse().map((product) => (
                                <div key={product.productId} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
                                    <span className="text-lg">{product.biasPercent > 0 ? '📈' : '📉'}</span>
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-800 truncate">{product.productName}</div>
                                        <div className="text-xs text-gray-500">
                                            {product.biasPercent > 0 ? `มักเกิน ${product.biasPercent.toFixed(0)}%` : `มักขาด ${Math.abs(product.biasPercent).toFixed(0)}%`}
                                        </div>
                                    </div>
                                    <div className="text-red-600 font-bold">{product.accuracy.toFixed(0)}%</div>
                                </div>
                            ))}
                            {data.productAccuracy.filter(p => p.sampleSize > 0).length === 0 && (
                                <div className="text-center text-gray-400 py-4">ยังไม่มีข้อมูล</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* AI Recommendations */}
            {data.recommendations && data.recommendations.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px] rounded-2xl">
                    <div className="bg-white rounded-2xl p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            🤖 AI แนะนำการปรับปรุง
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {data.recommendations.map((rec, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border ${rec.priority === 'high' ? 'bg-red-50 border-red-200' :
                                    'bg-yellow-50 border-yellow-200'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">
                                            {rec.type === 'market' ? '📍' : rec.type === 'product' ? '📦' : '📅'}
                                        </span>
                                        <span className="font-bold text-gray-800">{rec.target}</span>
                                        {rec.priority === 'high' && (
                                            <span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded-full">สำคัญ</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1">❌ {rec.issue}</p>
                                    <p className="text-sm text-green-700 font-medium">💡 {rec.suggestion}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Comparisons */}
            {data.comparisons.map((summary) => (
                <div key={summary.date} className="bg-white border border-cafe-200 rounded-xl p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                {new Date(summary.date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                <div className="group relative">
                                    <Info size={16} className="text-cafe-400 cursor-help" />
                                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-gray-800 text-white text-xs p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                        <strong>📊 ข้อมูลนี้มาจากไหน?</strong><br />
                                        • แผน (AI): ค่าที่ AI คำนวณให้ตอนเช้า<br />
                                        • จริง (Actual): ยอดขายที่คุณบันทึกในหน้า "Daily Sales"
                                    </div>
                                </div>
                            </h3>
                            <p className="text-sm text-cafe-500">
                                เปรียบเทียบสิ่งที่ AI คิด vs สิ่งที่คุณขายได้จริง
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="text-xs text-cafe-500 mb-1">💸 เงินจม (ของเหลือ)</div>
                                <div className="font-bold text-orange-600">฿{summary.records.reduce((s, r) => s + r.wasteCost, 0).toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-cafe-500 mb-1">📉 เงินหาย (ของขาด)</div>
                                <div className="font-bold text-red-600">฿{summary.records.reduce((s, r) => s + r.stockoutRevenue, 0).toLocaleString()}</div>
                            </div>
                            <div className="text-right pl-4 border-l border-cafe-200">
                                <div className={`text-3xl font-black ${summary.accuracy >= 80 ? 'text-green-600' : summary.accuracy >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                                    {summary.accuracy.toFixed(1)}%
                                </div>
                                <div className="text-xs text-cafe-500">ความแม่นยำรวม</div>
                            </div>
                        </div>
                    </div>

                    {/* Compare Chart - Top 10 Divergence */}
                    <div className="h-[400px] mb-8 bg-white border border-cafe-100 rounded-2xl p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-cafe-800 mb-6 flex items-center gap-2">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                <Store size={20} />
                            </div>
                            10 อันดับที่ต้องจับตามอง (AI vs ขายจริง)
                        </h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={Object.values(summary.records.reduce((acc, r) => {
                                    if (!acc[r.productId]) acc[r.productId] = { ...r, forecastQty: 0, actualQty: 0, diff: 0 };
                                    acc[r.productId].forecastQty += r.forecastQty;
                                    acc[r.productId].actualQty += r.actualQty;
                                    acc[r.productId].diff += r.diff;
                                    acc[r.productId].wasteCost += r.wasteCost;
                                    acc[r.productId].stockoutRevenue += r.stockoutRevenue;
                                    return acc;
                                }, {} as Record<string, any>))
                                    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
                                    .slice(0, 10)
                                }
                                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                                barGap={8}
                            >
                                <defs>
                                    <linearGradient id="colorPlan" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                    </linearGradient>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="productName"
                                    fontSize={11}
                                    angle={-45}
                                    textAnchor="end"
                                    interval={0}
                                    height={80}
                                    tick={{ fill: '#64748b' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc', opacity: 0.8 }}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white/95 backdrop-blur-sm border border-cafe-200 rounded-xl shadow-xl p-4 min-w-[200px]">
                                                    <p className="font-bold text-cafe-900 mb-2 border-b border-cafe-100 pb-2">{label}</p>
                                                    {payload.map((entry: any, index: number) => (
                                                        <div key={index} className="flex items-center justify-between gap-4 mb-1">
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <div
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{ backgroundColor: entry.color === 'url(#colorPlan)' ? '#8b5cf6' : '#10b981' }}
                                                                />
                                                                <span className="text-gray-500">
                                                                    {entry.name === 'Plan' ? 'AI แนะนำ' : 'ขายจริง'}
                                                                </span>
                                                            </div>
                                                            <span className={`font-bold ${entry.name === 'Plan' ? 'text-purple-600' : 'text-green-600'}`}>
                                                                {entry.value} ชิ้น
                                                            </span>
                                                        </div>
                                                    ))}
                                                    <div className="mt-2 pt-2 border-t border-cafe-100 text-xs text-center text-gray-400">
                                                        {Math.abs(payload[0].value - payload[1].value) > 0
                                                            ? `ต่างกัน ${Math.abs(payload[0].value - payload[1].value)} ชิ้น`
                                                            : 'ตรงกันเป๊ะ! ✨'}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    formatter={(value) => <span className="text-sm font-medium text-cafe-600 ml-1">{value}</span>}
                                />
                                <Bar
                                    dataKey="forecastQty"
                                    name="Plan"
                                    fill="url(#colorPlan)"
                                    radius={[8, 8, 0, 0]}
                                    barSize={24}
                                    animationDuration={1500}
                                />
                                <Bar
                                    dataKey="actualQty"
                                    name="Actual"
                                    fill="url(#colorActual)"
                                    radius={[8, 8, 0, 0]}
                                    barSize={24}
                                    animationDuration={1500}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Comparisons Table */}
                    <div className="overflow-x-auto rounded-lg border border-cafe-200">
                        <table className="w-full text-sm">
                            <thead className="bg-cafe-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-cafe-600 font-semibold">สินค้า</th>
                                    <th className="px-4 py-3 text-center text-purple-700 font-semibold bg-purple-50">🤖 AI แนะนำ</th>
                                    <th className="px-4 py-3 text-center text-green-700 font-semibold bg-green-50">💵 ขายจริง</th>
                                    <th className="px-4 py-3 text-right text-cafe-600 font-semibold">ผลต่าง (Diff)</th>
                                    <th className="px-4 py-3 text-right text-cafe-600 font-semibold">สถานะ</th>
                                    <th className="px-4 py-3 text-right text-cafe-600 font-semibold">มูลค่าเสียหาย</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cafe-100">
                                {Object.values(summary.records.reduce((acc, r) => {
                                    if (!acc[r.productId]) {
                                        acc[r.productId] = { ...r, forecastQty: 0, actualQty: 0, diff: 0, wasteCost: 0, stockoutRevenue: 0 };
                                    }
                                    acc[r.productId].forecastQty += r.forecastQty;
                                    acc[r.productId].actualQty += r.actualQty;
                                    acc[r.productId].diff += r.diff;
                                    acc[r.productId].wasteCost += r.wasteCost;
                                    acc[r.productId].stockoutRevenue += r.stockoutRevenue;
                                    return acc;
                                }, {} as Record<string, typeof summary.records[0]>))
                                    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)) // Sort by biggest mistake
                                    .map(r => (
                                        <tr key={r.productId} className="hover:bg-cafe-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-cafe-900 border-r border-cafe-100">{r.productName}</td>
                                            <td className="px-4 py-3 text-center text-purple-700 font-bold bg-purple-50/50">{r.forecastQty}</td>
                                            <td className="px-4 py-3 text-center text-green-700 font-bold bg-green-50/50">{r.actualQty}</td>
                                            <td className="px-4 py-3 text-right font-mono">
                                                <span className={`${r.diff > 0 ? 'text-orange-500' : r.diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                    {r.diff > 0 ? '+' : ''}{r.diff}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {r.diff > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                        เหลือทิ้ง
                                                    </span>
                                                ) : r.diff < 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                        ของขาด
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        แม่นเป๊ะ
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                {r.wasteCost > 0 && (
                                                    <span className="text-orange-600 block">-{r.wasteCost.toLocaleString()} บ.</span>
                                                )}
                                                {r.stockoutRevenue > 0 && (
                                                    <span className="text-red-600 block">-{r.stockoutRevenue.toLocaleString()} บ.</span>
                                                )}
                                                {r.wasteCost === 0 && r.stockoutRevenue === 0 && (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            {/* Empty State */}
            {(!data.comparisons || data.comparisons.length === 0) && (
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
                                <div className="text-sm text-cafe-500">เมื่อถึงวันนั้น บันทึกยอดขายจริงในหน้า "Daily Sales"</div>
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
    );
};
