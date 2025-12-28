import { StateCreator } from 'zustand';
import { AppState, PromotionSlice } from '../types';
import { supabase } from '../../lib/supabase';
import { Promotion, Bundle, SpecialOrder, SpecialOrderStatus } from '../../../types';

export const createPromotionSlice: StateCreator<AppState, [], [], PromotionSlice> = (set, get) => ({
    promotions: [],
    bundles: [],
    specialOrders: [],

    addPromotion: async (promo) => {
        const discountPercent = ((promo.originalPrice - promo.discountPrice) / promo.originalPrice) * 100;
        const dbPromo = {
            name: promo.name,
            description: promo.description || null,
            product_id: promo.productId,
            product_name: promo.productName,
            variant_id: promo.variantId || null,
            variant_name: promo.variantName || null,
            original_price: promo.originalPrice,
            discount_price: promo.discountPrice,
            discount_percent: discountPercent,
            min_quantity: promo.minQuantity || 1,
            max_quantity: promo.maxQuantity || null,
            valid_from: promo.validFrom || null,
            valid_until: promo.validUntil || null,
            is_active: promo.isActive ?? true
        };
        const { data, error } = await supabase.from('promotions').insert(dbPromo).select().single();
        if (!error && data) {
            const newPromo: Promotion = {
                ...promo,
                id: data.id,
                discountPercent,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
            set(state => ({ promotions: [...state.promotions, newPromo] }));
        }
    },

    updatePromotion: async (id, updates) => {
        const dbUpdates: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() };
        if (updates.discountPrice !== undefined) {
            const promo = get().promotions.find(p => p.id === id);
            if (promo) dbUpdates.discount_percent = ((promo.originalPrice - updates.discountPrice) / promo.originalPrice) * 100;
        }
        await supabase.from('promotions').update(dbUpdates).eq('id', id);
        set(state => ({ promotions: state.promotions.map(p => p.id === id ? { ...p, ...updates } : p) }));
    },

    deletePromotion: async (id) => {
        set(state => ({ promotions: state.promotions.filter(p => p.id !== id) }));
        await supabase.from('promotions').delete().eq('id', id);
    },

    addBundle: async (bundle, items) => {
        const dbBundle = {
            name: bundle.name,
            description: bundle.description || null,
            bundle_price: bundle.bundlePrice,
            estimated_cost: bundle.estimatedCost,
            profit_margin: bundle.profitMargin,
            is_active: bundle.isActive ?? true,
            image_url: bundle.imageUrl || null
        };
        const { data, error } = await supabase.from('bundles').insert(dbBundle).select().single();
        if (!error && data) {
            const bundleId = data.id;
            const dbItems = items.map((item, idx) => ({
                bundle_id: bundleId,
                product_id: item.productId,
                product_name: item.productName,
                variant_id: item.variantId || null,
                variant_name: item.variantName || null,
                quantity: item.quantity,
                unit_cost: item.unitCost,
                subtotal_cost: item.subtotalCost,
                sort_order: item.sortOrder ?? idx
            }));
            await supabase.from('bundle_items').insert(dbItems);
            const newBundle: Bundle = {
                ...bundle,
                id: bundleId,
                items: items.map((item, idx) => ({ ...item, id: crypto.randomUUID(), bundleId })),
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
            set(state => ({ bundles: [...state.bundles, newBundle] }));
        }
    },

    updateBundle: async (id, updates, items) => {
        await supabase.from('bundles').update(updates).eq('id', id);
        if (items) {
            await supabase.from('bundle_items').delete().eq('bundle_id', id);
            const dbItems = items.map((item, idx) => ({
                bundle_id: id,
                product_id: item.productId,
                product_name: item.productName,
                variant_id: item.variantId || null,
                variant_name: item.variantName || null,
                quantity: item.quantity,
                unit_cost: item.unitCost,
                subtotal_cost: item.subtotalCost,
                sort_order: item.sortOrder ?? idx
            }));
            await supabase.from('bundle_items').insert(dbItems);
        }
        set(state => ({ bundles: state.bundles.map(b => b.id === id ? { ...b, ...updates } : b) }));
    },

    deleteBundle: async (id) => {
        set(state => ({ bundles: state.bundles.filter(b => b.id !== id) }));
        await supabase.from('bundle_items').delete().eq('bundle_id', id);
        await supabase.from('bundles').delete().eq('id', id);
    },

    addSpecialOrder: async (order, items) => {
        const orderNumber = `SO-${Date.now().toString(36).toUpperCase()}`;
        const dbOrder = {
            order_number: orderNumber,
            order_date: order.orderDate,
            delivery_date: order.deliveryDate,
            order_type: order.orderType,
            promotion_id: order.promotionId || null,
            bundle_id: order.bundleId || null,
            customer_name: order.customerName || null,
            customer_phone: order.customerPhone || null,
            customer_note: order.customerNote || null,
            total_quantity: order.totalQuantity,
            total_revenue: order.totalRevenue,
            total_cost: order.totalCost,
            gross_profit: order.grossProfit,
            status: order.status,
            stock_deducted: order.stockDeducted
        };
        const { data, error } = await supabase.from('special_orders').insert(dbOrder).select().single();
        if (!error && data) {
            const orderId = data.id;
            const dbItems = items.map((item, idx) => ({
                special_order_id: orderId,
                product_id: item.productId,
                product_name: item.productName,
                variant_id: item.variantId || null,
                variant_name: item.variantName || null,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                unit_cost: item.unitCost,
                subtotal_revenue: item.subtotalRevenue,
                subtotal_cost: item.subtotalCost,
                subtotal_profit: item.subtotalProfit,
                sort_order: item.sortOrder ?? idx
            }));
            await supabase.from('special_order_items').insert(dbItems);
            const newOrder: SpecialOrder = {
                ...order,
                id: orderId,
                orderNumber,
                items: items.map((item, idx) => ({ ...item, id: crypto.randomUUID(), specialOrderId: orderId })),
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
            set(state => ({ specialOrders: [...state.specialOrders, newOrder] }));
        }
    },

    updateSpecialOrderStatus: async (id, status) => {
        await supabase.from('special_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
        set(state => ({ specialOrders: state.specialOrders.map(o => o.id === id ? { ...o, status } : o) }));
    },

    cancelSpecialOrder: async (id) => {
        await supabase.from('special_orders').update({ status: 'cancelled' }).eq('id', id);
        set(state => ({ specialOrders: state.specialOrders.map(o => o.id === id ? { ...o, status: 'cancelled' as SpecialOrderStatus } : o) }));
    },

    getSpecialOrdersByDeliveryDate: (date) => get().specialOrders.filter(o => o.deliveryDate === date && o.status !== 'cancelled'),

    getSpecialOrdersForProduction: (date) => {
        const orders = get().specialOrders.filter(o => o.deliveryDate === date && (o.status === 'confirmed' || o.status === 'producing'));
        const result: { productId: string; variantId?: string; quantity: number; orderNumber: string }[] = [];
        orders.forEach(order => {
            order.items.forEach(item => {
                result.push({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    orderNumber: order.orderNumber
                });
            });
        });
        return result;
    },

    syncDeliveredOrderProfits: async () => {
        // Simplified - in production, copy full logic from original store.ts
        return 0;
    }
});
