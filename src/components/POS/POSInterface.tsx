import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { Product, DailyReport } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import { ShoppingBag, Trash2, Plus, Minus } from 'lucide-react';

export const POSInterface: React.FC = () => {
    const { products, addTransaction, updateJarBalance, addDailyReport } = useStore();
    const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

    const filteredProducts = selectedCategory === 'All'
        ? products
        : products.filter(p => p.category === selectedCategory);

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                return { ...item, quantity: Math.max(0, item.quantity + delta) };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    const handleCheckout = () => {
        if (cart.length === 0) return;

        // 1. Record Income (Add to Working Capital for now, or split based on logic)
        // Assuming 100% goes to Revenue, then allocated later. 
        // For simplicity, we add to 'Working' and user can allocate later, OR we auto-allocate.
        // Let's add to 'Working' first.
        updateJarBalance('Working', totalAmount);

        // 2. Record Transaction
        addTransaction({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: totalAmount,
            type: 'INCOME',
            toJar: 'Working',
            description: `Sale: ${cart.map(i => `${i.product.name} x${i.quantity}`).join(', ')}`,
            category: 'Sales'
        });

        // 3. Clear Cart
        setCart([]);
        alert(`ชำระเงินเรียบร้อย! ยอดรวม ${formatCurrency(totalAmount)}`);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-10rem)]">
            {/* Product Grid */}
            <div className="lg:col-span-2 flex flex-col h-full">
                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${selectedCategory === cat
                                    ? 'bg-cafe-800 text-white'
                                    : 'bg-white text-cafe-600 border border-cafe-200 hover:bg-cafe-50'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto p-1">
                    {filteredProducts.map(product => (
                        <button
                            key={product.id}
                            onClick={() => addToCart(product)}
                            className="bg-white p-4 rounded-xl border border-cafe-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group"
                        >
                            <div>
                                <h4 className="font-bold text-cafe-800 group-hover:text-cafe-600">{product.name}</h4>
                                <p className="text-xs text-cafe-500">{product.flavor}</p>
                            </div>
                            <div className="mt-4 font-medium text-cafe-900">
                                {formatCurrency(product.price)}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Cart / Checkout */}
            <div className="bg-white rounded-2xl shadow-lg border border-cafe-100 flex flex-col h-full">
                <div className="p-6 border-b border-cafe-100 bg-cafe-50 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-cafe-800 flex items-center gap-2">
                        <ShoppingBag size={20} /> ตะกร้าสินค้า
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-cafe-400">
                            <ShoppingBag size={48} className="mb-2 opacity-20" />
                            <p>เลือกสินค้าเพื่อเริ่มขาย</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.product.id} className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-cafe-800">{item.product.name}</p>
                                    <p className="text-xs text-cafe-500">{formatCurrency(item.product.price)}</p>
                                </div>
                                <div className="flex items-center gap-3 bg-cafe-50 rounded-lg p-1">
                                    <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 hover:bg-white rounded text-cafe-600"><Minus size={14} /></button>
                                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 hover:bg-white rounded text-cafe-600"><Plus size={14} /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-6 border-t border-cafe-100 bg-cafe-50 rounded-b-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-cafe-600">ยอดรวม</span>
                        <span className="text-2xl font-bold text-cafe-900">{formatCurrency(totalAmount)}</span>
                    </div>
                    <button
                        onClick={handleCheckout}
                        disabled={cart.length === 0}
                        className="w-full bg-cafe-800 text-white py-4 rounded-xl font-bold hover:bg-cafe-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cafe-200 transition-all active:scale-95"
                    >
                        รับเงิน (Checkout)
                    </button>
                </div>
            </div>
        </div>
    );
};
