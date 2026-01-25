// ============================================================
// Create/Edit Set Modal Component
// Form for creating and editing Set Menus
// ============================================================

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { SnackBoxSet, SnackBoxSetItem } from '../../../types';
import {
    X, Save, Plus, Trash2, Loader2,
    Package, DollarSign, Users, Gift
} from 'lucide-react';

interface CreateEditSetModalProps {
    set: SnackBoxSet | null;
    onSave: (
        data: Omit<SnackBoxSet, 'id' | 'createdAt' | 'updatedAt' | 'items'>,
        items: Omit<SnackBoxSetItem, 'id' | 'setId'>[]
    ) => Promise<void>;
    onClose: () => void;
}

interface ItemForm {
    tempId: string;
    category: string;
    quantity: number;
    selectionType: 'pick_one' | 'pick_many' | 'all';
    productIds: string[];
}

export const CreateEditSetModal: React.FC<CreateEditSetModalProps> = ({
    set,
    onSave,
    onClose
}) => {
    const { packagingOptions, products, createPackagingOption } = useStore();

    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        nameThai: '',
        description: '',
        price: 0,
        minQuantity: 20,
        packagingId: '',
        isActive: true,
        sortOrder: 0
    });
    const [items, setItems] = useState<ItemForm[]>([]);

    // Quick Add Packaging State
    const [showAddPackaging, setShowAddPackaging] = useState(false);
    const [newPackagingName, setNewPackagingName] = useState('');
    const [newPackagingCost, setNewPackagingCost] = useState('');
    const [isAddingPackaging, setIsAddingPackaging] = useState(false);

    // Populate form when editing
    useEffect(() => {
        if (set) {
            setForm({
                name: set.name,
                nameThai: set.nameThai,
                description: set.description,
                price: set.price,
                minQuantity: set.minQuantity,
                packagingId: set.packagingId,
                isActive: set.isActive,
                sortOrder: set.sortOrder
            });
            setItems(set.items.map(item => ({
                tempId: item.id,
                category: item.category,
                quantity: item.quantity,
                selectionType: item.selectionType,
                productIds: item.productIds
            })));
        }
    }, [set]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const handleToggleActive = () => {
        setForm(prev => ({ ...prev, isActive: !prev.isActive }));
    };

    const addItem = () => {
        setItems(prev => [...prev, {
            tempId: `temp-${Date.now()}`,
            category: '',
            quantity: 1,
            selectionType: 'pick_one',
            productIds: []
        }]);
    };

    const updateItem = (tempId: string, field: keyof ItemForm, value: any) => {
        setItems(prev => prev.map(item =>
            item.tempId === tempId ? { ...item, [field]: value } : item
        ));
    };

    const removeItem = (tempId: string) => {
        setItems(prev => prev.filter(item => item.tempId !== tempId));
    };

    // 🛡️ Quick Add Packaging Handler
    const handleAddPackaging = async () => {
        if (!newPackagingName.trim()) return;

        setIsAddingPackaging(true);
        try {
            const newOption = await createPackagingOption(
                newPackagingName.trim(),
                parseFloat(newPackagingCost) || 0
            );

            // Auto-select the newly created packaging
            setForm(prev => ({ ...prev, packagingId: newOption.id }));

            // Reset form
            setShowAddPackaging(false);
            setNewPackagingName('');
            setNewPackagingCost('');
        } catch (error) {
            console.error('Failed to create packaging:', error);
            alert('เกิดข้อผิดพลาดในการเพิ่มบรรจุภัณฑ์');
        } finally {
            setIsAddingPackaging(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.name) {
            alert('กรุณาใส่ชื่อ Set');
            return;
        }
        if (form.price <= 0) {
            alert('กรุณาใส่ราคา');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(form, items.map(({ tempId, ...item }) => ({
                ...item,
                sortOrder: items.indexOf(items.find(i => i.tempId === tempId)!)
            })));
        } finally {
            setIsSaving(false);
        }
    };

    // Get unique categories from products
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        {set ? 'แก้ไข Set Menu' : 'สร้าง Set Menu ใหม่'}
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Basic Info */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Package className="w-5 h-5 text-amber-600" />
                            ข้อมูลพื้นฐาน
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>ชื่อ Set (ENG)</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleFormChange}
                                    className={inputClass}
                                    placeholder="ECO SET"
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelClass}>ชื่อไทย</label>
                                <input
                                    type="text"
                                    name="nameThai"
                                    value={form.nameThai}
                                    onChange={handleFormChange}
                                    className={inputClass}
                                    placeholder="ชุดอิ่มคุ้ม"
                                />
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>คำอธิบาย</label>
                                <textarea
                                    name="description"
                                    value={form.description}
                                    onChange={handleFormChange}
                                    className={inputClass}
                                    rows={2}
                                    placeholder="รายละเอียดของ Set..."
                                />
                            </div>
                        </div>
                    </section>

                    {/* Price & Min */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-amber-600" />
                            ราคา
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>ราคาต่อชุด (บาท)</label>
                                <input
                                    type="number"
                                    name="price"
                                    value={form.price}
                                    onChange={handleFormChange}
                                    className={inputClass}
                                    min={0}
                                    step={1}
                                    required
                                />
                            </div>
                            <div>
                                <label className={labelClass}>จำนวนขั้นต่ำ (ชุด)</label>
                                <input
                                    type="number"
                                    name="minQuantity"
                                    value={form.minQuantity}
                                    onChange={handleFormChange}
                                    className={inputClass}
                                    min={1}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Packaging */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <Gift className="w-5 h-5 text-amber-600" />
                            บรรจุภัณฑ์
                        </h3>

                        {/* Dropdown + Quick Add Button */}
                        <div className="flex gap-2">
                            <select
                                name="packagingId"
                                value={form.packagingId}
                                onChange={handleFormChange}
                                className={`${inputClass} flex-1`}
                            >
                                <option value="">-- ไม่ระบุ --</option>
                                {packagingOptions.map(pkg => (
                                    <option key={pkg.id} value={pkg.id}>
                                        {pkg.name} {pkg.extraCost > 0 && `(+฿${pkg.extraCost})`}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowAddPackaging(!showAddPackaging)}
                                className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                                title="เพิ่มบรรจุภัณฑ์ใหม่"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Quick Add Form */}
                        {showAddPackaging && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                                <p className="text-sm font-medium text-amber-800">เพิ่มบรรจุภัณฑ์ใหม่</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        value={newPackagingName}
                                        onChange={(e) => setNewPackagingName(e.target.value)}
                                        placeholder="ชื่อบรรจุภัณฑ์"
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                    />
                                    <input
                                        type="number"
                                        value={newPackagingCost}
                                        onChange={(e) => setNewPackagingCost(e.target.value)}
                                        placeholder="ราคาเพิ่ม (บาท)"
                                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                                        min={0}
                                        step={1}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleAddPackaging}
                                        disabled={isAddingPackaging || !newPackagingName.trim()}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isAddingPackaging ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        บันทึก
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAddPackaging(false);
                                            setNewPackagingName('');
                                            setNewPackagingCost('');
                                        }}
                                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                                    >
                                        ยกเลิก
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Items */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <Users className="w-5 h-5 text-amber-600" />
                                รายการสินค้าใน Set
                            </h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                            >
                                <Plus className="w-4 h-4" />
                                เพิ่มรายการ
                            </button>
                        </div>

                        {items.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">
                                ยังไม่มีรายการ กดปุ่ม "เพิ่มรายการ"
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item, idx) => (
                                    <div
                                        key={item.tempId}
                                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                                    >
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-xs text-gray-500">หมวด</label>
                                                    <input
                                                        type="text"
                                                        value={item.category}
                                                        onChange={(e) => updateItem(item.tempId, 'category', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                        placeholder="เช่น เค้ก"
                                                        list={`categories-${item.tempId}`}
                                                    />
                                                    <datalist id={`categories-${item.tempId}`}>
                                                        {categories.map(cat => (
                                                            <option key={cat} value={cat} />
                                                        ))}
                                                    </datalist>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">จำนวน</label>
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(item.tempId, 'quantity', parseInt(e.target.value) || 1)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                        min={1}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">ประเภท</label>
                                                    <select
                                                        value={item.selectionType}
                                                        onChange={(e) => updateItem(item.tempId, 'selectionType', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    >
                                                        <option value="pick_one">เลือก 1</option>
                                                        <option value="pick_many">เลือกหลายตัว</option>
                                                        <option value="all">บังคับทั้งหมด</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.tempId)}
                                                className="text-red-500 hover:text-red-700 mt-4"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Active Toggle */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleToggleActive}
                            className={`relative w-12 h-6 rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.isActive ? 'left-7' : 'left-1'}`} />
                        </button>
                        <span className="text-sm text-gray-700">
                            {form.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                    </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                บันทึก
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
