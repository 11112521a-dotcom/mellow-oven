// ============================================================
// Invoice Slice
// Zustand slice for Invoice (ใบแจ้งหนี้) management
// ============================================================

import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { Invoice, InvoiceStatus, QuotationItem } from '../../../types';

// Helper: Convert snake_case to camelCase
const toCamelCase = (row: any): Invoice => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    quotationId: row.quotation_id,
    customerName: row.customer_name,
    customerAddress: row.customer_address || '',
    customerContact: row.customer_contact || '',
    customerPhone: row.customer_phone || '',
    items: row.items || [],
    subtotal: parseFloat(row.subtotal) || 0,
    discountAmount: parseFloat(row.discount_amount) || 0,
    discountNote: row.discount_note || '',
    totalPrice: parseFloat(row.total_price) || 0,
    dueDate: row.due_date,
    paymentTerms: row.payment_terms || '',
    notes: row.notes || '',
    status: row.status as InvoiceStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

export interface InvoiceSlice {
    invoices: Invoice[];
    invoicesLoading: boolean;
    fetchInvoices: () => Promise<void>;
    createInvoice: (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt' | 'updatedAt'>) => Promise<Invoice | null>;
    createInvoiceFromQuotation: (quotationId: string, dueDate: string, paymentTerms?: string) => Promise<Invoice | null>;
    updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
    updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<void>;
    deleteInvoice: (id: string) => Promise<void>;
}

export const createInvoiceSlice: StateCreator<InvoiceSlice, [], [], InvoiceSlice> = (set, get) => ({
    invoices: [],
    invoicesLoading: false,

    fetchInvoices: async () => {
        set({ invoicesLoading: true });
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            set({ invoices: (data || []).map(toCamelCase) });
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            set({ invoicesLoading: false });
        }
    },

    createInvoice: async (data) => {
        try {
            const { data: result, error } = await supabase
                .from('invoices')
                .insert({
                    quotation_id: data.quotationId,
                    customer_name: data.customerName,
                    customer_address: data.customerAddress,
                    customer_contact: data.customerContact,
                    customer_phone: data.customerPhone,
                    items: data.items,
                    subtotal: data.subtotal,
                    discount_amount: data.discountAmount,
                    discount_note: data.discountNote,
                    total_price: data.totalPrice,
                    due_date: data.dueDate,
                    payment_terms: data.paymentTerms,
                    notes: data.notes,
                    status: data.status || 'draft'
                })
                .select()
                .single();

            if (error) throw error;

            const invoice = toCamelCase(result);
            set(state => ({ invoices: [invoice, ...state.invoices] }));
            return invoice;
        } catch (error) {
            console.error('Error creating invoice:', error);
            return null;
        }
    },

    // Create Invoice from Quotation with SNAPSHOT pattern
    createInvoiceFromQuotation: async (quotationId, dueDate, paymentTerms = 'Net 30') => {
        try {
            // Fetch quotation directly from Supabase
            const { data: quotationData, error: quotationError } = await supabase
                .from('quotations')
                .select('*')
                .eq('id', quotationId)
                .single();

            if (quotationError || !quotationData) {
                console.error('Quotation not found:', quotationError);
                return null;
            }

            // SNAPSHOT: Copy all data from quotation
            const invoiceData = {
                quotationId,
                customerName: quotationData.customer_name,
                customerAddress: quotationData.customer_address || '',
                customerContact: quotationData.customer_contact || '',
                customerPhone: quotationData.customer_phone || '',
                items: quotationData.items || [],
                subtotal: parseFloat(quotationData.subtotal) || 0,
                discountAmount: parseFloat(quotationData.discount_amount) || 0,
                discountNote: quotationData.discount_note || '',
                totalPrice: parseFloat(quotationData.total_price) || 0,
                dueDate,
                paymentTerms,
                notes: '',
                status: 'draft' as InvoiceStatus
            };

            return await get().createInvoice(invoiceData);
        } catch (error) {
            console.error('Error creating invoice from quotation:', error);
            return null;
        }
    },

    updateInvoice: async (id, updates) => {
        try {
            const updateData: any = {};
            if (updates.customerName !== undefined) updateData.customer_name = updates.customerName;
            if (updates.customerAddress !== undefined) updateData.customer_address = updates.customerAddress;
            if (updates.customerContact !== undefined) updateData.customer_contact = updates.customerContact;
            if (updates.customerPhone !== undefined) updateData.customer_phone = updates.customerPhone;
            if (updates.items !== undefined) updateData.items = updates.items;
            if (updates.subtotal !== undefined) updateData.subtotal = updates.subtotal;
            if (updates.discountAmount !== undefined) updateData.discount_amount = updates.discountAmount;
            if (updates.discountNote !== undefined) updateData.discount_note = updates.discountNote;
            if (updates.totalPrice !== undefined) updateData.total_price = updates.totalPrice;
            if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
            if (updates.paymentTerms !== undefined) updateData.payment_terms = updates.paymentTerms;
            if (updates.notes !== undefined) updateData.notes = updates.notes;
            if (updates.status !== undefined) updateData.status = updates.status;

            const { error } = await supabase
                .from('invoices')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            set(state => ({
                invoices: state.invoices.map(inv =>
                    inv.id === id ? { ...inv, ...updates, updatedAt: new Date().toISOString() } : inv
                )
            }));
        } catch (error) {
            console.error('Error updating invoice:', error);
        }
    },

    updateInvoiceStatus: async (id, status) => {
        await get().updateInvoice(id, { status });
    },

    deleteInvoice: async (id) => {
        try {
            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', id);

            if (error) throw error;
            set(state => ({
                invoices: state.invoices.filter(inv => inv.id !== id)
            }));
        } catch (error) {
            console.error('Error deleting invoice:', error);
        }
    }
});
