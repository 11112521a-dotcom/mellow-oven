// src/store/helpers/mappers.ts
import { Transaction, Ingredient, ProductSaleLog, DailyInventory } from '../../../types';
import { ProductionForecast } from '../../lib/forecasting/types';
import { JarType } from '../../../types';

export const mapTransaction = (t: any): Transaction => ({
    id: t.id,
    date: t.date,
    amount: Number(t.amount),
    type: t.type,
    fromJar: t.from_jar as JarType,
    toJar: t.to_jar as JarType,
    description: t.description ?? '',
    category: t.category,
    marketId: t.market_id
});

export const mapIngredient = (i: any): Ingredient => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    currentStock: Number(i.current_stock),
    costPerUnit: Number(i.cost_per_unit),
    supplier: i.supplier ?? '',
    lastUpdated: i.last_updated || new Date().toISOString(),
    buyUnit: i.buy_unit,
    conversionRate: Number(i.conversion_rate) || 1,
    minStock: Number(i.min_stock) || 10,
    isHidden: i.is_hidden ?? false
});

export const mapProductSaleLog = (s: any): ProductSaleLog => ({
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

export const mapProductionForecast = (f: any): ProductionForecast => ({
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

export const mapDailyInventory = (d: any): DailyInventory => ({
    id: d.id,
    createdAt: d.created_at,
    businessDate: d.business_date,
    productId: d.product_id,
    variantId: d.variant_id,
    variantName: d.variant_name,
    producedQty: d.produced_qty,
    toShopQty: d.to_shop_qty,
    soldQty: d.sold_qty,
    wasteQty: d.waste_qty ?? 0,
    stockYesterday: d.stock_yesterday,
    leftoverHome: d.leftover_home,
    unsoldShop: d.unsold_shop
});
