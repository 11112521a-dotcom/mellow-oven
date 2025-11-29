import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface SalesTrendData {
    date: string;
    sold: number;
    dayOfWeek: number;
}

interface ProductSalesTrendProps {
    productName: string;
    data: SalesTrendData[];
    forecastToday?: number;
}

export const ProductSalesTrend: React.FC<ProductSalesTrendProps> = ({
    productName,
    data,
    forecastToday
}) => {
    // Add forecast point to the data
    const chartData = [...data];
    if (forecastToday) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        chartData.push({
            date: tomorrow.toISOString().split('T')[0],
            sold: forecastToday,
            dayOfWeek: tomorrow.getDay()
        });
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6">
            <h3 className="text-lg font-bold text-cafe-800 mb-4 flex items-center gap-2">
                <TrendingUp className="text-cafe-600" size={20} />
                📈 Sales Trend - {productName}
            </h3>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getDate()}/${date.getMonth() + 1}`;
                            }}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
                                    return (
                                        <div className="bg-white p-3 rounded-lg shadow-lg border border-cafe-200">
                                            <p className="text-xs text-cafe-500">{data.date}</p>
                                            <p className="text-sm font-bold text-cafe-900">
                                                ขายได้: {data.sold} ชิ้น
                                            </p>
                                            <p className="text-xs text-cafe-600">
                                                {dayNames[data.dayOfWeek]}
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="sold"
                            stroke="#b08968"
                            strokeWidth={2}
                            dot={{ fill: '#b08968', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cafe-600" />
                    <span className="text-cafe-600">ยอดขายจริง</span>
                </div>
                {forecastToday && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-600" />
                        <span className="text-blue-600">พยากรณ์วันพรุ่งนี้</span>
                    </div>
                )}
            </div>
        </div>
    );
};
