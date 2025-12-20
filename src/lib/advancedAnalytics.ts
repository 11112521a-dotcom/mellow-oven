import { Product, ProductSaleLog, DailyProductionLog } from '@/types';

// ==================== Types ====================

export interface MenuMatrixItem {
    id: string;
    name: string;
    soldQty: number;
    profitPerUnit: number;
    totalProfit: number;
    class: 'Star' | 'Plowhorse' | 'Puzzle' | 'Dog';
}

export interface ABCItem {
    id: string;
    name: string;
    revenue: number;
    cumulativePercent: number;
    class: 'A' | 'B' | 'C';
}

export interface WasteItem {
    id: string;
    name: string;
    wasteQty: number;
    wasteCost: number;
    percentOfTotalWaste: number;
}

// Demand Variability Analysis Types
export interface DemandVariabilityItem {
    id: string;
    name: string;
    avgDailySales: number;        // Mean daily sales
    stdDev: number;               // Standard Deviation
    cv: number;                   // Coefficient of Variation (CV = StdDev / Mean)
    totalSales: number;           // Total units sold
    daysWithSales: number;        // Number of days with sales data
    class: 'CashCow' | 'WildCard' | 'SlowMover' | 'QuestionMark';
}

// ==================== Logic ====================

/**
 * 1. Menu Engineering (BCG Matrix)
 * Classifies products into 4 quadrants based on Popularity (Sold Qty) and Profitability (Profit/Unit)
 */
export function calculateMenuMatrix(products: Product[], salesLogs: ProductSaleLog[]): { data: MenuMatrixItem[], thresholds: { avgSold: number, avgProfit: number } } {
    const productStats = new Map<string, { sold: number, revenue: number, cost: number }>();

    // Aggregate Sales
    salesLogs.forEach(log => {
        const key = log.variantId || log.productId;
        const current = productStats.get(key) || { sold: 0, revenue: 0, cost: 0 };
        productStats.set(key, {
            sold: current.sold + log.quantitySold,
            revenue: current.revenue + log.totalRevenue,
            cost: current.cost + log.totalCost
        });
    });

    // Calculate Averages
    let totalSold = 0;
    let totalProfit = 0;
    let itemCount = 0;

    const items: MenuMatrixItem[] = [];

    products.forEach(p => {
        // Handle Variants
        if (p.variants && p.variants.length > 0) {
            p.variants.forEach(v => {
                const stats = productStats.get(v.id) || { sold: 0, revenue: 0, cost: 0 };
                const profitPerUnit = v.price - v.cost;
                const totalItemProfit = stats.revenue - stats.cost;

                items.push({
                    id: v.id,
                    name: `${p.name} - ${v.name}`,
                    soldQty: stats.sold,
                    profitPerUnit: profitPerUnit,
                    totalProfit: totalItemProfit,
                    class: 'Dog' // Placeholder
                });

                totalSold += stats.sold;
                totalProfit += profitPerUnit; // Average Profit per Unit calculation
                itemCount++;
            });
        } else {
            // Handle Single Product
            const stats = productStats.get(p.id) || { sold: 0, revenue: 0, cost: 0 };
            const profitPerUnit = p.price - p.cost;
            const totalItemProfit = stats.revenue - stats.cost;

            items.push({
                id: p.id,
                name: p.name,
                soldQty: stats.sold,
                profitPerUnit: profitPerUnit,
                totalProfit: totalItemProfit,
                class: 'Dog' // Placeholder
            });

            totalSold += stats.sold;
            totalProfit += profitPerUnit;
            itemCount++;
        }
    });

    const avgSold = itemCount > 0 ? totalSold / itemCount : 0;
    const avgProfit = itemCount > 0 ? totalProfit / itemCount : 0;

    // Classify
    items.forEach(item => {
        if (item.soldQty >= avgSold && item.profitPerUnit >= avgProfit) item.class = 'Star';
        else if (item.soldQty >= avgSold && item.profitPerUnit < avgProfit) item.class = 'Plowhorse';
        else if (item.soldQty < avgSold && item.profitPerUnit >= avgProfit) item.class = 'Puzzle';
        else item.class = 'Dog';
    });

    return { data: items, thresholds: { avgSold, avgProfit } };
}

/**
 * 2. ABC Analysis
 * Classifies products by Revenue Contribution (A=Top 80%, B=Next 15%, C=Bottom 5%)
 */
export function performABCAnalysis(products: Product[], salesLogs: ProductSaleLog[]): ABCItem[] {
    const revenueMap = new Map<string, number>();
    let totalRevenue = 0;

    salesLogs.forEach(log => {
        const key = log.variantId || log.productId;
        const amount = log.totalRevenue;
        revenueMap.set(key, (revenueMap.get(key) || 0) + amount);
        totalRevenue += amount;
    });

    const items: ABCItem[] = [];

    products.forEach(p => {
        if (p.variants && p.variants.length > 0) {
            p.variants.forEach(v => {
                items.push({
                    id: v.id,
                    name: `${p.name} - ${v.name}`,
                    revenue: revenueMap.get(v.id) || 0,
                    cumulativePercent: 0,
                    class: 'C'
                });
            });
        } else {
            items.push({
                id: p.id,
                name: p.name,
                revenue: revenueMap.get(p.id) || 0,
                cumulativePercent: 0,
                class: 'C'
            });
        }
    });

    // Sort by Revenue Descending
    items.sort((a, b) => b.revenue - a.revenue);

    // Calculate Cumulative Percent
    let currentRevenue = 0;
    items.forEach(item => {
        currentRevenue += item.revenue;
        item.cumulativePercent = totalRevenue > 0 ? (currentRevenue / totalRevenue) * 100 : 0;

        if (item.cumulativePercent <= 80) item.class = 'A';
        else if (item.cumulativePercent <= 95) item.class = 'B';
        else item.class = 'C';
    });

    return items;
}

