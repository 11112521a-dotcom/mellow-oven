// =============================================================================
// 🚀 PRODUCTION FORECASTER — WORKER PROXY
// =============================================================================

class ForecasterEngine {
    private worker: Worker | null = null;
    private callbacks: Map<string, { resolve: (val: any) => void, reject: (err: any) => void }> = new Map();

    private ensureWorker() {
        if (!this.worker) {
            this.worker = new Worker(new URL('./forecaster.worker.ts', import.meta.url), { type: 'module' });

            this.worker.onmessage = (e) => {
                const { requestId, type, forecasts, message } = e.data;
                const callback = this.callbacks.get(requestId);

                if (!callback) return;

                if (type === 'ERROR') {
                    callback.reject(new Error(message || 'Worker Error'));
                } else if (type === 'FORECASTS_RESULT') {
                    callback.resolve(forecasts);
                }
                this.callbacks.delete(requestId);
            };

            this.worker.onerror = (err) => {
                console.error('[Forecaster Worker Error]', err);
            };
        }
        return this.worker;
    }

    public async calculateBatchForecasts(inputs: any[], smartMode: boolean): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const worker = this.ensureWorker();
            const requestId = crypto.randomUUID();

            this.callbacks.set(requestId, { resolve, reject });

            // Set a timeout to prevent hanging UI
            const timeoutId = setTimeout(() => {
                if (this.callbacks.has(requestId)) {
                    this.callbacks.delete(requestId);
                    reject(new Error('Forecaster Worker Timeout (> 15s)'));
                }
            }, 15000);

            try {
                // Ensure inputs are cleanly serializable object literal to prevent DataCloneError
                const cleanInputs = JSON.parse(JSON.stringify(inputs));

                worker.postMessage({
                    type: 'RUN_FORECASTS',
                    requestId,
                    payload: { inputs: cleanInputs, smartMode }
                });
            } catch (err) {
                clearTimeout(timeoutId);
                this.callbacks.delete(requestId);
                reject(err);
            }
        });
    }

    public terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}

export const forecasterEngine = new ForecasterEngine();
