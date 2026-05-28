// =============================================================================
// 🔮 ORACLE ENGINE — PROXY LAYER v2.0
// =============================================================================
// This file is the PUBLIC API for the Oracle Core.
// It spawns a Web Worker and routes all heavy computation there,
// keeping the main UI thread completely free.
// =============================================================================

import { ProductSaleLog } from '@/types';

// Re-export types for consumers (no change to import paths)
export type { OraclePattern } from './oracle.worker';

type PendingRequest = {
    resolve: (patterns: import('./oracle.worker').OraclePattern[]) => void;
    reject: (err: Error) => void;
};

// ─── Singleton Worker (created once, reused) ─────────────────────────────────
let _worker: Worker | null = null;
const _pending = new Map<string, PendingRequest>();

function getWorker(): Worker {
    if (!_worker) {
        // Vite's `?worker` import pattern — resolved at build time
        _worker = new Worker(new URL('./oracle.worker.ts', import.meta.url), { type: 'module' });

        _worker.onmessage = (event: MessageEvent) => {
            const { type, requestId, patterns, message } = event.data;
            const pending = _pending.get(requestId);
            if (!pending) return;
            _pending.delete(requestId);
            if (type === 'ERROR') {
                pending.reject(new Error(message));
            } else {
                pending.resolve(patterns ?? []);
            }
        };

        _worker.onerror = (err) => {
            console.error('[Oracle Worker] Uncaught error:', err);
            // Reject all pending requests
            _pending.forEach(p => p.reject(new Error(err.message)));
            _pending.clear();
            _worker = null; // Reset so next call recreates it
        };
    }
    return _worker;
}

function sendToWorker<T extends import('./oracle.worker').OraclePattern[]>(
    type: string,
    payload: object
): Promise<T> {
    return new Promise((resolve, reject) => {
        const requestId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        _pending.set(requestId, { resolve: resolve as (p: import('./oracle.worker').OraclePattern[]) => void, reject });
        getWorker().postMessage({ requestId, type, payload });

        // Safety timeout (10s) — prevents hanging promises
        setTimeout(() => {
            if (_pending.has(requestId)) {
                _pending.delete(requestId);
                reject(new Error(`[Oracle] Request ${requestId} timed out`));
            }
        }, 10_000);
    });
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

/**
 * Run Oracle pattern mining for a single product.
 * Computation runs in a background Web Worker — UI never freezes.
 */
export async function runOracle(
    productName: string,
    productId: string,
    history: ProductSaleLog[],
    allSales: ProductSaleLog[],
    topN = 5
): Promise<import('./oracle.worker').OraclePattern[]> {
    return sendToWorker('RUN_ORACLE', { productName, productId, history, allSales, topN });
}

/**
 * Run Combo (correlation) analysis across all products.
 */
export async function runComboAnalysis(
    allSales: ProductSaleLog[]
): Promise<import('./oracle.worker').OraclePattern[]> {
    return sendToWorker('RUN_COMBO', { allSales });
}

/**
 * Run Cannibalism detection — finds new products eating into older ones.
 */
export async function runCannibalismCheck(
    allSales: ProductSaleLog[]
): Promise<import('./oracle.worker').OraclePattern[]> {
    return sendToWorker('RUN_CANNIBALISM', { allSales });
}

/**
 * Terminate the worker (call on app cleanup / page unmount if needed).
 */
export function terminateOracleWorker(): void {
    if (_worker) {
        _worker.terminate();
        _worker = null;
        _pending.clear();
    }
}
