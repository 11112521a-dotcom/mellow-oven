import { Transaction, DailyReport, Product, Ingredient } from '@/types';

// ===== Existing Functions =====
export const calculateKPIs = (transactions: Transaction[], dailyReports: DailyReport[]) => {
    const revenue = transactions
        .filter(t => t.type === 'INCOME' && t.category === 'Sales')
        .reduce((sum, t) => sum + t.amount, 0);

    const cogs = transactions
        .filter(t => t.type === 'EXPENSE' && t.category === 'COGS')
        .reduce((sum, t) => sum + t.amount, 0);

    const opex = transactions
        .filter(t => t.type === 'EXPENSE' && t.category !== 'COGS')
        .reduce((sum, t) => sum + t.amount, 0);

    const netProfit = revenue - cogs - opex;
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

export const getTopProducts = (logs: any[], products: Product[]) => {
    const productStats: Record<string, { name: string, revenue: number, profit: number, costPct: number }> = {};

    logs.forEach(log => {
        const product = products.find(p => p.id === log.productId);
        if (product) {
            const key = log.variantId || log.productId;
            if (!productStats[key]) {
                let name = product.name;
                let price = product.price;
                let cost = product.cost;

                if (log.variantId && product.variants) {
                    const variant = product.variants.find(v => v.id === log.variantId);
                    if (variant) {
                        name = `${product.name} - ${variant.name}`;
                        price = variant.price;
                        cost = variant.cost;
                    }
                }

                productStats[key] = {
                    name: name,
                    revenue: 0,
                    profit: 0,
                    costPct: price > 0 ? (cost / price) * 100 : 0
                };
            }
            const revenue = log.totalRevenue || (log.soldQty * (log.pricePerUnit || 0));
            const cost = log.totalCost || (log.soldQty * (log.costPerUnit || 0));
            productStats[key].revenue += revenue;
            productStats[key].profit += (revenue - cost);
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
    const marketStats: Record<string, { name: string, sales: number, profit: number, waste: number }> = {};

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
    if (dailyBurnRate <= 0) return 999;
    return Math.floor(emergencyFund / dailyBurnRate);
};

export const calculateMenuMatrix = (logs: any[], products: Product[]) => {
    const productStats: Record<string, { name: string, soldQty: number, profit: number, contributionMargin: number }> = {};
    let totalSold = 0;

    products.forEach(p => {
        if (p.variants && p.variants.length > 0) {
            p.variants.forEach(v => {
                productStats[v.id] = {
                    name: `${p.name} - ${v.name}`,
                    soldQty: 0,
                    profit: 0,
                    contributionMargin: v.price - v.cost
                };
            });
        } else {
            productStats[p.id] = {
                name: p.name,
                soldQty: 0,
                profit: 0,
                contributionMargin: p.price - p.cost
            };
        }
    });

    logs.forEach(log => {
        const key = log.variantId || log.productId;
        if (productStats[key]) {
            productStats[key].soldQty += log.soldQty;
            productStats[key].profit += (log.soldQty * productStats[key].contributionMargin);
            totalSold += log.soldQty;
        }
    });

    const stats = Object.values(productStats);
    if (stats.length === 0) return [];

    const avgSoldQty = totalSold / stats.length;
    const avgContributionMargin = stats.reduce((sum, p) => sum + p.contributionMargin, 0) / stats.length;

    return stats.map(p => {
        const isHighPopularity = p.soldQty >= avgSoldQty;
        const isHighProfit = p.contributionMargin >= avgContributionMargin;

        let category = '';
        if (isHighPopularity && isHighProfit) category = 'Star';
        else if (isHighPopularity && !isHighProfit) category = 'Workhorse';
        else if (!isHighPopularity && isHighProfit) category = 'Puzzle';
        else category = 'Dog';

        return {
            ...p,
            category,
            isHighPopularity,
            isHighProfit
        };
    });
};

// ===== NEW: SMART PRODUCTION FORECASTING =====

/**
 * Weather Impact Multiplier
 * คำนวณผลกระทบสภาพอากาศต่อยอดขาย
 */
/**
 * Weather Impact Multiplier
 * คำนวณผลกระทบสภาพอากาศต่อยอดขาย
 * @param weather Weather condition string (case-insensitive)
 * @returns Multiplier for sales forecast (default 1.0)
 */
export const getWeatherImpact = (weather: string): number => {
    const normalizedWeather = weather?.toLowerCase() || '';
    const impacts: Record<string, number> = {
        'sunny': 1.15,      // แดดจ้า +15%
        'cloudy': 1.0,      // เมฆมาก ปกติ
        'rain': 0.65,       // ฝนตก -35%
        'rainy': 0.65,      // ฝนตก -35% (legacy)
        'storm': 0.40,      // พายุ -60%
        'wind': 0.85,       // ลมแรง -15%
        'windy': 0.85,      // ลมแรง -15% (legacy)
        'cold': 1.10        // หนาว +10% (เครื่องดื่มร้อนขายดี)
    };
    return impacts[normalizedWeather] || 1.0;
};

/**
 * Market Performance Scoring
 * คำนวณคะแนนประสิทธิภาพของตลาดแต่ละแห่ง
 */
export const getMarketPerformanceScore = (marketId: string, dailyReports: DailyReport[]): number => {
    const marketReports = dailyReports.filter(r => r.marketId === marketId);
    if (marketReports.length === 0) return 1.0;

    // คำนวณค่าเฉลี่ยยอดขายต่อวัน
    const avgRevenue = marketReports.reduce((sum, r) => sum + r.revenue, 0) / marketReports.length;
    const avgProfit = marketReports.reduce((sum, r) => sum + r.netProfit, 0) / marketReports.length;

    // สร้าง Score: ถ้า revenue สูง + profit margin ดี = score สูง
    const profitMargin = avgRevenue > 0 ? (avgProfit / avgRevenue) : 0;
    const score = (avgRevenue / 1000) * (1 + profitMargin); // Normalize

    return Math.max(0.5, Math.min(1.5, score)); // Clamp between 0.5 - 1.5
};

/**
 * Advanced Multi-Factor Forecasting
 * อัลกอริทึมพยากรณ์แบบหลายปัจจัย
 */
export const calculateAdvancedForecast = (
    productId: string,
    targetDate: Date,
    logs: any[],
    options: {
        weather?: string;
        marketId?: string;
        dailyReports?: DailyReport[];
    } = {}
): {
    quantity: number;
    confidence: number; // 0-100
    insights: string[];
} => {
    const { weather = 'Sunny', marketId, dailyReports = [] } = options;

    // 1. Base Forecast: Same-day-of-week average (last 4 weeks)
    const targetDay = targetDate.getDay();
    const sameDayLogs = logs.filter(log => {
        const logDate = new Date(log.date);
        const matchesProduct = log.productId === productId;
        const matchesDay = logDate.getDay() === targetDay;
        const matchesMarket = marketId ? log.marketId === marketId : true;
        const isBeforeTarget = logDate < targetDate;
        return matchesProduct && matchesDay && matchesMarket && isBeforeTarget;
    });

    sameDayLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentLogs = sameDayLogs.slice(0, 4); // Last 4 occurrences

    if (recentLogs.length === 0) {
        return {
            quantity: 0,
            confidence: 0,
            insights: ['ไม่มีข้อมูลย้อนหลัง ไม่สามารถพยากรณ์ได้']
        };
    }

    const baseAvg = recentLogs.reduce((sum, log) => sum + log.soldQty, 0) / recentLogs.length;

    // 2. Trend Analysis: เช็คว่ายอดขายเพิ่มขึ้น หรือลดลง
    let trendMultiplier = 1.0;
    if (recentLogs.length >= 3) {
        const trend1 = recentLogs[0].soldQty;
        const trend2 = recentLogs[1].soldQty;
        const trend3 = recentLogs[2].soldQty;

        if (trend1 > trend2 && trend2 > trend3) {
            trendMultiplier = 1.10; // Upward trend +10%
        } else if (trend1 < trend2 && trend2 < trend3) {
            trendMultiplier = 0.90; // Downward trend -10%
        }
    }

    // 3. Weather Impact
    const weatherMultiplier = getWeatherImpact(weather);

    // 4. Market Performance
    let marketMultiplier = 1.0;
    if (marketId && dailyReports.length > 0) {
        marketMultiplier = getMarketPerformanceScore(marketId, dailyReports);
    }

    // 5. Day of Week Factor (Weekend vs Weekday)
    const isWeekend = targetDay === 0 || targetDay === 6;
    const dayMultiplier = isWeekend ? 1.25 : 1.0; // Weekend +25%

    // 6. Final Calculation
    const rawForecast = baseAvg * trendMultiplier * weatherMultiplier * marketMultiplier * dayMultiplier;
    const forecast = Math.ceil(rawForecast * 1.05); // Add 5% safety buffer

    // 7. Calculate Confidence Score
    const dataPoints = recentLogs.length;
    const variance = recentLogs.reduce((sum, log) => sum + Math.pow(log.soldQty - baseAvg, 2), 0) / dataPoints;
    const stdDev = Math.sqrt(variance);
    const cv = baseAvg > 0 ? (stdDev / baseAvg) : 1; // Coefficient of Variation

    let confidence = 100;
    if (dataPoints < 3) confidence -= 30;
    if (cv > 0.5) confidence -= 20;
    if (weather === 'Storm' || weather === 'Rainy') confidence -= 15;
    confidence = Math.max(50, Math.min(95, confidence));

    // 8. Generate Insights
    const insights: string[] = [];
    if (trendMultiplier > 1.0) insights.push('📈 ยอดขายมีแนวโน้มเพิ่มขึ้น');
    if (trendMultiplier < 1.0) insights.push('📉 ยอดขายมีแนวโน้มลดลง');
    if (weatherMultiplier < 0.8) insights.push('🌧️ สภาพอากาศไม่ดี อาจส่งผลต่อยอดขาย');
    if (isWeekend) insights.push('🎉 วันหยุด มักขายได้มากกว่าปกติ');
    if (marketMultiplier > 1.2) insights.push('🏆 ตลาดนี้มีประสิทธิภาพดีมาก');
    if (dataPoints < 3) insights.push('⚠️ ข้อมูลน้อย ความแม่นยำอาจลด');

    return {
        quantity: forecast,
        confidence: Math.round(confidence),
        insights
    };
};

/**
 * Get Sales Pattern for a Product
 * วิเคราะห์รูปแบบการขายของสินค้า (7-30 วัน)
 */
export const getSalesPattern = (productId: string, logs: any[], days: number = 30) => {
    const now = new Date();
    const pattern = [];

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const daySold = logs
            .filter(log => log.productId === productId && log.date.startsWith(dateStr))
            .reduce((sum, log) => sum + log.soldQty, 0);

        pattern.push({
            date: dateStr,
            sold: daySold,
            dayOfWeek: d.getDay()
        });
    }

    return pattern;
};

/**
 * Smart Product Insights
 * วิเคราะห์ประสิทธิภาพสินค้าและให้คำแนะนำ
 */
export const getSmartProductInsights = (products: Product[], logs: any[]) => {
    const insights: any[] = [];

    products.forEach(product => {
        if (product.variants && product.variants.length > 0) {
            product.variants.forEach(variant => {
                const variantLogs = logs.filter(log => log.variantId === variant.id);
                processProductInsight(variant.id, `${product.name} - ${variant.name}`, variant.price, variant.cost, variantLogs, insights);
            });
        } else {
            const productLogs = logs.filter(log => log.productId === product.id && !log.variantId);
            processProductInsight(product.id, product.name, product.price, product.cost, productLogs, insights);
        }
    });

    return {
        bestSellers: insights.filter(i => i.performance === 'excellent').slice(0, 5),
        underperforming: insights.filter(i => i.performance === 'poor').slice(0, 5),
        allInsights: insights
    };
};

const processProductInsight = (id: string, name: string, price: number, cost: number, logs: any[], insights: any[]) => {
    const totalSold = logs.reduce((sum, log) => sum + log.soldQty, 0);
    const avgSold = logs.length > 0 ? totalSold / logs.length : 0;
    const revenue = totalSold * price;
    const profit = revenue - (totalSold * cost);
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Classify performance
    let performance: 'excellent' | 'good' | 'average' | 'poor' = 'average';
    if (avgSold > 20 && margin > 40) performance = 'excellent';
    else if (avgSold > 15 && margin > 30) performance = 'good';
    else if (avgSold < 5 || margin < 15) performance = 'poor';

    // Generate recommendations
    const recommendations: string[] = [];
    if (performance === 'excellent') {
        recommendations.push('⭐ ขายดีมาก! พิจารณาเพิ่มผลิต');
    } else if (performance === 'poor') {
        recommendations.push('⚠️ ขายช้า ลองลดผลิตหรือปรับราคา');
    }
    if (margin < 20) {
        recommendations.push('💰 กำไรน้อย ปรับราคาหรือลดต้นทุน');
    }
    if (margin > 50) {
        recommendations.push('🎯 Margin ดีมาก คงไว้!');
    }

    insights.push({
        productId: id,
        productName: name,
        totalSold,
        avgSold,
        margin,
        performance,
        recommendations
    });
};

/**
 * Legacy Support: Keep old function for backward compatibility
 */
export const calculateForecast = (productId: string, date: string, logs: any[], marketId?: string) => {
    const targetDate = new Date(date);
    const result = calculateAdvancedForecast(productId, targetDate, logs, { marketId });
    return result.quantity;
};
