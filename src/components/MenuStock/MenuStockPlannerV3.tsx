import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/src/store';
import { StatsHeader } from './StatsHeader';
import { ActionBar } from './ActionBar';
import { ProductGroup } from './ProductGroup';
import { Package } from 'lucide-react';

export const MenuStockPlannerV3: React.FC = () => {
    // 1. Store & State
    const { products, dailyInventory, fetchDailyInventory, upsertDailyInventory, getYesterdayStock } = useStore();
    const [businessDate, setBusinessDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 2. Fetch Data on Date Change
    useEffect(() => {
        fetchDailyInventory(businessDate);
        const yesterday = new Date(businessDate);
        yesterday.setDate(yesterday.getDate() - 1);
        fetchDailyInventory(yesterday.toISOString().split('T')[0]);
    }, [businessDate, fetchDailyInventory]);

    // 3. Group Products with Variants (🛡️ ZOMBIE FILTER via products list)
    const groupedProducts = useMemo(() => {
        const inventoryMap = new Map(
            dailyInventory
                .filter(d => d.businessDate === businessDate)
                .map(d => [`${d.productId}-${d.variantId || ''}`, d])
        );

        return products
            .filter(product =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.category.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map(product => {
                // Build variants array for this product
                const variants = product.variants && product.variants.length > 0
                    ? product.variants.map(variant => {
                        const key = `${product.id}-${variant.id}`;
                        const saved = inventoryMap.get(key);
                        return {
                            id: key,
                            variantId: variant.id,
                            name: variant.name,
                            stockYesterday: getYesterdayStock(product.id, businessDate, variant.id),
                            savedRecord: saved || { producedQty: 0, toShopQty: 0, wasteQty: 0, soldQty: 0, eatQty: 0, giveawayQty: 0 },
                            dailyTarget: (product as any).dailyTarget || 15
                        };
                    })
                    : [{
                        // Single product (no variants)
                        id: `${product.id}-`,
                        variantId: product.id,
                        name: product.name,
                        stockYesterday: getYesterdayStock(product.id, businessDate),
                        savedRecord: inventoryMap.get(`${product.id}-`) || { producedQty: 0, toShopQty: 0, wasteQty: 0, soldQty: 0, eatQty: 0, giveawayQty: 0 },
                        dailyTarget: (product as any).dailyTarget || 15
                    }];

                return {
                    productId: product.id,
                    productName: product.name,
                    category: product.category,
                    variants
                };
            });
    }, [products, dailyInventory, businessDate, searchQuery, getYesterdayStock]);

    // 4. Stats Calculation
    const stats = useMemo(() => {
        let totalStock = 0;
        let needProduction = 0;
        let sentToShop = 0;

        groupedProducts.forEach(group => {
            group.variants.forEach(v => {
                const stock = v.stockYesterday + v.savedRecord.producedQty;
                totalStock += stock;
                sentToShop += v.savedRecord.toShopQty;
                if (stock < v.dailyTarget) {
                    needProduction += (v.dailyTarget - stock);
                }
            });
        });

        return { totalStock, needProduction, sentToShop };
    }, [groupedProducts]);

    // 5. Single Action Handler - 🛡️ DATA PRESERVATION
    const handleSingleAction = async (
        productId: string,
        variantId: string,
        updates: Partial<{ producedQty: number; toShopQty: number; wasteQty: number; eatQty: number; giveawayQty: number }>,
        mode: 'add' | 'replace' = 'add'
    ) => {
        // Find the variant
        const group = groupedProducts.find(g => g.productId === productId);
        const variant = group?.variants.find(v => v.variantId === variantId);
        if (!variant) return;

        const saved = variant.savedRecord;

        const newProduced = updates.producedQty !== undefined
            ? (mode === 'add' ? saved.producedQty + updates.producedQty : updates.producedQty)
            : saved.producedQty;

        const newToShop = updates.toShopQty !== undefined
            ? (mode === 'add' ? saved.toShopQty + updates.toShopQty : updates.toShopQty)
            : saved.toShopQty;

        const newWaste = updates.wasteQty !== undefined
            ? (mode === 'add' ? saved.wasteQty + updates.wasteQty : updates.wasteQty)
            : saved.wasteQty;

        const newEat = updates.eatQty !== undefined
            ? (mode === 'add' ? saved.eatQty + updates.eatQty : updates.eatQty)
            : saved.eatQty;

        const newGiveaway = updates.giveawayQty !== undefined
            ? (mode === 'add' ? saved.giveawayQty + updates.giveawayQty : updates.giveawayQty)
            : saved.giveawayQty;

        // 🛡️ CRITICAL: Always preserve all fields
        await upsertDailyInventory({
            businessDate,
            productId,
            variantId: variantId === productId ? null : variantId, // null if no variant
            stockYesterday: variant.stockYesterday,
            producedQty: newProduced,
            toShopQty: newToShop,
            wasteQty: newWaste,      // ✅ Preserved
            eatQty: newEat,          // ✅ FIX: PRESERVED/UPDATED
            giveawayQty: newGiveaway,// ✅ FIX: PRESERVED/UPDATED
            soldQty: saved.soldQty   // ✅ Always Preserved
        });

        await fetchDailyInventory(businessDate);
    };

    // 6. Group Bulk Action - 🛡️ ZOMBIE CHECK & SILENT FETCH
    const handleGroupBulkAction = async (productId: string, type: 'produce' | 'send' | 'target', maxPerItem?: number) => {
        const group = groupedProducts.find(g => g.productId === productId);
        if (!group) return;

        const msgs: Record<string, string> = {
            produce: `ยืนยันผลิต "${group.productName}" ทั้งหมดตามเป้า?`,
            send: maxPerItem
                ? `ยืนยันส่ง "${group.productName}" อย่างละไม่เกิน ${maxPerItem} ชิ้น?`
                : `ยืนยันส่ง "${group.productName}" ที่มีทั้งหมดไปร้าน?`,
            target: `ตั้งเป้าสำหรับ "${group.productName}" ทุกรายการ?`
        };

        if (!window.confirm(msgs[type])) return;

        setIsRefreshing(true);
        try {
            // 🛡️ Silent Fetch: Get latest data first
            await fetchDailyInventory(businessDate);

            const promises = group.variants.map(variant => {
                const saved = variant.savedRecord;
                let payload: any = null;

                if (type === 'produce') {
                    const waste = saved.wasteQty;
                    const currentStock = variant.stockYesterday + saved.producedQty;
                    const actualStock = currentStock - waste;
                    const target = variant.dailyTarget;
                    const needed = Math.max(0, target - actualStock);

                    if (needed <= 0) return null;

                    payload = {
                        producedQty: saved.producedQty + needed,
                        toShopQty: saved.toShopQty,
                        wasteQty: saved.wasteQty,
                        eatQty: saved.eatQty,
                        giveawayQty: saved.giveawayQty,
                        soldQty: saved.soldQty
                    };
                } else if (type === 'send') {
                    const totalStock = variant.stockYesterday + saved.producedQty;
                    const available = Math.max(0, totalStock - saved.toShopQty - saved.wasteQty - saved.eatQty - saved.giveawayQty);
                    const sendQty = maxPerItem ? Math.min(available, Math.max(0, maxPerItem - saved.toShopQty)) : available;

                    if (sendQty <= 0) return null;

                    payload = {
                        producedQty: saved.producedQty,
                        toShopQty: saved.toShopQty + sendQty,
                        wasteQty: saved.wasteQty,
                        eatQty: saved.eatQty,
                        giveawayQty: saved.giveawayQty,
                        soldQty: saved.soldQty
                    };
                }

                if (!payload) return null;

                return upsertDailyInventory({
                    businessDate,
                    productId,
                    variantId: variant.variantId === productId ? null : variant.variantId,
                    stockYesterday: variant.stockYesterday,
                    ...payload
                });
            }).filter(Boolean);

            await Promise.all(promises);
            await fetchDailyInventory(businessDate);
        } catch (error) {
            console.error('[Group Bulk Action Error]', error);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsRefreshing(false);
        }
    };

    // 7. Global Bulk Action
    const handleGlobalBulkAction = async (type: 'produce' | 'send' | 'target', maxPerItem?: number) => {
        const msgs: Record<string, string> = {
            produce: 'ยืนยันผลิตทุกสินค้าตามเป้า?',
            send: maxPerItem
                ? `ยืนยันส่งของทั้งหมด อย่างละไม่เกิน ${maxPerItem} ชิ้น?`
                : 'ยืนยันส่งของที่มีทั้งหมดไปร้าน?',
            target: 'ตั้งเป้าหมายสำหรับทุกสินค้า?'
        };

        if (!window.confirm(msgs[type])) return;

        setIsRefreshing(true);
        try {
            await fetchDailyInventory(businessDate);

            const allPromises = groupedProducts.flatMap(group =>
                group.variants.map(variant => {
                    const saved = variant.savedRecord;
                    let payload: any = null;

                    if (type === 'produce') {
                        const waste = saved.wasteQty;
                        const currentStock = variant.stockYesterday + saved.producedQty;
                        const actualStock = currentStock - waste;
                        const needed = Math.max(0, variant.dailyTarget - actualStock);

                        if (needed <= 0) return null;

                        payload = {
                            producedQty: saved.producedQty + needed,
                            toShopQty: saved.toShopQty,
                            wasteQty: saved.wasteQty,
                            eatQty: saved.eatQty,
                            giveawayQty: saved.giveawayQty,
                            soldQty: saved.soldQty
                        };
                    } else if (type === 'send') {
                        const totalStock = variant.stockYesterday + saved.producedQty;
                        const available = Math.max(0, totalStock - saved.toShopQty - saved.wasteQty - saved.eatQty - saved.giveawayQty);
                        const sendQty = maxPerItem ? Math.min(available, Math.max(0, maxPerItem - saved.toShopQty)) : available;

                        if (sendQty <= 0) return null;

                        payload = {
                            producedQty: saved.producedQty,
                            toShopQty: saved.toShopQty + sendQty,
                            wasteQty: saved.wasteQty,
                            eatQty: saved.eatQty,
                            giveawayQty: saved.giveawayQty,
                            soldQty: saved.soldQty
                        };
                    }

                    if (!payload) return null;

                    return upsertDailyInventory({
                        businessDate,
                        productId: group.productId,
                        variantId: variant.variantId === group.productId ? null : variant.variantId,
                        stockYesterday: variant.stockYesterday,
                        ...payload
                    });
                })
            ).filter(Boolean);

            await Promise.all(allPromises);
            await fetchDailyInventory(businessDate);
        } catch (error) {
            console.error('[Global Bulk Action Error]', error);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-orange-50/30 pb-20">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
                {/* Stats Header */}
                <StatsHeader
                    date={businessDate}
                    onDateChange={setBusinessDate}
                    stats={stats}
                />

                {/* Action Bar */}
                <ActionBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onBulkProduce={() => handleGlobalBulkAction('produce')}
                    onBulkSend={(maxPerItem) => handleGlobalBulkAction('send', maxPerItem)}
                    onSetTarget={() => handleGlobalBulkAction('target')}
                />

                {/* Loading */}
                {isRefreshing && (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
                    </div>
                )}

                {/* Product Groups */}
                {groupedProducts.length > 0 ? (
                    <div className="space-y-4">
                        {groupedProducts.map(group => (
                            <ProductGroup
                                key={group.productId}
                                productId={group.productId}
                                productName={group.productName}
                                category={group.category}
                                variants={group.variants as any}
                                onEat={(variantId, val) => handleSingleAction(group.productId, variantId, { eatQty: val }, 'add')}
                                onGiveaway={(variantId, val) => handleSingleAction(group.productId, variantId, { giveawayQty: val }, 'add')}
                                onProduce={(variantId, val) => handleSingleAction(group.productId, variantId, { producedQty: val }, 'add')}
                                onSend={(variantId, val) => handleSingleAction(group.productId, variantId, { toShopQty: val }, 'add')}
                                onWaste={(variantId, val) => handleSingleAction(group.productId, variantId, { wasteQty: val }, 'add')}
                                onBulkProduce={(productId) => handleGroupBulkAction(productId, 'produce')}
                                onBulkSend={(productId) => handleGroupBulkAction(productId, 'send')}
                                onBulkTarget={(productId) => handleGroupBulkAction(productId, 'target')}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <Package className="mx-auto text-gray-300 mb-4" size={56} />
                        <p className="text-gray-500 font-medium text-lg">ไม่พบสินค้า</p>
                        <p className="text-sm text-gray-400 mt-1">ลองค้นหาคำอื่น หรือเพิ่มสินค้าใหม่</p>
                    </div>
                )}
            </div>
        </div>
    );
};
