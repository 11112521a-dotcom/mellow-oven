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
        <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="text-lg font-bold text-cafe-800 mb-4">
                🏆 Top 10 เมนูขายดี ({getModeLabel()})
            </h3>
            {topData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-cafe-500">
                    ไม่มีข้อมูล
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={topData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            type="number"
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                            tickFormatter={(value) => mode === 'quantity' ? value : `฿${(value / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                            dataKey="productName"
                            type="category"
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                            width={90}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                            {topData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
};
