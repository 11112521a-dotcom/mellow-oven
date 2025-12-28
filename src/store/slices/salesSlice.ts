import { StateCreator } from 'zustand';
import { AppState, SalesSlice } from '../types';
import { supabase } from '../../lib/supabase';

export const createSalesSlice: StateCreator<AppState, [], [], SalesSlice> = (set, get) => ({
    productSales: [],
    markets: [
        { id: 'storefront', name: 'หน้าร้าน (Storefront)', color: '#b08968' },
        { id: 'market-a', name: 'ตลาดนัด A', color: '#22c55e' },
        { id: 'market-b', name: 'ตลาดนัด B', color: '#3b82f6' }
    ],

    addProductSaleLog: async (log) => {
        set(state => ({ productSales: [...state.productSales, log] }));
        const dbLog = {
            id: log.id,
            recorded_at: log.recordedAt,
            sale_date: log.saleDate,
            market_id: log.marketId,
            market_name: log.marketName,
            product_id: log.productId,
            product_name: log.productName,
            category: log.category,
            quantity_sold: log.quantitySold,
            price_per_unit: log.pricePerUnit,
            total_revenue: log.totalRevenue,
            cost_per_unit: log.costPerUnit,
            total_cost: log.totalCost,
            gross_profit: log.grossProfit,
            variant_id: log.variantId,
            variant_name: log.variantName,
            waste_qty: log.wasteQty || 0,
            weather_condition: log.weatherCondition || null
        };
        const { error } = await supabase.from('product_sales').insert(dbLog);
        if (error) console.error('Error adding product sale log:', error);
    },

    getProductSalesByDate: (date) => get().productSales.filter(sale => sale.saleDate === date),
    getProductSalesByProduct: (productId) => get().productSales.filter(sale => sale.productId === productId),

    updateProductSaleLog: async (id, updates) => {
        set(state => ({
            productSales: state.productSales.map(log => log.id === id ? { ...log, ...updates } : log)
        }));
        await supabase.from('product_sales').update(updates).eq('id', id);
    },

    addMarket: async (market) => {
        set((state) => ({ markets: [...state.markets, market] }));
        await supabase.from('markets').insert(market);
    },
    updateMarket: async (id, updates) => {
        set((state) => ({ markets: state.markets.map((m) => m.id === id ? { ...m, ...updates } : m) }));
        await supabase.from('markets').update(updates).eq('id', id);
    },
    removeMarket: async (id) => {
        set((state) => ({ markets: state.markets.filter((m) => m.id !== id) }));
        await supabase.from('markets').delete().eq('id', id);
    }
});
