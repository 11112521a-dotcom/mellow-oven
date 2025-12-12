import { ProductSaleLog } from '@/types';
import { calculateIQR, removeOutliers } from './statisticalUtils';

export interface CleanedSalesData {
    saleDate: string;
    quantitySold: number;
    qtyCleaned: number; // After outlier removal
    wasteQty: number;
    weatherCondition: string;
    pricePerUnit: number;
    costPerUnit: number;
    daysAgo: number;
    isOutlier: boolean;
    isSpecialEvent: boolean;
}

export interface DataCleaningResult {
    cleanedData: CleanedSalesData[];
    stats: {
        totalPoints: number;
        outliersDetected: number;
        outlierRate: number;
        Q1: number;
        Q3: number;
        IQR: number;
        median: number;
    };
}

/**
 * Check if a date is a Payday (25th-30th or 1st-5th)
 */
function isPayday(dateStr: string): boolean {
    const date = new Date(dateStr);
    const day = date.getDate();
    return (day >= 25 && day <= 31) || (day >= 1 && day <= 5);
}

/**
 * STEP 1: Fetch and clean sales data for specific market and product
 * Applies IQR method to detect and handle outliers, but RESPECTS Paydays/Holidays
 */
export async function fetchAndCleanData(
    productSales: ProductSaleLog[],
    marketId: string,
    productId: string,
    variantId?: string,
    holidays: string[] = [], // List of holiday date strings (YYYY-MM-DD)
    maxHistoryDays: number = 180,
    marketName?: string // NEW: Fallback matching by name
): Promise<DataCleaningResult> {
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - maxHistoryDays);

    // Filter by market and product
    // DEBUG: Log what we're looking for vs what's in the data
    const uniqueMarketIds = [...new Set(productSales.map(s => s.marketId))];
    const uniqueMarketNames = [...new Set(productSales.map(s => s.marketName))];
    console.log('[Forecast Debug] Looking for marketId:', marketId, 'marketName:', marketName, 'productId:', productId);
    console.log('[Forecast Debug] Total sales in store:', productSales.length);
    console.log('[Forecast Debug] Unique market IDs in data:', JSON.stringify(uniqueMarketIds));
    console.log('[Forecast Debug] Unique market names in data:', JSON.stringify(uniqueMarketNames));

    // FIX: Match by ID first, fallback to NAME if no ID match
    // SPECIAL: If marketId is empty, include ALL markets (for combined forecasting)
    const filteredSales = productSales.filter(sale => {
        const marketMatch = !marketId || sale.marketId === marketId || (marketName && sale.marketName === marketName);
        const productMatch = sale.productId === productId;
        const variantMatch = variantId ? sale.variantId === variantId : true;
        const dateMatch = new Date(sale.saleDate) >= cutoffDate;
        return marketMatch && productMatch && variantMatch && dateMatch;
    });

    console.log('[Forecast Debug] Filtered sales:', filteredSales.length);

    if (filteredSales.length === 0) {
        throw new Error('No sales data found for this market-product combination');
    }

    // Calculate days ago and identify special events
    const salesWithDaysAgo = filteredSales.map(sale => {
        const saleDate = new Date(sale.saleDate);
        const daysAgo = Math.floor((today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
        const isSpecial = isPayday(sale.saleDate) || holidays.includes(sale.saleDate);

        return {
            saleDate: sale.saleDate,
            quantitySold: sale.quantitySold,
            qtyCleaned: sale.quantitySold, // Will be updated
            wasteQty: 0, // TODO: Add waste tracking
            weatherCondition: 'sunny', // TODO: Add weather data
            pricePerUnit: sale.pricePerUnit,
            costPerUnit: sale.costPerUnit,
            daysAgo,
            isOutlier: false,
            isSpecialEvent: isSpecial
        };
    });

    // Extract quantities for IQR analysis (ONLY from non-special days to establish baseline)
    // If we include special days in IQR calc, they might skew the "normal" range
    const normalQuantities = salesWithDaysAgo
        .filter(s => !s.isSpecialEvent)
        .map(s => s.quantitySold);

    // Fallback: If too few normal days, use all data
    const quantitiesForStats = normalQuantities.length >= 5 ? normalQuantities : salesWithDaysAgo.map(s => s.quantitySold);

    // Calculate IQR and detect outliers based on "Normal" days
    const iqrStats = calculateIQR(quantitiesForStats);

    // Mark outliers and replace with median
    // CRITICAL CHANGE: Do NOT mark as outlier if it is a Special Event
    const cleanedData = salesWithDaysAgo.map((sale) => {
        const isStatisticalOutlier = sale.quantitySold < iqrStats.lowerBound || sale.quantitySold > iqrStats.upperBound;
        const isRealOutlier = isStatisticalOutlier && !sale.isSpecialEvent;

        return {
            ...sale,
            qtyCleaned: isRealOutlier ? iqrStats.median : sale.quantitySold,
            isOutlier: isRealOutlier
        };
    });

    return {
        cleanedData,
        stats: {
            totalPoints: cleanedData.length,
            outliersDetected: cleanedData.filter(d => d.isOutlier).length,
            outlierRate: cleanedData.filter(d => d.isOutlier).length / cleanedData.length,
            Q1: iqrStats.Q1,
            Q3: iqrStats.Q3,
            IQR: iqrStats.IQR,
            median: iqrStats.median
        }
    };
}
