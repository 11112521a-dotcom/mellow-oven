import React, { useState, useMemo } from 'react';
import { OraclePattern } from '@/src/lib/oracle/oracleEngine';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles, Zap, AlertTriangle, TrendingUp, TrendingDown, CloudRain, Sun,
    Calendar, DollarSign, Clock, Store, Users, Timer, Activity,
    ChevronDown, ChevronUp, Filter, ArrowUpDown, Info, Package, Flame, Skull
} from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

interface OracleInsightCardProps {
    patterns: OraclePattern[];
    isLoading?: boolean;
}

// ============================================================
// Constants
// ============================================================
const HIGHLIGHT_REGEX = /(\*\*.*?\*\*)/g;

type TypeFilter = 'all' | 'PERFECT_STORM' | 'SILENT_KILLER' | 'OPPORTUNITY' | 'POWER_COUPLE' | 'COMPETITOR' | 'CANNIBAL';
type SortBy = 'lift' | 'confidence' | 'occurrence';

const TYPE_CONFIG: Record<string, {
    label: string; emoji: string; color: string; bg: string; border: string;
    iconBg: string; title: string; badge: string; actionBg: string;
    Icon: React.FC<{ size?: number }>;
}> = {
    PERFECT_STORM: {
        label: 'โอกาสทำยอด', emoji: '🌟', color: 'indigo',
        bg: 'bg-gradient-to-br from-indigo-50/90 via-white/80 to-amber-50/90',
        border: 'border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]', iconBg: 'bg-indigo-100 text-indigo-600',
        title: 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-700', badge: 'bg-white/80 text-indigo-700 border-indigo-200 shadow-sm',
        actionBg: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-none shadow-md shadow-indigo-200/50',
        Icon: ({ size = 16 }) => <Zap size={size} fill="currentColor" className="text-indigo-500" />,
    },
    SILENT_KILLER: {
        label: 'จุดอันตราย', emoji: '🔴', color: 'rose',
        bg: 'bg-gradient-to-br from-rose-50/90 via-white/80 to-orange-50/90',
        border: 'border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]', iconBg: 'bg-rose-100 text-rose-600',
        title: 'text-transparent bg-clip-text bg-gradient-to-r from-rose-700 to-red-600', badge: 'bg-white/80 text-rose-700 border-rose-200 shadow-sm',
        actionBg: 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-none shadow-md shadow-rose-200/50',
        Icon: ({ size = 16 }) => <Skull size={size} className="text-rose-500" />,
    },
    OPPORTUNITY: {
        label: 'โอกาสเติบโต', emoji: '💡', color: 'emerald',
        bg: 'bg-gradient-to-br from-emerald-50/90 via-white/80 to-cyan-50/90',
        border: 'border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]', iconBg: 'bg-emerald-100 text-emerald-600',
        title: 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-700', badge: 'bg-white/80 text-emerald-700 border-emerald-200 shadow-sm',
        actionBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-none shadow-md shadow-emerald-200/50',
        Icon: ({ size = 16 }) => <TrendingUp size={size} className="text-emerald-500" />,
    },
    POWER_COUPLE: {
        label: 'คู่หูขายดี', emoji: '💑', color: 'fuchsia',
        bg: 'bg-gradient-to-br from-fuchsia-50/90 via-white/80 to-pink-50/90',
        border: 'border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]', iconBg: 'bg-fuchsia-100 text-fuchsia-600',
        title: 'text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-700 to-pink-600', badge: 'bg-white/80 text-fuchsia-700 border-fuchsia-200 shadow-sm',
        actionBg: 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white border-none shadow-md shadow-fuchsia-200/50',
        Icon: ({ size = 16 }) => <Sparkles size={size} className="text-fuchsia-500" />,
    },
    COMPETITOR: {
        label: 'แข่งยอดกัน', emoji: '⚔️', color: 'amber',
        bg: 'bg-gradient-to-br from-amber-50/90 via-white/80 to-yellow-50/90',
        border: 'border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]', iconBg: 'bg-amber-100 text-amber-600',
        title: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-700 to-orange-600', badge: 'bg-white/80 text-amber-700 border-amber-200 shadow-sm',
        actionBg: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none shadow-md shadow-amber-200/50',
        Icon: ({ size = 16 }) => <TrendingDown size={size} className="text-amber-500" />,
    },
    CANNIBAL: {
        label: 'ขโมยลูกค้า', emoji: '🤼', color: 'red',
        bg: 'bg-gradient-to-br from-red-50/90 via-white/80 to-rose-50/90',
        border: 'border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]', iconBg: 'bg-red-100 text-red-600',
        title: 'text-transparent bg-clip-text bg-gradient-to-r from-red-700 to-rose-700', badge: 'bg-white/80 text-red-700 border-red-200 shadow-sm',
        actionBg: 'bg-gradient-to-r from-red-600 to-rose-600 text-white border-none shadow-md shadow-red-200/50',
        Icon: ({ size = 16 }) => <AlertTriangle size={size} className="text-red-500" />,
    },
};

