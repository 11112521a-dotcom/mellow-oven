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
        <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-lg font-bold text-cafe-800 mb-4">📈 รายรับตามวัน (Revenue Trend)</h3>
            {data.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-cafe-500">
                    ไม่มีข้อมูล
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            wrapperStyle={{ fontSize: '14px' }}
                            iconType="line"
                        />
                        <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            name="รายรับ"
                            dot={{ fill: '#3b82f6', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="profit"
                            stroke="#22c55e"
                            strokeWidth={3}
                            name="กำไร"
                            dot={{ fill: '#22c55e', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};
