// ============================================================
// Promotion Order Slice
// For Promotion & Special Order Management
// ============================================================

import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { PromotionOrder, PromotionOrderItem, PromotionOrderStatus } from '../../../types';

// ===== Helper: Convert snake_case to camelCase for Order =====
const toOrderCamelCase = (row: any): PromotionOrder => ({
    id: row.id,
    orderNumber: row.order_number || '',
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    customerAddress: row.customer_address || '',
    deliveryDate: row.delivery_date || '',
    deliveryTime: row.delivery_time || '',
    calculatedPrice: parseFloat(row.calculated_price) || 0,
    manualPrice: row.manual_price ? parseFloat(row.manual_price) : null,
    useManualPrice: row.use_manual_price || false,
    discountNote: row.discount_note || '',
    totalPrice: parseFloat(row.total_price) || 0,
    notes: row.notes || '',
    status: row.status || 'pending',
    items: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

// ===== Helper: Convert snake_case to camelCase for Item =====
const toItemCamelCase = (row: any): PromotionOrderItem => ({
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    variantId: row.variant_id || null,
    variantNote: row.variant_note || '',
    quantity: row.quantity || 0,
    unitPrice: parseFloat(row.unit_price) || 0,
    lineTotal: parseFloat(row.line_total) || 0,
    productName: row.products?.name,
    variantName: row.products?.variants?.find((v: any) => v.id === row.variant_id)?.name
});

// ===== Slice Interface =====
export interface PromotionOrderSlice {
    promotionOrders: PromotionOrder[];
    isLoadingPromotionOrders: boolean;

    fetchPromotionOrders: (filters?: { status?: string; dateFrom?: string; dateTo?: string }) => Promise<void>;
    createPromotionOrder: (
        order: Omit<PromotionOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'items'>,
        items: Omit<PromotionOrderItem, 'id' | 'orderId'>[]
    ) => Promise<PromotionOrder>;
    updatePromotionOrder: (id: string, updates: Partial<PromotionOrder>) => Promise<void>;
    updatePromotionOrderStatus: (id: string, status: PromotionOrderStatus) => Promise<void>;
    deletePromotionOrder: (id: string) => Promise<void>;
    getPromotionOrdersByDate: (date: string) => PromotionOrder[];
}

// ===== Create Slice =====
export const createPromotionOrderSlice: StateCreator<PromotionOrderSlice> = (set, get) => ({
    promotionOrders: [],
    isLoadingPromotionOrders: false,

    // Fetch orders with optional filters
    fetchPromotionOrders: async (filters) => {
        set({ isLoadingPromotionOrders: true });
        try {
            let query = supabase
                .from('promotion_orders')
                .select('*')
                .order('created_at', { ascending: false });

            // Apply filters
            if (filters?.status) {
                query = query.eq('status', filters.status);
            }
            if (filters?.dateFrom) {
                query = query.gte('delivery_date', filters.dateFrom);
            }
            if (filters?.dateTo) {
                query = query.lte('delivery_date', filters.dateTo);
            }

            const { data: ordersData, error: ordersError } = await query;

            if (ordersError) throw ordersError;

            // Fetch items for all orders
            const orderIds = (ordersData || []).map(o => o.id);

            let itemsData: any[] = [];
            if (orderIds.length > 0) {
                const { data, error: itemsError } = await supabase
                    .from('promotion_order_items')
                    .select('*')  // Removed products join - no longer have FK relationship
                    .in('order_id', orderIds);

                if (itemsError) throw itemsError;
                itemsData = data || [];
            }

            // Map items to orders
            const orders: PromotionOrder[] = (ordersData || []).map(orderRow => {
                const o = toOrderCamelCase(orderRow);
                o.items = itemsData
                    .filter(item => item.order_id === o.id)
                    .map(toItemCamelCase);
                return o;
            });

            set({ promotionOrders: orders });
            console.log('[fetchPromotionOrders] Loaded', orders.length, 'orders');
        } catch (error) {
            console.error('[fetchPromotionOrders] Error:', error);
        } finally {
            set({ isLoadingPromotionOrders: false });
        }
    },

    // Create new order with items
    createPromotionOrder: async (orderData, items) => {
        try {
            // Calculate total price
            const calculatedPrice = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            const totalPrice = orderData.useManualPrice && orderData.manualPrice
                ? orderData.manualPrice
                : calculatedPrice;

            // Insert order
            const { data: newOrder, error: orderError } = await supabase
                .from('promotion_orders')
                .insert({
                    customer_name: orderData.customerName,
                    customer_phone: orderData.customerPhone,
                    customer_address: orderData.customerAddress,
                    delivery_date: orderData.deliveryDate || null,
                    delivery_time: orderData.deliveryTime || null,
                    calculated_price: calculatedPrice,
                    manual_price: orderData.manualPrice,
                    use_manual_price: orderData.useManualPrice,
                    discount_note: orderData.discountNote,
                    total_price: totalPrice,
                    notes: orderData.notes,
                    status: orderData.status || 'pending'
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Insert items
            if (items.length > 0) {
                const { error: itemsError } = await supabase
                    .from('promotion_order_items')
                    .insert(
                        items.map(item => ({
                            order_id: newOrder.id,
                            product_id: item.productId,
                            variant_id: item.variantId || null,
                            variant_note: item.variantNote,
                            quantity: item.quantity,
                            unit_price: item.unitPrice,
                            line_total: item.quantity * item.unitPrice
                        }))
                    );

                if (itemsError) throw itemsError;
            }

            // Refresh data
            await get().fetchPromotionOrders();

            console.log('[createPromotionOrder] Created:', newOrder.order_number);
            return toOrderCamelCase(newOrder);
        } catch (error) {
            console.error('[createPromotionOrder] Error:', error);
            throw error;
        }
    },

    // Update order
    updatePromotionOrder: async (id, updates) => {
        try {
            const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

            if (updates.customerName !== undefined) updateData.customer_name = updates.customerName;
            if (updates.customerPhone !== undefined) updateData.customer_phone = updates.customerPhone;
            if (updates.customerAddress !== undefined) updateData.customer_address = updates.customerAddress;
            if (updates.deliveryDate !== undefined) updateData.delivery_date = updates.deliveryDate;
            if (updates.deliveryTime !== undefined) updateData.delivery_time = updates.deliveryTime;
            if (updates.calculatedPrice !== undefined) updateData.calculated_price = updates.calculatedPrice;
            if (updates.manualPrice !== undefined) updateData.manual_price = updates.manualPrice;
            if (updates.useManualPrice !== undefined) updateData.use_manual_price = updates.useManualPrice;
            if (updates.discountNote !== undefined) updateData.discount_note = updates.discountNote;
            if (updates.totalPrice !== undefined) updateData.total_price = updates.totalPrice;
            if (updates.notes !== undefined) updateData.notes = updates.notes;
            if (updates.status !== undefined) updateData.status = updates.status;

            const { error } = await supabase
                .from('promotion_orders')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // Refresh data
            await get().fetchPromotionOrders();

            console.log('[updatePromotionOrder] Updated:', id);
        } catch (error) {
            console.error('[updatePromotionOrder] Error:', error);
            throw error;
        }
    },

    // Update status only
    updatePromotionOrderStatus: async (id, status) => {
        try {
            const { error } = await supabase
                .from('promotion_orders')
                .update({
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            // Update local state
            set({
                promotionOrders: get().promotionOrders.map(o =>
                    o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
                )
            });

            console.log('[updatePromotionOrderStatus] Updated:', id, '->', status);
        } catch (error) {
            console.error('[updatePromotionOrderStatus] Error:', error);
            throw error;
        }
    },

    // Delete order
    deletePromotionOrder: async (id) => {
        try {
            const { error } = await supabase
                .from('promotion_orders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Update local state
            set({ promotionOrders: get().promotionOrders.filter(o => o.id !== id) });

            console.log('[deletePromotionOrder] Deleted:', id);
        } catch (error) {
            console.error('[deletePromotionOrder] Error:', error);
            throw error;
        }
    },

    // Get orders by delivery date
    getPromotionOrdersByDate: (date) => {
        return get().promotionOrders.filter(o => o.deliveryDate === date);
    }
});