const DIMENSION_ICONS: Record<string, React.ReactNode> = {
    day: <Calendar size={10} />,
    phase: <DollarSign size={10} />,
    weather: <CloudRain size={10} />,
    momentum: <Activity size={10} />,
    velocity: <Zap size={10} />,
    gap: <Timer size={10} />,
    traffic: <Users size={10} />,
    market: <Store size={10} />,
    pair: <Sparkles size={10} />,
    newProduct: <Flame size={10} />,
    affectedProduct: <AlertTriangle size={10} />,
};

const DIMENSION_TRANSLATE: Record<string, Record<string, string>> = {
    day: { Monday: 'จันทร์', Tuesday: 'อังคาร', Wednesday: 'พุธ', Thursday: 'พฤหัส', Friday: 'ศุกร์', Saturday: 'เสาร์', Sunday: 'อาทิตย์' },
    phase: { 'Payday Phase': 'เงินเดือนออก', 'Mid-Month': 'กลางเดือน', 'Early Month': 'ต้นเดือน', 'Normal Phase': 'ปกติ' },
    weather: { Rain: 'ฝนตก', Sunny: 'แดดจัด', Cloudy: 'เมฆครึ้ม' },
    momentum: { 'Trend UP': 'ยอดพุ่ง', 'Trend DOWN': 'ยอดตก', Stable: 'ทรงตัว' },
    velocity: { 'Fast Velocity': 'ขายเร็ว', 'Normal Velocity': 'ปกติ', 'Dead Stock': 'ค้างสต็อก' },
    gap: { '0-1 Day Gap': 'ต่อเนื่อง', '2-3 Day Gap': '2-3 วัน', 'Long Gap (4+ Days)': 'หายไปนาน', 'First Time': 'ครั้งแรก' },
    traffic: { 'High Traffic': 'คนเยอะ', 'Normal Traffic': 'ปกติ', 'Low Traffic': 'คนน้อย' },
};

const FILTER_TABS: { key: TypeFilter; label: string; emoji: string }[] = [
    { key: 'all', label: 'ทั้งหมด', emoji: '📊' },
    { key: 'PERFECT_STORM', label: 'โอกาสทอง', emoji: '🌟' },
    { key: 'SILENT_KILLER', label: 'จุดอันตราย', emoji: '🔴' },
    { key: 'OPPORTUNITY', label: 'โอกาส', emoji: '💡' },
    { key: 'POWER_COUPLE', label: 'คู่หู', emoji: '💑' },
    { key: 'COMPETITOR', label: 'แข่งกัน', emoji: '⚔️' },
    { key: 'CANNIBAL', label: 'กินกัน', emoji: '🦈' },
];

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
    { key: 'lift', label: 'Impact สูงสุด' },
    { key: 'confidence', label: 'ความเชื่อมั่น' },
    { key: 'occurrence', label: 'เกิดบ่อยสุด' },
];

// ============================================================
// Helpers
// ============================================================
function translateDimValue(key: string, value: string): string {
    return DIMENSION_TRANSLATE[key]?.[value] || value;
}

