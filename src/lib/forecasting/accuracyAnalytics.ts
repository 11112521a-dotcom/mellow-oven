import { Product, ProductSaleLog } from '@/types';

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
}

export interface AccuracyAnalysisResult {
    comparisons: {
        date: string;
        forecasts: ProductionForecast[];
        sales: ProductSaleLog[];
        records: ComparisonRecord[]; // Add this
        totalForecastQty: number;
        totalActualQty: number;
        accuracy: number;
        matchCount: number;
    }[];
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
    marketAccuracy: {
        marketId: string;
        marketName: string;
        accuracy: number;
        sampleSize: number;
        totalForecasts: number;
        wasteQty: number;
        stockoutQty: number;
        avgBias: number;
    }[];
    dayAccuracy: {
        day: number;
        dayName: string;
        accuracy: number;
        sampleSize: number;
    }[];
    productAccuracy: {
        productId: string;
        productName: string;
        accuracy: number;
        sampleSize: number;
        avgBias: number;
        biasPercent: number;
        wasteQty: number;
        stockoutQty: number;
        wasteCost: number;
        stockoutRevenue: number;
    }[];
    dailyTrend: {
        date: string;
        accuracy: number;
        forecastCount: number;
        matchCount: number;
    }[];
    recommendations: {
        type: string;
        target: string;
        issue: string;
        suggestion: string;
        priority: string;
    }[];
}

export function analyzeAccuracy(
    forecasts: ProductionForecast[],
    sales: ProductSaleLog[],
    products: Product[]
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
        const actual = findActualSale(f, salesOnDate);
        const actualQty = actual?.quantitySold || 0;
        const diff = f.optimalQuantity - actualQty;

        // Find product to get cost info
        const product = products.find(p => p.id === f.productId || p.variants?.some(v => v.id === f.productId));
        const variant = product?.variants?.find(v => v.id === f.productId);
        const unitPrice = variant?.price || product?.price || 0;
        const unitCost = variant?.cost || product?.cost || 0;

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
            diff,
            accuracy: actualQty > 0 ? Math.max(0, (1 - Math.abs(diff) / actualQty) * 100) : (f.optimalQuantity === 0 ? 100 : 0),
            waste: diff > 0 ? diff : 0,
            stockout: diff < 0 ? Math.abs(diff) : 0,
            wasteCost: diff > 0 ? diff * unitCost : 0,
            stockoutRevenue: diff < 0 ? Math.abs(diff) * (unitPrice - unitCost) : 0
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
                matchCount: validRecs.length
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

    // 7. Recommendations
    const recommendations: { type: string, target: string, issue: string, suggestion: string, priority: string }[] = [];

    marketAccuracy.filter(m => m.accuracy < 60 && m.sampleSize >= 2).forEach(m => {
        recommendations.push({
            type: 'market',
            target: m.marketName,
            issue: `ความแม่นยำ ${m.accuracy.toFixed(0)}% (ต่ำกว่าเกณฑ์)`,
            suggestion: m.avgBias > 0 ? 'ลดจำนวนการผลิตลง' : 'เพิ่มจำนวนการผลิตขึ้น',
            priority: 'high'
        });
    });

    productAccuracy.filter(p => Math.abs(p.biasPercent) > 20 && p.sampleSize >= 2).forEach(p => {
        recommendations.push({
            type: 'product',
            target: p.productName,
            issue: p.biasPercent > 0 ? `มักผลิตเกิน ${p.biasPercent.toFixed(0)}%` : `มักผลิตขาด ${Math.abs(p.biasPercent).toFixed(0)}%`,
            suggestion: p.biasPercent > 0 ? `ลดการผลิต ~${Math.abs(p.avgBias).toFixed(0)} ชิ้น` : `เพิ่มการผลิต ~${Math.abs(p.avgBias).toFixed(0)} ชิ้น`,
            priority: Math.abs(p.biasPercent) > 30 ? 'high' : 'medium'
        });
    });

    dayAccuracy.filter(d => d.accuracy < 60 && d.sampleSize >= 2).forEach(d => {
        recommendations.push({
            type: 'day',
            target: `วัน${d.dayName}`,
            issue: `ความแม่นยำ ${d.accuracy.toFixed(0)}%`,
            suggestion: 'ทบทวน pattern การขายวันนี้',
            priority: 'medium'
        });
    });

    // 8. Legacy Comparisons
    const forecastsByDate = forecasts.reduce((acc, f) => {
        if (!acc[f.forecastForDate]) acc[f.forecastForDate] = [];
        acc[f.forecastForDate].push(f);
        return acc;
    }, {} as Record<string, ProductionForecast[]>);

    const comparisons = Object.keys(forecastsByDate).map(date => {
        const dayForecasts = forecastsByDate[date];
        const daySales = sales.filter(s => s.saleDate === date);
        let totalForecastQty = 0;
        let totalActualQty = 0;
        let matchCount = 0;

        dayForecasts.forEach(f => {
            const actual = findActualSale(f, daySales);
            if (actual) {
                totalForecastQty += f.optimalQuantity;
                totalActualQty += actual.quantitySold;
                matchCount++;
            }
        });

        const accuracy = totalActualQty > 0 ? 1 - (Math.abs(totalForecastQty - totalActualQty) / totalActualQty) : 0;
        const dayRecords = records.filter(r => r.date === date);

        return {
            date,
            forecasts: dayForecasts,
            sales: daySales,
            records: dayRecords,
            totalForecastQty,
            totalActualQty,
            accuracy: Math.max(0, accuracy * 100),
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
