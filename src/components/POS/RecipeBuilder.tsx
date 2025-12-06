import React, { useState, useEffect } from 'react';
import { Product, Recipe, RecipeItem, Ingredient } from '@/types';
import { useStore } from '@/src/store';
import { Plus, Trash2, Calculator, ChefHat } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

interface RecipeBuilderProps {
    product: Partial<Product>;
    onRecipeChange: (recipe: Recipe) => void;
}

export const RecipeBuilder: React.FC<RecipeBuilderProps> = ({ product, onRecipeChange }) => {
    const { ingredients } = useStore();
    const [yieldQty, setYieldQty] = useState<number>(1);
    const [items, setItems] = useState<RecipeItem[]>([]);

    // Load existing recipe if editing (logic to be added in parent)

    const handleAddItem = () => {
        setItems([...items, { ingredientId: '', quantity: 0, unit: 'g' }]);
    };

    const handleItemChange = (index: number, field: keyof RecipeItem, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;

        // Auto-set unit if ingredient selected
        if (field === 'ingredientId') {
            const ing = ingredients.find(i => i.id === value);
            if (ing) {
                newItems[index].unit = ing.unit;
            }
        }

        setItems(newItems);
        calculateAndNotify(newItems, yieldQty);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
        calculateAndNotify(newItems, yieldQty);
    };

    const calculateAndNotify = (currentItems: RecipeItem[], currentYield: number) => {
        let totalBatchCost = 0;

        currentItems.forEach(item => {
            const ing = ingredients.find(i => i.id === item.ingredientId);
            if (ing) {
                // Simple cost calc (assuming unit matches for now, later we can add conversion)
                // Cost = (Item Qty / 1) * CostPerUnit
                // Note: In real app, need unit conversion. Here assuming base unit match.
                totalBatchCost += item.quantity * ing.costPerUnit;
            }
        });

        const costPerUnit = currentYield > 0 ? totalBatchCost / currentYield : 0;

        onRecipeChange({
            id: crypto.randomUUID(),
            name: `Recipe for ${product.name}`,
            yield: currentYield,
            items: currentItems,
            totalBatchCost,
            costPerUnit
        });
    };

    return (
        <div className="bg-cafe-50 p-4 rounded-xl border border-cafe-200 space-y-4">
            <div className="flex items-center gap-2 text-cafe-800 font-bold border-b border-cafe-200 pb-2">
                <ChefHat size={20} /> สร้างสูตรผลิต (Batch Recipe)
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-cafe-600 mb-1">ชื่อสูตร (Batch Name)</label>
                    <input
                        className="w-full p-2 text-sm border border-cafe-200 rounded-lg bg-white"
                        placeholder="เช่น แป้งเค้ก 1 กะละมัง"
                        defaultValue={`สูตร ${product.name || 'มาตรฐาน'}`}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-cafe-600 mb-1">จำนวนที่ได้ (Yield)</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={yieldQty === 0 ? '' : yieldQty}
                            onChange={e => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                setYieldQty(val);
                                calculateAndNotify(items, val);
                            }}
                            className="w-full p-2 text-sm border border-cafe-200 rounded-lg bg-white text-center font-bold text-cafe-900"
                        />
                        <span className="text-sm text-cafe-500">ชิ้น</span>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-xs font-medium text-cafe-600">ส่วนผสม (Ingredients)</label>
                {items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                        <select
                            value={item.ingredientId}
                            onChange={e => handleItemChange(index, 'ingredientId', e.target.value)}
                            className="flex-1 p-2 text-sm border border-cafe-200 rounded-lg bg-white"
                        >
                            <option value="">-- เลือกวัตถุดิบ --</option>
                            {ingredients.map(ing => (
                                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                            ))}
                        </select>
                        <input
                            type="number"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={e => handleItemChange(index, 'quantity', e.target.value === '' ? 0 : Number(e.target.value))}
                            className="w-20 p-2 text-sm border border-cafe-200 rounded-lg bg-white text-center"
                            placeholder="Qty"
                        />
                        <span className="text-xs text-cafe-500 w-8">{item.unit}</span>
                        <button onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}

                {ingredients.length === 0 && (
                    <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100 mb-2">
                        ⚠️ ไม่พบข้อมูลวัตถุดิบในระบบ กรุณาเพิ่มวัตถุดิบที่หน้า "สต็อก & จัดซื้อ" ก่อนครับ
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-sm text-cafe-600 hover:text-cafe-800 flex items-center gap-1 font-medium"
                >
                    <Plus size={16} /> เพิ่มส่วนผสม
                </button>
            </div>

            {/* Summary */}
            <div className="bg-white p-3 rounded-lg border border-cafe-200 flex justify-between items-center">
                <div>
                    <p className="text-xs text-cafe-500">ต้นทุนรวม (Batch Cost)</p>
                    <p className="font-bold text-cafe-800">{formatCurrency(items.reduce((sum, item) => {
                        const ing = ingredients.find(i => i.id === item.ingredientId);
                        return sum + (item.quantity * (ing?.costPerUnit || 0));
                    }, 0))}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-cafe-500">ต้นทุนต่อชิ้น (Cost/Unit)</p>
                    <p className="text-xl font-bold text-green-600">
                        {formatCurrency((items.reduce((sum, item) => {
                            const ing = ingredients.find(i => i.id === item.ingredientId);
                            return sum + (item.quantity * (ing?.costPerUnit || 0));
                        }, 0)) / (yieldQty || 1))}
                    </p>
                </div>
            </div>
        </div>
    );
};
