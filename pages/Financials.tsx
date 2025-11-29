import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { WalletCard } from '@/src/components/Finance/WalletCard';
import { TransactionTable } from '@/src/components/Finance/TransactionTable';
import { QuickActionsBar } from '@/src/components/Finance/QuickActionsBar';
import { TransactionModal } from '@/src/components/Finance/TransactionModal';
import { JarType } from '@/types';
import { ArrowRightLeft } from 'lucide-react';

const Financials: React.FC = () => {
    const { jars, transactions } = useStore();

    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Stats */}
            <div className="bg-cafe-800 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-cafe-200 mb-2">เงินสดรวมทุกกระเป๋า</p>
                    <h1 className="text-5xl font-bold mb-4">฿{totalBalance.toLocaleString()}</h1>
                    <div className="flex gap-4">
                        <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                            <p className="text-xs text-cafe-200">รายรับวันนี้</p>
                            <p className="font-semibold text-lg text-green-300">+฿{incomeToday.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                            <p className="text-xs text-cafe-200">รายจ่ายวันนี้</p>
                            <p className="font-semibold text-lg text-red-300">-฿{expenseToday.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10">
                    <ArrowRightLeft size={200} />
                </div>
            </div>

            {/* Quick Actions Bar */}
            <QuickActionsBar onOpenTransaction={(mode) => openTransaction(mode)} />

            {/* Wallets Grid */}
            <div>
                <h2 className="text-xl font-bold text-cafe-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-8 bg-cafe-600 rounded-full"></span>
                    กระเป๋าเงิน (5 Jars)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jars.map((jar) => (
                        <WalletCard
                            key={jar.id}
                            jar={jar}
                            onTransfer={(jarId) => openTransaction('TRANSFER', jarId)}
                            onEdit={(jarId) => openTransaction('INCOME', jarId)}
                        />
                    ))}
                </div>
            </div>

            {/* Transactions */}
            <TransactionTable transactions={transactions} />

            {/* Unified Transaction Modal */}
            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                mode={transactionMode}
                defaultJar={selectedJar}
            />
        </div>
    );
};

export default Financials;
