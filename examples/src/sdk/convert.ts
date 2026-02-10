import type { TopoDS_Shape } from 'public/occt-wasm';
import { getOCCTModule } from './occt-loader';

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
        console.log('[OCCT] Step 1: Starting meshShape, deflection:', lineDeflection, angularDeflection);

        const module = getOCCTModule();


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
