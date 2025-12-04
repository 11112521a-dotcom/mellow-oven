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
