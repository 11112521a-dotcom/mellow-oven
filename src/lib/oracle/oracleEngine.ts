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
const getChronoCycle = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();

    let phase = 'Mid-Month';
    if (day <= 7) phase = 'Early Month';
    // Days 25-31 or Day 1 = Payday Phase ?? (Let's stick to standard definition first)
    // Adjust logic for "Payday" usually 25th - 5th
    if (day >= 25 || day <= 5) phase = 'Payday Phase';
    else if (day >= 13 && day <= 17) phase = 'Mid-Month'; // Strict mid-month
    else phase = 'Normal Phase';

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
const getBasketContext = (allLogs: ProductSaleLog[], date: string): string => {
    // Calculate total items sold in store that day
    const dayLogs = allLogs.filter(l => l.saleDate === date);
    const totalItems = dayLogs.reduce((sum, l) => sum + l.quantitySold, 0);

    // This needs a baseline. For now, simple threshold or relative to avg
    // We'll compute this dynamically outside if possible, but for row-level extraction:
    // Let's assume a "High Traffic" day is > 50 items (Placeholder, should be dynamic)
    // Better: We need the global context. Let's rely on the passed in Aggregates.
    // For simplicity V1: Just Return value
    if (totalItems > 100) return 'High Traffic'; // Example threshold
    if (totalItems < 30) return 'Low Traffic';
    return 'Normal Traffic';
};


// ==========================================
// 🧬 THE MINING ALGORITHM (Permutation Engine)
// ==========================================

