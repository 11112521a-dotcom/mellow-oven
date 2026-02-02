import React from 'react';
import { OraclePattern } from '@/src/lib/oracle/oracleEngine';
import { Sparkles, Zap, AlertTriangle, TrendingUp, TrendingDown, CloudRain, Sun, Calendar, DollarSign, Clock, ArrowRight, Store } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils'; // Keep import, though mostly formatting numbers

interface OracleInsightCardProps {
    patterns: OraclePattern[];
    isLoading?: boolean;
}

// Optimization: Pre-compute regex
const HIGHLIGHT_REGEX = /(\*\*.*?\*\*)/g;

export const OracleInsightCard: React.FC<OracleInsightCardProps> = ({ patterns, isLoading }) => {
    // Helper to render text with highlights
    const renderHighlightedText = (text: string, type: OraclePattern['type']) => {
        const parts = text.split(HIGHLIGHT_REGEX);
        // Determine highlight color based on type
        const highlightClass = type === 'PERFECT_STORM' ? 'text-indigo-700 bg-indigo-50/80' :
            type === 'SILENT_KILLER' ? 'text-rose-700 bg-rose-50/80' :
                'text-emerald-700 bg-emerald-50/80';

        return (
            <span>
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        const content = part.slice(2, -2);
                        return <span key={i} className={`font-bold px-1 rounded mx-0.5 ${highlightClass}`}>{content}</span>;
                    }
                    return <span key={i}>{part}</span>;
                })}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 animate-pulse">
                <div className="h-8 w-64 bg-slate-200 rounded mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-48 bg-slate-100 rounded-2xl"></div>
                    <div className="h-48 bg-slate-100 rounded-2xl"></div>
                </div>
            </div>
        );
    }

    if (patterns.length === 0) return null;

    // Helper: Style based on Pattern Type
    const getStyle = (type: OraclePattern['type']) => {
        switch (type) {
            case 'PERFECT_STORM':
                return {
                    bg: 'bg-gradient-to-br from-indigo-50 via-purple-50 to-amber-50',
                    border: 'border-indigo-100',
                    iconBg: 'bg-indigo-100 text-indigo-600',
                    title: 'text-indigo-900',
                    badge: 'bg-indigo-100/50 text-indigo-700 border-indigo-200'
                };
            case 'SILENT_KILLER':
                return {
                    bg: 'bg-gradient-to-br from-rose-50 via-red-50 to-orange-50',
                    border: 'border-rose-100',
                    iconBg: 'bg-rose-100 text-rose-600',
                    title: 'text-rose-900',
                    badge: 'bg-rose-100/50 text-rose-700 border-rose-200'
                };
            case 'OPPORTUNITY':
                return {
                    bg: 'bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50',
                    border: 'border-emerald-100',
                    iconBg: 'bg-emerald-100 text-emerald-600',
                    title: 'text-emerald-900',
                    badge: 'bg-emerald-100/50 text-emerald-700 border-emerald-200'
                };
            case 'POWER_COUPLE':
                return {
                    bg: 'bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50',
                    border: 'border-green-200',
                    iconBg: 'bg-green-100 text-green-600',
                    title: 'text-green-900',
                    badge: 'bg-green-100/50 text-green-700 border-green-200'
                };
            case 'COMPETITOR':
                return {
                    bg: 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50',
                    border: 'border-amber-200',
                    iconBg: 'bg-amber-100 text-amber-600',
                    title: 'text-amber-900',
                    badge: 'bg-amber-100/50 text-amber-700 border-amber-200'
                };
            case 'CANNIBAL':
                return {
                    bg: 'bg-gradient-to-br from-red-50 via-rose-50 to-pink-50',
                    border: 'border-red-200',
                    iconBg: 'bg-red-100 text-red-600',
                    title: 'text-red-900',
                    badge: 'bg-red-100/50 text-red-700 border-red-200'
                };
            default:
                return {
                    bg: 'bg-white',
                    border: 'border-slate-100',
                    iconBg: 'bg-slate-100',
                    title: 'text-slate-800',
                    badge: 'bg-slate-100 text-slate-600'
                };
        }
    };

    const getTypeLabel = (type: OraclePattern['type']) => {
        if (type === 'PERFECT_STORM') return { label: 'THE PERFECT STORM', icon: <Sparkles size={14} /> };
        if (type === 'SILENT_KILLER') return { label: 'THE SILENT KILLER', icon: <AlertTriangle size={14} /> };
        if (type === 'POWER_COUPLE') return { label: 'POWER COUPLE 💑', icon: <TrendingUp size={14} /> };
        if (type === 'COMPETITOR') return { label: 'COMPETITOR ⚔️', icon: <TrendingDown size={14} /> };
        if (type === 'CANNIBAL') return { label: 'CANNIBAL ALERT 🦈', icon: <AlertTriangle size={14} /> };
        return { label: 'HIDDEN OPPORTUNITY', icon: <TrendingUp size={14} /> };
    };

    return (
        <div className="mb-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-violet-200">
                            <Zap size={18} fill="currentColor" />
                        </div>
                        The Oracle Core
                    </h2>
                    <p className="text-slate-500 text-sm mt-1 ml-10">
                        Hyper-Pattern Mining Engine (6 Dimensions Analysis)
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {patterns.map((pattern) => {
                    const style = getStyle(pattern.type);
                    const label = getTypeLabel(pattern.type);

                    return (
                        <div
                            key={pattern.id}
                            className={`relative overflow-hidden rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all duration-300 group ${style.bg} ${style.border}`}
                        >
                            {/* Decorative Background Blur */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            {/* Type Header */}
                            <div className="flex items-center justify-between mb-4 relative">
                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border border-white/50 backdrop-blur-sm shadow-sm ${style.iconBg.replace('bg-', 'text-').replace('text-', 'bg-').replace('100', '500').replace('600', 'white')}`}>
                                    {label.icon}
                                    {label.label}
                                </span>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm border border-white/50 ${style.iconBg.replace('bg-', 'text-')}`}>
                                    {pattern.type === 'PERFECT_STORM' && <Zap size={16} fill="currentColor" />}
                                    {pattern.type === 'SILENT_KILLER' && <TrendingDown size={16} />}
                                    {pattern.type === 'OPPORTUNITY' && <TrendingUp size={16} />}
                                </div>
                            </div>

                            {/* Product & Context */}
                            <div className="mb-4 relative">
                                <h3 className={`text-lg font-black leading-tight mb-2 ${style.title}`}>
                                    {pattern.productName}
                                </h3>
                                {/* Dimension Tags */}
                                <div className="flex flex-wrap gap-1.5">
                                    {Object.entries(pattern.dimensions).map(([key, value]) => {
                                        // Tag Translation Logic
                                        let displayValue = value;
                                        if (key === 'day') {
                                            const dayMap: Record<string, string> = { 'Monday': 'จันทร์', 'Tuesday': 'อังคาร', 'Wednesday': 'พุธ', 'Thursday': 'พฤหัส', 'Friday': 'ศุกร์', 'Saturday': 'เสาร์', 'Sunday': 'อาทิตย์' };
                                            displayValue = dayMap[value] || value;
                                        } else if (key === 'phase') {
                                            const phaseMap: Record<string, string> = { 'Payday Phase': 'เงินเดือนออก', 'Mid-Month': 'กลางเดือน', 'Early Month': 'ต้นเดือน', 'Normal Phase': 'วันธรรมดา' };
                                            displayValue = phaseMap[value] || value;
                                        } else if (key === 'weather') {
                                            const weatherMap: Record<string, string> = { 'Rain': 'ฝนตก', 'Sunny': 'แดดจัด', 'Cloudy': 'เมฆครึ้ม' };
                                            displayValue = weatherMap[value] || value;
                                        } else if (key === 'momentum') {
                                            const momMap: Record<string, string> = { 'Trend UP': 'ยอดพุ่ง', 'Trend DOWN': 'ยอดตก', 'Stable': 'ทรงตัว' };
                                            displayValue = momMap[value] || value;
                                        } else if (key === 'gap') {
                                            if (value === '0-1 Day Gap') displayValue = 'ต่อเนื่อง';
                                            if (value === 'Long Gap (4+ Days)') displayValue = 'หายไปนาน';
                                        }

                                        return (
                                            <span key={key} className={`text-[10px] px-2 py-1 rounded-md border font-semibold flex items-center gap-1 bg-white/60 ${style.title.replace('text-', 'border-').replace('900', '200')}`}>
                                                {key === 'weather' && (value.includes('Rain') ? <CloudRain size={10} /> : <Sun size={10} />)}
                                                {key === 'day' && <Calendar size={10} />}
                                                {key === 'phase' && <DollarSign size={10} />}
                                                {key === 'market' && <Store size={10} />}
                                                {displayValue}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* AI Analysis */}
                            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/50 mb-3 relative group-hover:bg-white/80 transition-colors">
                                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                    {renderHighlightedText(pattern.analysis, pattern.type)}
                                </p>
                            </div>

                            {/* Metrics Row */}
                            <div className="flex items-center gap-4 mb-4 px-1">
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Lift</div>
                                    <div className={`text-lg font-black ${pattern.metrics.lift > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {pattern.metrics.lift > 0 ? '+' : ''}{(pattern.metrics.lift * 100).toFixed(0)}%
                                    </div>
                                </div>
                                <div className="w-px h-8 bg-slate-200/50" />
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Conf.</div>
                                    <div className="text-lg font-black text-slate-700">
                                        {pattern.metrics.confidence.toFixed(0)}%
                                    </div>
                                </div>
                                <div className="ml-auto text-right">
                                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Avg Qty</div>
                                    <div className="text-lg font-black text-slate-800">
                                        {pattern.metrics.avgSales.toFixed(1)}
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className={`mt-auto rounded-xl p-2.5 text-xs font-bold flex items-start gap-2 border shadow-sm ${pattern.type === 'PERFECT_STORM' ? 'bg-indigo-600 text-white border-indigo-700' : pattern.type === 'SILENT_KILLER' ? 'bg-rose-600 text-white border-rose-700' : 'bg-emerald-600 text-white border-emerald-700'}`}>
                                <div className="mt-0.5"><Zap size={14} fill="currentColor" /></div>
                                <div>{renderHighlightedText(pattern.action, pattern.type)}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
