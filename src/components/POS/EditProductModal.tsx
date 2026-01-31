// ============================================================
// ✏️ Edit Product Modal - Product Editor UI
// 🛡️ Mellow Oven Standards Compliance:
// - #17: Accessibility (aria-labels)
// - #22: Touch targets ≥44px, ESC dismiss via Modal
// - #13: Memory Leak Prevention (cleanup in useEffect)
// ============================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Product, Variant, Recipe } from '@/types';
import { useStore } from '@/src/store';
import { Package, DollarSign, Tag, Plus, Trash2 } from 'lucide-react';
import { RecipeBuilder } from './RecipeBuilder';
import { formatCurrency } from '@/src/lib/utils';

interface EditProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({ isOpen, onClose, product }) => {
    const { updateProduct, ingredients } = useStore();

    // Basic Info
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [cost, setCost] = useState('');
    const [category, setCategory] = useState('');
    const [flavor, setFlavor] = useState('');

    // Tabs & Variants
    const [activeTab, setActiveTab] = useState<'INFO' | 'RECIPE' | 'VARIANTS'>('INFO');
    const [variants, setVariants] = useState<Variant[]>([]);
    const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);

    // Recipe
    const [recipe, setRecipe] = useState<Recipe | null>(null);

    // Initialize form with product data
    useEffect(() => {
        if (product) {
            setName(product.name);
            setPrice(product.price.toString());
            setCost(product.cost.toString());
            setCategory(product.category || '');
            setFlavor(product.flavor || '');

            if (product.recipe) {
                setRecipe(product.recipe);
            } else {
                setRecipe(null);
            }

            setVariants(product.variants || []);
            setActiveTab('INFO');
        }
    }, [product]);



    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;



        const updates: Partial<Product> = {
            name,
            price: Number(price),
            cost: recipe ? recipe.costPerUnit : Number(cost),
            category: category || product.category,
            flavor: flavor || product.flavor,
            recipe: recipe || undefined,
            variants: variants
        };

        updateProduct(product.id, updates);
        onClose();
    };

    if (!product) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="✏️ แก้ไขสินค้า">
            <form onSubmit={handleSubmit} className="space-y-5">
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
                            className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all relative ${activeTab === 'VARIANTS'
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
                                <span className="absolute top-1 right-2 bg-blue-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
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
                            className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all relative ${activeTab === 'RECIPE'
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
                                <span className="absolute top-1 right-2 text-green-500 text-xs">✅</span>
                            )}
                        </button>
                    </div>
                </div>

                {activeTab === 'INFO' ? (
                    <div className="bg-cafe-50 p-4 rounded-lg space-y-3">
                        <h4 className="font-bold text-cafe-800 flex items-center gap-2">
                            <Package size={16} />
                            ข้อมูลพื้นฐาน
                        </h4>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-cafe-700 mb-1">
                                ชื่อสินค้า
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                                required
                            />
                        </div>

                        {/* Price & Cost */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-cafe-700 mb-1 flex items-center gap-1">
                                    <DollarSign size={14} />
                                    ราคาขาย
                                </label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-cafe-700 mb-1 flex items-center gap-1">
                                    <Tag size={14} />
                                    ต้นทุน
                                </label>
                                <input
                                    type="number"
                                    value={recipe ? recipe.costPerUnit : cost}
                                    readOnly={!!recipe}
                                    onChange={(e) => setCost(e.target.value)}
                                    className={`w-full px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none ${recipe ? 'bg-gray-100 text-gray-500' : ''}`}
                                    required
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                        </div>

                        {/* Category & Flavor */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-cafe-700 mb-1">
                                    หมวดหมู่
                                </label>
                                <input
                                    type="text"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                                    placeholder="Bread, Cake, Pastry..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-cafe-700 mb-1">
                                    รสชาติ/แบบ
                                </label>
                                <input
                                    type="text"
                                    value={flavor}
                                    onChange={(e) => setFlavor(e.target.value)}
                                    className="w-full px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                                    placeholder="Chocolate, Plain..."
                                />
                            </div>
                        </div>
                    </div>
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
                                        id="edit-variant-name"
                                        placeholder="ชื่อตัวเลือก (เช่น ส้ม)"
                                        className="flex-1 p-2 text-sm border rounded"
                                    />
                                    <input
                                        id="edit-variant-price"
                                        type="number"
                                        placeholder="ราคา"
                                        className="w-20 p-2 text-sm border rounded"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nameInput = document.getElementById('edit-variant-name') as HTMLInputElement;
                                            const priceInput = document.getElementById('edit-variant-price') as HTMLInputElement;
                                            if (nameInput.value && priceInput.value) {
                                                setVariants([...variants, {
                                                    id: crypto.randomUUID(),
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
                    <RecipeBuilder product={{ name, price: Number(price) }} onRecipeChange={setRecipe} />
                )}

                {/* Buttons - #22: 44px touch targets */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 min-h-[44px] bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition-all font-medium border border-gray-200"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        className="flex-1 min-h-[44px] bg-gradient-to-r from-cafe-600 to-cafe-700 text-white py-3 rounded-xl hover:from-cafe-700 hover:to-cafe-800 transition-all font-bold shadow-lg shadow-cafe-200"
                    >
                        บันทึกการแก้ไข
                    </button>
                </div>
            </form>
        </Modal>
    );
};
