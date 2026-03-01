import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/src/lib/utils';

interface RevenueTrendChartProps {
    data: Array<{
        date: string;
        revenue: number;
        profit: number;
    }>;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ data }) => {
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-cafe-200">
                    <p className="text-sm font-medium text-cafe-800 mb-1">{payload[0].payload.date}</p>
                    <p className="text-sm text-blue-600">
                        รายรับ: <span className="font-bold">{formatCurrency(payload[0].value)}</span>
                    </p>
                    <p className="text-sm text-green-600">
                        กำไร: <span className="font-bold">{formatCurrency(payload[1].value)}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-cafe-100 p-6 hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-bold text-cafe-800 mb-6 flex items-center gap-2">
                <span className="bg-cafe-100 p-2 rounded-xl">📈</span> แนวโน้มรายรับและกำไร
            </h3>
            {data.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-cafe-400 bg-cafe-50/50 rounded-2xl border border-dashed border-cafe-200">
                    <span className="text-2xl mb-2">📊</span>
                    <p>ยังไม่มีข้อมูลเพียงพอ</p>
                </div>
            ) : (
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                stroke="#94a3b8"
                                fontSize={12}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={12}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} iconType="circle" />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#3b82f6"
                                strokeWidth={4}
                                name="รายรับ"
                                dot={false}
                                activeDot={{ r: 6, fill: "#3b82f6", strokeWidth: 0, className: "shadow-lg shadow-blue-500/50" }}
                                animationDuration={1500}
                                fill="url(#colorRevenue)"
                            />
                            <Line
                                type="monotone"
                                dataKey="profit"
                                stroke="#10b981"
                                strokeWidth={4}
                                name="กำไร"
                                dot={false}
                                activeDot={{ r: 6, fill: "#10b981", strokeWidth: 0, className: "shadow-lg shadow-green-500/50" }}
                                animationDuration={1500}
                                fill="url(#colorProfit)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
