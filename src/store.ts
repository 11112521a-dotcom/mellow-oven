import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './lib/supabase';
import { Jar, Transaction, Ingredient, PurchaseOrder, Product, DailyReport, JarType, Market, Goal, Alert, JarHistory, JarCustomization, UnallocatedProfit, ProductSaleLog, AllocationProfile, StockLog, DailyInventory, Promotion, Bundle, BundleItem, SpecialOrder, SpecialOrderItem, SpecialOrderStatus } from '../types';
import type { ForecastOutput } from './lib/forecasting';
import { ProductionForecast, forecastOutputToDbFormat } from './lib/forecasting/types';

// ==================== MAPPING HELPERS (Selective Real-time) ====================

const mapTransaction = (t: any): Transaction => ({
    id: t.id,
    date: t.date,
    amount: Number(t.amount),
    type: t.type,
    fromJar: t.from_jar,
    toJar: t.to_jar,
    description: t.description,
    category: t.category,
    marketId: t.market_id
});

const mapIngredient = (i: any): Ingredient => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    currentStock: Number(i.current_stock),
    costPerUnit: Number(i.cost_per_unit),
    supplier: i.supplier,
    lastUpdated: i.last_updated || new Date().toISOString(),
    buyUnit: i.buy_unit,
    conversionRate: Number(i.conversion_rate) || 1,
    minStock: Number(i.min_stock) || 10,
    isHidden: i.is_hidden
});

const mapProductSaleLog = (s: any): ProductSaleLog => ({
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
    weatherCondition: s.weather_condition
});

const mapProductionForecast = (f: any): ProductionForecast => ({
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
});

