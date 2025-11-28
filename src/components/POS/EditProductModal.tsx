import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Product, Ingredient, Recipe } from '@/types';
import { useStore } from '@/src/store';
import { Package, DollarSign, Tag, Cake, Plus, Trash2 } from 'lucide-react';

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

    // Recipe
    const [hasRecipe, setHasRecipe] = useState(false);
    const [recipeYield, setRecipeYield] = useState('1');
    const [recipeItems, setRecipeItems] = useState<{ ingredientId: string; quantity: number }[]>([]);

    // Initialize form with product data
    useEffect(() => {
        if (product) {
            setName(product.name);
            setPrice(product.price.toString());
            setCost(product.cost.toString());
            setCategory(product.category || '');
            setFlavor(product.flavor || '');

            if (product.recipe) {
                setHasRecipe(true);
                setRecipeYield(product.recipe.yield.toString());
                setRecipeItems(product.recipe.items);
            } else {
                setHasRecipe(false);
                setRecipeYield('1');
                setRecipeItems([]);
            }
        }
    }, [product]);

    const handleAddIngredient = () => {
        if (ingredients.length > 0) {
            setRecipeItems([...recipeItems, { ingredientId: ingredients[0].id, quantity: 0 }]);
        }
    };

    const handleRemoveIngredient = (index: number) => {
        setRecipeItems(recipeItems.filter((_, i) => i !== index));
    };

    const handleIngredientChange = (index: number, field: 'ingredientId' | 'quantity', value: string | number) => {
        const newItems = [...recipeItems];
        if (field === 'ingredientId') {
            newItems[index].ingredientId = value as string;
        } else {
            newItems[index].quantity = Number(value);
        }
        setRecipeItems(newItems);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;

        if (!confirm('ยืนยันการแก้ไขสินค้านี้หรือไม่?')) return;

        const updates: Partial<Product> = {
            name,
            price: Number(price),
            cost: Number(cost),
            category: category || product.category,
            flavor: flavor || product.flavor,
        };

        if (hasRecipe && recipeItems.length > 0) {
            // Calculate costs
            let totalBatchCost = 0;
            const recipeItemsWithUnits = recipeItems.map(item => {
                const ingredient = ingredients.find(ing => ing.id === item.ingredientId);
                if (ingredient) {
                    totalBatchCost += ingredient.costPerUnit * item.quantity;
                    return { ...item, unit: ingredient.unit };
                }
                return { ...item, unit: 'units' };
            });

            const yieldNum = Number(recipeYield);
            const costPerUnit = totalBatchCost / (yieldNum || 1);

            updates.recipe = {
                id: product.recipe?.id || crypto.randomUUID(),
                name: `Recipe for ${name}`,
                yield: yieldNum,
                items: recipeItemsWithUnits,
                totalBatchCost,
                costPerUnit
            };
        } else {
            updates.recipe = undefined;
        }

        updateProduct(product.id, updates);
        onClose();
    };

    if (!product) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="✏️ แก้ไขสินค้า">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Basic Info */}
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
                                value={cost}
                                onChange={(e) => setCost(e.target.value)}
                                className="w-full px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
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

                {/* Recipe Section */}
                <div className="border border-cafe-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-cafe-800 flex items-center gap-2">
                            <Cake size={16} />
                            สูตรการผลิต (Recipe)
                        </h4>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={hasRecipe}
                                onChange={(e) => setHasRecipe(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-sm text-cafe-700">มีสูตร</span>
                        </label>
                    </div>

                    {hasRecipe && (
                        <div className="space-y-3">
                            {/* Yield */}
                            <div>
                                <label className="block text-sm font-medium text-cafe-700 mb-1">
                                    ได้จำนวน (ชิ้น)
                                </label>
                                <input
                                    type="number"
                                    value={recipeYield}
                                    onChange={(e) => setRecipeYield(e.target.value)}
                                    className="w-32 px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                                    min="1"
                                    required={hasRecipe}
                                />
                            </div>

                            {/* Ingredients List */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-cafe-700">
                                        วัตถุดิบ
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddIngredient}
                                        className="flex items-center gap-1 px-3 py-1 bg-cafe-600 text-white rounded-lg text-sm hover:bg-cafe-700"
                                    >
                                        <Plus size={14} />
                                        เพิ่ม
                                    </button>
                                </div>

                                {recipeItems.map((item, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <select
                                            value={item.ingredientId}
                                            onChange={(e) => handleIngredientChange(index, 'ingredientId', e.target.value)}
                                            className="flex-1 px-3 py-2 border border-cafe-200 rounded-lg text-sm focus:ring-2 focus:ring-cafe-500 outline-none"
                                        >
                                            {ingredients.map(ing => (
                                                <option key={ing.id} value={ing.id}>
                                                    {ing.name} ({ing.unit})
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                                            className="w-24 px-3 py-2 border border-cafe-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-cafe-500 outline-none"
                                            placeholder="จำนวน"
                                            min="0"
                                            step="0.01"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveIngredient(index)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}

                                {recipeItems.length === 0 && (
                                    <p className="text-sm text-cafe-400 text-center py-2">
                                        ยังไม่มีวัตถุดิบ คลิก "เพิ่ม" เพื่อเริ่มต้น
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-gray-200 text-cafe-800 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        className="flex-1 bg-cafe-600 text-white py-3 rounded-lg hover:bg-cafe-700 transition-colors font-bold"
                    >
                        บันทึกการแก้ไข
                    </button>
                </div>
            </form>
        </Modal>
    );
};
