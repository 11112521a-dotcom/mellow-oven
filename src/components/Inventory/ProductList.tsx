import React, { useState } from 'react';
import { Ingredient } from '@/types';

import { useStore } from '@/src/store';
import { Plus, Search, AlertTriangle, Image as ImageIcon, Edit2, Check, X, Trash2 } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { NumberInput } from '@/src/components/ui/NumberInput';
import { formatCurrency, formatDate } from '@/src/lib/utils';

export const ProductList: React.FC = () => {
    const { ingredients, addIngredient, setIngredientStock, updateIngredient, removeIngredient } = useStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Ingredient | null>(null);

    // Confirm Edit State
    const [isConfirmEditOpen, setIsConfirmEditOpen] = useState(false);
    const [confirmEditData, setConfirmEditData] = useState<{ id: string, field: 'stock' | 'supplier', value: string } | null>(null);

    // Quick Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [editingField, setEditingField] = useState<'stock' | 'supplier' | null>(null);

    // Unit Edit State
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [unitEditTarget, setUnitEditTarget] = useState<Ingredient | null>(null);
    const [newUnit, setNewUnit] = useState<string>('');

    // Form State
    const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
        name: '',
        unit: 'kg',
        currentStock: 0,
        costPerUnit: 0,
        supplier: '',
        image: ''
    });

    // Temporary state for cost calculation
    const [buyPrice, setBuyPrice] = useState<string>('');
    const [buyQuantity, setBuyQuantity] = useState<string>('');

    const units = ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'pack'];

    // Auto-calculate cost per unit when buyPrice or buyQuantity changes
    React.useEffect(() => {
        const price = parseFloat(buyPrice);
        const qty = parseFloat(buyQuantity);
        if (price > 0 && qty > 0) {
            setNewIngredient(prev => ({ ...prev, costPerUnit: price / qty }));
        }
    }, [buyPrice, buyQuantity]);

    const filteredIngredients = ingredients.filter(ing =>
        ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ing.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newIngredient.name && newIngredient.unit) {
            addIngredient({
                id: crypto.randomUUID(),
                name: newIngredient.name,
                unit: newIngredient.unit,
                currentStock: Number(newIngredient.currentStock) || 0,
                costPerUnit: Number(newIngredient.costPerUnit) || 0,
                supplier: newIngredient.supplier || 'General',
                image: newIngredient.image,
                lastUpdated: new Date().toISOString(),
            } as Ingredient);
            setIsAddModalOpen(false);
            setNewIngredient({ name: '', unit: 'kg', currentStock: 0, costPerUnit: 0, supplier: '', image: '' });
            setBuyPrice('');
            setBuyQuantity('');
        }
    };

    // Quick Edit Logic
    const startEditing = (ing: Ingredient, field: 'stock' | 'supplier') => {
        setEditingId(ing.id);
        setEditingField(field);
        setEditValue(field === 'stock' ? ing.currentStock.toString() : ing.supplier);
    };

    const saveQuickEdit = (id: string) => {
        setConfirmEditData({ id, field: editingField!, value: editValue });
        setIsConfirmEditOpen(true);
    };

    const confirmEdit = () => {
        if (confirmEditData) {
            const { id, field, value } = confirmEditData;
            if (field === 'stock') {
                const newStock = parseFloat(value);
                if (!isNaN(newStock)) {
                    setIngredientStock(id, newStock);
                }
            } else if (field === 'supplier') {
                updateIngredient(id, { supplier: value });
            }
            setEditingId(null);
            setEditingField(null);
            setIsConfirmEditOpen(false);
            setConfirmEditData(null);
        }
    };

    const cancelQuickEdit = () => {
        setEditingId(null);
        setEditingField(null);
    };

    // Unit Edit Logic
    const openUnitModal = (ing: Ingredient) => {
        setUnitEditTarget(ing);
        setNewUnit(ing.unit);
        setIsUnitModalOpen(true);
    };

    const saveUnitEdit = () => {
        if (unitEditTarget && newUnit) {
            updateIngredient(unitEditTarget.id, { unit: newUnit });
            setIsUnitModalOpen(false);
            setUnitEditTarget(null);
        }
    };

    const openDeleteModal = (ing: Ingredient) => {
        setDeleteTarget(ing);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (deleteTarget) {
            removeIngredient(deleteTarget.id);
            setIsDeleteModalOpen(false);
            setDeleteTarget(null);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden">
            <div className="p-6 border-b border-cafe-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-cafe-800">วัตถุดิบในคลัง (Stock)</h3>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-cafe-600 text-white px-4 py-2 rounded-lg hover:bg-cafe-700 transition-colors"
                >
                    <Plus size={18} /> เพิ่มวัตถุดิบ
                </button>
            </div>

            <div className="p-4 bg-cafe-50 border-b border-cafe-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400" size={20} />
                    <input
                        type="text"
                        placeholder="ค้นหาวัตถุดิบ หรือ ซัพพลายเออร์..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-cafe-200 focus:ring-2 focus:ring-cafe-500 outline-none"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-cafe-50 text-cafe-500 text-sm">
                        <tr>
                            <th className="px-6 py-4 font-medium w-16">รูป</th>
                            <th className="px-6 py-4 font-medium">ชื่อวัตถุดิบ</th>
                            <th className="px-6 py-4 font-medium">คงเหลือ (แก้ไขได้)</th>
                            <th className="px-6 py-4 font-medium">หน่วย</th>
                            <th className="px-6 py-4 font-medium">ต้นทุน/หน่วย</th>
                            <th className="px-6 py-4 font-medium">ซัพพลายเออร์ (แก้ไขได้)</th>
                            <th className="px-6 py-4 font-medium">อัพเดทล่าสุด</th>
                            <th className="px-6 py-4 font-medium w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-cafe-100">
                        {filteredIngredients.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-cafe-400">
                                    ไม่พบข้อมูลวัตถุดิบ
                                </td>
                            </tr>
                        ) : (
                            filteredIngredients.map((ing) => (
                                <tr key={ing.id} className="hover:bg-cafe-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        {ing.image ? (
                                            <img src={ing.image} alt={ing.name} className="w-10 h-10 rounded-lg object-cover border border-cafe-200" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-cafe-100 flex items-center justify-center text-cafe-400">
                                                <ImageIcon size={16} />
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-cafe-800">{ing.name}</td>

                                    {/* Stock Column */}
                                    <td className="px-6 py-4">
                                        {editingId === ing.id && editingField === 'stock' ? (
                                            <div className="flex items-center gap-2">
                                                <NumberInput
                                                    value={parseFloat(editValue) || 0}
                                                    onChange={(val) => setEditValue(val.toString())}
                                                    className="w-20 p-1 border border-cafe-300 rounded text-center focus:ring-2 focus:ring-cafe-500 outline-none"
                                                    autoFocus
                                                />
                                                <button onClick={() => saveQuickEdit(ing.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={16} /></button>
                                                <button onClick={cancelQuickEdit} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => startEditing(ing, 'stock')}
                                                className="group flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded-lg border border-transparent hover:border-cafe-200 transition-all"
                                            >
                                                <span className={`font-bold ${ing.currentStock < 10 ? 'text-red-500 flex items-center gap-1' : 'text-cafe-700'}`}>
                                                    {ing.currentStock < 10 && <AlertTriangle size={14} />}
                                                    {ing.currentStock}
                                                </span>
                                                <Edit2 size={12} className="text-cafe-300 opacity-0 group-hover:opacity-100" />
                                            </div>
                                        )}
                                    </td>

                                    {/* Unit Column */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 group">
                                            <span className="text-cafe-600">{ing.unit}</span>
                                            <button
                                                onClick={() => openUnitModal(ing)}
                                                className="text-cafe-300 opacity-0 group-hover:opacity-100 hover:text-cafe-600 transition-opacity"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                        </div>
                                    </td>

                                    <td className="px-6 py-4 text-cafe-600">{formatCurrency(ing.costPerUnit)}</td>

                                    {/* Supplier Column */}
                                    <td className="px-6 py-4">
                                        {editingId === ing.id && editingField === 'supplier' ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    className="w-32 p-1 border border-cafe-300 rounded text-left focus:ring-2 focus:ring-cafe-500 outline-none"
                                                    autoFocus
                                                />
                                                <button onClick={() => saveQuickEdit(ing.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={16} /></button>
                                                <button onClick={cancelQuickEdit} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => startEditing(ing, 'supplier')}
                                                className="group flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded-lg border border-transparent hover:border-cafe-200 transition-all"
                                            >
                                                <span className="text-cafe-600">{ing.supplier}</span>
                                                <Edit2 size={12} className="text-cafe-300 opacity-0 group-hover:opacity-100" />
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-6 py-4 text-xs text-cafe-400">{formatDate(ing.lastUpdated)}</td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => openDeleteModal(ing)}
                                            className="text-cafe-300 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                                            title="ลบวัตถุดิบ"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Ingredient Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="เพิ่มวัตถุดิบใหม่">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">ชื่อวัตถุดิบ</label>
                        <input
                            required
                            value={newIngredient.name}
                            onChange={e => setNewIngredient({ ...newIngredient, name: e.target.value })}
                            className="w-full p-2 border border-cafe-200 rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">รูปภาพ (URL)</label>
                        <input
                            type="url"
                            value={newIngredient.image}
                            onChange={e => setNewIngredient({ ...newIngredient, image: e.target.value })}
                            className="w-full p-2 border border-cafe-200 rounded-lg"
                            placeholder="https://example.com/image.jpg"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-cafe-700 mb-1">จำนวนเริ่มต้น</label>
                            <NumberInput
                                value={newIngredient.currentStock || 0}
                                onChange={val => setNewIngredient({ ...newIngredient, currentStock: val })}
                                className="w-full p-2 border border-cafe-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-cafe-700 mb-1">หน่วย</label>
                            <select
                                required
                                value={newIngredient.unit}
                                onChange={e => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                                className="w-full p-2 border border-cafe-200 rounded-lg bg-white"
                            >
                                {units.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="p-4 bg-cafe-50 rounded-lg border border-cafe-100 space-y-3">
                        <h4 className="text-sm font-bold text-cafe-800">คำนวณต้นทุน (Auto Calculate)</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-cafe-500 mb-1">ราคาซื้อมา (บาท)</label>
                                <NumberInput
                                    value={parseFloat(buyPrice) || 0}
                                    onChange={val => setBuyPrice(val.toString())}
                                    className="w-full p-2 border border-cafe-200 rounded-lg text-sm"
                                    placeholder="เช่น 100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-cafe-500 mb-1">จำนวนที่ได้</label>
                                <NumberInput
                                    value={parseFloat(buyQuantity) || 0}
                                    onChange={val => setBuyQuantity(val.toString())}
                                    className="w-full p-2 border border-cafe-200 rounded-lg text-sm"
                                    placeholder="เช่น 1"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-cafe-200">
                            <span className="text-sm text-cafe-600">ต้นทุนต่อหน่วย:</span>
                            <span className="font-bold text-cafe-900">{formatCurrency(newIngredient.costPerUnit || 0)} / {newIngredient.unit}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="hidden"> {/* Hidden because auto-calculated */}
                            <label className="block text-sm font-medium text-cafe-700 mb-1">ต้นทุนต่อหน่วย</label>
                            <NumberInput
                                value={newIngredient.costPerUnit || 0}
                                onChange={val => setNewIngredient({ ...newIngredient, costPerUnit: val })}
                                className="w-full p-2 border border-cafe-200 rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-cafe-700 mb-1">ซัพพลายเออร์</label>
                            <input
                                value={newIngredient.supplier}
                                onChange={e => setNewIngredient({ ...newIngredient, supplier: e.target.value })}
                                className="w-full p-2 border border-cafe-200 rounded-lg"
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-cafe-600 text-white py-2 rounded-lg hover:bg-cafe-700">บันทึก</button>
                </form>
            </Modal>

            {/* Edit Unit Modal */}
            <Modal isOpen={isUnitModalOpen} onClose={() => setIsUnitModalOpen(false)} title="แก้ไขหน่วยนับ (Edit Unit)">
                <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="font-bold text-yellow-800 text-sm">ต้องการแก้ไขหน่วยใช่ไหม?</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                                การเปลี่ยนหน่วยอาจส่งผลต่อการคำนวณต้นทุนและสูตรอาหาร กรุณาตรวจสอบให้แน่ใจว่าตัวเลขสต็อกสัมพันธ์กับหน่วยใหม่
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">เลือกหน่วยใหม่</label>
                        <select
                            value={newUnit}
                            onChange={(e) => setNewUnit(e.target.value)}
                            className="w-full p-2 border border-cafe-200 rounded-lg bg-white"
                        >
                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => setIsUnitModalOpen(false)}
                            className="px-4 py-2 text-cafe-600 hover:bg-cafe-50 rounded-lg transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={saveUnitEdit}
                            className="px-4 py-2 bg-cafe-800 text-white rounded-lg hover:bg-cafe-900 transition-colors"
                        >
                            ยืนยันการแก้ไข
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="ยืนยันการลบ">
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="font-bold text-red-800 text-sm">ต้องการลบวัตถุดิบใช่ไหม?</h4>
                            <p className="text-sm text-red-700 mt-1">
                                การลบวัตถุดิบ "{deleteTarget?.name}" จะไม่สามารถกู้คืนได้
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 text-cafe-600 hover:bg-cafe-50 rounded-lg transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            ยืนยันการลบ
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Confirmation Modal */}
            <Modal isOpen={isConfirmEditOpen} onClose={() => setIsConfirmEditOpen(false)} title="ยืนยันการแก้ไข">
                <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="font-bold text-yellow-800 text-sm">ต้องการแก้ไขข้อมูลใช่ไหม?</h4>
                            <p className="text-sm text-yellow-700 mt-1">
                                คุณกำลังจะเปลี่ยน {confirmEditData?.field === 'stock' ? 'จำนวนคงเหลือ' : 'ซัพพลายเออร์'} เป็น "{confirmEditData?.value}"
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => setIsConfirmEditOpen(false)}
                            className="px-4 py-2 text-cafe-600 hover:bg-cafe-50 rounded-lg transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={confirmEdit}
                            className="px-4 py-2 bg-cafe-800 text-white rounded-lg hover:bg-cafe-900 transition-colors"
                        >
                            ยืนยันการแก้ไข
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
