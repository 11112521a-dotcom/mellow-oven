import { StateCreator } from 'zustand';
import { AppState, InventorySlice } from '../types';
import { supabase } from '../../lib/supabase';
import { mapDailyInventory } from '../helpers/mappers';
import { Ingredient } from '../../../types';

export const createInventorySlice: StateCreator<AppState, [], [], InventorySlice> = (set, get) => ({
    ingredients: [],
    purchaseOrders: [],
    stockLogs: [],
    dailyInventory: [],

    addIngredient: async (ingredient) => {
        const dbIngredient = {
            name: ingredient.name,
            unit: ingredient.unit,
            current_stock: ingredient.currentStock,
            cost_per_unit: ingredient.costPerUnit,
            supplier: ingredient.supplier,
            buy_unit: ingredient.buyUnit,
            conversion_rate: ingredient.conversionRate,
            min_stock: ingredient.minStock,
            is_hidden: ingredient.isHidden
        };

        const { data, error } = await supabase.from('ingredients').insert(dbIngredient).select().single();
        if (error) throw new Error(error.message);

        const newIngredient: Ingredient = {
            ...ingredient,
            id: data.id,
            lastUpdated: data.created_at || new Date().toISOString()
        };
        set((state) => ({ ingredients: [newIngredient, ...state.ingredients] }));
    },

    updateStock: async (id, quantity, reason = 'USAGE', note = '') => {
        const { ingredients, addStockLog } = get();
        const ingredient = ingredients.find(i => i.id === id);
        if (ingredient) {
            const newStock = Number(ingredient.currentStock) + Number(quantity);
            const { error } = await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', id);
            if (!error) {
                set((state) => ({
                    ingredients: state.ingredients.map((ing) => ing.id === id ? { ...ing, currentStock: newStock } : ing)
                }));
                addStockLog({
                    id: crypto.randomUUID(),
                    date: new Date().toISOString(),
                    ingredientId: id,
                    amount: quantity,
                    reason,
                    note
                });
                get().generateAlerts();
            }
        }
    },

    setIngredientStock: async (id, quantity) => {
        const { error } = await supabase.from('ingredients').update({ current_stock: quantity }).eq('id', id);
        if (!error) {
            set((state) => ({
                ingredients: state.ingredients.map((ing) => ing.id === id ? { ...ing, currentStock: quantity } : ing)
            }));
        }
    },

    updateIngredient: async (id, updates) => {
        // Map camelCase to snake_case for DB
        const dbUpdates: Record<string, unknown> = {};
        if (updates.currentStock !== undefined) dbUpdates.current_stock = updates.currentStock;
        if (updates.costPerUnit !== undefined) dbUpdates.cost_per_unit = updates.costPerUnit;
        if (updates.conversionRate !== undefined) dbUpdates.conversion_rate = updates.conversionRate;
        if (updates.buyUnit !== undefined) dbUpdates.buy_unit = updates.buyUnit;
        if (updates.minStock !== undefined) dbUpdates.min_stock = updates.minStock;
        if (updates.isHidden !== undefined) dbUpdates.is_hidden = updates.isHidden;

        const { error } = await supabase.from('ingredients').update(dbUpdates).eq('id', id);
        if (!error) {
            set((state) => ({
                ingredients: state.ingredients.map((ing) => ing.id === id ? { ...ing, ...updates } : ing)
            }));
        }
    },

    removeIngredient: async (id) => {
        const { error } = await supabase.from('ingredients').delete().eq('id', id);
        if (!error) {
            set((state) => ({
                ingredients: state.ingredients.filter((ing) => ing.id !== id)
            }));
        }
    },

    createPurchaseOrder: (po) => set((state) => ({ purchaseOrders: [...state.purchaseOrders, po] })),

    cancelPurchaseOrder: async (poId) => {
        const state = get();
        const po = state.purchaseOrders.find(p => p.id === poId);
        if (!po || po.status === 'CANCELLED') return;

        // Refund logic
        get().updateJarBalance('Working', po.totalCost);
        for (const item of po.items) {
            await get().updateStock(item.ingredientId, -item.quantity);
        }
        get().addTransaction({
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            amount: po.totalCost,
            type: 'INCOME',
            toJar: 'Working',
            description: `🔄 PO Cancelled - Refund (PO: ${poId.slice(0, 8)})`,
            category: 'COGS',
            marketId: undefined
        });
        get().updatePurchaseOrderStatus(poId, 'CANCELLED');
    },

    updatePurchaseOrderStatus: (poId, status) => {
        set((state) => ({
            purchaseOrders: state.purchaseOrders.map(po => po.id === poId ? { ...po, status } : po)
        }));
    },

    addStockLog: async (log) => {
        const dbLog = {
            id: log.id,
            date: log.date,
            ingredient_id: log.ingredientId,
            amount: log.amount,
            reason: log.reason,
            note: log.note
        };
        const { error } = await supabase.from('stock_logs').insert(dbLog);
        if (!error) {
            set(state => ({ stockLogs: [log, ...state.stockLogs] }));
        }
    },

    fetchDailyInventory: async (date) => {
        const pastDate = new Date(date);
        pastDate.setDate(pastDate.getDate() - 7);
        const pastDateStr = pastDate.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('daily_inventory')
            .select('*')
            .lte('business_date', date)
            .gte('business_date', pastDateStr);

        if (!error && data) {
            const mapped = data.map(mapDailyInventory);
            set(state => {
                const existingOutsideRange = state.dailyInventory.filter(d =>
                    d.businessDate > date || d.businessDate < pastDateStr
                );
                return { dailyInventory: [...existingOutsideRange, ...mapped] };
            });
        }
    },

    // NEW: Fetch specific range for reports
    fetchInventoryByDateRange: async (startDate: string, endDate: string) => {
        const { data, error } = await supabase
            .from('daily_inventory')
            .select('*')
            .gte('business_date', startDate)
            .lte('business_date', endDate)
            .order('business_date', { ascending: true }); // Ensure ordered by date

        if (!error && data) {
            const mapped = data.map(mapDailyInventory);
            set(state => {
                // Remove existing records in this range to avoid duplicates before merging
                const existingOutsideRange = state.dailyInventory.filter(d =>
                    d.businessDate < startDate || d.businessDate > endDate
                );
                return { dailyInventory: [...existingOutsideRange, ...mapped] };
            });
        }
    },

    // 🔥 HOTFIXED: Upsert with Waste Preservation & Immutable History
    upsertDailyInventory: async (record) => {
        const stockYesterday = record.stockYesterday ?? 0;
        const produced = record.producedQty ?? 0;
        const toShop = record.toShopQty ?? 0;
        const sold = record.soldQty ?? 0;
        const waste = record.wasteQty ?? 0;

        const leftoverHome = stockYesterday + produced - toShop - waste;
        const unsoldShop = toShop - sold;

        const dbRecord: Record<string, unknown> = {
            business_date: record.businessDate,
            product_id: record.productId,
            produced_qty: produced,
            to_shop_qty: toShop,
            sold_qty: sold,
            waste_qty: waste,
            stock_yesterday: stockYesterday,
            leftover_home: leftoverHome,
            unsold_shop: unsoldShop
        };

        if (record.variantId) dbRecord.variant_id = record.variantId;
        if (record.variantName) dbRecord.variant_name = record.variantName;

        // Check existence
        let query = supabase.from('daily_inventory').select('id').eq('business_date', record.businessDate).eq('product_id', record.productId);
        if (record.variantId) query = query.eq('variant_id', record.variantId);
        else query = query.is('variant_id', null);

        const { data: existingData } = await query.single();
        let resultData;

        if (existingData?.id) {
            // Update: Immutable History Fix
            const updateRecord = { ...dbRecord };
            delete updateRecord.stock_yesterday; // Never overwrite historical snapshot
            const { data } = await supabase.from('daily_inventory').update(updateRecord).eq('id', existingData.id).select().single();
            resultData = data;
        } else {
            // Insert
            const { data } = await supabase.from('daily_inventory').insert(dbRecord).select().single();
            resultData = data;
        }

        if (resultData) {
            const newRecord = mapDailyInventory(resultData);
            set(state => {
                const index = state.dailyInventory.findIndex(d =>
                    d.businessDate === record.businessDate &&
                    d.productId === record.productId &&
                    d.variantId === record.variantId
                );
                if (index >= 0) {
                    const updated = [...state.dailyInventory];
                    updated[index] = newRecord;
                    return { dailyInventory: updated };
                }
                return { dailyInventory: [...state.dailyInventory, newRecord] };
            });
        }
    },

    getYesterdayStock: (productId, todayDate, variantId) => {
        const state = get();
        const relevantRecords = state.dailyInventory.filter(
            d => d.businessDate < todayDate &&
                d.productId === productId &&
                (d.variantId || '') === (variantId || '')
        );

        if (relevantRecords.length === 0) return 0;
        relevantRecords.sort((a, b) => b.businessDate.localeCompare(a.businessDate));
        const lastRecord = relevantRecords[0];
        return (lastRecord.leftoverHome ?? 0) + (lastRecord.unsoldShop ?? 0);
    },

    deductStockByRecipe: (productId, quantity, variantId) => {
        const { products, updateStock } = get();
        const product = products.find(p => p.id === productId);
        if (!product) return;

        let recipe = product.recipe;
        if (variantId && product.variants) {
            const variant = product.variants.find(v => v.id === variantId);
            if (variant?.recipe) recipe = variant.recipe;
        }

        if (recipe) {
            const factor = quantity / recipe.yield;
            recipe.items.forEach(item => {
                updateStock(item.ingredientId, -item.quantity * factor);
            });
        }
    },

    // NEW: Deduct stock for Bundle orders (handles selectedOptions)
    deductStockForBundleOrder: async (orderId) => {
        const { specialOrders, products, deductStockByRecipe } = get();
        const order = specialOrders.find(o => o.id === orderId);

        if (!order || order.stockDeducted) {
            console.log('[deductStockForBundleOrder] Order not found or already deducted:', orderId);
            return;
        }

        console.log('[deductStockForBundleOrder] Processing order:', order.orderNumber);

        for (const item of order.items) {
            const product = products.find(p => p.id === item.productId);
            if (!product) continue;

            // CASE 1: Bundle Product - deduct each selected option
            if (product.bundleConfig?.isBundle && item.selectedOptions) {
                console.log('[deductStockForBundleOrder] Bundle item detected:', product.name);

                // Deduct for each slot selection
                Object.keys(item.selectedOptions).forEach(slotId => {
                    const selection = (item.selectedOptions as Record<string, { productId: string; productName: string; unitCost: number; surcharge: number }>)[slotId];
                    if (selection?.productId) {
                        console.log(`  - Deducting ${item.quantity}x ${selection.productName}`);
                        deductStockByRecipe(selection.productId, item.quantity);
                    }
                });

                // Also deduct packaging if product has recipe (the box itself)
                if (product.recipe) {
                    console.log(`  - Deducting packaging: ${product.name}`);
                    deductStockByRecipe(product.id, item.quantity);
                }
            }
            // CASE 2: Regular Product - deduct by recipe
            else {
                console.log('[deductStockForBundleOrder] Regular item:', product.name);
                deductStockByRecipe(item.productId, item.quantity, item.variantId);
            }
        }

        // Mark as deducted
        const { error } = await supabase
            .from('special_orders')
            .update({
                stock_deducted: true,
                stock_deducted_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (!error) {
            set(state => ({
                specialOrders: state.specialOrders.map(o =>
                    o.id === orderId
                        ? { ...o, stockDeducted: true, stockDeductedAt: new Date().toISOString() }
                        : o
                )
            }));
        }
    },

    // ============================================================
    // 🔥 PHASE 2: Bulk Stock Adjustment
    // Rule #4: Batch Operations - NO loop API calls
    // ============================================================
    /**
     * Adjust multiple ingredients' stock in a single batch operation
     * @param adjustments - Array of { ingredientId, quantity, reason?, note? }
     * @returns Promise<{ success: boolean, errors: string[] }>
     */
    bulkAdjustStock: async (adjustments: Array<{
        ingredientId: string;
        quantity: number;
        reason?: 'PO' | 'USAGE' | 'WASTE' | 'SPILLAGE' | 'CORRECTION';
        note?: string;
    }>) => {
        const { ingredients, addStockLog, generateAlerts } = get();
        const errors: string[] = [];
        const updates: Array<{ id: string; newStock: number }> = [];
        const logs: Array<{
            id: string;
            date: string;
            ingredientId: string;
            amount: number;
            reason: 'PO' | 'USAGE' | 'WASTE' | 'SPILLAGE' | 'CORRECTION';
            note: string;
        }> = [];

        // Validate and prepare updates
        for (const adj of adjustments) {
            const ingredient = ingredients.find(i => i.id === adj.ingredientId);
            if (!ingredient) {
                errors.push(`ไม่พบวัตถุดิบ ID: ${adj.ingredientId}`);
                continue;
            }

            const newStock = Number(ingredient.currentStock) + Number(adj.quantity);
            if (newStock < 0) {
                errors.push(`${ingredient.name}: สต็อกไม่เพียงพอ (เหลือ ${ingredient.currentStock})`);
                continue;
            }

            updates.push({ id: adj.ingredientId, newStock });
            logs.push({
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                ingredientId: adj.ingredientId,
                amount: adj.quantity,
                reason: adj.reason || 'CORRECTION',
                note: adj.note || 'Bulk adjustment'
            });
        }

        if (updates.length === 0) {
            return { success: false, errors, updatedCount: 0 };
        }

        // Execute batch update
        // Note: Supabase doesn't support true batch UPDATE, so we use Promise.all
        // but with proper error handling per item
        const results = await Promise.all(
            updates.map(async (upd) => {
                const { error } = await supabase
                    .from('ingredients')
                    .update({ current_stock: upd.newStock })
                    .eq('id', upd.id);
                return { id: upd.id, error };
            })
        );

        // Check for DB errors
        const dbErrors = results.filter(r => r.error);
        if (dbErrors.length > 0) {
            errors.push(...dbErrors.map(e => `DB Error: ${e.error?.message || 'Unknown'}`));
        }

        // Update local state for successful ones
        const successIds = results.filter(r => !r.error).map(r => r.id);
        const successUpdates = updates.filter(u => successIds.includes(u.id));

        if (successUpdates.length > 0) {
            set(state => ({
                ingredients: state.ingredients.map(ing => {
                    const upd = successUpdates.find(u => u.id === ing.id);
                    return upd ? { ...ing, currentStock: upd.newStock } : ing;
                })
            }));

            // Add stock logs for successful updates
            const successLogs = logs.filter(l => successIds.includes(l.ingredientId));
            for (const log of successLogs) {
                await addStockLog(log);
            }

            // Regenerate alerts
            generateAlerts();
        }

        return {
            success: errors.length === 0,
            errors,
            updatedCount: successUpdates.length
        };
    }
});
