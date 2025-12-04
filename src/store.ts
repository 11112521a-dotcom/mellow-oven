import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './lib/supabase';
import { Jar, Transaction, Ingredient, PurchaseOrder, Product, DailyReport, JarType, Market, Goal, Alert, JarHistory, JarCustomization, UnallocatedProfit, ProductSaleLog, AllocationProfile, StockLog } from '../types';
import type { ForecastOutput } from './lib/forecasting';
import { ProductionForecast, forecastOutputToDbFormat } from './lib/forecasting/types';

interface AppState {
    // Settings
    storeName: string;
    setStoreName: (name: string) => void;
    loadStore: (state: Partial<AppState>) => void;
    fetchData: () => Promise<void>;

    // Finance
    jars: Jar[];
    transactions: Transaction[];
    addTransaction: (transaction: Transaction) => void;
    updateTransaction: (id: string, updates: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;
    updateJarBalance: (id: JarType, amount: number) => void;
    transferFunds: (from: JarType, to: JarType, amount: number, description: string) => void;

    // Unallocated Profit
    unallocatedProfits: UnallocatedProfit[];
    addUnallocatedProfit: (profit: UnallocatedProfit) => Promise<void>;
    deductUnallocatedProfit: (id: string, amount: number) => Promise<void>;
    allocateFromProfits: (amount: number) => Promise<void>;
    getUnallocatedBalance: () => number;
    getUnallocatedByDate: (date: string) => UnallocatedProfit[];

    // Allocation Profiles
    allocationProfiles: AllocationProfile[];
    saveAllocationProfile: (profile: AllocationProfile) => void;
    deleteAllocationProfile: (id: string) => void;

    // Product Sales Analytics
    productSales: ProductSaleLog[];
    addProductSaleLog: (log: ProductSaleLog) => Promise<void>;
    getProductSalesByDate: (date: string) => ProductSaleLog[];
    getProductSalesByProduct: (productId: string) => ProductSaleLog[];
    updateProductSaleLog: (id: string, updates: Partial<ProductSaleLog>) => Promise<void>;

    // Production Forecasts
    productionForecasts: ProductionForecast[];
    saveForecast: (
        output: ForecastOutput,
        productId: string,
        productName: string,
        marketId: string,
        marketName: string,
        forecastForDate: string,
        weatherForecast: string
    ) => Promise<void>;
    getForecastsByDate: (date: string) => ProductionForecast[];
    getLatestForecast: (productId: string, marketId: string, date: string) => ProductionForecast | null;

    // Inventory
    ingredients: Ingredient[];
    purchaseOrders: PurchaseOrder[];
    addIngredient: (ingredient: Ingredient) => Promise<void>;
    stockLogs: StockLog[];
    addStockLog: (log: StockLog) => Promise<void>;
    updateStock: (id: string, quantity: number, reason?: StockLog['reason'], note?: string) => Promise<void>; // quantity can be negative
    setIngredientStock: (id: string, quantity: number) => Promise<void>; // Set absolute value
    updateIngredient: (id: string, updates: Partial<Ingredient>) => Promise<void>;
    removeIngredient: (id: string) => Promise<void>;
    createPurchaseOrder: (po: PurchaseOrder) => void;
    cancelPurchaseOrder: (poId: string) => Promise<void>;
    updatePurchaseOrderStatus: (poId: string, status: 'COMPLETED' | 'CANCELLED') => void;


    // Sales & Products
    products: Product[];
    addProduct: (product: Product) => void;
    updateProduct: (id: string, updates: Partial<Product>) => void;
    removeProduct: (id: string) => void;
    dailyReports: DailyReport[];
    addDailyReport: (report: DailyReport) => void;
    updateDailyReport: (reportId: string, updates: Partial<DailyReport>) => void;

    // Markets
    markets: Market[];
    addMarket: (market: Market) => void;
    updateMarket: (id: string, updates: Partial<Market>) => void;
    removeMarket: (id: string) => void;

    // Goals (NEW!)
    goals: Goal[];
    addGoal: (goal: Goal) => void;
    updateGoal: (id: string, updates: Partial<Goal>) => void;
    removeGoal: (id: string) => void;
    updateGoalProgress: (goalId: string, amount: number) => void;

    // Alerts (NEW!)
    alerts: Alert[];
    addAlert: (alert: Alert) => void;
    dismissAlert: (id: string) => void;
    generateAlerts: () => void;

    // History & Analytics (NEW!)
    jarHistory: JarHistory[];
    recordDailyHistory: () => void;

    // Customization (NEW!)
    jarCustomizations: JarCustomization[];
    updateJarCustomization: (jarId: JarType, customization: Partial<JarCustomization>) => void;

    // Smart Functions (NEW!)
    autoAllocate: (totalAmount: number) => void;
    calculateHealthScore: () => number;

    // Actions
    deductStockByRecipe: (productId: string, quantity: number, variantId?: string) => void;
    resetStore: () => void;

    // Realtime
    subscribeToRealtime: () => void;
    unsubscribeFromRealtime: () => void;

    // Authentication
    user: any | null;
    session: any | null;
    userRole: 'owner' | 'staff' | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    checkSession: () => Promise<void>;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            // Settings
            storeName: 'Mellow Oven',
            setStoreName: (name) => set({ storeName: name }),
            loadStore: (newState) => set((state) => ({ ...state, ...newState })),
            fetchData: async () => {
                const { data: products } = await supabase.from('products').select('*');
                const { data: ingredients } = await supabase.from('ingredients').select('*');
                const { data: markets } = await supabase.from('markets').select('*');
                const { data: transactions } = await supabase.from('transactions').select('*').order('date', { ascending: false });
                const { data: productSales } = await supabase.from('product_sales').select('*').order('sale_date', { ascending: false });
                const { data: productionForecasts } = await supabase.from('production_forecasts').select('*').order('forecast_for_date', { ascending: false });

                // Map snake_case from DB to camelCase for App
                const mappedIngredients = ingredients?.map(i => ({
                    ...i,
                    currentStock: Number(i.current_stock),
                    costPerUnit: Number(i.cost_per_unit),
                    buyUnit: i.buy_unit,
                    conversionRate: Number(i.conversion_rate) || 1,
                    minStock: Number(i.min_stock) || 10, // Default to 10 if not set
                    isHidden: i.is_hidden,
                    // image field removed
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
                    variantName: s.variant_name
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

                // Calculate Jar Balances from Transactions
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
                    // 1. Create a map of DB products for easy lookup
                    const dbProductMap = new Map(products?.map(p => [p.id, p]));

                    // 2. Merge logic:
                    //    - Start with ALL local products (to preserve unsynced ones)
                    //    - Update them with DB data if available (preserving local variants)
                    //    - Add any NEW products from DB that aren't in local

                    const mergedProducts = [...state.products];

                    // Update or Add from DB
                    products?.forEach(dbProduct => {
                        const localIndex = mergedProducts.findIndex(p => p.id === dbProduct.id);

                        if (localIndex >= 0) {
                            // Exists locally: Merge
                            const localProduct = mergedProducts[localIndex];
                            mergedProducts[localIndex] = {
                                ...dbProduct,
                                // Keep local variants if DB has none (fix for missing column)
                                variants: (localProduct.variants && (!dbProduct.variants || dbProduct.variants.length === 0))
                                    ? localProduct.variants
                                    : dbProduct.variants
                            };
                        } else {
                            // New from DB: Add
                            mergedProducts.push(dbProduct);
                        }
                    });

                    return {
                        ...state,
                        products: mergedProducts,
                        ingredients: ingredients ? mappedIngredients : state.ingredients,
                        markets: markets || state.markets,
                        transactions: transactions ? mappedTransactions : state.transactions,
                        productSales: productSales ? mappedProductSales : state.productSales,
                        productionForecasts: productionForecasts ? mappedProductionForecasts : state.productionForecasts,
                        jars: state.jars.map(jar => ({
                            ...jar,
                            balance: calculatedBalances[jar.id] || 0
                        }))
                    };
                });
                get().generateAlerts(); // Generate alerts after data load
            },

            jars: [
                { id: 'Working', name: 'Working Capital', balance: 0, allocationPercent: 0.2, description: 'หมุนเวียน' },
                { id: 'CapEx', name: 'CapEx', balance: 0, allocationPercent: 0.45, description: 'ลงทุน/ซ่อมแซม' },
                { id: 'Opex', name: 'Opex', balance: 0, allocationPercent: 0.1, description: 'ค่าใช้จ่ายดำเนินงาน' },
                { id: 'Emergency', name: 'Emergency', balance: 0, allocationPercent: 0.05, description: 'ฉุกเฉิน' },
                { id: 'Owner', name: 'Owner', balance: 0, allocationPercent: 0.2, description: 'กำไรเจ้าของ' },
            ],
            transactions: [],
            ingredients: [],
            purchaseOrders: [],
            products: [],
            dailyReports: [],
            markets: [
                { id: 'storefront', name: 'หน้าร้าน (Storefront)', color: '#b08968' },
                { id: 'market-a', name: 'ตลาดนัด A', color: '#22c55e' },
                { id: 'market-b', name: 'ตลาดนัด B', color: '#3b82f6' }
            ],

            // NEW: Goals, Alerts, History, Customizations
            goals: [],
            alerts: [],
            jarHistory: [],
            jarCustomizations: [],

            // Unallocated Profits
            unallocatedProfits: [],

            // Allocation Profiles
            allocationProfiles: [
                {
                    id: 'default',
                    name: 'มาตรฐาน (Standard)',
                    allocations: {
                        'Working': 20,
                        'CapEx': 45,
                        'Opex': 10,
                        'Emergency': 5,
                        'Owner': 20
                    }
                }
            ],

            // Product Sales Analytics
            productSales: [],

            // Production Forecasts
            productionForecasts: [],

            // Stock Logs
            stockLogs: [],

            addStockLog: async (log) => {
                const dbLog = {
                    id: log.id,
                    date: log.date,
                    ingredient_id: log.ingredientId,
                    amount: log.amount,
                    reason: log.reason,
                    note: log.note
                };
                const { error } = await supabase.from('stock_logs').insert(dbLog);
                if (!error) {
                    set(state => ({ stockLogs: [log, ...state.stockLogs] }));
                } else {
                    console.error('Error adding stock log:', error);
                }
            },

            addTransaction: async (transaction) => {
                const dbTransaction = {
                    ...transaction,
                    from_jar: transaction.fromJar,
                    to_jar: transaction.toJar,
                    market_id: (transaction as any).marketId // Cast if needed
                };
                // Remove camelCase keys to avoid errors if strict
                delete (dbTransaction as any).fromJar;
                delete (dbTransaction as any).toJar;
                delete (dbTransaction as any).marketId;

                const { error } = await supabase.from('transactions').insert(dbTransaction);
                if (!error) {
                    set((state) => ({ transactions: [transaction, ...state.transactions] }));
                } else {
                    console.error('Error adding transaction:', error);
                }
            },

            updateTransaction: async (id, updates) => {
                const dbUpdates: any = { ...updates };
                if (updates.fromJar) {
                    dbUpdates.from_jar = updates.fromJar;
                    delete dbUpdates.fromJar;
                }
                if (updates.toJar) {
                    dbUpdates.to_jar = updates.toJar;
                    delete dbUpdates.toJar;
                }

                const { error } = await supabase.from('transactions').update(dbUpdates).eq('id', id);
                if (!error) {
                    set((state) => ({
                        transactions: state.transactions.map((tx) => tx.id === id ? { ...tx, ...updates } : tx)
                    }));
                }
            },

            deleteTransaction: async (id) => {
                // 1. Optimistic Update: Remove from local state IMMEDIATELY
                set((state) => ({
                    transactions: state.transactions.filter((tx) => tx.id !== id)
                }));

                // 2. Try DB Delete
                const { error } = await supabase.from('transactions').delete().eq('id', id);
                if (error) {
                    console.error('Error deleting transaction from DB (removed locally):', error);
                }
            },

            updateJarBalance: (id, amount) => set((state) => ({
                jars: state.jars.map((jar) => jar.id === id ? { ...jar, balance: jar.balance + amount } : jar)
            })),

            transferFunds: (from, to, amount, description) => {
                const { addTransaction, updateJarBalance } = get();
                // Optimistic update
                updateJarBalance(from, -amount);
                updateJarBalance(to, amount);

                addTransaction({
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    date: new Date().toISOString(),
                    amount: amount,
                    type: 'TRANSFER',
                    fromJar: from,
                    toJar: to,
                    description: description || `Transfer from ${from} to ${to}`
                });
            },

            // Unallocated Profit Management
            addUnallocatedProfit: async (profit) => {
                const dbProfit = {
                    id: profit.id,
                    date: profit.date,
                    amount: profit.amount,
                    source: profit.source,
                    created_at: profit.createdAt
                };

                const { error } = await supabase.from('unallocated_profits').insert(dbProfit);
                if (!error) {
                    set((state) => ({ unallocatedProfits: [...state.unallocatedProfits, profit] }));
                } else {
                    console.error('Error adding unallocated profit:', error);
                }
            },

            deductUnallocatedProfit: async (id, amount) => {
                const state = get();
                const profit = state.unallocatedProfits.find(p => p.id === id);
                if (!profit) return;

                const newAmount = profit.amount - amount;
                if (newAmount <= 0) {
                    // Delete if fully allocated
                    const { error } = await supabase.from('unallocated_profits').delete().eq('id', id);
                    if (!error) {
                        set((state) => ({ unallocatedProfits: state.unallocatedProfits.filter(p => p.id !== id) }));
                    }
                } else {
                    // Update remaining amount
                    const { error } = await supabase.from('unallocated_profits').update({ amount: newAmount }).eq('id', id);
                    if (!error) {
                        set((state) => ({
                            unallocatedProfits: state.unallocatedProfits.map(p =>
                                p.id === id ? { ...p, amount: newAmount } : p
                            )
                        }));
                    }
                }
            },

            allocateFromProfits: async (amount: number) => {
                const state = get();
                // Sort by date (oldest first) to implement FIFO
                const sortedProfits = [...state.unallocatedProfits].sort((a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                );

                let remainingToAllocate = amount;

                for (const profit of sortedProfits) {
                    if (remainingToAllocate <= 0) break;

                    const deductAmount = Math.min(profit.amount, remainingToAllocate);
                    await state.deductUnallocatedProfit(profit.id, deductAmount);
                    remainingToAllocate -= deductAmount;
                }
            },

            getUnallocatedBalance: () => {
                const state = get();
                return state.unallocatedProfits.reduce((sum, p) => sum + p.amount, 0);
            },

            getUnallocatedByDate: (date) => {
                const state = get();
                return state.unallocatedProfits.filter(p => p.date.startsWith(date));
            },

            // Allocation Profile Actions
            saveAllocationProfile: (profile) => {
                set((state) => {
                    const existing = state.allocationProfiles.find(p => p.id === profile.id);
                    if (existing) {
                        return {
                            allocationProfiles: state.allocationProfiles.map(p => p.id === profile.id ? profile : p)
                        };
                    }
                    return {
                        allocationProfiles: [...state.allocationProfiles, profile]
                    };
                });
            },

            deleteAllocationProfile: (id) => {
                set((state) => ({
                    allocationProfiles: state.allocationProfiles.filter(p => p.id !== id)
                }));
            },

            // Product Sales Analytics Functions
            addProductSaleLog: async (log) => {
                // 1. Optimistic Update: Add to local state IMMEDIATELY
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
                    variant_name: log.variantName
                };

                const { error } = await supabase.from('product_sales').insert(dbLog);

                if (error) {
                    console.error('Error adding product sale log (kept locally):', error);
                    // We keep the local state so the user sees the sale.
                    // In a real app, we'd queue this for retry.
                }
            },

            getProductSalesByDate: (date) => {
                return get().productSales.filter(sale => sale.saleDate === date);
            },

            getProductSalesByProduct: (productId) => {
                return get().productSales.filter(sale => sale.productId === productId);
            },

            updateProductSaleLog: async (id, updates) => {
                const { error } = await supabase
                    .from('product_sales')
                    .update(updates)
                    .eq('id', id);

                if (!error) {
                    set(state => ({
                        productSales: state.productSales.map(log =>
                            log.id === id ? { ...log, ...updates } : log
                        )
                    }));
                } else {
                    console.error('Error updating product sale log:', error);
                }
            },

            saveForecast: async (
                output: ForecastOutput,
                productId: string,
                productName: string,
                marketId: string,
                marketName: string,
                forecastForDate: string,
                weatherForecast: string
            ) => {
                const forecastData = forecastOutputToDbFormat(
                    output,
                    productId,
                    productName,
                    marketId,
                    marketName,
                    forecastForDate,
                    weatherForecast
                );

                const newForecast: ProductionForecast = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    createdAt: new Date().toISOString(),
                    ...forecastData
                };

                set(state => ({
                    productionForecasts: [...state.productionForecasts, newForecast]
                }));

                try {
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
                    }, {
                        onConflict: 'product_id,market_id,forecast_for_date'
                    });
                } catch (error) {
                    console.warn('[Forecast] Supabase save failed:', error);
                }
            },

            getForecastsByDate: (date: string) => {
                return get().productionForecasts.filter(
                    forecast => forecast.forecastForDate === date
                );
            },

            getLatestForecast: (productId: string, marketId: string, date: string) => {
                const forecasts = get().productionForecasts.filter(
                    forecast =>
                        forecast.productId === productId &&
                        forecast.marketId === marketId &&
                        forecast.forecastForDate === date
                );

                if (forecasts.length === 0) return null;

                return forecasts.sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )[0];
            },

            // ==================== INVENTORY ====================

            addIngredient: async (ingredient) => {
                // Prepare payload for Supabase (exclude ID to let DB generate it)
                const dbIngredient = {
                    name: ingredient.name,
                    unit: ingredient.unit,
                    current_stock: ingredient.currentStock,
                    cost_per_unit: ingredient.costPerUnit,
                    supplier: ingredient.supplier,

                    buy_unit: ingredient.buyUnit,
                    conversion_rate: ingredient.conversionRate,
                    min_stock: ingredient.minStock,
                    is_hidden: ingredient.isHidden
                    // image_url removed
                };

                const { data, error } = await supabase
                    .from('ingredients')
                    .insert(dbIngredient)
                    .select()
                    .single();

                if (error) {
                    console.error('Supabase Error:', error);
                    throw new Error(error.message);
                }

                if (!data) {
                    console.error('No data returned from Supabase');
                    throw new Error('บันทึกข้อมูลไม่สำเร็จ (ไม่ได้รับข้อมูลตอบกลับจากฐานข้อมูล)');
                }

                // Map back to App format using the real ID from DB
                const newIngredient: Ingredient = {
                    ...ingredient,
                    id: data.id,
                    currentStock: Number(data.current_stock),
                    costPerUnit: Number(data.cost_per_unit),
                    buyUnit: data.buy_unit,
                    conversionRate: Number(data.conversion_rate) || 1,
                    minStock: Number(data.min_stock) || 10,
                    isHidden: data.is_hidden,
                    // image removed
                    lastUpdated: data.created_at || new Date().toISOString()
                };
                set((state) => ({ ingredients: [newIngredient, ...state.ingredients] }));
            },

            updateStock: async (id, quantity, reason = 'USAGE', note = '') => {
                const { ingredients, addStockLog } = get();
                const ingredient = ingredients.find(i => i.id === id);
                if (ingredient) {
                    const newStock = Number(ingredient.currentStock) + Number(quantity);
                    const { error } = await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', id);
                    if (!error) {
                        set((state) => ({
                            ingredients: state.ingredients.map((ing) => ing.id === id ? { ...ing, currentStock: newStock } : ing)
                        }));

                        // Record Log
                        addStockLog({
                            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                            date: new Date().toISOString(),
                            ingredientId: id,
                            amount: quantity,
                            reason: reason as StockLog['reason'],
                            note: note
                        });
                        get().generateAlerts(); // Regenerate alerts after stock update
                    } else {
                        console.error('Error updating stock:', error);
                    }
                }
            },

            setIngredientStock: async (id, quantity) => {
                const { error } = await supabase.from('ingredients').update({ current_stock: quantity }).eq('id', id);
                if (!error) {
                    set((state) => ({
                        ingredients: state.ingredients.map((ing) => ing.id === id ? { ...ing, currentStock: quantity } : ing)
                    }));
                } else {
                    console.error('Error setting stock:', error);
                }
            },

            updateIngredient: async (id, updates) => {
                const dbUpdates: any = { ...updates };
                if (updates.currentStock !== undefined) {
                    dbUpdates.current_stock = updates.currentStock;
                    delete dbUpdates.currentStock;
                }
                if (updates.costPerUnit !== undefined) {
                    dbUpdates.cost_per_unit = updates.costPerUnit;
                    delete dbUpdates.costPerUnit;
                }
                if (updates.conversionRate !== undefined) {
                    dbUpdates.conversion_rate = updates.conversionRate;
                    delete dbUpdates.conversionRate;
                }
                if (updates.buyUnit !== undefined) {
                    dbUpdates.buy_unit = updates.buyUnit;
                    delete dbUpdates.buyUnit;
                }
                if (updates.minStock !== undefined) {
                    dbUpdates.min_stock = updates.minStock;
                    delete dbUpdates.minStock;
                }
                if (updates.isHidden !== undefined) {
                    dbUpdates.is_hidden = updates.isHidden;
                    delete dbUpdates.isHidden;
                }
                // image update removed

                const { error } = await supabase.from('ingredients').update(dbUpdates).eq('id', id);
                if (!error) {
                    set((state) => ({
                        ingredients: state.ingredients.map((ing) => ing.id === id ? { ...ing, ...updates } : ing)
                    }));
                }
            },

            createPurchaseOrder: (po) => set((state) => ({ purchaseOrders: [...state.purchaseOrders, po] })),

            cancelPurchaseOrder: async (poId) => {
                const state = get();
                const po = state.purchaseOrders.find(p => p.id === poId);

                if (!po || po.status === 'CANCELLED') {
                    console.warn('PO not found or already cancelled');
                    return;
                }

                const { updateJarBalance, updateStock, addTransaction, updatePurchaseOrderStatus } = get();

                // 1. Refund to Working Capital
                updateJarBalance('Working', po.totalCost);

                // 2. Reverse stock additions
                for (const item of po.items) {
                    await updateStock(item.ingredientId, -item.quantity);
                }

                // 3. Record refund transaction
                addTransaction({
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    date: new Date().toISOString(),
                    amount: po.totalCost,
                    type: 'INCOME',
                    toJar: 'Working',
                    description: `🔄 PO Cancelled - Refund (PO: ${poId.slice(0, 8)})`,
                    category: 'COGS'
                });

                // 4. Update PO status
                updatePurchaseOrderStatus(poId, 'CANCELLED');
            },

            updatePurchaseOrderStatus: (poId, status) => {
                set((state) => ({
                    purchaseOrders: state.purchaseOrders.map(po =>
                        po.id === poId ? { ...po, status } : po
                    )
                }));
            },

            addProduct: async (product) => {
                // 1. Optimistic Update: Add to local state IMMEDIATELY with temp ID
                const tempId = product.id;
                set((state) => ({ products: [...state.products, product] }));

                // 2. Prepare DB payload
                // Remove ID (let DB generate UUID) and Variants (initially try with them, but likely fail)
                const { id, ...productData } = product;

                // 3. Try inserting WITH variants first (in case column exists)
                let { data, error } = await supabase
                    .from('products')
                    .insert(productData)
                    .select()
                    .single();

                // 4. If failed (likely due to missing variants column), retry WITHOUT variants
                if (error) {
                    console.warn('Failed to insert product (likely variants column missing), retrying without variants...', error);

                    const { variants, ...productWithoutVariants } = productData;
                    const retryResult = await supabase
                        .from('products')
                        .insert(productWithoutVariants)
                        .select()
                        .single();

                    data = retryResult.data;
                    error = retryResult.error;
                }

                // 5. Handle Final Result
                if (error) {
                    console.error('Error adding product to DB:', error);
                    // Optional: Revert local state or show error
                    // set((state) => ({ products: state.products.filter(p => p.id !== tempId) }));
                } else if (data) {
                    console.log('Product synced to DB:', data);
                    // 6. Update local product with REAL ID from DB
                    set((state) => ({
                        products: state.products.map((p) =>
                            p.id === tempId ? { ...p, id: data.id } : p
                        )
                    }));
                }
            },

            updateProduct: async (id, updates) => {
                // 1. Optimistic Update: Update local state IMMEDIATELY
                set((state) => ({
                    products: state.products.map((p) => p.id === id ? { ...p, ...updates } : p)
                }));

                // 2. Try updating with variants
                const { error } = await supabase.from('products').update(updates).eq('id', id);

                if (error) {
                    console.warn('Failed to update product with variants, retrying without variants...', error);

                    // 3. Fallback: Update without variants
                    const { variants, ...updatesWithoutVariants } = updates;
                    const { error: retryError } = await supabase.from('products').update(updatesWithoutVariants).eq('id', id);

                    if (retryError) {
                        console.error('Error updating product in DB (kept locally):', retryError);
                    } else {
                        console.log('Product updated in DB (without variants)');
                    }
                }
            },

            // Authentication Implementation
            user: null,
            session: null,
            userRole: null,

            signIn: async (email, password) => {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                if (data.session) {
                    // Fetch role
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', data.user.id)
                        .single();

                    set({
                        user: data.user,
                        session: data.session,
                        userRole: profile?.role as 'owner' | 'staff' || 'staff'
                    });
                }
            },

            signOut: async () => {
                await supabase.auth.signOut();
                set({ user: null, session: null, userRole: null });
            },

            checkSession: async () => {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();

                    set({
                        user: session.user,
                        session: session,
                        userRole: profile?.role as 'owner' | 'staff' || 'staff'
                    });
                }
            },

            removeProduct: async (id) => {
                // 1. Optimistic Update: Remove from local state IMMEDIATELY
                set((state) => ({
                    products: state.products.filter((p) => p.id !== id)
                }));

                // 2. Try DB Delete
                const { error } = await supabase.from('products').delete().eq('id', id);
                if (error) {
                    console.error('Error deleting product from DB (removed locally):', error);
                    // We do NOT revert local state to keep the UI responsive and "deleted" for the user.
                }
            },

            addDailyReport: async (report) => {
                // 1. Optimistic Update
                set((state) => ({ dailyReports: [...state.dailyReports, report] }));

                // 2. Insert into DB
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

                const { error } = await supabase.from('daily_sales_reports').insert(dbReport);
                if (error) {
                    console.error('Error adding daily report to DB:', error);
                }
            },

            updateDailyReport: async (reportId, updates) => {
                const { error } = await supabase
                    .from('daily_reports')
                    .update(updates)
                    .eq('id', reportId);

                if (!error) {
                    set((state) => ({
                        dailyReports: state.dailyReports.map(r =>
                            r.id === reportId ? { ...r, ...updates } : r
                        )
                    }));
                }
            },

            addMarket: async (market) => {
                const { error } = await supabase.from('markets').insert(market);
                if (!error) {
                    set((state) => ({ markets: [...state.markets, market] }));
                }
            },
            updateMarket: async (id, updates) => {
                const { error } = await supabase.from('markets').update(updates).eq('id', id);
                if (!error) {
                    set((state) => ({
                        markets: state.markets.map((m) => m.id === id ? { ...m, ...updates } : m)
                    }));
                }
            },
            removeMarket: async (id) => {
                const { error } = await supabase.from('markets').delete().eq('id', id);
                if (!error) {
                    set((state) => ({
                        markets: state.markets.filter((m) => m.id !== id)
                    }));
                }
            },

            deductStockByRecipe: (productId, quantity, variantId) => {
                const { products, updateStock } = get();
                const product = products.find(p => p.id === productId);

                if (!product) return;

                let recipe = product.recipe;

                // If variant is selected, try to use variant's recipe
                if (variantId && product.variants) {
                    const variant = product.variants.find(v => v.id === variantId);
                    if (variant && variant.recipe) {
                        recipe = variant.recipe;
                    }
                }

                if (recipe) {
                    // Calculate total ingredients needed
                    // Recipe Yield is for X items. We sold Y items.
                    // Factor = Y / X
                    const factor = quantity / recipe.yield;

                    recipe.items.forEach(item => {
                        const amountToDeduct = item.quantity * factor;
                        updateStock(item.ingredientId, -amountToDeduct);
                    });
                }
            },

            removeIngredient: async (id) => {
                const { error } = await supabase.from('ingredients').delete().eq('id', id);
                if (!error) {
                    set((state) => ({
                        ingredients: state.ingredients.filter((ing) => ing.id !== id)
                    }));
                }
            },

            // Goals Management
            addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),

            updateGoal: (id, updates) => set((state) => ({
                goals: state.goals.map((g) => g.id === id ? { ...g, ...updates } : g)
            })),

            removeGoal: (id) => set((state) => ({
                goals: state.goals.filter((g) => g.id !== id)
            })),

            updateGoalProgress: (goalId, amount) => set((state) => ({
                goals: state.goals.map((g) =>
                    g.id === goalId
                        ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) }
                        : g
                )
            })),

            // Alerts Management
            addAlert: (alert) => set((state) => ({ alerts: [...state.alerts, alert] })),

            dismissAlert: (id) => set((state) => ({
                alerts: state.alerts.filter((a) => a.id !== id)
            })),

            generateAlerts: () => {
                const { jars, goals, jarCustomizations, ingredients } = get();
                const newAlerts: Alert[] = [];

                // Check low balance warnings
                // Check low balance warnings - REMOVED as per user request
                /*
                jars.forEach(jar => {
                    const customization = jarCustomizations.find(c => c.jarId === jar.id);
                    const minBalance = customization?.minBalance || 1000;
 
                    if (jar.balance < minBalance) {
                        newAlerts.push({
                            id: `low-${jar.id}-${Date.now()}`,
                            type: 'warning',
                            title: `${jar.name} ยอดเงินต่ำ!`,
                            message: `ยอดเงินเหลือ ฿${jar.balance.toLocaleString()} (ต่ำกว่าเป้า ฿${minBalance.toLocaleString()})`,
                            jarId: jar.id,
                            actionLabel: 'เติมเงิน',
                            dismissible: true
                        });
                    }
                });
                */

                // Check low stock ingredients (NEW!)
                ingredients.forEach(ing => {
                    const threshold = Number(ing.minStock) || 10;
                    const currentStock = Number(ing.currentStock);

                    if (currentStock < threshold) {
                        // Calculate in purchase unit if buyUnit exists
                        let displayAmount = currentStock;
                        let displayUnit = ing.unit;

                        if (ing.buyUnit && ing.conversionRate && Number(ing.conversionRate) > 0) {
                            displayAmount = currentStock / Number(ing.conversionRate);
                            displayUnit = ing.buyUnit;
                        }

                        newAlerts.push({
                            id: `low-stock-${ing.id}`,
                            type: 'warning',
                            title: `วัตถุดิบใกล้หมด!`,
                            message: `${ing.name} เหลือเพียง ${displayAmount.toFixed(1)} ${displayUnit} (ควรสั่งซื้อ)`,
                            actionLabel: 'สั่งซื้อ',
                            dismissible: true
                        });
                    }
                });

                // Check goal milestones
                goals.forEach(goal => {
                    const progress = (goal.currentAmount / goal.targetAmount) * 100;
                    const milestones = [50, 75, 90, 95];

                    milestones.forEach(milestone => {
                        if (progress >= milestone && progress < milestone + 1) {
                            newAlerts.push({
                                id: `milestone-${goal.id}-${milestone}`,
                                type: 'milestone',
                                title: `เกือบถึงเป้า!`,
                                message: `${goal.icon} ${goal.name} ทำได้ ${progress.toFixed(0)}% แล้ว`,
                                goalId: goal.id,
                                dismissible: true
                            });
                        }
                    });

                    if (progress >= 100) {
                        newAlerts.push({
                            id: `complete-${goal.id}`,
                            type: 'success',
                            title: `🎉 บรรลุเป้าหมาย!`,
                            message: `${goal.icon} ${goal.name} ทำสำเร็จแล้ว!`,
                            goalId: goal.id,
                            dismissible: true
                        });
                    }
                });

                set({ alerts: newAlerts });
            },

            // History Recording
            recordDailyHistory: () => {
                const { jars, jarHistory } = get();
                const today = new Date().toISOString().split('T')[0];

                const todayHistory = jarHistory.find(h => h.date === today);
                if (todayHistory) return; // Already recorded today

                const balances: Record<JarType, number> = {} as Record<JarType, number>;
                jars.forEach(jar => {
                    balances[jar.id] = jar.balance;
                });

                set((state) => ({
                    jarHistory: [...state.jarHistory, { date: today, balances }]
                }));
            },

            // Customization
            updateJarCustomization: (jarId, customization) => set((state) => {
                const existing = state.jarCustomizations.find(c => c.jarId === jarId);
                if (existing) {
                    return {
                        jarCustomizations: state.jarCustomizations.map(c =>
                            c.jarId === jarId ? { ...c, ...customization } : c
                        )
                    };
                } else {
                    return {
                        jarCustomizations: [...state.jarCustomizations, { jarId, ...customization }]
                    };
                }
            }),

            // Auto Allocation
            autoAllocate: (totalAmount) => {
                const { jars, updateJarBalance, addTransaction } = get();

                jars.forEach(jar => {
                    const allocation = totalAmount * jar.allocationPercent; // Already in decimal format
                    updateJarBalance(jar.id, allocation);

                    addTransaction({
                        id: crypto.randomUUID(),
                        date: new Date().toISOString(),
                        amount: allocation,
                        type: 'INCOME',
                        toJar: jar.id,
                        description: `Auto-allocation (${(jar.allocationPercent * 100).toFixed(0)}%)`
                    });
                });
            },

            // Health Score Calculation
            calculateHealthScore: () => {
                const { jars } = get();
                let score = 0;

                // Emergency Fund Health (40 points)
                const emergency = jars.find(j => j.id === 'Emergency');
                if (emergency) {
                    const monthlyExpense = 10000; // Estimate
                    const months = emergency.balance / monthlyExpense;
                    if (months >= 6) score += 40;
                    else if (months >= 3) score += 30;
                    else if (months >= 1) score += 20;
                    else score += 10;
                }

                // Working Capital Health (30 points)
                const working = jars.find(j => j.id === 'Working');
                if (working) {
                    const target = 10000; // 2 weeks operating
                    const ratio = working.balance / target;
                    if (ratio >= 1) score += 30;
                    else if (ratio >= 0.5) score += 20;
                    else score += 10;
                }

                // Profit Margin Health (30 points)
                // Simplified: if Owner jar is growing
                const owner = jars.find(j => j.id === 'Owner');
                if (owner && owner.balance > 5000) {
                    score += 30;
                } else if (owner && owner.balance > 2000) {
                    score += 20;
                } else {
                    score += 10;
                }

                return Math.min(100, score);
            },

            resetStore: () => {
                localStorage.removeItem('bakesoft-storage');
                set({
                    jars: [],
                    transactions: [],
                    ingredients: [],
                    purchaseOrders: [],
                    products: [],
                    dailyReports: [],
                    markets: [],
                    goals: [],
                    alerts: [],
                    jarHistory: [],
                    jarCustomizations: []
                });
                window.location.reload();
            },

            subscribeToRealtime: () => {
                const { fetchData } = get();

                // Subscribe to Transactions
                supabase
                    .channel('public:transactions')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                        fetchData();
                    })
                    .subscribe();

                // Subscribe to Ingredients
                supabase
                    .channel('public:ingredients')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => {
                        fetchData();
                    })
                    .subscribe();

                // Subscribe to Production Forecasts
                supabase
                    .channel('public:production_forecasts')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'production_forecasts' }, () => {
                        fetchData();
                    })
                    .subscribe();

                // Subscribe to Markets
                supabase
                    .channel('public:markets')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, () => {
                        fetchData();
                    })
                    .subscribe();

                // Subscribe to Products
                supabase
                    .channel('public:products')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
                        fetchData();
                    })
                    .subscribe();

                // Subscribe to Product Sales
                supabase
                    .channel('public:product_sales')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'product_sales' }, () => {
                        fetchData();
                    })
                    .subscribe();
            },

            unsubscribeFromRealtime: () => {
                supabase.removeAllChannels();
            }
        }),
        {
            name: 'bakesoft-storage',
            partialize: (state) => ({
                storeName: state.storeName,
                jars: state.jars,
                jarCustomizations: state.jarCustomizations,
                products: state.products, // Persist products to save local variants
                productSales: state.productSales // Persist sales logs for offline support
            })
        }
    )
);
