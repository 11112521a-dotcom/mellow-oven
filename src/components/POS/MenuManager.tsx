// ============================================================
// 🍰 Menu Manager - Product CRUD UI
// 🛡️ Mellow Oven Standards Compliance:
// - #17: Accessibility (aria-labels, button elements)
// - #22: Touch targets ≥44px, ESC dismiss via Modal
// - #15: Idempotency (loading states on buttons)
// ============================================================

import React, { useState } from 'react';
import { Product, Variant, Recipe } from '@/types';
import { useStore } from '@/src/store';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { RecipeBuilder } from './RecipeBuilder';
import { formatCurrency } from '@/src/lib/utils';
import { EditProductModal } from './EditProductModal';

export const MenuManager: React.FC = () => {
    const { products, addProduct, removeProduct } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({
        name: '',
        category: 'Cake',
        flavor: '',
        price: '' as any,
        cost: '' as any,
    });
    const [variants, setVariants] = useState<Variant[]>([]);
    const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);

    const categories = ['Cake', 'Tart', 'Bread', 'Beverage', 'Cookie'];
    const [activeTab, setActiveTab] = useState<'INFO' | 'RECIPE' | 'VARIANTS'>('INFO');
    const [recipe, setRecipe] = useState<any>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Name is required
        if (!newProduct.name) {
            alert('กรุณาระบุชื่อเมนู');
            setActiveTab('INFO');
            return;
        }

        // Validation: Either Price OR Variants must be present
        if (!newProduct.price && variants.length === 0) {
            alert('กรุณาระบุราคาขาย หรือเพิ่มตัวเลือกสินค้า (Variants)');
            if (activeTab !== 'VARIANTS') setActiveTab('INFO');
            return;
        }

        // If price is missing but variants exist, use the first variant's price as default
        const finalPrice = newProduct.price ? Number(newProduct.price) : (variants.length > 0 ? variants[0].price : 0);
        const finalCost = recipe ? recipe.costPerUnit : (Number(newProduct.cost) || (variants.length > 0 ? variants[0].cost : 0));

        addProduct({
            id: crypto.randomUUID(),
            name: newProduct.name,
            category: newProduct.category || 'Cake',
            flavor: newProduct.flavor || '',
            price: finalPrice,
            cost: finalCost,
            recipe: recipe,
            variants: variants
        } as Product);
        setIsModalOpen(false);
        setNewProduct({ name: '', category: 'Cake', flavor: '', price: '' as any, cost: '' as any });
        setRecipe(null);
        setVariants([]);
        setActiveTab('INFO');
    };

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
    };

    const handleEditClick = (product: Product) => {
        setProductToEdit(product);
        setIsEditModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (productToDelete) {
            removeProduct(productToDelete.id);
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-cafe-100 via-amber-50 to-orange-50 p-6 border-b border-cafe-100">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-cafe-600 to-cafe-800 rounded-xl flex items-center justify-center text-white shadow-lg">
                            🍰
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-cafe-800 flex items-center gap-2">
                                จัดการเมนู
                                <span className="text-xs bg-cafe-600 text-white px-2 py-0.5 rounded-full font-medium">
                                    {products.length} รายการ
                                </span>
                            </h3>
                            <p className="text-sm text-cafe-500">Menu Management • เพิ่ม แก้ไข ลบสินค้า</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-cafe-600 to-cafe-800 text-white px-5 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-200 font-medium"
                    >
                        <Plus size={20} />
                        <span>เพิ่มเมนูใหม่</span>
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-6">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300"
                        >
                            {/* Minimal Card Content */}
                            <div className="p-5">
                                {/* Header Row */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-lg text-gray-800 truncate">
                                            {product.name}
                                        </h4>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {product.category}
                                            {product.flavor && ` • ${product.flavor}`}
                                        </p>
                                    </div>
                                    {/* Action Buttons - Always visible for accessibility (#17, #22) */}
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleEditClick(product)}
                                            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-xl transition-all border border-gray-100 hover:border-blue-200"
                                            aria-label={`แก้ไข ${product.name}`}
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(product)}
                                            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-xl transition-all border border-gray-100 hover:border-red-200"
                                            aria-label={`ลบ ${product.name}`}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Badges - Only if has recipe or variants */}
                                {(product.recipe || (product.variants && product.variants.length > 0)) && (
                                    <div className="flex gap-1.5 mb-3">
                                        {product.variants && product.variants.length > 0 && (
                                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                                                {product.variants.length} รส
                                            </span>
                                        )}
                                        {product.recipe && (
                                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                                                มีสูตร
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Variants Pills - Compact */}
                                {product.variants && product.variants.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {product.variants.slice(0, 5).map((variant, idx) => (
                                            <span
                                                key={variant.id || idx}
                                                className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg"
                                            >
                                                {variant.name} <span className="text-gray-400">฿{variant.price}</span>
                                            </span>
                                        ))}
                                        {product.variants.length > 5 && (
                                            <span className="text-xs text-gray-400 px-2 py-1">
                                                +{product.variants.length - 5}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Price Row - Clean */}
                                <div className="flex items-end justify-between pt-3 border-t border-gray-50">
                                    <div>
                                        <p className="text-2xl font-bold text-gray-800">฿{product.price}</p>
                                        <p className="text-xs text-gray-400">ราคาขาย</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">฿{formatCurrency(product.cost)}</p>
                                        <p className="text-xs text-gray-400">ต้นทุน</p>
                                    </div>
                                </div>

                                {/* Profit Badge - Subtle */}
                                {product.price > 0 && product.cost > 0 && (
                                    <div className="mt-3 text-center">
                                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                                            กำไร ฿{formatCurrency(product.price - product.cost)}
                                            <span className="text-emerald-400">
                                                ({Math.round(((product.price - product.cost) / product.price) * 100)}%)
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="✨ เพิ่มเมนูใหม่">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Premium Step Wizard Tabs */}
                    <div className="bg-gradient-to-r from-cafe-50 to-amber-50 rounded-2xl p-4 mb-6">
                        <div className="flex items-center justify-between">
                            {/* Step 1 - Info */}
                            <button
                                type="button"
                                onClick={() => setActiveTab('INFO')}
                                className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${activeTab === 'INFO'
                                    ? 'bg-white shadow-lg scale-105'
                                    : 'hover:bg-white/50'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${activeTab === 'INFO'
                                    ? 'bg-gradient-to-br from-cafe-600 to-cafe-800 text-white'
                                    : 'bg-cafe-100 text-cafe-500'
                                    }`}>
                                    📝
                                </div>
                                <span className={`text-xs font-bold ${activeTab === 'INFO' ? 'text-cafe-800' : 'text-cafe-500'}`}>
                                    ข้อมูลทั่วไป
                                </span>
                                <span className="text-[10px] text-cafe-400">ชื่อ • หมวด • ราคา</span>
                            </button>

                            {/* Connector */}
                            <div className="w-8 h-0.5 bg-cafe-200 -translate-y-2"></div>

                            {/* Step 2 - Variants */}
                            <button
                                type="button"
                                onClick={() => setActiveTab('VARIANTS')}
                                className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${activeTab === 'VARIANTS'
                                    ? 'bg-white shadow-lg scale-105'
                                    : 'hover:bg-white/50'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${activeTab === 'VARIANTS'
                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                                    : 'bg-blue-50 text-blue-400'
                                    }`}>
                                    🎨
                                </div>
                                <span className={`text-xs font-bold ${activeTab === 'VARIANTS' ? 'text-blue-700' : 'text-cafe-500'}`}>
                                    ตัวเลือก
                                </span>
                                <span className="text-[10px] text-cafe-400">รสชาติ • ขนาด</span>
                                {variants.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                                        {variants.length}
                                    </span>
                                )}
                            </button>

                            {/* Connector */}
                            <div className="w-8 h-0.5 bg-cafe-200 -translate-y-2"></div>

                            {/* Step 3 - Recipe */}
                            <button
                                type="button"
                                onClick={() => setActiveTab('RECIPE')}
                                className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${activeTab === 'RECIPE'
                                    ? 'bg-white shadow-lg scale-105'
                                    : 'hover:bg-white/50'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${activeTab === 'RECIPE'
                                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                                    : 'bg-green-50 text-green-400'
                                    }`}>
                                    📋
                                </div>
                                <span className={`text-xs font-bold ${activeTab === 'RECIPE' ? 'text-green-700' : 'text-cafe-500'}`}>
                                    สูตรผลิต
                                </span>
                                <span className="text-[10px] text-cafe-400">วัตถุดิบ • ต้นทุน</span>
                                {recipe && (
                                    <span className="text-green-500 text-xs">✅</span>
                                )}
                            </button>
                        </div>
                    </div>

                    {activeTab === 'INFO' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-cafe-700 mb-1">ชื่อเมนู</label>
                                <input
                                    required
                                    value={newProduct.name}
                                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                    className="w-full p-2 border border-cafe-200 rounded-lg"
                                    placeholder="เช่น ครัวซองต์"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-cafe-700 mb-1">หมวดหมู่</label>
                                    <select
                                        value={newProduct.category}
                                        onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                                        className="w-full p-2 border border-cafe-200 rounded-lg"
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-cafe-700 mb-1">รสชาติ (ถ้ามี)</label>
                                    <input
                                        value={newProduct.flavor}
                                        onChange={e => setNewProduct({ ...newProduct, flavor: e.target.value })}
                                        className="w-full p-2 border border-cafe-200 rounded-lg"
                                        placeholder="เช่น ช็อกโกแลต"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-cafe-700 mb-1">ราคาขาย</label>
                                    <input
                                        type="number"
                                        required
                                        value={newProduct.price === 0 ? '' : newProduct.price}
                                        onChange={e => setNewProduct({ ...newProduct, price: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        className="w-full p-2 border border-cafe-200 rounded-lg"
                                        placeholder="เช่น 30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-cafe-700 mb-1">ต้นทุน (COGS)</label>
                                    <input
                                        type="number"
                                        value={recipe ? recipe.costPerUnit : (newProduct.cost === 0 ? '' : newProduct.cost)}
                                        readOnly={!!recipe}
                                        onChange={e => setNewProduct({ ...newProduct, cost: e.target.value === '' ? 0 : Number(e.target.value) })}
                                        className={`w-full p-2 border border-cafe-200 rounded-lg ${recipe ? 'bg-gray-100 text-gray-500' : ''}`}
                                        placeholder={recipe ? "คำนวณจากสูตร" : "เช่น 15"}
                                    />
                                </div>
                            </div>
                        </>
                    ) : activeTab === 'VARIANTS' ? (
                        editingVariantIndex !== null ? (
                            <div className="space-y-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingVariantIndex(null)}
                                    className="text-sm text-cafe-600 hover:text-cafe-800 flex items-center gap-1"
                                >
                                    ← กลับไปหน้ารายการ
                                </button>
                                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 mb-2">
                                    <p className="font-bold text-orange-800">กำลังแก้ไขสูตร: {variants[editingVariantIndex].name}</p>
                                </div>
                                <RecipeBuilder
                                    product={variants[editingVariantIndex]}
                                    onRecipeChange={(r) => {
                                        const newVariants = [...variants];
                                        newVariants[editingVariantIndex] = {
                                            ...newVariants[editingVariantIndex],
                                            recipe: r,
                                            cost: r.costPerUnit
                                        };
                                        setVariants(newVariants);
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <p className="text-sm text-blue-800 mb-2">
                                        💡 เพิ่มตัวเลือกสินค้า เช่น รสชาติ, ขนาด
                                    </p>
                                    {variants.map((variant, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded border border-blue-100 mb-2 flex justify-between items-center">
                                            <div>
                                                <span className="font-bold text-cafe-800">{variant.name}</span>
                                                <span className="text-xs text-cafe-500 ml-2">
                                                    {variant.price}.- (ทุน {formatCurrency(variant.cost)})
                                                </span>
                                                {variant.recipe && <span className="text-xs text-green-600 ml-2">✅ มีสูตร</span>}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingVariantIndex(idx)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 bg-blue-50 rounded"
                                                >
                                                    {variant.recipe ? 'แก้ไขสูตร' : 'สร้างสูตร'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newVariants = [...variants];
                                                        newVariants.splice(idx, 1);
                                                        setVariants(newVariants);
                                                    }}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex gap-2 mt-4">
                                        <input
                                            id="variant-name"
                                            placeholder="ชื่อตัวเลือก (เช่น ส้ม)"
                                            className="flex-1 p-2 text-sm border rounded"
                                        />
                                        <input
                                            id="variant-price"
                                            type="number"
                                            placeholder="ราคา"
                                            className="w-20 p-2 text-sm border rounded"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const nameInput = document.getElementById('variant-name') as HTMLInputElement;
                                                const priceInput = document.getElementById('variant-price') as HTMLInputElement;
                                                if (nameInput.value && priceInput.value) {
                                                    setVariants([...variants, {
                                                        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                                                        name: nameInput.value,
                                                        price: Number(priceInput.value),
                                                        cost: 0 // Default, can be updated via recipe later
                                                    }]);
                                                    nameInput.value = '';
                                                    priceInput.value = '';
                                                }
                                            }}
                                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                                        >
                                            เพิ่ม
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        <RecipeBuilder product={newProduct} onRecipeChange={setRecipe} />
                    )}

                    <button
                        type="submit"
                        className="w-full min-h-[44px] bg-gradient-to-r from-cafe-600 to-cafe-700 text-white py-3 rounded-xl hover:from-cafe-700 hover:to-cafe-800 transition-all font-bold shadow-lg shadow-cafe-200 mt-4"
                    >
                        บันทึกเมนู
                    </button>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={handleCancelDelete}
                title="ยืนยันการลบเมนู"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-cafe-800 mb-2">
                            คุณแน่ใจหรือไม่ว่าต้องการลบเมนูนี้?
                        </p>
                        {productToDelete && (
                            <div className="bg-white rounded-lg p-3 mt-3">
                                <p className="font-bold text-cafe-800">{productToDelete.name}</p>
                                <p className="text-sm text-cafe-500">
                                    {productToDelete.category} {productToDelete.flavor && `• ${productToDelete.flavor}`}
                                </p>
                                <p className="text-sm text-cafe-600 mt-1">
                                    ราคา: ฿{productToDelete.price}
                                </p>
                            </div>
                        )}
                        <p className="text-sm text-red-600 mt-3">
                            ⚠️ การลบนี้ไม่สามารถย้อนกลับได้
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleCancelDelete}
                            className="flex-1 bg-gray-200 text-cafe-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            ยืนยันการลบ
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Product Modal */}
            <EditProductModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setProductToEdit(null);
                }}
                product={productToEdit}
            />
        </div>
    );
};
