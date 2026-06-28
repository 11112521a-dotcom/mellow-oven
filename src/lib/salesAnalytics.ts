import { ProductSaleLog, Market } from '../../types';
import { DateRange } from './dashboard/dashboardUtils';

export interface SalesSummary {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalQuantity: number;
    profitMargin: number;
    totalEatGiveaway: number;
    totalEatGiveawayCost: number;
    avgRevenuePerDay: number;
    avgProfitPerDay: number;
    uniqueDays: number;
}

export interface ProductGroupStats {
    productId: string;
    variantId?: string;
    productName: string;
    category: string;
    totalQuantity: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalWaste: number;
    totalEatGiveaway: number;
    dailySales: ProductSaleLog[];
}

export interface DailyBreakdownStat {
    date: string;
    revenue: number;
    profit: number;
    quantity: number;
    eatGiveaway: number;
    waste: number;
    weather: string;
    marketNames?: string[];
}

export interface MarketProductStat {
    productName: string;
    category: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
    eatGiveaway: number;
    waste: number;
}

export interface PerMarketStat {
    marketId: string;
    marketName: string;
    revenue: number;
    profit: number;
    quantity: number;
    eatGiveaway: number;
    waste: number;
    products: MarketProductStat[];
}

export interface WasteSummary {
    byProduct: { productName: string; wasteQty: number; wasteCost: number }[];
    totalWasteQty: number;
    totalWasteCost: number;
}

export const calculateSalesSummary = (filteredSales: ProductSaleLog[]): SalesSummary => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalCost = filteredSales.reduce((sum, s) => sum + s.totalCost, 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + s.grossProfit, 0);
    const totalQuantity = filteredSales.reduce((sum, s) => sum + s.quantitySold, 0);
    
    const totalEatGiveaway = filteredSales.reduce((sum, s) => sum + (s.eatQty || 0) + (s.giveawayQty || 0), 0);
    const totalEatGiveawayCost = filteredSales.reduce((sum, s) => sum + ((s.eatQty || 0) + (s.giveawayQty || 0)) * s.costPerUnit, 0);
    
    const uniqueDays = new Set(filteredSales.map(s => s.saleDate)).size;
    const avgRevenuePerDay = uniqueDays > 0 ? totalRevenue / uniqueDays : 0;
    const avgProfitPerDay = uniqueDays > 0 ? totalProfit / uniqueDays : 0;

    return { 
        totalRevenue, 
        totalCost, 
        totalProfit, 
        totalQuantity, 
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0, 
        totalEatGiveaway, 
        totalEatGiveawayCost, 
        avgRevenuePerDay, 
        avgProfitPerDay, 
        uniqueDays 
    };
};

export const calculateProductGroups = (filteredSales: ProductSaleLog[]): ProductGroupStats[] => {
    const groups = filteredSales.reduce((acc, sale) => {
        const key = sale.variantId || sale.productId;
        if (!acc[key]) acc[key] = {
            productId: sale.productId,
            variantId: sale.variantId,
            productName: sale.variantName ? `${sale.productName} (${sale.variantName})` : sale.productName,
            category: sale.category,
            totalQuantity: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            totalWaste: 0,
            totalEatGiveaway: 0,
            dailySales: []
        };
        acc[key].totalQuantity += sale.quantitySold;
        acc[key].totalRevenue += sale.totalRevenue;
        acc[key].totalCost += sale.totalCost;
        acc[key].totalProfit += sale.grossProfit;
        acc[key].totalWaste += sale.wasteQty || 0;
        acc[key].totalEatGiveaway += (sale.eatQty || 0) + (sale.giveawayQty || 0);
        acc[key].dailySales.push(sale);
        return acc;
    }, {} as Record<string, ProductGroupStats>);
    return Object.values(groups).sort((a, b) => b.totalRevenue - a.totalRevenue) as ProductGroupStats[];
};

