/**
 * Database Row Types for Supabase
 * 
 * These types represent the raw data structure from Supabase tables.
 * They are used to type the responses from Supabase queries before
 * mapping to application types.
 * 
 * Naming Convention: Db{TableName}Row
 */

// ==================== TRANSACTIONS ====================
export interface DbTransactionRow {
    id: string;
    date: string;
    amount: number | string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    from_jar: string | null;
    to_jar: string | null;
    description: string | null;
    category: string | null;
    market_id: string | null;
    created_at?: string;
}

// ==================== INGREDIENTS ====================
export interface DbIngredientRow {
    id: string;
    name: string;
    unit: string;
    current_stock: number | string;
    cost_per_unit: number | string;
    supplier: string | null;
    last_updated: string | null;
    buy_unit: string | null;
    conversion_rate: number | string | null;
    min_stock: number | string | null;
    is_hidden: boolean | null;
}

// ==================== PRODUCT SALES ====================
export interface DbProductSaleLogRow {
    id: string;
    recorded_at: string;
    sale_date: string;
    market_id: string;
    market_name: string;
    product_id: string;
    product_name: string;
    category: string;
    quantity_sold: number;
    price_per_unit: number;
    total_revenue: number;
    cost_per_unit: number;
    total_cost: number;
    gross_profit: number;
    variant_id: string | null;
    variant_name: string | null;
    waste_qty: number | null;
    weather_condition: string | null;
}

// ==================== PRODUCTION FORECASTS ====================
export interface DbProductionForecastRow {
    id: string;
    created_at: string;
    product_id: string;
    product_name: string;
    market_id: string | null;
    market_name: string | null;
    forecast_for_date: string;
    weather_forecast: string | null;
    historical_data_points: number;
    baseline_forecast: number;
    weather_adjusted_forecast: number;
    lambda_poisson: number;
    optimal_quantity: number;
    service_level_target: number;
    stockout_probability: number;
    waste_probability: number;
    unit_price: number;
    unit_cost: number;
    expected_demand: number;
    expected_profit: number;
    confidence_level: 'high' | 'medium' | 'low';
    prediction_interval_lower: number;
    prediction_interval_upper: number;
    outliers_removed: number;
}

// ==================== DAILY INVENTORY ====================
export interface DbDailyInventoryRow {
    id: string;
    created_at: string;
    business_date: string;
    product_id: string;
    variant_id: string | null;
    variant_name: string | null;
    produced_qty: number;
    to_shop_qty: number;
    sold_qty: number;
    waste_qty: number | null;
    stock_yesterday: number;
    leftover_home: number;
    unsold_shop: number;
}

// ==================== PRODUCTS ====================
export interface DbProductRow {
    id: string;
    name: string;
    category: string;
    flavor: string | null;
    price: number | string;
    cost: number | string;
    recipe_id: string | null;
}

// ==================== JARS ====================
export interface DbJarRow {
    id: string;
    name: string;
    balance: number | string;
    allocation_percent: number | string;
    description: string | null;
}

// ==================== MARKETS ====================
export interface DbMarketRow {
    id: string;
    name: string;
    location: string | null;
    description: string | null;
    color: string | null;
}

// ==================== STOCK LOGS ====================
export interface DbStockLogRow {
    id: string;
    date: string;
    ingredient_id: string;
    amount: number | string;
    reason: 'PO' | 'USAGE' | 'WASTE' | 'SPILLAGE' | 'CORRECTION';
    note: string | null;
}

// ==================== GOALS ====================
export interface DbGoalRow {
    id: string;
    jar_id: string;
    name: string;
    target_amount: number | string;
    current_amount: number | string;
    deadline: string | null;
    icon: string;
    created_at: string;
}

// ==================== UNALLOCATED PROFITS ====================
export interface DbUnallocatedProfitRow {
    id: string;
    date: string;
    amount: number | string;
    source: string;
    created_at: string;
}

// ==================== ALLOCATION PROFILES ====================
export interface DbAllocationProfileRow {
    id: string;
    name: string;
    allocations: Record<string, number>;
    created_at?: string;
}

// ==================== PROMOTIONS ====================
export interface DbPromotionRow {
    id: string;
    name: string;
    description: string | null;
    product_id: string;
    product_name: string;
    variant_id: string | null;
    variant_name: string | null;
    original_price: number;
    discount_price: number;
    discount_percent: number;
    min_quantity: number;
    max_quantity: number | null;
    valid_from: string | null;
    valid_until: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// ==================== BUNDLES ====================
export interface DbBundleRow {
    id: string;
    name: string;
    description: string | null;
    bundle_price: number;
    estimated_cost: number;
    profit_margin: number;
    is_active: boolean;
    image_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface DbBundleItemRow {
    id: string;
    bundle_id: string;
    product_id: string;
    product_name: string;
    variant_id: string | null;
    variant_name: string | null;
    quantity: number;
    unit_cost: number;
    subtotal_cost: number;
    sort_order: number;
}

// ==================== SPECIAL ORDERS ====================
export interface DbSpecialOrderRow {
    id: string;
    order_number: string;
    order_date: string;
    delivery_date: string;
    order_type: 'promotion' | 'bundle' | 'custom';
    promotion_id: string | null;
    bundle_id: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    customer_note: string | null;
    total_quantity: number;
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    status: 'pending' | 'confirmed' | 'producing' | 'delivered' | 'cancelled';
    stock_deducted: boolean;
    stock_deducted_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface DbSpecialOrderItemRow {
    id: string;
    special_order_id: string;
    product_id: string;
    product_name: string;
    variant_id: string | null;
    variant_name: string | null;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    subtotal_revenue: number;
    subtotal_cost: number;
    subtotal_profit: number;
    sort_order: number;
}
