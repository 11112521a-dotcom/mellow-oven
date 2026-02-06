import { StateCreator } from 'zustand';
import { AppState, ProductsSlice } from '../types';
import { supabase } from '../../lib/supabase';
import { Product } from '../../../types';
import { ProductionForecast } from '../../lib/forecasting/types';
import { forecastOutputToDbFormat } from '../../lib/forecasting/types';

export const createProductsSlice: StateCreator<AppState, [], [], ProductsSlice> = (set, get) => ({
    products: [],
    dailyReports: [],
    productionForecasts: [],

    addProduct: async (product) => {
        const tempId = product.id;
        set((state) => ({ products: [...state.products, product] }));

        // Remove client-generated id (let Supabase generate it)
        // But KEEP variants for JSONB storage
        const { id, ...productData } = product;

        const { data, error } = await supabase.from('products').insert(productData).select().single();
        if (error) {
            console.error('Error adding product:', error);
            // Rollback on error
            set((state) => ({ products: state.products.filter(p => p.id !== tempId) }));
        } else if (data) {
            set((state) => ({
                products: state.products.map((p) => p.id === tempId ? { ...p, id: data.id } : p)
            }));
            console.log('[addProduct] Successfully added:', data.name);
        }
    },

    updateProduct: async (id, updates) => {
        set((state) => ({
            products: state.products.map((p) => p.id === id ? { ...p, ...updates } : p)
        }));
        // Now include variants in DB update (JSONB column)
        const { error } = await supabase.from('products').update(updates).eq('id', id);
        if (error) {
            console.error('[updateProduct] DB update failed:', error);
        }
    },

    removeProduct: async (id) => {
        // FIX: Pessimistic Delete - wait for DB success before updating local state
        try {
            const { error } = await supabase.from('products').delete().eq('id', id);

            if (error) {
                console.error('[removeProduct] Database delete failed:', error);
                throw new Error(`ลบสินค้าไม่สำเร็จ: ${error.message}`);
            }

            // Only update local state AFTER DB success
            set((state) => ({ products: state.products.filter((p) => p.id !== id) }));

            console.log('[removeProduct] Successfully deleted product:', id);
        } catch (err) {
            console.error('[removeProduct] Error:', err);
            throw err;  // Re-throw for UI to handle
        }
    },

    /**
     * 🆕 Toggle product active/inactive status (สวิตช์พักขาย)
     * @param id Product ID to toggle
     * @description When inactive, product won't appear in sales, reports, POS, etc.
     */
    toggleProductActive: async (id) => {
        const product = get().products.find((p) => p.id === id);
        if (!product) {
            console.warn('[toggleProductActive] Product not found:', id);
            return;
        }

        // Toggle: undefined/true -> false, false -> true
        const newStatus = product.isActive === false ? true : false;

        try {
            // 🛡️ Pessimistic Update: Wait for DB before updating local state
            const { error } = await supabase
                .from('products')
                .update({ is_active: newStatus })
                .eq('id', id);

            if (error) {
                console.error('[toggleProductActive] Database update failed:', error);
                throw new Error(`เปลี่ยนสถานะไม่สำเร็จ: ${error.message}`);
            }

            // Update local state AFTER DB success
            set((state) => ({
                products: state.products.map((p) =>
                    p.id === id ? { ...p, isActive: newStatus } : p
                )
            }));

            console.log('[toggleProductActive] Success:', id, '->', newStatus ? 'เปิดขาย' : 'พักขาย');
        } catch (err) {
            console.error('[toggleProductActive] Error:', err);
            throw err;
        }
    },

    /**
     * 🆕 Toggle variant active/inactive status (สวิตช์พักขายระดับ Variant)
     * @param productId Product ID containing the variant
     * @param variantId Variant ID to toggle
     * @description When inactive, variant won't appear in sales, reports, POS, etc.
     */
    toggleVariantActive: async (productId, variantId) => {
        const product = get().products.find((p) => p.id === productId);
        if (!product?.variants) {
            console.warn('[toggleVariantActive] Product or variants not found:', productId);
            return;
        }

        const variantIndex = product.variants.findIndex((v) => v.id === variantId);
        if (variantIndex === -1) {
            console.warn('[toggleVariantActive] Variant not found:', variantId);
            return;
        }

        const currentVariant = product.variants[variantIndex];
        const newStatus = currentVariant.isActive === false ? true : false;

        // 🛡️ Safety Check: Alert if all variants would be inactive
        const updatedVariants = product.variants.map((v) =>
            v.id === variantId ? { ...v, isActive: newStatus } : v
        );
        const allInactive = updatedVariants.every((v) => v.isActive === false);

        if (allInactive && !newStatus) {
            console.warn('[toggleVariantActive] All variants will be inactive!');
            // Note: UI should show alert to user, but we proceed with the update
        }

        try {
            // 🛡️ Pessimistic Update: Wait for DB before updating local state
            // Variants stored as JSONB in products table
            const { error } = await supabase
                .from('products')
                .update({ variants: updatedVariants })
                .eq('id', productId);

            if (error) {
                console.error('[toggleVariantActive] Database update failed:', error);
                throw new Error(`เปลี่ยนสถานะไม่สำเร็จ: ${error.message}`);
            }

            // Update local state AFTER DB success
            set((state) => ({
                products: state.products.map((p) =>
                    p.id === productId ? { ...p, variants: updatedVariants } : p
                )
            }));

            console.log('[toggleVariantActive] Success:', variantId, '->', newStatus ? 'เปิดขาย' : 'พักขาย');
        } catch (err) {
            console.error('[toggleVariantActive] Error:', err);
            throw err;
        }
    },

    addDailyReport: async (report) => {
        set((state) => ({ dailyReports: [...state.dailyReports, report] }));
        const dbReport = {
            id: report.id,
            date: report.date,
            market_id: report.marketId,
            market_context: report.marketContext,
            start_cash_float: report.startCashFloat,
            revenue: report.revenue,
            cogs_sold: report.cogsSold,
            waste_cost: report.wasteCost,
            opex_today: report.opexToday,
            net_profit: report.netProfit,
            allocations: report.allocations,
            bills_count: report.billsCount,
            aov: report.aov,
            sell_through_rate: report.sellThroughRate,
            logs: report.logs
        };
        await supabase.from('daily_sales_reports').insert(dbReport);
    },

    updateDailyReport: async (reportId, updates) => {
        set((state) => ({
            dailyReports: state.dailyReports.map(r => r.id === reportId ? { ...r, ...updates } : r)
        }));
        await supabase.from('daily_reports').update(updates).eq('id', reportId);
    },

    saveForecast: async (output, productId, productName, marketId, marketName, forecastForDate, weatherForecast) => {
        const forecastData = forecastOutputToDbFormat(output, productId, productName, marketId, marketName, forecastForDate, weatherForecast);
        const newForecast: ProductionForecast = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            ...forecastData
        };
        set(state => ({
            productionForecasts: [
                ...state.productionForecasts.filter(f =>
                    !(f.productId === productId && f.marketId === marketId && f.forecastForDate === forecastForDate)
                ),
                newForecast
            ]
        }));

        await supabase.from('production_forecasts').upsert({
            product_id: newForecast.productId,
            product_name: newForecast.productName,
            market_id: newForecast.marketId,
            market_name: newForecast.marketName,
            forecast_for_date: newForecast.forecastForDate,
            weather_forecast: newForecast.weatherForecast,
            historical_data_points: newForecast.historicalDataPoints,
            baseline_forecast: newForecast.baselineForecast,
            weather_adjusted_forecast: newForecast.weatherAdjustedForecast,
            lambda_poisson: newForecast.lambdaPoisson,
            optimal_quantity: newForecast.optimalQuantity,
            service_level_target: newForecast.serviceLevelTarget,
            stockout_probability: newForecast.stockoutProbability,
            waste_probability: newForecast.wasteProbability,
            unit_price: newForecast.unitPrice,
            unit_cost: newForecast.unitCost,
            expected_demand: newForecast.expectedDemand,
            expected_profit: newForecast.expectedProfit,
            confidence_level: newForecast.confidenceLevel,
            prediction_interval_lower: newForecast.predictionIntervalLower,
            prediction_interval_upper: newForecast.predictionIntervalUpper,
            outliers_removed: newForecast.outliersRemoved
        }, { onConflict: 'product_id,market_id,forecast_for_date' });
    },

    getForecastsByDate: (date) => get().productionForecasts.filter(f => f.forecastForDate === date),
    getLatestForecast: (productId, marketId, date) => {
        const forecasts = get().productionForecasts.filter(f => f.productId === productId && f.marketId === marketId && f.forecastForDate === date);
        if (forecasts.length === 0) return null;
        return forecasts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    },

    deleteForecastsForMarket: async (marketId) => {
        try {
            // Delete from Supabase
            const { error } = await supabase.from('production_forecasts').delete().eq('market_id', marketId);

            if (error) {
                console.error('Failed to delete forecasts for market:', error);
                throw error;
            }

            // Update local state by filtering out deleted forecasts
            set((state) => ({
                productionForecasts: state.productionForecasts.filter(f => f.marketId !== marketId)
            }));

            console.log('Successfully deleted forecasts for market:', marketId);
        } catch (error) {
            console.error('Error in deleteForecastsForMarket:', error);
            throw error;
        }
    },

    deleteForecastsByDate: async (date) => {
        try {
            // Delete from Supabase
            const { error } = await supabase.from('production_forecasts').delete().eq('forecast_for_date', date);

            if (error) {
                console.error('Failed to delete forecasts for date:', error);
                throw error;
            }

            // Update local state
            set((state) => ({
                productionForecasts: state.productionForecasts.filter(f => f.forecastForDate !== date)
            }));

            console.log('Successfully deleted forecasts for date:', date);
        } catch (error) {
            console.error('Error in deleteForecastsByDate:', error);
            throw error;
        }
    }
});
