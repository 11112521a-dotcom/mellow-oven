import React from 'react';
import { Target, TrendingUp, ShieldCheck, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

interface DebtConfig {
    isEnabled: boolean;
    fixedAmount: number;
    safetyThreshold: number;
    safetyRatio: number;
    targetAmount: number;
    accumulatedAmount: number;
}

interface DebtProgressWidgetProps {
    config: DebtConfig;
}

export const DebtProgressWidget: React.FC<DebtProgressWidgetProps> = ({ config }) => {
    if (!config || !config.isEnabled) return null;

    const progress = config.targetAmount > 0
        ? (config.accumulatedAmount / config.targetAmount) * 100
        : 0;

    const remaining = Math.max(0, config.targetAmount - config.accumulatedAmount);
    const isComplete = progress >= 100;

    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl p-6 text-white border border-stone-700 shadow-xl group">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                            <Target size={20} className="text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg tracking-tight">เป้าหมายปลดหนี้ (Debt Freedom)</h3>
                            <p className="text-xs text-stone-400 flex items-center gap-1">
                                <ShieldCheck size={12} className="text-emerald-500" />
                                สถานะ: {isComplete ? 'สำเร็จแล้ว!' : 'กำลังดำเนินการ'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black text-emerald-400">
                            {progress.toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-end text-sm">
                        <span className="text-stone-400">ความคืบหน้า</span>
                        <div className="font-mono">
                            <span className="font-bold text-white">{formatCurrency(config.accumulatedAmount)}</span>
                            <span className="text-stone-500 mx-1">/</span>
                            <span className="text-stone-400">{formatCurrency(config.targetAmount)}</span>
                        </div>
                    </div>

                    <div className="h-4 bg-stone-700/50 rounded-full overflow-hidden p-1 border border-stone-700">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 relative ${isComplete ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-emerald-500 to-sky-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                }`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        >
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
                        </div>
                    </div>
                </div>

                {/* Footer Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-stone-700/50">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">ยอดคงเหลือ</p>
                        <p className="text-sm font-bold text-rose-400">{formatCurrency(remaining)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">หักอัตโนมัติ</p>
                        <p className="text-sm font-bold text-white">{formatCurrency(config.fixedAmount)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-stone-500 mb-1">Safety Ratio</p>
                        <p className="text-sm font-bold text-white">{(config.safetyRatio * 100).toFixed(0)}%</p>
                    </div>
                    <div className="text-right flex items-center justify-end">
                        <button className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors group/btn">
                            รายละเอียด <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
