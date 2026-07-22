import { StateCreator } from 'zustand';
import { AppState } from '../types';
import { supabase } from '../../lib/supabase';
import { ConsignmentOrder, ConsignmentOrderItem, ConsignmentOrderStatus, ExternalShop } from '../../../types';

export interface ConsignmentSlice {
    externalShops: ExternalShop[];
    consignmentOrders: ConsignmentOrder[];
    isLoadingConsignments: boolean;

    fetchExternalShops: () => Promise<void>;
    createExternalShop: (shop: Omit<ExternalShop, 'id' | 'createdAt'>) => Promise<void>;
    updateExternalShop: (id: string, shop: Partial<ExternalShop>) => Promise<void>;

    fetchConsignmentOrders: () => Promise<void>;
    createConsignmentOrder: (order: Omit<ConsignmentOrder, 'id' | 'createdAt' | 'updatedAt' | 'items'>, items: Omit<ConsignmentOrderItem, 'id' | 'consignmentId'>[]) => Promise<void>;
    updateConsignmentOrderStatus: (id: string, status: ConsignmentOrderStatus) => Promise<void>;
    settleConsignmentOrder: (id: string, items: { id: string; quantitySold: number; quantityCarryOver?: number; quantityWaste: number; quantityReturned: number; quantityGiveaway: number; lineTotal: number }[], settleDate: string) => Promise<void>;
    deleteConsignmentOrder: (id: string) => Promise<void>;
}

