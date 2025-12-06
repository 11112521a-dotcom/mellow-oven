import React, { useState } from 'react';
import { Ingredient, StockLog } from '@/types';

import { useStore } from '@/src/store';
import {
    Search,
    Plus,
    Filter,
    AlertTriangle,
    X,
    Check,
    ChevronDown,
    ChevronUp,
    Edit2,
    Trash2,
    Save,
    Package,
    Scale,
    DollarSign,
    Calculator,
    ArrowRight,
    Info
} from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { NumberInput } from '@/src/components/ui/NumberInput';
import { formatCurrency, formatDate } from '@/src/lib/utils';

export const InventoryList: React.FC = () => {
    const { ingredients, addIngredient, updateStock, updateIngredient, removeIngredient } = useStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
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

    const [activeTab, setActiveTab] = useState<'all' | 'low'>('all');

    // Stock Adjustment State
    const [isStockAdjModalOpen, setIsStockAdjModalOpen] = useState(false);
    const [stockAdjTarget, setStockAdjTarget] = useState<Ingredient | null>(null);
    const [stockAdjAmount, setStockAdjAmount] = useState<string>('');
    const [stockAdjType, setStockAdjType] = useState<'add' | 'remove'>('add');
    const [stockAdjReason, setStockAdjReason] = useState<StockLog['reason']>('USAGE');
    const [stockAdjNote, setStockAdjNote] = useState('');

    // Unit Edit State
    const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
    const [unitEditTarget, setUnitEditTarget] = useState<Ingredient | null>(null);
    const [newUnit, setNewUnit] = useState<string>('');

    // Form State
    const [newIngredient, setNewIngredient] = useState<Partial<Ingredient>>({
        name: '',
        unit: 'กก.',
        currentStock: 0,
        costPerUnit: 0,
        supplier: '',
        minStock: 10,
    });

    // Temporary state for cost calculation
    const [buyPrice, setBuyPrice] = useState<string>('');
    const [buyQuantity, setBuyQuantity] = useState<string>('');

    const units = ['กก.', 'กรัม', 'ลิตร', 'มล.', 'ชิ้น', 'กล่อง', 'แพ็ค', 'ถุง', 'กระป๋อง', 'ขวด'];

    // Auto-calculate cost per unit when buyPrice or buyQuantity changes
    React.useEffect(() => {
        const price = parseFloat(buyPrice);
        const qty = parseFloat(buyQuantity);
        if (price > 0 && qty > 0) {
            setNewIngredient(prev => ({ ...prev, costPerUnit: price / qty }));
        }
    }, [buyPrice, buyQuantity]);

    const filteredIngredients = ingredients.filter(ing => {
        const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ing.supplier.toLowerCase().includes(searchTerm.toLowerCase());

        if (activeTab === 'low') {
            return matchesSearch && ing.currentStock <= (ing.minStock || 10);
        }
        return matchesSearch;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newIngredient.name && newIngredient.unit) {
            try {
                await addIngredient({
                    id: crypto.randomUUID(), // Temporary ID, will be replaced by DB
                    name: newIngredient.name,
                    unit: newIngredient.unit,
                    currentStock: Number(newIngredient.currentStock) || 0,
                    costPerUnit: Number(newIngredient.costPerUnit) || 0,
                    supplier: newIngredient.supplier || 'General',
                    // image: '', // No image
                    lastUpdated: new Date().toISOString(),
                    buyUnit: newIngredient.buyUnit,
                    conversionRate: newIngredient.conversionRate,
                    minStock: Number(newIngredient.minStock) || 10,
                } as Ingredient);

                setIsAddModalOpen(false);
                setNewIngredient({ name: '', unit: 'กก.', currentStock: 0, costPerUnit: 0, supplier: '', minStock: 10 });
                setBuyPrice('');
                setBuyQuantity('');
                // alert('บันทึกสำเร็จ!'); // Optional success message
            } catch (error) {
                console.error("Failed to add ingredient:", error);
                alert(`เกิดข้อผิดพลาดในการบันทึก: ${error}`);
            }
        }
    };

    const openEditModal = (ing: Ingredient) => {
        setEditingIngredient(ing);
        setNewIngredient({
            name: ing.name,
            unit: ing.unit,
            currentStock: ing.currentStock,
            costPerUnit: ing.costPerUnit,
            supplier: ing.supplier,
            buyUnit: ing.buyUnit,
            conversionRate: ing.conversionRate,
            minStock: ing.minStock || 10,
        });
        // Calculate buy price if possible
        if (ing.buyUnit && ing.conversionRate && ing.conversionRate > 0) {
            setBuyPrice((ing.costPerUnit * ing.conversionRate).toFixed(2));
            setBuyQuantity(ing.conversionRate.toString());
        } else {
            setBuyPrice('');
            setBuyQuantity('');
        }
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingIngredient) return;

        try {
            await updateIngredient(editingIngredient.id, {
                name: newIngredient.name,
                unit: newIngredient.unit,
                currentStock: Number(newIngredient.currentStock) || 0,
                costPerUnit: Number(newIngredient.costPerUnit) || 0,
                supplier: newIngredient.supplier || 'General',
                buyUnit: newIngredient.buyUnit,
                conversionRate: newIngredient.conversionRate,
                minStock: Number(newIngredient.minStock) || 10,
            });

            setIsEditModalOpen(false);
            setEditingIngredient(null);
            setNewIngredient({ name: '', unit: 'กก.', currentStock: 0, costPerUnit: 0, supplier: '', minStock: 10 });
            setBuyPrice('');
            setBuyQuantity('');
        } catch (error) {
            console.error("Failed to update ingredient:", error);
            alert(`เกิดข้อผิดพลาดในการบันทึก: ${error}`);
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

    const cancelQuickEdit = () => {
        setEditingId(null);
        setEditingField(null);
    };

    const confirmEdit = () => {
        if (confirmEditData) {
            const { id, field, value } = confirmEditData;
            if (field === 'stock') {
                const newStock = parseFloat(value);
                if (!isNaN(newStock)) {
                    // Calculate difference for log
                    const diff = newStock - (ingredients.find(i => i.id === id)?.currentStock || 0);
                    updateStock(id, diff, 'CORRECTION', 'Quick Edit');
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

    // Stock Adjustment Logic
    const openStockAdjModal = (ing: Ingredient) => {
        setStockAdjTarget(ing);
        setStockAdjAmount('');
        setStockAdjType('add');
        setStockAdjReason('PO'); // Default for add
        setStockAdjNote('');
        setIsStockAdjModalOpen(true);
    };

    const handleStockAdjSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockAdjTarget || !stockAdjAmount) return;

        const qty = parseFloat(stockAdjAmount);
        if (isNaN(qty) || qty <= 0) return;

        const finalQty = stockAdjType === 'add' ? qty : -qty;

        // Auto-switch reason if removing
        let finalReason = stockAdjReason;
        if (stockAdjType === 'remove' && stockAdjReason === 'PO') {
            finalReason = 'USAGE';
        }

        await updateStock(stockAdjTarget.id, finalQty, finalReason, stockAdjNote);

        setIsStockAdjModalOpen(false);
        setStockAdjTarget(null);
        setStockAdjAmount('');
        setStockAdjNote('');
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
        <div className="overflow-hidden">
            <div className="p-6 border-b border-cafe-100 flex justify-between items-center bg-gradient-to-r from-cafe-50 to-white">
                <h3 className="text-xl font-extrabold text-cafe-800 flex items-center gap-2">
                    <Package className="text-cafe-600" size={22} />
                    วัตถุดิบในคลัง
                </h3>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-cafe-700 to-cafe-800 text-white px-5 py-2.5 rounded-xl hover:from-cafe-600 hover:to-cafe-700 transition-all shadow-md hover:shadow-lg font-medium"
                >
                    <Plus size={18} /> เพิ่มวัตถุดิบ
                </button>
            </div>

            <div className="p-4 bg-cafe-50 border-b border-cafe-100 space-y-4">
                {/* Tabs */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'all'
                            ? 'bg-cafe-800 text-white shadow-lg'
                            : 'bg-white text-cafe-600 hover:bg-cafe-100'}`}
                    >
                        ทั้งหมด ({ingredients.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('low')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'low'
                            ? 'bg-red-600 text-white shadow-lg'
                            : 'bg-white text-cafe-600 hover:bg-red-50 hover:text-red-600'}`}
                    >
                        <AlertTriangle size={16} />
                        ใกล้หมด ({ingredients.filter(i => i.currentStock <= (i.minStock || 10)).length})
                    </button>
                </div>

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
                            <th className="px-6 py-4 font-medium">ชื่อวัตถุดิบ</th>
                            <th className="px-6 py-4 font-medium">คงเหลือ (แก้ไขได้)</th>
                            <th className="px-6 py-4 font-medium hidden md:table-cell">หน่วย</th>
                            <th className="px-6 py-4 font-medium hidden md:table-cell">ต้นทุน/หน่วย</th>
                            <th className="px-6 py-4 font-medium hidden md:table-cell">ซัพพลายเออร์ (แก้ไขได้)</th>
                            <th className="px-6 py-4 font-medium hidden md:table-cell">อัพเดทล่าสุด</th>
                            <th className="px-6 py-4 font-medium w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-cafe-100">
                        {filteredIngredients.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-cafe-400">
                                    ไม่พบข้อมูลวัตถุดิบ
                                </td>
                            </tr>
                        ) : (
                            filteredIngredients.map((ing) => {
                                const isLowStock = ing.currentStock <= (ing.minStock || 10);
                                const isCritical = ing.currentStock === 0;
                                return (
                                    <tr
                                        key={ing.id}
                                        className={`group/row transition-all duration-200
                                        ${isCritical
                                                ? 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500'
                                                : isLowStock
                                                    ? 'bg-amber-50/50 hover:bg-amber-50 border-l-4 border-l-amber-400'
                                                    : 'hover:bg-cafe-50/80'}
                                    `}
                                    >
                                        <td className="px-6 py-4 font-medium text-cafe-800">
                                            <div className="flex items-center gap-2">
                                                {isCritical && <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">หมด!</span>}
                                                {ing.name}
                                            </div>
                                        </td>

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
                                                    onClick={() => openStockAdjModal(ing)}
                                                    className="group flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded-lg border border-transparent hover:border-cafe-200 transition-all"
                                                >
                                                    <span className={`font-bold text-lg flex items-center gap-1 ${ing.currentStock === 0
                                                        ? 'text-red-600'
                                                        : ing.currentStock <= (ing.minStock || 10)
                                                            ? 'text-amber-600'
                                                            : 'text-cafe-700'
                                                        }`}>
                                                        {ing.currentStock <= (ing.minStock || 10) && <AlertTriangle size={16} className="animate-pulse" />}
                                                        {ing.currentStock}
                                                    </span>
                                                    <Edit2 size={12} className="text-cafe-300 opacity-0 group-hover:opacity-100" />
                                                </div>
                                            )}
                                        </td>

                                        {/* Unit Column */}
                                        <td className="px-6 py-4 hidden md:table-cell">
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

                                        <td className="px-6 py-4 text-cafe-600 hidden md:table-cell">{formatCurrency(ing.costPerUnit)}</td>

                                        {/* Supplier Column */}
                                        <td className="px-6 py-4 hidden md:table-cell">
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

                                        <td className="px-6 py-4 text-xs text-cafe-400 hidden md:table-cell">{formatDate(ing.lastUpdated)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 opacity-60 group-hover/row:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(ing)}
                                                    className="text-cafe-500 hover:text-cafe-800 transition-all p-2 rounded-lg hover:bg-cafe-100 hover:shadow-sm"
                                                    title="แก้ไขวัตถุดิบ"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(ing)}
                                                    className="text-cafe-400 hover:text-red-600 transition-all p-2 rounded-lg hover:bg-red-100 hover:shadow-sm"
                                                    title="ลบวัตถุดิบ"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Ingredient Modal - Zenith Redesign */}
            <Modal isOpen={isAddModalOpen} onClose={() => {
                setIsAddModalOpen(false);
                setNewIngredient({ name: '', unit: 'กก.', currentStock: 0, costPerUnit: 0, supplier: '', minStock: 10 });
                setBuyPrice('');
                setBuyQuantity('');
            }} title="เพิ่มวัตถุดิบใหม่ (Add Ingredient)">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Section 1: Basic Info */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-cafe-900 flex items-center gap-2 border-b border-cafe-100 pb-2">
                            <Package size={18} className="text-cafe-600" />
                            ข้อมูลทั่วไป
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-cafe-600 mb-1.5">ชื่อวัตถุดิบ <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={newIngredient.name}
                                    onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                                    className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none transition-all"
                                    placeholder="เช่น แป้งสาลี, น้ำตาลทราย"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-cafe-600 mb-1.5">หน่วยใช้จริง (Stock Unit)</label>
                                <div className="relative">
                                    <select
                                        value={newIngredient.unit}
                                        onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                                        className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl appearance-none focus:ring-2 focus:ring-cafe-500 outline-none transition-all"
                                    >
                                        {units.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3 text-cafe-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-cafe-600 mb-1.5">ซัพพลายเออร์</label>
                                <input
                                    type="text"
                                    value={newIngredient.supplier}
                                    onChange={(e) => setNewIngredient({ ...newIngredient, supplier: e.target.value })}
                                    className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none transition-all"
                                    placeholder="ระบุร้านค้า/แบรนด์"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Buying Strategy */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-cafe-900 flex items-center gap-2 border-b border-cafe-100 pb-2">
                            <DollarSign size={18} className="text-cafe-600" />
                            การคำนวณต้นทุน
                        </h4>

                        {/* Toggle Switch */}
                        <div className="flex bg-cafe-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => {
                                    const { buyUnit, conversionRate, ...rest } = newIngredient;
                                    setNewIngredient(rest);
                                }}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${newIngredient.buyUnit === undefined
                                    ? 'bg-white text-cafe-900 shadow-sm'
                                    : 'text-cafe-500 hover:text-cafe-700'}`}
                            >
                                ซื้อเป็นหน่วยย่อย ({newIngredient.unit})
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewIngredient(prev => ({ ...prev, buyUnit: 'ลัง', conversionRate: 1 }))}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${newIngredient.buyUnit !== undefined
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-cafe-500 hover:text-cafe-700'}`}
                            >
                                ซื้อยกแพ็ค/ลัง (Bulk)
                            </button>
                        </div>

                        {newIngredient.buyUnit !== undefined ? (
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-blue-800 text-sm font-semibold">
                                    <Calculator size={16} />
                                    สูตรการแปลงหน่วย
                                </div>

                                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                    <div className="flex-1">
                                        <label className="block text-[10px] uppercase tracking-wider text-blue-500 font-bold mb-1">หน่วยที่ซื้อ</label>
                                        <input
                                            type="text"
                                            value={newIngredient.buyUnit}
                                            onChange={(e) => setNewIngredient({ ...newIngredient, buyUnit: e.target.value })}
                                            className="w-full p-1.5 bg-transparent border-b border-blue-200 focus:border-blue-500 outline-none text-center font-bold text-blue-900"
                                            placeholder="เช่น ลัง"
                                        />
                                    </div>
                                    <div className="text-blue-400 font-bold">=</div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] uppercase tracking-wider text-blue-500 font-bold mb-1">จำนวนย่อย</label>
                                        <input
                                            type="number"
                                            value={newIngredient.conversionRate || ''}
                                            onChange={(e) => setNewIngredient({ ...newIngredient, conversionRate: parseFloat(e.target.value) || 0 })}
                                            className="w-full p-1.5 bg-transparent border-b border-blue-200 focus:border-blue-500 outline-none text-center font-bold text-blue-900"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="text-sm font-medium text-cafe-600 pt-4">{newIngredient.unit}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-cafe-600 mb-1.5">ราคาซื้อ (ต่อ{newIngredient.buyUnit})</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-cafe-400">฿</span>
                                            <input
                                                type="number"
                                                value={buyPrice}
                                                onChange={(e) => setBuyPrice(e.target.value)}
                                                className="w-full p-2.5 pl-7 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-cafe-600 mb-1.5">จำนวนที่ซื้อ</label>
                                        <input
                                            type="number"
                                            value={buyQuantity}
                                            onChange={(e) => setBuyQuantity(e.target.value)}
                                            className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none"
                                            placeholder="1"
                                        />
                                    </div>
                                </div>

                                {/* Cost Preview - Always Visible */}
                                {parseFloat(buyPrice) > 0 && (newIngredient.conversionRate || 0) > 0 ? (
                                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-inner">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white shadow-md">
                                                <DollarSign size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-green-800 font-semibold">ต้นทุนจริงต่อ {newIngredient.unit}</p>
                                                <p className="text-xs text-green-600">คำนวณอัตโนมัติ ✓</p>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-black text-green-700">
                                            {formatCurrency((parseFloat(buyPrice) / (newIngredient.conversionRate || 1)))}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 border-dashed rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                                                <DollarSign size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 font-medium">ต้นทุนต่อ {newIngredient.unit}</p>
                                                <p className="text-xs text-gray-400">กรอกราคาซื้อเพื่อคำนวณ</p>
                                            </div>
                                        </div>
                                        <p className="text-xl font-bold text-gray-300">ฟ 0.00</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                                <div>
                                    <label className="block text-xs font-semibold text-cafe-600 mb-1.5">ราคาซื้อ (ต่อ{newIngredient.unit})</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-cafe-400">฿</span>
                                        <input
                                            type="number"
                                            value={buyPrice}
                                            onChange={(e) => setBuyPrice(e.target.value)}
                                            className="w-full p-2.5 pl-7 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-cafe-600 mb-1.5">จำนวนที่ซื้อ</label>
                                    <input
                                        type="number"
                                        value={buyQuantity}
                                        onChange={(e) => setBuyQuantity(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none"
                                        placeholder="1"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Stock Control */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-cafe-900 flex items-center gap-2 border-b border-cafe-100 pb-2">
                            <Scale size={18} className="text-cafe-600" />
                            การควบคุมสต็อก
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-cafe-600 mb-1.5">คงเหลือปัจจุบัน ({newIngredient.unit})</label>
                                <input
                                    type="number"
                                    value={newIngredient.currentStock ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNewIngredient({ ...newIngredient, currentStock: val === '' ? undefined : parseFloat(val) });
                                    }}
                                    className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-cafe-600 mb-1.5">แจ้งเตือนเมื่อต่ำกว่า ({newIngredient.unit})</label>
                                <input
                                    type="number"
                                    value={newIngredient.minStock ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNewIngredient({ ...newIngredient, minStock: val === '' ? undefined : parseFloat(val) });
                                    }}
                                    className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary Footer - Live Preview */}
                    {newIngredient.name && (
                        <div className="p-4 bg-gradient-to-r from-cafe-50 to-amber-50 rounded-xl border border-cafe-200 space-y-2">
                            <div className="flex items-center gap-2 text-cafe-700 font-semibold text-sm">
                                <Info size={16} />
                                สรุป: {newIngredient.name}
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                                <div className="bg-white/70 rounded-lg p-2 text-center">
                                    <p className="text-cafe-400">ซื้อแบบ</p>
                                    <p className="font-bold text-cafe-700">{newIngredient.buyUnit ? `ยก${newIngredient.buyUnit}` : `หน่วยย่อย`}</p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-2 text-center">
                                    <p className="text-cafe-400">ต้นทุน</p>
                                    <p className="font-bold text-cafe-700">
                                        {newIngredient.costPerUnit ? formatCurrency(newIngredient.costPerUnit) : '-'}/{newIngredient.unit}
                                    </p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-2 text-center">
                                    <p className="text-cafe-400">เตือนเมื่อ</p>
                                    <p className="font-bold text-amber-600">&lt; {newIngredient.minStock || 10} {newIngredient.unit}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t border-cafe-100">
                        <button
                            type="button"
                            onClick={() => {
                                setIsAddModalOpen(false);
                                setNewIngredient({ name: '', unit: 'กก.', currentStock: 0, costPerUnit: 0, supplier: '', minStock: 10 });
                                setBuyPrice('');
                                setBuyQuantity('');
                            }}
                            className="px-5 py-2.5 text-cafe-600 font-medium hover:bg-cafe-50 rounded-xl transition-colors border border-cafe-200"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={!newIngredient.name}
                            className="px-6 py-2.5 bg-gradient-to-r from-cafe-700 to-cafe-900 text-white font-bold rounded-xl hover:from-cafe-600 hover:to-cafe-800 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus size={18} />
                            เพิ่มวัตถุดิบ
                        </button>
                    </div>
                </form>
            </Modal>


            {/* Edit Ingredient Modal - Zenith Redesign */}
            <Modal isOpen={isEditModalOpen} onClose={() => {
                setIsEditModalOpen(false);
                setEditingIngredient(null);
                setNewIngredient({ name: '', unit: 'กก.', currentStock: 0, costPerUnit: 0, supplier: '', minStock: 10 });
                setBuyPrice('');
                setBuyQuantity('');
            }} title="แก้ไขวัตถุดิบ (Edit Ingredient)">
                <form onSubmit={handleEditSubmit} className="space-y-6">

                    {/* Section 1: Basic Info */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-cafe-900 flex items-center gap-2 border-b border-cafe-100 pb-2">
                            <Package size={18} className="text-cafe-600" />
                            ข้อมูลทั่วไป
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-cafe-600 mb-1.5">ชื่อวัตถุดิบ <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    value={newIngredient.name}
                                    onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                                    className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none transition-all"
                                    placeholder="เช่น แป้งสาลี, น้ำตาลทราย"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-cafe-600 mb-1.5">หน่วยใช้จริง (Stock Unit)</label>
                                <div className="relative">
                                    <select
                                        value={newIngredient.unit}
                                        onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                                        className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl appearance-none focus:ring-2 focus:ring-cafe-500 outline-none transition-all"
                                    >
                                        {units.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-3 text-cafe-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-cafe-600 mb-1.5">ซัพพลายเออร์</label>
                                <input
                                    type="text"
                                    value={newIngredient.supplier}
                                    onChange={(e) => setNewIngredient({ ...newIngredient, supplier: e.target.value })}
                                    className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none transition-all"
                                    placeholder="ระบุร้านค้า/แบรนด์"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Buying Strategy */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-cafe-900 flex items-center gap-2 border-b border-cafe-100 pb-2">
                            <DollarSign size={18} className="text-cafe-600" />
                            การคำนวณต้นทุน
                        </h4>

                        {/* Toggle Switch */}
                        <div className="flex bg-cafe-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => {
                                    const { buyUnit, conversionRate, ...rest } = newIngredient;
                                    setNewIngredient(rest);
                                }}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${newIngredient.buyUnit === undefined
                                    ? 'bg-white text-cafe-900 shadow-sm'
                                    : 'text-cafe-500 hover:text-cafe-700'}`}
                            >
                                ซื้อเป็นหน่วยย่อย ({newIngredient.unit})
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewIngredient(prev => ({ ...prev, buyUnit: 'ลัง', conversionRate: 1 }))}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${newIngredient.buyUnit !== undefined
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-cafe-500 hover:text-cafe-700'}`}
                            >
                                ซื้อยกแพ็ค/ลัง (Bulk)
                            </button>
                        </div>

                        {newIngredient.buyUnit !== undefined ? (
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-2 text-blue-800 text-sm font-semibold">
                                    <Calculator size={16} />
                                    สูตรการแปลงหน่วย
                                </div>

                                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                                    <div className="flex-1">
                                        <label className="block text-[10px] uppercase tracking-wider text-blue-500 font-bold mb-1">หน่วยที่ซื้อ</label>
                                        <input
                                            type="text"
                                            value={newIngredient.buyUnit}
                                            onChange={(e) => setNewIngredient({ ...newIngredient, buyUnit: e.target.value })}
                                            className="w-full p-1.5 bg-transparent border-b border-blue-200 focus:border-blue-500 outline-none text-center font-bold text-blue-900"
                                            placeholder="เช่น ลัง"
                                        />
                                    </div>
                                    <div className="text-blue-400 font-bold">=</div>
                                    <div className="flex-1">
                                        <label className="block text-[10px] uppercase tracking-wider text-blue-500 font-bold mb-1">จำนวนย่อย</label>
                                        <input
                                            type="number"
                                            value={newIngredient.conversionRate || ''}
                                            onChange={(e) => setNewIngredient({ ...newIngredient, conversionRate: parseFloat(e.target.value) || 0 })}
                                            className="w-full p-1.5 bg-transparent border-b border-blue-200 focus:border-blue-500 outline-none text-center font-bold text-blue-900"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="text-sm font-medium text-cafe-600 pt-4">{newIngredient.unit}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-cafe-600 mb-1.5">ราคาซื้อ (ต่อ{newIngredient.buyUnit})</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-cafe-400">฿</span>
                                            <input
                                                type="number"
                                                value={buyPrice}
                                                onChange={(e) => setBuyPrice(e.target.value)}
                                                className="w-full p-2.5 pl-7 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-cafe-600 mb-1.5">จำนวนที่ซื้อ</label>
                                        <input
                                            type="number"
                                            value={buyQuantity}
                                            onChange={(e) => setBuyQuantity(e.target.value)}
                                            className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none"
                                            placeholder="1"
                                        />
                                    </div>
                                </div>

                                {/* Cost Preview - Always Visible */}
                                {parseFloat(buyPrice) > 0 && (newIngredient.conversionRate || 0) > 0 ? (
                                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-inner">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white shadow-md">
                                                <DollarSign size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-green-800 font-semibold">ต้นทุนจริงต่อ {newIngredient.unit}</p>
                                                <p className="text-xs text-green-600">คำนวณอัตโนมัติ ✓</p>
                                            </div>
                                        </div>
                                        <p className="text-2xl font-black text-green-700">
                                            {formatCurrency((parseFloat(buyPrice) / (newIngredient.conversionRate || 1)))}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 border-dashed rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                                                <DollarSign size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 font-medium">ต้นทุนต่อ {newIngredient.unit}</p>
                                                <p className="text-xs text-gray-400">กรอกราคาซื้อเพื่อคำนวณ</p>
                                            </div>
                                        </div>
                                        <p className="text-xl font-bold text-gray-300">ฟ 0.00</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                                <div>
                                    <label className="block text-xs font-semibold text-cafe-600 mb-1.5">ราคาซื้อ (ต่อ{newIngredient.unit})</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-cafe-400">฿</span>
                                        <input
                                            type="number"
                                            value={buyPrice}
                                            onChange={(e) => setBuyPrice(e.target.value)}
                                            className="w-full p-2.5 pl-7 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-cafe-600 mb-1.5">จำนวนที่ซื้อ</label>
                                    <input
                                        type="number"
                                        value={buyQuantity}
                                        onChange={(e) => setBuyQuantity(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none"
                                        placeholder="1"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Stock Control */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-cafe-900 flex items-center gap-2 border-b border-cafe-100 pb-2">
                            <Scale size={18} className="text-cafe-600" />
                            การควบคุมสต็อก
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-cafe-600 mb-1.5">คงเหลือปัจจุบัน ({newIngredient.unit})</label>
                                <input
                                    type="number"
                                    value={newIngredient.currentStock ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNewIngredient({ ...newIngredient, currentStock: val === '' ? undefined : parseFloat(val) });
                                    }}
                                    className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-cafe-600 mb-1.5">แจ้งเตือนเมื่อต่ำกว่า ({newIngredient.unit})</label>
                                <input
                                    type="number"
                                    value={newIngredient.minStock ?? ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNewIngredient({ ...newIngredient, minStock: val === '' ? undefined : parseFloat(val) });
                                    }}
                                    className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Summary Footer - Live Preview */}
                    {newIngredient.name && (
                        <div className="p-4 bg-gradient-to-r from-cafe-50 to-amber-50 rounded-xl border border-cafe-200 space-y-2">
                            <div className="flex items-center gap-2 text-cafe-700 font-semibold text-sm">
                                <Info size={16} />
                                สรุป: {newIngredient.name}
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-xs">
                                <div className="bg-white/70 rounded-lg p-2 text-center">
                                    <p className="text-cafe-400">ซื้อแบบ</p>
                                    <p className="font-bold text-cafe-700">{newIngredient.buyUnit ? `ยก${newIngredient.buyUnit}` : `หน่วยย่อย`}</p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-2 text-center">
                                    <p className="text-cafe-400">ต้นทุน</p>
                                    <p className="font-bold text-cafe-700">
                                        {newIngredient.costPerUnit ? formatCurrency(newIngredient.costPerUnit) : '-'}/{newIngredient.unit}
                                    </p>
                                </div>
                                <div className="bg-white/70 rounded-lg p-2 text-center">
                                    <p className="text-cafe-400">เตือนเมื่อ</p>
                                    <p className="font-bold text-amber-600">&lt; {newIngredient.minStock || 10} {newIngredient.unit}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-6 border-t border-cafe-100">
                        <button
                            type="button"
                            onClick={() => {
                                setIsEditModalOpen(false);
                                setEditingIngredient(null);
                                setNewIngredient({ name: '', unit: 'กก.', currentStock: 0, costPerUnit: 0, supplier: '', minStock: 10 });
                                setBuyPrice('');
                                setBuyQuantity('');
                            }}
                            className="px-5 py-2.5 text-cafe-600 font-medium hover:bg-cafe-50 rounded-xl transition-colors border border-cafe-200"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            disabled={!newIngredient.name}
                            className="px-6 py-2.5 bg-gradient-to-r from-cafe-700 to-cafe-900 text-white font-bold rounded-xl hover:from-cafe-600 hover:to-cafe-800 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            บันทึกการแก้ไข
                        </button>
                    </div>
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

            {/* Stock Adjustment Modal */}
            <Modal isOpen={isStockAdjModalOpen} onClose={() => setIsStockAdjModalOpen(false)} title="ปรับปรุงสต็อก (Stock Adjustment)">
                <form onSubmit={handleStockAdjSubmit} className="space-y-4">
                    <div className="bg-cafe-50 p-4 rounded-lg border border-cafe-100 mb-4">
                        <h4 className="font-bold text-cafe-800 mb-1">{stockAdjTarget?.name}</h4>
                        <p className="text-sm text-cafe-600">คงเหลือปัจจุบัน: <span className="font-bold">{stockAdjTarget?.currentStock} {stockAdjTarget?.unit}</span></p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-cafe-700 mb-1">ประเภทรายการ</label>
                            <div className="flex bg-cafe-100 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setStockAdjType('add')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${stockAdjType === 'add' ? 'bg-green-500 text-white shadow-sm' : 'text-cafe-600 hover:bg-cafe-200'}`}
                                >
                                    เพิ่ม (+)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStockAdjType('remove')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${stockAdjType === 'remove' ? 'bg-red-500 text-white shadow-sm' : 'text-cafe-600 hover:bg-cafe-200'}`}
                                >
                                    ลด (-)
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-cafe-700 mb-1">จำนวน ({stockAdjTarget?.unit})</label>
                            <NumberInput
                                value={parseFloat(stockAdjAmount) || 0}
                                onChange={(val) => setStockAdjAmount(val.toString())}
                                className="w-full p-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">เหตุผล</label>
                        <select
                            value={stockAdjReason}
                            onChange={(e) => setStockAdjReason(e.target.value as StockLog['reason'])}
                            className="w-full p-2 border border-cafe-200 rounded-lg bg-white focus:ring-2 focus:ring-cafe-500 outline-none"
                        >
                            {stockAdjType === 'add' ? (
                                <>
                                    <option value="PO">สั่งซื้อเพิ่ม (Purchase Order)</option>
                                    <option value="CORRECTION">ปรับปรุงยอด (Correction)</option>
                                </>
                            ) : (
                                <>
                                    <option value="USAGE">ใช้ในร้าน (Usage)</option>
                                    <option value="WASTE">ของเสีย/หมดอายุ (Waste)</option>
                                    <option value="SPILLAGE">ทำหก/ตกหล่น (Spillage)</option>
                                    <option value="CORRECTION">ปรับปรุงยอด (Correction)</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">หมายเหตุ (Optional)</label>
                        <input
                            type="text"
                            value={stockAdjNote}
                            onChange={(e) => setStockAdjNote(e.target.value)}
                            className="w-full p-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                            placeholder="ระบุรายละเอียดเพิ่มเติม..."
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-cafe-100">
                        <button
                            type="button"
                            onClick={() => setIsStockAdjModalOpen(false)}
                            className="px-4 py-2 text-cafe-600 hover:bg-cafe-50 rounded-lg transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className={`px-4 py-2 text-white rounded-lg transition-colors ${stockAdjType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            ยืนยัน ({stockAdjType === 'add' ? '+' : '-'}{stockAdjAmount || '0'} {stockAdjTarget?.unit})
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
