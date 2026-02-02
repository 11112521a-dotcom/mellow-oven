import React from 'react';
import { TitanInsight } from '@/src/lib/analytics/titanEngine';
import { TrendingUp, TrendingDown, CloudRain, Sun, DollarSign, Heart, AlertTriangle, Zap, Crown, ArrowUpRight, Calendar, Droplets, Clock } from 'lucide-react';

interface TitanInsightsCardProps {
    insights: TitanInsight[];
    isLoading?: boolean;
}

export const TitanInsightsCard: React.FC<TitanInsightsCardProps> = ({ insights, isLoading }) => {
    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 animate-pulse">
                <div className="h-8 w-64 bg-slate-200 rounded mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="h-40 bg-slate-100 rounded-2xl"></div>
                    <div className="h-40 bg-slate-100 rounded-2xl"></div>
                    <div className="h-40 bg-slate-100 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    if (insights.length === 0) return null;

    // Helper to get icon based on type
    const getIcon = (insight: TitanInsight) => {
        const iconClass = "w-5 h-5"; // Standardized compact size

        if (insight.title.includes('Friday') || insight.title.includes('Weekend')) return <Calendar className={`text-purple-500 ${iconClass}`} />;
        if (insight.title.includes('Rain') || insight.title.includes('ฝน')) return <Droplets className={`text-blue-500 ${iconClass}`} />;

        if (insight.type === 'CONDITION_SENSITIVITY') {
            if (insight.title.includes('สิ้นเดือน')) return <DollarSign className={`text-emerald-500 ${iconClass}`} />;
            return <Clock className={`text-orange-500 ${iconClass}`} />;
        }
        if (insight.type === 'TREND_ALERT') {
            return insight.metricValue > 0
                ? <TrendingUp className={`text-emerald-500 ${iconClass}`} />
                : <TrendingDown className={`text-rose-500 ${iconClass}`} />;
        }
        if (insight.type === 'CORRELATION_MATCH') {
            return <Heart className={`text-pink-500 fill-pink-50 ${iconClass}`} />;
        }
        return <Zap className={`text-amber-500 ${iconClass}`} />;
    };

    // Helper for card styling
    const getCardStyle = (severity: string, type: string) => {
        if (type === 'CORRELATION_MATCH') return 'bg-gradient-to-br from-purple-50 via-white to-white border-purple-200 shadow-purple-50';
        switch (severity) {
            case 'CRITICAL': return 'bg-gradient-to-br from-rose-50 via-white to-white border-rose-100 shadow-rose-50';
            case 'HIGH': return 'bg-gradient-to-br from-orange-50 via-white to-white border-orange-100 shadow-orange-50';
            case 'MEDIUM': return 'bg-gradient-to-br from-blue-50 via-white to-white border-blue-100 shadow-blue-50';
            default: return 'bg-white border-slate-100';
        }
    };

    const formatMetric = (insight: TitanInsight) => {
        const val = Math.abs(insight.metricValue);
        return `${val.toFixed(0)}%`;
    };

    return (
        <div className="mb-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
                        Titan Pattern Recognition
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">ระบบค้นหาความสัมพันธ์และรูปแบบที่ซ่อนอยู่ (Hidden Patterns)</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {insights.slice(0, 6).map((insight, idx) => (
                    <div
                        key={`${insight.targetProductId}-${idx}`}
                        className={`group relative p-4 rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${getCardStyle(insight.severity, insight.type)}`}
                    >
                        {/* Top Row: Icon & Tag */}
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-50 group-hover:scale-110 transition-transform duration-300">
                                {getIcon(insight)}
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/80 border border-slate-100 text-slate-600">
                                {insight.type === 'CORRELATION_MATCH' ? 'Pairing' : insight.type.split('_')[1] || insight.type}
                            </span>
                        </div>

                        {/* Title & Description */}
                        <div className="mb-3">
                            <h3 className="font-bold text-slate-800 text-sm mb-1 leading-tight group-hover:text-amber-600 transition-colors truncate">
                                {insight.title}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mb-1.5 flex items-center gap-1 truncate">
                                {insight.targetProduct === 'Multiple Items' ? '📦 หลายรายการ' : `📦 ${insight.targetProduct}`}
                            </p>
                            <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 h-8">
                                {insight.description}
                            </p>
                        </div>

                        {/* Metric Display */}
                        <div className="flex items-center gap-2 mb-3 p-2 bg-white/50 rounded-lg border border-white/50 backdrop-blur-sm">
                            <div className="text-lg font-black text-slate-800">
                                {insight.metricValue > 0 ? '+' : ''}{formatMetric(insight)}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-tight">
                                {insight.metricLabel}
                                <div className="text-[9px] font-normal text-slate-400 normal-case">
                                    {insight.metricValue > 0 ? 'Stronger' : 'Weaker'}
                                </div>
                            </div>
                        </div>

                        {/* Actionable Advice */}
                        <div className="relative overflow-hidden bg-white rounded-lg p-2 text-slate-600 text-[10px] leading-relaxed border border-slate-100 shadow-sm">
                            <strong className="text-amber-500 block mb-0.5 flex items-center gap-1">
                                <Zap size={8} /> Tip:
                            </strong>
                            <span className="line-clamp-1">"{insight.actionableAdvice}"</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer - Only show if insights exist */}
            <div className="mt-6 text-center">
                <p className="text-xs text-slate-400">
                    *Analyzing {insights.length} hidden patterns from historical data
                </p>
            </div>
        </div>
    );
};