/**
 * 4. Waste Analysis
 * Identifies top items contributing to waste cost
 */
export function analyzeWaste(productionLogs: DailyProductionLog[], products: Product[]): WasteItem[] {
    const wasteMap = new Map<string, { qty: number, cost: number }>();
    let totalWasteCost = 0;

    productionLogs.forEach(log => {
        if (log.wasteQty > 0) {
            const key = log.variantId || log.productId;

            // Find cost
            let unitCost = 0;
            const product = products.find(p => p.id === log.productId);
            if (product) {
                if (log.variantId && product.variants) {
                    const v = product.variants.find(v => v.id === log.variantId);
                    unitCost = v ? v.cost : product.cost;
                } else {
                    unitCost = product.cost;
                }
            }

            const cost = log.wasteQty * unitCost;
            const current = wasteMap.get(key) || { qty: 0, cost: 0 };

            wasteMap.set(key, {
                qty: current.qty + log.wasteQty,
                cost: current.cost + cost
            });
            totalWasteCost += cost;
        }
    });

    const items: WasteItem[] = [];
    wasteMap.forEach((val, key) => {
        // Find name
        let name = 'Unknown';
        const product = products.find(p => p.id === key || (p.variants && p.variants.some(v => v.id === key)));
        if (product) {
            if (product.id === key) {
                name = product.name;
            } else if (product.variants) {
                const v = product.variants.find(v => v.id === key);
                if (v) name = `${product.name} - ${v.name}`;
            }
        }

        items.push({
            id: key,
            name,
            wasteQty: val.qty,
            wasteCost: val.cost,
            percentOfTotalWaste: totalWasteCost > 0 ? (val.cost / totalWasteCost) * 100 : 0
        });
    });

    return items.sort((a, b) => b.wasteCost - a.wasteCost).slice(0, 5);
}

/**
 * 5. Demand Variability Analysis
 * Uses Coefficient of Variation (CV = StdDev / Mean) to classify demand stability
 * Quadrants:
 *   - CashCow: High Velocity + Low CV (reliable sellers)
 *   - WildCard: High Velocity + High CV (popular but unpredictable)
 *   - SlowMover: Low Velocity + Low CV (consistent but slow)
 *   - QuestionMark: Low Velocity + High CV (unstable and slow - review needed)
 */
export function calculateDemandVariability(
    products: Product[],
    salesLogs: ProductSaleLog[]
): { data: DemandVariabilityItem[], thresholds: { avgVelocity: number, avgCV: number } } {
    // Group sales by product/variant and date
    const salesByProductDate = new Map<string, Map<string, number>>();
    const productNames = new Map<string, string>();

    salesLogs.forEach(log => {
        const key = log.variantId || log.productId;
        const name = log.variantName ? `${log.productName} (${log.variantName})` : log.productName;
        productNames.set(key, name);

        if (!salesByProductDate.has(key)) {
            salesByProductDate.set(key, new Map());
        }
        const dateMap = salesByProductDate.get(key)!;
        dateMap.set(log.saleDate, (dateMap.get(log.saleDate) || 0) + log.quantitySold);
    });

    const items: DemandVariabilityItem[] = [];

    salesByProductDate.forEach((dateMap, productId) => {
        const dailySales = Array.from(dateMap.values());
        const daysWithSales = dailySales.length;

        if (daysWithSales < 2) return; // Need at least 2 data points

        const totalSales = dailySales.reduce((sum, val) => sum + val, 0);
        const mean = totalSales / daysWithSales;

        // Calculate Standard Deviation
        const squaredDiffs = dailySales.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / daysWithSales;
        const stdDev = Math.sqrt(variance);

        // Coefficient of Variation
        const cv = mean > 0 ? stdDev / mean : 0;

        items.push({
            id: productId,
            name: productNames.get(productId) || 'Unknown',
            avgDailySales: mean,
            stdDev,
            cv,
            totalSales,
            daysWithSales,
            class: 'QuestionMark' // Placeholder
        });
    });

    // Calculate thresholds (averages)
    const totalVelocity = items.reduce((sum, i) => sum + i.avgDailySales, 0);
    const totalCV = items.reduce((sum, i) => sum + i.cv, 0);
    const avgVelocity = items.length > 0 ? totalVelocity / items.length : 0;
    const avgCV = items.length > 0 ? totalCV / items.length : 0;

    // Classify into quadrants
    items.forEach(item => {
        const isHighVelocity = item.avgDailySales >= avgVelocity;
        const isHighCV = item.cv >= avgCV;

        if (isHighVelocity && !isHighCV) item.class = 'CashCow';
        else if (isHighVelocity && isHighCV) item.class = 'WildCard';
        else if (!isHighVelocity && !isHighCV) item.class = 'SlowMover';
        else item.class = 'QuestionMark';
    });

    return { data: items, thresholds: { avgVelocity, avgCV } };
}
