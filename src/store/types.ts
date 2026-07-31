// src/store/types.ts
import {
    Jar, Transaction, Ingredient, PurchaseOrder, Product, DailyReport,
    JarType, Market, Goal, Alert, JarHistory, JarCustomization,
    UnallocatedProfit, ProductSaleLog, AllocationProfile, StockLog,
    DailyInventory, Promotion, Bundle, BundleItem, SpecialOrder,
    SpecialOrderItem, SpecialOrderStatus, DebtAllocationConfig
} from '../../types';
import type { ForecastOutput } from '../lib/forecasting';
import { ProductionForecast } from '../lib/forecasting/types';

import type { User, Session } from '@supabase/supabase-js';

// ==================== SLICE INTERFACES ====================

export interface AuthSlice {
    user: User | null;
    session: Session | null;
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

    // NEW: Multi-Wallet Support
    selectedWalletId: string | null; // null = Main Store, UUID = External Shop
    setSelectedWalletId: (id: string | null) => void;
    recalculateJarBalances: () => void;

    // Debt-First Allocation (v2.0)
    debtConfig: DebtAllocationConfig;
    updateDebtConfig: (config: Partial<DebtAllocationConfig>) => Promise<void>;
    addToDebtAccumulated: (amount: number) => Promise<void>;

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
    executeAllocation: (
        amount: number,
        allocations: Record<JarType, number>,
        fromProfit?: boolean,
        specificProfits?: { id: string; amount: number }[],
        manualDebtAmount?: number
    ) => Promise<void>;
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
    fetchInventoryByDateRange: (startDate: string, endDate: string) => Promise<void>; // NEW
    upsertDailyInventory: (record: Partial<DailyInventory> & { businessDate: string; productId: string; variantId?: string }) => Promise<void>;
    bulkUpsertDailyInventory: (records: Array<Partial<DailyInventory> & { businessDate: string; productId: string; variantId?: string; variantName?: string }>) => Promise<void>;
    getYesterdayStock: (productId: string, todayDate: string, variantId?: string) => number;
    deductStockByRecipe: (productId: string, quantity: number, variantId?: string) => void;
    deductStockForBundleOrder: (orderId: string) => Promise<void>; // NEW: Deduct stock for Bundle orders
    bulkDeductStockByRecipes: (deductions: Array<{ productId: string; quantity: number; variantId?: string }>) => Promise<{ success: boolean; errors: string[]; updatedCount: number }>;
    bulkAdjustStock: (adjustments: Array<{
        ingredientId: string;
        quantity: number;
        reason?: 'PO' | 'USAGE' | 'WASTE' | 'SPILLAGE' | 'CORRECTION';
        note?: string;
    }>) => Promise<{ success: boolean; errors: string[]; updatedCount: number }>;
    saveDailyMarketSales: (params: {
        date: string;
        marketId: string;
        marketName: string;
        weatherCondition: string | null;
        logs: Array<{
            productId: string;
            variantId?: string;
            preparedQty: number;
            soldQty: number;
            wasteQty: number;
            freeQty: number;
            pricePerUnit: number;
            costPerUnit: number;
            productName: string;
            category: string;
            variantName?: string;
        }>;
        totalRevenue: number;
        totalCOGS: number;
        totalWasteCost: number;
        trueProfit: number;
    }) => Promise<void>;
}

export interface ProductsSlice {
    products: Product[];
    dailyReports: DailyReport[];
    productionForecasts: ProductionForecast[];

    addProduct: (product: Product) => void;
    updateProduct: (id: string, updates: Partial<Product>) => void;
    removeProduct: (id: string) => void;

    // 🆕 Toggle product active/inactive (สวิตช์พักขาย)
    toggleProductActive: (id: string) => Promise<void>;

    // 🆕 Toggle variant active/inactive (สวิตช์พักขายระดับ Variant)
    toggleVariantActive: (productId: string, variantId: string) => Promise<void>;

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
    deleteForecastsForMarket: (marketId: string) => Promise<void>;
    deleteForecastsByDate: (date: string) => Promise<void>; // NEW
    generateAutoForecasts: (targetDate?: string) => Promise<void>; // NEW
}

// ProductSaleLog is now defined above to include new fields
// export interface ProductSaleLog { ... } // Removed duplicate

export interface SalesSlice {
    productSales: ProductSaleLog[];
    markets: Market[];
    marketSchedules: import('../../types').MarketSchedule[]; // NEW

