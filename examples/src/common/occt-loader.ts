// 导入 occt-wasm 模块
// 建议：将 occt-wasm.js 和 occt-wasm.d.ts 放在 src/occt/ 目录
// 将 occt-wasm.wasm 放在 public/occt/ 目录
// 这样 JS 文件可以被 Vite 作为模块处理，wasm 文件可以通过绝对路径访问
import MainModuleFactory, { MainModule, TopoDS_Shape } from '../../public/occt-wasm.js';
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

/**
 * 网格化形状
 */
export async function meshShape(shape: TopoDS_Shape, lineDeflection: number = 0.1, angularDeflection: number = 0.5): Promise<{
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  uvs: Float32Array;
}> {
  try {
    console.log('[OCCT] ========== meshShape START ==========');
    console.log('[OCCT] Step 1: Starting meshShape, deflection:', lineDeflection);
    
    // ========== 注释大法：如果卡在这里，说明 getOCCTModule 有问题 ==========
    const module = getOCCTModule();
    
    // ========== 注释大法：如果卡在这里，说明模块结构有问题 ==========
    if (!module.Mesher) {
      throw new Error('Mesher is not available in module');
    }
    
    if (!module.Mesher.meshShape) {
      throw new Error('Mesher.meshShape is not available');
    }
    
    // ========== 注释大法：如果卡在这里，说明 C++ 函数调用阻塞了 ==========
    console.log('[OCCT] Step 7: About to call Mesher.meshShape (this may take a while)...');
    console.log('[OCCT] Step 7.1: Creating Promise wrapper...');
    const meshResult = await Promise.resolve().then(() => {
      console.log('[OCCT] Step 7.2: Inside Promise.then, calling C++ function...');
      const result = module.Mesher.meshShape(shape, lineDeflection, angularDeflection);
      console.log('[OCCT] Step 7.3: C++ function returned');
      return result;
    });
    console.log('[OCCT] Step 8: meshShape completed, result:', meshResult);

    if (!meshResult) {
      throw new Error('meshShape returned null or undefined');
    }

    // ========== 注释大法：如果卡在这里，说明数据提取有问题 ==========
    console.log('[OCCT] Step 10: Extracting mesh data...');
    const positions = meshResult.positions || new Float32Array(0);
    
    const indices = meshResult.indices || new Uint32Array(0);
    
    const normals = meshResult.normals || new Float32Array(0);
    
    const uvs = meshResult.uvs || new Float32Array(0);

    console.log('[OCCT] ========== meshShape COMPLETE ==========');

    return { positions, indices, normals, uvs };
  } catch (error) {
    console.error('[OCCT] ========== meshShape ERROR ==========');
    console.error('[OCCT] Error in meshShape:', error);
    throw error;
  }
}

