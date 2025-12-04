import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/src/lib/utils';

interface MarketComparisonChartProps {
    data: Array<{
        marketName: string;
        revenue: number;
        profit: number;
        quantity: number;
    }>;
    mode: 'revenue' | 'profit' | 'quantity';
}

export const MarketComparisonChart: React.FC<MarketComparisonChartProps> = ({ data, mode }) => {
    const getModeConfig = () => {
        switch (mode) {
            case 'revenue':
                return {
                    title: 'รายรับแยกตามตลาด',
                    dataKey: 'revenue',
                    color: '#3b82f6',
                    formatter: formatCurrency
                };
            case 'profit':
                return {
                    title: 'กำไรแยกตามตลาด',
                    dataKey: 'profit',
                    color: '#22c55e',
                    formatter: formatCurrency
                };
            case 'quantity':
                return {
                    title: 'จำนวนสินค้าแยกตามตลาด',
                    dataKey: 'quantity',
                    color: '#8b5cf6',
                    formatter: (value: number) => `${value.toLocaleString()} ชิ้น`
                };
        }
    };

    const config = getModeConfig();

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-cafe-200">
                    <p className="text-sm font-bold text-cafe-800 mb-2">{payload[0].payload.marketName}</p>
                    <p className="text-sm text-blue-600">
                        รายรับ: <span className="font-bold">{formatCurrency(payload[0].payload.revenue)}</span>
                    </p>
                    <p className="text-sm text-green-600">
                        กำไร: <span className="font-bold">{formatCurrency(payload[0].payload.profit)}</span>
                    </p>
                    <p className="text-sm text-purple-600">
                        จำนวน: <span className="font-bold">{payload[0].payload.quantity.toLocaleString()} ชิ้น</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-lg font-bold text-cafe-800 mb-4">🏪 {config.title}</h3>
            {data.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-cafe-500">
                    ไม่มีข้อมูล
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="marketName"
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(value) =>
                                mode === 'quantity'
                                    ? value
                                    : `฿${(value / 1000).toFixed(0)}k`
                            }
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey={config.dataKey}
                            fill={config.color}
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};
