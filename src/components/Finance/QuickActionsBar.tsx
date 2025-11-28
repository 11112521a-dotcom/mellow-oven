import React, { useState } from 'react';
import { Sparkles, FileText } from 'lucide-react';
import { AutoAllocationModal } from './AutoAllocationModal';
import { MonthlyReportModal } from './MonthlyReportModal';

export const QuickActionsBar: React.FC = () => {
    const [isAutoAllocateOpen, setIsAutoAllocateOpen] = useState(false);
    const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);

    return (
        <>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-cafe-100">
                <div className="flex gap-3 flex-wrap">
                    {/* Auto Allocate Button */}
                    <button
                        onClick={() => setIsAutoAllocateOpen(true)}
                        className="flex-1 min-w-[200px] bg-gradient-to-r from-cafe-600 to-cafe-700 text-white px-5 py-3 rounded-lg hover:from-cafe-700 hover:to-cafe-800 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium"
                    >
                        <Sparkles size={20} />
                        แบ่งกำไรอัตโนมัติ
                    </button>

                    {/* Monthly Report Button */}
                    <button
                        onClick={() => setIsMonthlyReportOpen(true)}
                        className="flex-1 min-w-[200px] bg-cafe-100 text-cafe-700 px-5 py-3 rounded-lg hover:bg-cafe-200 transition-all flex items-center justify-center gap-2 font-medium"
                    >
                        <FileText size={20} />
                        รายงานรายเดือน
                    </button>
                </div>
            </div>

            <AutoAllocationModal
                isOpen={isAutoAllocateOpen}
                onClose={() => setIsAutoAllocateOpen(false)}
            />

            <MonthlyReportModal
                isOpen={isMonthlyReportOpen}
                onClose={() => setIsMonthlyReportOpen(false)}
            />
        </>
    );
};
