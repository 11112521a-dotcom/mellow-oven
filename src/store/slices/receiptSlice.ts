// ============================================================
// Receipt Slice
// Zustand slice for Receipt (ใบเสร็จรับเงิน) management
// ============================================================

import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { Receipt, PaymentMethod, QuotationItem } from '../../../types';

// Helper: Convert snake_case to camelCase
const toCamelCase = (row: any): Receipt => ({
    id: row.id,
    receiptNumber: row.receipt_number,
    quotationId: row.quotation_id,
    invoiceId: row.invoice_id,
    customerName: row.customer_name,
    customerAddress: row.customer_address || '',
    customerPhone: row.customer_phone || '',
    items: row.items || [],
    totalPrice: parseFloat(row.total_price) || 0,
    paymentMethod: row.payment_method as PaymentMethod,
    paymentDate: row.payment_date,
    paymentNote: row.payment_note || '',
    receivedBy: row.received_by || '',
    createdAt: row.created_at
});

export interface ReceiptSlice {
    receipts: Receipt[];
    receiptsLoading: boolean;
    fetchReceipts: () => Promise<void>;
    createReceipt: (data: Omit<Receipt, 'id' | 'receiptNumber' | 'createdAt'>) => Promise<Receipt | null>;
    createReceiptFromQuotation: (quotationId: string, paymentMethod: PaymentMethod, receivedBy: string, paymentNote?: string) => Promise<Receipt | null>;
    createReceiptFromInvoice: (invoiceId: string, paymentMethod: PaymentMethod, receivedBy: string, paymentNote?: string) => Promise<Receipt | null>;
    deleteReceipt: (id: string) => Promise<void>;
}

export const createReceiptSlice: StateCreator<ReceiptSlice, [], [], ReceiptSlice> = (set, get) => ({
    receipts: [],
    receiptsLoading: false,

    fetchReceipts: async () => {
        set({ receiptsLoading: true });
        try {
            const { data, error } = await supabase
                .from('receipts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            set({ receipts: (data || []).map(toCamelCase) });
        } catch (error) {
            console.error('Error fetching receipts:', error);
        } finally {
            set({ receiptsLoading: false });
        }
    },

    createReceipt: async (data) => {
        try {
            const { data: result, error } = await supabase
                .from('receipts')
                .insert({
                    quotation_id: data.quotationId,
                    invoice_id: data.invoiceId,
                    customer_name: data.customerName,
                    customer_address: data.customerAddress,
                    customer_phone: data.customerPhone,
                    items: data.items,
                    total_price: data.totalPrice,
                    payment_method: data.paymentMethod,
                    payment_date: data.paymentDate || new Date().toISOString().split('T')[0],
                    payment_note: data.paymentNote,
                    received_by: data.receivedBy
                })
                .select()
                .single();

            if (error) throw error;

            const receipt = toCamelCase(result);
            set(state => ({ receipts: [receipt, ...state.receipts] }));
            return receipt;
        } catch (error) {
            console.error('Error creating receipt:', error);
            return null;
        }
    },

    // Create Receipt directly from Quotation (quick payment)
    createReceiptFromQuotation: async (quotationId, paymentMethod, receivedBy, paymentNote = '') => {
        try {
            // Fetch quotation directly from Supabase
            const { data: quotation, error: quotationError } = await supabase
                .from('quotations')
                .select('*')
                .eq('id', quotationId)
                .single();

            if (quotationError || !quotation) {
                console.error('Quotation not found:', quotationError);
                return null;
            }

            // SNAPSHOT: Copy all data from quotation
            const receiptData = {
                quotationId,
                invoiceId: null,
                customerName: quotation.customer_name,
                customerAddress: quotation.customer_address || '',
                customerPhone: quotation.customer_phone || '',
                items: quotation.items || [],
                totalPrice: parseFloat(quotation.total_price) || 0,
                paymentMethod,
                paymentDate: new Date().toISOString().split('T')[0],
                paymentNote,
                receivedBy
            };

            return await get().createReceipt(receiptData);
        } catch (error) {
            console.error('Error creating receipt from quotation:', error);
            return null;
        }
    },

    // Create Receipt from Invoice (after payment)
    createReceiptFromInvoice: async (invoiceId, paymentMethod, receivedBy, paymentNote = '') => {
        try {
            // Fetch invoice directly from Supabase
            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .select('*')
                .eq('id', invoiceId)
                .single();

            if (invoiceError || !invoice) {
                console.error('Invoice not found:', invoiceError);
                return null;
            }

            // SNAPSHOT: Copy all data from invoice
            const receiptData = {
                quotationId: invoice.quotation_id,
                invoiceId,
                customerName: invoice.customer_name,
                customerAddress: invoice.customer_address || '',
                customerPhone: invoice.customer_phone || '',
                items: invoice.items || [],
                totalPrice: parseFloat(invoice.total_price) || 0,
                paymentMethod,
                paymentDate: new Date().toISOString().split('T')[0],
                paymentNote,
                receivedBy
            };

            return await get().createReceipt(receiptData);
        } catch (error) {
            console.error('Error creating receipt from invoice:', error);
            return null;
        }
    },

    deleteReceipt: async (id) => {
        try {
            const { error } = await supabase
                .from('receipts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            set(state => ({
                receipts: state.receipts.filter(r => r.id !== id)
            }));
        } catch (error) {
            console.error('Error deleting receipt:', error);
        }
    }
});
