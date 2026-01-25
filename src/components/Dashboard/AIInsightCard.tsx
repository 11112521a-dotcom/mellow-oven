// ============================================================
// 🧠 AI Insight Card Component
// Displays actionable business insights with action buttons
// 🛡️ Mellow Oven Standards Compliance:
// - #17: Accessibility (button elements, aria-labels)
// - #22: 44px min button size
// ============================================================

import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, Package, Trash2, DollarSign, Lightbulb, ArrowRight, XCircle } from 'lucide-react';
import { BusinessInsight, getInsightColors } from '@/src/lib/insights/BusinessInsightEngine';

interface AIInsightCardProps {
    insight: BusinessInsight;
    onAction?: (navigateTo: string) => void;
    onDismiss?: (id: string) => void;
}

const getIcon = (type: BusinessInsight['type'], severity: BusinessInsight['severity']) => {
    const size = 18;
    switch (type) {
        case 'production':
            return <Package size={size} />;
        case 'stock':
            return <AlertTriangle size={size} />;
        case 'waste':
            return <Trash2 size={size} />;
        case 'trend':
            return severity === 'success' ? <TrendingUp size={size} /> : <TrendingDown size={size} />;
        case 'cashflow':
            return <DollarSign size={size} />;
        default:
            return <Lightbulb size={size} />;
    }
};

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
    insight,
    onAction,
    onDismiss
}) => {
    const colors = getInsightColors(insight.severity);

    return (
        <div className={`
            relative rounded-xl p-4 border transition-all duration-200
            ${colors.bg} ${colors.border}
            hover:shadow-md
        `}>
            {/* Dismiss button */}
            {onDismiss && (
                <button
                    onClick={() => onDismiss(insight.id)}
                    className="absolute top-2 right-2 p-1 hover:bg-white/50 rounded-lg transition-colors"
                    aria-label="ปิดการแจ้งเตือน"
                >
                    <XCircle size={16} className="text-stone-400" />
                </button>
            )}

            {/* Header */}
            <div className="flex items-start gap-3 mb-2">
                <div className={`p-2 rounded-lg ${colors.bg} ${colors.icon}`}>
                    {getIcon(insight.type, insight.severity)}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className={`font-bold ${colors.text} text-sm`}>
                        {insight.title}
                    </h4>
                    <p className={`text-sm ${colors.text} opacity-80 mt-0.5`}>
                        {insight.message}
                    </p>
                </div>
            </div>

            {/* Recommendation */}
            {insight.recommendation && (
                <div className="mt-2 pl-11">
                    <p className="text-xs text-stone-600 bg-white/50 rounded-lg px-3 py-2 flex items-start gap-2">
                        <Lightbulb size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>{insight.recommendation}</span>
                    </p>
                </div>
            )}

            {/* Action Button */}
            {insight.action && onAction && (
                <div className="mt-3 pl-11">
                    <button
                        onClick={() => onAction(insight.action!.navigateTo)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                            bg-white hover:bg-white/80 transition-colors min-h-[44px]
                            ${colors.text} border ${colors.border}
                        `}
                        aria-label={insight.action.label}
                    >
                        {insight.action.label}
                        <ArrowRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AIInsightCard;
