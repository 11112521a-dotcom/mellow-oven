import { ProductSaleLog, DailyInventory } from '@/types';
import * as ss from 'simple-statistics';

// ==========================================
// 🔮 THE ORACLE CORE: TYPES & INTERFACES
// ==========================================

export type OracleDimension =
    | 'ChronoCycle'     // Mon-Sun, Early/Mid/End Month
    | 'Atmosphere'      // Sunny/Rain/Cloudy
    | 'Momentum'        // Up/Down vs Yesterday
    | 'Velocity'        // Fast/Slow (Rolling 3 Days)
    | 'Gap'             // Days since last sale
    | 'BasketContext'   // Store Traffic High/Low
    | 'Market';         // Which market (Location)

// ... types ...

// 7. Market Context: Simple extraction
const getMarket = (log: ProductSaleLog): string => {
    return log.marketName || 'Unknown Market';
};


export interface OraclePattern {
    id: string;
    productId: string;
    productName: string;
    type: 'PERFECT_STORM' | 'SILENT_KILLER' | 'OPPORTUNITY' | 'POWER_COUPLE' | 'COMPETITOR' | 'CANNIBAL';
    dimensions: Record<string, string>; // e.g. { day: 'Saturday', weather: 'Rain' }
    metrics: {
        occurrence: number;     // How many times this happened
        avgSales: number;       // Average sales in this condition
        baseSales: number;      // Average sales normally
        lift: number;           // Impact (+112% or -100%)
        confidence: number;     // Consistency score (0-100%)
        significance: number;   // Z-Score approximation
    };
    analysis: string;           // "AI-Like" natural language explanation
    action: string;             // Actionable advice
    relatedProductId?: string;   // NEW: For Combo/Cannibalism patterns
    relatedProductName?: string; // NEW: For Combo/Cannibalism patterns
}

// ==========================================
// 🛠️ FEATURE ENGINEERING (6 DIMENSIONS)
// ==========================================

// 1. Chrono-Cycle: Convert Date to Context
// Fixed: No more overlap between Payday and Early Month
const getChronoCycle = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();

    let phase: string;
    if (day >= 25) phase = 'Payday Phase';       // 25-31: เงินเดือนออก
    else if (day <= 5) phase = 'Early Month';     // 1-5: ต้นเดือน (หลังเงินเดือน)
    else if (day >= 13 && day <= 17) phase = 'Mid-Month'; // 13-17: กลางเดือน
    else phase = 'Normal Phase';                  // 6-12, 18-24: ปกติ

    return { dayName, phase };
};

// 2. Atmosphere: Extracted from ProductSaleLog (weatherCondition)
// Note: We aggregated this from the logs passed in
const getAtmosphere = (logs: ProductSaleLog[], date: string): string => {
    // Find any log for this date that has weather data
    // Assuming weather is consistent for the shop on that day
    const log = logs.find(l => l.saleDate === date && l.weatherCondition);
    return log?.weatherCondition || 'Unknown';
};

// 3. Momentum: Up/Down vs Yesterday
const getMomentum = (productLogs: ProductSaleLog[], currentDate: string): string => {
    const todayLog = productLogs.find(l => l.saleDate === currentDate);
    if (!todayLog) return 'None';

    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    const yLog = productLogs.find(l => l.saleDate === yStr);

    const todayQty = todayLog.quantitySold;
    const yQty = yLog?.quantitySold || 0;

    if (todayQty > yQty * 1.2) return 'Trend UP';
    if (todayQty < yQty * 0.8) return 'Trend DOWN';
    return 'Stable';
};

// 4. Velocity: Fast/Slow (Rolling 3 Days)
// Checks if the product has been selling consistently recently
const getVelocity = (productLogs: ProductSaleLog[], currentDate: string): string => {
    // Look back 3 days
    let soldDays = 0;
    for (let i = 1; i <= 3; i++) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        if (productLogs.some(l => l.saleDate === dStr && l.quantitySold > 0)) {
            soldDays++;
        }
    }

    if (soldDays === 3) return 'Fast Velocity';
    if (soldDays === 0) return 'Dead Stock';
    return 'Normal Velocity';
};

