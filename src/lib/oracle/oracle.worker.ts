// =============================================================================
// 🔮 THE ORACLE CORE — BACKGROUND WORKER v2.0
// =============================================================================
// Runs in a Web Worker (Background Thread) so the UI never freezes.
// Upgraded with:
//   ✅ Apriori-Pruning   → Faster pattern mining (no useless combos)
//   ✅ Welch's T-Test    → Statistically rigorous (filters out flukes)
//   ✅ Exponential Decay → Smoothly weights recent data higher
//   ✅ Holiday API       → Live Thai holidays from Nager.Date (no hardcode!)
//   ✅ Strategic NLG     → "กุนซือการตลาด" not "บอกอบกี่ชิ้น"
// =============================================================================

import * as ss from 'simple-statistics';
import { ProductSaleLog } from '@/types';

// ============================================================
// 📦 WORKER MESSAGE PROTOCOL
// ============================================================

export type OracleWorkerRequest =
    | { type: 'RUN_ORACLE';      payload: { productName: string; productId: string; history: ProductSaleLog[]; allSales: ProductSaleLog[]; topN?: number } }
    | { type: 'RUN_COMBO';       payload: { allSales: ProductSaleLog[] } }
    | { type: 'RUN_CANNIBALISM'; payload: { allSales: ProductSaleLog[] } };

export type OracleWorkerResponse =
    | { type: 'ORACLE_RESULT';      requestId: string; patterns: OraclePattern[] }
    | { type: 'COMBO_RESULT';       requestId: string; patterns: OraclePattern[] }
    | { type: 'CANNIBALISM_RESULT'; requestId: string; patterns: OraclePattern[] }
    | { type: 'ERROR';              requestId: string; message: string };

// ============================================================
// 🗂️ TYPES
// ============================================================

export interface OraclePattern {
    id: string;
    productId: string;
    productName: string;
    type: 'PERFECT_STORM' | 'SILENT_KILLER' | 'OPPORTUNITY' | 'POWER_COUPLE' | 'COMPETITOR' | 'CANNIBAL';
    dimensions: Record<string, string>;
    metrics: {
        occurrence: number;
        avgSales: number;
        baseSales: number;
        lift: number;
        confidence: number;
        significance: number;
        pValue?: number;       // NEW: from Welch's T-Test
    };
    analysis: string;
    action: string;
    relatedProductId?: string;
    relatedProductName?: string;
}

// ============================================================
// 🛠️ FEATURE ENGINEERING (7 DIMENSIONS)
// ============================================================

// 1. Chrono-Cycle
const getChronoCycle = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const day = date.getDate();
    let phase: string;
    if (day >= 25)           phase = 'Payday Phase';
    else if (day <= 5)       phase = 'Early Month';
    else if (day >= 13 && day <= 17) phase = 'Mid-Month';
    else                     phase = 'Normal Phase';
    return { dayName, phase };
};

// 2. Weather / Atmosphere
const getAtmosphere = (allSales: ProductSaleLog[], date: string): string => {
    const log = allSales.find(l => l.saleDate === date && l.weatherCondition);
    return log?.weatherCondition || 'Unknown';
};

// 3. Momentum (vs yesterday)
const getMomentum = (productLogs: ProductSaleLog[], currentDate: string): string => {
    const todayLog = productLogs.find(l => l.saleDate === currentDate);
    if (!todayLog) return 'None';
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yLog = productLogs.find(l => l.saleDate === yesterday.toISOString().split('T')[0]);
    const todayQty = todayLog.quantitySold;
    const yQty = yLog?.quantitySold || 0;
    if (todayQty > yQty * 1.2) return 'Trend UP';
    if (todayQty < yQty * 0.8) return 'Trend DOWN';
    return 'Stable';
};

// 4. Velocity (Rolling 3 days)
const getVelocity = (productLogs: ProductSaleLog[], currentDate: string): string => {
    let soldDays = 0;
    for (let i = 1; i <= 3; i++) {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        if (productLogs.some(l => l.saleDate === dStr && l.quantitySold > 0)) soldDays++;
    }
    if (soldDays === 3) return 'Fast Velocity';
    if (soldDays === 0) return 'Dead Stock';
    return 'Normal Velocity';
};

