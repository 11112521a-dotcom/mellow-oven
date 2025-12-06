import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/src/store';
import { Package, Save, Calendar, AlertCircle, Flame, Truck, X, Check, Sparkles, ChevronDown, ChevronUp, Layers, Box } from 'lucide-react';
import { Product, Variant } from '@/types';

// Type for flattened product/variant item
interface InventoryItem {
    id: string;           // unique key: productId or productId-variantId
    productId: string;
    variantId?: string;
    name: string;         // Display name
    parentName?: string;  // If variant, show parent name
    category: string;
    isVariant: boolean;
}

// Confirmation Modal Component
const ConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    type?: 'production' | 'transfer';
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'ยืนยัน', type = 'production' }) => {
    if (!isOpen) return null;

    const bgColor = type === 'production' ? 'from-blue-500 to-indigo-600' : 'from-amber-500 to-orange-600';
    const Icon = type === 'production' ? Flame : Truck;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`bg-gradient-to-r ${bgColor} p-6 text-white`}>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <Icon size={24} />
                        </div>
                        <h2 className="text-xl font-bold">{title}</h2>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="text-gray-600">{message}</div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-4 bg-gray-50 border-t">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <X size={18} />
                        ยกเลิก
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className={`flex-1 px-4 py-3 bg-gradient-to-r ${bgColor} text-white rounded-xl font-medium transition-all hover:shadow-lg flex items-center justify-center gap-2`}
                    >
                        <Check size={18} />
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const MenuStockPlanner: React.FC = () => {
    const { products, dailyInventory, fetchDailyInventory, upsertDailyInventory, getYesterdayStock } = useStore();

    const [businessDate, setBusinessDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);

    // Pending inputs BEFORE confirm (resets after confirm)
    const [pendingProduction, setPendingProduction] = useState<Record<string, number>>({});
    const [pendingTransfer, setPendingTransfer] = useState<Record<string, number>>({});

    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Modal States
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        itemId: string;
        productId: string;
        variantId?: string;
        itemName: string;
        type: 'production' | 'transfer';
        value: number;
    } | null>(null);

    // Bulk Fill State (for filling all variants at once)
    const [bulkProduction, setBulkProduction] = useState<Record<string, number>>({});
    const [bulkTransfer, setBulkTransfer] = useState<Record<string, number>>({});

    // Flatten products with variants into a single list
    const inventoryItems: InventoryItem[] = useMemo(() => {
        const items: InventoryItem[] = [];
        products.forEach(product => {
            if (product.variants && product.variants.length > 0) {
                // Product has variants - add each variant
                product.variants.forEach(variant => {
                    items.push({
                        id: `${product.id}-${variant.id}`,
                        productId: product.id,
                        variantId: variant.id,
                        name: variant.name,
                        parentName: product.name,
                        category: product.category,
                        isVariant: true
                    });
                });
            } else {
                // Product without variants - add the product itself
                items.push({
                    id: product.id,
                    productId: product.id,
                    name: product.name,
                    category: product.category,
                    isVariant: false
                });
            }
        });
        return items;
    }, [products]);

    // Group items by parent product for display
    const groupedItems = useMemo(() => {
        const groups: Map<string, { product: Product; items: InventoryItem[] }> = new Map();

        products.forEach(product => {
            const items = inventoryItems.filter(item => item.productId === product.id);
            if (items.length > 0) {
                groups.set(product.id, { product, items });
            }
        });

        return groups;
    }, [products, inventoryItems]);

    useEffect(() => {
        fetchDailyInventory(businessDate);
        const yesterday = new Date(businessDate);
        yesterday.setDate(yesterday.getDate() - 1);
        fetchDailyInventory(yesterday.toISOString().split('T')[0]);
    }, [businessDate, fetchDailyInventory]);

    const getYesterdayForItem = (item: InventoryItem) =>
        getYesterdayStock(item.productId, businessDate, item.variantId);

    // Get SAVED record from DB
    const getSavedRecord = (item: InventoryItem) => {
        const saved = dailyInventory.find(d =>
            d.businessDate === businessDate &&
            d.productId === item.productId &&
            (d.variantId || '') === (item.variantId || '')
        );
        return saved || { producedQty: 0, toShopQty: 0, stockYesterday: getYesterdayForItem(item) };
    };

    // Calculate today's stock = yesterday + ALL confirmed production
    const getTodayStock = (item: InventoryItem) => {
        const saved = getSavedRecord(item);
        const stockYesterday = saved.stockYesterday ?? getYesterdayForItem(item);
        const confirmedProduction = saved.producedQty || 0;
        return stockYesterday + confirmedProduction;
    };

    // Calculate leftover = today stock - confirmed transfer
    const calculateLeftover = (item: InventoryItem) => {
        const todayStock = getTodayStock(item);
        const saved = getSavedRecord(item);
        const confirmedTransfer = saved.toShopQty || 0;
        return todayStock - confirmedTransfer;
    };

    // Toggle group expansion
    const toggleGroup = (productId: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(productId)) {
                newSet.delete(productId);
            } else {
                newSet.add(productId);
            }
            return newSet;
        });
    };

    // Handle Production Confirmation
    const handleProductionConfirm = (item: InventoryItem, value: number) => {
        if (value <= 0) return;
        setConfirmModal({
            isOpen: true,
            itemId: item.id,
            productId: item.productId,
            variantId: item.variantId,
            itemName: item.parentName ? `${item.parentName} - ${item.name}` : item.name,
            type: 'production',
            value
        });
    };

    // Handle Transfer Confirmation
    const handleTransferConfirm = (item: InventoryItem, value: number) => {
        if (value <= 0) return;
        setConfirmModal({
            isOpen: true,
            itemId: item.id,
            productId: item.productId,
            variantId: item.variantId,
            itemName: item.parentName ? `${item.parentName} - ${item.name}` : item.name,
            type: 'transfer',
            value
        });
    };

    // Apply confirmed action - ADD to existing values in DB
    const applyConfirmedAction = async () => {
        if (!confirmModal) return;

        const item = inventoryItems.find(i => i.id === confirmModal.itemId);
        if (!item) return;

        const saved = getSavedRecord(item);
        const stockYesterday = saved.stockYesterday ?? getYesterdayForItem(item);

        let newProducedQty = saved.producedQty || 0;
        let newToShopQty = saved.toShopQty || 0;

        if (confirmModal.type === 'production') {
            // ADD to existing production
            newProducedQty += confirmModal.value;
            // Reset pending production input
            setPendingProduction(prev => {
                const updated = { ...prev };
                delete updated[item.id];
                return updated;
            });
        } else {
            // ADD to existing transfer
            newToShopQty += confirmModal.value;
            // Reset pending transfer input
            setPendingTransfer(prev => {
                const updated = { ...prev };
                delete updated[item.id];
                return updated;
            });
        }

        // Save to DB
        await upsertDailyInventory({
            businessDate,
            productId: item.productId,
            variantId: item.variantId,
            variantName: item.isVariant ? item.name : undefined,
            producedQty: newProducedQty,
            toShopQty: newToShopQty,
            stockYesterday
        });

        // Refetch to get updated values
        await fetchDailyInventory(businessDate);
    };

    const handleSaveAll = async () => {
        setIsSaving(true);
        // Save any remaining pending values
        for (const item of inventoryItems) {
            const saved = getSavedRecord(item);
            const pendingProd = pendingProduction[item.id] || 0;
            const pendingTrans = pendingTransfer[item.id] || 0;

            if (pendingProd > 0 || pendingTrans > 0) {
                await upsertDailyInventory({
                    businessDate,
                    productId: item.productId,
                    variantId: item.variantId,
                    variantName: item.isVariant ? item.name : undefined,
                    producedQty: (saved.producedQty || 0) + pendingProd,
                    toShopQty: (saved.toShopQty || 0) + pendingTrans,
                    stockYesterday: saved.stockYesterday ?? getYesterdayForItem(item)
                });
            }
        }
        setPendingProduction({});
        setPendingTransfer({});
        await fetchDailyInventory(businessDate);
        setIsSaving(false);
    };

    // Bulk Production - Apply same production value to ALL variants of a product
    const handleBulkProductionConfirm = async (productId: string, value: number) => {
        if (value <= 0) return;

        const items = inventoryItems.filter(i => i.productId === productId);

        for (const item of items) {
            const saved = getSavedRecord(item);
            const stockYesterday = saved.stockYesterday ?? getYesterdayForItem(item);

            await upsertDailyInventory({
                businessDate,
                productId: item.productId,
                variantId: item.variantId,
                variantName: item.isVariant ? item.name : undefined,
                producedQty: (saved.producedQty || 0) + value,
                toShopQty: saved.toShopQty || 0,
                stockYesterday
            });
        }

        // Clear bulk input
        setBulkProduction(prev => {
            const updated = { ...prev };
            delete updated[productId];
            return updated;
        });

        await fetchDailyInventory(businessDate);
    };

    // Bulk Transfer - Apply same transfer value to ALL variants of a product
    const handleBulkTransferConfirm = async (productId: string, value: number) => {
        if (value <= 0) return;

        const items = inventoryItems.filter(i => i.productId === productId);

        for (const item of items) {
            const saved = getSavedRecord(item);
            const stockYesterday = saved.stockYesterday ?? getYesterdayForItem(item);

            await upsertDailyInventory({
                businessDate,
                productId: item.productId,
                variantId: item.variantId,
                variantName: item.isVariant ? item.name : undefined,
                producedQty: saved.producedQty || 0,
                toShopQty: (saved.toShopQty || 0) + value,
                stockYesterday
            });
        }

        // Clear bulk input
        setBulkTransfer(prev => {
            const updated = { ...prev };
            delete updated[productId];
            return updated;
        });

        await fetchDailyInventory(businessDate);
    };

    // Render individual item card
    const renderItemCard = (item: InventoryItem, isNested: boolean = false) => {
        const saved = getSavedRecord(item);
        const stockYesterday = saved.stockYesterday ?? getYesterdayForItem(item);
        const confirmedProduction = saved.producedQty || 0;
        const confirmedTransfer = saved.toShopQty || 0;

        // Today stock = yesterday + confirmed production
        const todayStock = stockYesterday + confirmedProduction;

        // Leftover = today stock - confirmed transfer
        const leftover = todayStock - confirmedTransfer;

        // Pending inputs (before confirm)
        const pendingProd = pendingProduction[item.id] || 0;
        const pendingTrans = pendingTransfer[item.id] || 0;

        // Check if transfer would exceed available
        const availableForTransfer = todayStock - confirmedTransfer;
        const isOverflow = pendingTrans > availableForTransfer;

        return (
            <div
                key={item.id}
                className={`bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden hover:shadow-lg transition-all duration-300 ${isNested ? 'ml-4 border-l-4 border-l-cafe-400' : ''}`}
            >
                {/* Card Header */}
                <div className={`p-4 border-b border-cafe-100 ${isNested ? 'bg-gradient-to-r from-cafe-100 to-cafe-50' : 'bg-gradient-to-r from-cafe-50 to-white'}`}>
                    <div className="flex items-center gap-2">
                        {item.isVariant && <span className="text-cafe-500">↳</span>}
                        <h3 className="font-bold text-cafe-800 text-lg">{item.name}</h3>
                    </div>
                    {item.parentName && (
                        <span className="text-xs text-cafe-400">{item.parentName}</span>
                    )}
                    <span className="ml-2 text-xs text-cafe-400 bg-cafe-100 px-2 py-0.5 rounded-full">{item.category}</span>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                   🏠 HOME ZONE - What's at home
                   ═══════════════════════════════════════════════════════════ */}
                <div className="p-4 space-y-3 bg-gradient-to-b from-amber-50/50 to-white">
                    {/* Zone Header */}
                    <div className="flex items-center gap-2 text-amber-700 mb-2">
                        <span className="text-lg">🏠</span>
                        <span className="text-xs font-bold uppercase tracking-wider">ที่บ้าน (Home)</span>
                        <div className="flex-1 h-px bg-amber-200"></div>
                    </div>

                    {/* Yesterday Stock */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">📦 ของเก่า (เมื่อวาน)</span>
                        <span className="font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">{stockYesterday}</span>
                    </div>

                    {/* Production Input */}
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Flame className="text-blue-500" size={18} />
                                <span className="text-sm font-medium text-blue-700">ผลิตเพิ่ม</span>
                                {confirmedProduction > 0 && (
                                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">+{confirmedProduction} แล้ว</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    className="w-16 text-center font-bold text-blue-700 bg-white border-blue-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    value={pendingProd || ''}
                                    onChange={e => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setPendingProduction(prev => ({ ...prev, [item.id]: val }));
                                    }}
                                    placeholder="0"
                                />
                                <button
                                    onClick={() => handleProductionConfirm(item, pendingProd)}
                                    disabled={pendingProd <= 0}
                                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Check size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* TODAY STOCK */}
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border-2 border-emerald-200 text-center">
                        <div className="flex items-center justify-center gap-2 text-emerald-600 mb-1">
                            <Box size={18} />
                            <span className="text-sm font-semibold">สต็อกวันนี้ (รวมที่บ้าน)</span>
                        </div>
                        <div className="text-3xl font-black text-emerald-700">{todayStock}</div>
                        <div className="text-xs text-emerald-500 mt-1">= {stockYesterday} เก่า + {confirmedProduction} ผลิต</div>
                    </div>

                    {/* LEFTOVER - What stays at home (MOVED UP!) */}
                    <div className={`rounded-xl p-4 text-center border-2 border-dashed ${leftover < 0 ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'}`}>
                        <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="text-lg">🏠</span>
                            <span className={`text-xs font-bold ${leftover < 0 ? 'text-red-600' : 'text-amber-700'}`}>คงเหลือที่บ้าน</span>
                        </div>
                        <div className={`text-4xl font-black ${leftover < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                            {leftover}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">→ ยกไปพรุ่งนี้</div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                   🏪 SHOP ZONE - What goes to the shop
                   ═══════════════════════════════════════════════════════════ */}
                <div className="p-4 space-y-3 bg-gradient-to-b from-violet-50/50 to-white border-t-2 border-dashed border-violet-200">
                    {/* Zone Header */}
                    <div className="flex items-center gap-2 text-violet-700 mb-2">
                        <span className="text-lg">🏪</span>
                        <span className="text-xs font-bold uppercase tracking-wider">ไปร้าน (Shop)</span>
                        <div className="flex-1 h-px bg-violet-200"></div>
                    </div>

                    {/* Transfer Input */}
                    <div className={`rounded-xl p-3 border-2 ${isOverflow ? 'bg-red-50 border-red-300' : 'bg-violet-50 border-violet-200'}`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Truck className={isOverflow ? 'text-red-500' : 'text-violet-500'} size={18} />
                                <span className={`text-sm font-medium ${isOverflow ? 'text-red-700' : 'text-violet-700'}`}>ส่งไปร้าน</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    className={`w-16 text-center font-bold bg-white rounded-lg focus:ring-violet-500 focus:border-violet-500 ${isOverflow ? 'text-red-600 border-red-300' : 'text-violet-700 border-violet-200'}`}
                                    value={pendingTrans || ''}
                                    onChange={e => {
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        setPendingTransfer(prev => ({ ...prev, [item.id]: val }));
                                    }}
                                    placeholder="0"
                                />
                                <button
                                    onClick={() => handleTransferConfirm(item, pendingTrans)}
                                    disabled={pendingTrans <= 0 || isOverflow}
                                    className="p-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Check size={16} />
                                </button>
                            </div>
                        </div>
                        {isOverflow && (
                            <div className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                <AlertCircle size={12} />
                                เกินที่เหลือ! (เหลือ {availableForTransfer} ชิ้น)
                            </div>
                        )}
                    </div>

                    {/* Total Sent to Shop Display */}
                    {confirmedTransfer > 0 && (
                        <div className="bg-violet-100 rounded-xl p-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-violet-600 mb-1">
                                <span className="text-lg">🏪</span>
                                <span className="text-xs font-bold">ส่งไปร้านแล้ว</span>
                            </div>
                            <div className="text-3xl font-black text-violet-700">{confirmedTransfer}</div>
                            <div className="text-xs text-violet-500 mt-1">→ พร้อมขายหน้าร้าน</div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-6">
            {/* Premium Header */}
            <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cafe-800 via-cafe-700 to-cafe-900 p-8 text-white shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center">
                            <Package size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                สต็อกเมนูรายวัน
                                <Sparkles className="text-yellow-300" size={20} />
                            </h1>
                            <p className="text-cafe-200">Daily Stock Management • {inventoryItems.length} รายการ</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-xl p-3">
                        <Calendar size={20} className="text-cafe-200" />
                        <input
                            type="date"
                            value={businessDate}
                            onChange={e => setBusinessDate(e.target.value)}
                            className="bg-transparent border-none text-white font-medium focus:ring-0 cursor-pointer"
                        />
                    </div>
                </div>
            </header>

            {/* Product Groups */}
            <div className="space-y-4">
                {Array.from(groupedItems.values()).map(({ product, items }) => {
                    const hasVariants = items.some(i => i.isVariant);
                    const isExpanded = expandedGroups.has(product.id);

                    if (!hasVariants) {
                        // Simple product without variants - render directly
                        return renderItemCard(items[0]);
                    }

                    // Product with variants - render as collapsible group
                    return (
                        <div key={product.id} className="space-y-2">
                            {/* Group Header */}
                            <button
                                onClick={() => toggleGroup(product.id)}
                                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-cafe-700 to-cafe-800 text-white rounded-xl hover:from-cafe-600 hover:to-cafe-700 transition-colors shadow-md"
                            >
                                <div className="flex items-center gap-3">
                                    <Layers size={20} />
                                    <span className="font-bold text-lg">{product.name}</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">{items.length} ไส้</span>
                                </div>
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>

                            {/* 🚀 BULK FILL ALL VARIANTS - Quick Actions */}
                            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200">
                                <div className="text-xs font-bold text-purple-700 mb-2 flex items-center gap-1">
                                    <Sparkles size={14} />
                                    กรอกทุกไส้พร้อมกัน (Quick Fill)
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {/* Bulk Production */}
                                    <div className="flex items-center gap-1 bg-blue-100 rounded-lg px-2 py-1">
                                        <Flame size={14} className="text-blue-600" />
                                        <input
                                            type="number"
                                            className="w-12 text-center text-sm font-bold bg-white border border-blue-200 rounded px-1"
                                            placeholder="0"
                                            value={bulkProduction[product.id] || ''}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                setBulkProduction(prev => ({ ...prev, [product.id]: val }));
                                            }}
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBulkProductionConfirm(product.id, bulkProduction[product.id] || 0);
                                            }}
                                            disabled={(bulkProduction[product.id] || 0) <= 0}
                                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded font-medium disabled:opacity-50"
                                        >
                                            ผลิตทั้งหมด
                                        </button>
                                    </div>

                                    {/* Bulk Transfer */}
                                    <div className="flex items-center gap-1 bg-violet-100 rounded-lg px-2 py-1">
                                        <Truck size={14} className="text-violet-600" />
                                        <input
                                            type="number"
                                            className="w-12 text-center text-sm font-bold bg-white border border-violet-200 rounded px-1"
                                            placeholder="0"
                                            value={bulkTransfer[product.id] || ''}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                setBulkTransfer(prev => ({ ...prev, [product.id]: val }));
                                            }}
                                        />
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleBulkTransferConfirm(product.id, bulkTransfer[product.id] || 0);
                                            }}
                                            disabled={(bulkTransfer[product.id] || 0) <= 0}
                                            className="px-2 py-1 bg-violet-500 text-white text-xs rounded font-medium disabled:opacity-50"
                                        >
                                            ส่งทั้งหมด
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Variant Cards */}
                            {isExpanded && (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-in slide-in-from-top-2 duration-200">
                                    {items.map(item => renderItemCard(item, true))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {inventoryItems.length === 0 && (
                <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-cafe-200">
                    <Package className="mx-auto text-cafe-300 mb-4" size={48} />
                    <p className="text-cafe-400">ยังไม่มีสินค้าในระบบ</p>
                </div>
            )}

            {/* Save All Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cafe-700 to-cafe-900 text-white rounded-xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 font-medium"
                >
                    <Save size={20} />
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
                </button>
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal(null)}
                    onConfirm={applyConfirmedAction}
                    type={confirmModal.type}
                    title={confirmModal.type === 'production' ? '🔥 ยืนยันการผลิต' : '🚚 ยืนยันการส่งไปร้าน'}
                    message={
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">สินค้า</span>
                                <span className="font-bold text-cafe-800">{confirmModal.itemName}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">
                                    {confirmModal.type === 'production' ? 'จำนวนผลิต' : 'จำนวนส่ง'}
                                </span>
                                <span className="font-bold text-2xl text-cafe-800">{confirmModal.value} ชิ้น</span>
                            </div>
                            {confirmModal.type === 'production' && (
                                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                                    💡 ตัวเลขจะถูกเพิ่มเข้า "สต็อกวันนี้" และช่องกรอกจะรีเซ็ตเป็น 0
                                </div>
                            )}
                            {confirmModal.type === 'transfer' && (
                                <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                                    💡 จำนวนนี้จะถูกหักจากสต็อกและส่งไปหน้าบันทึกขาย
                                </div>
                            )}
                        </div>
                    }
                    confirmText={confirmModal.type === 'production' ? 'ยืนยันผลิต' : 'ยืนยันส่ง'}
                />
            )}
        </div>
    );
};
