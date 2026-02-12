// 导入 occt-wasm 模块
// 建议：将 occt-wasm.js 和 occt-wasm.d.ts 放在 src/occt/ 目录
// 将 occt-wasm.wasm 放在 public/occt/ 目录
// 这样 JS 文件可以被 Vite 作为模块处理，wasm 文件可以通过绝对路径访问
import MainModuleFactory, { MainModule, TopoDS_Shape } from 'public/occt-wasm.js';
// 尝试从 src 目录导入（推荐方式）

let moduleInstance: any = null;
let loadingPromise: Promise<any> | null = null;

/**
 * 加载 occt-wasm 模块
 */
export async function loadOCCTModule(): Promise<any> {
  if (moduleInstance) {
    console.log('[OCCT] Using cached module instance');
    return moduleInstance;
  }

  if (loadingPromise) {
    console.log('[OCCT] Module is already loading, waiting...');
    return loadingPromise;
  }

  console.log('[OCCT] Starting to load module...');
  loadingPromise = MainModuleFactory({
    locateFile: (filePath: string) => {
      // wasm 文件在 public/occt/ 目录，可以通过绝对路径访问
      if (filePath.endsWith('.wasm')) {
        return `${filePath}`;
      }
      if (filePath.endsWith('.js')) {
        return `${filePath}`;
      }
      return filePath;
    },
  })
    .then((module: any) => {
      console.log('[OCCT] Module loaded successfully', module);
      moduleInstance = module;
      loadingPromise = null;
      window.wasm = module;
      return module;
    })
    .catch((error: any) => {
      console.error('[OCCT] Failed to load module:', error);
      loadingPromise = null;
      throw error;
    });

  return loadingPromise;
}

/**
 * 获取已加载的模块实例
 */
export function getOCCTModule(): MainModule {
  if (!moduleInstance) {
    throw new Error('OCCT module not loaded. Call loadOCCTModule() first.');
  }
  return moduleInstance;
}


declare global {
  interface Window {
    wasm: MainModule;
  }
}