export const createConsignmentSlice: StateCreator<AppState, [], [], ConsignmentSlice> = (set, get) => ({
    externalShops: [],
    consignmentOrders: [],
    isLoadingConsignments: false,

    fetchExternalShops: async () => {
        try {
            const { data, error } = await supabase
                .from('external_shops')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedShops: ExternalShop[] = (data || []).map(s => ({
                id: s.id,
                name: s.name,
                contactName: s.contact_name,
                contactPhone: s.contact_phone,
                address: s.address,
                isActive: s.is_active,
                favoriteItems: s.favorite_items || [],
                createdAt: s.created_at
            }));

            set({ externalShops: mappedShops });
        } catch (error) {
            console.error('Error fetching external shops:', error);
        }
    },

    createExternalShop: async (shop) => {
        try {
            const { error } = await supabase
                .from('external_shops')
                .insert([{
                    name: shop.name,
                    contact_name: shop.contactName,
                    contact_phone: shop.contactPhone,
                    address: shop.address,
                    is_active: shop.isActive,
                    favorite_items: shop.favoriteItems || []
                }]);

            if (error) throw error;
            await get().fetchExternalShops();
        } catch (error) {
            console.error('Error creating external shop:', error);
            throw error;
        }
    },

    updateExternalShop: async (id, shop) => {
        try {
            const { error } = await supabase
                .from('external_shops')
                .update({
                    name: shop.name,
                    contact_name: shop.contactName,
                    contact_phone: shop.contactPhone,
                    address: shop.address,
                    is_active: shop.isActive,
                    favorite_items: shop.favoriteItems || []
                })
                .eq('id', id);

            if (error) throw error;
            await get().fetchExternalShops();
        } catch (error) {
            console.error('Error updating external shop:', error);
            throw error;
        }
    },

    fetchConsignmentOrders: async () => {
        set({ isLoadingConsignments: true });
        try {
            const { data: orders, error: ordersError } = await supabase
                .from('consignment_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            const { data: items, error: itemsError } = await supabase
                .from('consignment_order_items')
                .select('*');

            if (itemsError) throw itemsError;

            const mappedOrders: ConsignmentOrder[] = (orders || []).map(o => ({
                id: o.id,
                orderNumber: o.order_number,
                shopId: o.shop_id,
                shopName: o.shop_name,
                contactName: o.contact_name,
                contactPhone: o.contact_phone,
                deliveryDate: o.delivery_date,
                settleDate: o.settle_date,
                totalQuantitySent: Number(o.total_quantity_sent),
                totalQuantitySold: Number(o.total_quantity_sold),
                totalQuantityWaste: Number(o.total_quantity_waste),
                totalQuantityReturned: Number(o.total_quantity_returned),
                totalQuantityGiveaway: Number(o.total_quantity_giveaway || 0),
                totalRevenue: Number(o.total_revenue),
                totalCost: Number(o.total_cost),
                totalProfit: Number(o.total_profit),
                notes: o.notes,
                status: o.status as ConsignmentOrderStatus,
                createdAt: o.created_at,
                updatedAt: o.updated_at,
                items: (items || [])
                    .filter(i => i.consignment_id === o.id)
                    .map(i => {
                        const qSent = Number(i.quantity_sent || 0);
                        const qSold = Number(i.quantity_sold || 0);
                        const qWaste = Number(i.quantity_waste || 0);
                        const qReturned = Number(i.quantity_returned || 0);
                        const qGiveaway = Number(i.quantity_giveaway || 0);
                        const calcCarryOver = Math.max(0, qSent - (qSold + qWaste + qReturned + qGiveaway));
                        const carryOver = i.quantity_carry_over !== undefined && i.quantity_carry_over !== null
                            ? Number(i.quantity_carry_over)
                            : calcCarryOver;

                        return {
                            id: i.id,
                            consignmentId: i.consignment_id,
                            productId: i.product_id,
                            variantId: i.variant_id,
                            productName: i.product_name,
                            variantName: i.variant_name,
                            quantitySent: qSent,
                            quantitySold: qSold,
                            quantityWaste: qWaste,
                            quantityReturned: qReturned,
                            quantityGiveaway: qGiveaway,
                            quantityCarryOver: carryOver,
                            unitPrice: Number(i.unit_price),
                            unitCost: Number(i.unit_cost),
                            lineTotal: Number(i.line_total),
                            sortOrder: i.sort_order
                        };
                    }).sort((a, b) => a.sortOrder - b.sortOrder)
            }));

            set({ consignmentOrders: mappedOrders });
        } catch (error) {
            console.error('Error fetching consignment orders:', error);
        } finally {
            set({ isLoadingConsignments: false });
        }
    },

    createConsignmentOrder: async (order, items) => {
        try {
            const { data: orderData, error: orderError } = await supabase
                .from('consignment_orders')
                .insert([{
                    order_number: order.orderNumber,
                    shop_id: order.shopId,
                    shop_name: order.shopName,
                    contact_name: order.contactName,
                    contact_phone: order.contactPhone,
                    delivery_date: order.deliveryDate,
                    total_quantity_sent: order.totalQuantitySent,
                    total_cost: order.totalCost,
                    notes: order.notes,
                    status: order.status
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            const orderId = orderData.id;

            const itemsToInsert = items.map(item => ({
                consignment_id: orderId,
                product_id: item.productId,
                variant_id: item.variantId,
                product_name: item.productName,
                variant_name: item.variantName,
                quantity_sent: item.quantitySent,
                quantity_sold: 0,
                quantity_waste: 0,
                quantity_returned: 0,
                quantity_giveaway: 0,
                unit_price: item.unitPrice,
                unit_cost: item.unitCost,
                sort_order: item.sortOrder
            }));

            const { error: itemsError } = await supabase
                .from('consignment_order_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            // Deduct stock if shipped immediately
            if (order.status === 'shipped') {
                const inventoryItems = itemsToInsert.map(i => ({
                    productId: i.product_id,
                    variantId: i.variant_id || undefined,
                    quantity: i.quantity_sent
                }));
                await get().bulkDeductStockByRecipes(inventoryItems);
            }

            await get().fetchConsignmentOrders();
        } catch (error) {
            console.error('Error creating consignment order:', error);
            throw error;
        }
    },

    updateConsignmentOrderStatus: async (id, status) => {
        try {
            const order = get().consignmentOrders.find(o => o.id === id);
            if (!order) return;

            const { error } = await supabase
                .from('consignment_orders')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            // If changing from pending to shipped, deduct stock
            if (order.status === 'pending' && status === 'shipped') {
                const inventoryItems = order.items.map(i => ({
                    productId: i.productId,
                    variantId: i.variantId || undefined,
                    quantity: i.quantitySent
                }));
                await get().bulkDeductStockByRecipes(inventoryItems);
            }

            await get().fetchConsignmentOrders();
        } catch (error) {
            console.error('Error updating consignment order status:', error);
            throw error;
        }
    },

    settleConsignmentOrder: async (id, updatedItems, settleDate) => {
        try {
            const order = get().consignmentOrders.find(o => o.id === id);
            if (!order) return;

            let totalSold = 0;
            let totalWaste = 0;
            let totalReturned = 0;
            let totalGiveaway = 0;
            let totalRevenue = 0;
            let totalCost = 0;

            const itemsPromises = updatedItems.map(item => {
                const originalItem = order.items.find(i => i.id === item.id);
                if (!originalItem) return Promise.resolve();

                totalSold += item.quantitySold;
                totalWaste += item.quantityWaste;
                totalReturned += item.quantityReturned;
                totalGiveaway += item.quantityGiveaway || 0;
                totalRevenue += item.lineTotal;
                totalCost += (item.quantitySold + item.quantityWaste + (item.quantityGiveaway || 0)) * originalItem.unitCost;

                return (async () => {
                    const updatePayload: any = {
                        quantity_sold: item.quantitySold,
                        quantity_waste: item.quantityWaste,
                        quantity_returned: item.quantityReturned,
                        quantity_giveaway: item.quantityGiveaway || 0,
                        line_total: item.lineTotal
                    };

                    // First try updating with quantity_carry_over
                    const { error } = await supabase
                        .from('consignment_order_items')
                        .update({ ...updatePayload, quantity_carry_over: item.quantityCarryOver || 0 })
                        .eq('id', item.id);

                    if (error) {
                        // If column is missing in DB, update standard fields without failing
                        await supabase
                            .from('consignment_order_items')
                            .update(updatePayload)
                            .eq('id', item.id);
                    }
                })();
            });

            await Promise.all(itemsPromises);

            const totalProfit = totalRevenue - totalCost;

            const { error: orderError } = await supabase
                .from('consignment_orders')
                .update({
                    status: 'settled',
                    settle_date: settleDate,
                    total_quantity_sold: totalSold,
                    total_quantity_waste: totalWaste,
                    total_quantity_returned: totalReturned,
                    total_quantity_giveaway: totalGiveaway,
                    total_revenue: totalRevenue,
                    total_cost: totalCost,
                    total_profit: totalProfit,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (orderError) throw orderError;

            // NEW MULTI-WALLET LOGIC: Add revenue to unallocated profits of the Specific Wallet/Shop
            if (totalRevenue > 0) {
                const { error: profitError } = await supabase
                    .from('unallocated_profits')
                    .insert([{
                        date: settleDate,
                        amount: totalRevenue,
                        source: `consignment:${order.orderNumber}`,
                        wallet_id: order.shopId // The key to Multi-Wallet!
                    }]);
                
                if (profitError) throw profitError;
                // Fetch unallocated profits to update state
                // Note: unallocated_profits is in financeSlice
            }

            // NEW: CREATE PRODUCT SALE LOGS for Analytics/Reports
            const salesLogsToInsert = updatedItems
                .filter(item => item.quantitySold > 0 || item.quantityWaste > 0 || item.quantityGiveaway > 0)
                .map(item => {
                    const originalItem = order.items.find(i => i.id === item.id);
                    const cost = originalItem?.unitCost || 0;
                    const price = originalItem?.unitPrice || 0;
                    const productCategory = get().products.find(p => p.id === originalItem?.productId)?.category || 'Other';
                    
                    return {
                        id: crypto.randomUUID(),
                        sale_date: settleDate,
                        market_id: order.shopId,
                        market_name: `ฝากขาย: ${order.shopName}`,
                        product_id: originalItem?.productId,
                        product_name: originalItem?.productName,
                        variant_id: originalItem?.variantId || null,
                        variant_name: originalItem?.variantName || null,
                        category: productCategory,
                        quantity_sold: item.quantitySold,
                        price_per_unit: price,
                        total_revenue: item.lineTotal,
                        cost_per_unit: cost,
                        total_cost: (item.quantitySold + item.quantityWaste + (item.quantityGiveaway || 0)) * cost,
                        gross_profit: item.lineTotal - ((item.quantitySold + item.quantityWaste + (item.quantityGiveaway || 0)) * cost),
                        waste_qty: item.quantityWaste,
                        eat_qty: 0,
                        giveaway_qty: item.quantityGiveaway || 0,
                        recorded_at: new Date().toISOString(),
                        weather_condition: 'ฝากขาย'
                    };
                });

            if (salesLogsToInsert.length > 0) {
                const { error: salesError } = await supabase.from('product_sales').insert(salesLogsToInsert);
                if (salesError) console.error('Failed to log consignment sales:', salesError);
            }

            // Return leftovers to stock (Main store's producedQty / toShopQty)
            const returnedItems = updatedItems
                .filter(item => item.quantityReturned > 0)
                .map(item => {
                    const originalItem = order.items.find(i => i.id === item.id);
                    return {
                        businessDate: settleDate,
                        productId: originalItem!.productId,
                        variantId: originalItem!.variantId || undefined,
                        returnedQty: item.quantityReturned
                    };
                });

            if (returnedItems.length > 0) {
                // Ensure daily inventory for this date is loaded
                await get().fetchDailyInventory(settleDate);
                const currentInv = get().dailyInventory.filter(i => i.businessDate === settleDate);
                
                const upserts = returnedItems.map(ret => {
                    const existing = currentInv.find(i => 
                        i.productId === ret.productId && 
                        (i.variantId || undefined) === ret.variantId
                    );
                    
                    if (existing) {
                        return {
                            ...existing,
                            businessDate: settleDate,
                            // Adding to producedQty so it counts as good stock today for the main shop
                            producedQty: existing.producedQty + ret.returnedQty
                        };
                    } else {
                        const product = get().products.find(p => p.id === ret.productId);
                        return {
                            businessDate: settleDate,
                            productId: ret.productId,
                            variantId: ret.variantId,
                            variantName: product?.variants?.find(v => v.id === ret.variantId)?.name,
                            producedQty: ret.returnedQty, // It returned so it's fresh stock
                            toShopQty: 0,
                            soldQty: 0,
                            wasteQty: 0,
                            pricePerUnit: product?.price || 0,
                            costPerUnit: product?.cost || 0
                        };
                    }
                });
                
                await get().bulkUpsertDailyInventory(upserts);
            }

            await get().fetchConsignmentOrders();
        } catch (error) {
            console.error('Error settling consignment order:', error);
            throw error;
        }
    },

    deleteConsignmentOrder: async (id) => {
        try {
            const order = get().consignmentOrders.find(o => o.id === id);
            
            // Delete related unallocated profits if settled
            if (order && order.status === 'settled') {
                await supabase
                    .from('unallocated_profits')
                    .delete()
                    .eq('source', `consignment:${order.orderNumber}`);
            }

            // Explicitly delete consignment items to be safe
            await supabase
                .from('consignment_order_items')
                .delete()
                .eq('consignment_id', id);

            const { error } = await supabase
                .from('consignment_orders')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await get().fetchConsignmentOrders();
            
            // Reload all store data if a settled bill was deleted to update jar balances
            if (order && order.status === 'settled') {
                await get().fetchData();
            }
        } catch (error) {
            console.error('Error deleting consignment order:', error);
            throw error;
        }
    }
});
