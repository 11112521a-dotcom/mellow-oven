import { Product, ProductSaleLog, DailyInventory } from '@/types';
import { generateChillAdvice } from './aiAdvisor';

export interface ProductionForecast {
    id: string;
    productId: string;
    variantId?: string;
    productName: string;
    marketId?: string;
    marketName?: string;
    forecastForDate: string;
    optimalQuantity: number;
    // ... potentially other fields
}

export interface ComparisonRecord {
    date: string;
    dayOfWeek: number;
    dayName: string;
    marketId: string;
    marketName: string;
    productId: string;
    productName: string;
    forecastQty: number;
    actualQty: number;
    diff: number; // positive = waste, negative = stockout
    accuracy: number;
    waste: number;
    stockout: number;
    wasteCost: number;
    stockoutRevenue: number;
    status: 'pending' | 'success' | 'waste' | 'stockout'; // NEW field
    toShopQty: number; // NEW: Stock sent to shop
    leftoverQty: number; // NEW: Remaining stock at end of day
}

export interface AccuracyAnalysisResult {
    comparisons: any[]; // refine type later if needed
    records: ComparisonRecord[];
    summary: {
        totalDays: number;
        daysWithData: number;
        overallAccuracy: number;
        overallBiasPercent: number;
        totalForecasts: number;
        totalWasteQty: number;
        totalStockoutQty: number;
        totalWasteCost: number;
        totalStockoutRevenue: number;
    };
    marketAccuracy: any[];
    dayAccuracy: any[];
    productAccuracy: any[];
    dailyTrend: any[];
    recommendations: any[];
}