function renderHighlightedText(text: string, colorClass: string) {
    const parts = text.split(HIGHLIGHT_REGEX);
    return (
        <span className="leading-[1.8]">
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <span key={i} className={colorClass}>{part.slice(2, -2)}</span>;
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
}

// ============================================================
// Sub-Components
// ============================================================

/** Tooltip for metric labels */
const MetricTooltip: React.FC<{ label: string; value: string; tooltip: string; color?: string }> = ({ label, value, tooltip, color }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <div
                className="cursor-help"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase font-bold tracking-wide">
                    {label} <Info size={9} className="opacity-50" />
                </div>
                <div className={`text-lg font-black ${color || 'text-slate-700'}`}>{value}</div>
            </div>
            {show && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150">
                    {tooltip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45 -mt-1" />
                </div>
            )}
        </div>
    );
};

/** Mini bar chart comparing base vs actual */
const MiniBar: React.FC<{ base: number; actual: number; color: string }> = ({ base, actual, color }) => {
    const max = Math.max(base, actual) || 1;
    return (
        <div className="flex items-end gap-1.5 h-8">
            <div className="flex flex-col items-center gap-0.5">
                <div className="w-4 bg-slate-200 rounded-sm" style={{ height: `${(base / max) * 100}%`, minHeight: 4 }} />
                <span className="text-[8px] text-slate-400">ปกติ</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
                <div className={`w-4 rounded-sm ${color}`} style={{ height: `${(actual / max) * 100}%`, minHeight: 4 }} />
                <span className="text-[8px] text-slate-400">จริง</span>
            </div>
        </div>
    );
};

