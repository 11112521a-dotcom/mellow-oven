# Store Integration Code for Production Forecasts

## ⚠️ MANUAL INTEGRATION REQUIRED
**Copy-paste these code blocks into `src/store.ts` at the specified locations**

---

## 1️⃣ ADD IMPORTS (Line ~5, after existing imports)

```typescript
import type { ForecastOutput } from './lib/forecasting';
import { ProductionForecast, forecastOutputToDbFormat } from './lib/forecasting/types';
```

---

## 2️⃣ ADD TO AppState INTERFACE (After line  ~33, after `getProductSalesByProduct`)

```typescript
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
```

---

## 3️⃣ ADD TO INITIAL STATE (After `productSales: [],` around line ~201)

```typescript
            // Production Forecasts
            productionForecasts: [],
```

---

## 4️⃣ ADD FUNCTIONS (Before the CLOSING `}), {` at the very end, around line ~360)

**Location:** Find this line: `return state.productSales.filter(sale => sale.productId === productId);`
**Insert AFTER that closing `},` and BEFORE the final `}), {`:**

```typescript
            // ==================== PRODUCTION FORECASTS ====================

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
                    id: crypto.randomUUID(),
                    createdAt: new Date().toISOString(),
                    ...forecastData
                };

                // Save to local state
                set(state => ({
                    productionForecasts: [...state.productionForecasts, newForecast]
                }));

                // Save to Supabase (will fail gracefully if table doesn't exist)
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
                    console.warn('[Forecast] Supabase save skipped:', error);
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

                // Return most recent
                return forecasts.sort((a, b) =>
                    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )[0];
            },
```

---

## ✅ VERIFICATION

After adding all  4 blocks, run:
```bash
npm run dev
```

Should see NO typescript errors. If you do, check:
- Commas are correct (between functions)
- Imports are at the top
- Functions are inside the `(set, get) => ({ ... })` block

---

## 🧪 TEST

In browser console:
```javascript
import { useStore } from './src/store';

// Test save
const testForecast = {
  optimalQuantity: 20,
  baselineForecast: 18,
  weatherAdjustedForecast: 20,
  lambdaPoisson: 20,
  serviceLevelTarget: 0.75,
  stockoutProbability: 0.25,
  wasteProbability: 0.15,
  confidenceLevel: 'high',
  historicalDataPoints: 10,
  predictionIntervalLower: 15,
  predictionIntervalUpper: 25,
  outliersRemoved: 2,
  unitPrice: 30,
  unitCost: 10,
  expectedDemand: 20,
  expectedProfit: 400
};

useStore.getState().saveForecast(
  testForecast,
  'product-123',
  'Croissant',
  'storefront',
  'หน้าร้าน',
  '2025-12-01',
  'sunny'
);

// Check state
console.log(useStore.getState().productionForecasts);
```
