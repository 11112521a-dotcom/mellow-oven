import React from 'react';
import { formatCurrency } from '@/src/lib/utils';
import { TrendingUp, TrendingDown, AlertCircle, Target, Sparkles } from 'lucide-react';

export interface SmartInsight {
    type: 'success' | 'warning' | 'info';
    message: string;
    action?: string;
}

interface SmartInsightsPanelProps {
    insights: SmartInsight[];
    confidence?: number;
    expectedProfit?: number;
    expectedCost?: number;
}

export const SmartInsightsPanel: React.FC<SmartInsightsPanelProps> = ({
    insights,
    confidence = 85,
    expectedProfit,
    expectedCost
}) => {
    const getIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <TrendingUp className="text-green-600" size={18} />;
            case 'warning':
                return <AlertCircle className="text-orange-600" size={18} />;
            default:
                return <Sparkles className="text-blue-600" size={18} />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200';
            case 'warning':
                return 'bg-orange-50 border-orange-200';
            default:
                return 'bg-blue-50 border-blue-200';
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6">
            <h3 className="text-lg font-bold text-cafe-800 mb-4 flex items-center gap-2">
                <Sparkles className="text-cafe-600" size={20} />
                💡 Smart Insights - คำแนะนำอัจฉริยะ
            </h3>

            {/* Confidence Score */}
            <div className="mb-4 flex items-center gap-3">
                <div className="flex-1">
                    <div className="flex justify-between text-xs text-cafe-500 mb-1">
                        <span>ความมั่นใจในการพยากรณ์</span>
                        <span className="font-bold">{confidence}%</span>
                    </div>
                    <div className="w-full bg-cafe-100 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full ${confidence >= 80 ? 'bg-green-500' : confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${confidence}%` }}
                        />
                    </div>
                </div>
                <div className="text-2xl font-bold text-cafe-900">
                    {confidence >= 85 ? '⭐⭐⭐⭐' : confidence >= 70 ? '⭐⭐⭐' : '⭐⭐'}
                </div>
            </div>

            {/* Expected Performance */}
            {(expectedProfit !== undefined || expectedCost !== undefined) && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {expectedCost !== undefined && (
                        <div className="bg-cafe-50 p-3 rounded-lg">
                            <p className="text-xs text-cafe-500">ต้นทุนคาดการณ์</p>
                            <p className="text-lg font-bold text-cafe-900">{formatCurrency(expectedCost)}</p>
                        </div>
                    )}
                    {expectedProfit !== undefined && (
                        <div className="bg-green-50 p-3 rounded-lg">
                            <p className="text-xs text-green-600">กำไรคาดการณ์</p>
                            <p className="text-lg font-bold text-green-700">{formatCurrency(expectedProfit)}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Insights List */}
            <div className="space-y-2">
                {insights.length === 0 ? (
                    <p className="text-sm text-cafe-400 text-center py-4">
                        ไม่มีคำแนะนำในขณะนี้
                    </p>
                ) : (
                    insights.map((insight, index) => (
                        <div
                            key={index}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${getBgColor(insight.type)}`}
                        >
                            <div className="mt-0.5">{getIcon(insight.type)}</div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-cafe-800">{insight.message}</p>
                                {insight.action && (
                                    <p className="text-xs text-cafe-600 mt-1">→ {insight.action}</p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
