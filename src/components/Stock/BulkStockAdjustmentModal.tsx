// ============================================================
// 📦 Bulk Stock Adjustment Modal
// 🛡️ Mellow Oven Standards Compliance:
// - #1: Store-First Logic (uses Zustand bulkAdjustStock)
// - #13: Memory Leak Prevention (cleanup in useEffect)
// - #15: Idempotency (loading state prevents double-submit)
// - #17: Accessibility (aria-labels, button elements)
// - #21: Sticky Zero (strip leading zeros, allow empty state)
// - #22: ESC dismiss, backdrop click, 44px buttons, scroll lock
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@/src/store';
import { X, Save, AlertTriangle, Check, Minus, Plus, Package } from 'lucide-react';

// ============================================================
// Types
// ============================================================
interface BulkStockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface AdjustmentEntry {
    ingredientId: string;
    name: string;
    unit: string;
    currentStock: number;
    adjustment: string; // String for input handling
}

// ============================================================
// Constants (Rule #19)
// ============================================================
const REASON_OPTIONS = [
    { value: 'CORRECTION', label: '🔧 แก้ไข/ปรับปรุง' },
    { value: 'PO', label: '📥 รับของเข้า (PO)' },
    { value: 'USAGE', label: '📤 ใช้งาน' },
    { value: 'WASTE', label: '🗑️ ของเสีย' },
    { value: 'SPILLAGE', label: '💧 หก/เสียหาย' },
] as const;

type ReasonType = typeof REASON_OPTIONS[number]['value'];

