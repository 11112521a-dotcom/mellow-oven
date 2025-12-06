/**
 * Batch Production Calculator
 * Handles "Carry-Over Stock" logic with Batch Size Constraints
 */

export interface BatchCalculationInput {
    currentStock: number;   // Leftover items from yesterday
    dailyTarget: number;    // Goal for today
    batchSize: number;      // Production capacity per run (e.g., 36)
}

export interface BatchCalculationResult {
    batchesToBake: number;      // How many times to run the oven
    producedQty: number;        // Quantity from new production
    totalAvailable: number;     // Grand total (Old + New)
    shortfall: number;          // How much we were short before production
    surplus: number;            // How much extra after production
    status: 'Production Needed' | 'Stock Sufficient';
}

/**
 * Calculate daily production based on carry-over stock and batch constraints.
 * Uses Math.ceil to ensure we NEVER fall short of the target.
 * 
 * @example
 * // Normal case: Stock 47, Target 144, Batch 36
 * calculateDailyProduction({ currentStock: 47, dailyTarget: 144, batchSize: 36 })
 * // Returns: { batchesToBake: 3, producedQty: 108, totalAvailable: 155, ... }
 */
export function calculateDailyProduction(input: BatchCalculationInput): BatchCalculationResult {
    const { currentStock, dailyTarget, batchSize } = input;

    // Edge case: Validate inputs
    if (batchSize <= 0) {
        throw new Error('Batch size must be greater than 0');
    }

    // Step 1: Calculate shortfall (how much we need)
    const shortfall = dailyTarget - currentStock;

    // Step 2: Determine if production is needed
    if (shortfall <= 0) {
        // Stock is sufficient, no production needed
        return {
            batchesToBake: 0,
            producedQty: 0,
            totalAvailable: currentStock,
            shortfall: 0,
            surplus: currentStock - dailyTarget,
            status: 'Stock Sufficient'
        };
    }

    // Step 3: Calculate batches needed using CEILING (always round up)
    // This ensures we NEVER fall short of the target
    const batchesToBake = Math.ceil(shortfall / batchSize);

    // Step 4: Calculate produced quantity
    const producedQty = batchesToBake * batchSize;

    // Step 5: Calculate final totals
    const totalAvailable = currentStock + producedQty;
    const surplus = totalAvailable - dailyTarget;

    return {
        batchesToBake,
        producedQty,
        totalAvailable,
        shortfall,
        surplus,
        status: 'Production Needed'
    };
}

/**
 * Run test cases to verify the algorithm
 * Call this function in browser console to validate
 */
export function runBatchCalculatorTests(): void {
    const testCases = [
        { name: 'Normal Case', input: { currentStock: 47, dailyTarget: 144, batchSize: 36 }, expected: { batches: 3, total: 155 } },
        { name: 'Zero Stock', input: { currentStock: 0, dailyTarget: 144, batchSize: 36 }, expected: { batches: 4, total: 144 } },
        { name: 'Stock Overflow', input: { currentStock: 150, dailyTarget: 144, batchSize: 36 }, expected: { batches: 0, total: 150 } },
        { name: 'Perfect Match', input: { currentStock: 144, dailyTarget: 144, batchSize: 36 }, expected: { batches: 0, total: 144 } },
        { name: 'Small Shortfall', input: { currentStock: 140, dailyTarget: 144, batchSize: 36 }, expected: { batches: 1, total: 176 } },
    ];

    console.log('🧪 Running Batch Calculator Tests...\n');

    testCases.forEach((tc, i) => {
        const result = calculateDailyProduction(tc.input);
        const pass = result.batchesToBake === tc.expected.batches && result.totalAvailable === tc.expected.total;
        console.log(
            `${pass ? '✅' : '❌'} Test ${i + 1}: ${tc.name}`,
            `\n   Input: Stock=${tc.input.currentStock}, Target=${tc.input.dailyTarget}, Batch=${tc.input.batchSize}`,
            `\n   Result: Batches=${result.batchesToBake}, Total=${result.totalAvailable}`,
            `\n   Expected: Batches=${tc.expected.batches}, Total=${tc.expected.total}\n`
        );
    });
}

// ============================================================
// Algorithm 2: Stock Transfer (Home -> Shop)
// ============================================================

export interface StockTransferInput {
    totalAvailableStock: number;  // From Algorithm 1 (calculateDailyProduction)
    shopCapacity: number;         // Max items the shop can hold
}

export interface StockTransferResult {
    transferQty: number;    // Items sent to shop
    keepAtHome: number;     // Items remaining at home (carry-over to next day)
    shopFull: boolean;      // Is shop at capacity?
}

/**
 * Calculate stock transfer from Home (production) to Shop (sales).
 * Limited by shop capacity. Leftovers stay at home for next day.
 * 
 * @example
 * calculateStockTransfer({ totalAvailableStock: 155, shopCapacity: 100 })
 * // Returns: { transferQty: 100, keepAtHome: 55, shopFull: true }
 */
export function calculateStockTransfer(input: StockTransferInput): StockTransferResult {
    const { totalAvailableStock, shopCapacity } = input;

    // Edge case: Validate inputs
    if (shopCapacity < 0) {
        throw new Error('Shop capacity cannot be negative');
    }

    // Core logic: Transfer up to capacity, keep the rest
    const transferQty = Math.min(totalAvailableStock, shopCapacity);
    const keepAtHome = totalAvailableStock - transferQty;

    return {
        transferQty,
        keepAtHome,
        shopFull: transferQty >= shopCapacity
    };
}

/**
 * Run test cases for Stock Transfer algorithm
 */
export function runStockTransferTests(): void {
    const testCases = [
        { name: 'Over Capacity', input: { totalAvailableStock: 155, shopCapacity: 100 }, expected: { transfer: 100, keep: 55 } },
        { name: 'Under Capacity', input: { totalAvailableStock: 50, shopCapacity: 100 }, expected: { transfer: 50, keep: 0 } },
        { name: 'Exact Match', input: { totalAvailableStock: 100, shopCapacity: 100 }, expected: { transfer: 100, keep: 0 } },
    ];

    console.log('🚚 Running Stock Transfer Tests...\n');

    testCases.forEach((tc, i) => {
        const result = calculateStockTransfer(tc.input);
        const pass = result.transferQty === tc.expected.transfer && result.keepAtHome === tc.expected.keep;
        console.log(
            `${pass ? '✅' : '❌'} Test ${i + 1}: ${tc.name}`,
            `\n   Input: Stock=${tc.input.totalAvailableStock}, Capacity=${tc.input.shopCapacity}`,
            `\n   Result: Transfer=${result.transferQty}, Keep=${result.keepAtHome}`,
            `\n   Expected: Transfer=${tc.expected.transfer}, Keep=${tc.expected.keep}\n`
        );
    });
}

/**
 * Run ALL tests (Batch + Transfer)
 */
export function runAllProductionTests(): void {
    runBatchCalculatorTests();
    console.log('\n---\n');
    runStockTransferTests();
}
