import MainModuleFactory from 'public/occt-wasm-core.js';
import type { MainModule } from 'public/occt-wasm';
import { scheduleIdleExchangePrefetch } from './exchange-loader';

let moduleInstance: MainModule | null = null;
let loadingPromise: Promise<MainModule> | null = null;

/**
 * 加载 occt-wasm-core 模块（MAIN_MODULE）
 */
export async function loadOCCTModule(): Promise<MainModule> {
    if (moduleInstance) {
        return moduleInstance;
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = MainModuleFactory({
        locateFile: (filePath: string) => filePath,
    })
        .then((module: MainModule) => {
            moduleInstance = module;
            loadingPromise = null;
            window.wasm = module;
            scheduleIdleExchangePrefetch();
            return module;
        })
        .catch((error: unknown) => {
            loadingPromise = null;
            throw error;
        });

    return loadingPromise;
}

/**
 * 获取已加载的 Core 模块实例
 */
export function getOCCTModule(): MainModule {
    if (!moduleInstance) {
        throw new Error('OCCT module not loaded. Call loadOCCTModule() first.');
    }
    return moduleInstance;
}
