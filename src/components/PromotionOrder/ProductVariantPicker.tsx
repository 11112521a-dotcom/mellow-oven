// ============================================================
// Product Variant Picker Component
// Select products with variants and quantities
// ============================================================

import React, { useState, useMemo } from 'react';
import { useStore } from '../../store';
import { Product } from '../../../types';
import {
    Search, ChevronDown, ChevronRight,
    Plus, Minus, Package
} from 'lucide-react';

interface SelectedItem {
    productId: string;
    productName: string;
    variantId: string | null;
    variantName: string;
    quantity: number;
    unitPrice: number;
}

interface ProductVariantPickerProps {
    selectedItems: SelectedItem[];
    onItemsChange: (items: SelectedItem[]) => void;
}

export const ProductVariantPicker: React.FC<ProductVariantPickerProps> = ({
    selectedItems,
    onItemsChange
}) => {
    const { products } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    // Group products by category
    const groupedProducts = useMemo(() => {
        const groups: Record<string, Product[]> = {};

        products.forEach(product => {
            if (!product.isHidden) {
                const cat = product.category || 'อื่นๆ';
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(product);
            }
        });

        return groups;
    }, [products]);

    // Filter by search
    const filteredGroups = useMemo(() => {
        if (!searchTerm) return groupedProducts;

        const filtered: Record<string, Product[]> = {};
        Object.entries(groupedProducts).forEach(([cat, prods]) => {
            const matches = prods.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (matches.length > 0) filtered[cat] = matches;
        });

        return filtered;
    }, [groupedProducts, searchTerm]);

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };

    const addItem = (product: Product, variantId?: string, variantName?: string) => {
        const key = `${product.id}-${variantId || 'base'}`;
        const existing = selectedItems.find(i =>
            i.productId === product.id && i.variantId === (variantId || null)
        );

        if (existing) {
            // Increment quantity
            onItemsChange(selectedItems.map(i =>
                i.productId === product.id && i.variantId === (variantId || null)
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
            ));
        } else {
            // Add new
            const variant = product.variants?.find(v => v.id === variantId);
            onItemsChange([...selectedItems, {
                productId: product.id,
                productName: product.name,
                variantId: variantId || null,
                variantName: variantName || product.name,
                quantity: 1,
                unitPrice: variant?.price || product.price
            }]);
        }
    };

    const updateQuantity = (productId: string, variantId: string | null, delta: number) => {
        onItemsChange(selectedItems.map(i => {
            if (i.productId === productId && i.variantId === variantId) {
                const newQty = Math.max(0, i.quantity + delta);
                return { ...i, quantity: newQty };
            }
            return i;
        }).filter(i => i.quantity > 0));
    };

    const getItemQuantity = (productId: string, variantId: string | null): number => {
        const item = selectedItems.find(i =>
            i.productId === productId && i.variantId === variantId
        );
        return item?.quantity || 0;
    };

    return (
        <div className="space-y-4">
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="ค้นหาสินค้า..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
            </div>

            {/* Categories */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
                {Object.entries(filteredGroups).map(([category, prods]) => (
                    <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Category Header */}
                        <button
                            onClick={() => toggleCategory(category)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            <span className="font-medium text-gray-700">{category}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{prods.length} รายการ</span>
                                {expandedCategories.has(category) ? (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                )}
                            </div>
                        </button>

                        {/* Products */}
                        {expandedCategories.has(category) && (
                            <div className="divide-y divide-gray-100">
                                {prods.map(product => (
                                    <div key={product.id} className="p-3">
                                        {/* Product with variants */}
                                        {product.variants && product.variants.length > 0 ? (
                                            <div className="space-y-2">
                                                <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-amber-600" />
                                                    {product.name}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 ml-6">
                                                    {product.variants.map(variant => {
                                                        const qty = getItemQuantity(product.id, variant.id);
                                                        return (
                                                            <div
                                                                key={variant.id}
                                                                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                                                            >
                                                                <div>
                                                                    <span className="text-sm text-gray-700">{variant.name}</span>
                                                                    <span className="text-xs text-amber-600 ml-2">฿{variant.price}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    {qty > 0 && (
                                                                        <button
                                                                            onClick={() => updateQuantity(product.id, variant.id, -1)}
                                                                            className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                                                        >
                                                                            <Minus className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                    {qty > 0 && (
                                                                        <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                                                                    )}
                                                                    <button
                                                                        onClick={() => addItem(product, variant.id, variant.name)}
                                                                        className="w-6 h-6 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 flex items-center justify-center"
                                                                    >
                                                                        <Plus className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Product without variants */
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-amber-600" />
                                                    <span className="text-sm text-gray-700">{product.name}</span>
                                                    <span className="text-xs text-amber-600">฿{product.price}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {getItemQuantity(product.id, null) > 0 && (
                                                        <>
                                                            <button
                                                                onClick={() => updateQuantity(product.id, null, -1)}
                                                                className="w-6 h-6 rounded bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="w-8 text-center text-sm font-semibold">
                                                                {getItemQuantity(product.id, null)}
                                                            </span>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => addItem(product)}
                                                        className="w-6 h-6 rounded bg-amber-100 hover:bg-amber-200 text-amber-700 flex items-center justify-center"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Selected Summary */}
            {selectedItems.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <div className="text-sm font-medium text-amber-800 mb-2">
                        รายการที่เลือก ({selectedItems.reduce((s, i) => s + i.quantity, 0)} ชิ้น)
                    </div>
                    <div className="space-y-1">
                        {selectedItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-gray-700">
                                    {item.variantName || item.productName} x {item.quantity}
                                </span>
                                <span className="text-amber-600">฿{(item.unitPrice * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
