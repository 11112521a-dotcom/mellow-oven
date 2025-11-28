import React, { useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { useStore } from '@/src/store';
import { FileText, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

interface MonthlyReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({ isOpen, onClose }) => {
    const { transactions } = useStore();

    const currentMonthData = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyTransactions = transactions.filter(t => {
            const date = new Date(t.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        const income = monthlyTransactions
            .filter(t => t.type === 'INCOME')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = monthlyTransactions
            .filter(t => t.type === 'EXPENSE')
            .reduce((sum, t) => sum + t.amount, 0);

        const netProfit = income - expenses;

        // Group by category
        const incomeByCategory: Record<string, number> = {};
        const expenseByCategory: Record<string, number> = {};

        monthlyTransactions.forEach(t => {
            if (t.type === 'INCOME') {
                incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
            } else {
                expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
            }
        });

        return {
            monthName: now.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }),
            income,
            expenses,
            netProfit,
            incomeByCategory,
            expenseByCategory,
            transactionCount: monthlyTransactions.length
        };
    }, [transactions, isOpen]); // Recalculate when modal opens

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="รายงานสรุปรายเดือน"
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center pb-4 border-b border-cafe-100">
                    <div className="flex justify-center mb-2 text-cafe-500">
                        <Calendar size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-cafe-800">{currentMonthData.monthName}</h3>
                    <p className="text-sm text-cafe-500">สรุปภาพรวมการเงินประจำเดือน</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                        <p className="text-xs text-green-600 font-medium mb-1">รายรับรวม</p>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(currentMonthData.income)}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                        <p className="text-xs text-red-600 font-medium mb-1">รายจ่ายรวม</p>
                        <p className="text-lg font-bold text-red-700">{formatCurrency(currentMonthData.expenses)}</p>
                    </div>
                    <div className={`p-4 rounded-xl border text-center ${currentMonthData.netProfit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                        <p className={`text-xs font-medium mb-1 ${currentMonthData.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>กำไรสุทธิ</p>
                        <p className={`text-lg font-bold ${currentMonthData.netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                            {formatCurrency(currentMonthData.netProfit)}
                        </p>
                    </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-bold text-cafe-700 mb-2 flex items-center gap-2">
                            <TrendingUp size={16} className="text-green-500" /> รายรับแยกตามหมวดหมู่
                        </h4>
                        <div className="space-y-2">
                            {Object.entries(currentMonthData.incomeByCategory).length > 0 ? (
                                Object.entries(currentMonthData.incomeByCategory).map(([cat, amount]) => (
                                    <div key={cat} className="flex justify-between text-sm p-2 bg-green-50/50 rounded">
                                        <span className="text-cafe-600">{cat}</span>
                                        <span className="font-medium text-green-700">{formatCurrency(amount as number)}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-gray-400 italic text-center py-2">ไม่มีรายการ</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-cafe-700 mb-2 flex items-center gap-2">
                            <TrendingDown size={16} className="text-red-500" /> รายจ่ายแยกตามหมวดหมู่
                        </h4>
                        <div className="space-y-2">
                            {Object.entries(currentMonthData.expenseByCategory).length > 0 ? (
                                Object.entries(currentMonthData.expenseByCategory).map(([cat, amount]) => (
                                    <div key={cat} className="flex justify-between text-sm p-2 bg-red-50/50 rounded">
                                        <span className="text-cafe-600">{cat}</span>
                                        <span className="font-medium text-red-700">{formatCurrency(amount as number)}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-gray-400 italic text-center py-2">ไม่มีรายการ</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-cafe-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-cafe-600 text-white px-6 py-2 rounded-lg hover:bg-cafe-700 transition-colors font-medium"
                    >
                        ปิดหน้าต่าง
                    </button>
                </div>
            </div>
        </Modal>
    );
};
