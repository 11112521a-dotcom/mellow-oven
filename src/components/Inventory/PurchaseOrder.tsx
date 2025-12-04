import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { Ingredient, PurchaseOrder } from '@/types';
import { Plus, Trash2, ShoppingCart, Download, Image as ImageIcon } from 'lucide-react';
import { NumberInput } from '@/src/components/ui/NumberInput';
import { formatCurrency } from '@/src/lib/utils';
import html2canvas from 'html2canvas';

export const PurchaseOrderForm: React.FC = () => {
    const { ingredients, createPurchaseOrder, updateStock, updateJarBalance, addTransaction } = useStore();

    const [selectedIngredientId, setSelectedIngredientId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [cost, setCost] = useState('');
    const [useBuyUnit, setUseBuyUnit] = useState(true); // Default to buy unit if available
    const [cart, setCart] = useState<{ ingredient: Ingredient, quantity: number, cost: number, buyUnit?: string, buyQuantity?: number }[]>([]);

    const selectedIngredient = ingredients.find(i => i.id === selectedIngredientId);

    // Reset toggle when ingredient changes
    React.useEffect(() => {
        if (selectedIngredient?.buyUnit) {
            setUseBuyUnit(true);
        } else {
            setUseBuyUnit(false);
        }
    }, [selectedIngredientId]);

    const handleAddToCart = () => {
        if (selectedIngredient && quantity && cost) {
            const qty = parseFloat(quantity);
            const totalCost = parseFloat(cost);

            let finalQuantity = qty;
            let buyUnitLabel = selectedIngredient.unit;
            let buyQty = qty;

            if (useBuyUnit && selectedIngredient.buyUnit && selectedIngredient.conversionRate) {
                finalQuantity = qty * selectedIngredient.conversionRate;
                buyUnitLabel = selectedIngredient.buyUnit;
            }

            setCart([...cart, {
                ingredient: selectedIngredient,
                quantity: finalQuantity, // Stock Unit Quantity
                cost: totalCost,
                buyUnit: useBuyUnit ? selectedIngredient.buyUnit : undefined,
                buyQuantity: useBuyUnit ? qty : undefined
            }]);

            setSelectedIngredientId('');
            setQuantity('');
            setCost('');
        }
    };

    const handleRemoveFromCart = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const handleDownloadImage = async () => {
        const element = document.getElementById('purchase-order-summary');
        if (element) {
            try {
                const canvas = await html2canvas(element, {
                    backgroundColor: '#ffffff',
                    scale: 2 // Higher resolution
                });
                const data = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = data;
                link.download = `purchase-order-${new Date().toISOString().split('T')[0]}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                console.error('Error generating image:', error);
                alert('เกิดข้อผิดพลาดในการบันทึกรูปภาพ');
            }
        }
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
            updateStock(item.ingredient.id, item.quantity, 'PO', `Purchase Order #${po.id.slice(0, 8)}`);
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

                {/* Unit Toggle */}
                {selectedIngredient?.buyUnit && (
                    <div className="md:col-span-4 flex items-center gap-4 bg-blue-50 p-2 rounded-lg border border-blue-100">
                        <span className="text-sm text-blue-800 font-medium">หน่วยที่จะซื้อ:</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                checked={useBuyUnit}
                                onChange={() => setUseBuyUnit(true)}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-cafe-700">
                                {selectedIngredient.buyUnit} (1 {selectedIngredient.buyUnit} = {selectedIngredient.conversionRate} {selectedIngredient.unit})
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                checked={!useBuyUnit}
                                onChange={() => setUseBuyUnit(false)}
                                className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-cafe-700">
                                {selectedIngredient.unit} (หน่วยใช้จริง)
                            </span>
                        </label>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-1">
                        จำนวนที่ซื้อ ({selectedIngredient && useBuyUnit && selectedIngredient.buyUnit ? selectedIngredient.buyUnit : selectedIngredient?.unit || 'หน่วย'})
                    </label>
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
                <div id="purchase-order-summary" className="bg-cafe-50 rounded-xl p-4 border border-cafe-200">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-cafe-800 flex items-center gap-2">
                            <ShoppingCart size={18} />
                            รายการที่จะสั่งซื้อ
                        </h4>
                        <div className="text-xs text-cafe-400">
                            {new Date().toLocaleDateString('th-TH', { dateStyle: 'long' })}
                        </div>
                    </div>

                    <div className="space-y-2 mb-4 bg-white p-3 rounded-lg border border-cafe-100">
                        {cart.map((item, index) => (
                            <div key={index} className="flex justify-between items-center p-2 border-b border-cafe-50 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-cafe-100 flex items-center justify-center text-cafe-500 font-bold text-xs">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="font-bold text-cafe-800">{item.ingredient.name}</div>
                                        <div className="text-sm text-cafe-500">
                                            {item.buyUnit ? (
                                                <span className="text-blue-600 font-bold">
                                                    {item.buyQuantity} {item.buyUnit}
                                                </span>
                                            ) : (
                                                <span>{item.quantity} {item.ingredient.unit}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-cafe-800">{formatCurrency(item.cost)}</span>
                                    <button
                                        onClick={() => handleRemoveFromCart(index)}
                                        className="text-red-400 hover:text-red-600 data-[html2canvas-ignore]:block"
                                        data-html2canvas-ignore="true"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between items-center border-t border-cafe-200 pt-4 mb-4">
                        <span className="font-bold text-cafe-800">ยอดรวมทั้งสิ้น</span>
                        <span className="text-2xl font-bold text-cafe-900">
                            {formatCurrency(cart.reduce((sum, item) => sum + item.cost, 0))}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3" data-html2canvas-ignore="true">
                        <button
                            onClick={handleDownloadImage}
                            className="flex items-center justify-center gap-2 bg-white border border-cafe-300 text-cafe-700 py-3 rounded-xl font-bold hover:bg-cafe-50 transition-colors"
                        >
                            <ImageIcon size={20} />
                            บันทึกรูปภาพ
                        </button>
                        <button
                            onClick={handleConfirmOrder}
                            className="flex items-center justify-center gap-2 bg-cafe-800 text-white py-3 rounded-xl font-bold hover:bg-cafe-900 shadow-lg shadow-cafe-200 transition-all"
                        >
                            <ShoppingCart size={20} />
                            ยืนยันการสั่งซื้อ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
