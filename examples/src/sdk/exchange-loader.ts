import { getOCCTModule } from './occt-loader';

const EXCHANGE_WASM = 'occt-wasm-exchange.wasm';

let exchangeReady = false;
let exchangeLoadingPromise: Promise<void> | null = null;

interface DynamicLibraryModule {
    loadDynamicLibrary: (
        path: string,
        options: { loadAsync: boolean; global: boolean; nodelete: boolean },
    ) => Promise<void>;
}

async function loadExchange(): Promise<void> {
    const module = getOCCTModule() as unknown as DynamicLibraryModule;

    await module.loadDynamicLibrary(EXCHANGE_WASM, {
        loadAsync: true,
        global: true,
        nodelete: true,
    });
    exchangeReady = true;
}

/** 确保 Exchange 侧模块已链接；预取与用户调用共用同一 Promise。 */
export async function ensureExchange(): Promise<void> {
    if (exchangeReady) {
        return;
    }
    if (!exchangeLoadingPromise) {
        exchangeLoadingPromise = loadExchange().catch((error) => {
            exchangeLoadingPromise = null;
            throw error;
        });
    }
    return exchangeLoadingPromise;
}

/** Core 就绪后闲时预取 Exchange；失败静默，用户 async 调用时重试。 */
export function scheduleIdleExchangePrefetch(): void {
    const runPrefetch = () => {
        ensureExchange().catch((error) => {
            console.warn('[OCCT] Idle exchange prefetch failed, will retry on use:', error);
        });
    };

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(runPrefetch);
    } else {
        setTimeout(runPrefetch, 2000);
    }
}
