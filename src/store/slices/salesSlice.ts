import { StateCreator } from 'zustand';
import { AppState, SalesSlice } from '../types';
import { supabase, fetchAllRows } from '../../lib/supabase';

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
            eat_qty: log.eatQty || 0, // NEW
            giveaway_qty: log.giveawayQty || 0, // NEW
            weather_condition: log.weatherCondition || null
        };
        const { error } = await supabase.from('product_sales').insert(dbLog);
        if (error) console.error('Error adding product sale log:', error);
    },

    addProductSaleLogs: async (logs) => {
        if (logs.length === 0) return;

        set(state => ({ productSales: [...state.productSales, ...logs] }));

        const dbLogs = logs.map(log => ({
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
            eat_qty: log.eatQty || 0,
            giveaway_qty: log.giveawayQty || 0,
            weather_condition: log.weatherCondition || null
        }));

        const { error } = await supabase.from('product_sales').insert(dbLogs);
        if (error) {
            throw new Error(`Error adding product sale logs: ${error.message}`);
        }
    },

    fetchProductSales: async () => {
        // ⚡ ใช้ fetchAllRows() เพื่อป้องกัน 1000-row cap อย่างถาวร
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await fetchAllRows<any>('product_sales', {
            orderBy: 'sale_date',
            ascending: false
        });

        const mappedData = data.map(row => ({
            id: row.id,
            recordedAt: row.recorded_at,
            saleDate: row.sale_date,
            marketId: row.market_id,
            marketName: row.market_name,
            productId: row.product_id,
            productName: row.product_name,
            category: row.category,
            quantitySold: row.quantity_sold,
            pricePerUnit: row.price_per_unit,
            totalRevenue: row.total_revenue,
            costPerUnit: row.cost_per_unit,
            totalCost: row.total_cost,
            grossProfit: row.gross_profit,
            variantId: row.variant_id,
            variantName: row.variant_name,
            wasteQty: row.waste_qty,
            eatQty: row.eat_qty, // NEW
            giveawayQty: row.giveaway_qty, // NEW
            weatherCondition: row.weather_condition
        }));

        set({ productSales: mappedData });
    },

    getProductSalesByDate: (date) => get().productSales.filter(sale => sale.saleDate === date),

    getProductSalesByDateRange: (fromDate, toDate) => {
        return get().productSales.filter(sale =>
            sale.saleDate >= fromDate && sale.saleDate <= toDate
        );
    },

    getProductSalesByProduct: (productId) => get().productSales.filter(sale => sale.productId === productId),

    updateProductSaleLog: async (id, updates) => {
        // Map frontend camelCase updates to backend snake_case for DB
        const dbUpdates: any = { ...updates };
        if (updates.quantitySold !== undefined) dbUpdates.quantity_sold = updates.quantitySold;
        if (updates.totalRevenue !== undefined) dbUpdates.total_revenue = updates.totalRevenue;
        if (updates.totalCost !== undefined) dbUpdates.total_cost = updates.totalCost;
        if (updates.grossProfit !== undefined) dbUpdates.gross_profit = updates.grossProfit;
        if (updates.eatQty !== undefined) dbUpdates.eat_qty = updates.eatQty; // NEW
        if (updates.giveawayQty !== undefined) dbUpdates.giveaway_qty = updates.giveawayQty; // NEW

        // Remove camelCase keys from dbUpdates to avoid errors
        delete dbUpdates.quantitySold;
        delete dbUpdates.totalRevenue;
        delete dbUpdates.totalCost;
        delete dbUpdates.grossProfit;
        delete dbUpdates.eatQty;
        delete dbUpdates.giveawayQty;

        set(state => ({
            productSales: state.productSales.map(log => log.id === id ? { ...log, ...updates } : log)
        }));
        await supabase.from('product_sales').update(dbUpdates).eq('id', id);
    },

    addMarket: async (market) => {
        const newMarket = {
            ...market,
            isActive: market.isActive !== undefined ? market.isActive : true,
            type: market.type || 'market'
        };
        set((state) => {
            const updatedMarkets = [...state.markets, newMarket];
            try {
                localStorage.setItem('mellow_oven_market_overrides', JSON.stringify(
                    updatedMarkets.map(m => ({ id: m.id, isActive: m.isActive, type: m.type }))
                ));
            } catch (e) {}
            return { markets: updatedMarkets };
        });
        
        const dbPayload: any = {
            id: newMarket.id,
            name: newMarket.name,
            location: newMarket.location,
            description: newMarket.description,
            color: newMarket.color,
            is_active: newMarket.isActive,
            type: newMarket.type
        };
        
        try {
            const { error } = await supabase.from('markets').insert(dbPayload);
            if (error) {
                delete dbPayload.is_active;
                delete dbPayload.type;
                await supabase.from('markets').insert(dbPayload);
            }
        } catch (e) {}
    },

    updateMarket: async (id, updates) => {
        set((state) => {
            const updatedMarkets = state.markets.map((m) => m.id === id ? { ...m, ...updates } : m);
            try {
                localStorage.setItem('mellow_oven_market_overrides', JSON.stringify(
                    updatedMarkets.map(m => ({ id: m.id, isActive: m.isActive, type: m.type }))
                ));
            } catch (e) {}
            return { markets: updatedMarkets };
        });
        
        const dbUpdates: any = { ...updates };
        if (updates.isActive !== undefined) {
            dbUpdates.is_active = updates.isActive;
            delete dbUpdates.isActive;
        }
        
        try {
            const { error } = await supabase.from('markets').update(dbUpdates).eq('id', id);
            if (error) {
                delete dbUpdates.is_active;
                delete dbUpdates.type;
                if (Object.keys(dbUpdates).length > 0) {
                    await supabase.from('markets').update(dbUpdates).eq('id', id);
                }
            }
        } catch (e) {}
    },

    removeMarket: async (id) => {
        set((state) => {
            const updatedMarkets = state.markets.filter((m) => m.id !== id);
            try {
                localStorage.setItem('mellow_oven_market_overrides', JSON.stringify(
                    updatedMarkets.map(m => ({ id: m.id, isActive: m.isActive, type: m.type }))
                ));
            } catch (e) {}
            return { markets: updatedMarkets };
        });
        await supabase.from('markets').delete().eq('id', id);
    },

    marketSchedules: [],
    fetchMarketSchedules: async () => {
        const { data, error } = await supabase.from('market_schedules').select('*');
        if (!error && data) {
            const mappedData = data.map(row => ({
                id: row.id,
                marketId: row.market_id,
                dayOfWeek: row.day_of_week,
                isActive: row.is_active,
                createdAt: row.created_at
            }));
            set({ marketSchedules: mappedData });
        }
    },
    addMarketSchedule: async (schedule) => {
        const newSchedule = { ...schedule, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set(state => ({ marketSchedules: [...state.marketSchedules, newSchedule] }));
        
        // Sync with Supabase
        const dbSchedule = {
            id: newSchedule.id,
            market_id: newSchedule.marketId,
            day_of_week: newSchedule.dayOfWeek,
            is_active: newSchedule.isActive,
            created_at: newSchedule.createdAt
        };
        await supabase.from('market_schedules').insert(dbSchedule);
    },
    updateMarketSchedule: async (id, updates) => {
        set(state => ({
            marketSchedules: state.marketSchedules.map(s => s.id === id ? { ...s, ...updates } : s)
        }));

        const dbUpdates: any = {};
        if (updates.marketId !== undefined) dbUpdates.market_id = updates.marketId;
        if (updates.dayOfWeek !== undefined) dbUpdates.day_of_week = updates.dayOfWeek;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

        if (Object.keys(dbUpdates).length > 0) {
            await supabase.from('market_schedules').update(dbUpdates).eq('id', id);
        }
    },
    removeMarketSchedule: async (id) => {
        set(state => ({
            marketSchedules: state.marketSchedules.filter(s => s.id !== id)
        }));
        await supabase.from('market_schedules').delete().eq('id', id);
    }
});