/** Single Pattern Card */
const PatternCard: React.FC<{ pattern: OraclePattern; isHero?: boolean; index?: number }> = ({ pattern, isHero, index = 0 }) => {
    const [expanded, setExpanded] = useState(false);
    const config = TYPE_CONFIG[pattern.type] || TYPE_CONFIG.OPPORTUNITY;

    // Extract background colors for text highlights using the title gradient for a clean, premium look
    const highlightClass = `${config.title} font-black mx-0.5`;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{ duration: 0.4, delay: index * 0.05, type: "spring", bounce: 0.3 }}
            whileHover={{ y: -4, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
            className={`relative overflow-hidden rounded-3xl border shadow-lg group backdrop-blur-xl flex flex-col h-full
                ${config.bg} ${config.border} ${isHero ? 'col-span-full' : ''}`}
        >
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Top / Main Content Area */}
            <div className={`px-5 pt-5 pb-4 flex flex-col flex-1 relative z-10 w-full ${isHero ? 'md:flex-row md:items-start md:gap-6' : ''}`}>
                <div className={isHero ? 'flex-1' : 'flex-1 flex flex-col'}>
                    {/* Type Header */}
                    <div className="flex items-center justify-between mb-4">
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-widest border shadow-sm ${config.badge}`}>
                            <config.Icon size={14} />
                            {config.emoji} {config.label}
                        </span>
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="w-8 h-8 rounded-full bg-white/60 shadow-sm border border-white/50 flex items-center justify-center hover:bg-white transition-colors shrink-0"
                        >
                            {expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                        </button>
                    </div>

                    {/* Product Name */}
                    <h3 className={`text-xl font-black leading-tight mb-3 ${config.title}`}>
                        {pattern.productName}
                        {pattern.relatedProductName && (
                            <span className="text-[13px] font-semibold opacity-70 block mt-1">+ {pattern.relatedProductName}</span>
                        )}
                    </h3>

                    {/* Dimension Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {Object.entries(pattern.dimensions).map(([key, value]) => (
                            <span
                                key={key}
                                className={`text-[10px] px-2 py-1 rounded-md border font-semibold flex items-center gap-1 bg-white/80 text-slate-600 shadow-[inset_0_1px_1px_rgba(255,255,255,1)] ${config.border}`}
                            >
                                {DIMENSION_ICONS[key] || <Info size={10} />}
                                {translateDimValue(key, value)}
                            </span>
                        ))}
                    </div>

                    {/* Analysis */}
                    <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-white/60 mb-auto group-hover:bg-white/70 transition-colors shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]">
                        <p className="text-[13px] text-slate-700 font-medium">
                            {renderHighlightedText(pattern.analysis, highlightClass)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Metrics Strip */}
            <div className="px-5 py-3.5 bg-white/40 border-t border-white/50 flex items-center justify-between relative z-10 w-full shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <MetricTooltip
                    label="Lift"
                    value={`${pattern.metrics.lift > 0 ? '+' : ''}${(pattern.metrics.lift * 100).toFixed(0)}%`}
                    tooltip={`ยอดขาย${pattern.metrics.lift > 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${Math.abs(pattern.metrics.lift * 100).toFixed(0)}% เทียบกับวันปกติ`}
                    color={pattern.metrics.lift > 0 ? 'text-emerald-500' : 'text-rose-500'}
                />
                <div className="w-px h-8 bg-slate-300/40" />
                <MetricTooltip
                    label="Conf."
                    value={`${pattern.metrics.confidence.toFixed(0)}%`}
                    tooltip={`ความสม่ำเสมอ ${pattern.metrics.confidence.toFixed(0)}% — ยิ่งสูงยิ่งเชื่อถือได้`}
                />
                <div className="w-px h-8 bg-slate-300/40" />
                <MetricTooltip
                    label="เกิดขึ้น"
                    value={`${pattern.metrics.occurrence} ครั้ง`}
                    tooltip={`รูปแบบนี้เกิดขึ้น ${pattern.metrics.occurrence} ครั้ง จากข้อมูลทั้งหมด`}
                />
                {isHero && (
                    <>
                        <div className="w-px h-8 bg-slate-300/40 hidden md:block" />
                        <div className="hidden md:flex items-center justify-center -my-2">
                            <MiniBar
                                base={pattern.metrics.baseSales}
                                actual={pattern.metrics.avgSales}
                                color={pattern.metrics.lift > 0 ? 'bg-emerald-400' : 'bg-rose-400'}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Action Footer */}
            <div className={`px-5 py-4 text-[13px] font-bold flex items-start gap-3 border-t relative z-10 w-full shrink-0 border-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] ${config.actionBg}`}>
                <div className="p-1.5 bg-white/20 rounded-lg shrink-0 backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                    <Zap size={14} fill="currentColor" className="text-white drop-shadow-sm" />
                </div>
                <div className="leading-relaxed pt-0.5">{renderHighlightedText(pattern.action, 'bg-black/20 text-white px-2 py-0.5 rounded-md mx-0.5 shadow-inner backdrop-blur-sm shadow-[inset_0_1px_1px_rgba(0,0,0,0.2)]')}</div>
            </div>

            {/* Expanded Detail */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-5 border-t border-slate-200/50 overflow-hidden bg-white/40 backdrop-blur-md relative z-10 w-full"
                    >
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs py-5 pt-4">
                            <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm flex flex-col justify-center">
                                <span className="text-slate-400 text-[10px] font-bold block mb-1">ค่าเฉลี่ยปกติ</span>
                                <span className="font-black text-slate-700 text-sm">{pattern.metrics.baseSales.toFixed(1)} <span className="text-[10px] text-slate-400 font-medium">ชิ้น</span></span>
                            </div>
                            <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm flex flex-col justify-center">
                                <span className="text-slate-400 text-[10px] font-bold block mb-1">ค่าเฉลี่ยจริง</span>
                                <span className="font-black text-slate-700 text-sm">{pattern.metrics.avgSales.toFixed(1)} <span className="text-[10px] text-slate-400 font-medium">ชิ้น</span></span>
                            </div>
                            <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm flex flex-col justify-center">
                                <span className="text-slate-400 text-[10px] font-bold block mb-1">Z-Score</span>
                                <span className="font-black text-slate-700 text-sm">{pattern.metrics.significance.toFixed(2)}</span>
                            </div>
                            <div className="bg-white/80 rounded-xl p-3 border border-white shadow-sm flex flex-col justify-center">
                                <span className="text-slate-400 text-[10px] font-bold block mb-1">ประเภท</span>
                                <span className={`font-black text-xs ${config.title.split(' ')[0]}`}>{config.label}</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ============================================================
// Main Component
// ============================================================
export const OracleInsightCard: React.FC<OracleInsightCardProps> = ({ patterns, isLoading }) => {
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [sortBy, setSortBy] = useState<SortBy>('lift');

    // Summary stats
    const summary = useMemo(() => {
        const storms = patterns.filter(p => p.type === 'PERFECT_STORM').length;
        const killers = patterns.filter(p => p.type === 'SILENT_KILLER').length;
        const opps = patterns.filter(p => p.type === 'OPPORTUNITY').length;
        const combos = patterns.filter(p => p.type === 'POWER_COUPLE' || p.type === 'COMPETITOR').length;
        const cannibals = patterns.filter(p => p.type === 'CANNIBAL').length;
        const topPattern = patterns.length > 0 ? patterns.reduce((a, b) => Math.abs(a.metrics.lift) > Math.abs(b.metrics.lift) ? a : b) : null;
        return { storms, killers, opps, combos, cannibals, total: patterns.length, topPattern };
    }, [patterns]);

    // Filter + Sort
    const filteredPatterns = useMemo(() => {
        let result = [...patterns];
        if (typeFilter !== 'all') {
            result = result.filter(p => p.type === typeFilter);
        }
        result.sort((a, b) => {
            switch (sortBy) {
                case 'lift': return Math.abs(b.metrics.lift) - Math.abs(a.metrics.lift);
                case 'confidence': return b.metrics.confidence - a.metrics.confidence;
                case 'occurrence': return b.metrics.occurrence - a.metrics.occurrence;
                default: return 0;
            }
        });
        return result;
    }, [patterns, typeFilter, sortBy]);

    // Available type filters (only show tabs that have data)
    const availableFilters = useMemo(() => {
        const typesInData = new Set(patterns.map(p => p.type));
        return FILTER_TABS.filter(f => f.key === 'all' || typesInData.has(f.key as OraclePattern['type']));
    }, [patterns]);

    // Grouped patterns for sectioned view
    const sections = useMemo(() => {
        if (typeFilter !== 'all') return null;
        const groups: { title: string; emoji: string; items: OraclePattern[] }[] = [];

        const storms = filteredPatterns.filter(p => p.type === 'PERFECT_STORM');
        const killers = filteredPatterns.filter(p => p.type === 'SILENT_KILLER');
        const opps = filteredPatterns.filter(p => p.type === 'OPPORTUNITY');
        const combos = filteredPatterns.filter(p => p.type === 'POWER_COUPLE' || p.type === 'COMPETITOR');
        const cannibals = filteredPatterns.filter(p => p.type === 'CANNIBAL');

        if (storms.length) groups.push({ title: 'โอกาสทองที่ค้นพบ', emoji: '🌟', items: storms });
        if (killers.length) groups.push({ title: 'สัญญาณอันตราย', emoji: '🔴', items: killers });
        if (opps.length) groups.push({ title: 'โอกาสเล็กๆ ที่ซ่อนอยู่', emoji: '💡', items: opps });
        if (combos.length) groups.push({ title: 'ความสัมพันธ์ระหว่างสินค้า', emoji: '💑', items: combos });
        if (cannibals.length) groups.push({ title: 'สินค้ากินกันเอง', emoji: '🦈', items: cannibals });

        return groups;
    }, [filteredPatterns, typeFilter]);

    // ============================================================
    // Loading State
    // ============================================================
    if (isLoading) {
        const dims = ['Chrono-Cycle', 'Atmosphere', 'Momentum', 'Velocity', 'Gap', 'Basket', 'Market'];
        return (
            <div className="mb-8">
                <div className="bg-gradient-to-r from-violet-100 to-indigo-100 rounded-2xl p-8 border border-violet-200 text-center">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg animate-pulse">
                            <Zap size={20} fill="currentColor" />
                        </div>
                        <h3 className="text-lg font-bold text-violet-800">กำลังวิเคราะห์ 7 มิติ...</h3>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                        {dims.map((d, i) => (
                            <span
                                key={d}
                                className="px-3 py-1.5 bg-white/70 rounded-full text-xs font-semibold text-violet-600 border border-violet-200 animate-pulse"
                                style={{ animationDelay: `${i * 150}ms` }}
                            >
                                {d}
                            </span>
                        ))}
                    </div>
                    <div className="w-48 h-1.5 bg-violet-200 rounded-full mx-auto overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
                            style={{ width: '60%', animation: 'shimmer 1.5s ease-in-out infinite alternate' }}
                        />
                    </div>
                    <style>{`@keyframes shimmer { 0% { width: 20%; margin-left: 0; } 100% { width: 60%; margin-left: 40%; } }`}</style>
                </div>
            </div>
        );
    }

    // ============================================================
    // Empty State
    // ============================================================
    if (patterns.length === 0) {
        return (
            <div className="mb-8">
                <div className="bg-gradient-to-br from-slate-50 to-stone-100 rounded-2xl p-10 border border-slate-200 text-center">
                    <Package size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-600 mb-2">ยังไม่พบรูปแบบที่ชัดเจน</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto">
                        Oracle ต้องการข้อมูลการขายอย่างน้อย 10 วันขึ้นไปต่อสินค้า<br />
                        เพื่อวิเคราะห์รูปแบบที่มีนัยสำคัญทางสถิติ
                    </p>
                </div>
            </div>
        );
    }

    // ============================================================
    // Render
    // ============================================================
    return (
        <div className="mb-8 animate-in fade-in duration-700 space-y-6">
            {/* Executive Summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-violet-50">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-violet-200">
                                <Zap size={20} fill="currentColor" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">พบ {summary.total} รูปแบบ</h2>
                                <p className="text-xs text-slate-500">
                                    {summary.storms > 0 && <span className="text-indigo-600 font-semibold">{summary.storms} โอกาสทอง</span>}
                                    {summary.storms > 0 && summary.killers > 0 && ' · '}
                                    {summary.killers > 0 && <span className="text-rose-600 font-semibold">{summary.killers} จุดอันตราย</span>}
                                    {(summary.storms > 0 || summary.killers > 0) && summary.opps > 0 && ' · '}
                                    {summary.opps > 0 && <span className="text-emerald-600 font-semibold">{summary.opps} โอกาสเล็กๆ</span>}
                                    {(summary.storms > 0 || summary.killers > 0 || summary.opps > 0) && summary.combos > 0 && ' · '}
                                    {summary.combos > 0 && <span className="text-green-600 font-semibold">{summary.combos} คู่สินค้า</span>}
                                    {(summary.storms > 0 || summary.killers > 0 || summary.opps > 0 || summary.combos > 0) && summary.cannibals > 0 && ' · '}
                                    {summary.cannibals > 0 && <span className="text-red-600 font-semibold">{summary.cannibals} Cannibal</span>}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hero Card — Most Impactful */}
                {summary.topPattern && (
                    <div className="p-4">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 flex items-center gap-1">
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                                <Sparkles size={12} className="text-amber-500" />
                            </motion.div>
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-500">
                                ข้อค้นพบที่สำคัญที่สุด (Top Impact)
                            </span>
                        </div>
                        <PatternCard pattern={summary.topPattern} isHero />
                    </div>
                )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Type Filter */}
                <div className="flex flex-wrap gap-1.5 flex-1">
                    {availableFilters.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setTypeFilter(f.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${typeFilter === f.key
                                ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            {f.emoji} {f.label}
                            {f.key === 'all' && ` (${patterns.length})`}
                        </button>
                    ))}
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                    <ArrowUpDown size={14} className="text-slate-400" />
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as SortBy)}
                        className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none font-medium"
                    >
                        {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Pattern Cards */}
            {sections ? (
                // Grouped view
                <div className="space-y-8">
                    {sections.map(section => (
                        <div key={section.title}>
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-lg">{section.emoji}</span>
                                <h3 className="text-sm font-bold text-slate-700">{section.title}</h3>
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">{section.items.length}</span>
                                <div className="flex-1 h-px bg-slate-100" />
                            </div>
                            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <AnimatePresence mode="popLayout">
                                    {section.items.map((p, idx) => <PatternCard key={p.id} pattern={p} index={idx} />)}
                                </AnimatePresence>
                            </motion.div>
                        </div>
                    ))}
                </div>
            ) : (
                // Flat filtered view
                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence mode="popLayout">
                        {filteredPatterns.map((p, idx) => <PatternCard key={p.id} pattern={p} index={idx} />)}
                    </AnimatePresence>
                </motion.div>
            )}

            {filteredPatterns.length === 0 && (
                <div className="text-center py-8">
                    <Filter size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">ไม่พบรูปแบบในหมวดนี้</p>
                </div>
            )}
        </div>
    );
};

export default OracleInsightCard;