// 5. Gap (Days since last sale)
const getGap = (productLogs: ProductSaleLog[], currentDate: string): string => {
    const sorted = [...productLogs]
        .filter(l => l.saleDate < currentDate && l.quantitySold > 0)
        .sort((a, b) => b.saleDate.localeCompare(a.saleDate));
    if (sorted.length === 0) return 'First Time';
    const diff = Math.ceil((new Date(currentDate).getTime() - new Date(sorted[0].saleDate).getTime()) / 86400000);
    if (diff <= 1) return '0-1 Day Gap';
    if (diff <= 3) return '2-3 Day Gap';
    return 'Long Gap (4+ Days)';
};

// 6. Basket Context (store traffic)
const getBasketContext = (allSales: ProductSaleLog[], date: string): string => {
    const dailyTotals = new Map<string, number>();
    allSales.forEach(l => dailyTotals.set(l.saleDate, (dailyTotals.get(l.saleDate) || 0) + l.quantitySold));
    const arr = Array.from(dailyTotals.values()).sort((a, b) => a - b);
    const p75 = arr.length > 0 ? ss.quantile(arr, 0.75) : 100;
    const p25 = arr.length > 0 ? ss.quantile(arr, 0.25) : 30;
    const today = dailyTotals.get(date) || 0;
    if (today >= p75) return 'High Traffic';
    if (today <= p25) return 'Low Traffic';
    return 'Normal Traffic';
};

// 7. Holiday Context — Google Calendar Public iCal Feed (no API key needed!)
// URL: calendar.google.com/calendar/ical/th.th#holiday@group.v.calendar.google.com/public/basic.ics
// ✅ Includes: วันแม่ (12 ส.ค.), วันพ่อ (5 ธ.ค.), วันจันทรคติ (วิสาขบูชา ฯลฯ), วันหยุดชดเชย
// ✅ Free, no key, maintained by Google, updates every year automatically

const ICAL_URL = 'https://calendar.google.com/calendar/ical/th.th%23holiday%40group.v.calendar.google.com/public/basic.ics';

// Cache: Map<year, Set<YYYY-MM-DD>>  — populated once per year
const _holidayCache = new Map<number, Set<string>>();
const _loadingYears = new Set<number>(); // Guard against duplicate fetches

/**
 * Parse a raw iCal (.ics) string and return all event dates for a specific year.
 * Handles DTSTART;VALUE=DATE format (all-day events).
 */
