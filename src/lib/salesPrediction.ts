import { ProductSaleLog } from '../../types';

export interface SalesPredictionInput {
    productSales: ProductSaleLog[];
    targetDate: string; // YYYY-MM-DD
    marketId: string;
}

export interface ProductPrediction {
    productId: string;
    variantId?: string;
    avgSold: number;
    avgWaste: number;
    avgFree: number;
    dataPoints: number;
    confidence: 'high' | 'medium' | 'low';
}

export type PredictionResult = Map<string, ProductPrediction>;

const MAX_HISTORY_WEEKS = 8;

/**
 * Generates a unique key for a product and its optional variant.
 * 
 * @param productId - The unique identifier of the product.
 * @param variantId - The optional unique identifier of the variant.
 * @returns A composite key string.
 */
export function getProductVariantKey(productId: string, variantId?: string): string {
    return `${productId}_${variantId || ''}`;
}

/**
 * Predicts the quantity sold, wasted, and consumed (free) for products in a specific market
 * on a given day of the week, based on historical sales logs.
 * 
 * It filters historical sales logs by the same day of the week (e.g., Saturday) and market.
 * It uses a Recent Weighted Average, where more recent weeks have higher weight.
 * 
 * @param input - The input parameters including productSales history, targetDate, and marketId.
 * @returns A map of product/variant keys to their prediction stats.
 */
export function predictSalesFromHistory(input: SalesPredictionInput): PredictionResult {
    const { productSales, targetDate, marketId } = input;
    const result: PredictionResult = new Map();

    if (!productSales || productSales.length === 0 || !targetDate || !marketId) {
        return result;
    }

    // 1. Get the target day of the week (0 = Sunday, 6 = Saturday)
    const targetDayOfWeek = new Date(targetDate).getDay();

    // 2. Filter historical data:
    // - Same market
    // - Same day of the week
    // - Exclude the target date itself (to prevent circular/duplicate data)
    const relevantSales = productSales.filter(sale => {
        if (sale.marketId !== marketId) return false;
        if (sale.saleDate === targetDate) return false;
        
        const saleDayOfWeek = new Date(sale.saleDate).getDay();
        return saleDayOfWeek === targetDayOfWeek;
    });

    if (relevantSales.length === 0) {
        return result;
    }

    // 3. Find unique historical dates and sort descending (most recent first)
    const uniqueDates = Array.from(new Set(relevantSales.map(s => s.saleDate)))
        .sort((a, b) => b.localeCompare(a))
        .slice(0, MAX_HISTORY_WEEKS);

    if (uniqueDates.length === 0) {
        return result;
    }

    const numWeeks = uniqueDates.length;

    // Map each date to its weight: index 0 (most recent) gets weight = numWeeks, index numWeeks-1 (oldest) gets weight = 1
    const dateWeights = new Map<string, number>();
    uniqueDates.forEach((date, index) => {
        dateWeights.set(date, numWeeks - index);
    });

    // 4. Group sales by product + variant
    // We only group the sales that occurred on the top N unique dates
    const groupedSales = new Map<string, ProductSaleLog[]>();
    
    relevantSales.forEach(sale => {
        if (dateWeights.has(sale.saleDate)) {
            const key = getProductVariantKey(sale.productId, sale.variantId);
            if (!groupedSales.has(key)) {
                groupedSales.set(key, []);
            }
            groupedSales.get(key)!.push(sale);
        }
    });

    // 5. Calculate weighted average for each product + variant
    groupedSales.forEach((sales, key) => {
        let weightSum = 0;
        let weightedSold = 0;
        let weightedWaste = 0;
        let weightedFree = 0;
        const loggedDates = new Set<string>();

        sales.forEach(sale => {
            const weight = dateWeights.get(sale.saleDate) || 0;
            if (weight > 0) {
                weightSum += weight;
                weightedSold += (sale.quantitySold || 0) * weight;
                weightedWaste += (sale.wasteQty || 0) * weight;
                
                const freeQty = (sale.eatQty || 0) + (sale.giveawayQty || 0);
                weightedFree += freeQty * weight;
                
                loggedDates.add(sale.saleDate);
            }
        });

        if (weightSum > 0) {
            const dataPoints = loggedDates.size;
            let confidence: 'high' | 'medium' | 'low' = 'low';
            if (dataPoints >= 4) {
                confidence = 'high';
            } else if (dataPoints >= 2) {
                confidence = 'medium';
            }

            // Extract productId and variantId from the key
            const firstSale = sales[0];
            
            result.set(key, {
                productId: firstSale.productId,
                variantId: firstSale.variantId,
                avgSold: weightedSold / weightSum,
                avgWaste: weightedWaste / weightSum,
                avgFree: weightedFree / weightSum,
                dataPoints,
                confidence
            });
        }
    });

    return result;
}