export async function runOracle(
    productName: string,
    productId: string,
    history: ProductSaleLog[],
    allSales: ProductSaleLog[] // Context for Store Traffic
): Promise<OraclePattern[]> {

    const patterns: OraclePattern[] = [];
    const MAX_DEPTH = 3; // Limit combination depth for performance
    const MIN_OCCURRENCE = 3; // Guardrail: Impact Rule

    // 1. Prepare Dataset (Flattened Rows)
    // Only analyze days where sales happened OR should have happened (active days)
    // To be safe, we analyze dates present in history

    // EXCLUSION: Ignore "Mor Lam" (หมอลำ) events as they are non-recurring/annual events
    const validHistory = history.filter(log => !log.marketName?.includes('หมอลำ'));

    const dataset = validHistory.map(log => {
        const { dayName, phase } = getChronoCycle(log.saleDate);
        return {
            date: log.saleDate,
            qty: log.quantitySold,
            dims: {
                day: dayName,
                phase: phase,
                weather: getAtmosphere(allSales, log.saleDate), // Use global logs for weather source
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
    const observedCombos: Map<string, { count: number, totalQty: number, values: number[], criteria: Record<string, string> }> = new Map();

    const dimensions = ['day', 'phase', 'weather', 'momentum', 'velocity', 'gap', 'traffic', 'market'];

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
            if (!observedCombos.has(key)) observedCombos.set(key, { count: 0, totalQty: 0, values: [], criteria: { [dim]: row.dims[dim as keyof typeof row.dims] } });
            const entry = observedCombos.get(key)!;
            entry.count++;
            entry.totalQty += row.qty;
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
                if (!observedCombos.has(key)) observedCombos.set(key, { count: 0, totalQty: 0, values: [], criteria });
                const entry = observedCombos.get(key)!;
                entry.count++;
                entry.totalQty += row.qty;
                entry.values.push(row.qty);

                // Level 3 (Trios) - Only if i, j are core distinct categories
                // e.g. Day + Phase + Weather OR Day + Weather + Momentum
                for (let k = j + 1; k < dimensions.length; k++) {
                    const d3 = dimensions[k];
                    const criteria3 = { ...criteria, [d3]: row.dims[d3 as keyof typeof row.dims] };
                    const key3 = JSON.stringify(criteria3);
                    if (!observedCombos.has(key3)) observedCombos.set(key3, { count: 0, totalQty: 0, values: [], criteria: criteria3 });
                    const entry3 = observedCombos.get(key3)!;
                    entry3.count++;
                    entry3.totalQty += row.qty;
                    entry3.values.push(row.qty);
                }
            }
        }
    }

    // 3. Statistical Validation (The 3 Rules)
    observedCombos.forEach((data, key) => {
        // Rule 1: Occurrence Check
        if (data.count < MIN_OCCURRENCE) return;

        // Calculate Metrics
        const avg = data.totalQty / data.count;
        const std = ss.standardDeviation(data.values);

        // Rule 2: Impact Check (Difference from Base > 25%)
        // Avoid division by zero
        const safeBaseAvg = baseAvg === 0 ? 0.1 : baseAvg;
        const lift = (avg - safeBaseAvg) / safeBaseAvg;

        if (Math.abs(lift) < 0.25) return; // Ignore boring patterns

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

        if (type === 'PERFECT_STORM') {
            analysis = `ค้นพบพฤติกรรมทองคำ! ปกติ **'${productName}'** ขายได้เฉลี่ย **${baseAvg.toFixed(1)} ชิ้น**... แต่เมื่อ **${conditionText}** ยอดขายมักพุ่งสูงถึง **${avg.toFixed(1)} ชิ้น** (**+${(lift * 100).toFixed(0)}%**) โอกาสแม่นยำ **${confidence.toFixed(0)}%**`;
            action = `เตรียมของเพิ่มอย่างน้อย **${Math.ceil(avg * 1.2)} ชิ้น** ในวันที่เงื่อนไขตรงกัน`;
        } else if (type === 'SILENT_KILLER') {
            analysis = `เตือนภัยระดับแดง! สินค้านี้มักขายไม่ออก (เหลือ **${avg.toFixed(1)} ชิ้น**) เมื่อ **${conditionText}** ยอดขายหายไปกว่า **-${Math.abs(lift * 100).toFixed(0)}%**`;
            action = `ลดการผลิตลงครึ่งหนึ่งหรือหยุดผลิตในวันที่มีเงื่อนไขนี้`;
        } else {
            analysis = `โอกาสเล็กๆ: ยอดขายมักขยับขึ้น **+${(lift * 100).toFixed(0)}%** เมื่อ **${conditionText}**`;
            action = `เพิ่มยอดผลิตเล็กน้อยเพื่อรองรับ`;
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
                significance: 0 // Placeholder
            },
            analysis,
            action
        });
    });

    // Sort by Impact (Lift) absolute
    return patterns.sort((a, b) => Math.abs(b.metrics.lift) - Math.abs(a.metrics.lift)).slice(0, 3); // Top 3 ONLY
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

            if (type === 'POWER_COUPLE') {
                analysis = `💑 **คู่หูขายดีด้วยกัน!** เมื่อ **'${nameA}'** ขายดี มักพบว่า **'${nameB}'** ก็ขายดีตาม (Correlation: ${(correlation * 100).toFixed(0)}%)`;
                action = `ผลิตคู่กันเสมอ → ถ้าวันไหนทำนายว่า ${nameA} ขายดี ให้เพิ่ม ${nameB} ด้วย`;
            } else {
                analysis = `⚔️ **สินค้าแย่งลูกค้ากัน!** เมื่อ **'${nameA}'** ขายดี มักพบว่า **'${nameB}'** ขายลดลง (Correlation: ${(correlation * 100).toFixed(0)}%)`;
                action = `อย่าผลิตพร้อมกันเยอะเกินไป → อาจต้องเลือกโฟกัสวันนั้น`;
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
    return patterns.sort((a, b) => Math.abs(b.metrics.lift) - Math.abs(a.metrics.lift)).slice(0, 3);
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
                analysis: `🦈 **พฤติกรรม Cannibalism!** หลังจากเพิ่ม **'${newProductName}'** ยอดขาย **'${oldProductName}'** ลดลง **-${dropPercent}%** (จาก ${avgBefore.toFixed(1)} → ${avgAfter.toFixed(1)} ชิ้น/วัน)`,
                action: `พิจารณาลดการผลิต ${oldProductName} เมื่อมี ${newProductName} ขาย หรือพิจารณาหยุดสินค้าที่แย่งลูกค้ากัน`
            });
        }
    }

    // Sort by drop magnitude
    return patterns.sort((a, b) => a.metrics.lift - b.metrics.lift).slice(0, 3);
}