// 5. Gap: Days since last sale
const getGap = (productLogs: ProductSaleLog[], currentDate: string): string => {
    const sortedLogs = [...productLogs]
        .filter(l => l.saleDate < currentDate && l.quantitySold > 0)
        .sort((a, b) => b.saleDate.localeCompare(a.saleDate));

    if (sortedLogs.length === 0) return 'First Time';

    const lastSale = new Date(sortedLogs[0].saleDate);
    const current = new Date(currentDate);
    const diffTime = Math.abs(current.getTime() - lastSale.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return '0-1 Day Gap';
    if (diffDays <= 3) return '2-3 Day Gap';
    return 'Long Gap (4+ Days)';
};

// 6. Basket Context: Store Traffic Context
// Fixed: Dynamic threshold using percentiles instead of hardcoded values
const getBasketContext = (allLogs: ProductSaleLog[], date: string): string => {
    // Calculate total items sold per day across all days
    const dailyTotals = new Map<string, number>();
    allLogs.forEach(l => {
        dailyTotals.set(l.saleDate, (dailyTotals.get(l.saleDate) || 0) + l.quantitySold);
    });

    const totalsArray = Array.from(dailyTotals.values()).sort((a, b) => a - b);
    const p75 = totalsArray.length > 0 ? ss.quantile(totalsArray, 0.75) : 100;
    const p25 = totalsArray.length > 0 ? ss.quantile(totalsArray, 0.25) : 30;

    const todayTotal = dailyTotals.get(date) || 0;

    if (todayTotal >= p75) return 'High Traffic';
    if (todayTotal <= p25) return 'Low Traffic';
    return 'Normal Traffic';
};


// ==========================================
// 🧬 THE MINING ALGORITHM (Permutation Engine)
// ==========================================

export async function runOracle(
    productName: string,
    productId: string,
    history: ProductSaleLog[],
    allSales: ProductSaleLog[], // Context for Store Traffic
    topN: number = 5 // Configurable: how many patterns to return
): Promise<OraclePattern[]> {

    const patterns: OraclePattern[] = [];
    const MAX_DEPTH = 3; // Limit combination depth for performance
    const MIN_OCCURRENCE = 3; // Guardrail: Impact Rule

    // 1. Prepare Dataset (Flattened Rows)
    // Only analyze days where sales happened OR should have happened (active days)
    // To be safe, we analyze dates present in history

    // EXCLUSION: Ignore "Mor Lam" (หมอลำ) events as they are non-recurring/annual events
    const validHistory = history.filter(log => !log.marketName?.includes('หมอลำ'));
    const now = new Date();

    const dataset = validHistory.map(log => {
        const { dayName, phase } = getChronoCycle(log.saleDate);
        const weather = getAtmosphere(allSales, log.saleDate);

        // 🌟 Freshness Recency Bias 🌟
        const logDate = new Date(log.saleDate);
        const diffDays = Math.ceil(Math.abs(now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
        let weight = 1.0;
        if (diffDays <= 14) weight = 1.5;
        else if (diffDays <= 30) weight = 1.2;

        return {
            date: log.saleDate,
            qty: log.quantitySold,
            weight,
            dims: {
                day: dayName,
                phase: phase,
                // Filter Unknown weather — skip dimension if no data
                ...(weather !== 'Unknown' ? { weather } : {}),
                momentum: getMomentum(history, log.saleDate),
                velocity: getVelocity(history, log.saleDate),
                gap: getGap(history, log.saleDate),
                traffic: getBasketContext(allSales, log.saleDate),
                market: getMarket(log)
            }
        };
    });

    const baseAvg = ss.mean(dataset.map(d => d.qty)) || 0;
    const baseStd = ss.standardDeviation(dataset.map(d => d.qty)) || 0;

    // 2. Generate Permutations (Recursive)
    // We only care about Permutations that actually EXIST in the data
    // Instead of generating theoretical combos, we mine Frequent Itemsets from Data

    // Safety check: If dataset is too small, fallback
    if (dataset.length < 10) return []; // Too little data

    // Helper to generate key from combo
    const getComboKey = (combo: Record<string, string>) =>
        Object.entries(combo).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => `${k}:${v}`).join('|');

    // We scan the dataset and build counts for observed combinations
    const observedCombos: Map<string, { count: number, weightedCount: number, totalQty: number, weightedTotalQty: number, values: number[], criteria: Record<string, string> }> = new Map();

    // Dynamic dimensions — only use dimensions present in first row
    const allDimKeys = new Set<string>();
    dataset.forEach(row => Object.keys(row.dims).forEach(k => allDimKeys.add(k)));
    const dimensions = Array.from(allDimKeys);

    // Timeout Guardrail
    const startTime = Date.now();

    // Optimization: Only scan 1-level, 2-level, and specific 3-level
    // Full recursion is too slow. We iterate through each row and extract its subsets.

    for (const row of dataset) {
        // If timeout
        if (Date.now() - startTime > 2000) break; // 2s Guardrail

        // Generate subsets for this row
        // Power Set is too big (2^7 = 128 per row). 
        // We limit to specific interesting combinations.

        // Level 1 (Single Factors)
        for (const dim of dimensions) {
            const key = JSON.stringify({ [dim]: row.dims[dim as keyof typeof row.dims] });
            if (!observedCombos.has(key)) observedCombos.set(key, { count: 0, weightedCount: 0, totalQty: 0, weightedTotalQty: 0, values: [], criteria: { [dim]: row.dims[dim as keyof typeof row.dims] } });
            const entry = observedCombos.get(key)!;
            entry.count++;
            entry.weightedCount += row.weight;
            entry.totalQty += row.qty;
            entry.weightedTotalQty += (row.qty * row.weight);
            entry.values.push(row.qty);
        }

        // Level 2 (Pairs) - Only Day+Phase, Day+Weather, Weather+Traffic etc.
        // Let's do a simplified exhaustive up to Depth 2 for ALL, and Depth 3 for Specifics
        for (let i = 0; i < dimensions.length; i++) {
            for (let j = i + 1; j < dimensions.length; j++) {
                const d1 = dimensions[i];
                const d2 = dimensions[j];
                const criteria = {
                    [d1]: row.dims[d1 as keyof typeof row.dims],
                    [d2]: row.dims[d2 as keyof typeof row.dims]
                };
                const key = JSON.stringify(criteria);
                if (!observedCombos.has(key)) observedCombos.set(key, { count: 0, weightedCount: 0, totalQty: 0, weightedTotalQty: 0, values: [], criteria });
                const entry = observedCombos.get(key)!;
                entry.count++;
                entry.weightedCount += row.weight;
                entry.totalQty += row.qty;
                entry.weightedTotalQty += (row.qty * row.weight);
                entry.values.push(row.qty);

                // Level 3 (Trios) - Only if i, j are core distinct categories
                // e.g. Day + Phase + Weather OR Day + Weather + Momentum
                for (let k = j + 1; k < dimensions.length; k++) {
                    const d3 = dimensions[k];
                    const criteria3 = { ...criteria, [d3]: row.dims[d3 as keyof typeof row.dims] };
                    const key3 = JSON.stringify(criteria3);
                    if (!observedCombos.has(key3)) observedCombos.set(key3, { count: 0, weightedCount: 0, totalQty: 0, weightedTotalQty: 0, values: [], criteria: criteria3 });
                    const entry3 = observedCombos.get(key3)!;
                    entry3.count++;
                    entry3.weightedCount += row.weight;
                    entry3.totalQty += row.qty;
                    entry3.weightedTotalQty += (row.qty * row.weight);
                    entry3.values.push(row.qty);
                }
            }
        }
    }

    // 3. Statistical Validation (The 3 Rules)
    observedCombos.forEach((data, key) => {
        // Rule 1: Occurrence Check
        if (data.count < MIN_OCCURRENCE) return;

        // Calculate Metrics (Using Freshness Weighted Avg)
        const avg = data.weightedTotalQty / data.weightedCount;
        const std = ss.standardDeviation(data.values);

        // Rule 2: Impact Check (Difference from Base > 20% AND Real Absolute Change)
        // Avoid division by zero
        const safeBaseAvg = baseAvg === 0 ? 0.1 : baseAvg;
        const lift = (avg - safeBaseAvg) / safeBaseAvg;

        // 🌟 Filter by Volume & Impact 🌟
        if (Math.abs(lift) < 0.2) return; // Ignore small % shifts
        const rawDailyDifference = Math.abs(avg - baseAvg);
        if (rawDailyDifference < 1.5 && data.count < 10) return; // Ignore noisy low volume changes

        // Rule 3: Confidence (Consistency)
        // High confidence means low variance relative to mean
        // CV (Coefficient of Variation) = std / mean. Lower is better.
        // We invert for "Confidence Score"
        const cv = avg > 0 ? std / avg : 1;
        const confidence = Math.max(0, 100 - (cv * 100));

        if (confidence < 50) return; // Too much noise

        // Determine Type
        let type: OraclePattern['type'] = 'OPPORTUNITY';
        if (lift > 0.8 && confidence > 70) type = 'PERFECT_STORM';
        else if (lift < -0.8 && confidence > 80) type = 'SILENT_KILLER';
        else if (lift > 0.25) type = 'OPPORTUNITY';
        else return; // Should be filtered by Rule 2 already

        // Generate ID
        const id = `oracle-${productId}-${Math.random().toString(36).substr(2, 9)}`;

        // Natural Language Generation
        const dimKeys = Object.keys(data.criteria);

        // Helper to translate individual criteria to natural Thai
        const translateCriteria = (key: string, value: string): string => {
            switch (key) {
                case 'day':
                    const thDay = {
                        'Monday': 'วันจันทร์', 'Tuesday': 'วันอังคาร', 'Wednesday': 'วันพุธ',
                        'Thursday': 'วันพฤหัสบดี', 'Friday': 'วันศุกร์', 'Saturday': 'วันเสาร์', 'Sunday': 'วันอาทิตย์'
                    }[value] || value;
                    return `ตรงกับ${thDay}`;
                case 'phase':
                    const thPhase = {
                        'Payday Phase': 'ช่วงเงินเดือนออก', 'Mid-Month': 'ช่วงกลางเดือน',
                        'Early Month': 'ช่วงต้นเดือน', 'Normal Phase': 'ช่วงวันธรรมดา'
                    }[value] || value;
                    return `อยู่ใน${thPhase}`;
                case 'weather':
                    const thWeather = { 'Rain': 'ฝนตก', 'Sunny': 'แดดจัด', 'Cloudy': 'เมฆครึ้ม' }[value] || value;
                    return `สภาพอากาศ${thWeather}`;
                case 'momentum':
                    const thMomentum = { 'Trend UP': 'ยอดขายกำลังพุ่ง', 'Trend DOWN': 'ยอดขายกำลังตก', 'Stable': 'ยอดขายทรงตัว' }[value] || value;
                    return `ขณะที่${thMomentum}`;
                case 'market':
                    return `ที่ตลาด ${value}`;
                case 'gap':
                    if (value === '0-1 Day Gap') return 'ขายดีต่อเนื่อง (Gap 0-1 วัน)';
                    if (value === 'Long Gap (4+ Days)') return 'หายไปนาน (4+ วัน)';
                    return value;
                default:
                    return `${key} คือ ${value}`;
            }
        };

        // Construct natural sentence
        const conditionText = dimKeys.map(k => translateCriteria(k, data.criteria[k])).join(' และ ');

        let analysis = '';
        let action = '';

        // 🌟 Actionable Auto-Suggest & Human-friendly Analysis 🌟
        if (type === 'PERFECT_STORM') {
            analysis = `🎯 **โอกาสทอง!** ปกติ **'${productName}'** ขายได้ **${baseAvg.toFixed(1)} ชิ้น** แต่พอมีปัจจัย **${conditionText}** ยอดจะพุ่งไปถึง **${avg.toFixed(1)} ชิ้น** (+${(lift * 100).toFixed(0)}%)`;
            action = `เตรียมอบเพิ่มเป็น **${Math.ceil(avg * 1.15)} ชิ้น** เพื่อไม่ให้ของขาดและโกยยอดขายได้เต็มที่`;
        } else if (type === 'SILENT_KILLER') {
            analysis = `⚠️ **ระวังของเหลือ!** เมื่อไหร่ที่ **${conditionText}** คนจะไม่ค่อยซื้อ **'${productName}'** (ยอดตกเหลือแค่ **${avg.toFixed(1)} ชิ้น** หรือหายไป -${Math.abs(lift * 100).toFixed(0)}%)`;
            action = `ลดปริมาณการอบลงให้เหลือแค่ **${Math.floor(avg)} ชิ้น** หรือดรอปการทำเมนูนี้ไปก่อนเลย`;
        } else {
            analysis = `💡 **ข้อสังเกต:** ยอดขายมักขยับขึ้นบวกนิดหน่อย (+${(lift * 100).toFixed(0)}%) เมื่อ **${conditionText}**`;
            action = `เตรียมของเพิ่มนิดหน่อยเป็น **${Math.ceil(avg * 1.1)} ชิ้น** ก็พอรองรับได้สบายๆ`;
        }

        patterns.push({
            id,
            productId,
            productName,
            type,
            dimensions: data.criteria,
            metrics: {
                occurrence: data.count,
                avgSales: avg,
                baseSales: baseAvg,
                lift,
                confidence,
                significance: baseStd > 0 ? (avg - baseAvg) / baseStd : 0 // Real Z-Score
            },
            analysis,
            action
        });
    });

    // 🌟 Advanced Redundancy Elimination 🌟
    // Filter out patterns that describe the exact same underlying sales days
    let filteredPatterns: OraclePattern[] = [];

    // Sort primarily by lift to keep the most impactful ones first
    const sortedPatterns = patterns.sort((a, b) => Math.abs(b.metrics.lift) - Math.abs(a.metrics.lift));

    for (const p of sortedPatterns) {
        let isRedundant = false;

        for (const fp of filteredPatterns) {
            // Only compare patterns of the same type (e.g., don't merge a STORM with a KILLER)
            if (fp.type !== p.type) continue;
            if (fp.productId !== p.productId) continue; // Must be same product

            const fpKeys = Object.keys(fp.dimensions);
            const pKeys = Object.keys(p.dimensions);

            // Check if one is a strict dimension subset of another
            // (e.g., fp = { day: 'Monday' }, p = { day: 'Monday', marketId: 'M1' })
            const isSubsetOfFp = pKeys.every(k => fp.dimensions[k] === p.dimensions[k]);
            const fpIsSubsetOfP = fpKeys.every(k => fp.dimensions[k] === p.dimensions[k]);

            // If they are subsets or identical combinations
            if (isSubsetOfFp || fpIsSubsetOfP) {
                // If they have similar occurrence counts (meaning the exact same days triggered both)
                // e.g. "Monday" happened 3 times, and "Monday at Market X" also happened 3 times
                // It means all Monday sales were at Market X anyway -> Redundant!
                const occurrenceDiff = Math.abs(fp.metrics.occurrence - p.metrics.occurrence);

                // If the occurrence is exactly the same, or very close (<= 1 difference for small datasets)
                // AND the lift is similar, we throw away the more complex/less impactful one
                if (occurrenceDiff <= 1) {
                    isRedundant = true;
                    break;
                }

                // If occurrence is different but lift is basically the same, still redundant
                const liftDiff = Math.abs(Math.abs(fp.metrics.lift) - Math.abs(p.metrics.lift));
                if (liftDiff < 0.10) {
                    isRedundant = true;
                    break;
                }
            }
        }

        if (!isRedundant) {
            filteredPatterns.push(p);
        }
    }

    return filteredPatterns.slice(0, topN);
}

// ==========================================
// 💑 COMBO INTELLIGENCE (Correlation Analysis)
// ==========================================

export interface ComboResult {
    productA: { id: string; name: string };
    productB: { id: string; name: string };
    correlation: number; // -1 to 1
    type: 'POWER_COUPLE' | 'COMPETITOR';
    occurrence: number;
    avgSalesA: number;
    avgSalesB: number;
}

export async function runComboAnalysis(
    allSales: ProductSaleLog[]
): Promise<OraclePattern[]> {
    const patterns: OraclePattern[] = [];
    const MIN_DAYS = 5; // Need at least 5 overlapping days

    // Group sales by product
    const productSalesMap = new Map<string, Map<string, number>>(); // productId -> (date -> qty)
    const productNames = new Map<string, string>();

    allSales.forEach(sale => {
        const key = sale.variantId || sale.productId;
        if (!productSalesMap.has(key)) {
            productSalesMap.set(key, new Map());
            productNames.set(key, sale.productName + (sale.variantName ? ` - ${sale.variantName}` : ''));
        }
        const dateMap = productSalesMap.get(key)!;
        dateMap.set(sale.saleDate, (dateMap.get(sale.saleDate) || 0) + sale.quantitySold);
    });

    const productIds = Array.from(productSalesMap.keys());

    // Calculate pairwise correlations
    for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
            const idA = productIds[i];
            const idB = productIds[j];
            const salesA = productSalesMap.get(idA)!;
            const salesB = productSalesMap.get(idB)!;

            // Find overlapping dates
            const commonDates = Array.from(salesA.keys()).filter(d => salesB.has(d));
            if (commonDates.length < MIN_DAYS) continue;

            // Get values
            const valuesA = commonDates.map(d => salesA.get(d) || 0);
            const valuesB = commonDates.map(d => salesB.get(d) || 0);

            // Calculate Pearson Correlation
            const meanA = ss.mean(valuesA);
            const meanB = ss.mean(valuesB);
            const stdA = ss.standardDeviation(valuesA);
            const stdB = ss.standardDeviation(valuesB);

            if (stdA === 0 || stdB === 0) continue; // No variance

            let sumProduct = 0;
            for (let k = 0; k < commonDates.length; k++) {
                sumProduct += (valuesA[k] - meanA) * (valuesB[k] - meanB);
            }
            const correlation = sumProduct / (commonDates.length * stdA * stdB);

            // Filter for significant correlations
            if (Math.abs(correlation) < 0.5) continue;

            const type: 'POWER_COUPLE' | 'COMPETITOR' = correlation > 0 ? 'POWER_COUPLE' : 'COMPETITOR';
            const nameA = productNames.get(idA) || 'Unknown';
            const nameB = productNames.get(idB) || 'Unknown';

            let analysis = '';
            let action = '';

            // 🌟 Smart Bundling Suggestions 🌟
            if (type === 'POWER_COUPLE') {
                analysis = `🤝 **ลูกค้ารักที่จะซื้อคู่กัน:** 10 คนซื้อ **'${nameA}'** โอกาสสูงมากที่จะหยิบ **'${nameB}'** ไปด้วย (จับคู่กันบ่อยถึง ${(correlation * 100).toFixed(0)}%)`;
                action = `จัดโปรโมชั่น **"ซื้อคู่ถูกกว่า (Combo Set)"** เพื่อเร่งระบายสต็อก หรือขยับตำแหน่งจัดวางให้หยิบเพลินทั้งคู่`;
            } else {
                analysis = `⚔️ **สินค้าแข่งไซส์กันเอง:** เมื่อ **'${nameA}'** ขายดี ยอดของ **'${nameB}'** จะตกพรวด (ลูกค้าเลือกลังเลอย่างใดอย่างหนึ่ง)`;
                action = `อย่าวางขายคู่กันเด่นๆ เด็ดขาด ควรแยกจับโปรโมตสลับวันเพื่อลดของเหลือทิ้ง (Waste)`;
            }

            patterns.push({
                id: `combo-${idA}-${idB}`,
                productId: idA,
                productName: nameA,
                relatedProductId: idB,
                relatedProductName: nameB,
                type,
                dimensions: { pair: `${nameA} + ${nameB}` },
                metrics: {
                    occurrence: commonDates.length,
                    avgSales: meanA,
                    baseSales: meanB,
                    lift: correlation,
                    confidence: Math.abs(correlation) * 100,
                    significance: 0
                },
                analysis,
                action
            });
        }
    }

    // Sort by absolute correlation
    return patterns.sort((a, b) => Math.abs(b.metrics.lift) - Math.abs(a.metrics.lift)).slice(0, 5);
}

