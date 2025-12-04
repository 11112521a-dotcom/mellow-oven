import React, { useState } from 'react';
import { FileText, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { MonthlyReportModal } from './MonthlyReportModal';

interface QuickActionsBarProps {
    onOpenTransaction: (mode: 'INCOME' | 'EXPENSE' | 'TRANSFER') => void;
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({ onOpenTransaction }) => {
    const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);

    return (
        <>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-cafe-100">
                <div className="flex gap-3 flex-wrap">
                    {/* Income Button */}
                    <button
                        onClick={() => onOpenTransaction('INCOME')}
                        className="flex-1 min-w-[150px] bg-green-100 text-green-700 px-4 py-3 rounded-lg hover:bg-green-200 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                        <TrendingUp size={20} />
                        รายรับ
                    </button>

                    {/* Expense Button */}
                    <button
                        onClick={() => onOpenTransaction('EXPENSE')}
                        className="flex-1 min-w-[150px] bg-red-100 text-red-700 px-4 py-3 rounded-lg hover:bg-red-200 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                        <TrendingDown size={20} />
                        รายจ่าย
                    </button>

                    {/* Transfer Button */}
                    <button
                        onClick={() => onOpenTransaction('TRANSFER')}
                        className="flex-1 min-w-[150px] bg-blue-100 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-200 transition-all flex items-center justify-center gap-2 font-bold"
                    >
                        <ArrowRightLeft size={20} />
                        โอนเงิน
                    </button>

                    <div className="w-px bg-gray-200 mx-2 hidden md:block"></div>

                    {/* Monthly Report Button */}
                    <button
                        onClick={() => setIsMonthlyReportOpen(true)}
                        className="flex-1 min-w-[180px] bg-cafe-100 text-cafe-700 px-4 py-3 rounded-lg hover:bg-cafe-200 transition-all flex items-center justify-center gap-2 font-medium"
                    >
                        <FileText size={20} />
                        รายงาน
                    </button>
                </div>
            </div>

            <MonthlyReportModal
                isOpen={isMonthlyReportOpen}
                onClose={() => setIsMonthlyReportOpen(false)}
            />
        </>
    );
};