// ============================================================
// Main Component
// ============================================================
export const BulkStockAdjustmentModal: React.FC<BulkStockAdjustmentModalProps> = ({
    isOpen,
    onClose
}) => {
    // 🛡️ Rule #4: Select only needed state
    const ingredients = useStore((state) => state.ingredients);
    const bulkAdjustStock = useStore((state) => state.bulkAdjustStock);

    // Local state
    const [entries, setEntries] = useState<AdjustmentEntry[]>([]);
    const [reason, setReason] = useState<ReasonType>('CORRECTION');
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState('');

    // Initialize entries when modal opens
    useEffect(() => {
        if (isOpen && ingredients.length > 0) {
            setEntries(
                ingredients.map(ing => ({
                    ingredientId: ing.id,
                    name: ing.name,
                    unit: ing.unit,
                    currentStock: ing.currentStock ?? 0,
                    adjustment: '' // #21: Allow empty state
                }))
            );
            setErrors([]);
            setSuccessMessage('');
        }
    }, [isOpen, ingredients]);

    // #22: ESC key to dismiss modal
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown); // #13: Cleanup
    }, [isOpen, onClose]);

    // #22: Scroll lock when modal is open
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow; // #13: Cleanup
            };
        }
    }, [isOpen]);

    // #22: Backdrop click to dismiss
    const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }, [onClose]);

    // Handle adjustment input change
    const handleAdjustmentChange = useCallback((ingredientId: string, value: string) => {
        // #21: Strip non-numeric except minus and dot
        const sanitized = value.replace(/[^0-9.-]/g, '');

        setEntries(prev => prev.map(entry =>
            entry.ingredientId === ingredientId
                ? { ...entry, adjustment: sanitized }
                : entry
        ));
    }, []);

    // Quick adjust buttons
    const quickAdjust = useCallback((ingredientId: string, delta: number) => {
        setEntries(prev => prev.map(entry => {
            if (entry.ingredientId !== ingredientId) return entry;
            const currentValue = entry.adjustment === '' ? 0 : parseFloat(entry.adjustment);
            const newValue = (isNaN(currentValue) ? 0 : currentValue) + delta;
            return { ...entry, adjustment: newValue.toString() };
        }));
    }, []);

    // Calculate which entries have changes
    const entriesWithChanges = useMemo(() => {
        return entries.filter(e => {
            const val = parseFloat(e.adjustment);
            return !isNaN(val) && val !== 0;
        });
    }, [entries]);

    // Handle submit
    const handleSubmit = useCallback(async () => {
        if (isSubmitting || entriesWithChanges.length === 0) return;

        setIsSubmitting(true); // #15: Prevent double-submit
        setErrors([]);
        setSuccessMessage('');

        const adjustments = entriesWithChanges.map(e => ({
            ingredientId: e.ingredientId,
            quantity: parseFloat(e.adjustment),
            reason: reason,
            note: note || `Bulk adjustment: ${REASON_OPTIONS.find(r => r.value === reason)?.label}`
        }));

        try {
            const result = await bulkAdjustStock(adjustments);

            if (result.success) {
                setSuccessMessage(`✅ ปรับสต็อกสำเร็จ ${result.updatedCount} รายการ`);
                // Clear adjustments
                setEntries(prev => prev.map(e => ({ ...e, adjustment: '' })));
                // Close after short delay
                setTimeout(() => onClose(), 1500);
            } else {
                setErrors(result.errors);
            }
        } catch (err) {
            setErrors(['เกิดข้อผิดพลาด: ' + (err instanceof Error ? err.message : 'Unknown error')]);
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, entriesWithChanges, reason, note, bulkAdjustStock, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-adjust-title"
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white flex items-center justify-between">
                    <h2 id="bulk-adjust-title" className="text-lg font-bold flex items-center gap-2">
                        <Package size={20} />
                        ปรับสต็อกหลายรายการ
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="ปิด"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Options Row */}
                <div className="p-4 border-b border-stone-200 bg-stone-50 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-stone-700">เหตุผล:</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value as ReasonType)}
                            className="px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                        >
                            {REASON_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 flex-1">
                        <label className="text-sm font-medium text-stone-700">หมายเหตุ:</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
                            className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                        />
                    </div>
                </div>

                {/* Messages */}
                {errors.length > 0 && (
                    <div className="p-4 bg-red-50 border-b border-red-200">
                        <div className="flex items-start gap-2 text-red-700">
                            <AlertTriangle size={18} className="mt-0.5" />
                            <div>
                                {errors.map((err, i) => (
                                    <p key={i} className="text-sm">{err}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {successMessage && (
                    <div className="p-4 bg-green-50 border-b border-green-200">
                        <div className="flex items-center gap-2 text-green-700">
                            <Check size={18} />
                            <p className="text-sm font-medium">{successMessage}</p>
                        </div>
                    </div>
                )}

                {/* Entries List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-stone-100">
                            <tr>
                                <th className="text-left p-2 text-sm font-medium text-stone-600">วัตถุดิบ</th>
                                <th className="text-right p-2 text-sm font-medium text-stone-600">คงเหลือ</th>
                                <th className="text-center p-2 text-sm font-medium text-stone-600">ปรับ (+/-)</th>
                                <th className="text-right p-2 text-sm font-medium text-stone-600">สต็อกใหม่</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map(entry => {
                                const adjValue = entry.adjustment === '' ? 0 : parseFloat(entry.adjustment);
                                const newStock = entry.currentStock + (isNaN(adjValue) ? 0 : adjValue);
                                const hasChange = !isNaN(adjValue) && adjValue !== 0;

                                return (
                                    <tr
                                        key={entry.ingredientId}
                                        className={`border-b border-stone-100 ${hasChange ? 'bg-blue-50' : ''}`}
                                    >
                                        <td className="p-2">
                                            <span className="font-medium">{entry.name}</span>
                                        </td>
                                        <td className="p-2 text-right text-stone-600">
                                            {entry.currentStock} {entry.unit}
                                        </td>
                                        <td className="p-2">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => quickAdjust(entry.ingredientId, -1)}
                                                    className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                    aria-label={`ลด ${entry.name} 1`}
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <input
                                                    type="text"
                                                    value={entry.adjustment}
                                                    onChange={(e) => handleAdjustmentChange(entry.ingredientId, e.target.value)}
                                                    onBlur={(e) => {
                                                        // #21: Convert empty to 0 on blur (optional)
                                                        if (e.target.value === '') return;
                                                        const val = parseFloat(e.target.value);
                                                        if (isNaN(val)) {
                                                            handleAdjustmentChange(entry.ingredientId, '');
                                                        }
                                                    }}
                                                    placeholder="0"
                                                    className={`
                                                        w-20 text-center px-2 py-2 border rounded-lg font-medium
                                                        ${hasChange
                                                            ? (adjValue > 0 ? 'border-green-400 bg-green-50 text-green-700' : 'border-red-400 bg-red-50 text-red-700')
                                                            : 'border-stone-300'}
                                                    `}
                                                />
                                                <button
                                                    onClick={() => quickAdjust(entry.ingredientId, 1)}
                                                    className="p-2 hover:bg-green-100 rounded-lg text-green-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                    aria-label={`เพิ่ม ${entry.name} 1`}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className={`p-2 text-right font-medium ${newStock < 0 ? 'text-red-600' : ''}`}>
                                            {newStock.toFixed(newStock % 1 === 0 ? 0 : 2)} {entry.unit}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
                    <div className="text-sm text-stone-600">
                        {entriesWithChanges.length > 0 ? (
                            <span className="font-medium text-blue-600">
                                📦 {entriesWithChanges.length} รายการจะถูกปรับ
                            </span>
                        ) : (
                            <span>กรอกจำนวนที่ต้องการปรับ (+ เพิ่ม หรือ - ลด)</span>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors min-h-[44px]"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || entriesWithChanges.length === 0}
                            className={`
                                flex items-center gap-2 px-5 py-2 rounded-lg font-medium transition-all min-h-[44px]
                                ${isSubmitting || entriesWithChanges.length === 0
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg'}
                            `}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    บันทึกการปรับสต็อก
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkStockAdjustmentModal;