export function analyzeAccuracy(
    forecasts: ProductionForecast[],
    sales: ProductSaleLog[],
    products: Product[],
    dailyInventory: DailyInventory[] = []
): AccuracyAnalysisResult {
    // Helper: Find actual sale
    const findActualSale = (f: ProductionForecast, salesList: ProductSaleLog[]) => {
        return salesList.find(s =>
            s.productId === f.productId ||
            s.variantId === f.productId ||
            s.productName === f.productName
        );
    };

    const records: ComparisonRecord[] = [];
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

    forecasts.forEach(f => {
        const dateObj = new Date(f.forecastForDate);
        const salesOnDate = sales.filter(s => s.saleDate === f.forecastForDate);
        const actualSale = findActualSale(f, salesOnDate);
        const actualQtyFromSales = actualSale ? actualSale.quantitySold : 0;
        const hasSalesData = !!actualSale;

        // CASE 1: Active Sales Day but Item NOT Sent (actualQty = 0)
        // Exclude to prevent false penalties.
        const inventory = dailyInventory.find(inv =>
            inv.businessDate === f.forecastForDate &&
            (inv.productId === f.productId || inv.variantId === f.productId)
        );

        // Logic: specific check for item NOT sent to shop
        if (inventory && inventory.toShopQty === 0 && !hasSalesData) return;
        // Fallback if no inventory but explicit 0 sales (legacy check)
        if (!inventory && hasSalesData && actualQtyFromSales === 0) return;

        // Find product to get cost info
        const product = products.find(p => p.id === f.productId || p.variants?.some(v => v.id === f.productId));
        const variant = product?.variants?.find(v => v.id === f.productId);
        const unitPrice = variant?.price || product?.price || 0;
        const unitCost = variant?.cost || product?.cost || 0;

        // --- NEW: Real Inventory Financials (The "Safety" Logic) ---
        let waste = 0;
        let stockout = 0;
        let actualQty = actualQtyFromSales; // Initialize actualQty with sales data

        if (inventory) {
            // Case A: Real Inventory Data Available (Accurate Financials)
            // 1. Waste (Money Lost) = What actually wasn't sold (Leftover at Shop)
            waste = Math.max(0, inventory.unsoldShop);

            // 2. Stockout (Missed Opportunity)
            // Only possible if we have 0 items left (Sold Out)
            if (inventory.unsoldShop <= 0) {
                // If sold out, did we miss sales? 
                // We compare Forecast (Demand) vs Actual Sold.
                stockout = Math.max(0, f.optimalQuantity - inventory.soldQty);
            } else {
                // If we have items left, we CANNOT have a stockout (we met demand)
                stockout = 0;
            }

            // Sync ActualQty with Inventory if sales log is missing but inventory exists
            if (!actualSale && inventory.soldQty > 0) {
                actualQty = inventory.soldQty;
            }
        } else {
            // Case B: Fallback to Forecast-Only Logic (Estimated)
            const diffForecastVsActual = f.optimalQuantity - actualQtyFromSales;
            if (diffForecastVsActual > 0) waste = diffForecastVsActual; // Forecast > Actual = Waste
            else stockout = Math.abs(diffForecastVsActual); // Forecast < Actual = Stockout
        }

        // Costs
        const wasteCost = waste * unitCost; // Money Lost on UNSOLD items
        const stockoutRevenue = stockout * (unitPrice - unitCost); // Opportunity Cost

        // Status
        let status: ComparisonRecord['status'] = 'success';
        // A record is pending if there's no sales data AND no inventory data for the date
        const isPending = !hasSalesData && !inventory;

        if (isPending) status = 'pending';
        else if (waste > 0) status = 'waste';
        else if (stockout > 0) status = 'stockout';

        // Calculate diff based on forecast vs actual sales (for AI accuracy score)
        const diffForecastVsActual = f.optimalQuantity - actualQty;

        records.push({
            date: f.forecastForDate,
            dayOfWeek: dateObj.getDay(),
            dayName: dayNames[dateObj.getDay()],
            marketId: f.marketId || '',
            marketName: f.marketName || 'ทุกตลาด',
            productId: f.productId,
            productName: f.productName,
            forecastQty: f.optimalQuantity,
            actualQty,
            diff: diffForecastVsActual, // Keep Diff as "AI Accuracy" score
            accuracy: isPending ? 0 : (actualQty > 0 ? Math.max(0, (1 - Math.abs(diffForecastVsActual) / actualQty) * 100) : (f.optimalQuantity === 0 ? 100 : 0)),
            waste,
            stockout,
            wasteCost,
            stockoutRevenue,
            status,
            toShopQty: inventory?.toShopQty || 0, // NEW
            leftoverQty: inventory?.unsoldShop || 0 // NEW
        });
    });

    // 2. Market-level
    const marketMap = new Map<string, { name: string, records: ComparisonRecord[] }>();
    records.forEach(r => {
        const key = r.marketId || 'all';
        if (!marketMap.has(key)) {
            marketMap.set(key, { name: r.marketName, records: [] });
        }
        marketMap.get(key)!.records.push(r);
    });

    const marketAccuracy = Array.from(marketMap.entries()).map(([marketId, data]) => {
        const validRecords = data.records.filter(r => r.actualQty > 0);
        const avgAccuracy = validRecords.length > 0
            ? validRecords.reduce((sum, r) => sum + r.accuracy, 0) / validRecords.length
            : 0;
        const totalWaste = data.records.reduce((sum, r) => sum + r.waste, 0);
        const totalStockout = data.records.reduce((sum, r) => sum + r.stockout, 0);
        const totalBias = data.records.reduce((sum, r) => sum + r.diff, 0);

        return {
            marketId,
            marketName: data.name,
            accuracy: avgAccuracy,
            sampleSize: validRecords.length,
            totalForecasts: data.records.length,
            wasteQty: totalWaste,
            stockoutQty: totalStockout,
            avgBias: data.records.length > 0 ? totalBias / data.records.length : 0
        };
    }).sort((a, b) => b.accuracy - a.accuracy);

    // 3. Day-of-week
    const dayMap = new Map<number, ComparisonRecord[]>();
    for (let i = 0; i < 7; i++) dayMap.set(i, []);
    records.forEach(r => dayMap.get(r.dayOfWeek)!.push(r));

    const dayAccuracy = Array.from(dayMap.entries()).map(([day, recs]) => {
        const validRecs = recs.filter(r => r.actualQty > 0);
        return {
            day,
            dayName: dayNames[day],
            accuracy: validRecs.length > 0 ? validRecs.reduce((sum, r) => sum + r.accuracy, 0) / validRecs.length : 0,
            sampleSize: validRecs.length
        };
    });

    // 4. Product-level
    const productMap = new Map<string, { name: string, records: ComparisonRecord[] }>();
    records.forEach(r => {
        if (!productMap.has(r.productId)) {
            productMap.set(r.productId, { name: r.productName, records: [] });
        }
        productMap.get(r.productId)!.records.push(r);
    });

    const productAccuracy = Array.from(productMap.entries()).map(([productId, data]) => {
        const validRecords = data.records.filter(r => r.actualQty > 0);
        const avgAccuracy = validRecords.length > 0
            ? validRecords.reduce((sum, r) => sum + r.accuracy, 0) / validRecords.length
            : 0;
        const totalDiff = data.records.reduce((sum, r) => sum + r.diff, 0);
        const avgBias = data.records.length > 0 ? totalDiff / data.records.length : 0;
        const biasPercent = validRecords.length > 0 && validRecords.reduce((s, r) => s + r.actualQty, 0) > 0
            ? (totalDiff / validRecords.reduce((s, r) => s + r.actualQty, 0)) * 100
            : 0;

        return {
            productId,
            productName: data.name,
            accuracy: avgAccuracy,
            sampleSize: validRecords.length,
            avgBias,
            biasPercent,
            wasteQty: data.records.reduce((sum, r) => sum + r.waste, 0),
            stockoutQty: data.records.reduce((sum, r) => sum + r.stockout, 0),
            wasteCost: data.records.reduce((sum, r) => sum + r.wasteCost, 0),
            stockoutRevenue: data.records.reduce((sum, r) => sum + r.stockoutRevenue, 0)
        };
    }).sort((a, b) => b.accuracy - a.accuracy);

    // 5. Daily Trend
    const dateMap = new Map<string, ComparisonRecord[]>();
    records.forEach(r => {
        if (!dateMap.has(r.date)) dateMap.set(r.date, []);
        dateMap.get(r.date)!.push(r);
    });

    const dailyTrend = Array.from(dateMap.entries())
        .map(([date, recs]) => {
            const validRecs = recs.filter(r => r.actualQty > 0);
            return {
                date,
                accuracy: validRecs.length > 0 ? validRecs.reduce((sum, r) => sum + r.accuracy, 0) / validRecs.length : 0,
                forecastCount: recs.length,
                matchCount: validRecs.length,
                totalWasteCost: recs.reduce((sum, r) => sum + r.wasteCost, 0),
                totalStockoutRevenue: recs.reduce((sum, r) => sum + r.stockoutRevenue, 0)
            };
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 6. Summary
    const totalWasteCost = records.reduce((sum, r) => sum + r.wasteCost, 0);
    const totalStockoutRevenue = records.reduce((sum, r) => sum + r.stockoutRevenue, 0);
    const totalWasteQty = records.reduce((sum, r) => sum + r.waste, 0);
    const totalStockoutQty = records.reduce((sum, r) => sum + r.stockout, 0);

    const validRecords = records.filter(r => r.actualQty > 0);
    const overallAccuracy = validRecords.length > 0
        ? validRecords.reduce((sum, r) => sum + r.accuracy, 0) / validRecords.length
        : 0;
    const totalBias = records.reduce((sum, r) => sum + r.diff, 0);
    const overallBiasPercent = validRecords.reduce((s, r) => s + r.actualQty, 0) > 0
        ? (totalBias / validRecords.reduce((s, r) => s + r.actualQty, 0)) * 100
        : 0;

    // 7. Recommendations (Powered by AI Advisor "Chill Guide" 🧘)
    const recommendations: { type: string, target: string, issue: string, suggestion: string, priority: string }[] = [];

    marketAccuracy.filter(m => m.accuracy < 60 && m.sampleSize >= 2).forEach(m => {
        recommendations.push({
            type: 'market',
            target: m.marketName,
            issue: `ความแม่นยำ ${m.accuracy.toFixed(0)}% (ต่ำกว่าเกณฑ์)`,
            suggestion: m.avgBias > 0
                ? generateChillAdvice('waste')
                : generateChillAdvice('stockout'),
            priority: 'high'
        });
    });

    productAccuracy.filter(p => Math.abs(p.biasPercent) > 20 && p.sampleSize >= 2).forEach(p => {
        let issueType: 'waste' | 'stockout' | 'bias_over' | 'bias_under' | 'accuracy_low' = 'accuracy_low';

        if (p.biasPercent > 20) issueType = 'bias_over';
        else if (p.biasPercent < -20) issueType = 'bias_under';

        recommendations.push({
            type: 'product',
            target: p.productName,
            issue: p.biasPercent > 0 ? `มักผลิตเกิน ${p.biasPercent.toFixed(0)}%` : `มักผลิตขาด ${Math.abs(p.biasPercent).toFixed(0)}%`,
            suggestion: generateChillAdvice(issueType),
            priority: Math.abs(p.biasPercent) > 30 ? 'high' : 'medium'
        });
    });

    dayAccuracy.filter(d => d.accuracy < 60 && d.sampleSize >= 2).forEach(d => {
        recommendations.push({
            type: 'day',
            target: `วัน${d.dayName}`,
            issue: `ความแม่นยำ ${d.accuracy.toFixed(0)}%`,
            suggestion: generateChillAdvice('accuracy_low'),
            priority: 'medium'
        });
    });

    // 8. Legacy Comparisons
    // 8. Legacy Comparisons (Refactored to use robust 'records')
    const forecastsByDate = forecasts.reduce((acc, f) => {
        if (!acc[f.forecastForDate]) acc[f.forecastForDate] = [];
        acc[f.forecastForDate].push(f);
        return acc;
    }, {} as Record<string, ProductionForecast[]>);

    const comparisons = Object.keys(forecastsByDate).map(date => {
        const dayRecords = records.filter(r => r.date === date);
        const dayForecasts = forecastsByDate[date];
        const daySales = sales.filter(s => s.saleDate === date); // Keep for reference

        // Calculate daily stats from records (Single Source of Truth)
        const totalForecastQty = dayRecords.reduce((sum, r) => sum + r.forecastQty, 0);
        const totalActualQty = dayRecords.reduce((sum, r) => sum + r.actualQty, 0); // Uses inventory-aware actuals

        const validRecs = dayRecords.filter(r => r.actualQty > 0 || r.status !== 'pending'); // Count valid attempts
        const matchCount = validRecs.length;

        // ACCURACY CALCULATION: Average of individual accuracies
        // This prevents "Total Volume" masking (e.g. 100 apples + 0 oranges vs 0 apples + 100 oranges)
        // And is consistent with the Chart/Trend view.
        const avgAccuracy = validRecs.length > 0
            ? validRecs.reduce((sum, r) => sum + r.accuracy, 0) / validRecs.length
            : 0;

        return {
            date,
            forecasts: dayForecasts,
            sales: daySales,
            records: dayRecords,
            totalForecastQty,
            totalActualQty,
            accuracy: avgAccuracy, // No x100 here if the component expects 0-100? Wait, records.accuracy is 0-100.
            // records.accuracy is 0-100. Average is 0-100.
            // Previous code did: Math.max(0, accuracy * 100) where accuracy was 0-1.
            // So we just return avgAccuracy (which is 0-100).
            matchCount
        };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
        comparisons,
        records,
        summary: {
            totalDays: Object.keys(forecastsByDate).length,
            daysWithData: comparisons.filter(c => c.matchCount > 0).length,
            overallAccuracy,
            overallBiasPercent,
            totalForecasts: forecasts.length,
            totalWasteQty,
            totalStockoutQty,
            totalWasteCost,
            totalStockoutRevenue
        },
        marketAccuracy,
        dayAccuracy,
        productAccuracy,
        dailyTrend,
        recommendations
    };
}
