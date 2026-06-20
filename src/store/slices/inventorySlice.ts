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
            is_hidden: ingredient.isHidden,
            category: ingredient.category || 'อื่นๆ'
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
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
        if (updates.supplier !== undefined) dbUpdates.supplier = updates.supplier;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
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
        if (po.items.length > 0) {
            const adjustments = po.items.map(item => ({
                ingredientId: item.ingredientId,
                quantity: -item.quantity,
                reason: 'PO' as const,
                note: `Refund from cancelled PO: ${poId.slice(0, 8)}`
            }));
            const res = await get().bulkAdjustStock(adjustments);
            if (!res.success) {
                throw new Error(`Failed to refund PO stock: ${res.errors.join(', ')}`);
            }
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
        // 🗑️ DISABLED: Stock logs disabled to save database space
        // const dbLog = {
        //     id: log.id,
        //     date: log.date,
        //     ingredient_id: log.ingredientId,
        //     amount: log.amount,
        //     reason: log.reason,
        //     note: log.note
        // };
        // const { error } = await supabase.from('stock_logs').insert(dbLog);

        // Keep local state update for current session only (not persisted)
        set(state => ({ stockLogs: [log, ...state.stockLogs] }));
    },

    fetchDailyInventory: async (date) => {
        const pastDate = new Date(date);
        pastDate.setDate(pastDate.getDate() - 7);
        const pastDateStr = pastDate.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('daily_inventory')
            .select('*')
            .lte('business_date', date)
            .gte('business_date', pastDateStr)
            .order('created_at', { ascending: false }); // 🛡️ FIX: Always get newest first to prevent ghost data

        if (!error && data) {
            const mapped = data.map(mapDailyInventory);
            
            // 🛡️ DEDUPLICATE: Prevent race-condition duplicates from breaking the UI
            const uniqueMapped = Array.from(mapped.reduce((acc, curr) => {
                const key = `${curr.businessDate}-${curr.productId}-${curr.variantId || 'null'}-${curr.marketId || 'null'}`;
                if (!acc.has(key)) acc.set(key, curr); // Keep the first (newest) one
                return acc;
            }, new Map()).values());

            set(state => {
                const existingOutsideRange = state.dailyInventory.filter(d =>
                    d.businessDate > date || d.businessDate < pastDateStr
                );
                return { dailyInventory: [...existingOutsideRange, ...uniqueMapped] };
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
            .order('business_date', { ascending: true }) // Ensure ordered by date
            .order('created_at', { ascending: false }); // 🛡️ FIX: Put newest duplicate first

        if (!error && data) {
            const mapped = data.map(mapDailyInventory);
            
            // 🛡️ DEDUPLICATE: Prevent race-condition duplicates from breaking the UI
            const uniqueMapped = Array.from(mapped.reduce((acc, curr) => {
                const key = `${curr.businessDate}-${curr.productId}-${curr.variantId || 'null'}-${curr.marketId || 'null'}`;
                if (!acc.has(key)) acc.set(key, curr); // Keep the first (newest) one
                return acc;
            }, new Map()).values());

            set(state => {
                // Remove existing records in this range to avoid duplicates before merging
                const existingOutsideRange = state.dailyInventory.filter(d =>
                    d.businessDate < startDate || d.businessDate > endDate
                );
                return { dailyInventory: [...existingOutsideRange, ...uniqueMapped] };
            });
        }
    },

    // 🔥 HOTFIXED: Upsert with Decoupled Home/Market pools
    upsertDailyInventory: async (record) => {
        // Check existence
        let query = supabase.from('daily_inventory').select('*').eq('business_date', record.businessDate).eq('product_id', record.productId);
        if (record.variantId) query = query.eq('variant_id', record.variantId);
        else query = query.is('variant_id', null);
        
        if (record.marketId) query = query.eq('market_id', record.marketId);
        else query = query.is('market_id', null);

        // 🛡️ FIX: Use .limit(1) instead of .single() to gracefully handle race-condition duplicates in DB
        const { data: existingRecords } = await query.order('created_at', { ascending: false }).limit(1);
        const existingData = existingRecords?.[0];

        // 🛡️ Decouple Home and Market pool calculation
        const isMarket = !!record.marketId;
        const stockYesterday = isMarket ? 0 : (record.stockYesterday ?? existingData?.stock_yesterday ?? 0);
        const produced = isMarket ? 0 : (record.producedQty ?? existingData?.produced_qty ?? 0);
        const toShop = record.toShopQty ?? existingData?.to_shop_qty ?? 0;
        const sold = record.soldQty ?? existingData?.sold_qty ?? 0;
        const waste = record.wasteQty ?? existingData?.waste_qty ?? 0;
        const eat = record.eatQty ?? existingData?.eat_qty ?? 0; 
        const giveaway = record.giveawayQty ?? existingData?.giveaway_qty ?? 0; 

        let leftoverHome = 0;
        let unsoldShop = 0;

        if (isMarket) {
            unsoldShop = Math.max(0, toShop - sold - waste - eat - giveaway);
        } else {
            // Find total transfers across all markets
            const state = get();
            const totalTransfers = state.dailyInventory
                .filter(d => 
                    d.businessDate === record.businessDate && 
                    d.productId === record.productId && 
                    ((!d.variantId && !record.variantId) || d.variantId === record.variantId) &&
                    !!d.marketId
                )
                .reduce((sum, d) => sum + (d.toShopQty || 0), 0);
            leftoverHome = stockYesterday + produced - totalTransfers - waste - eat - giveaway;
        }

        const dbRecord: Record<string, unknown> = {
            business_date: record.businessDate,
            product_id: record.productId,
            produced_qty: produced,
            to_shop_qty: toShop,
            sold_qty: sold,
            waste_qty: waste,
            eat_qty: eat,
            giveaway_qty: giveaway,
            stock_yesterday: stockYesterday,
            leftover_home: leftoverHome,
            unsold_shop: unsoldShop
        };

        if (record.marketId) dbRecord.market_id = record.marketId;

        if (record.variantId) dbRecord.variant_id = record.variantId;
        if (record.variantName) dbRecord.variant_name = record.variantName;
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

        // 🛡️ Auto Recalculate Home leftover if updating market record
        if (isMarket) {
            let homeQuery = supabase
                .from('daily_inventory')
                .select('*')
                .eq('business_date', record.businessDate)
                .eq('product_id', record.productId)
                .is('market_id', null);
            
            if (record.variantId) homeQuery = homeQuery.eq('variant_id', record.variantId);
            else homeQuery = homeQuery.is('variant_id', null);

            const { data: homeRecords } = await homeQuery.limit(1);
            
            const homeData = homeRecords?.[0];
            if (homeData) {
                let marketQuery = supabase
                    .from('daily_inventory')
                    .select('to_shop_qty')
                    .eq('business_date', record.businessDate)
                    .eq('product_id', record.productId)
                    .not('market_id', 'is', null);
                
                if (record.variantId) marketQuery = marketQuery.eq('variant_id', record.variantId);
                else marketQuery = marketQuery.is('variant_id', null);

                const { data: marketRecords } = await marketQuery;
                
                const totalTransfers = marketRecords?.reduce((sum, m) => sum + (m.to_shop_qty || 0), 0) || 0;
                const hStockYesterday = homeData.stock_yesterday || 0;
                const hProduced = homeData.produced_qty || 0;
                const hWaste = homeData.waste_qty || 0;
                const hEat = homeData.eat_qty || 0;
                const hGiveaway = homeData.giveaway_qty || 0;
                const newLeftoverHome = hStockYesterday + hProduced - totalTransfers - hWaste - hEat - hGiveaway;
                
                const { data: updatedHome } = await supabase
                    .from('daily_inventory')
                    .update({ leftover_home: newLeftoverHome })
                    .eq('id', homeData.id)
                    .select()
                    .single();

                if (updatedHome) {
                    const mappedHome = mapDailyInventory(updatedHome);
                    set(state => {
                        const index = state.dailyInventory.findIndex(d => d.id === mappedHome.id);
                        if (index >= 0) {
                            const updated = [...state.dailyInventory];
                            updated[index] = mappedHome;
                            return { dailyInventory: updated };
                        }
                        return { dailyInventory: [...state.dailyInventory, mappedHome] };
                    });
                }
            }
        }

        if (resultData) {
            const newRecord = mapDailyInventory(resultData);
            set(state => {
                const index = state.dailyInventory.findIndex(d =>
                    d.businessDate === record.businessDate &&
                    d.productId === record.productId &&
                    d.variantId === record.variantId &&
                    d.marketId === record.marketId
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

    bulkUpsertDailyInventory: async (records) => {
        if (records.length === 0) return;

        const uniqueDates = Array.from(new Set(records.map(r => r.businessDate)));
        const uniqueProductIds = Array.from(new Set(records.map(r => r.productId)));

        const { data: existingRows, error: fetchError } = await supabase
            .from('daily_inventory')
            .select('*')
            .in('business_date', uniqueDates)
            .in('product_id', uniqueProductIds);

        if (fetchError) {
            throw new Error(`Failed to fetch existing daily inventory: ${fetchError.message}`);
        }

        const inserts: Record<string, unknown>[] = [];
        const updates: Array<{ id: string; fields: Record<string, unknown> }> = [];
        const homeRecalculateKeys = new Set<string>();

        for (const record of records) {
            const matches = existingRows?.filter(row =>
                row.business_date === record.businessDate &&
                row.product_id === record.productId &&
                ((!row.variant_id && !record.variantId) || (row.variant_id === record.variantId)) &&
                ((!row.market_id && !record.marketId) || (row.market_id === record.marketId))
            ) || [];

            if (matches.length > 1) {
                matches.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
            }
            const existingData = matches[0];

            const isMarket = !!record.marketId;
            const stockYesterday = isMarket ? 0 : (record.stockYesterday ?? existingData?.stock_yesterday ?? 0);
            const produced = isMarket ? 0 : (record.producedQty ?? existingData?.produced_qty ?? 0);
            const toShop = record.toShopQty ?? existingData?.to_shop_qty ?? 0;
            const sold = record.soldQty ?? existingData?.sold_qty ?? 0;
            const waste = record.wasteQty ?? existingData?.waste_qty ?? 0;
            const eat = record.eatQty ?? existingData?.eat_qty ?? 0; 
            const giveaway = record.giveawayQty ?? existingData?.giveaway_qty ?? 0; 

            let leftoverHome = 0;
            let unsoldShop = 0;

            if (isMarket) {
                unsoldShop = Math.max(0, toShop - sold - waste - eat - giveaway);
                const key = `${record.businessDate}_${record.productId}_${record.variantId || 'null'}`;
                homeRecalculateKeys.add(key);
            } else {
                // Find total transfers across all markets
                const state = get();
                const totalTransfers = state.dailyInventory
                    .filter(d => 
                        d.businessDate === record.businessDate && 
                        d.productId === record.productId && 
                        ((!d.variantId && !record.variantId) || d.variantId === record.variantId) &&
                        !!d.marketId
                    )
                    .reduce((sum, d) => sum + (d.toShopQty || 0), 0);
                leftoverHome = stockYesterday + produced - totalTransfers - waste - eat - giveaway;
            }

            const dbRecord: Record<string, unknown> = {
                business_date: record.businessDate,
                product_id: record.productId,
                variant_id: record.variantId || null,
                variant_name: record.variantName || null,
                market_id: record.marketId || null,
                produced_qty: produced,
                to_shop_qty: toShop,
                sold_qty: sold,
                waste_qty: waste,
                eat_qty: eat,
                giveaway_qty: giveaway,
                stock_yesterday: stockYesterday,
                leftover_home: leftoverHome,
                unsold_shop: unsoldShop
            };

            if (existingData?.id) {
                const updateFields = { ...dbRecord };
                delete updateFields.stock_yesterday;
                updates.push({ id: existingData.id, fields: updateFields });
            } else {
                inserts.push(dbRecord);
            }
        }

        const results: any[] = [];

        if (inserts.length > 0) {
            const { data, error } = await supabase
                .from('daily_inventory')
                .insert(inserts)
                .select();
            if (error) {
                throw new Error(`Failed to batch insert daily inventory: ${error.message}`);
            }
            if (data) {
                results.push(...data);
            }
        }

        if (updates.length > 0) {
            const updateResults = await Promise.all(
                updates.map(async (upd) => {
                    const { data, error } = await supabase
                        .from('daily_inventory')
                        .update(upd.fields)
                        .eq('id', upd.id)
                        .select()
                        .single();
                    return { data, error };
                })
            );

            for (const res of updateResults) {
                if (res.error) {
                    throw new Error(`Failed to update daily inventory: ${res.error.message}`);
                }
                if (res.data) {
                    results.push(res.data);
                }
            }
        }

        // 🛡️ Auto Recalculate Home leftovers in bulk
        if (homeRecalculateKeys.size > 0) {
            await Promise.all(
                Array.from(homeRecalculateKeys).map(async (key) => {
                    const [bDate, prodId, varIdStr] = key.split('_');
                    const varId = varIdStr === 'null' ? null : varIdStr;
                    
                    let homeQuery = supabase
                        .from('daily_inventory')
                        .select('*')
                        .eq('business_date', bDate)
                        .eq('product_id', prodId)
                        .is('market_id', null);
                    
                    if (varId) homeQuery = homeQuery.eq('variant_id', varId);
                    else homeQuery = homeQuery.is('variant_id', null);

                    const { data: homeRecords } = await homeQuery.limit(1);
                    
                    const homeData = homeRecords?.[0];
                    if (homeData) {
                        let marketQuery = supabase
                            .from('daily_inventory')
                            .select('to_shop_qty')
                            .eq('business_date', bDate)
                            .eq('product_id', prodId)
                            .not('market_id', 'is', null);
                        
                        if (varId) marketQuery = marketQuery.eq('variant_id', varId);
                        else marketQuery = marketQuery.is('variant_id', null);

                        const { data: marketRecords } = await marketQuery;
                        
                        const totalTransfers = marketRecords?.reduce((sum, m) => sum + (m.to_shop_qty || 0), 0) || 0;
                        const hStockYesterday = homeData.stock_yesterday || 0;
                        const hProduced = homeData.produced_qty || 0;
                        const hWaste = homeData.waste_qty || 0;
                        const hEat = homeData.eat_qty || 0;
                        const hGiveaway = homeData.giveaway_qty || 0;
                        const newLeftoverHome = hStockYesterday + hProduced - totalTransfers - hWaste - hEat - hGiveaway;
                        
                        const { data: updatedHome } = await supabase
                            .from('daily_inventory')
                            .update({ leftover_home: newLeftoverHome })
                            .eq('id', homeData.id)
                            .select()
                            .single();
                        
                        if (updatedHome) {
                            const mappedHome = mapDailyInventory(updatedHome);
                            set(state => {
                                const index = state.dailyInventory.findIndex(d => d.id === mappedHome.id);
                                if (index >= 0) {
                                    const updated = [...state.dailyInventory];
                                    updated[index] = mappedHome;
                                    return { dailyInventory: updated };
                                }
                                return { dailyInventory: [...state.dailyInventory, mappedHome] };
                            });
                        }
                    }
                })
            );
        }

        if (results.length > 0) {
            const mappedRecords = results.map(mapDailyInventory);
            set(state => {
                const updatedInventory = [...state.dailyInventory];
                for (const newRecord of mappedRecords) {
                    const index = updatedInventory.findIndex(d =>
                        d.businessDate === newRecord.businessDate &&
                        d.productId === newRecord.productId &&
                        ((!d.variantId && !newRecord.variantId) || d.variantId === newRecord.variantId) &&
                        ((!d.marketId && !newRecord.marketId) || d.marketId === newRecord.marketId)
                    );
                    if (index >= 0) {
                        updatedInventory[index] = newRecord;
                    } else {
                        updatedInventory.push(newRecord);
                    }
                }
                return { dailyInventory: updatedInventory };
            });
        }
    },

    getYesterdayStock: (productId, todayDate, variantId) => {
        const state = get();
        const pastRecords = state.dailyInventory.filter(
            d => d.businessDate < todayDate &&
                d.productId === productId &&
                ((!d.variantId && !variantId) || d.variantId === variantId)
        );

        if (pastRecords.length === 0) return 0;
        
        // Find the most recent date before today
        pastRecords.sort((a, b) => b.businessDate.localeCompare(a.businessDate));
        const latestDate = pastRecords[0].businessDate;
        
        const latestDayRecords = pastRecords.filter(d => d.businessDate === latestDate);

        // Sum all attributes across Home and Market records for robust backward compatibility
        const initial = latestDayRecords.find(d => !d.marketId)?.stockYesterday ?? latestDayRecords[0]?.stockYesterday ?? 0;
        const produced = latestDayRecords.reduce((sum, d) => sum + (d.producedQty || 0), 0);
        const waste = latestDayRecords.reduce((sum, d) => sum + (d.wasteQty || 0), 0);
        const eat = latestDayRecords.reduce((sum, d) => sum + (d.eatQty || 0), 0);
        const giveaway = latestDayRecords.reduce((sum, d) => sum + (d.giveawayQty || 0), 0);
        const totalSold = latestDayRecords.reduce((sum, d) => sum + (d.soldQty || 0), 0);

        // Total Available Today = Leftover Home + Unsold Shop
        // Leftover Home = initial + produced - totalToShop - waste - eat - giveaway
        // Unsold Shop = totalToShop - totalSold
        // Math matches: initial + produced - waste - eat - giveaway - totalSold
        return Math.max(0, initial + produced - waste - eat - giveaway - totalSold);
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

    bulkDeductStockByRecipes: async (deductions) => {
        const { products, bulkAdjustStock } = get();
        const adjustmentsMap = new Map<string, number>();

        for (const dec of deductions) {
            const product = products.find(p => p.id === dec.productId);
            if (!product) continue;

            let recipe = product.recipe;
            if (dec.variantId && product.variants) {
                const variant = product.variants.find(v => v.id === dec.variantId);
                if (variant?.recipe) recipe = variant.recipe;
            }

            if (recipe) {
                const factor = dec.quantity / recipe.yield;
                recipe.items.forEach(item => {
                    const currentAmount = adjustmentsMap.get(item.ingredientId) || 0;
                    adjustmentsMap.set(item.ingredientId, currentAmount - (item.quantity * factor));
                });
            }
        }

        if (adjustmentsMap.size === 0) {
            return { success: true, errors: [], updatedCount: 0 };
        }

        const adjustments = Array.from(adjustmentsMap.entries()).map(([ingredientId, qty]) => ({
            ingredientId,
            quantity: qty,
            reason: 'USAGE' as const,
            note: 'Deducted by recipe (bulk)'
        }));

        return await bulkAdjustStock(adjustments);
    },

    // NEW: Deduct stock for Bundle orders (handles selectedOptions)
    deductStockForBundleOrder: async (orderId) => {
        const { specialOrders, products } = get();
        const order = specialOrders.find(o => o.id === orderId);

        if (!order || order.stockDeducted) {
            return;
        }

        const recipeDeductions: Array<{ productId: string; quantity: number; variantId?: string }> = [];

        for (const item of order.items) {
            const product = products.find(p => p.id === item.productId);
            if (!product) continue;

            // CASE 1: Bundle Product - deduct each selected option
            if (product.bundleConfig?.isBundle && item.selectedOptions) {
                // Deduct for each slot selection
                Object.keys(item.selectedOptions).forEach(slotId => {
                    const selection = (item.selectedOptions as Record<string, { productId: string; productName: string; unitCost: number; surcharge: number }>)[slotId];
                    if (selection?.productId) {
                        recipeDeductions.push({ productId: selection.productId, quantity: item.quantity });
                    }
                });

                // Also deduct packaging if product has recipe (the box itself)
                if (product.recipe) {
                    recipeDeductions.push({ productId: product.id, quantity: item.quantity });
                }
            }
            // CASE 2: Regular Product - deduct by recipe
            else {
                recipeDeductions.push({ productId: item.productId, quantity: item.quantity, variantId: item.variantId });
            }
        }

        if (recipeDeductions.length > 0) {
            const res = await get().bulkDeductStockByRecipes(recipeDeductions);
            if (!res.success) {
                throw new Error(`Failed to deduct stock for bundle order: ${res.errors.join(', ')}`);
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
    },

    saveDailyMarketSales: async ({
        date,
        marketId,
        marketName,
        weatherCondition,
        logs,
        totalRevenue,
        totalCOGS,
        totalWasteCost,
        trueProfit
    }) => {
        const { dailyInventory, bulkUpsertDailyInventory, bulkDeductStockByRecipes, addUnallocatedProfit, addTransaction, fetchData, fetchDailyInventory } = get();

        // 🛡️ 1. ป้องกันข้อมูลเบิ้ล: ลบข้อมูลประวัติเก่าของวันนี้และตลาดนี้ออกก่อน
        // 1.1 ลบ product_sales เดิม
        await supabase
            .from('product_sales')
            .delete()
            .eq('sale_date', date)
            .eq('market_id', marketId);

        // 1.2 ลบ unallocated_profits เดิม
        await supabase
            .from('unallocated_profits')
            .delete()
            .eq('date', date)
            .eq('source', `กำไร - ${marketName}`);

        // 1.3 ลบ transactions คืนต้นทุนเดิม
        await supabase
            .from('transactions')
            .delete()
            .eq('market_id', marketId)
            .eq('category', 'COGS')
            .eq('type', 'INCOME')
            .like('description', `คืนต้นทุน ${date} - ${marketName}%`);

        // 🛡️ 2. คำนวณ deltaSoldQty เพื่อปรับปรุงสต็อกวัตถุดิบ (Idempotent / Delta Update)
        const recipeDeductions = [];
        for (const log of logs) {
            const inventoryRecord = dailyInventory.find(
                d => d.businessDate === date &&
                    d.productId === log.productId &&
                    (d.variantId || '') === (log.variantId || '') &&
                    d.marketId === marketId
            );
            const oldSoldQty = inventoryRecord?.soldQty || 0;
            const deltaSoldQty = log.soldQty - oldSoldQty;

            if (deltaSoldQty !== 0) {
                recipeDeductions.push({
                    productId: log.productId,
                    quantity: deltaSoldQty,
                    variantId: log.variantId
                });
            }
        }

        // ตัด/คืนสต็อกวัตถุดิบตามความต่างจริง
        if (recipeDeductions.length > 0) {
            const deductRes = await bulkDeductStockByRecipes(recipeDeductions);
            if (!deductRes.success) {
                throw new Error(`Failed to deduct stock by recipes: ${deductRes.errors.join(', ')}`);
            }
        }

        // 🛡️ 3. อัปเดตตาราง daily_inventory
        const inventoryRecordsToUpsert = logs.map(log => ({
            businessDate: date,
            productId: log.productId,
            variantId: log.variantId || null,
            variantName: log.variantName || null,
            marketId: marketId,
            producedQty: 0,
            toShopQty: log.preparedQty,
            soldQty: log.soldQty,
            wasteQty: log.wasteQty || 0,
            eatQty: log.freeQty || 0,
            giveawayQty: 0,
            stockYesterday: 0
        }));

        if (inventoryRecordsToUpsert.length > 0) {
            await bulkUpsertDailyInventory(inventoryRecordsToUpsert);
        }

        // 🛡️ 4. บันทึกประวัติการขายรายชิ้นลง product_sales (บันทึกทุกรายการที่เตรียมไปหน้าร้าน หรือมียอดขาย/ของเสีย)
        const salesLogsToInsert = logs
            .filter(log => log.preparedQty > 0 || log.soldQty > 0 || log.wasteQty > 0)
            .map(log => ({
                id: crypto.randomUUID(),
                recorded_at: new Date().toISOString(),
                sale_date: date,
                market_id: marketId,
                market_name: marketName,
                product_id: log.productId,
                product_name: log.productName,
                category: log.category,
                quantity_sold: log.soldQty,
                price_per_unit: log.pricePerUnit,
                total_revenue: log.soldQty * log.pricePerUnit,
                cost_per_unit: log.costPerUnit,
                total_cost: log.soldQty * log.costPerUnit,
                gross_profit: log.soldQty * (log.pricePerUnit - log.costPerUnit),
                variant_id: log.variantId || null,
                variant_name: log.variantName || null,
                waste_qty: log.wasteQty || 0,
                eat_qty: log.freeQty || 0,
                giveaway_qty: 0,
                weather_condition: weatherCondition
            }));

        if (salesLogsToInsert.length > 0) {
            const { error: saleLogError } = await supabase.from('product_sales').insert(salesLogsToInsert);
            if (saleLogError) throw new Error(`Failed to insert sales logs: ${saleLogError.message}`);
        }

        // 🛡️ 5. บันทึกยอดเงินกำไรสะสม (Unallocated Profit) ใหม่
        if (trueProfit > 0) {
            await addUnallocatedProfit({
                id: crypto.randomUUID(),
                date,
                amount: trueProfit,
                source: `กำไร - ${marketName}`,
                createdAt: new Date().toISOString()
            });
        }

        // 🛡️ 6. บันทึกธุรกรรมคืนทุน (Transaction COGS + Waste) ใหม่
        const totalCostRecovery = totalCOGS + totalWasteCost;
        if (totalCostRecovery > 0) {
            const wasteNote = totalWasteCost > 0 ? ` (รวมของเสีย ฿${totalWasteCost.toLocaleString()})` : '';
            await addTransaction({
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                amount: totalCostRecovery,
                type: 'INCOME',
                toJar: 'Working',
                description: `คืนต้นทุน ${date} - ${marketName}${wasteNote}`,
                category: 'COGS',
                marketId: marketId
            });
        }

        // 🛡️ 7. โหลดข้อมูลใหม่ทั้งหมดกลับมาซิงค์ใน UI
        await fetchData();
        await fetchDailyInventory(date);
    }
});