    addProductSaleLog: (log: ProductSaleLog) => Promise<void>;
    addProductSaleLogs: (logs: ProductSaleLog[]) => Promise<void>;
    fetchProductSales: () => Promise<void>;
    getProductSalesByDate: (date: string) => ProductSaleLog[];
    getProductSalesByDateRange: (fromDate: string, toDate: string) => ProductSaleLog[];
    getProductSalesByProduct: (productId: string) => ProductSaleLog[];
    updateProductSaleLog: (id: string, updates: Partial<ProductSaleLog>) => Promise<void>;

    addMarket: (market: Market) => void;
    updateMarket: (id: string, updates: Partial<Market>) => void;
    removeMarket: (id: string) => void;

    // Market Schedule
    addMarketSchedule: (schedule: Omit<import('../../types').MarketSchedule, 'id' | 'createdAt'>) => Promise<void>;
    updateMarketSchedule: (id: string, updates: Partial<import('../../types').MarketSchedule>) => Promise<void>;
    removeMarketSchedule: (id: string) => Promise<void>;
    fetchMarketSchedules: () => Promise<void>;

    // Market Trip Logs (Auto Market Trip & Skip Option)
    marketTripLogs: import('../../types').MarketTripLog[];
    fetchMarketTripLogs: () => Promise<void>;
    saveMarketTripLog: (log: Partial<import('../../types').MarketTripLog> & { date: string; marketId: string }) => Promise<void>;
    toggleMarketTripStatus: (date: string, marketId: string, status: 'visited' | 'skipped' | 'auto_logged', marketName?: string) => Promise<void>;
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
    // Global Date Filter for syncing across pages
    globalDateFilter: {
        preset: string;
        fromDate: string;
        toDate: string;
        label: string;
    };
    setGlobalDateFilter: (filter: { preset: string, fromDate: string, toDate: string, label: string }) => void;
    loadStore: (state: Partial<AppState>) => void;
    fetchData: () => Promise<void>;
    resetStore: () => void;
    subscribeToRealtime: () => void;
    unsubscribeFromRealtime: () => void;
}

// ==================== NEW SLICES (Snack Box & Promotion System) ====================

// Import from slice files for actual implementation
import { ShopInfoSlice } from './slices/shopInfoSlice';
import { SnackBoxSlice } from './slices/snackBoxSlice';
import { PromotionOrderSlice } from './slices/promotionOrderSlice';
import { SnackBoxOrderSlice } from './slices/snackBoxOrderSlice';
import { QuotationSlice } from './slices/quotationSlice';
import { InvoiceSlice } from './slices/invoiceSlice';
import { ReceiptSlice } from './slices/receiptSlice';
import { ConsignmentSlice } from './slices/consignmentSlice';

export type { ShopInfoSlice, SnackBoxSlice, PromotionOrderSlice, SnackBoxOrderSlice, QuotationSlice, InvoiceSlice, ReceiptSlice, ConsignmentSlice };

// ==================== COMBINED APP STATE ====================

export type AppState = AuthSlice & FinanceSlice & InventorySlice & ProductsSlice & SalesSlice & PromotionSlice & SharedActions & ShopInfoSlice & SnackBoxSlice & PromotionOrderSlice & SnackBoxOrderSlice & QuotationSlice & InvoiceSlice & ReceiptSlice & ConsignmentSlice;

// Re-export types for convenience
export type {
    Jar, Transaction, Ingredient, PurchaseOrder, Product, DailyReport,
    JarType, Market, Goal, Alert, JarHistory, JarCustomization,
    UnallocatedProfit, ProductSaleLog, AllocationProfile, StockLog,
    DailyInventory, Promotion, Bundle, BundleItem, SpecialOrder,
    SpecialOrderItem, SpecialOrderStatus, ForecastOutput, ProductionForecast
};

// Re-export new types
export type {
    ShopInfo, PackagingOption, SnackBoxSet, SnackBoxSetItem,
    SnackBoxOrder, SnackBoxOrderStatus,
    PromotionOrder, PromotionOrderItem, PromotionOrderStatus,
    Quotation, QuotationItem, QuotationStatus,
    Invoice, InvoiceStatus,
    Receipt, PaymentMethod,
    ConsignmentOrder, ConsignmentOrderItem, ConsignmentOrderStatus,
    ExternalShop
} from '../../types';
