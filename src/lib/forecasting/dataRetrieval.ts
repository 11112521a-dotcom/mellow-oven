import { ProductSaleLog } from '@/types';
import { calculateIQR, removeOutliers } from './statisticalUtils';

export interface CleanedSalesData {
    saleDate: string;
    dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
    quantitySold: number;
    qtyCleaned: number; // After outlier removal
    wasteQty: number;
    weatherCondition: string;
    pricePerUnit: number;
    costPerUnit: number;
    daysAgo: number;
    isOutlier: boolean;
    isSpecialEvent: boolean;
    isSameDayOfWeek: boolean; // NEW: Is this the same weekday as target?
}

export interface DataCleaningResult {
    cleanedData: CleanedSalesData[];
    sameDayData: CleanedSalesData[]; // NEW: Only same day-of-week
    stats: {
        totalPoints: number;
        sameDayPoints: number; // NEW: How many same-weekday data points
        outliersDetected: number;
        outlierRate: number;
        Q1: number;
        Q3: number;
        IQR: number;
        median: number;
        averageSales: number; // NEW: Simple average
        sameDayAverage: number; // NEW: Same weekday average
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
 * Get day of week from date string (0=Sunday, 6=Saturday)
 */
function getDayOfWeek(dateStr: string): number {
    return new Date(dateStr).getDay();
}

/**
 * STEP 1: Fetch and clean sales data for specific market and product
 * NEW: Supports day-of-week filtering and works with minimum 1 data point
 */
export async function fetchAndCleanData(
    productSales: ProductSaleLog[],
    marketId: string,
    productId: string,
    variantId?: string,
    holidays: string[] = [],
    maxHistoryDays: number = 180,
    marketName?: string,
    targetDate?: string // NEW: The date we're forecasting for (to match day-of-week)
): Promise<DataCleaningResult> {
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - maxHistoryDays);

    // Determine target day of week
    const targetDayOfWeek = targetDate ? getDayOfWeek(targetDate) : today.getDay();

    // Filter by market and product
    const filteredSales = productSales.filter(sale => {
        const marketMatch = !marketId || sale.marketId === marketId || (marketName && sale.marketName === marketName);
        const productMatch = sale.productId === productId;
        const variantMatch = variantId ? sale.variantId === variantId : !sale.variantId;
        const dateMatch = new Date(sale.saleDate) >= cutoffDate;
        return marketMatch && productMatch && variantMatch && dateMatch;
    });

    // NEW: If no exact match for this product, return empty result instead of throwing
    if (filteredSales.length === 0) {
        return {
            cleanedData: [],
            sameDayData: [],
            stats: {
                totalPoints: 0,
                sameDayPoints: 0,
                outliersDetected: 0,
                outlierRate: 0,
                Q1: 0,
                Q3: 0,
                IQR: 0,
                median: 0,
                averageSales: 0,
                sameDayAverage: 0
            }
        };
    }

    // Calculate days ago and identify special events + day of week
    const salesWithDaysAgo = filteredSales.map(sale => {
        const saleDate = new Date(sale.saleDate);
        const daysAgo = Math.floor((today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
        const isSpecial = isPayday(sale.saleDate) || holidays.includes(sale.saleDate);
        const dayOfWeek = getDayOfWeek(sale.saleDate);
        const isSameDayOfWeek = dayOfWeek === targetDayOfWeek;

        return {
            saleDate: sale.saleDate,
            dayOfWeek,
            quantitySold: sale.quantitySold,
            qtyCleaned: sale.quantitySold,
            wasteQty: sale.wasteQty || 0,
            weatherCondition: sale.weatherCondition || 'unknown',
            pricePerUnit: sale.pricePerUnit,
            costPerUnit: sale.costPerUnit,
            daysAgo,
            isOutlier: false,
            isSpecialEvent: isSpecial,
            isSameDayOfWeek
        };
    });

    // Extract quantities for IQR analysis (ONLY from non-special days)
    const normalQuantities = salesWithDaysAgo
        .filter(s => !s.isSpecialEvent)
        .map(s => s.quantitySold);

    // Fallback: If too few normal days, use all data
    const quantitiesForStats = normalQuantities.length >= 3 ? normalQuantities : salesWithDaysAgo.map(s => s.quantitySold);

    // Calculate IQR (handle edge case of too few data points)
    const iqrStats = quantitiesForStats.length >= 3
        ? calculateIQR(quantitiesForStats)
        : { Q1: 0, Q3: quantitiesForStats[0] || 0, IQR: 0, median: quantitiesForStats[0] || 0, lowerBound: 0, upperBound: Infinity };

    // Mark outliers and replace with median
    const cleanedData = salesWithDaysAgo.map((sale) => {
        const isStatisticalOutlier = quantitiesForStats.length >= 3 &&
            (sale.quantitySold < iqrStats.lowerBound || sale.quantitySold > iqrStats.upperBound);
        const isRealOutlier = isStatisticalOutlier && !sale.isSpecialEvent;

        return {
            ...sale,
            qtyCleaned: isRealOutlier ? iqrStats.median : sale.quantitySold,
            isOutlier: isRealOutlier
        };
    });

    // NEW: Filter to same day-of-week only
    const sameDayData = cleanedData.filter(d => d.isSameDayOfWeek);

    // Calculate averages
    const averageSales = cleanedData.length > 0
        ? cleanedData.reduce((sum, d) => sum + d.qtyCleaned, 0) / cleanedData.length
        : 0;
    const sameDayAverage = sameDayData.length > 0
        ? sameDayData.reduce((sum, d) => sum + d.qtyCleaned, 0) / sameDayData.length
        : averageSales; // Fallback to overall average if no same-day data

    return {
        cleanedData,
        sameDayData,
        stats: {
            totalPoints: cleanedData.length,
            sameDayPoints: sameDayData.length,
            outliersDetected: cleanedData.filter(d => d.isOutlier).length,
            outlierRate: cleanedData.length > 0 ? cleanedData.filter(d => d.isOutlier).length / cleanedData.length : 0,
            Q1: iqrStats.Q1,
            Q3: iqrStats.Q3,
            IQR: iqrStats.IQR,
            median: iqrStats.median,
            averageSales,
            sameDayAverage
        }
    };
}

