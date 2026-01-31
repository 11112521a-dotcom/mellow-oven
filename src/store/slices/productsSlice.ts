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
        const { id, variants, ...productData } = product;

        const { data, error } = await supabase.from('products').insert(productData).select().single();
        if (error) {
            console.error('Error adding product:', error);
        } else if (data) {
            set((state) => ({
                products: state.products.map((p) => p.id === tempId ? { ...p, id: data.id } : p)
            }));
        }
    },

    updateProduct: async (id, updates) => {
        set((state) => ({
            products: state.products.map((p) => p.id === id ? { ...p, ...updates } : p)
        }));
        const { variants, ...updatesWithoutVariants } = updates as any;
        await supabase.from('products').update(updatesWithoutVariants).eq('id', id);
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
        set(state => ({ productionForecasts: [...state.productionForecasts, newForecast] }));

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
    }
});
