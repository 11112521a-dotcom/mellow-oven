import React, { useState } from 'react';
import { Ingredient } from '@/types';

import { useStore } from '@/src/store';
import { Plus, Search, AlertTriangle, Image as ImageIcon, Edit2, Check, X, Trash2 } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { NumberInput } from '@/src/components/ui/NumberInput';
import { formatCurrency, formatDate } from '@/src/lib/utils';

// NEW COMPONENT: Ingredient Form (Reusable for both Add and Edit)
interface IngredientFormProps {
    isEdit?: boolean;
    ingredient?: Partial<Ingredient>;
    onSubmit: (data: Partial<Ingredient>) => Promise<void>;
    onCancel: () => void;
}

const IngredientForm: React.FC<IngredientFormProps> = ({ isEdit = false, ingredient: initialData, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Ingredient>>(initialData || {
        name: '',
        unit: 'kg',
        currentStock: 0,
        costPerUnit: 0,
        supplier: '',
        minStock: 10,
    });

    const [buyPrice, setBuyPrice] = useState<string>('');
    const [buyQuantity, setBuyQuantity] = useState<string>('');

    const units = ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'pack'];

    // Auto-calculate cost per unit when buyPrice or buyQuantity changes
    React.useEffect(() => {
        const price = parseFloat(buyPrice);
        const qty = parseFloat(buyQuantity);
        if (price > 0 && qty > 0) {
            setFormData(prev => ({ ...prev, costPerUnit: price / qty }));
        }
    }, [buyPrice, buyQuantity]);

    // Initialize buyPrice and buyQuantity when editing with bulk buy data
    React.useEffect(() => {
        if (initialData && initialData.buyUnit && initialData.conversionRate && initialData.conversionRate > 0 && initialData.costPerUnit) {
            setBuyPrice((initialData.costPerUnit * initialData.conversionRate).toFixed(2));
            setBuyQuantity(initialData.conversionRate.toString());
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-cafe-700 mb-1">ชื่อวัตถุดิบ</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                        placeholder="เช่น แป้งสาลี, น้ำตาลทราย"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-1">หน่วยใช้จริง (Stock Unit)</label>
                    <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full p-2 border border-cafe-200 rounded-lg bg-white focus:ring-2 focus:ring-cafe-500 outline-none"
                    >
                        {units.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-1">ซัพพลายเออร์</label>
                    <input
                        type="text"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        className="w-full p-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                        placeholder="ระบุร้านค้า/แบรนด์"
                    />
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-4 h-4 text-cafe-600 rounded focus:ring-cafe-500"
                            checked={formData.buyUnit !== undefined}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setFormData(prev => ({ ...prev, buyUnit: 'Pack', conversionRate: 1 }));
                                } else {
                                    const { buyUnit, conversionRate, ...rest } = formData;
                                    setFormData(rest);
                                }
                            }}
                        />
                        <span className="text-sm font-medium text-blue-800">ซื้อในหน่วยอื่น (Bulk Buy)?</span>
                    </label>
                </div>

                {formData.buyUnit !== undefined && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-blue-700 mb-1">หน่วยที่ซื้อ (Buy Unit)</label>
                                <input
                                    type="text"
                                    value={formData.buyUnit}
                                    onChange={(e) => setFormData({ ...formData, buyUnit: e.target.value })}
                                    className="w-full p-2 border border-blue-200 rounded-lg bg-white text-sm"
                                    placeholder="เช่น ลัง, แพ็ค"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-blue-700 mb-1">จำนวนย่อยต่อหน่วยซื้อ</label>
                                <div className="flex items-center gap-2">
                                    <NumberInput
                                        value={formData.conversionRate || 1}
                                        onChange={(val) => setFormData({ ...formData, conversionRate: val })}
                                        className="w-full p-2 border border-blue-200 rounded-lg bg-white text-sm"
                                    />
                                    <span className="text-xs text-blue-600 whitespace-nowrap">{formData.unit}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-blue-700 mb-1">ราคาซื้อ ({formData.buyUnit})</label>
                                <NumberInput
                                    value={parseFloat(buyPrice) || 0}
                                    onChange={(val) => setBuyPrice(val.toString())}
                                    className="w-full p-2 border border-blue-200 rounded-lg bg-white text-sm"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-blue-700 mb-1">จำนวนที่ซื้อ ({formData.buyUnit})</label>
                                <NumberInput
                                    value={parseFloat(buyQuantity) || 0}
                                    onChange={(val) => setBuyQuantity(val.toString())}
                                    className="w-full p-2 border border-blue-200 rounded-lg bg-white text-sm"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {parseFloat(buyPrice) > 0 && parseFloat(buyQuantity) > 0 && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg flex items-center justify-between border border-green-200">
                                <span className="text-sm text-blue-800">ต้นทุนจริงต่อ {formData.unit}:</span>
                                <span className="font-bold text-lg text-green-600">{formatCurrency(formData.costPerUnit || 0)}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-1">คงเหลือปัจจุบัน ({formData.unit})</label>
                    <NumberInput
                        value={formData.currentStock || 0}
                        onChange={(val) => setFormData({ ...formData, currentStock: val })}
                        className="w-full p-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-1">แจ้งเตือนเมื่อต่ำกว่า ({formData.unit})</label>
                    <NumberInput
                        value={formData.minStock || 10}
                        onChange={(val) => setFormData({ ...formData, minStock: val })}
                        className="w-full p-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-cafe-100">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-cafe-600 hover:bg-cafe-50 rounded-lg transition-colors"
                >
                    ยกเลิก
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 bg-cafe-800 text-white rounded-lg hover:bg-cafe-900 transition-colors"
                >
                    {isEdit ? 'บันทึกการแก้ไข' : 'บันทึกวัตถุดิบ'}
                </button>
            </div>
        </form>
    );
};

export { IngredientForm };
