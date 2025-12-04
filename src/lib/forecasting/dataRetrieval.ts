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
 * STEP 1: Fetch and clean sales data for specific market and product
 * Applies IQR method to detect and handle outliers
 */
export async function fetchAndCleanData(
    productSales: ProductSaleLog[],
    marketId: string,
    productId: string,
    variantId?: string,
    maxHistoryDays: number = 180
): Promise<DataCleaningResult> {
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - maxHistoryDays);

    // Filter by market and product
    const filteredSales = productSales.filter(sale =>
        sale.marketId === marketId &&
        sale.productId === productId &&
        (variantId ? sale.variantId === variantId : true) &&
        new Date(sale.saleDate) >= cutoffDate
    );

    if (filteredSales.length === 0) {
        throw new Error('No sales data found for this market-product combination');
    }

    // Calculate days ago for each sale
    const salesWithDaysAgo = filteredSales.map(sale => {
        const saleDate = new Date(sale.saleDate);
        const daysAgo = Math.floor((today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
            saleDate: sale.saleDate,
            quantitySold: sale.quantitySold,
            qtyCleaned: sale.quantitySold, // Will be updated
            wasteQty: 0, // TODO: Add waste tracking
            weatherCondition: 'sunny', // TODO: Add weather data
            pricePerUnit: sale.pricePerUnit,
            costPerUnit: sale.costPerUnit,
            daysAgo,
            isOutlier: false
        };
    });

    // Extract quantities for IQR analysis
    const quantities = salesWithDaysAgo.map(s => s.quantitySold);

    // Calculate IQR and detect outliers
    const iqrStats = calculateIQR(quantities);
    const outlierResult = removeOutliers(quantities);

    // Mark outliers and replace with median
    const cleanedData = salesWithDaysAgo.map((sale, index) => {
        const isOutlier = outlierResult.outliers.includes(quantities[index]);

        return {
            ...sale,
            qtyCleaned: isOutlier ? iqrStats.median : sale.quantitySold,
            isOutlier
        };
    });

    return {
        cleanedData,
        stats: {
            totalPoints: cleanedData.length,
            outliersDetected: outlierResult.outliers.length,
            outlierRate: outlierResult.outliers.length / cleanedData.length,
            Q1: iqrStats.Q1,
            Q3: iqrStats.Q3,
            IQR: iqrStats.IQR,
            median: iqrStats.median
        }
    };
}
