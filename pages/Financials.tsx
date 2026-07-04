import React, { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/src/store';
import { useShallow } from 'zustand/react/shallow';
import { TransactionTable } from '@/src/components/Finance/TransactionTable';
import { TransactionModal } from '@/src/components/Finance/TransactionModal';
import { JarsSection } from '@/src/components/Finance/JarsSection';
import { AllocationStation } from '@/src/components/Finance/AllocationStation';
import { MonthlyReportModal } from '@/src/components/Finance/MonthlyReportModal';
import { JarType } from '@/types';
import { ArrowRightLeft, TrendingUp, TrendingDown, FileText, Plus, Minus, RefreshCw, Wallet, Sparkles, Zap, Store } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

const Financials: React.FC = () => {
    const { jars, transactions, executeAllocation, externalShops, selectedWalletId, setSelectedWalletId } = useStore(useShallow(state => ({
        jars: state.jars,
        transactions: state.transactions,
        executeAllocation: state.executeAllocation,
        externalShops: state.externalShops,
        selectedWalletId: state.selectedWalletId,
        setSelectedWalletId: state.setSelectedWalletId
    })));

    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);
    const [transactionMode, setTransactionMode] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('INCOME');
    const [selectedJar, setSelectedJar] = useState<JarType | undefined>(undefined);

    const openTransaction = useCallback((mode: 'INCOME' | 'EXPENSE' | 'TRANSFER', jarId?: JarType) => {
        setTransactionMode(mode);
        setSelectedJar(jarId);
        setIsTransactionModalOpen(true);
    }, []);

    const totalBalance = useMemo(() => jars.reduce((acc, jar) => acc + jar.balance, 0), [jars]);

    // Filter transactions to only show the selected wallet
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            if (selectedWalletId) {
                return tx.walletId === selectedWalletId;
            }
            return !tx.walletId || tx.walletId === 'main';
        });
    }, [transactions, selectedWalletId]);

    // Calculate daily stats using filteredTransactions!
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);
    const todayTransactions = useMemo(() => filteredTransactions.filter(t => t.date.startsWith(today)), [filteredTransactions, today]);
    
    const incomeToday = useMemo(() => todayTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((acc, t) => acc + t.amount, 0), [todayTransactions]);
        
    const expenseToday = useMemo(() => todayTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((acc, t) => acc + t.amount, 0), [todayTransactions]);

    const handleAllocate = useCallback(async (amount: number, allocations: Record<JarType, number>, fromProfit: boolean = false, specificProfits?: { id: string, amount: number }[], manualDebtAmount?: number) => {
        // Calculate debt config locally to display the alert info accurately
        const { debtConfig } = useStore.getState();

        let debtDeduction = 0;
        let workingAmount = amount;

        if (manualDebtAmount !== undefined) {
            debtDeduction = manualDebtAmount;
            workingAmount = Math.max(0, amount - debtDeduction);
        } else if (debtConfig.isEnabled && amount > 0) {
            if (amount >= debtConfig.safetyThreshold) {
                debtDeduction = debtConfig.fixedAmount;
            } else {
                debtDeduction = amount * debtConfig.safetyRatio;
            }
            workingAmount = amount - debtDeduction;
        }

        // Call the optimized batch database action in Zustand store
        try {
            await executeAllocation(amount, allocations, fromProfit, specificProfits, manualDebtAmount);
        } catch (error) {
            console.error('Failed to allocate funds:', error);
            throw error;
        }
    }, [executeAllocation]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
            {/* ═══════════════════════════════════════════════════════════
                🌟 HERO SECTION - Allocation First
               ═══════════════════════════════════════════════════════════ */}
            <div className="max-w-5xl mx-auto w-full flex flex-col gap-4">
                {/* 🏦 Multi-Wallet Switcher */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-stone-100 rounded-xl">
                            <Store className="w-5 h-5 text-stone-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-stone-800 text-sm">กระเป๋าเงิน (Wallet)</h3>
                            <p className="text-xs text-stone-500">เลือกสาขาเพื่อดูข้อมูลการเงิน</p>
                        </div>
                    </div>
                    <select
                        value={selectedWalletId || ''}
                        onChange={(e) => setSelectedWalletId(e.target.value || null)}
                        className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">🏪 ร้านหลัก (Main Store)</option>
                        {externalShops.map(shop => (
                            <option key={shop.id} value={shop.id}>🏢 สาขา: {shop.name}</option>
                        ))}
                    </select>
                </div>

                <AllocationStation onAllocate={handleAllocate} />
            </div>

            {/* ═══════════════════════════════════════════════════════════
                📊 SUMMARY & QUICK ACTIONS (Moved below Allocation)
               ═══════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {/* Total Balance Card */}
                <div className="bg-white rounded-[2rem] p-6 border border-stone-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-stone-500">
                        <Wallet size={18} />
                        <span className="font-bold tracking-wide text-sm">ยอดเงินรวม</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-stone-800 tracking-tight">
                        ฿{totalBalance.toLocaleString()}
                    </h1>
                </div>

                {/* Today's Stats */}
                <div className="flex flex-col gap-4">
                    <div className="bg-white p-4 rounded-[1.5rem] border border-stone-100 shadow-sm flex-1 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-100 rounded-lg">
                                    <TrendingUp size={16} className="text-emerald-600" />
                                </div>
                                <span className="text-xs font-bold text-stone-500">รายรับวันนี้</span>
                            </div>
                            <p className="font-black text-lg text-emerald-600">+฿{incomeToday.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-[1.5rem] border border-stone-100 shadow-sm flex-1 flex flex-col justify-center">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-rose-100 rounded-lg">
                                    <TrendingDown size={16} className="text-rose-600" />
                                </div>
                                <span className="text-xs font-bold text-stone-500">รายจ่ายวันนี้</span>
                            </div>
                            <p className="font-black text-lg text-rose-600">-฿{expenseToday.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions Panel */}
                <div className="bg-white rounded-[2rem] p-5 border border-stone-100 shadow-sm flex flex-col justify-center">
                    <h3 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">
                        <Zap size={16} className="text-amber-500" /> ทำรายการด่วน
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => openTransaction('INCOME')}
                            className="bg-stone-50 hover:bg-emerald-50 p-3 rounded-xl border border-stone-100 hover:border-emerald-200 transition-all flex flex-col items-center gap-2 group"
                        >
                            <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                <Plus size={16} className="text-emerald-600" />
                            </div>
                            <span className="text-xs font-bold text-stone-700">รับเงิน</span>
                        </button>
                        <button
                            onClick={() => openTransaction('EXPENSE')}
                            className="bg-stone-50 hover:bg-rose-50 p-3 rounded-xl border border-stone-100 hover:border-rose-200 transition-all flex flex-col items-center gap-2 group"
                        >
                            <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                <Minus size={16} className="text-rose-600" />
                            </div>
                            <span className="text-xs font-bold text-stone-700">จ่ายเงิน</span>
                        </button>
                        <button
                            onClick={() => openTransaction('TRANSFER')}
                            className="bg-stone-50 hover:bg-sky-50 p-3 rounded-xl border border-stone-100 hover:border-sky-200 transition-all flex flex-col items-center gap-2 group"
                        >
                            <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                <RefreshCw size={16} className="text-sky-600" />
                            </div>
                            <span className="text-xs font-bold text-stone-700">โอนเงิน</span>
                        </button>
                        <button
                            onClick={() => setIsMonthlyReportOpen(true)}
                            className="bg-stone-50 hover:bg-amber-50 p-3 rounded-xl border border-stone-100 hover:border-amber-200 transition-all flex flex-col items-center gap-2 group"
                        >
                            <div className="p-1.5 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                <FileText size={16} className="text-amber-600" />
                            </div>
                            <span className="text-xs font-bold text-stone-700">รายงาน</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Jars Section (Cloud Pockets) */}
            <JarsSection
                jars={jars}
                onJarClick={(id) => openTransaction('INCOME', id as JarType)}
            />

            {/* Transactions Table (Full Width) */}
            <div>
                <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <ArrowRightLeft size={20} className="text-amber-600" />
                    รายการล่าสุด
                </h2>
                <TransactionTable transactions={filteredTransactions} />
            </div>

            {/* Unified Transaction Modal */}
            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                mode={transactionMode}
                defaultJar={selectedJar}
            />

            {/* Monthly Report Modal */}
            <MonthlyReportModal
                isOpen={isMonthlyReportOpen}
                onClose={() => setIsMonthlyReportOpen(false)}
            />
        </div>
    );
};

export default Financials;
