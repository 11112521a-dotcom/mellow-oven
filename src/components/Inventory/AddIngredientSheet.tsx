import React, { useState, useEffect } from 'react';
import { Ingredient } from '@/types';
import { X, Check, Package, DollarSign, Scale, ChevronDown, Calculator, Info, Plus } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';
import { NumberInput } from '@/src/components/ui/NumberInput';

const CATEGORIES = ['แป้ง', 'น้ำตาล', 'นม', 'ผลไม้', 'เครื่องปรุง', 'บรรจุภัณฑ์', 'อื่นๆ'];
const UNITS = ['กก.', 'กรัม', 'ลิตร', 'มล.', 'ชิ้น', 'กล่อง', 'แพ็ค', 'ถุง', 'กระป๋อง', 'ขวด'];

interface AddIngredientSheetProps {
    isOpen: boolean;
    editingIngredient?: Ingredient | null; // null = Add mode, Ingredient = Edit mode
    onClose: () => void;
    onSubmit: (ingredient: Partial<Ingredient>) => Promise<void>;
    onDelete?: (id: string) => void;
}

export const AddIngredientSheet: React.FC<AddIngredientSheetProps> = ({
    isOpen,
    editingIngredient,
    onClose,
    onSubmit,
    onDelete,
}) => {
    const isEdit = !!editingIngredient;

    const [form, setForm] = useState<Partial<Ingredient>>({
        name: '', unit: 'กก.', currentStock: 0, costPerUnit: 0,
        supplier: '', minStock: 10, category: 'อื่นๆ',
    });
    const [buyPrice, setBuyPrice] = useState('');
    const [buyQuantity, setBuyQuantity] = useState('');
    const [useBulk, setUseBulk] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            if (editingIngredient) {
                setForm({
                    name: editingIngredient.name,
                    unit: editingIngredient.unit,
                    currentStock: editingIngredient.currentStock,
                    costPerUnit: editingIngredient.costPerUnit,
                    supplier: editingIngredient.supplier,
                    minStock: editingIngredient.minStock || 10,
                    category: editingIngredient.category || 'อื่นๆ',
                    buyUnit: editingIngredient.buyUnit,
                    conversionRate: editingIngredient.conversionRate,
                });
                setUseBulk(!!editingIngredient.buyUnit);
                if (editingIngredient.buyUnit && editingIngredient.conversionRate) {
                    setBuyPrice((editingIngredient.costPerUnit * editingIngredient.conversionRate).toFixed(2));
                    setBuyQuantity(editingIngredient.conversionRate.toString());
                }
            } else {
                setForm({ name: '', unit: 'กก.', currentStock: 0, costPerUnit: 0, supplier: '', minStock: 10, category: 'อื่นๆ' });
                setBuyPrice('');
                setBuyQuantity('');
                setUseBulk(false);
            }
        }
    }, [isOpen, editingIngredient]);

    // Auto-calculate cost per unit
    useEffect(() => {
        const price = parseFloat(buyPrice);
        const qty = parseFloat(buyQuantity);
        if (price > 0 && qty > 0) {
            setForm(prev => ({ ...prev, costPerUnit: price / qty }));
        }
    }, [buyPrice, buyQuantity]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!form.name || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const submitData: Partial<Ingredient> = {
                ...form,
                currentStock: Number(form.currentStock) || 0,
                costPerUnit: Number(form.costPerUnit) || 0,
                minStock: Number(form.minStock) || 10,
            };
            if (useBulk) {
                submitData.buyUnit = form.buyUnit || 'ลัง';
                submitData.conversionRate = form.conversionRate || 1;
            } else {
                submitData.buyUnit = undefined;
                submitData.conversionRate = undefined;
            }
            if (editingIngredient) {
                submitData.id = editingIngredient.id;
            }
            await onSubmit(submitData);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const calculatedCost = useBulk && parseFloat(buyPrice) > 0 && (form.conversionRate || 0) > 0
        ? parseFloat(buyPrice) / (form.conversionRate || 1)
        : form.costPerUnit || 0;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={onClose} />

            {/* Sheet */}
            <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
                <div className="bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
                    {/* Handle */}
                    <div className="flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10">
                        <div className="w-10 h-1 bg-stone-300 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="px-6 pb-4 border-b border-stone-100 sticky top-5 bg-white z-10">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-stone-800">
                                {isEdit ? '✏️ แก้ไขวัตถุดิบ' : '➕ เพิ่มวัตถุดิบใหม่'}
                            </h3>
                            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl">
                                <X size={20} className="text-stone-400" />
                            </button>
                        </div>
                    </div>

                    <div className="px-6 py-4 space-y-5">
                        {/* Section 1: Basic Info */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                <Package size={14} /> ข้อมูลทั่วไป
                            </h4>
                            <input
                                type="text"
                                value={form.name || ''}
                                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                                placeholder="ชื่อวัตถุดิบ *"
                                className="w-full p-3 bg-stone-50 border-2 border-stone-200 focus:border-amber-500 rounded-xl text-base font-medium outline-none transition-colors"
                                autoFocus
                            />

                            <div className="grid grid-cols-2 gap-3">
                                {/* Category */}
                                <div className="relative">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">หมวดหมู่</label>
                                    <select
                                        value={form.category || 'อื่นๆ'}
                                        onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl appearance-none text-sm font-medium outline-none focus:border-amber-500"
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 bottom-3 text-stone-400 pointer-events-none" size={14} />
                                </div>

                                {/* Unit */}
                                <div className="relative">
                                    <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">หน่วย</label>
                                    <select
                                        value={form.unit || 'กก.'}
                                        onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl appearance-none text-sm font-medium outline-none focus:border-amber-500"
                                    >
                                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 bottom-3 text-stone-400 pointer-events-none" size={14} />
                                </div>
                            </div>

                            {/* Supplier */}
                            <input
                                type="text"
                                value={form.supplier || ''}
                                onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))}
                                placeholder="ซัพพลายเออร์"
                                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-amber-500 transition-colors"
                            />
                        </div>

                        {/* Section 2: Cost Calculator */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                <DollarSign size={14} /> การคำนวณต้นทุน
                            </h4>

                            {/* Bulk toggle */}
                            <div className="flex bg-stone-100 rounded-xl p-1">
                                <button
                                    type="button"
                                    onClick={() => { setUseBulk(false); setForm(p => ({ ...p, buyUnit: undefined, conversionRate: undefined })); }}
                                    className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${!useBulk ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'
                                        }`}
                                >
                                    ซื้อเป็นหน่วยย่อย ({form.unit})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setUseBulk(true); setForm(p => ({ ...p, buyUnit: p.buyUnit || 'ลัง', conversionRate: p.conversionRate || 1 })); }}
                                    className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${useBulk ? 'bg-blue-500 text-white shadow-sm' : 'text-stone-400'
                                        }`}
                                >
                                    ซื้อยกแพ็ค/ลัง
                                </button>
                            </div>

                            {useBulk && (
                                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 space-y-3">
                                    <div className="flex items-center gap-2 bg-white rounded-lg p-2 border border-blue-100">
                                        <div className="flex-1 text-center">
                                            <p className="text-[10px] text-blue-500 font-bold">หน่วยซื้อ</p>
                                            <input
                                                type="text"
                                                value={form.buyUnit || ''}
                                                onChange={e => setForm(p => ({ ...p, buyUnit: e.target.value }))}
                                                className="w-full text-center font-bold text-blue-800 bg-transparent border-b border-blue-200 focus:border-blue-500 outline-none p-1"
                                                placeholder="ลัง"
                                            />
                                        </div>
                                        <span className="text-blue-400 font-bold">=</span>
                                        <div className="flex-1 text-center">
                                            <p className="text-[10px] text-blue-500 font-bold">จำนวนย่อย</p>
                                            <NumberInput
                                                value={form.conversionRate || 0}
                                                onChange={val => setForm(p => ({ ...p, conversionRate: val }))}
                                                className="w-full text-center font-bold text-blue-800 bg-transparent border-b border-blue-200 focus:border-blue-500 outline-none p-1"
                                                placeholder="0"
                                                allowDecimals
                                            />
                                        </div>
                                        <span className="text-sm text-stone-500 font-medium pt-4">{form.unit}</span>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">
                                        ราคาซื้อ {useBulk ? `(ต่อ${form.buyUnit})` : `(ต่อ${form.unit})`}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-stone-400 text-sm">฿</span>
                                        <NumberInput
                                            value={parseFloat(buyPrice) || 0}
                                            onChange={val => setBuyPrice(val === 0 ? '' : val.toString())}
                                            className="w-full p-2.5 pl-7 bg-stone-50 border border-stone-200 rounded-xl outline-none text-sm focus:border-amber-500"
                                            placeholder="0.00"
                                            allowDecimals
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">จำนวนที่ซื้อ</label>
                                    <NumberInput
                                        value={parseFloat(buyQuantity) || 0}
                                        onChange={val => setBuyQuantity(val === 0 ? '' : val.toString())}
                                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-sm focus:border-amber-500"
                                        placeholder="1"
                                        allowDecimals
                                    />
                                </div>
                            </div>

                            {/* Cost preview */}
                            <div className={`flex items-center justify-between p-3 rounded-xl border ${calculatedCost > 0
                                ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200'
                                : 'bg-stone-50 border-stone-200 border-dashed'
                                }`}>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${calculatedCost > 0 ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-400'
                                        }`}>
                                        <DollarSign size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-stone-700">ต้นทุนต่อ {form.unit}</p>
                                        <p className="text-[10px] text-stone-400">{calculatedCost > 0 ? 'คำนวณอัตโนมัติ ✓' : 'กรอกราคาซื้อ'}</p>
                                    </div>
                                </div>
                                <p className={`text-xl font-black ${calculatedCost > 0 ? 'text-emerald-600' : 'text-stone-300'}`}>
                                    {formatCurrency(calculatedCost)}
                                </p>
                            </div>
                        </div>

                        {/* Section 3: Stock Control */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                                <Scale size={14} /> การควบคุมสต็อก
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">คงเหลือ ({form.unit})</label>
                                    <NumberInput
                                        value={form.currentStock ?? 0}
                                        onChange={val => setForm(p => ({ ...p, currentStock: val }))}
                                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-sm font-bold text-center focus:border-amber-500"
                                        allowDecimals
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">แจ้งเตือนเมื่อ ≤</label>
                                    <NumberInput
                                        value={form.minStock ?? 0}
                                        onChange={val => setForm(p => ({ ...p, minStock: val }))}
                                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none text-sm font-bold text-center focus:border-amber-500"
                                        allowDecimals
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="px-6 pb-8 pt-2 flex gap-3">
                        {isEdit && onDelete && (
                            <button
                                onClick={() => { onDelete(editingIngredient!.id); onClose(); }}
                                className="px-4 py-4 bg-red-50 text-red-500 font-semibold rounded-2xl hover:bg-red-100 transition-colors text-sm"
                            >
                                ลบ
                            </button>
                        )}
                        <button
                            onClick={handleSubmit}
                            disabled={!form.name || isSubmitting}
                            className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-amber-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : isEdit ? (
                                <><Check size={20} /> บันทึกการแก้ไข</>
                            ) : (
                                <><Plus size={20} /> เพิ่มวัตถุดิบ</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AddIngredientSheet;
