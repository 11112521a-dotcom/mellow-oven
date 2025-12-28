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
    }
});
