import React from 'react';
import { useStore } from '@/src/store';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

export const UnallocatedProfitCard: React.FC = () => {
    const { unallocatedProfits, getUnallocatedBalance } = useStore();
    const totalBalance = getUnallocatedBalance();

    // Group by date
    const profitsByDate = unallocatedProfits.reduce((acc, profit) => {
        const existing = acc.find(p => p.date === profit.date);
        if (existing) {
            existing.amount += profit.amount;
            existing.items.push(profit);
        } else {
            acc.push({ date: profit.date, amount: profit.amount, items: [profit] });
        }
        return acc;
    }, [] as { date: string, amount: number, items: typeof unallocatedProfits }[]);

    return (
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/20 rounded-lg">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-amber-100 text-sm">เงินสดรวมทุกกระเป๋า</p>
                        <h3 className="text-2xl font-bold">{formatCurrency(totalBalance)}</h3>
                    </div>
                </div>
            </div>

            {/* Balance Breakdown */}
            {profitsByDate.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-amber-100 text-xs font-medium mb-2">รายละเอียดตามวัน:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                        {profitsByDate.map((group, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} />
                                    <span>{new Date(group.date).toLocaleDateString('th-TH')}</span>
                                </div>
                                <span className="font-bold">+{formatCurrency(group.amount)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-4 text-amber-100 text-sm">
                    ยังไม่มีเงินรอแบ่ง<br />
                    <span className="text-xs">ปิดยอดขายเพื่อเพิ่มเงินรอแบ่ง</span>
                </div>
            )}

            {/* Info */}
            <div className="mt-4 pt-4 border-t border-white/20 text-xs text-amber-100">
                💡 เงินรอแบ่งจะถูกแยกไว้จนกว่าคุณจะกดแบ่งเงินในหน้า Financials
            </div>
        </div>
    );
};
