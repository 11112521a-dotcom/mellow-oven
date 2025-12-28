import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState } from './types';
import { createAuthSlice } from './slices/authSlice';
import { createFinanceSlice } from './slices/financeSlice';
import { createInventorySlice } from './slices/inventorySlice';
import { createProductsSlice } from './slices/productsSlice';
import { createSalesSlice } from './slices/salesSlice';
import { createPromotionSlice } from './slices/promotionSlice';
import { supabase } from '../lib/supabase';
import {
    mapTransaction, mapIngredient, mapProductSaleLog,
    mapDailyInventory, mapProductionForecast
} from './helpers/mappers';
import { Promotion, Bundle, SpecialOrder, Market, Product } from '../../types';

export const useStore = create<AppState>()(
    persist(
        (set, get, api) => ({
            // ==================== SLICES ====================
            ...createAuthSlice(set, get, api),
            ...createFinanceSlice(set, get, api),
            ...createInventorySlice(set, get, api),
            ...createProductsSlice(set, get, api),
            ...createSalesSlice(set, get, api),
            ...createPromotionSlice(set, get, api),

            // ==================== SHARED ACTIONS ====================
            storeName: 'Mellow Oven',
            setStoreName: (name) => set({ storeName: name }),
            loadStore: (newState) => set((state) => ({ ...state, ...newState })),

            resetStore: () => {
                localStorage.removeItem('mellow-oven-storage');
                window.location.reload();
            },

            // ==================== FETCH DATA (Complete Logic) ====================
            fetchData: async () => {
                const { data: products } = await supabase.from('products').select('*');
                const { data: ingredients } = await supabase.from('ingredients').select('*');
                const { data: markets } = await supabase.from('markets').select('*');
                const { data: transactions } = await supabase.from('transactions').select('*').order('date', { ascending: false });
                const { data: productSales } = await supabase.from('product_sales').select('*').order('sale_date', { ascending: false });
                const { data: productionForecasts } = await supabase.from('production_forecasts').select('*').order('forecast_for_date', { ascending: false });
                const { data: unallocatedProfitsData } = await supabase.from('unallocated_profits').select('*').order('date', { ascending: false });
                const { data: allocationProfilesData } = await supabase.from('allocation_profiles').select('*').order('created_at', { ascending: true });

                // Promotion & Snack Box System
                const { data: promotionsData } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
                const { data: bundlesData } = await supabase.from('bundles').select('*').order('created_at', { ascending: false });
                const { data: bundleItemsData } = await supabase.from('bundle_items').select('*');
                const { data: specialOrdersData } = await supabase.from('special_orders').select('*').order('delivery_date', { ascending: false });
                const { data: specialOrderItemsData } = await supabase.from('special_order_items').select('*');

                // Map snake_case from DB to camelCase for App
                const mappedIngredients = ingredients?.map(i => ({
                    ...i,
                    currentStock: Number(i.current_stock),
                    costPerUnit: Number(i.cost_per_unit),
                    buyUnit: i.buy_unit,
                    conversionRate: Number(i.conversion_rate) || 1,
                    minStock: Number(i.min_stock) || 10,
                    isHidden: i.is_hidden,
                })) || [];

                const mappedTransactions = transactions?.map(t => ({
                    ...t,
                    fromJar: t.from_jar,
                    toJar: t.to_jar,
                    marketId: t.market_id
                })) || [];

                const mappedProductSales = productSales?.map(s => ({
                    id: s.id,
                    recordedAt: s.recorded_at,
                    saleDate: s.sale_date,
                    marketId: s.market_id,
                    marketName: s.market_name,
                    productId: s.product_id,
                    productName: s.product_name,
                    category: s.category,
                    quantitySold: s.quantity_sold,
                    pricePerUnit: s.price_per_unit,
                    totalRevenue: s.total_revenue,
                    costPerUnit: s.cost_per_unit,
                    totalCost: s.total_cost,
                    grossProfit: s.gross_profit,
                    variantId: s.variant_id,
                    variantName: s.variant_name,
                    wasteQty: s.waste_qty || 0,
                    weatherCondition: s.weather_condition || null
                })) || [];

                const mappedProductionForecasts = productionForecasts?.map(f => ({
                    id: f.id,
                    createdAt: f.created_at,
                    productId: f.product_id,
                    productName: f.product_name,
                    marketId: f.market_id,
                    marketName: f.market_name,
                    forecastForDate: f.forecast_for_date,
                    weatherForecast: f.weather_forecast,
                    historicalDataPoints: f.historical_data_points,
                    baselineForecast: f.baseline_forecast,
                    weatherAdjustedForecast: f.weather_adjusted_forecast,
                    lambdaPoisson: f.lambda_poisson,
                    optimalQuantity: f.optimal_quantity,
                    serviceLevelTarget: f.service_level_target,
                    stockoutProbability: f.stockout_probability,
                    wasteProbability: f.waste_probability,
                    unitPrice: f.unit_price,
                    unitCost: f.unit_cost,
                    expectedDemand: f.expected_demand,
                    expectedProfit: f.expected_profit,
                    confidenceLevel: f.confidence_level,
                    predictionIntervalLower: f.prediction_interval_lower,
                    predictionIntervalUpper: f.prediction_interval_upper,
                    outliersRemoved: f.outliers_removed
                })) || [];

                // Map allocation_profiles from Supabase to app format
                const mappedAllocationProfiles = allocationProfilesData?.map(p => ({
                    id: p.id,
                    name: p.name,
                    allocations: {
                        Working: Number(p.alloc_working),
                        CapEx: Number(p.alloc_capex),
                        Opex: Number(p.alloc_opex),
                        Emergency: Number(p.alloc_emergency),
                        Owner: Number(p.alloc_owner)
                    }
                })) || [];

                // Map Promotions
                const mappedPromotions: Promotion[] = (promotionsData || []).map(p => ({
                    id: p.id,
                    name: p.name,
                    description: p.description,
                    productId: p.product_id,
                    productName: p.product_name,
                    variantId: p.variant_id,
                    variantName: p.variant_name,
                    originalPrice: p.original_price,
                    discountPrice: p.discount_price,
                    discountPercent: p.discount_percent,
                    minQuantity: p.min_quantity,
                    maxQuantity: p.max_quantity,
                    validFrom: p.valid_from,
                    validUntil: p.valid_until,
                    isActive: p.is_active,
                    createdAt: p.created_at,
                    updatedAt: p.updated_at
                }));

                // Map Bundles with items
                const mappedBundles: Bundle[] = (bundlesData || []).map(b => ({
                    id: b.id,
                    name: b.name,
                    description: b.description,
                    bundlePrice: b.bundle_price,
                    estimatedCost: b.estimated_cost,
                    profitMargin: b.profit_margin,
                    isActive: b.is_active,
                    imageUrl: b.image_url,
                    createdAt: b.created_at,
                    updatedAt: b.updated_at,
                    items: (bundleItemsData || [])
                        .filter(i => i.bundle_id === b.id)
                        .map(i => ({
                            id: i.id,
                            bundleId: i.bundle_id,
                            productId: i.product_id,
                            productName: i.product_name,
                            variantId: i.variant_id,
                            variantName: i.variant_name,
                            quantity: i.quantity,
                            unitCost: i.unit_cost,
                            subtotalCost: i.subtotal_cost,
                            sortOrder: i.sort_order
                        }))
                }));

                // Map Special Orders with items
                const mappedSpecialOrders: SpecialOrder[] = (specialOrdersData || []).map(o => ({
                    id: o.id,
                    orderNumber: o.order_number,
                    orderDate: o.order_date,
                    deliveryDate: o.delivery_date,
                    orderType: o.order_type,
                    promotionId: o.promotion_id,
                    bundleId: o.bundle_id,
                    customerName: o.customer_name,
                    customerPhone: o.customer_phone,
                    customerNote: o.customer_note,
                    totalQuantity: o.total_quantity,
                    totalRevenue: o.total_revenue,
                    totalCost: o.total_cost,
                    grossProfit: o.gross_profit,
                    status: o.status,
                    stockDeducted: o.stock_deducted,
                    stockDeductedAt: o.stock_deducted_at,
                    createdAt: o.created_at,
                    updatedAt: o.updated_at,
                    items: (specialOrderItemsData || [])
                        .filter(i => i.special_order_id === o.id)
                        .map(i => ({
                            id: i.id,
                            specialOrderId: i.special_order_id,
                            productId: i.product_id,
                            productName: i.product_name,
                            variantId: i.variant_id,
                            variantName: i.variant_name,
                            quantity: i.quantity,
                            unitPrice: i.unit_price,
                            unitCost: i.unit_cost,
                            subtotalRevenue: i.subtotal_revenue,
                            subtotalCost: i.subtotal_cost,
                            subtotalProfit: i.subtotal_profit,
                            sortOrder: i.sort_order
                        }))
                }));

                // Find default profile ID from Supabase
                const defaultProfile = allocationProfilesData?.find(p => p.is_default);
                const dbDefaultProfileId = defaultProfile?.id || null;

                // Calculate jar balances from transactions
                const calculatedBalances: Record<string, number> = {
                    'Working': 0,
                    'CapEx': 0,
                    'Opex': 0,
                    'Emergency': 0,
                    'Owner': 0
                };

                mappedTransactions.forEach(tx => {
                    if (tx.type === 'INCOME' && tx.toJar) {
                        calculatedBalances[tx.toJar] = (calculatedBalances[tx.toJar] || 0) + tx.amount;
                    } else if (tx.type === 'EXPENSE' && tx.fromJar) {
                        calculatedBalances[tx.fromJar] = (calculatedBalances[tx.fromJar] || 0) - tx.amount;
                    } else if (tx.type === 'TRANSFER') {
                        if (tx.fromJar) calculatedBalances[tx.fromJar] = (calculatedBalances[tx.fromJar] || 0) - tx.amount;
                        if (tx.toJar) calculatedBalances[tx.toJar] = (calculatedBalances[tx.toJar] || 0) + tx.amount;
                    }
                });

                set((state) => {
                    // Merge products with local state to preserve variants
                    const mergedProducts = products?.map(dbProduct => {
                        const localProduct = state.products.find(p => p.id === dbProduct.id);
                        if (localProduct) {
                            return {
                                ...dbProduct,
                                variants: (localProduct.variants && (!dbProduct.variants || dbProduct.variants.length === 0))
                                    ? localProduct.variants
                                    : dbProduct.variants
                            };
                        }
                        return dbProduct;
                    }) || state.products;

                    return {
                        ...state,
                        products: mergedProducts,
                        ingredients: ingredients ? mappedIngredients : state.ingredients,
                        markets: markets || state.markets,
                        transactions: transactions ? mappedTransactions : state.transactions,
                        productSales: productSales ? mappedProductSales : state.productSales,
                        productionForecasts: productionForecasts ? mappedProductionForecasts : state.productionForecasts,
                        unallocatedProfits: unallocatedProfitsData?.map(p => ({
                            id: p.id,
                            date: p.date,
                            amount: p.amount,
                            source: p.source,
                            createdAt: p.created_at
                        })) || state.unallocatedProfits,
                        allocationProfiles: mappedAllocationProfiles.length > 0 ? mappedAllocationProfiles : state.allocationProfiles,
                        defaultProfileId: dbDefaultProfileId || state.defaultProfileId,
                        promotions: mappedPromotions,
                        bundles: mappedBundles,
                        specialOrders: mappedSpecialOrders,
                        jars: state.jars.map(jar => ({
                            ...jar,
                            balance: calculatedBalances[jar.id] || 0
                        }))
                    };
                });
                get().generateAlerts();
            },

            // ==================== REALTIME SUBSCRIPTIONS ====================
            subscribeToRealtime: () => {
                // Transactions
                supabase.channel('public:transactions')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
                        if (payload.eventType === 'INSERT') {
                            set(state => {
                                if (state.transactions.some(t => t.id === payload.new.id)) return state;
                                return { transactions: [mapTransaction(payload.new as any), ...state.transactions] };
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            set(state => ({ transactions: state.transactions.map(t => t.id === payload.new.id ? mapTransaction(payload.new as any) : t) }));
                        } else if (payload.eventType === 'DELETE') {
                            set(state => ({ transactions: state.transactions.filter(t => t.id !== payload.old.id) }));
                        }
                    })
                    .subscribe();

                // Ingredients
                supabase.channel('public:ingredients')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, (payload) => {
                        if (payload.eventType === 'INSERT') {
                            set(state => {
                                if (state.ingredients.some(i => i.id === payload.new.id)) return state;
                                return { ingredients: [mapIngredient(payload.new as any), ...state.ingredients] };
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            set(state => ({ ingredients: state.ingredients.map(i => i.id === payload.new.id ? mapIngredient(payload.new as any) : i) }));
                        } else if (payload.eventType === 'DELETE') {
                            set(state => ({ ingredients: state.ingredients.filter(i => i.id !== payload.old.id) }));
                        }
                    })
                    .subscribe();

                // Production Forecasts
                supabase.channel('public:production_forecasts')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'production_forecasts' }, (payload) => {
                        if (payload.eventType === 'INSERT') {
                            set(state => {
                                if (state.productionForecasts.some(f => f.id === payload.new.id)) return state;
                                return { productionForecasts: [mapProductionForecast(payload.new as any), ...state.productionForecasts] };
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            set(state => ({ productionForecasts: state.productionForecasts.map(f => f.id === payload.new.id ? mapProductionForecast(payload.new as any) : f) }));
                        } else if (payload.eventType === 'DELETE') {
                            set(state => ({ productionForecasts: state.productionForecasts.filter(f => f.id !== payload.old.id) }));
                        }
                    })
                    .subscribe();

                // Markets
                supabase.channel('public:markets')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, (payload) => {
                        if (payload.eventType === 'INSERT') {
                            set(state => {
                                if (state.markets.some(m => m.id === payload.new.id)) return state;
                                return { markets: [...state.markets, payload.new as Market] };
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            set(state => ({ markets: state.markets.map(m => m.id === payload.new.id ? payload.new as Market : m) }));
                        } else if (payload.eventType === 'DELETE') {
                            set(state => ({ markets: state.markets.filter(m => m.id !== payload.old.id) }));
                        }
                    })
                    .subscribe();

                // Products
                supabase.channel('public:products')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
                        if (payload.eventType === 'INSERT') {
                            set(state => {
                                if (state.products.some(p => p.id === payload.new.id)) return state;
                                return { products: [...state.products, payload.new as Product] };
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            set(state => ({ products: state.products.map(p => p.id === payload.new.id ? payload.new as Product : p) }));
                        } else if (payload.eventType === 'DELETE') {
                            set(state => ({ products: state.products.filter(p => p.id !== payload.old.id) }));
                        }
                    })
                    .subscribe();

                // Product Sales
                supabase.channel('public:product_sales')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'product_sales' }, (payload) => {
                        if (payload.eventType === 'INSERT') {
                            set(state => {
                                if (state.productSales.some(s => s.id === payload.new.id)) return state;
                                return { productSales: [mapProductSaleLog(payload.new as any), ...state.productSales] };
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            set(state => ({ productSales: state.productSales.map(s => s.id === payload.new.id ? mapProductSaleLog(payload.new as any) : s) }));
                        } else if (payload.eventType === 'DELETE') {
                            set(state => ({ productSales: state.productSales.filter(s => s.id !== payload.old.id) }));
                        }
                    })
                    .subscribe();

                // Daily Inventory
                supabase.channel('public:daily_inventory')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_inventory' }, (payload) => {
                        if (payload.eventType === 'INSERT') {
                            set(state => {
                                if (state.dailyInventory.some(d => d.id === payload.new.id)) return state;
                                return { dailyInventory: [...state.dailyInventory, mapDailyInventory(payload.new as any)] };
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            set(state => ({ dailyInventory: state.dailyInventory.map(d => d.id === payload.new.id ? mapDailyInventory(payload.new as any) : d) }));
                        } else if (payload.eventType === 'DELETE') {
                            set(state => ({ dailyInventory: state.dailyInventory.filter(d => d.id !== payload.old.id) }));
                        }
                    })
                    .subscribe();
            },

            unsubscribeFromRealtime: () => {
                supabase.removeAllChannels();
            }
        }),
        {
            name: 'mellow-oven-storage',
            partialize: (state) => ({
                storeName: state.storeName,
                jars: state.jars,
                jarCustomizations: state.jarCustomizations,
                defaultProfileId: state.defaultProfileId,
                products: state.products,
                productSales: state.productSales
            })
        }
    )
);
