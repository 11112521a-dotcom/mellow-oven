import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { TransactionTable } from '@/src/components/Finance/TransactionTable';
import { TransactionModal } from '@/src/components/Finance/TransactionModal';
import { JarsSection } from '@/src/components/Finance/JarsSection';
import { AllocationStation } from '@/src/components/Finance/AllocationStation';
import { MonthlyReportModal } from '@/src/components/Finance/MonthlyReportModal';
import { JarType } from '@/types';
import { ArrowRightLeft, TrendingUp, TrendingDown, FileText, Plus, Minus, RefreshCw } from 'lucide-react';
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

    const handleAllocate = async (amount: number, allocations: Record<JarType, number>, fromProfit: boolean = false, specificProfits?: { id: string, amount: number }[]) => {
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

        // Create a batch of transactions
        Object.entries(allocations).forEach(([jarId, percentage]) => {
            const jarAmount = (amount * percentage) / 100;
            if (jarAmount > 0) {
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

        alert(`จัดสรรเงิน ${formatCurrency(amount)} เรียบร้อยแล้ว!`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header Stats & Quick Actions */}
            <div className="bg-gradient-to-br from-cafe-900 to-cafe-800 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end mb-8">
                        <div>
                            <p className="text-cafe-200 mb-2 font-medium">เงินสดรวมทุกกระเป๋า</p>
                            <h1 className="text-5xl font-bold mb-6 tracking-tight">฿{totalBalance.toLocaleString()}</h1>
                            <div className="flex gap-4">
                                <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 flex items-center gap-3">
                                    <div className="bg-green-500/20 p-2 rounded-lg">
                                        <TrendingUp size={20} className="text-green-300" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-cafe-200">รายรับวันนี้</p>
                                        <p className="font-bold text-lg text-green-300">+฿{incomeToday.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 flex items-center gap-3">
                                    <div className="bg-red-500/20 p-2 rounded-lg">
                                        <TrendingDown size={20} className="text-red-300" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-cafe-200">รายจ่ายวันนี้</p>
                                        <p className="font-bold text-lg text-red-300">-฿{expenseToday.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="hidden md:block text-right">
                            <p className="text-cafe-300 text-sm mb-2">สถานะการเงินรวม</p>
                            <div className="inline-block bg-white/5 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                                <div className="flex gap-8 text-center">
                                    {jars.map(jar => (
                                        <div key={jar.id}>
                                            <div className="text-xs text-cafe-400 mb-1">{jar.name}</div>
                                            <div className="font-bold">{formatCurrency(jar.balance)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Integrated Quick Actions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/10">
                        <button
                            onClick={() => openTransaction('INCOME')}
                            className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl backdrop-blur-sm border border-white/10 transition-all flex items-center justify-center gap-3 group"
                        >
                            <div className="bg-green-500/20 p-2 rounded-lg group-hover:bg-green-500/30 transition-colors">
                                <Plus size={20} className="text-green-300" />
                            </div>
                            <span className="font-bold">รายรับ</span>
                        </button>
                        <button
                            onClick={() => openTransaction('EXPENSE')}
                            className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl backdrop-blur-sm border border-white/10 transition-all flex items-center justify-center gap-3 group"
                        >
                            <div className="bg-red-500/20 p-2 rounded-lg group-hover:bg-red-500/30 transition-colors">
                                <Minus size={20} className="text-red-300" />
                            </div>
                            <span className="font-bold">รายจ่าย</span>
                        </button>
                        <button
                            onClick={() => openTransaction('TRANSFER')}
                            className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl backdrop-blur-sm border border-white/10 transition-all flex items-center justify-center gap-3 group"
                        >
                            <div className="bg-blue-500/20 p-2 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                                <RefreshCw size={20} className="text-blue-300" />
                            </div>
                            <span className="font-bold">โอนเงิน</span>
                        </button>
                        <button
                            onClick={() => setIsMonthlyReportOpen(true)}
                            className="bg-white/10 hover:bg-white/20 text-white p-4 rounded-xl backdrop-blur-sm border border-white/10 transition-all flex items-center justify-center gap-3 group"
                        >
                            <div className="bg-orange-500/20 p-2 rounded-lg group-hover:bg-orange-500/30 transition-colors">
                                <FileText size={20} className="text-orange-300" />
                            </div>
                            <span className="font-bold">รายงาน</span>
                        </button>
                    </div>
                </div>

                {/* Background Decoration */}
                <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
                    <ArrowRightLeft size={300} />
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
                <h2 className="text-xl font-bold text-cafe-800 mb-4">รายการล่าสุด</h2>
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