function parseICalHolidays(icsText: string, year: number): Set<string> {
    const result = new Set<string>();
    const events = icsText.split('BEGIN:VEVENT');
    for (const ev of events) {
        const match = ev.match(/DTSTART;VALUE=DATE:(\d{8})/);
        if (!match) continue;
        const raw = match[1]; // e.g. "20250812"
        if (!raw.startsWith(String(year))) continue;
        const date = `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
        result.add(date);
    }
    return result;
}

/**
 * Fetch and cache Thai public holidays from Google Calendar iCal.
 * Falls back gracefully to an empty Set if offline.
 */
async function ensureHolidaysLoaded(year: number): Promise<void> {
    if (_holidayCache.has(year) || _loadingYears.has(year)) return;
    _loadingYears.add(year);
    try {
        const res = await fetch(ICAL_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const icsText = await res.text();
        // Extract holidays for ALL years found in the feed, not just the requested year
        // (Google's feed contains multiple years)
        const allYears = new Set<number>();
        const matches = icsText.matchAll(/DTSTART;VALUE=DATE:(\d{4})/g);
        for (const m of matches) allYears.add(Number(m[1]));
        for (const y of allYears) {
            if (!_holidayCache.has(y)) {
                _holidayCache.set(y, parseICalHolidays(icsText, y));
            }
        }
        // Guarantee the requested year is always set (even if empty)
        if (!_holidayCache.has(year)) _holidayCache.set(year, new Set());
    } catch {
        // Offline or error — fall back to empty (weekend-only detection will still work)
        _holidayCache.set(year, new Set());
    } finally {
        _loadingYears.delete(year);
    }
}

/**
 * Pre-warm holiday cache for all unique years in the dataset.
 * Runs ONCE before the analysis loop — all subsequent lookups are O(1).
 */
async function preloadHolidayYears(dates: string[]): Promise<void> {
    const years = new Set(dates.map(d => new Date(d).getFullYear()));
    // Only fetch years not already cached
    const missing = Array.from(years).filter(y => !_holidayCache.has(y));
    if (missing.length === 0) return;
    // One fetch covers all years (Google's feed spans multiple years)
    await ensureHolidaysLoaded(missing[0]);
}

const getHolidayContext = (dateStr: string): string => {
    const date = new Date(dateStr);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    const year = date.getFullYear();

    const yearHolidays = _holidayCache.get(year);
    if (yearHolidays?.has(dateStr)) return 'Public Holiday';
    if (dow === 0 || dow === 6) return 'Weekend';
    return 'Weekday';
};

// Market Context
const getMarket = (log: ProductSaleLog): string => log.marketName || 'Unknown Market';

// ============================================================
// 📐 STATISTICS HELPERS
// ============================================================

// Exponential Decay Weight: W = e^(-λt), λ=0.03 → 14-day half-life ~0.65
const DECAY_LAMBDA = 0.03;
const computeDecayWeight = (diffDays: number): number =>
    Math.exp(-DECAY_LAMBDA * diffDays);

// Welch's T-Test: tests if two group means differ significantly
// Returns { t, df, pValue }
const welchTTest = (groupA: number[], groupB: number[]): { t: number; df: number; pValue: number } => {
    if (groupA.length < 2 || groupB.length < 2) return { t: 0, df: 1, pValue: 1 };

    const n1 = groupA.length, n2 = groupB.length;
    const m1 = ss.mean(groupA), m2 = ss.mean(groupB);
    const v1 = ss.variance(groupA), v2 = ss.variance(groupB);

    const se = Math.sqrt(v1 / n1 + v2 / n2);
    if (se === 0) return { t: 0, df: 1, pValue: 1 };

    const t = (m1 - m2) / se;

    // Welch–Satterthwaite degrees of freedom
    const dfNum = Math.pow(v1 / n1 + v2 / n2, 2);
    const dfDen = Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1);
    const df = dfNum / dfDen;

    // Approximate p-value using t-distribution CDF approximation (two-tailed)
    // Using Abramowitz & Stegun approximation
    const x = df / (df + t * t);
    // Incomplete beta function approximation (simple)
    const pValue = Math.min(1, 2 * incompleteBetaApprox(df / 2, 0.5, x));

    return { t, df, pValue };
};

// Incomplete Beta approximation (Continued Fraction, for p-value estimation)
const incompleteBetaApprox = (a: number, b: number, x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Simple Euler continued fraction approx — sufficient for p > 0.05 filter
    const lbeta = lgamma(a) + lgamma(b) - lgamma(a + b);
    const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a;
    // 10-step continued fraction
    let h = 1.0, d = 0.0, c = 1.0;
    for (let m = 0; m <= 10; m++) {
        const m2 = 2 * m;
        const d1 = m === 0 ? 1 : -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
        c = 1 + d1 / c; d = 1 + d1 * d; if (Math.abs(c) < 1e-30) c = 1e-30; if (Math.abs(d) < 1e-30) d = 1e-30;
        c = 1 / c; d = 1 / d; h *= c * d;
        const d2 = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
        c = 1 + d2 / c; d = 1 + d2 * d; if (Math.abs(c) < 1e-30) c = 1e-30; if (Math.abs(d) < 1e-30) d = 1e-30;
        c = 1 / c; d = 1 / d; h *= c * d;
    }
    return front * h;
};

// Log-Gamma (Stirling approximation)
const lgamma = (z: number): number => {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
        -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let x = z, y = z, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) { y++; ser += c[j] / y; }
    return -tmp + Math.log(2.5066282746310005 * ser / x);
};

// ============================================================
// 🗣️ STRATEGIC NATURAL LANGUAGE GENERATOR (กุนซือการตลาด)
// ============================================================

const translateDim = (key: string, value: string): string => {
    if (key === 'day') {
        const m: Record<string, string> = {
            Monday: 'วันจันทร์', Tuesday: 'วันอังคาร', Wednesday: 'วันพุธ',
            Thursday: 'วันพฤหัสบดี', Friday: 'วันศุกร์', Saturday: 'วันเสาร์', Sunday: 'วันอาทิตย์'
        };
        return `วัน${m[value] || value}`;
    }
    if (key === 'phase') {
        const m: Record<string, string> = {
            'Payday Phase': 'ช่วงเงินเดือนออก (25-31)', 'Mid-Month': 'ช่วงกลางเดือน (13-17)',
            'Early Month': 'ต้นเดือน (1-5)', 'Normal Phase': 'ช่วงกลางเดือนธรรมดา'
        };
        return m[value] || value;
    }
    if (key === 'weather') {
        const m: Record<string, string> = { Rain: 'อากาศฝนตก', Sunny: 'แดดจัด', Cloudy: 'เมฆครึ้ม', Storm: 'พายุ' };
        return `ช่วง${m[value] || value}`;
    }
    if (key === 'holiday') {
        const m: Record<string, string> = { 'Public Holiday': 'วันหยุดนักขัตฤกษ์', 'Weekend': 'วันหยุดสุดสัปดาห์', 'Weekday': 'วันธรรมดา' };
        return m[value] || value;
    }
    if (key === 'market') return `ตลาด ${value}`;
    if (key === 'momentum') {
        const m: Record<string, string> = { 'Trend UP': 'ยอดขายกำลังพุ่ง', 'Trend DOWN': 'ยอดขายกำลังตก', Stable: 'ยอดขายทรงตัว' };
        return m[value] || value;
    }
    if (key === 'traffic') {
        const m: Record<string, string> = { 'High Traffic': 'ลูกค้าคึกคัก', 'Low Traffic': 'ลูกค้าเบาบาง', 'Normal Traffic': 'ลูกค้าปกติ' };
        return m[value] || value;
    }
    return `${key}:${value}`;
};

const generateStrategicInsight = (
    type: OraclePattern['type'],
    productName: string,
    conditionParts: string[],
    lift: number,
    confidence: number,
    occurrence: number
): { analysis: string; action: string } => {
    const condition = conditionParts.join(' + ');
    const liftPct = Math.abs(lift * 100).toFixed(0);
    const isHighConfidence = confidence >= 75;

    if (type === 'PERFECT_STORM') {
        const analyses = [
            `🎯 **ทริกเกอร์ทองคำ** — ลูกค้าซื้อ **'${productName}'** บ่อยผิดปกติเมื่อเกิด **${condition}** (เกิดซ้ำ ${occurrence} ครั้ง ความมั่นใจ ${confidence.toFixed(0)}%)`,
            `🎯 **จังหวะทำเงิน** — ข้อมูล ${occurrence} วันยืนยันว่า **${condition}** คือเงื่อนไขที่ทำให้ **'${productName}'** เป็นที่ต้องการของลูกค้าสูงมาก`,
        ];
        const actions = isHighConfidence ? [
            `📣 **เปิดแคมเปญเฉพาะช่วง** — จัดโปรโมชั่นหรือเตรียมของพิเศษไว้รับช่วง **${condition}** โดยเฉพาะ ลูกค้าพร้อมซื้อ อย่าปล่อยโอกาสทิ้ง`,
            `📣 **ดัน Awareness ล่วงหน้า** — ก่อนเข้าช่วง **${condition}** โพสต์บนโซเชียลหรือแจ้งลูกค้าประจำล่วงหน้าว่ามีสินค้านี้ พร้อมอาจทำ Bundle พิเศษ`,
        ] : [
            `📣 **ทดลองโปรช่วงนี้** — ความสัมพันธ์ยังไม่แน่นพอ แนะนำทดลองทำ Soft Launch โปรโมชั่นเบาๆ ช่วง **${condition}** แล้วดูผลตอบรับก่อน`,
        ];
        return { analysis: analyses[occurrence % analyses.length], action: actions[0] };
    }

    if (type === 'SILENT_KILLER') {
        return {
            analysis: `⚠️ **กับดักต้นทุนแฝง** — ตัวเลข ${occurrence} วันชี้ชัดว่าเมื่อเกิด **${condition}** ลูกค้าเมินสินค้า **'${productName}'** ต่างออกไปอย่างมีนัยสำคัญ (-${liftPct}% จากปกติ)`,
            action: `🔄 **ปรับกลยุทธ์ช่วงนั้น** — พิจารณาหยุดทำ **'${productName}'** ช่วง **${condition}** และเอาทรัพยากรไปโฟกัสกับเมนูที่ลูกค้าต้องการมากกว่าในช่วงนั้นแทน`,
        };
    }

    // OPPORTUNITY
    return {
        analysis: `💡 **สัญญาณบวกที่น่าจับตา** — ช่วง **${condition}** ยอดขาย **'${productName}'** มีแนวโน้มเพิ่มขึ้น (เกิดขึ้น ${occurrence} ครั้ง / +${liftPct}% จากค่าเฉลี่ย)`,
        action: `🧪 **ทดสอบ Visibility** — ลองวางสินค้านี้ไว้ตรงจุดเด่น หรือออกแคมเปญเล็กๆ เฉพาะช่วง **${condition}** เพื่อดูว่ายอดขายจะขยับขึ้นชัดขึ้นไหม`,
    };
};

// ============================================================
// ⚡️ APRIORI-PRUNING PATTERN MINER (Phase 1 → 2 → 3)
// ============================================================

interface RowData {
    date: string;
    qty: number;
    weight: number;
    dims: Record<string, string>;
}

interface ComboEntry {
    count: number;
    weightedCount: number;
    weightedTotalQty: number;
    values: number[];
    criteria: Record<string, string>;
}

const minePatterns = (
    dataset: RowData[],
    baseAvg: number,
    baseStd: number,
    allValues: number[],
    productId: string,
    productName: string,
    topN: number
): OraclePattern[] => {
    const MIN_OCCURRENCE = 3;
    const MIN_LIFT = 0.20;
    const MIN_CONFIDENCE = 50;
    const P_VALUE_THRESHOLD = 0.10; // Allow 10% chance of false positive

    // ─── PHASE 1: Single-dimension frequency count (Apriori L1) ───
    const L1 = new Map<string, ComboEntry>();
    for (const row of dataset) {
        for (const [dim, val] of Object.entries(row.dims)) {
            const key = JSON.stringify({ [dim]: val });
            if (!L1.has(key)) L1.set(key, { count: 0, weightedCount: 0, weightedTotalQty: 0, values: [], criteria: { [dim]: val } });
            const e = L1.get(key)!;
            e.count++; e.weightedCount += row.weight;
            e.weightedTotalQty += row.qty * row.weight; e.values.push(row.qty);
        }
    }

    // ─── PRUNE L1: Keep only frequent single-dims ───
    const frequentDims = new Set<string>(); // "dim:val" strings that pass
    L1.forEach((e, key) => {
        if (e.count >= MIN_OCCURRENCE) {
            Object.entries(e.criteria).forEach(([k, v]) => frequentDims.add(`${k}:${v}`));
        }
    });

    // ─── PHASE 2: Generate pairs only from frequent L1 items ───
    const allCombos = new Map<string, ComboEntry>([...L1]);
    const freqDimArr = Array.from(frequentDims);

    for (const row of dataset) {
        const rowDims = Object.entries(row.dims).filter(([k, v]) => frequentDims.has(`${k}:${v}`));
        // Pairs
        for (let i = 0; i < rowDims.length; i++) {
            for (let j = i + 1; j < rowDims.length; j++) {
                const criteria = { [rowDims[i][0]]: rowDims[i][1], [rowDims[j][0]]: rowDims[j][1] };
                const key = JSON.stringify(criteria);
                if (!allCombos.has(key)) allCombos.set(key, { count: 0, weightedCount: 0, weightedTotalQty: 0, values: [], criteria });
                const e = allCombos.get(key)!;
                e.count++; e.weightedCount += row.weight;
                e.weightedTotalQty += row.qty * row.weight; e.values.push(row.qty);
            }
        }
        // Trios (only if pair would be frequent — approximated by count check later)
        for (let i = 0; i < rowDims.length; i++) {
            for (let j = i + 1; j < rowDims.length; j++) {
                for (let k = j + 1; k < rowDims.length; k++) {
                    const criteria = {
                        [rowDims[i][0]]: rowDims[i][1],
                        [rowDims[j][0]]: rowDims[j][1],
                        [rowDims[k][0]]: rowDims[k][1]
                    };
                    const key = JSON.stringify(criteria);
                    if (!allCombos.has(key)) allCombos.set(key, { count: 0, weightedCount: 0, weightedTotalQty: 0, values: [], criteria });
                    const e = allCombos.get(key)!;
                    e.count++; e.weightedCount += row.weight;
                    e.weightedTotalQty += row.qty * row.weight; e.values.push(row.qty);
                }
            }
        }
    }

    // ─── PHASE 3: Statistical Validation (Welch's T-Test) ───
    const patterns: OraclePattern[] = [];
    const safeBaseAvg = baseAvg === 0 ? 0.1 : baseAvg;

    allCombos.forEach((data) => {
        if (data.count < MIN_OCCURRENCE) return;

        const avg = data.weightedTotalQty / data.weightedCount;
        const lift = (avg - safeBaseAvg) / safeBaseAvg;

        if (Math.abs(lift) < MIN_LIFT) return;
        if (Math.abs(avg - baseAvg) < 1.5 && data.count < 10) return;

        // Coefficient of Variation → Confidence
        const std = ss.standardDeviation(data.values);
        const cv = avg > 0 ? std / avg : 1;
        const confidence = Math.max(0, 100 - cv * 100);
        if (confidence < MIN_CONFIDENCE) return;

        // Welch's T-Test: compare this group vs baseline (everything else)
        const outsideValues = allValues.filter((_, idx) => !data.values.includes(_));
        const tResult = outsideValues.length >= 2 ? welchTTest(data.values, outsideValues) : { t: 0, df: 1, pValue: 1 };
        if (tResult.pValue > P_VALUE_THRESHOLD) return; // statistically insignificant

        let type: OraclePattern['type'] = 'OPPORTUNITY';
        if (lift > 0.8 && confidence > 70)  type = 'PERFECT_STORM';
        else if (lift < -0.8 && confidence > 80) type = 'SILENT_KILLER';
        else if (lift > 0.25)                type = 'OPPORTUNITY';
        else return;

        const conditionParts = Object.entries(data.criteria).map(([k, v]) => translateDim(k, v));
        const { analysis, action } = generateStrategicInsight(type, productName, conditionParts, lift, confidence, data.count);

        patterns.push({
            id: `oracle-${productId}-${Math.random().toString(36).substr(2, 9)}`,
            productId, productName, type,
            dimensions: data.criteria,
            metrics: {
                occurrence: data.count, avgSales: avg, baseSales: baseAvg,
                lift, confidence,
                significance: baseStd > 0 ? (avg - baseAvg) / baseStd : 0,
                pValue: tResult.pValue
            },
            analysis, action
        });
    });

    // Deduplicate redundant patterns (same-direction subsets)
    const filtered: OraclePattern[] = [];
    const sorted = patterns.sort((a, b) => Math.abs(b.metrics.lift) - Math.abs(a.metrics.lift));

    for (const p of sorted) {
        let redundant = false;
        for (const fp of filtered) {
            if (fp.type !== p.type || fp.productId !== p.productId) continue;
            const fpKeys = Object.keys(fp.dimensions);
            const pKeys = Object.keys(p.dimensions);
            const isSubset = pKeys.every(k => fp.dimensions[k] === p.dimensions[k]);
            const fpIsSubset = fpKeys.every(k => fp.dimensions[k] === p.dimensions[k]);
            if ((isSubset || fpIsSubset) && Math.abs(fp.metrics.occurrence - p.metrics.occurrence) <= 1) {
                redundant = true; break;
            }
            if ((isSubset || fpIsSubset) && Math.abs(Math.abs(fp.metrics.lift) - Math.abs(p.metrics.lift)) < 0.1) {
                redundant = true; break;
            }
        }
        if (!redundant) filtered.push(p);
    }

    return filtered.slice(0, topN);
};

// ============================================================
// 🔮 MAIN ORACLE RUN FUNCTION
// ============================================================

const runOracleInternal = async (
    productName: string,
    productId: string,
    history: ProductSaleLog[],
    allSales: ProductSaleLog[],
    topN = 5
): Promise<OraclePattern[]> => {
    const now = new Date();

    const validHistory = history.filter(log => !log.marketName?.includes('หมอลำ'));
    if (validHistory.length < 10) return [];

    // ★ Pre-warm Google Calendar holiday cache before analysis loop
    await preloadHolidayYears(validHistory.map(l => l.saleDate));

    const dataset: RowData[] = validHistory.map(log => {
        const { dayName, phase } = getChronoCycle(log.saleDate);
        const weather = getAtmosphere(allSales, log.saleDate);
        const holiday = getHolidayContext(log.saleDate); // O(1) cache lookup

        const diffDays = Math.ceil(Math.abs(now.getTime() - new Date(log.saleDate).getTime()) / 86400000);
        const weight = computeDecayWeight(diffDays);

        return {
            date: log.saleDate, qty: log.quantitySold, weight,
            dims: {
                day: dayName, phase,
                ...(weather !== 'Unknown' ? { weather } : {}),
                ...(holiday !== 'Weekday' ? { holiday } : {}),
                momentum: getMomentum(history, log.saleDate),
                velocity: getVelocity(history, log.saleDate),
                gap: getGap(history, log.saleDate),
                traffic: getBasketContext(allSales, log.saleDate),
                market: getMarket(log)
            }
        };
    });

    const allValues = dataset.map(d => d.qty);
    const baseAvg = ss.mean(allValues) || 0;
    const baseStd = ss.standardDeviation(allValues) || 0;

    return minePatterns(dataset, baseAvg, baseStd, allValues, productId, productName, topN);
};

// ============================================================
// 💑 COMBO ANALYSIS (Correlation)
// ============================================================

const runComboInternal = (allSales: ProductSaleLog[]): OraclePattern[] => {
    const patterns: OraclePattern[] = [];
    const MIN_DAYS = 5;

    const productSalesMap = new Map<string, Map<string, number>>();
    const productNames = new Map<string, string>();

    allSales.forEach(sale => {
        const key = sale.variantId || sale.productId;
        if (!productSalesMap.has(key)) {
            productSalesMap.set(key, new Map());
            productNames.set(key, sale.productName + (sale.variantName ? ` - ${sale.variantName}` : ''));
        }
        const dm = productSalesMap.get(key)!;
        dm.set(sale.saleDate, (dm.get(sale.saleDate) || 0) + sale.quantitySold);
    });

    const ids = Array.from(productSalesMap.keys());
    for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
            const idA = ids[i], idB = ids[j];
            const sA = productSalesMap.get(idA)!, sB = productSalesMap.get(idB)!;
            const common = Array.from(sA.keys()).filter(d => sB.has(d));
            if (common.length < MIN_DAYS) continue;

            const vA = common.map(d => sA.get(d) || 0);
            const vB = common.map(d => sB.get(d) || 0);
            const stdA = ss.standardDeviation(vA), stdB = ss.standardDeviation(vB);
            if (stdA === 0 || stdB === 0) continue;

            const mA = ss.mean(vA), mB = ss.mean(vB);
            let sum = 0;
            for (let k = 0; k < common.length; k++) sum += (vA[k] - mA) * (vB[k] - mB);
            const corr = sum / (common.length * stdA * stdB);
            if (Math.abs(corr) < 0.5) continue;

            const nameA = productNames.get(idA) || 'Unknown';
            const nameB = productNames.get(idB) || 'Unknown';
            const type: 'POWER_COUPLE' | 'COMPETITOR' = corr > 0 ? 'POWER_COUPLE' : 'COMPETITOR';

            let analysis = '', action = '';
            if (type === 'POWER_COUPLE') {
                analysis = `🤝 **สินค้าคู่หู** — เมื่อ **'${nameA}'** ขายได้ดี **'${nameB}'** มักขายดีตามไปด้วย (Correlation ${(corr * 100).toFixed(0)}% / ${common.length} วันที่มีข้อมูลร่วมกัน)`;
                action = `🎁 **สร้าง Combo Set** — จับ **'${nameA}'** + **'${nameB}'** เป็นเซ็ตราคาพิเศษ ลูกค้าชอบของทั้งคู่อยู่แล้ว ช่วยเพิ่ม Basket Size และลดของค้างได้ด้วย`;
            } else {
                analysis = `⚔️ **คู่แข่งในบ้านเดียวกัน** — ลูกค้ามักเลือกซื้อ **'${nameA}'** หรือ **'${nameB}'** อย่างใดอย่างหนึ่ง ไม่ค่อยซื้อคู่กัน (Negative Correlation ${(Math.abs(corr) * 100).toFixed(0)}%)`;
                action = `📅 **สลับวันจัดโปรโมท** — หลีกเลี่ยงการดัน 2 สินค้านี้พร้อมกัน ลองแยก Feature ต่างวัน/ต่างช่วง เพื่อให้แต่ละตัวมียอดขายที่แข็งแกร่งขึ้น`;
            }

            patterns.push({
                id: `combo-${idA}-${idB}`, productId: idA, productName: nameA,
                relatedProductId: idB, relatedProductName: nameB, type,
                dimensions: { pair: `${nameA} + ${nameB}` },
                metrics: { occurrence: common.length, avgSales: mA, baseSales: mB, lift: corr, confidence: Math.abs(corr) * 100, significance: 0 },
                analysis, action
            });
        }
    }

    return patterns.sort((a, b) => Math.abs(b.metrics.lift) - Math.abs(a.metrics.lift)).slice(0, 5);
};

// ============================================================
// 🦈 CANNIBALISM DETECTION
// ============================================================

const runCannibalismInternal = (allSales: ProductSaleLog[]): OraclePattern[] => {
    const patterns: OraclePattern[] = [];
    const MIN_BEFORE = 7, MIN_AFTER = 5, DROP_THRESHOLD = 0.20;

    const productFirstSale = new Map<string, string>();
    const productNames = new Map<string, string>();

    allSales.forEach(sale => {
        const key = sale.variantId || sale.productId;
        const existing = productFirstSale.get(key);
        if (!existing || sale.saleDate < existing) productFirstSale.set(key, sale.saleDate);
        if (!productNames.has(key)) productNames.set(key, sale.productName + (sale.variantName ? ` - ${sale.variantName}` : ''));
    });

    const sorted = Array.from(productFirstSale.entries()).sort((a, b) => b[1].localeCompare(a[1]));

    for (const [newId, introDate] of sorted) {
        const newName = productNames.get(newId) || 'Unknown';
        for (const [oldId, oldFirst] of productFirstSale.entries()) {
            if (oldId === newId || oldFirst >= introDate) continue;
            const before = allSales.filter(s => (s.variantId === oldId || s.productId === oldId) && s.saleDate < introDate);
            const after  = allSales.filter(s => (s.variantId === oldId || s.productId === oldId) && s.saleDate >= introDate);
            if (before.length < MIN_BEFORE || after.length < MIN_AFTER) continue;
            const avgBefore = ss.mean(before.map(s => s.quantitySold));
            const avgAfter  = ss.mean(after.map(s => s.quantitySold));
            if (avgBefore === 0) continue;
            const change = (avgAfter - avgBefore) / avgBefore;
            if (change > -DROP_THRESHOLD) continue;
            const oldName = productNames.get(oldId) || 'Unknown';
            const dropPct = Math.abs(change * 100).toFixed(0);
            patterns.push({
                id: `cannibal-${newId}-${oldId}`, productId: newId, productName: newName,
                relatedProductId: oldId, relatedProductName: oldName, type: 'CANNIBAL',
                dimensions: { newProduct: newName, affectedProduct: oldName, introDate },
                metrics: { occurrence: after.length, avgSales: avgAfter, baseSales: avgBefore, lift: change, confidence: Math.min(95, after.length * 10), significance: 0 },
                analysis: `🤼 **สงครามเมนู** — ตั้งแต่เปิดตัว **'${newName}'** ยอดของ **'${oldName}'** หดลง **-${dropPct}%** (${avgAfter.toFixed(1)} ชิ้น/วัน จากเดิม ${avgBefore.toFixed(1)} ชิ้น/วัน)`,
                action: `🔄 **ปรับ Portfolio** — พิจารณาลดความถี่การขาย **'${oldName}'** และเน้นดัน **'${newName}'** ที่ลูกค้าชอบมากกว่า หรือจับทำ Combo เพื่อดึงยอดของเก่ากลับมา`
            });
        }
    }

    return patterns.sort((a, b) => a.metrics.lift - b.metrics.lift).slice(0, 5);
};

// ============================================================
// 🌐 WEB WORKER MESSAGE HANDLER
// ============================================================

self.onmessage = async (event: MessageEvent<{ requestId: string } & OracleWorkerRequest>) => {
    const { requestId, type, payload } = event.data;
    try {
        if (type === 'RUN_ORACLE') {
            const { productName, productId, history, allSales, topN } = payload;
            const patterns = await runOracleInternal(productName, productId, history, allSales, topN);
            self.postMessage({ type: 'ORACLE_RESULT', requestId, patterns });
        } else if (type === 'RUN_COMBO') {
            const patterns = runComboInternal(payload.allSales);
            self.postMessage({ type: 'COMBO_RESULT', requestId, patterns });
        } else if (type === 'RUN_CANNIBALISM') {
            const patterns = runCannibalismInternal(payload.allSales);
            self.postMessage({ type: 'CANNIBALISM_RESULT', requestId, patterns });
        }
    } catch (err) {
        self.postMessage({ type: 'ERROR', requestId, message: String(err) });
    }
};
