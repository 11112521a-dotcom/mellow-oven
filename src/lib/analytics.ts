import { Transaction, DailyReport, Product, Ingredient } from '@/types';

export const calculateKPIs = (transactions: Transaction[], dailyReports: DailyReport[]) => {
    // 1. Revenue (Total Income from Sales)
    const revenue = transactions
        .filter(t => t.type === 'INCOME' && t.category === 'Sales')
        .reduce((sum, t) => sum + t.amount, 0);

    // 2. COGS (Total Expense for Ingredients/Stock)
    const cogs = transactions
        .filter(t => t.type === 'EXPENSE' && t.category === 'COGS')
        .reduce((sum, t) => sum + t.amount, 0);

    // 3. Opex (Other Expenses)
    const opex = transactions
        .filter(t => t.type === 'EXPENSE' && t.category !== 'COGS')
        .reduce((sum, t) => sum + t.amount, 0);

    // 4. Net Profit
    const netProfit = revenue - cogs - opex;

    // 5. Waste Value (Estimated from Daily Reports if available, or manual waste logs)
    // For now, let's assume waste is tracked in DailyReports (which we haven't fully implemented UI for yet, but the model exists)
    const wasteValue = dailyReports.reduce((sum, report) => sum + report.wasteCost, 0);

    return {
        revenue,
        cogs,
        opex,
        netProfit,
        wasteValue,
        margin: revenue > 0 ? (netProfit / revenue) * 100 : 0
    };
};

export const getSalesTrend = (transactions: Transaction[]) => {
    // Group sales by date (last 7 days)
    const trend = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const dailySales = transactions
            .filter(t => t.type === 'INCOME' && t.category === 'Sales' && t.date.startsWith(dateStr))
            .reduce((sum, t) => sum + t.amount, 0);

        trend.push({ name: dateStr.slice(5), sales: dailySales });
    }
    return trend;
};

export const getFlavorMix = (transactions: Transaction[]) => {
    // This would ideally come from detailed sales logs.
    // For now, we return dummy data as placeholder.
    return [
        { name: 'Chocolate', value: 400 },
        { name: 'Vanilla', value: 300 },
        { name: 'Strawberry', value: 300 },
        { name: 'Matcha', value: 200 },
    ];
};

// --- New Analytics for "The Pulse" Dashboard ---

export const getTopProducts = (logs: any[], products: Product[]) => {
    // Aggregate sales by product
    const productStats: Record<string, { name: string, revenue: number, profit: number, costPct: number }> = {};

    logs.forEach(log => {
        const product = products.find(p => p.id === log.productId);
        if (product) {
            if (!productStats[product.id]) {
                productStats[product.id] = {
                    name: product.name,
                    revenue: 0,
                    profit: 0,
                    costPct: (product.cost / product.price) * 100
                };
            }
            const revenue = log.soldQty * product.price;
            const cost = log.soldQty * product.cost;
            productStats[product.id].revenue += revenue;
            productStats[product.id].profit += (revenue - cost);
        }
    });

    const statsArray = Object.values(productStats);

    return {
        byRevenue: [...statsArray].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
        byProfit: [...statsArray].sort((a, b) => b.profit - a.profit).slice(0, 5),
        costAnalysis: [...statsArray].sort((a, b) => b.costPct - a.costPct).slice(0, 5)
    };
};

export const getMarketPerformance = (dailyReports: DailyReport[], markets: any[]) => {
    // Aggregate data by market
    const marketStats: Record<string, { name: string, sales: number, profit: number, waste: number }> = {};

    // Initialize with all markets (so even empty ones show up)
    markets.forEach(m => {
        marketStats[m.id] = { name: m.name, sales: 0, profit: 0, waste: 0 };
    });

    dailyReports.forEach(report => {
        if (marketStats[report.marketId]) {
            marketStats[report.marketId].sales += report.revenue;
            marketStats[report.marketId].profit += report.netProfit;
            marketStats[report.marketId].waste += report.wasteCost;
        }
    });

    return Object.values(marketStats);
};

export const getRunway = (emergencyFund: number, dailyBurnRate: number) => {
    if (dailyBurnRate <= 0) return 999; // Infinite runway
    return Math.floor(emergencyFund / dailyBurnRate);
};

export const calculateMenuMatrix = (logs: any[], products: Product[]) => {
    // 1. Aggregate Sales & Profit per Product
    const productStats: Record<string, { name: string, soldQty: number, profit: number, contributionMargin: number }> = {};
    let totalSold = 0;

    // 1. Initialize with ALL products to ensure we analyze the entire menu (even unsold items)
    products.forEach(p => {
        productStats[p.id] = {
            name: p.name,
            soldQty: 0,
            profit: 0,
            contributionMargin: p.price - p.cost
        };
    });

    // 2. Aggregate Sales from Logs
    logs.forEach(log => {
        if (productStats[log.productId]) {
            productStats[log.productId].soldQty += log.soldQty;
            productStats[log.productId].profit += (log.soldQty * productStats[log.productId].contributionMargin);
            totalSold += log.soldQty;
        }
    });

    const stats = Object.values(productStats);
    if (stats.length === 0) return [];

    // 2. Calculate Averages
    const avgSoldQty = totalSold / stats.length;
    const avgContributionMargin = stats.reduce((sum, p) => sum + p.contributionMargin, 0) / stats.length;

    // 3. Classify
    return stats.map(p => {
        const isHighPopularity = p.soldQty >= avgSoldQty;
        const isHighProfit = p.contributionMargin >= avgContributionMargin;

        let category = '';
        if (isHighPopularity && isHighProfit) category = 'Star'; // ขายดี กำไรเยอะ
        else if (isHighPopularity && !isHighProfit) category = 'Workhorse'; // ขายดี กำไรน้อย
        else if (!isHighPopularity && isHighProfit) category = 'Puzzle'; // ขายน้อย กำไรเยอะ
        else category = 'Dog'; // ขายน้อย กำไรน้อย

        return {
            ...p,
            category,
            isHighPopularity,
            isHighProfit
        };
    });
};

export const calculateForecast = (productId: string, date: string, logs: any[], marketId?: string) => {
    // Simple Algorithm: Average of last 3 same-weekdays
    // e.g. If date is Friday, get average of last 3 Fridays

    const targetDate = new Date(date);
    const targetDay = targetDate.getDay(); // 0-6

    const sameDayLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        return log.productId === productId && logDate.getDay() === targetDay && logDate < targetDate;
    });

    // Sort by date desc
    sameDayLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Take last 3
    const recentLogs = sameDayLogs.slice(0, 3);

    if (recentLogs.length === 0) return 0;

    const avgSold = recentLogs.reduce((sum, log) => sum + log.soldQty, 0) / recentLogs.length;

    // Add a small buffer (e.g. 10%) for growth/safety
    return Math.ceil(avgSold * 1.1);
};
