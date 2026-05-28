// =============================================================================
// 🚀 PRODUCTION FORECASTER — BACKGROUND WORKER
// =============================================================================

import { calculateEcosystemForecast } from './aiEcosystem';
import { calculateOptimalProduction } from './index';

export type ForecasterWorkerRequest = {
    type: 'RUN_FORECASTS';
    payload: {
        inputs: any[];
        smartMode: boolean;
    };
};

export type ForecasterWorkerResponse = {
    type: 'FORECASTS_RESULT' | 'ERROR';
    requestId: string;
    forecasts?: any[];
    message?: string;
};

self.onmessage = async (event: MessageEvent<{ requestId: string } & ForecasterWorkerRequest>) => {
    const { requestId, type, payload } = event.data;

    try {
        if (type === 'RUN_FORECASTS') {
            const forecasts = [];
            for (const input of payload.inputs) {
                try {
                    let forecast;
                    if (payload.smartMode) {
                        forecast = await calculateEcosystemForecast(input);
                    } else {
                        forecast = await calculateOptimalProduction(input);
                    }
                    forecasts.push({
                        productId: input.variantId || input.productId,
                        productName: input.product?.name + (input.variantId ? ` - ${input.product?.variants?.find((v:any) => v.id === input.variantId)?.name}` : ''),
                        forecast
                    });
                } catch (error) {
                    console.error(`Failed to forecast ${input.productId}:`, error);
                    forecasts.push({
                        productId: input.variantId || input.productId,
                        productName: input.product?.name,
                        forecast: {},
                        error: String(error)
                    });
                }
            }

            self.postMessage({
                type: 'FORECASTS_RESULT',
                requestId,
                forecasts
            });
        }
    } catch (err) {
        self.postMessage({ type: 'ERROR', requestId, message: String(err) });
    }
};
