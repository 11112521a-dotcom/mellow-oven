import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { Ingredient, PurchaseOrder } from '@/types';
import { Plus, Trash2, ShoppingCart } from 'lucide-react';
import { NumberInput } from '@/src/components/ui/NumberInput';
import { formatCurrency } from '@/src/lib/utils';

export const PurchaseOrderForm: React.FC = () => {
    const { ingredients, createPurchaseOrder, updateStock, updateJarBalance, addTransaction } = useStore();

    const [selectedIngredientId, setSelectedIngredientId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [cost, setCost] = useState('');
    const [cart, setCart] = useState<{ ingredient: Ingredient, quantity: number, cost: number }[]>([]);

    const handleAddToCart = () => {
        const ingredient = ingredients.find(i => i.id === selectedIngredientId);
        if (ingredient && quantity && cost) {
            setCart([...cart, {
                ingredient,
                quantity: Number(quantity),
                cost: Number(cost)
            }]);
            setSelectedIngredientId('');
            setQuantity('');
            setCost('');
        }
    };

    const handleRemoveFromCart = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const handleConfirmOrder = () => {
        if (cart.length === 0) return;

        const totalCost = cart.reduce((sum, item) => sum + item.cost, 0);

        // 1. Create PO
        const po: PurchaseOrder = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            supplier: cart[0].ingredient.supplier || 'Mixed',
            items: cart.map(item => ({
                ingredientId: item.ingredient.id,
                quantity: item.quantity,
                cost: item.cost
            })),
            totalCost,
            status: 'COMPLETED'
        };
        createPurchaseOrder(po);

        // 2. Update Stock
        cart.forEach(item => {
            updateStock(item.ingredient.id, item.quantity);
        });

        // 3. Deduct from Finance (Working Capital)
        updateJarBalance('Working', -totalCost);
        addTransaction({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: totalCost,
            type: 'EXPENSE',
            fromJar: 'Working',
            description: `Purchase Order (Stock Refill)`,
            category: 'COGS'
        });

        setCart([]);
        alert('สั่งซื้อสำเร็จ! ตัดเงินจาก Working Capital และเพิ่มสต็อกเรียบร้อย');
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6">
            <h3 className="text-lg font-bold text-cafe-800 mb-4 flex items-center gap-2">
                <ShoppingCart size={20} /> สร้างใบสั่งซื้อ (Purchase Order)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-cafe-700 mb-1">เลือกวัตถุดิบ</label>
                    <select
                        value={selectedIngredientId}
                        onChange={(e) => setSelectedIngredientId(e.target.value)}
                        className="w-full p-2 border border-cafe-200 rounded-lg"
                    >
                        <option value="">-- เลือกรายการ --</option>
                        {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>{ing.name} (คงเหลือ: {ing.currentStock} {ing.unit})</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-1">จำนวนที่ซื้อ</label>
                    <NumberInput
                        value={parseFloat(quantity) || 0}
                        onChange={(val) => setQuantity(val.toString())}
                        className="w-full p-2 border border-cafe-200 rounded-lg"
                        placeholder="0"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-1">ราคารวม (บาท)</label>
                    <NumberInput
                        value={parseFloat(cost) || 0}
                        onChange={(val) => setCost(val.toString())}
                        className="w-full p-2 border border-cafe-200 rounded-lg"
                        placeholder="0.00"
                    />
                </div>
            </div>

            <button
                onClick={handleAddToCart}
                disabled={!selectedIngredientId || !quantity || !cost}
                className="w-full bg-cafe-100 text-cafe-700 py-2 rounded-lg font-medium hover:bg-cafe-200 disabled:opacity-50 mb-6"
            >
                + เพิ่มลงรายการ
            </button>

            {/* Cart Summary */}
            {cart.length > 0 && (
                <div className="bg-cafe-50 rounded-xl p-4">
                    <h4 className="font-medium text-cafe-800 mb-2">รายการที่จะสั่งซื้อ</h4>
                    <div className="space-y-2 mb-4">
                        {cart.map((item, index) => (
                            <div key={index} className="flex justify-between items-center bg-white p-2 rounded border border-cafe-100">
                                <div className="flex items-center gap-3">
                                    {item.ingredient.image ? (
                                        <img src={item.ingredient.image} alt={item.ingredient.name} className="w-10 h-10 rounded object-cover border border-cafe-200" />
                                    ) : (
                                        <div className="w-10 h-10 rounded bg-cafe-100 flex items-center justify-center text-cafe-400">
                                            <ShoppingCart size={16} />
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-medium text-cafe-800">{item.ingredient.name}</div>
                                        <div className="text-sm text-cafe-500">x {item.quantity} {item.ingredient.unit}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-medium text-cafe-800">{formatCurrency(item.cost)}</span>
                                    <button onClick={() => handleRemoveFromCart(index)} className="text-red-400 hover:text-red-600">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center border-t border-cafe-200 pt-4 mb-4">
                        <span className="font-bold text-cafe-800">ยอดรวมทั้งสิ้น</span>
                        <span className="text-xl font-bold text-cafe-900">
                            {formatCurrency(cart.reduce((sum, item) => sum + item.cost, 0))}
                        </span>
                    </div>

                    <button
                        onClick={handleConfirmOrder}
                        className="w-full bg-cafe-800 text-white py-3 rounded-xl font-bold hover:bg-cafe-900 shadow-lg shadow-cafe-200"
                    >
                        ยืนยันการสั่งซื้อ (ตัดเงิน & เพิ่มของ)
                    </button>
                </div>
            )}
        </div>
    );
};
