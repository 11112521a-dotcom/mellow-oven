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
        <div className="bg-white rounded-3xl shadow-sm border border-cafe-100 p-6 hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-bold text-cafe-800 mb-6 flex items-center gap-2">
                <span className="bg-cafe-100 p-2 rounded-xl">🏪</span> {config.title}
            </h3>
            {data.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-cafe-400 bg-cafe-50/50 rounded-2xl border border-dashed border-cafe-200">
                    <span className="text-2xl mb-2">🏪</span>
                    <p>ยังไม่มีข้อมูลเปรียบเทียบตลาด</p>
                </div>
            ) : (
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={config.color} stopOpacity={0.9} />
                                    <stop offset="100%" stopColor={config.color} stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="marketName"
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
                                tickFormatter={(value) =>
                                    mode === 'quantity'
                                        ? value
                                        : `฿${(value / 1000).toFixed(0)}k`
                                }
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar
                                dataKey={config.dataKey}
                                fill="url(#barGradient)"
                                radius={[6, 6, 0, 0]}
                                barSize={40}
                                animationDuration={1000}
                                animationEasing="ease-out"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
