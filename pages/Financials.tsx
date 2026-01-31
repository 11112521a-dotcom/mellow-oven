import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { TransactionTable } from '@/src/components/Finance/TransactionTable';
import { TransactionModal } from '@/src/components/Finance/TransactionModal';
import { JarsSection } from '@/src/components/Finance/JarsSection';
import { AllocationStation } from '@/src/components/Finance/AllocationStation';
import { MonthlyReportModal } from '@/src/components/Finance/MonthlyReportModal';
import { JarType } from '@/types';
import { ArrowRightLeft, TrendingUp, TrendingDown, FileText, Plus, Minus, RefreshCw, Wallet, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

const Financials: React.FC = () => {
    const { jars, transactions, updateJarBalance, addTransaction, allocateFromProfits, deductUnallocatedProfit } = useStore();

    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);
    const [transactionMode, setTransactionMode] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('INCOME');
    const [selectedJar, setSelectedJar] = useState<JarType | undefined>(undefined);

    const openTransaction = (mode: 'INCOME' | 'EXPENSE' | 'TRANSFER', jarId?: JarType) => {
        setTransactionMode(mode);
        setSelectedJar(jarId);
        setIsTransactionModalOpen(true);
    };

    const totalBalance = jars.reduce((acc, jar) => acc + jar.balance, 0);

    // Calculate daily stats
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => t.date.startsWith(today));
    const incomeToday = todayTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((acc, t) => acc + t.amount, 0);
    const expenseToday = todayTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((acc, t) => acc + t.amount, 0);

    const handleAllocate = async (amount: number, allocations: Record<JarType, number>, fromProfit: boolean = false, specificProfits?: { id: string, amount: number }[], manualDebtAmount?: number) => {
        // Get debt config from store
        const { debtConfig, addToDebtAccumulated } = useStore.getState();

        // Calculate debt deduction
        let debtDeduction = 0;
        let workingAmount = amount;

        if (manualDebtAmount !== undefined) {
            // Use manual adjustment if provided
            debtDeduction = manualDebtAmount;
            workingAmount = Math.max(0, amount - debtDeduction);
        } else if (debtConfig.isEnabled && amount > 0) {
            // Fallback to auto-calculation
            if (amount >= debtConfig.safetyThreshold) {
                debtDeduction = debtConfig.fixedAmount;
            } else {
                debtDeduction = amount * debtConfig.safetyRatio;
            }
            workingAmount = amount - debtDeduction;
        }

        // If allocating from profit
        if (fromProfit) {
            if (specificProfits && specificProfits.length > 0) {
                // Deduct from specific profits (Smart Allocation by Date)
                for (const profit of specificProfits) {
                    await deductUnallocatedProfit(profit.id, profit.amount);
                }
            } else {
                // FIFO Allocation (All Available)
                await allocateFromProfits(amount);
            }
        }

        // Step 1: Record debt deduction if applicable
        if (debtDeduction > 0) {
            await addToDebtAccumulated(debtDeduction);
            addTransaction({
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                amount: debtDeduction,
                type: 'INCOME',
                category: 'Debt Repayment',
                description: `หักเข้ากองทุนหนี้ (Priority Deduction)`,
                toJar: 'Owner' // Using Owner jar as the debt fund destination
            });
            updateJarBalance('Owner', debtDeduction);
        }

        // Helper: Round down to nearest 5 (e.g., 208.05 → 205, 138.70 → 135)
        const roundToFive = (n: number) => Math.floor(n / 5) * 5;

        // Calculate raw amounts first (using workingAmount after debt deduction)
        const rawAmounts: Record<JarType, number> = {} as Record<JarType, number>;
        let totalRounded = 0;

        // Round all jars EXCEPT Owner
        Object.entries(allocations).forEach(([jarId, percentage]) => {
            const rawAmount = (workingAmount * percentage) / 100;
            if (jarId !== 'Owner') {
                const rounded = roundToFive(rawAmount);
                rawAmounts[jarId as JarType] = rounded;
                totalRounded += rounded;
            }
        });

        // Owner gets the remainder (to keep total exact)
        const ownerRemainder = workingAmount - totalRounded;
        rawAmounts['Owner'] = ownerRemainder;

        // Create transactions with rounded amounts
        Object.entries(rawAmounts).forEach(([jarId, jarAmount]) => {
            if (jarAmount > 0) {
                const percentage = allocations[jarId as JarType] || 0;

                // Update Balance
                updateJarBalance(jarId as JarType, jarAmount);

                // Add Transaction Record
                addTransaction({
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                    amount: jarAmount,
                    type: 'INCOME',
                    category: 'Allocation',
                    description: fromProfit
                        ? `จัดสรรจากกำไร (${percentage}%)`
                        : `จัดสรรเงินเข้าระบบ (${percentage}%)`,
                    toJar: jarId as JarType
                });
            }
        });

        // Show success message with debt info
        if (debtDeduction > 0) {
            alert(`จัดสรรเงิน ${formatCurrency(amount)} เรียบร้อย!\n\n🔒 หักหนี้: ${formatCurrency(debtDeduction)}\n📊 แบ่งกระเป๋า: ${formatCurrency(workingAmount)}`);
        } else {
            alert(`จัดสรรเงิน ${formatCurrency(amount)} เรียบร้อยแล้ว!`);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* ═══════════════════════════════════════════════════════════
                💰 WARM CAFE HEADER - Financial Overview
               ═══════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-100 p-6 sm:p-8">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-200/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-200/30 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                <div className="relative z-10">
                    {/* Title & Balance */}
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                                <Wallet size={28} className="text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm text-amber-600 font-medium">ยอดเงินรวมทั้งหมด</span>
                                    <Sparkles size={14} className="text-amber-500" />
                                </div>
                                <h1 className="text-4xl sm:text-5xl font-black text-stone-800 tracking-tight">
                                    ฿{totalBalance.toLocaleString()}
                                </h1>
                            </div>
                        </div>

                        {/* Today's Stats */}
                        <div className="flex gap-4">
                            <div className="bg-white/80 backdrop-blur-sm px-5 py-3 rounded-2xl border border-emerald-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-100 rounded-xl">
                                        <TrendingUp size={20} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500">รายรับวันนี้</p>
                                        <p className="font-bold text-lg text-emerald-600">+฿{incomeToday.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm px-5 py-3 rounded-2xl border border-rose-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-rose-100 rounded-xl">
                                        <TrendingDown size={20} className="text-rose-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500">รายจ่ายวันนี้</p>
                                        <p className="font-bold text-lg text-rose-600">-฿{expenseToday.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Jars Mini Preview - Desktop */}
                    <div className="hidden lg:flex gap-3 mb-6">
                        {jars.map(jar => (
                            <div key={jar.id} className="bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-amber-100/50 text-center">
                                <div className="text-xs text-stone-500">{jar.name}</div>
                                <div className="font-bold text-stone-800">{formatCurrency(jar.balance)}</div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-amber-200/50">
                        <button
                            onClick={() => openTransaction('INCOME')}
                            className="bg-white hover:bg-emerald-50 p-4 rounded-2xl border border-stone-100 hover:border-emerald-200 transition-all duration-200 flex items-center justify-center gap-3 group shadow-sm hover:shadow-md"
                        >
                            <div className="p-2 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
                                <Plus size={20} className="text-emerald-600" />
                            </div>
                            <span className="font-bold text-stone-700">รายรับ</span>
                        </button>
                        <button
                            onClick={() => openTransaction('EXPENSE')}
                            className="bg-white hover:bg-rose-50 p-4 rounded-2xl border border-stone-100 hover:border-rose-200 transition-all duration-200 flex items-center justify-center gap-3 group shadow-sm hover:shadow-md"
                        >
                            <div className="p-2 bg-rose-100 rounded-xl group-hover:bg-rose-200 transition-colors">
                                <Minus size={20} className="text-rose-600" />
                            </div>
                            <span className="font-bold text-stone-700">รายจ่าย</span>
                        </button>
                        <button
                            onClick={() => openTransaction('TRANSFER')}
                            className="bg-white hover:bg-sky-50 p-4 rounded-2xl border border-stone-100 hover:border-sky-200 transition-all duration-200 flex items-center justify-center gap-3 group shadow-sm hover:shadow-md"
                        >
                            <div className="p-2 bg-sky-100 rounded-xl group-hover:bg-sky-200 transition-colors">
                                <RefreshCw size={20} className="text-sky-600" />
                            </div>
                            <span className="font-bold text-stone-700">โอนเงิน</span>
                        </button>
                        <button
                            onClick={() => setIsMonthlyReportOpen(true)}
                            className="bg-white hover:bg-amber-50 p-4 rounded-2xl border border-stone-100 hover:border-amber-200 transition-all duration-200 flex items-center justify-center gap-3 group shadow-sm hover:shadow-md"
                        >
                            <div className="p-2 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors">
                                <FileText size={20} className="text-amber-600" />
                            </div>
                            <span className="font-bold text-stone-700">รายงาน</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Jars Section (Cloud Pockets) */}
            <JarsSection
                jars={jars}
                onJarClick={(id) => openTransaction('INCOME', id as JarType)}
            />

            {/* Allocation Station */}
            <AllocationStation onAllocate={handleAllocate} />

            {/* Transactions Table (Full Width) */}
            <div>
                <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2">
                    <ArrowRightLeft size={20} className="text-amber-600" />
                    รายการล่าสุด
                </h2>
                <TransactionTable transactions={transactions} />
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
