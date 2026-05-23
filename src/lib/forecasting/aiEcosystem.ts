import { ProductSaleLog, Product } from '@/types';
import { runOracle, runCannibalismCheck, runComboAnalysis } from '../oracle/oracleEngine';
import { runTitanAnalytics } from '../analytics/titanEngine';
import { calculateSmartForecast, SmartForecastInput, SmartForecastOutput } from './smartForecaster';

/**
 * 📊 Calculates DPM metrics (waste rate & stockout rate) for a variant over the last 7 active days.
 */
export function calculateDPMMetrics(
    sales: ProductSaleLog[],
    productId: string,
    variantId?: string,
    lookbackDays: number = 7
): { wasteRate: number; stockoutRate: number } {
    const sortedSales = sales
        .filter(s =>
            s.productId === productId &&
            (variantId ? s.variantId === variantId : !s.variantId)
        )
        .sort((a, b) => b.saleDate.localeCompare(a.saleDate)) // Newest first
        .slice(0, lookbackDays);

    if (sortedSales.length === 0) return { wasteRate: 0, stockoutRate: 0 };

    let totalProduced = 0;
    let totalWasted = 0;
    let stockoutDays = 0;

    sortedSales.forEach(s => {
        const produced = s.quantitySold + (s.wasteQty || 0);
        totalProduced += produced;
        totalWasted += s.wasteQty || 0;
        
        // Stockout heuristic: everything produced is sold out, and total quantity is decent
        if ((s.wasteQty || 0) === 0 && s.quantitySold > 0) {
            stockoutDays++;
        }
    });

    const wasteRate = totalProduced > 0 ? totalWasted / totalProduced : 0;
    const stockoutRate = sortedSales.length > 0 ? stockoutDays / sortedSales.length : 0;

    return { wasteRate, stockoutRate };
}

/**
 * 🦅 AI prediction ecosystem orchestrator:
 * Interconnects Smart Forecasting, Oracle, and Titan engines to dynamically adjust predictions
 * and maximize retail profitability based on real business conditions.
 */
export async function calculateEcosystemForecast(
    input: SmartForecastInput
): Promise<SmartForecastOutput> {
    const { product, productId, variantId, marketId, productSales } = input;

    // 1. Calculate DPM metrics from history
    const dpm = calculateDPMMetrics(productSales, productId, variantId, 7);

    // 2. Call the smart forecaster with DPM metrics passed inside the custom fields
    const enrichedInput = {
        ...input,
        wasteRate: dpm.wasteRate,
        stockoutRate: dpm.stockoutRate
    };

    const forecast = await calculateSmartForecast(enrichedInput as any);

    // 3. Apply Ecosystem-level adjustments (Oracle & Titan integration)
    let ecosystemQty = forecast.optimalQuantity;
    const ecosystemAdjustments: Array<{ source: string; delta: number; confidence: number }> = [];

    try {
        const targetId = variantId || productId;

        // A. Cannibalism Discount (Oracle)
        const cannibalPatterns = await runCannibalismCheck(productSales);
        const affectedPattern = cannibalPatterns.find(p => p.relatedProductId === targetId);
        if (affectedPattern) {
            const dropFactor = Math.abs(affectedPattern.metrics.lift); // e.g. 0.25 drop
            const discount = Math.round(ecosystemQty * dropFactor * 0.5); // Apply 50% of the estimated cannibalism impact to be safe
            if (discount > 0) {
                ecosystemQty -= discount;
                ecosystemAdjustments.push({
                    source: `AI Ecosystem: Cannibalism Impact (${affectedPattern.productName}) 🥊`,
                    delta: -discount,
                    confidence: affectedPattern.metrics.confidence
                });
            }
        }

        // B. Combo Synergy Boost (Oracle)
        const comboPatterns = await runComboAnalysis(productSales);
        const activeCombo = comboPatterns.find(p => p.productId === targetId && p.type === 'POWER_COUPLE');
        if (activeCombo) {
            const liftFactor = activeCombo.metrics.lift; // Pearson correlation e.g. 0.65
            const boost = Math.round(ecosystemQty * liftFactor * 0.2); // Apply 20% of correlation strength as sales boost
            if (boost > 0) {
                ecosystemQty += boost;
                ecosystemAdjustments.push({
                    source: `AI Ecosystem: Combo Synergy (${activeCombo.relatedProductName}) 💞`,
                    delta: boost,
                    confidence: activeCombo.metrics.confidence
                });
            }
        }

        // C. Titan Analytics Trend / Sensitivity Adjustments
        const titanInsights = runTitanAnalytics(productSales, [product]);
        const productInsights = titanInsights.filter(i => i.targetProductId === targetId);

        productInsights.forEach(insight => {
            if (insight.type === 'TREND_ALERT' && insight.severity === 'CRITICAL' && insight.metricValue < 0) {
                const discount = Math.round(ecosystemQty * 0.1); // -10% safety cap
                if (discount > 0) {
                    ecosystemQty -= discount;
                    ecosystemAdjustments.push({
                        source: `AI Ecosystem: Dying Star Trend Alert 📉`,
                        delta: -discount,
                        confidence: 90
                    });
                }
            } else if (insight.type === 'TREND_ALERT' && insight.title.includes('Rising') && insight.metricValue > 0) {
                const boost = Math.round(ecosystemQty * 0.1); // +10% boost
                if (boost > 0) {
                    ecosystemQty += boost;
                    ecosystemAdjustments.push({
                        source: `AI Ecosystem: Rising Star Trend Boost 🚀`,
                        delta: boost,
                        confidence: 80
                    });
                }
            }
        });

    } catch (err) {
        console.error('[AIEcosystem] Error running patterns checks:', err);
    }

    // Ensure forecast quantities are clean and reasonable
    ecosystemQty = Math.max(0, ecosystemQty);

    if (ecosystemAdjustments.length > 0) {
        forecast.optimalQuantity = ecosystemQty;
        forecast.smartAdjustedQuantity = ecosystemQty;
        forecast.explanation.push(
            ...ecosystemAdjustments.map(a => `${a.source}: ${a.delta >= 0 ? '+' : ''}${a.delta.toFixed(0)} ชิ้น`)
        );
        forecast.patternAdjustments.push(...ecosystemAdjustments);
    }

    return forecast;
}
