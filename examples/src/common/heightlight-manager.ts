import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import * as THREE from 'three';
import { createPointMaterial, createLineMaterial } from './shape-converter';
import { BrepNodeType } from "./types";
import { ThreeRenderer } from "./three-renderer";
import { BrepNodes } from "./object";
import { App } from "./app";

const faceColor = '#e6a23c';
const lineColor = '#ffce00';
const pointColor = '#eece00';


function createHeightlightMaterial(type: BrepNodeType) {
    let material: THREE.Material | LineMaterial;
    switch (type) {
        case BrepNodeType.FACE:
            material = new THREE.MeshBasicMaterial({ color: faceColor, depthTest: false, polygonOffset: true, polygonOffsetUnits: 1, polygonOffsetFactor: 1, transparent: true });
            break;
        case BrepNodeType.POINT:
            material = createPointMaterial(pointColor);
            material.transparent = true;
            break;
        case BrepNodeType.EDGE:
            material = createLineMaterial(lineColor);
            material.transparent = true;
            break;
    }
    material.depthTest = false;
    return material;
}

class HeightlightManager {
    private heightLightFaceMaterial = createHeightlightMaterial(BrepNodeType.FACE);
    private heightLightPointMaterial = createHeightlightMaterial(BrepNodeType.POINT);
    private heightLightEdgeMaterial = createHeightlightMaterial(BrepNodeType.EDGE);

    private lastHighlightedObjects = new Set<BrepNodes>();
    private currentHighlightedObjects = new Set<BrepNodes>();
    private hasBeenHighlightedObjects = new Set<BrepNodes>();
    private materialMap = new Map<BrepNodes, THREE.Material | LineMaterial>();

    constructor(private renderer: ThreeRenderer, private app: App) { }

    addHeightlight(item: BrepNodes): void {
        const selectedSet = new Set(this.renderer.getSelectionObjects() as BrepNodes[]);
        if (selectedSet.has(item)) return;
        if (this.currentHighlightedObjects.size === 1 && this.currentHighlightedObjects.has(item)) return;
        if (this.currentHighlightedObjects.size > 0) this.clearHeightlight();
        this.materialMap.set(item, item.material);
        this.currentHighlightedObjects.add(item);
        this.updateHeightlight();
    }

    remove(item: BrepNodes): void {
        const original = this.materialMap.get(item);
        if (original !== undefined) {
            item.material = original;
            item.renderOrder = 0;
        }
        this.currentHighlightedObjects.delete(item);
        this.lastHighlightedObjects.delete(item);
        this.hasBeenHighlightedObjects.delete(item);
        this.materialMap.delete(item);
    }

    /** 从高亮中移除单个对象并恢复原材质，供 remove/clear 场景时调用 */
        public removeObject(object: BrepNodes): void {
        this.remove(object);
    }

    private updateHeightlight(): void {
        this.currentHighlightedObjects.forEach(object => {
            if (this.hasBeenHighlightedObjects.has(object)) return;
            if (object.type === BrepNodeType.FACE) {
                object.material = this.heightLightFaceMaterial;
            } else if (object.type === BrepNodeType.POINT) {
                object.material = this.heightLightPointMaterial;
            } else if (object.type === BrepNodeType.EDGE) {
                object.material = this.heightLightEdgeMaterial;
            }
            object.renderOrder = 2;
            this.hasBeenHighlightedObjects.add(object);
            this.lastHighlightedObjects.add(object);
        });
    }

    private updateUnHeightlight(): void {
        const selectedSet = new Set(this.renderer.getSelectionObjects() as BrepNodes[]);
        this.lastHighlightedObjects.forEach(object => {
            if (selectedSet.has(object)) return;
            const original = this.materialMap.get(object);
            if (original !== undefined) {
                object.material = original;
                object.renderOrder = 0;
            }
        });
    }

    clearHeightlight(): void {
        this.updateUnHeightlight();
        this.lastHighlightedObjects.clear();
        this.currentHighlightedObjects.clear();
        this.hasBeenHighlightedObjects.clear();
        this.materialMap.clear();
    }

    getHeightlightObjects(): BrepNodes[] {
        return Array.from(this.currentHighlightedObjects);
    }

    getStoredOriginalMaterial(object: BrepNodes): THREE.Material | LineMaterial {
        return this.materialMap.get(object)!;
    }

    dispose(): void {
        this.clearHeightlight();
        this.heightLightFaceMaterial.dispose();
        this.heightLightPointMaterial.dispose();
        this.heightLightEdgeMaterial.dispose();
    }
}

export { HeightlightManager };
