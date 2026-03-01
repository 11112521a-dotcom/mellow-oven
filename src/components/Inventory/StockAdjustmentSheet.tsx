import React, { useState } from 'react';
import { Ingredient, StockLog } from '@/types';
import { X, Plus, Minus, Package, Factory, Trash2, Edit3, Check } from 'lucide-react';
import { NumberInput } from '@/src/components/ui/NumberInput';

interface StockAdjustmentSheetProps {
    ingredient: Ingredient | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (id: string, quantity: number, reason: StockLog['reason'], note: string) => Promise<void>;
}

const REASONS: { key: StockLog['reason']; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'PO', label: 'รับของเข้า', icon: <Package size={18} />, color: 'bg-emerald-500 text-white' },
    { key: 'USAGE', label: 'ใช้ผลิต', icon: <Factory size={18} />, color: 'bg-blue-500 text-white' },
    { key: 'WASTE', label: 'ทิ้ง/เสีย', icon: <Trash2 size={18} />, color: 'bg-red-500 text-white' },
    { key: 'CORRECTION', label: 'แก้ไขยอด', icon: <Edit3 size={18} />, color: 'bg-stone-500 text-white' },
];

const QUICK_AMOUNTS = [1, 5, 10, 25];

export const StockAdjustmentSheet: React.FC<StockAdjustmentSheetProps> = ({
    ingredient,
    isOpen,
    onClose,
    onSubmit,
}) => {
    const [mode, setMode] = useState<'add' | 'remove'>('add');
    const [amount, setAmount] = useState<string>('');
    const [reason, setReason] = useState<StockLog['reason']>('PO');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen || !ingredient) return null;

    const numAmount = parseFloat(amount) || 0;
    const afterStock = mode === 'add'
        ? ingredient.currentStock + numAmount
        : Math.max(0, ingredient.currentStock - numAmount);

    const handleSubmit = async () => {
        if (numAmount <= 0 || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const finalQty = mode === 'add' ? numAmount : -numAmount;
            const finalReason = mode === 'remove' && reason === 'PO' ? 'USAGE' : reason;
            await onSubmit(ingredient.id, finalQty, finalReason, note);
            // Reset & close
            setAmount('');
            setNote('');
            setMode('add');
            setReason('PO');
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleQuickAmount = (qty: number) => {
        setAmount(prev => {
            const current = parseFloat(prev) || 0;
            return (current + qty).toString();
        });
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
                <div className="bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto">
                    {/* Handle */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="w-10 h-1 bg-stone-300 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="px-6 pb-4 border-b border-stone-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-stone-800">{ingredient.name}</h3>
                                <p className="text-sm text-stone-500">
                                    คงเหลือ: <strong className="text-stone-700">{ingredient.currentStock}</strong> {ingredient.unit}
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
                                <X size={20} className="text-stone-400" />
                            </button>
                        </div>
                    </div>

                    <div className="px-6 py-4 space-y-5">
                        {/* Add/Remove toggle */}
                        <div className="flex bg-stone-100 rounded-xl p-1">
                            <button
                                onClick={() => { setMode('add'); setReason('PO'); }}
                                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'add'
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                                    : 'text-stone-500 hover:text-stone-700'
                                    }`}
                            >
                                <Plus size={16} /> เพิ่มสต็อก
                            </button>
                            <button
                                onClick={() => { setMode('remove'); setReason('USAGE'); }}
                                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'remove'
                                    ? 'bg-red-500 text-white shadow-md shadow-red-200'
                                    : 'text-stone-500 hover:text-stone-700'
                                    }`}
                            >
                                <Minus size={16} /> ลดสต็อก
                            </button>
                        </div>

                        {/* Amount input + Quick amounts */}
                        <div>
                            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">จำนวน ({ingredient.unit})</label>
                            <div className="flex gap-2">
                                <NumberInput
                                    value={parseFloat(amount) || 0}
                                    onChange={val => setAmount(val === 0 ? '' : val.toString())}
                                    placeholder="0"
                                    autoFocus
                                    allowDecimals
                                    className="flex-1 text-2xl font-bold text-center bg-stone-50 border-2 border-stone-200 focus:border-amber-500 rounded-xl p-3 outline-none transition-colors"
                                />
                            </div>
                            <div className="flex gap-2 mt-2">
                                {QUICK_AMOUNTS.map(qty => (
                                    <button
                                        key={qty}
                                        onClick={() => handleQuickAmount(qty)}
                                        className="flex-1 py-2 text-sm font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors active:scale-95"
                                    >
                                        +{qty}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reason selector */}
                        <div>
                            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 block">เหตุผล</label>
                            <div className="grid grid-cols-4 gap-2">
                                {REASONS.filter(r => {
                                    if (mode === 'add') return r.key === 'PO' || r.key === 'CORRECTION';
                                    return r.key !== 'PO';
                                }).map(r => (
                                    <button
                                        key={r.key}
                                        onClick={() => setReason(r.key)}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all active:scale-95 ${reason === r.key
                                            ? `${r.color} shadow-md`
                                            : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                                            }`}
                                    >
                                        {r.icon}
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Note */}
                        <input
                            type="text"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="หมายเหตุ (ไม่บังคับ)"
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:border-amber-500 outline-none transition-colors"
                        />

                        {/* Before/After preview */}
                        {numAmount > 0 && (
                            <div className="flex items-center justify-between bg-gradient-to-r from-stone-50 to-amber-50 border border-stone-200 rounded-xl p-4">
                                <div className="text-center">
                                    <p className="text-[10px] text-stone-400 uppercase font-bold">ก่อน</p>
                                    <p className="text-xl font-bold text-stone-600">{ingredient.currentStock}</p>
                                </div>
                                <div className={`text-base font-bold ${mode === 'add' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {mode === 'add' ? `+${numAmount}` : `-${numAmount}`}
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-stone-400 uppercase font-bold">หลัง</p>
                                    <p className={`text-xl font-black ${afterStock <= (ingredient.minStock || 10) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {afterStock % 1 === 0 ? afterStock : afterStock.toFixed(1)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Submit button */}
                    <div className="px-6 pb-8 pt-2">
                        <button
                            onClick={handleSubmit}
                            disabled={numAmount <= 0 || isSubmitting}
                            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${mode === 'add'
                                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-200'
                                : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-200'
                                }`}
                        >
                            <Check size={20} />
                            {isSubmitting ? 'กำลังบันทึก...' : mode === 'add' ? 'ยืนยันรับเข้าสต็อก' : 'ยืนยันลดสต็อก'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StockAdjustmentSheet;
