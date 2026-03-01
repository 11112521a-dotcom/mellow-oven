// ============================================================
// Create/Edit Set Modal Component
// Form for creating and editing Set Menus
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { SnackBoxSet, SnackBoxSetItem, Product } from '../../../types';
import {
    X, Save, Plus, Trash2, Loader2,
    Package, DollarSign, Users, Gift, Edit3, Settings, AlertCircle, ChevronDown, Check, LayoutGrid, ShoppingBag, PenLine
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
    isCustom?: boolean;
    customName?: string;
    customCost?: number;
}

// ============================================================
// Product Item Card Component (Memoized for Performance)
// ============================================================
interface ProductItemCardProps {
    item: ItemForm;
    index: number;
    products: Product[];
    categories: string[];
    updateItem: (tempId: string, field: keyof ItemForm, value: any) => void;
    setItems: React.Dispatch<React.SetStateAction<ItemForm[]>>;
    toggleProductInItem: (tempId: string, productId: string) => void;
    selectAllProductsOfType: (tempId: string, categoryName: string) => void;
    clearAllProducts: (tempId: string) => void;
    removeItem: (tempId: string) => void;
}

const ProductItemCard = React.memo(({
    item, index, products, categories, updateItem, setItems,
    toggleProductInItem, selectAllProductsOfType, clearAllProducts, removeItem
}: ProductItemCardProps) => {
    const isCustom = item.isCustom || false;
    const selectedProducts = products.filter(p => (item.productIds || []).includes(p.id));
    const [showPicker, setShowPicker] = useState(false);
    const [filterCat, setFilterCat] = useState('');

    const displayProducts = filterCat
        ? products.filter(p => p.category === filterCat)
        : products;

    const toggleMode = () => {
        if (isCustom) {
            // Switch to shop product mode
            updateItem(item.tempId, 'isCustom', false);
        } else {
            // Switch to custom mode - clear productIds
            setItems(prev => prev.map(i => i.tempId === item.tempId
                ? { ...i, isCustom: true, productIds: [], customName: i.customName || '', customCost: i.customCost || 0 }
                : i
            ));
        }
    };

    return (
        <div
            className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm relative overflow-hidden"
        >
            <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${isCustom ? 'from-blue-400 to-indigo-400' : 'from-amber-400 to-orange-400'} opacity-60`} />

            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${isCustom ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {index + 1}
                    </span>
                    <div>
                        <h4 className="font-bold text-stone-800">
                            {isCustom
                                ? (item.customName || 'สินค้าภายนอก')
                                : `รายการที่ ${index + 1}`}
                        </h4>
                        <p className="text-xs text-stone-400">
                            {isCustom
                                ? (item.customCost ? `ต้นทุน ฿${item.customCost}/ชิ้น` : 'สินค้าจากภายนอก')
                                : (selectedProducts.length > 0
                                    ? `เลือกไว้ ${selectedProducts.length} สินค้า`
                                    : 'ยังไม่ได้เลือกสินค้า')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Quantity */}
                    <div className="flex items-center gap-1 bg-stone-50 rounded-lg border border-stone-200 px-1">
                        <button
                            type="button"
                            onClick={() => updateItem(item.tempId, 'quantity', Math.max(1, item.quantity - 1))}
                            className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-amber-600 font-bold"
                        >−</button>
                        <span className="w-8 text-center font-bold text-stone-800">{item.quantity}</span>
                        <button
                            type="button"
                            onClick={() => updateItem(item.tempId, 'quantity', item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-amber-600 font-bold"
                        >+</button>
                    </div>
                    <span className="text-xs text-stone-400">ชิ้น/ชุด</span>

                    <button
                        type="button"
                        onClick={() => removeItem(item.tempId)}
                        className="ml-2 text-stone-400 hover:bg-rose-50 hover:text-rose-500 p-1.5 rounded-lg transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-1 bg-stone-100 rounded-lg p-0.5 mb-4">
                <button
                    type="button"
                    onClick={() => { if (isCustom) toggleMode(); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-1 justify-center
                        ${!isCustom ? 'bg-white text-amber-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                    <ShoppingBag size={13} />
                    ขนมในร้าน
                </button>
                <button
                    type="button"
                    onClick={() => { if (!isCustom) toggleMode(); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all flex-1 justify-center
                        ${isCustom ? 'bg-white text-blue-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                >
                    <PenLine size={13} />
                    สินค้าอื่นๆ
                </button>
            </div>

            {/* ===== CUSTOM ITEM MODE ===== */}
            {isCustom ? (
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">ชื่อสินค้า</label>
                        <input
                            type="text"
                            value={item.customName || ''}
                            onChange={(e) => updateItem(item.tempId, 'customName', e.target.value)}
                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-stone-800 placeholder-stone-400 font-medium"
                            placeholder="เช่น น้ำดื่มมินิ, ขนมถุง, เยลลี่"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">ต้นทุนต่อชิ้น (บาท)</label>
                        <input
                            type="number"
                            value={item.customCost || ''}
                            onChange={(e) => updateItem(item.tempId, 'customCost', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-stone-800 placeholder-stone-400 font-medium"
                            placeholder="เช่น 8"
                            min={0}
                            step={0.5}
                        />
                    </div>
                    <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                        💡 ใส่ต้นทุนต่อชิ้นเพื่อคำนวณกำไรตอนสร้างออเดอร์ได้แม่นยำขึ้น
                    </p>
                </div>
            ) : (
                /* ===== SHOP PRODUCT MODE ===== */
                <>
                    {/* Selected Products Display */}
                    {selectedProducts.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {selectedProducts.map(p => (
                                <span
                                    key={p.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-200"
                                >
                                    {p.name}
                                    <button
                                        type="button"
                                        onClick={() => toggleProductInItem(item.tempId, p.id)}
                                        className="hover:text-red-500 transition-colors"
                                    >
                                        <X size={12} strokeWidth={3} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Add Product Button / Picker */}
                    {!showPicker ? (
                        <button
                            type="button"
                            onClick={() => setShowPicker(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 transition-all text-sm font-medium"
                        >
                            <Plus size={16} />
                            {selectedProducts.length === 0 ? 'เลือกสินค้า' : 'เพิ่ม/แก้ไขสินค้า'}
                        </button>
                    ) : (
                        <div
                            className="bg-stone-50 rounded-xl p-4 border border-stone-100 space-y-3"
                        >
                            {/* Category Filter */}
                            <div className="flex gap-1.5 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setFilterCat('')}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${!filterCat ? 'bg-amber-500 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
                                >
                                    ทั้งหมด
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setFilterCat(cat)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filterCat === cat ? 'bg-amber-500 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Product Grid */}
                            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                                {displayProducts.map(p => {
                                    const selected = (item.productIds || []).includes(p.id);
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => toggleProductInItem(item.tempId, p.id)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm transition-all
                                                ${selected
                                                    ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                                    : 'bg-white border-stone-200 text-stone-600 hover:border-amber-300 hover:bg-amber-50'
                                                }`}
                                        >
                                            {selected && <Check size={14} strokeWidth={3} />}
                                            {p.name}
                                            <span className={`text-xs ${selected ? 'text-amber-100' : 'text-stone-400'}`}>
                                                ฿{p.price}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Quick actions */}
                            <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => selectAllProductsOfType(item.tempId, filterCat)}
                                        className="text-xs font-bold px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                                    >
                                        เลือกทั้งหมด
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => clearAllProducts(item.tempId)}
                                        className="text-xs font-bold px-3 py-1.5 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300 transition-colors"
                                    >
                                        ล้าง
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPicker(false)}
                                    className="text-xs font-bold px-3 py-1.5 text-stone-500 hover:bg-stone-200 rounded-lg transition-colors"
                                >
                                    เสร็จ ✓
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

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
                productIds: item.productIds || []
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

    const toggleProductInItem = (tempId: string, productId: string) => {
        setItems(prev => prev.map(item => {
            if (item.tempId !== tempId) return item;
            const currentIds = item.productIds || [];
            const newIds = currentIds.includes(productId)
                ? currentIds.filter(id => id !== productId)
                : [...currentIds, productId];
            return { ...item, productIds: newIds };
        }));
    };

    const selectAllProductsOfType = (tempId: string, categoryName: string) => {
        const matchingProducts = products.filter(p => !categoryName || p.category === categoryName).map(p => p.id);
        setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, productIds: matchingProducts } : item));
    }

    const clearAllProducts = (tempId: string) => {
        setItems(prev => prev.map(item => item.tempId === tempId ? { ...item, productIds: [] } : item));
    }

    const removeItem = (tempId: string) => {
        setItems(prev => prev.filter(item => item.tempId !== tempId));
    };

    // Quick Add Packaging Handler
    const handleAddPackaging = async () => {
        if (!newPackagingName.trim()) return;

        setIsAddingPackaging(true);
        try {
            const newOption = await createPackagingOption(
                newPackagingName.trim(),
                parseFloat(newPackagingCost) || 0
            );
            setForm(prev => ({ ...prev, packagingId: newOption.id }));
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

    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    const inputClass = "w-full bg-white border border-stone-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all shadow-sm font-medium text-stone-800 placeholder-stone-400";
    const labelClass = "block text-xs font-bold text-stone-500 tracking-wide uppercase mb-1.5";

    return (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 overflow-hidden">
            <div
                className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl h-[90vh] md:h-[85vh] flex flex-col relative overflow-hidden border border-white/50"
            >
                {/* Background decorations */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-amber-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-50/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                {/* Header */}
                <div className="bg-white/80 backdrop-blur-xl border-b border-stone-100 px-8 py-6 flex justify-between items-center relative z-20 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-cafe-900 flex items-center gap-3">
                            {set ? <Edit3 className="text-amber-500" strokeWidth={2.5} size={28} /> : <Package className="text-amber-500" strokeWidth={2.5} size={28} />}
                            {set ? 'แก้ไข Set Menu' : 'สร้าง Set Menu ใหม่'}
                        </h2>
                        <p className="text-stone-500 text-sm font-medium mt-1">ตั้งชื่อ กำหนดราคา แล้วเลือกขนมที่จะใส่ในชุด</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl text-stone-500 hover:text-stone-700 transition-colors"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Form Scrollable Area */}
                <form id="setForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 relative z-10 custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
                    <div className="space-y-10 max-w-3xl mx-auto">
                        {/* Basic Info */}
                        <section className="space-y-5">
                            <h3 className="text-lg font-black text-cafe-800 flex items-center gap-2 border-b border-stone-200/60 pb-2">
                                <Settings className="w-5 h-5 text-stone-400" />
                                ข้อมูลเบื้องต้น
                            </h3>
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>ชื่อ Set (ภาษาอังกฤษ) <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleFormChange}
                                        className={inputClass}
                                        placeholder="เช่น PREMIUM BOX A"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>ชื่อไทย (ถ้ามี)</label>
                                    <input
                                        type="text"
                                        name="nameThai"
                                        value={form.nameThai}
                                        onChange={handleFormChange}
                                        className={inputClass}
                                        placeholder="เช่น ชุดพรีเมียม A"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>คำอธิบายเพิ่มเติม</label>
                                    <textarea
                                        name="description"
                                        value={form.description}
                                        onChange={handleFormChange}
                                        className={inputClass}
                                        rows={2}
                                        placeholder="อธิบายจุดเด่นของชุดนี้..."
                                    />
                                </div>
                            </div>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Price & Min */}
                            <section className="space-y-5">
                                <h3 className="text-lg font-black text-cafe-800 flex items-center gap-2 border-b border-stone-200/60 pb-2">
                                    <DollarSign className="w-5 h-5 text-stone-400" />
                                    การตั้งราคา & ขั้นต่ำ
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className={labelClass}>ราคาต่อชุด (บาท) <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            name="price"
                                            value={form.price}
                                            onChange={handleFormChange}
                                            className={`${inputClass} text-lg text-amber-700`}
                                            min={0}
                                            step={1}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>จำนวนขั้นต่ำในการสั่ง (ชุด)</label>
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
                            <section className="space-y-5">
                                <h3 className="text-lg font-black text-cafe-800 flex items-center gap-2 border-b border-stone-200/60 pb-2">
                                    <Gift className="w-5 h-5 text-stone-400" />
                                    บรรจุภัณฑ์เริ่มต้น
                                </h3>
                                <div className="space-y-5">
                                    <div>
                                        <label className={labelClass}>เลือกกล่อง/แพ็กเกจ</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <select
                                                    name="packagingId"
                                                    value={form.packagingId}
                                                    onChange={handleFormChange}
                                                    className={inputClass}
                                                >
                                                    <option value="">-- ไม่ระบุ --</option>
                                                    {packagingOptions.map(pkg => (
                                                        <option key={pkg.id} value={pkg.id}>
                                                            {pkg.name} {pkg.extraCost > 0 && `(+฿${pkg.extraCost})`}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowAddPackaging(!showAddPackaging)}
                                                className="px-4 py-3 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors border border-stone-200"
                                                title="เพิ่มบรรจุภัณฑ์ใหม่"
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {showAddPackaging && (
                                        <div
                                            className="overflow-hidden"
                                        >
                                            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3 mt-1">
                                                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">เพิ่มประเภทกล่องใหม่ด่วน</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        type="text"
                                                        value={newPackagingName}
                                                        onChange={(e) => setNewPackagingName(e.target.value)}
                                                        placeholder="ชื่อบรรจุภัณฑ์"
                                                        className="px-4 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none w-full bg-white"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={newPackagingCost}
                                                        onChange={(e) => setNewPackagingCost(e.target.value)}
                                                        placeholder="ราคาเพิ่ม (บาท)"
                                                        className="px-4 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none w-full bg-white"
                                                        min={0}
                                                        step={1}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddPackaging}
                                                        disabled={isAddingPackaging || !newPackagingName.trim()}
                                                        className="flex items-center gap-1 font-bold px-4 py-2 text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:shadow-md disabled:opacity-50 disabled:shadow-none transition-all"
                                                    >
                                                        {isAddingPackaging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                        บันทึกกล่อง
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowAddPackaging(false);
                                                            setNewPackagingName('');
                                                            setNewPackagingCost('');
                                                        }}
                                                        className="px-4 py-2 font-bold text-sm text-stone-500 hover:bg-stone-200 rounded-xl transition-colors"
                                                    >
                                                        ยกเลิก
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* ===== SIMPLIFIED: ขนมในชุดนี้ ===== */}
                        <section className="space-y-5 bg-stone-50 p-6 sm:p-8 rounded-[2rem] border border-stone-100 mt-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h3 className="text-xl font-black text-cafe-900 flex items-center gap-2">
                                        🧁 ขนมในชุดนี้
                                    </h3>
                                    <p className="text-sm text-stone-500 mt-1">เลือกสินค้าที่จะใส่ในชุดนี้ แล้วกำหนดจำนวนชิ้นต่อชุด</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="shrink-0 flex items-center gap-2 font-bold px-5 py-2.5 bg-white text-cafe-800 border-2 border-stone-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all shadow-sm"
                                >
                                    <Plus className="w-5 h-5 text-amber-500" />
                                    เพิ่มรายการ
                                </button>
                            </div>

                            {items.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300">
                                    <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                                    <p className="text-stone-500 font-medium">ยังไม่มีสินค้าในชุดนี้</p>
                                    <p className="text-sm text-stone-400 mt-1">กดปุ่ม <strong>"เพิ่มรายการ"</strong> แล้วเลือกขนมที่ต้องการ</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {items.map((item, index) => (
                                        <ProductItemCard
                                            key={item.tempId}
                                            item={item}
                                            index={index}
                                            products={products}
                                            categories={categories}
                                            updateItem={updateItem}
                                            setItems={setItems}
                                            toggleProductInItem={toggleProductInItem}
                                            selectAllProductsOfType={selectAllProductsOfType}
                                            clearAllProducts={clearAllProducts}
                                            removeItem={removeItem}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Active Toggle */}
                        <div className="flex justify-end border-t border-stone-200/60 pt-6">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <span className="font-bold text-stone-700 group-hover:text-stone-900">สถานะของชุดขายนี้</span>
                                <div
                                    onClick={handleToggleActive}
                                    className={`relative w-14 h-7 rounded-full transition-colors duration-300 ease-in-out ${form.isActive ? 'bg-emerald-500 shadow-inner' : 'bg-stone-300'}`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out ${form.isActive ? 'translate-x-8' : 'translate-x-1'}`} />
                                </div>
                                <span className={`text-sm font-bold ${form.isActive ? 'text-emerald-600' : 'text-stone-400'}`}>
                                    {form.isActive ? 'เปิดขายอยู่' : 'ซ่อนไว้ก่อน'}
                                </span>
                            </label>
                        </div>
                    </div>
                </form>

                {/* Fixed Footer */}
                <div className="p-6 bg-white border-t border-stone-100 flex justify-end gap-3 shrink-0 relative z-20">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 font-bold text-stone-500 bg-stone-100 hover:bg-stone-200 hover:text-stone-700 rounded-xl transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        form="setForm"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cafe-700 to-cafe-900 text-white rounded-xl font-bold hover:shadow-lg disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                บันทึก Set Menu
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateEditSetModal;
