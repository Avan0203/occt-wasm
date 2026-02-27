import * as THREE from 'three';
import { Pass } from 'three/addons/postprocessing/Pass.js';

class HelperRenderPass extends Pass {
    constructor(
        private helperScene: THREE.Scene,
        private camera: THREE.Camera
    ) {
        super();
        this.clear = false;
        this.needsSwap = false;
    }

    render(
        renderer: THREE.WebGLRenderer,
        _writeBuffer: THREE.WebGLRenderTarget,
        readBuffer: THREE.WebGLRenderTarget
    ): void {
        renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
        renderer.render(this.helperScene, this.camera);
    }
}


export { HelperRenderPass };