const mapDailyInventory = (d: any): DailyInventory => ({
    id: d.id,
    createdAt: d.created_at,
    businessDate: d.business_date,
    productId: d.product_id,
    variantId: d.variant_id,
    variantName: d.variant_name,
    producedQty: d.produced_qty,
    toShopQty: d.to_shop_qty,
    soldQty: d.sold_qty,
    wasteQty: d.waste_qty,
    stockYesterday: d.stock_yesterday,
    leftoverHome: d.leftover_home,
    unsoldShop: d.unsold_shop
});

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
    defaultProfileId: string | null;
    saveAllocationProfile: (profile: AllocationProfile) => Promise<void>;
    deleteAllocationProfile: (id: string) => Promise<void>;
    setDefaultProfile: (profileId: string | null) => Promise<void>;
    renameAllocationProfile: (profileId: string, newName: string) => Promise<void>;

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

    // Daily Inventory (Stock ↔ Sales Integration)
    dailyInventory: DailyInventory[];
    fetchDailyInventory: (date: string) => Promise<void>;
    upsertDailyInventory: (record: Partial<DailyInventory> & { businessDate: string; productId: string; variantId?: string }) => Promise<void>;
    getYesterdayStock: (productId: string, todayDate: string, variantId?: string) => number;

    // Promotion & Snack Box System
    promotions: Promotion[];
    bundles: Bundle[];
    specialOrders: SpecialOrder[];

    // Promotion CRUD
    addPromotion: (promo: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updatePromotion: (id: string, updates: Partial<Promotion>) => Promise<void>;
    deletePromotion: (id: string) => Promise<void>;

    // Bundle CRUD
    addBundle: (bundle: Omit<Bundle, 'id' | 'createdAt' | 'updatedAt' | 'items'>, items: Omit<BundleItem, 'id' | 'bundleId'>[]) => Promise<void>;
    updateBundle: (id: string, updates: Partial<Bundle>, items?: Omit<BundleItem, 'id' | 'bundleId'>[]) => Promise<void>;
    deleteBundle: (id: string) => Promise<void>;

    // Special Order CRUD
    addSpecialOrder: (order: Omit<SpecialOrder, 'id' | 'createdAt' | 'updatedAt' | 'items' | 'orderNumber'>, items: Omit<SpecialOrderItem, 'id' | 'specialOrderId'>[]) => Promise<void>;
    updateSpecialOrderStatus: (id: string, status: SpecialOrderStatus) => Promise<void>;
    cancelSpecialOrder: (id: string) => Promise<void>;

    // Special Order Helpers
    getSpecialOrdersByDeliveryDate: (date: string) => SpecialOrder[];
    getSpecialOrdersForProduction: (date: string) => { productId: string; variantId?: string; quantity: number; orderNumber: string }[];
    syncDeliveredOrderProfits: () => Promise<number>;
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
                const { data: unallocatedProfitsData, error: profitsError } = await supabase.from('unallocated_profits').select('*').order('date', { ascending: false });
                if (profitsError) {
                    console.error('[fetchData] unallocated_profits fetch error:', profitsError);
                } else {
                    console.log('[fetchData] unallocated_profits loaded:', unallocatedProfitsData?.length || 0, 'records');
                }
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
                    variantName: s.variant_name,
                    wasteQty: s.waste_qty || 0, // FIX: Map waste_qty from DB
                    weatherCondition: s.weather_condition || null // FIX: Map weather_condition from DB
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
                    //    - Start with DM products (Source of Truth)
                    //    - Merge with local state to preserve transitive UI state (like variants if missing in DB fetch)
                    //    - Implicitly REMOVES local products that don't exist in DB (Fixes FK errors from zombie items)

                    const mergedProducts = products?.map(dbProduct => {
                        const localProduct = state.products.find(p => p.id === dbProduct.id);

                        if (localProduct) {
                            return {
                                ...dbProduct,
                                // Keep local variants if DB has none (fix for missing column/partial fetch)
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
            defaultProfileId: 'default', // Default profile ID

            // Product Sales Analytics
            productSales: [],

            // Production Forecasts
            productionForecasts: [],

            // Stock Logs
            stockLogs: [],

            // Daily Inventory (Stock ↔ Sales Integration)
            dailyInventory: [],

            // Promotion & Snack Box System
            promotions: [],
            bundles: [],
            specialOrders: [],

            fetchDailyInventory: async (date: string) => {
                // Fetch last 7 days to ensure we can find "yesterday's stock" even if shop was closed for a day or two
                const pastDate = new Date(date);
                pastDate.setDate(pastDate.getDate() - 7);
                const pastDateStr = pastDate.toISOString().split('T')[0];

                const { data, error } = await supabase
                    .from('daily_inventory')
                    .select('*')
                    .lte('business_date', date)
                    .gte('business_date', pastDateStr);

                if (error) {
                    console.error('Error fetching daily inventory:', error);
                    return;
                }

                const mapped = data?.map(d => ({
                    id: d.id,
                    createdAt: d.created_at,
                    businessDate: d.business_date,
                    productId: d.product_id,
                    variantId: d.variant_id || undefined,     // NEW: Variant support
                    variantName: d.variant_name || undefined, // NEW: Variant support
                    producedQty: d.produced_qty,
                    toShopQty: d.to_shop_qty,
                    soldQty: d.sold_qty,
                    wasteQty: d.waste_qty || 0,               // NEW: Waste at home
                    stockYesterday: d.stock_yesterday,
                    leftoverHome: d.leftover_home,
                    unsoldShop: d.unsold_shop
                })) || [];

                // Merge with existing data (filtering out the range we just fetched to avoid duplicates)
                set(state => {
                    const existingOutsideRange = state.dailyInventory.filter(d =>
                        d.businessDate > date || d.businessDate < pastDateStr
                    );
                    return { dailyInventory: [...existingOutsideRange, ...mapped] };
                });
            },

            upsertDailyInventory: async (record) => {
                // Calculate derived fields
                const stockYesterday = record.stockYesterday ?? 0;
                const produced = record.producedQty ?? 0;
                const toShop = record.toShopQty ?? 0;
                const sold = record.soldQty ?? 0;
                const waste = record.wasteQty ?? 0; // NEW: Waste at home

                const leftoverHome = stockYesterday + produced - toShop - waste; // NEW: Subtract waste
                const unsoldShop = toShop - sold;

                const dbRecord: Record<string, any> = {
                    business_date: record.businessDate,
                    product_id: record.productId,
                    produced_qty: produced,
                    to_shop_qty: toShop,
                    sold_qty: sold,
                    waste_qty: waste, // NEW: Save waste to DB
                    stock_yesterday: stockYesterday,
                    leftover_home: leftoverHome,
                    unsold_shop: unsoldShop
                };

                // Add variant fields if provided
                if (record.variantId) {
                    dbRecord.variant_id = record.variantId;
                }
                if (record.variantName) {
                    dbRecord.variant_name = record.variantName;
                }

                // manual check for existence to avoid ON CONFLICT inference issues
                let existingQuery = supabase
                    .from('daily_inventory')
                    .select('id')
                    .eq('business_date', record.businessDate)
                    .eq('product_id', record.productId);

                if (record.variantId) {
                    existingQuery = existingQuery.eq('variant_id', record.variantId);
                } else {
                    existingQuery = existingQuery.is('variant_id', null);
                }

                const { data: existingData, error: fetchError } = await existingQuery.single();

                let data, error;

                if (existingData?.id) {
                    // Update existing
                    const result = await supabase
                        .from('daily_inventory')
                        .update(dbRecord)
                        .eq('id', existingData.id)
                        .select()
                        .single();
                    data = result.data;
                    error = result.error;
                } else {
                    // Insert new
                    const result = await supabase
                        .from('daily_inventory')
                        .insert(dbRecord)
                        .select()
                        .single();
                    data = result.data;
                    error = result.error;
                }

                if (error) {
                    console.error('[Upsert Debug] ERROR from Supabase:', error);
                    return;
                }

                // Update local state
                const newRecord: DailyInventory = {
                    id: data.id,
                    createdAt: data.created_at,
                    businessDate: data.business_date,
                    productId: data.product_id,
                    variantId: data.variant_id || undefined,
                    variantName: data.variant_name || undefined,
                    producedQty: data.produced_qty,
                    toShopQty: data.to_shop_qty,
                    soldQty: data.sold_qty,
                    stockYesterday: data.stock_yesterday,
                    leftoverHome: data.leftover_home,
                    unsoldShop: data.unsold_shop
                };

                set(state => {
                    const existingIndex = state.dailyInventory.findIndex(
                        d => d.businessDate === record.businessDate &&
                            d.productId === record.productId &&
                            (d.variantId || '') === (record.variantId || '')
                    );

                    if (existingIndex >= 0) {
                        const updated = [...state.dailyInventory];
                        updated[existingIndex] = newRecord;
                        return { dailyInventory: updated };
                    }
                    return { dailyInventory: [...state.dailyInventory, newRecord] };
                });
            },

            getYesterdayStock: (productId: string, todayDate: string, variantId?: string) => {
                // Lazy Initialization: Calculate yesterday's stock from previous (closest) day's data
                const state = get();

                // Find records strictly BEFORE today
                const relevantRecords = state.dailyInventory.filter(
                    d => d.businessDate < todayDate &&
                        d.productId === productId &&
                        (d.variantId || '') === (variantId || '')  // Match variant too
                );

                if (relevantRecords.length === 0) return 0;

                // Sort descending by date (newest first)
                relevantRecords.sort((a, b) => b.businessDate.localeCompare(a.businessDate));

                const lastRecord = relevantRecords[0];

                // Stock = leftoverHome + unsoldShop
                return lastRecord.leftoverHome + lastRecord.unsoldShop;
            },

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
                // 1. Optimistic Update: Add to local state IMMEDIATELY
                set((state) => ({ transactions: [transaction, ...state.transactions] }));

                const dbTransaction = {
                    ...transaction,
                    from_jar: transaction.fromJar,
                    to_jar: transaction.toJar,
                    market_id: (transaction as any).marketId
                };
                delete (dbTransaction as any).fromJar;
                delete (dbTransaction as any).toJar;
                delete (dbTransaction as any).marketId;

                const { error } = await supabase.from('transactions').insert(dbTransaction);

                if (error) {
                    console.error('Error adding transaction:', error);
                    alert(`❌ บันทึก Transaction ไม่สำเร็จ: ${error.message}`);
                    // Revert optimistic update
                    set((state) => ({
                        transactions: state.transactions.filter(t => t.id !== transaction.id)
                    }));
                }
            },

            updateTransaction: async (id, updates) => {
                const { transactions } = get();
                const oldTransaction = transactions.find(t => t.id === id);

                // 1. Optimistic Update
                set((state) => ({
                    transactions: state.transactions.map((tx) => tx.id === id ? { ...tx, ...updates } : tx)
                }));

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

                if (error) {
                    console.error('Error updating transaction:', error);
                    // Revert
                    if (oldTransaction) {
                        set((state) => ({
                            transactions: state.transactions.map((tx) => tx.id === id ? oldTransaction : tx)
                        }));
                    }
                    alert(`❌ แก้ไข Transaction ไม่สำเร็จ: ${error.message}`);
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
                // 1. Optimistic Update
                set((state) => ({ unallocatedProfits: [...state.unallocatedProfits, profit] }));

                const dbProfit = {
                    id: profit.id,
                    date: profit.date,
                    amount: profit.amount,
                    source: profit.source,
                    created_at: profit.createdAt
                };

                const { error } = await supabase.from('unallocated_profits').insert(dbProfit);

                if (error) {
                    console.error('Error adding unallocated profit:', error);
                    alert(`❌ บันทึกกำไรไม่สำเร็จ: ${error.message}`);
                    // Revert
                    set((state) => ({
                        unallocatedProfits: state.unallocatedProfits.filter(p => p.id !== profit.id)
                    }));
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
            saveAllocationProfile: async (profile) => {
                // Optimistic update (immediate UI response)
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

                // Persist to Supabase
                const dbProfile = {
                    id: profile.id,
                    name: profile.name,
                    alloc_working: profile.allocations.Working,
                    alloc_capex: profile.allocations.CapEx,
                    alloc_opex: profile.allocations.Opex,
                    alloc_emergency: profile.allocations.Emergency,
                    alloc_owner: profile.allocations.Owner,
                    updated_at: new Date().toISOString()
                };

                const { error } = await supabase.from('allocation_profiles').upsert(dbProfile);
                if (error) {
                    console.error('[AllocationProfile] Save failed:', error);
                }
            },

            deleteAllocationProfile: async (id) => {
                // Optimistic update
                set((state) => ({
                    allocationProfiles: state.allocationProfiles.filter(p => p.id !== id)
                }));

                // Persist to Supabase
                const { error } = await supabase.from('allocation_profiles').delete().eq('id', id);
                if (error) {
                    console.error('[AllocationProfile] Delete failed:', error);
                }
            },

            setDefaultProfile: async (profileId) => {
                // Optimistic update
                set({ defaultProfileId: profileId });

                // Persist to Supabase: reset all to false, then set selected to true
                const { error: resetError } = await supabase
                    .from('allocation_profiles')
                    .update({ is_default: false })
                    .not('id', 'is', null); // Reset ALL profiles to false

                if (resetError) {
                    console.error('[AllocationProfile] Reset default failed:', resetError);
                }

                const { error } = await supabase
                    .from('allocation_profiles')
                    .update({ is_default: true, updated_at: new Date().toISOString() })
                    .eq('id', profileId);

                if (error) {
                    console.error('[AllocationProfile] Set default failed:', error);
                    alert(`❌ ตั้งค่า Default Profile ไม่สำเร็จ: ${error.message}`);
                } else {
                    console.log('[AllocationProfile] Default set to:', profileId);
                }
            },

            renameAllocationProfile: async (profileId, newName) => {
                // Optimistic update
                set((state) => ({
                    allocationProfiles: state.allocationProfiles.map(p =>
                        p.id === profileId ? { ...p, name: newName } : p
                    )
                }));

                // Persist to Supabase
                const { error } = await supabase
                    .from('allocation_profiles')
                    .update({ name: newName, updated_at: new Date().toISOString() })
                    .eq('id', profileId);
                if (error) {
                    console.error('[AllocationProfile] Rename failed:', error);
                }
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
                    variant_name: log.variantName,
                    waste_qty: log.wasteQty || 0, // FIX: Include waste quantity
                    weather_condition: log.weatherCondition || null // FIX: Include weather
                };

                const { error } = await supabase.from('product_sales').insert(dbLog);

                if (error) {
                    console.error('Error adding product sale log (kept locally):', error);
                    alert(`❌ บันทึกการขายไม่สำเร็จ: ${error.message}`);
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
                if (error) {
                    console.error('Error deleting market:', error);
                    alert(`ไม่สามารถลบตลาดได้: ${error.message}`);
                    return false;
                }
                set((state) => ({
                    markets: state.markets.filter((m) => m.id !== id)
                }));
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

            // ==================== PROMOTION & SNACK BOX ACTIONS ====================

            addPromotion: async (promo) => {
                const now = new Date().toISOString();
                const discountPercent = ((promo.originalPrice - promo.discountPrice) / promo.originalPrice) * 100;

                const dbPromo = {
                    name: promo.name,
                    description: promo.description || null,
                    product_id: promo.productId,
                    product_name: promo.productName,
                    variant_id: promo.variantId || null,
                    variant_name: promo.variantName || null,
                    original_price: promo.originalPrice,
                    discount_price: promo.discountPrice,
                    discount_percent: discountPercent,
                    min_quantity: promo.minQuantity || 1,
                    max_quantity: promo.maxQuantity || null,
                    valid_from: promo.validFrom || null,
                    valid_until: promo.validUntil || null,
                    is_active: promo.isActive ?? true
                };

                const { data, error } = await supabase.from('promotions').insert(dbPromo).select().single();
                if (error) {
                    console.error('[Promotion] Add failed:', error);
                    return;
                }

                const newPromo: Promotion = {
                    id: data.id,
                    name: data.name,
                    description: data.description,
                    productId: data.product_id,
                    productName: data.product_name,
                    variantId: data.variant_id,
                    variantName: data.variant_name,
                    originalPrice: data.original_price,
                    discountPrice: data.discount_price,
                    discountPercent: data.discount_percent,
                    minQuantity: data.min_quantity,
                    maxQuantity: data.max_quantity,
                    validFrom: data.valid_from,
                    validUntil: data.valid_until,
                    isActive: data.is_active,
                    createdAt: data.created_at,
                    updatedAt: data.updated_at
                };

                set(state => ({ promotions: [...state.promotions, newPromo] }));
            },

            updatePromotion: async (id, updates) => {
                const dbUpdates: any = { updated_at: new Date().toISOString() };
                if (updates.name !== undefined) dbUpdates.name = updates.name;
                if (updates.description !== undefined) dbUpdates.description = updates.description;
                if (updates.discountPrice !== undefined) dbUpdates.discount_price = updates.discountPrice;
                if (updates.minQuantity !== undefined) dbUpdates.min_quantity = updates.minQuantity;
                if (updates.maxQuantity !== undefined) dbUpdates.max_quantity = updates.maxQuantity;
                if (updates.validFrom !== undefined) dbUpdates.valid_from = updates.validFrom;
                if (updates.validUntil !== undefined) dbUpdates.valid_until = updates.validUntil;
                if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

                // Recalculate discount percent if price changes
                if (updates.discountPrice !== undefined) {
                    const promo = get().promotions.find(p => p.id === id);
                    if (promo) {
                        dbUpdates.discount_percent = ((promo.originalPrice - updates.discountPrice) / promo.originalPrice) * 100;
                    }
                }

                const { error } = await supabase.from('promotions').update(dbUpdates).eq('id', id);
                if (error) console.error('[Promotion] Update failed:', error);

                set(state => ({
                    promotions: state.promotions.map(p => p.id === id ? { ...p, ...updates, updatedAt: dbUpdates.updated_at } : p)
                }));
            },

            deletePromotion: async (id) => {
                set(state => ({ promotions: state.promotions.filter(p => p.id !== id) }));
                const { error } = await supabase.from('promotions').delete().eq('id', id);
                if (error) console.error('[Promotion] Delete failed:', error);
            },

            addBundle: async (bundle, items) => {
                const estimatedCost = items.reduce((sum, item) => sum + item.subtotalCost, 0);
                const profitMargin = bundle.bundlePrice > 0 ? ((bundle.bundlePrice - estimatedCost) / bundle.bundlePrice) * 100 : 0;

                const dbBundle = {
                    name: bundle.name,
                    description: bundle.description || null,
                    bundle_price: bundle.bundlePrice,
                    estimated_cost: estimatedCost,
                    profit_margin: profitMargin,
                    is_active: bundle.isActive ?? true,
                    image_url: bundle.imageUrl || null
                };

                const { data: bundleData, error: bundleError } = await supabase.from('bundles').insert(dbBundle).select().single();
                if (bundleError || !bundleData) {
                    console.error('[Bundle] Add failed:', bundleError);
                    return;
                }

                // Insert bundle items
                const dbItems = items.map((item, idx) => ({
                    bundle_id: bundleData.id,
                    product_id: item.productId,
                    product_name: item.productName,
                    variant_id: item.variantId || null,
                    variant_name: item.variantName || null,
                    quantity: item.quantity,
                    unit_cost: item.unitCost,
                    subtotal_cost: item.subtotalCost,
                    sort_order: idx
                }));

                const { data: itemsData, error: itemsError } = await supabase.from('bundle_items').insert(dbItems).select();
                if (itemsError) console.error('[BundleItems] Add failed:', itemsError);

                const newBundle: Bundle = {
                    id: bundleData.id,
                    name: bundleData.name,
                    description: bundleData.description,
                    bundlePrice: bundleData.bundle_price,
                    estimatedCost: bundleData.estimated_cost,
                    profitMargin: bundleData.profit_margin,
                    isActive: bundleData.is_active,
                    imageUrl: bundleData.image_url,
                    createdAt: bundleData.created_at,
                    updatedAt: bundleData.updated_at,
                    items: (itemsData || []).map(i => ({
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
                };

                set(state => ({ bundles: [...state.bundles, newBundle] }));
            },

            updateBundle: async (id, updates, items) => {
                const dbUpdates: any = { updated_at: new Date().toISOString() };
                if (updates.name !== undefined) dbUpdates.name = updates.name;
                if (updates.description !== undefined) dbUpdates.description = updates.description;
                if (updates.bundlePrice !== undefined) dbUpdates.bundle_price = updates.bundlePrice;
                if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

                if (items) {
                    const estimatedCost = items.reduce((sum, item) => sum + item.subtotalCost, 0);
                    dbUpdates.estimated_cost = estimatedCost;
                    if (updates.bundlePrice !== undefined) {
                        dbUpdates.profit_margin = ((updates.bundlePrice - estimatedCost) / updates.bundlePrice) * 100;
                    }

                    // Delete old items and insert new ones
                    await supabase.from('bundle_items').delete().eq('bundle_id', id);
                    const dbItems = items.map((item, idx) => ({
                        bundle_id: id,
                        product_id: item.productId,
                        product_name: item.productName,
                        variant_id: item.variantId || null,
                        variant_name: item.variantName || null,
                        quantity: item.quantity,
                        unit_cost: item.unitCost,
                        subtotal_cost: item.subtotalCost,
                        sort_order: idx
                    }));
                    await supabase.from('bundle_items').insert(dbItems);
                }

                const { error } = await supabase.from('bundles').update(dbUpdates).eq('id', id);
                if (error) console.error('[Bundle] Update failed:', error);

                set(state => ({
                    bundles: state.bundles.map(b => b.id === id ? { ...b, ...updates, updatedAt: dbUpdates.updated_at } : b)
                }));
            },

            deleteBundle: async (id) => {
                set(state => ({ bundles: state.bundles.filter(b => b.id !== id) }));
                const { error } = await supabase.from('bundles').delete().eq('id', id);
                if (error) console.error('[Bundle] Delete failed:', error);
            },

            addSpecialOrder: async (order, items) => {
                // Generate order number: SO-YYYYMMDD-XXX
                const dateStr = order.orderDate.replace(/-/g, '');
                const random = Math.random().toString(36).substring(2, 5).toUpperCase();
                const orderNumber = `SO-${dateStr}-${random}`;

                const dbOrder = {
                    order_number: orderNumber,
                    order_date: order.orderDate,
                    delivery_date: order.deliveryDate,
                    order_type: order.orderType,
                    promotion_id: order.promotionId || null,
                    bundle_id: order.bundleId || null,
                    customer_name: order.customerName || null,
                    customer_phone: order.customerPhone || null,
                    customer_note: order.customerNote || null,
                    total_quantity: order.totalQuantity,
                    total_revenue: order.totalRevenue,
                    total_cost: order.totalCost,
                    gross_profit: order.grossProfit,
                    status: order.status || 'pending',
                    stock_deducted: false
                };

                const { data: orderData, error: orderError } = await supabase.from('special_orders').insert(dbOrder).select().single();
                if (orderError || !orderData) {
                    console.error('[SpecialOrder] Add failed:', orderError);
                    return;
                }

                // Insert order items
                const dbItems = items.map((item, idx) => ({
                    special_order_id: orderData.id,
                    product_id: item.productId,
                    product_name: item.productName,
                    variant_id: item.variantId || null,
                    variant_name: item.variantName || null,
                    quantity: item.quantity,
                    unit_price: item.unitPrice,
                    unit_cost: item.unitCost,
                    subtotal_revenue: item.subtotalRevenue,
                    subtotal_cost: item.subtotalCost,
                    subtotal_profit: item.subtotalProfit,
                    sort_order: idx
                }));

                const { data: itemsData, error: itemsError } = await supabase.from('special_order_items').insert(dbItems).select();
                if (itemsError) console.error('[SpecialOrderItems] Add failed:', itemsError);

                const newOrder: SpecialOrder = {
                    id: orderData.id,
                    orderNumber: orderData.order_number,
                    orderDate: orderData.order_date,
                    deliveryDate: orderData.delivery_date,
                    orderType: orderData.order_type,
                    promotionId: orderData.promotion_id,
                    bundleId: orderData.bundle_id,
                    customerName: orderData.customer_name,
                    customerPhone: orderData.customer_phone,
                    customerNote: orderData.customer_note,
                    totalQuantity: orderData.total_quantity,
                    totalRevenue: orderData.total_revenue,
                    totalCost: orderData.total_cost,
                    grossProfit: orderData.gross_profit,
                    status: orderData.status,
                    stockDeducted: orderData.stock_deducted,
                    stockDeductedAt: orderData.stock_deducted_at,
                    createdAt: orderData.created_at,
                    updatedAt: orderData.updated_at,
                    items: (itemsData || []).map(i => ({
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
                };

                set(state => ({ specialOrders: [...state.specialOrders, newOrder] }));
            },

            updateSpecialOrderStatus: async (id, status) => {
                const updates: any = { status, updated_at: new Date().toISOString() };
                const order = get().specialOrders.find(o => o.id === id);

                // If confirmed, mark for stock deduction (in production scenario)
                if (status === 'confirmed') {
                    // Note: Actual stock deduction would happen here or in a separate function
                    // For safety, we just mark it and let manual verification happen
                }

                // If delivered, add profit to unallocated_profits (ONLY if not already added)
                if (status === 'delivered' && order && order.status !== 'delivered') {
                    const profitEntry = {
                        date: new Date().toISOString().split('T')[0],
                        amount: order.grossProfit,
                        source: `special_order:${order.orderNumber}`,
                        created_at: new Date().toISOString()
                    };

                    const { error: profitError } = await supabase
                        .from('unallocated_profits')
                        .insert(profitEntry);

                    if (profitError) {
                        console.error('[SpecialOrder] Failed to add profit to unallocated:', profitError);
                    } else {
                        console.log(`[SpecialOrder] Added ${order.grossProfit} profit to unallocated from ${order.orderNumber}`);
                        // Update local state for unallocated profits
                        const { data: newProfit } = await supabase
                            .from('unallocated_profits')
                            .select('*')
                            .eq('source', profitEntry.source)
                            .single();

                        if (newProfit) {
                            set(state => ({
                                unallocatedProfits: [...state.unallocatedProfits, {
                                    id: newProfit.id,
                                    date: newProfit.date,
                                    amount: newProfit.amount,
                                    source: newProfit.source,
                                    createdAt: newProfit.created_at
                                }]
                            }));
                        }
                    }
                }

                const { error } = await supabase.from('special_orders').update(updates).eq('id', id);
                if (error) console.error('[SpecialOrder] Status update failed:', error);

                set(state => ({
                    specialOrders: state.specialOrders.map(o => o.id === id ? { ...o, status, updatedAt: updates.updated_at } : o)
                }));
            },

            cancelSpecialOrder: async (id) => {
                const updates = { status: 'cancelled', updated_at: new Date().toISOString() };
                const { error } = await supabase.from('special_orders').update(updates).eq('id', id);
                if (error) console.error('[SpecialOrder] Cancel failed:', error);

                set(state => ({
                    specialOrders: state.specialOrders.map(o => o.id === id ? { ...o, status: 'cancelled' as SpecialOrderStatus } : o)
                }));
            },

            getSpecialOrdersByDeliveryDate: (date) => {
                return get().specialOrders.filter(o => o.deliveryDate === date && o.status !== 'cancelled');
            },

            getSpecialOrdersForProduction: (date) => {
                const orders = get().specialOrders.filter(o => o.deliveryDate === date && o.status !== 'cancelled');
                const result: { productId: string; variantId?: string; quantity: number; orderNumber: string }[] = [];

                orders.forEach(order => {
                    order.items.forEach(item => {
                        result.push({
                            productId: item.productId,
                            variantId: item.variantId,
                            quantity: item.quantity,
                            orderNumber: order.orderNumber
                        });
                    });
                });

                return result;
            },

            // Sync missing profits from delivered orders (for orders delivered before profit-tracking was added)
            syncDeliveredOrderProfits: async () => {
                const state = get();
                const deliveredOrders = state.specialOrders.filter(o => o.status === 'delivered');
                const existingSources = state.unallocatedProfits.map(p => p.source);

                let syncedCount = 0;
                for (const order of deliveredOrders) {
                    const expectedSource = `special_order:${order.orderNumber}`;

                    // Skip if profit already exists
                    if (existingSources.includes(expectedSource)) continue;

                    const profitEntry = {
                        date: order.deliveryDate,
                        amount: order.grossProfit,
                        source: expectedSource,
                        created_at: new Date().toISOString()
                    };

                    const { data, error } = await supabase
                        .from('unallocated_profits')
                        .insert(profitEntry)
                        .select()
                        .single();

                    if (!error && data) {
                        set(s => ({
                            unallocatedProfits: [...s.unallocatedProfits, {
                                id: data.id,
                                date: data.date,
                                amount: data.amount,
                                source: data.source,
                                createdAt: data.created_at
                            }]
                        }));
                        syncedCount++;
                        console.log(`[Sync] Added missing profit ${order.grossProfit} from ${order.orderNumber}`);
                    } else if (error) {
                        console.error(`[Sync] Insert failed for ${order.orderNumber}:`, error.message, error.details, error.code);
                    }
                }

                if (syncedCount > 0) {
                    console.log(`[Sync] Total synced: ${syncedCount} orders`);
                }
                return syncedCount;
            },

            subscribeToRealtime: () => {
                const { fetchData } = get();

                // Transactions
                supabase.channel('public:transactions')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
                        if (payload.eventType === 'INSERT') {
                            set(state => {
                                if (state.transactions.some(t => t.id === payload.new.id)) return state;
                                return { transactions: [mapTransaction(payload.new), ...state.transactions] };
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            set(state => ({ transactions: state.transactions.map(t => t.id === payload.new.id ? mapTransaction(payload.new) : t) }));
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
                                return { ingredients: [mapIngredient(payload.new), ...state.ingredients] };
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            set(state => ({ ingredients: state.ingredients.map(i => i.id === payload.new.id ? mapIngredient(payload.new) : i) }));
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
                                return { productionForecasts: [mapProductionForecast(payload.new), ...state.productionForecasts] };
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            set(state => ({ productionForecasts: state.productionForecasts.map(f => f.id === payload.new.id ? mapProductionForecast(payload.new) : f) }));
                        } else if (payload.eventType === 'DELETE') {
                            set(state => ({ productionForecasts: state.productionForecasts.filter(f => f.id !== payload.old.id) }));
                        }
                    })
                    .subscribe();

                // Markets (Assuming direct mapping)
                supabase.channel('public:markets')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, (payload) => {
                        // For simpler tables, we can just fetch data to be safe, or implement mapping if high traffic
                        // Optimization: Just update local for now (Markets change rarely)
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

                // Products (Assuming direct mapping)
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
                                return { productSales: [mapProductSaleLog(payload.new), ...state.productSales] };
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            set(state => ({ productSales: state.productSales.map(s => s.id === payload.new.id ? mapProductSaleLog(payload.new) : s) }));
                        } else if (payload.eventType === 'DELETE') {
                            set(state => ({ productSales: state.productSales.filter(s => s.id !== payload.old.id) }));
                        }
                    })
                    .subscribe();

                // Daily Inventory (Stock Log Integration)
                supabase.channel('public:daily_inventory')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_inventory' }, (payload) => {
                        if (payload.eventType === 'INSERT') {
                            set(state => {
                                if (state.dailyInventory.some(d => d.id === payload.new.id)) return state;
                                return { dailyInventory: [...state.dailyInventory, mapDailyInventory(payload.new)] };
                            });
                        } else if (payload.eventType === 'UPDATE') {
                            set(state => ({ dailyInventory: state.dailyInventory.map(d => d.id === payload.new.id ? mapDailyInventory(payload.new) : d) }));
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
            name: 'bakesoft-storage',
            partialize: (state) => ({
                storeName: state.storeName,
                jars: state.jars,
                jarCustomizations: state.jarCustomizations,
                defaultProfileId: state.defaultProfileId, // Persist default profile selection
                products: state.products, // Persist products to save local variants
                productSales: state.productSales // Persist sales logs for offline support
            })
        }
    )
);