// ==========================================
// 🦈 CANNIBALISM DETECTION
// ==========================================

export async function runCannibalismCheck(
    allSales: ProductSaleLog[]
): Promise<OraclePattern[]> {
    const patterns: OraclePattern[] = [];
    const MIN_DAYS_BEFORE = 7;
    const MIN_DAYS_AFTER = 5;
    const SIGNIFICANT_DROP = 0.20; // 20% drop

    // Find first sale date per product
    const productFirstSale = new Map<string, string>(); // productId -> first sale date
    const productNames = new Map<string, string>();

    allSales.forEach(sale => {
        const key = sale.variantId || sale.productId;
        const existing = productFirstSale.get(key);
        if (!existing || sale.saleDate < existing) {
            productFirstSale.set(key, sale.saleDate);
        }
        if (!productNames.has(key)) {
            productNames.set(key, sale.productName + (sale.variantName ? ` - ${sale.variantName}` : ''));
        }
    });

    // Sort products by first sale date (newest first = potential cannibals)
    const sortedProducts = Array.from(productFirstSale.entries())
        .sort((a, b) => b[1].localeCompare(a[1]));

    // For each "new" product, check impact on "old" products
    for (const [newProductId, introDate] of sortedProducts) {
        const newProductName = productNames.get(newProductId) || 'Unknown';

        // Check each older product
        for (const [oldProductId, oldFirstDate] of productFirstSale.entries()) {
            if (oldProductId === newProductId) continue;
            if (oldFirstDate >= introDate) continue; // Not older

            // Get old product's sales BEFORE and AFTER new product intro
            const oldSalesBefore = allSales.filter(s =>
                (s.variantId === oldProductId || s.productId === oldProductId) &&
                s.saleDate < introDate
            );
            const oldSalesAfter = allSales.filter(s =>
                (s.variantId === oldProductId || s.productId === oldProductId) &&
                s.saleDate >= introDate
            );

            if (oldSalesBefore.length < MIN_DAYS_BEFORE || oldSalesAfter.length < MIN_DAYS_AFTER) continue;

            const avgBefore = ss.mean(oldSalesBefore.map(s => s.quantitySold));
            const avgAfter = ss.mean(oldSalesAfter.map(s => s.quantitySold));

            if (avgBefore === 0) continue;

            const change = (avgAfter - avgBefore) / avgBefore;

            // Only flag significant drops
            if (change > -SIGNIFICANT_DROP) continue;

            const oldProductName = productNames.get(oldProductId) || 'Unknown';
            const dropPercent = Math.abs(change * 100).toFixed(0);

            patterns.push({
                id: `cannibal-${newProductId}-${oldProductId}`,
                productId: newProductId,
                productName: newProductName,
                relatedProductId: oldProductId,
                relatedProductName: oldProductName,
                type: 'CANNIBAL',
                dimensions: {
                    newProduct: newProductName,
                    affectedProduct: oldProductName,
                    introDate
                },
                metrics: {
                    occurrence: oldSalesAfter.length,
                    avgSales: avgAfter,
                    baseSales: avgBefore,
                    lift: change,
                    confidence: Math.min(95, oldSalesAfter.length * 10), // More data = more confident
                    significance: 0
                },
                analysis: `🤼 **ลูกค้าเทใจไปเมนูใหม่:** ตั้งแต่ส่ง **'${newProductName}'** ลงตลาด ยอดของ **'${oldProductName}'** ลดฮวบถึง **-${dropPercent}%** (เหลือ ${avgAfter.toFixed(1)} ชิ้น/วัน)`,
                action: `ลดปริมาณการทำ ${oldProductName} ลงครึ่งหนึ่งเพื่อเปิดทางให้ของใหม่ หรือ **จัดเซ็ตจับคู่สุดคุ้ม** เพื่อให้เก่ายังขายออก`
            });
        }
    }

    // Sort by drop magnitude
    return patterns.sort((a, b) => a.metrics.lift - b.metrics.lift).slice(0, 5);
}
