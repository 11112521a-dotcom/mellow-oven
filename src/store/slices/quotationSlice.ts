// ============================================================
// Quotation Slice
// For PDF Quotation Management
// ============================================================

import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { Quotation, QuotationItem, QuotationStatus } from '../../../types';

// ===== Helper: Number to Thai Baht Text =====
export function numberToThaiText(num: number): string {
    const digits = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    if (num === 0) return 'ศูนย์บาทถ้วน';

    const intPart = Math.floor(num);
    const decPart = Math.round((num - intPart) * 100);

    let result = '';
    let n = intPart;
    let pos = 0;

    while (n > 0) {
        const digit = n % 10;
        if (digit !== 0) {
            if (pos === 1 && digit === 1) {
                result = 'สิบ' + result;
            } else if (pos === 1 && digit === 2) {
                result = 'ยี่สิบ' + result;
            } else if (pos === 0 && digit === 1 && intPart > 10) {
                result = 'เอ็ด' + result;
            } else {
                result = digits[digit] + positions[pos] + result;
            }
        }
        n = Math.floor(n / 10);
        pos++;
        if (pos === 7 && n > 0) pos = 1; // Reset for millions
    }

    result += 'บาท';

    if (decPart > 0) {
        // Add satang
        result += numberToThaiText(decPart).replace('บาทถ้วน', 'สตางค์').replace('บาท', 'สตางค์');
    } else {
        result += 'ถ้วน';
    }

    return result;
}

// ===== Helper: Convert snake_case to camelCase =====
const toCamelCase = (row: any): Quotation => ({
    id: row.id,
    quotationNumber: row.quotation_number || '',
    customerName: row.customer_name || '',
    customerAddress: row.customer_address || '',
    customerContact: row.customer_contact || '',
    customerPhone: row.customer_phone || '',
    orderId: row.order_id || null,
    items: row.items || [],
    subtotal: parseFloat(row.subtotal) || 0,
    discountAmount: parseFloat(row.discount_amount) || 0,
    discountNote: row.discount_note || '',
    totalPrice: parseFloat(row.total_price) || 0,
    totalPriceText: row.total_price_text || '',
    validityDays: row.validity_days || 30,
    conditions: row.conditions || '',
    status: row.status || 'draft',
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

// ===== Slice Interface =====
export interface QuotationSlice {
    quotations: Quotation[];
    isLoadingQuotations: boolean;

    fetchQuotations: () => Promise<void>;
    createQuotation: (quotation: Omit<Quotation, 'id' | 'quotationNumber' | 'createdAt' | 'updatedAt'>) => Promise<Quotation>;
    updateQuotation: (id: string, updates: Partial<Quotation>) => Promise<void>;
    updateQuotationStatus: (id: string, status: QuotationStatus) => Promise<void>;
    deleteQuotation: (id: string) => Promise<void>;
}

// ===== Create Slice =====
export const createQuotationSlice: StateCreator<QuotationSlice> = (set, get) => ({
    quotations: [],
    isLoadingQuotations: false,

    // Fetch all quotations
    fetchQuotations: async () => {
        set({ isLoadingQuotations: true });
        try {
            const { data, error } = await supabase
                .from('quotations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            set({ quotations: (data || []).map(toCamelCase) });
            console.log('[fetchQuotations] Loaded', data?.length, 'quotations');
        } catch (error) {
            console.error('[fetchQuotations] Error:', error);
        } finally {
            set({ isLoadingQuotations: false });
        }
    },

    // Create quotation
    createQuotation: async (quotationData) => {
        try {
            // Calculate subtotal
            const subtotal = quotationData.items.reduce((sum, item) => sum + item.lineTotal, 0);
            const totalPrice = subtotal - (quotationData.discountAmount || 0);
            const totalPriceText = numberToThaiText(totalPrice);

            const { data, error } = await supabase
                .from('quotations')
                .insert({
                    customer_name: quotationData.customerName,
                    customer_address: quotationData.customerAddress,
                    customer_contact: quotationData.customerContact,
                    customer_phone: quotationData.customerPhone,
                    order_id: quotationData.orderId || null,
                    items: quotationData.items,
                    subtotal,
                    discount_amount: quotationData.discountAmount || 0,
                    discount_note: quotationData.discountNote,
                    total_price: totalPrice,
                    total_price_text: totalPriceText,
                    validity_days: quotationData.validityDays || 30,
                    conditions: quotationData.conditions,
                    status: quotationData.status || 'draft'
                })
                .select()
                .single();

            if (error) throw error;

            // Refresh data
            await get().fetchQuotations();

            console.log('[createQuotation] Created:', data.quotation_number);
            return toCamelCase(data);
        } catch (error) {
            console.error('[createQuotation] Error:', error);
            throw error;
        }
    },

    // Update quotation
    updateQuotation: async (id, updates) => {
        try {
            const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

            if (updates.customerName !== undefined) updateData.customer_name = updates.customerName;
            if (updates.customerAddress !== undefined) updateData.customer_address = updates.customerAddress;
            if (updates.customerContact !== undefined) updateData.customer_contact = updates.customerContact;
            if (updates.customerPhone !== undefined) updateData.customer_phone = updates.customerPhone;
            if (updates.items !== undefined) {
                updateData.items = updates.items;
                // Recalculate totals
                const subtotal = updates.items.reduce((sum, item) => sum + item.lineTotal, 0);
                updateData.subtotal = subtotal;
                const discount = updates.discountAmount ?? get().quotations.find(q => q.id === id)?.discountAmount ?? 0;
                updateData.total_price = subtotal - discount;
                updateData.total_price_text = numberToThaiText(updateData.total_price);
            }
            if (updates.discountAmount !== undefined) updateData.discount_amount = updates.discountAmount;
            if (updates.discountNote !== undefined) updateData.discount_note = updates.discountNote;
            if (updates.validityDays !== undefined) updateData.validity_days = updates.validityDays;
            if (updates.conditions !== undefined) updateData.conditions = updates.conditions;
            if (updates.status !== undefined) updateData.status = updates.status;

            const { error } = await supabase
                .from('quotations')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            // Refresh data
            await get().fetchQuotations();

            console.log('[updateQuotation] Updated:', id);
        } catch (error) {
            console.error('[updateQuotation] Error:', error);
            throw error;
        }
    },

    // Update status only
    updateQuotationStatus: async (id, status) => {
        try {
            const { error } = await supabase
                .from('quotations')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            // Update local state
            set({
                quotations: get().quotations.map(q =>
                    q.id === id ? { ...q, status, updatedAt: new Date().toISOString() } : q
                )
            });

            console.log('[updateQuotationStatus] Updated:', id, '->', status);
        } catch (error) {
            console.error('[updateQuotationStatus] Error:', error);
            throw error;
        }
    },

    // Delete quotation
    deleteQuotation: async (id) => {
        try {
            const { error } = await supabase
                .from('quotations')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Update local state
            set({ quotations: get().quotations.filter(q => q.id !== id) });

            console.log('[deleteQuotation] Deleted:', id);
        } catch (error) {
            console.error('[deleteQuotation] Error:', error);
            throw error;
        }
    }
});
