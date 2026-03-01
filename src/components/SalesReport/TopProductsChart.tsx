import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/src/lib/utils';

interface TopProductsChartProps {
    data: Array<{
        productName: string;
        value: number;
        category: string;
    }>;
    mode: 'quantity' | 'revenue' | 'profit';
}

const COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#6366f1', // Indigo
];

export const TopProductsChart: React.FC<TopProductsChartProps> = ({ data, mode }) => {
    const getModeLabel = () => {
        switch (mode) {
            case 'quantity': return 'จำนวน (ชิ้น)';
            case 'revenue': return 'รายรับ (฿)';
            case 'profit': return 'กำไร (฿)';
        }
    };

    const formatValue = (value: number) => {
        if (mode === 'quantity') {
            return value.toLocaleString();
        }
        return formatCurrency(value);
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-cafe-200">
                    <p className="text-sm font-bold text-cafe-800 mb-1">{payload[0].payload.productName}</p>
                    <p className="text-xs text-cafe-500 mb-2">{payload[0].payload.category}</p>
                    <p className="text-sm font-semibold text-blue-600">
                        {getModeLabel()}: {formatValue(payload[0].value)}
                    </p>
                </div>
            );
        }
        return null;
    };

    const topData = data.slice(0, 10);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-cafe-100 p-6 hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-bold text-cafe-800 mb-6 flex items-center gap-2">
                <span className="bg-cafe-100 p-2 rounded-xl">🏆</span> Top 10 เมนูขายดี ({getModeLabel()})
            </h3>
            {topData.length === 0 ? (
                <div className="h-80 flex flex-col items-center justify-center text-cafe-400 bg-cafe-50/50 rounded-2xl border border-dashed border-cafe-200">
                    <span className="text-2xl mb-2">🏆</span>
                    <p>ยังไม่มีข้อมูลเพียงพอ</p>
                </div>
            ) : (
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={topData}
                            layout="vertical"
                            margin={{ top: 0, right: 30, left: 100, bottom: 0 }}
                        >
                            <defs>
                                {topData.map((_, index) => (
                                    <linearGradient key={`grad-${index}`} id={`colorGrad-${index}`} x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.6} />
                                        <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                type="number"
                                stroke="#94a3b8"
                                fontSize={12}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => mode === 'quantity' ? value : `฿${(value / 1000).toFixed(0)}k`}
                            />
                            <YAxis
                                dataKey="productName"
                                type="category"
                                stroke="#64748b"
                                fontSize={12}
                                fontWeight={500}
                                axisLine={false}
                                tickLine={false}
                                width={90}
                                tick={{ fill: '#475569' }}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar
                                dataKey="value"
                                radius={[0, 8, 8, 0]}
                                barSize={24}
                                animationDuration={1200}
                                animationEasing="ease-out"
                            >
                                {topData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#colorGrad-${index})`} className="hover:opacity-80 transition-opacity" />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};
