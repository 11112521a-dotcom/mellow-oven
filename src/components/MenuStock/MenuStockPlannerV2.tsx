import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/src/store';
import { MenuStockHeader } from './MenuStockHeader';
import { QuickActions } from './QuickActions';
import { InventoryCard } from './InventoryCard';
import { Package } from 'lucide-react';

export const MenuStockPlannerV2: React.FC = () => {
    // 1. Store & State
    const { products, dailyInventory, fetchDailyInventory, upsertDailyInventory, getYesterdayStock } = useStore();
    const [businessDate, setBusinessDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // 2. Fetch Data on Date Change
    useEffect(() => {
        fetchDailyInventory(businessDate);
        // Pre-fetch yesterday data for calculation
        const yesterday = new Date(businessDate);
        yesterday.setDate(yesterday.getDate() - 1);
        fetchDailyInventory(yesterday.toISOString().split('T')[0]);
    }, [businessDate, fetchDailyInventory]);

    // 3. Manual Refresh Handler
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchDailyInventory(businessDate);
        setTimeout(() => setIsRefreshing(false), 500);
    };

    // 4. Data Preparation (Zombie Filtering Included via products list)
    const inventoryItems = useMemo(() => {
        // Create a map of daily records for fast lookup
        const inventoryMap = new Map(
            dailyInventory
                .filter(d => d.businessDate === businessDate)
                .map(d => [`${d.productId}-${d.variantId || ''}`, d])
        );

        // Map active products to display items
        return products.flatMap(product => {
            // Filter zombie/deleted products implicitly by iterating over 'products' from store
            const baseItem = {
                id: product.id,
                name: product.name,
                category: product.category,
            };

            if (product.variants && product.variants.length > 0) {
                return product.variants.map(variant => {
                    const key = `${product.id}-${variant.id}`;
                    const saved = inventoryMap.get(key);
                    return {
                        ...baseItem,
                        id: key, // Unique Key for UI
                        productId: product.id,
                        variantId: variant.id,
                        name: `${product.name} (${variant.name})`,
                        isVariant: true,
                        savedRecord: saved || { producedQty: 0, toShopQty: 0, wasteQty: 0, soldQty: 0 },
                        stockYesterday: getYesterdayStock(product.id, businessDate, variant.id),
                        dailyTarget: (product as any).dailyTarget || 15 // Default target logic
                    };
                });
            } else {
                const key = `${product.id}-`;
                const saved = inventoryMap.get(key);
                return {
                    ...baseItem,
                    id: product.id, // Unique Key
                    productId: product.id,
                    variantId: undefined,
                    name: product.name,
                    isVariant: false,
                    savedRecord: saved || { producedQty: 0, toShopQty: 0, wasteQty: 0, soldQty: 0 },
                    stockYesterday: getYesterdayStock(product.id, businessDate),
                    dailyTarget: (product as any).dailyTarget || 15
                };
            }
        }).filter(item =>
            // Client-side Search Filter
            item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [products, dailyInventory, businessDate, searchQuery, getYesterdayStock]);

    // 5. Stats Calculation
    const stats = useMemo(() => {
        return inventoryItems.reduce((acc, item) => {
            const totalStock = item.stockYesterday + item.savedRecord.producedQty;
            return {
                totalStock: acc.totalStock + totalStock,
                produced: acc.produced + item.savedRecord.producedQty,
                sent: acc.sent + item.savedRecord.toShopQty,
                waste: acc.waste + item.savedRecord.wasteQty
            };
        }, { totalStock: 0, produced: 0, sent: 0, waste: 0 });
    }, [inventoryItems]);

    // 6. Action Handlers (Single Item) - 🛡️ DATA PRESERVATION LOGIC
    const handleSingleAction = async (
        item: typeof inventoryItems[0],
        updates: Partial<{ producedQty: number; toShopQty: number; wasteQty: number; soldQty: number }>,
        mode: 'add' | 'replace' = 'add'
    ) => {
        const saved = item.savedRecord;

        // Calculate new values based on mode
        const newProduced = updates.producedQty !== undefined
            ? (mode === 'add' ? saved.producedQty + updates.producedQty : updates.producedQty)
            : saved.producedQty;

        const newToShop = updates.toShopQty !== undefined
            ? (mode === 'add' ? saved.toShopQty + updates.toShopQty : updates.toShopQty)
            : saved.toShopQty;

        const newWaste = updates.wasteQty !== undefined
            ? (mode === 'add' ? saved.wasteQty + updates.wasteQty : updates.wasteQty)
            : saved.wasteQty;

        // 🛡️ CRITICAL: Always preserve fields that aren't being updated
        await upsertDailyInventory({
            businessDate,
            productId: item.productId,
            variantId: item.variantId || null,
            stockYesterday: item.stockYesterday,
            producedQty: newProduced,
            toShopQty: newToShop,
            wasteQty: newWaste,      // ✅ Preserved / Updated
            soldQty: saved.soldQty   // ✅ Always Preserved
        });
    };

    // 7. Bulk Action Handlers - 🛡️ ZOMBIE CHECK & SILENT FETCH
    const handleBulkAction = async (type: 'produce' | 'send' | 'target') => {
        const confirmMsg = type === 'produce' ? 'ยืนยันผลิตทั้งหมด?' : type === 'send' ? 'ยืนยันส่งทั้งหมด?' : 'ตั้งเป้าทั้งหมด?';
        if (!window.confirm(confirmMsg)) return;

        setIsRefreshing(true);
        try {
            // 🛡️ 1. Silent Fetch: Get latest data first
            await fetchDailyInventory(businessDate);

            // Re-calculate items based on fresh data (conceptually)
            // In React, we use the current 'inventoryItems' which will update after fetch, 
            // but for immediate action within this function, we iterate current list 
            // knowing 'upsert' acts on DB state.

            const promises = inventoryItems.map(item => {
                const saved = item.savedRecord;

                // 🛡️ 2. Zombie Check is implicit because 'inventoryItems' is derived from 'products' store
                // If a product was deleted, it won't be in 'inventoryItems', so loop won't run for it.

                let payload: any = {};

                if (type === 'produce') {
                    // Logic: Default bulk produce 15? Or use Target?
                    // For simplicity in V2, let's say "Fill to Target"
                    const waste = saved.wasteQty;
                    const currentStock = item.stockYesterday + saved.producedQty;
                    const actualStock = currentStock - waste;
                    const target = item.dailyTarget;
                    const needed = Math.max(0, target - actualStock);

                    if (needed <= 0) return Promise.resolve();

                    payload = {
                        producedQty: saved.producedQty + needed, // Add needed
                        toShopQty: saved.toShopQty,
                        wasteQty: saved.wasteQty,
                        soldQty: saved.soldQty
                    };
                } else if (type === 'send') {
                    // Logic: Send All Available
                    const totalStock = item.stockYesterday + saved.producedQty;
                    const available = Math.max(0, totalStock - saved.toShopQty - saved.wasteQty);

                    if (available <= 0) return Promise.resolve();

                    payload = {
                        producedQty: saved.producedQty,
                        toShopQty: saved.toShopQty + available, // Add available
                        wasteQty: saved.wasteQty,
                        soldQty: saved.soldQty
                    };
                } else if (type === 'target') {
                    // Just a placeholder if we had a "Set Target" API
                    return Promise.resolve();
                }

                return upsertDailyInventory({
                    businessDate,
                    productId: item.productId,
                    variantId: item.variantId || null,
                    stockYesterday: item.stockYesterday,
                    ...payload
                });
            });

            await Promise.all(promises);
            await fetchDailyInventory(businessDate); // Final Refresh
            // alert('ทำรายการสำเร็จ!');
        } catch (error) {
            console.error(error);
            alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-20 px-4 md:px-6 space-y-6">
            {/* Header */}
            <MenuStockHeader
                date={businessDate}
                onDateChange={setBusinessDate}
                onRefresh={handleRefresh}
                stats={stats}
            />

            {/* Quick Actions */}
            <QuickActions
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onBulkTarget={() => handleBulkAction('produce')} // Reused for Fill-to-Target
                onBulkProduce={() => handleBulkAction('produce')}
                onBulkSend={() => handleBulkAction('send')}
            />

            {/* Loading State */}
            {isRefreshing && (
                <div className="text-center py-4 text-cafe-500 animate-pulse">
                    กำลังอัปเดตข้อมูล...
                </div>
            )}

            {/* Content Grid/List */}
            {inventoryItems.length > 0 ? (
                <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
                    {inventoryItems.map(item => (
                        <InventoryCard
                            key={item.id}
                            item={item}
                            stockYesterday={item.stockYesterday}
                            savedRecord={item.savedRecord}
                            dailyTarget={item.dailyTarget}
                            onProduce={(val) => handleSingleAction(item, { producedQty: val }, 'add')}
                            onSend={(val) => handleSingleAction(item, { toShopQty: val }, 'add')}
                            onWaste={(val) => handleSingleAction(item, { wasteQty: val }, 'add')}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Package className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">ไม่พบสินค้า</p>
                    <p className="text-sm text-gray-400">ลองค้นหาคำอื่น หรือเพิ่มสินค้าใหม่</p>
                </div>
            )}
        </div>
    );
};
