// ============================================================
// Snack Box Order Slice
// For Snack Box Order Management (create, status, profit)
// ============================================================

import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { SnackBoxOrder, SnackBoxOrderStatus } from '../../../types';

// ===== Helper: Convert snake_case to camelCase =====
const toOrderCamelCase = (row: any): SnackBoxOrder => ({
    id: row.id,
    orderNumber: row.order_number || '',
    setId: row.set_id || '',
    setName: row.set_name || '',
    setNameThai: row.set_name_thai || '',
    customerName: row.customer_name || '',
    customerPhone: row.customer_phone || '',
    customerAddress: row.customer_address || '',
    quantity: row.quantity || 0,
    pricePerSet: parseFloat(row.price_per_set) || 0,
    packagingCost: parseFloat(row.packaging_cost) || 0,
    subtotal: parseFloat(row.subtotal) || 0,
    totalPackagingCost: parseFloat(row.total_packaging_cost) || 0,
    totalPrice: parseFloat(row.total_price) || 0,
    estimatedCostPerSet: parseFloat(row.estimated_cost_per_set) || 0,
    totalEstimatedCost: parseFloat(row.total_estimated_cost) || 0,
    estimatedProfit: parseFloat(row.estimated_profit) || 0,
    useManualPrice: row.use_manual_price || false,
    manualPrice: row.manual_price ? parseFloat(row.manual_price) : null,
    discountNote: row.discount_note || '',
    deliveryDate: row.delivery_date || '',
    deliveryTime: row.delivery_time || '',
    notes: row.notes || '',
    status: row.status || 'pending',
    profitRecorded: row.profit_recorded || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

// ===== Slice Interface =====
export interface SnackBoxOrderSlice {
    snackBoxOrders: SnackBoxOrder[];
    isLoadingSnackBoxOrders: boolean;

    fetchSnackBoxOrders: () => Promise<void>;
    createSnackBoxOrder: (data: Omit<SnackBoxOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>) => Promise<SnackBoxOrder>;
    updateSnackBoxOrderStatus: (id: string, status: SnackBoxOrderStatus) => Promise<void>;
    confirmAndRecordProfit: (id: string) => Promise<void>;
    deleteSnackBoxOrder: (id: string) => Promise<void>;
}

// ===== Create Slice =====
export const createSnackBoxOrderSlice: StateCreator<SnackBoxOrderSlice> = (set, get) => ({
    snackBoxOrders: [],
    isLoadingSnackBoxOrders: false,

    fetchSnackBoxOrders: async () => {
        set({ isLoadingSnackBoxOrders: true });
        try {
            const { data, error } = await supabase
                .from('snack_box_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            set({ snackBoxOrders: (data || []).map(toOrderCamelCase) });
        } catch (error) {
            console.error('[fetchSnackBoxOrders] Error:', error);
        } finally {
            set({ isLoadingSnackBoxOrders: false });
        }
    },

    createSnackBoxOrder: async (orderData) => {
        try {
            const { data: newOrder, error } = await supabase
                .from('snack_box_orders')
                .insert({
                    set_id: orderData.setId,
                    set_name: orderData.setName,
                    set_name_thai: orderData.setNameThai,
                    customer_name: orderData.customerName,
                    customer_phone: orderData.customerPhone,
                    customer_address: orderData.customerAddress,
                    quantity: orderData.quantity,
                    price_per_set: orderData.pricePerSet,
                    packaging_cost: orderData.packagingCost,
                    subtotal: orderData.subtotal,
                    total_packaging_cost: orderData.totalPackagingCost,
                    total_price: orderData.totalPrice,
                    estimated_cost_per_set: orderData.estimatedCostPerSet,
                    total_estimated_cost: orderData.totalEstimatedCost,
                    estimated_profit: orderData.estimatedProfit,
                    use_manual_price: orderData.useManualPrice,
                    manual_price: orderData.manualPrice,
                    discount_note: orderData.discountNote,
                    delivery_date: orderData.deliveryDate || null,
                    delivery_time: orderData.deliveryTime || null,
                    notes: orderData.notes,
                    status: orderData.status || 'pending',
                    profit_recorded: false
                })
                .select()
                .single();

            if (error) throw error;

            await get().fetchSnackBoxOrders();
            console.log('[createSnackBoxOrder] Created:', newOrder.order_number);
            return toOrderCamelCase(newOrder);
        } catch (error) {
            console.error('[createSnackBoxOrder] Error:', error);
            throw error;
        }
    },

    updateSnackBoxOrderStatus: async (id, status) => {
        try {
            const { error } = await supabase
                .from('snack_box_orders')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            set({
                snackBoxOrders: get().snackBoxOrders.map(o =>
                    o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
                )
            });
        } catch (error) {
            console.error('[updateSnackBoxOrderStatus] Error:', error);
            throw error;
        }
    },

    confirmAndRecordProfit: async (id) => {
        try {
            const order = get().snackBoxOrders.find(o => o.id === id);
            if (!order) throw new Error('Order not found');
            if (order.profitRecorded) throw new Error('Profit already recorded');

            const profit = order.estimatedProfit;

            // 1. Update order status → confirmed + profitRecorded
            const { error: updateError } = await supabase
                .from('snack_box_orders')
                .update({
                    status: 'confirmed',
                    profit_recorded: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // 2. Create UnallocatedProfit record (only if profit > 0)
            if (profit > 0) {
                const { error: profitError } = await supabase
                    .from('unallocated_profits')
                    .insert({
                        date: new Date().toISOString().split('T')[0],
                        amount: profit,
                        source: `Snack Box: ${order.setName} x${order.quantity}`
                    });

                if (profitError) throw profitError;
            }

            // 3. Update local state
            set({
                snackBoxOrders: get().snackBoxOrders.map(o =>
                    o.id === id ? { ...o, status: 'confirmed' as SnackBoxOrderStatus, profitRecorded: true } : o
                )
            });

            console.log('[confirmAndRecordProfit] Confirmed order', order.orderNumber, 'profit:', profit);
        } catch (error) {
            console.error('[confirmAndRecordProfit] Error:', error);
            throw error;
        }
    },

    deleteSnackBoxOrder: async (id) => {
        try {
            const { error } = await supabase
                .from('snack_box_orders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            set({ snackBoxOrders: get().snackBoxOrders.filter(o => o.id !== id) });
            console.log('[deleteSnackBoxOrder] Deleted:', id);
        } catch (error) {
            console.error('[deleteSnackBoxOrder] Error:', error);
            throw error;
        }
    }
});