export const calculateDailyBreakdown = (filteredSales: ProductSaleLog[]): DailyBreakdownStat[] => {
    const dateMap = new Map<string, DailyBreakdownStat & { _marketNames: Set<string> }>();
    filteredSales.forEach(sale => {
        const existing = dateMap.get(sale.saleDate) || { 
            date: sale.saleDate, 
            revenue: 0, 
            profit: 0, 
            quantity: 0, 
            eatGiveaway: 0, 
            waste: 0,
            weather: sale.weatherCondition || 'unknown',
            _marketNames: new Set<string>()
        };
        
        let mName = sale.marketName;
        if (!mName) {
            mName = sale.marketId === 'home' ? 'หน้าบ้าน' : sale.marketId;
        }
        existing._marketNames.add(mName);

        dateMap.set(sale.saleDate, {
            ...existing,
            revenue: existing.revenue + sale.totalRevenue,
            profit: existing.profit + sale.grossProfit,
            quantity: existing.quantity + sale.quantitySold,
            eatGiveaway: existing.eatGiveaway + (sale.eatQty || 0) + (sale.giveawayQty || 0),
            waste: existing.waste + (sale.wasteQty || 0)
        });
    });

    return Array.from(dateMap.values()).map(d => {
        const { _marketNames, ...rest } = d;
        return {
            ...rest,
            marketNames: Array.from(_marketNames)
        };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const calculatePerMarketProductData = (filteredSales: ProductSaleLog[], markets: Market[]): PerMarketStat[] => {
    const marketMap = new Map<string, Omit<PerMarketStat, 'products'> & { products: Map<string, MarketProductStat> }>();
    filteredSales.forEach(sale => {
        if (!marketMap.has(sale.marketId)) {
            marketMap.set(sale.marketId, {
                marketId: sale.marketId,
                marketName: markets.find(m => m.id === sale.marketId)?.name || sale.marketName || sale.marketId,
                revenue: 0,
                profit: 0,
                quantity: 0,
                eatGiveaway: 0,
                waste: 0,
                products: new Map<string, MarketProductStat>()
            });
        }
        const market = marketMap.get(sale.marketId)!;
        market.revenue += sale.totalRevenue;
        market.profit += sale.grossProfit;
        market.quantity += sale.quantitySold;
        market.eatGiveaway += (sale.eatQty || 0) + (sale.giveawayQty || 0);
        market.waste += (sale.wasteQty || 0);

        const prodKey = sale.variantId || sale.productId;
        if (!market.products.has(prodKey)) {
            market.products.set(prodKey, {
                productName: sale.variantName ? `${sale.productName} (${sale.variantName})` : sale.productName,
                category: sale.category,
                quantity: 0,
                revenue: 0,
                cost: 0,
                profit: 0,
                eatGiveaway: 0,
                waste: 0
            });
        }
        const prod = market.products.get(prodKey)!;
        prod.quantity += sale.quantitySold;
        prod.revenue += sale.totalRevenue;
        prod.cost += sale.totalCost;
        prod.profit += sale.grossProfit;
        prod.eatGiveaway += (sale.eatQty || 0) + (sale.giveawayQty || 0);
        prod.waste += (sale.wasteQty || 0);
    });

    return Array.from(marketMap.values()).map(m => ({
        ...m,
        products: Array.from(m.products.values()).sort((a, b) => b.revenue - a.revenue)
    })).sort((a, b) => b.revenue - a.revenue);
};

export const calculateWasteSummary = (filteredSales: ProductSaleLog[]): WasteSummary => {
    const wasteByProduct: Record<string, { productName: string; wasteQty: number; wasteCost: number }> = {};
    let totalWasteQty = 0;
    let totalWasteCost = 0;

    filteredSales.forEach(sale => {
        const wasteQty = sale.wasteQty || 0;
        if (wasteQty > 0) {
            const wasteCost = wasteQty * sale.costPerUnit;
            totalWasteQty += wasteQty;
            totalWasteCost += wasteCost;

            const key = sale.variantId || sale.productId;
            const productName = sale.variantName ? `${sale.productName} (${sale.variantName})` : sale.productName;
            if (!wasteByProduct[key]) {
                wasteByProduct[key] = { productName, wasteQty: 0, wasteCost: 0 };
            }
            wasteByProduct[key].wasteQty += wasteQty;
            wasteByProduct[key].wasteCost += wasteCost;
        }
    });

    return {
        byProduct: Object.values(wasteByProduct).sort((a, b) => b.wasteCost - a.wasteCost),
        totalWasteQty,
        totalWasteCost
    };
};
