// src/store/types.ts
import {
    Jar, Transaction, Ingredient, PurchaseOrder, Product, DailyReport,
    JarType, Market, Goal, Alert, JarHistory, JarCustomization,
    UnallocatedProfit, ProductSaleLog, AllocationProfile, StockLog,
    DailyInventory, Promotion, Bundle, BundleItem, SpecialOrder,
    SpecialOrderItem, SpecialOrderStatus
} from '../../types';
import type { ForecastOutput } from '../lib/forecasting';
import { ProductionForecast } from '../lib/forecasting/types';

// ==================== SLICE INTERFACES ====================

export interface AuthSlice {
    user: any | null;
    session: any | null;
    userRole: 'owner' | 'staff' | null;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    checkSession: () => Promise<void>;
}

export interface FinanceSlice {
    jars: Jar[];
    transactions: Transaction[];
    unallocatedProfits: UnallocatedProfit[];
    goals: Goal[];
    alerts: Alert[];
    jarHistory: JarHistory[];
    jarCustomizations: JarCustomization[];
    allocationProfiles: AllocationProfile[];
    defaultProfileId: string | null;

    addTransaction: (transaction: Transaction) => void;
    updateTransaction: (id: string, updates: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;
    updateJarBalance: (id: JarType, amount: number) => void;
    transferFunds: (from: JarType, to: JarType, amount: number, description: string) => void;

    addUnallocatedProfit: (profit: UnallocatedProfit) => Promise<void>;
    deductUnallocatedProfit: (id: string, amount: number) => Promise<void>;
    allocateFromProfits: (amount: number) => Promise<void>;
    getUnallocatedBalance: () => number;
    getUnallocatedByDate: (date: string) => UnallocatedProfit[];

    saveAllocationProfile: (profile: AllocationProfile) => Promise<void>;
    deleteAllocationProfile: (id: string) => Promise<void>;
    setDefaultProfile: (profileId: string | null) => Promise<void>;
    renameAllocationProfile: (profileId: string, newName: string) => Promise<void>;

    addGoal: (goal: Goal) => void;
    updateGoal: (id: string, updates: Partial<Goal>) => void;
    removeGoal: (id: string) => void;
    updateGoalProgress: (goalId: string, amount: number) => void;

    addAlert: (alert: Alert) => void;
    dismissAlert: (id: string) => void;
    generateAlerts: () => void;

    recordDailyHistory: () => void;
    updateJarCustomization: (jarId: JarType, customization: Partial<JarCustomization>) => void;
    autoAllocate: (totalAmount: number) => void;
    calculateHealthScore: () => number;
}

export interface InventorySlice {
    ingredients: Ingredient[];
    purchaseOrders: PurchaseOrder[];
    stockLogs: StockLog[];
    dailyInventory: DailyInventory[];

    addIngredient: (ingredient: Ingredient) => Promise<void>;
    updateStock: (id: string, quantity: number, reason?: StockLog['reason'], note?: string) => Promise<void>;
    setIngredientStock: (id: string, quantity: number) => Promise<void>;
    updateIngredient: (id: string, updates: Partial<Ingredient>) => Promise<void>;
    removeIngredient: (id: string) => Promise<void>;
    createPurchaseOrder: (po: PurchaseOrder) => void;
    cancelPurchaseOrder: (poId: string) => Promise<void>;
    updatePurchaseOrderStatus: (poId: string, status: 'COMPLETED' | 'CANCELLED') => void;
    addStockLog: (log: StockLog) => Promise<void>;

    fetchDailyInventory: (date: string) => Promise<void>;
    upsertDailyInventory: (record: Partial<DailyInventory> & { businessDate: string; productId: string; variantId?: string }) => Promise<void>;
    getYesterdayStock: (productId: string, todayDate: string, variantId?: string) => number;
    deductStockByRecipe: (productId: string, quantity: number, variantId?: string) => void;
    deductStockForBundleOrder: (orderId: string) => Promise<void>; // NEW: Deduct stock for Bundle orders
}

export interface ProductsSlice {
    products: Product[];
    dailyReports: DailyReport[];
    productionForecasts: ProductionForecast[];

    addProduct: (product: Product) => void;
    updateProduct: (id: string, updates: Partial<Product>) => void;
    removeProduct: (id: string) => void;

    addDailyReport: (report: DailyReport) => void;
    updateDailyReport: (reportId: string, updates: Partial<DailyReport>) => void;

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
}

export interface SalesSlice {
    productSales: ProductSaleLog[];
    markets: Market[];

    addProductSaleLog: (log: ProductSaleLog) => Promise<void>;
    getProductSalesByDate: (date: string) => ProductSaleLog[];
    getProductSalesByProduct: (productId: string) => ProductSaleLog[];
    updateProductSaleLog: (id: string, updates: Partial<ProductSaleLog>) => Promise<void>;

    addMarket: (market: Market) => void;
    updateMarket: (id: string, updates: Partial<Market>) => void;
    removeMarket: (id: string) => void;
}

export interface PromotionSlice {
    promotions: Promotion[];
    bundles: Bundle[];
    specialOrders: SpecialOrder[];

    addPromotion: (promo: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updatePromotion: (id: string, updates: Partial<Promotion>) => Promise<void>;
    deletePromotion: (id: string) => Promise<void>;

    addBundle: (bundle: Omit<Bundle, 'id' | 'createdAt' | 'updatedAt' | 'items'>, items: Omit<BundleItem, 'id' | 'bundleId'>[]) => Promise<void>;
    updateBundle: (id: string, updates: Partial<Bundle>, items?: Omit<BundleItem, 'id' | 'bundleId'>[]) => Promise<void>;
    deleteBundle: (id: string) => Promise<void>;

    addSpecialOrder: (order: Omit<SpecialOrder, 'id' | 'createdAt' | 'updatedAt' | 'items' | 'orderNumber'>, items: Omit<SpecialOrderItem, 'id' | 'specialOrderId'>[]) => Promise<void>;
    updateSpecialOrderStatus: (id: string, status: SpecialOrderStatus) => Promise<void>;
    cancelSpecialOrder: (id: string) => Promise<void>;

    getSpecialOrdersByDeliveryDate: (date: string) => SpecialOrder[];
    getSpecialOrdersForProduction: (date: string) => { productId: string; variantId?: string; quantity: number; orderNumber: string }[];
    syncDeliveredOrderProfits: () => Promise<number>;
}

// ==================== SHARED ACTIONS ====================

export interface SharedActions {
    storeName: string;
    setStoreName: (name: string) => void;
    loadStore: (state: Partial<AppState>) => void;
    fetchData: () => Promise<void>;
    resetStore: () => void;
    subscribeToRealtime: () => void;
    unsubscribeFromRealtime: () => void;
}

// ==================== COMBINED APP STATE ====================

export type AppState = AuthSlice & FinanceSlice & InventorySlice & ProductsSlice & SalesSlice & PromotionSlice & SharedActions;

// Re-export types for convenience
export type {
    Jar, Transaction, Ingredient, PurchaseOrder, Product, DailyReport,
    JarType, Market, Goal, Alert, JarHistory, JarCustomization,
    UnallocatedProfit, ProductSaleLog, AllocationProfile, StockLog,
    DailyInventory, Promotion, Bundle, BundleItem, SpecialOrder,
    SpecialOrderItem, SpecialOrderStatus, ForecastOutput, ProductionForecast
};
