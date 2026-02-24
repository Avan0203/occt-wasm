import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import * as THREE from 'three';
import type { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { createPointMaterial, createLineMaterial } from './shape-converter';
import { BrepObjectType } from "./types";
import { ThreeRenderer } from "./three-renderer";
import { BrepObjectAll, BrepGroup } from "./object";
import { App } from "./app";

const faceColor = '#e6a23c';
const lineColor = '#ffce00';
const pointColor = '#eece00';


function createHeightlightMaterial(type: BrepObjectType) {
    let material: THREE.Material | LineMaterial;
    switch (type) {
        case BrepObjectType.FACE:
            material = new THREE.MeshBasicMaterial({ color: faceColor, depthTest: false, polygonOffset: true, polygonOffsetUnits: 1, polygonOffsetFactor: 1, transparent: true });
            break;
        case BrepObjectType.POINT:
            material = createPointMaterial(pointColor);
            material.transparent = true;
            break;
        case BrepObjectType.EDGE:
            material = createLineMaterial(lineColor);
            material.transparent = true;
            break;
    }
    material.depthTest = false;
    return material;
}

class HeightlightManager {
    private heightLightFaceMaterial = createHeightlightMaterial(BrepObjectType.FACE);
    private heightLightPointMaterial = createHeightlightMaterial(BrepObjectType.POINT);
    private heightLightEdgeMaterial = createHeightlightMaterial(BrepObjectType.EDGE);

    private lastHighlightedObjects = new Set<BrepObjectAll>();
    private currentHighlightedObjects = new Set<BrepObjectAll>();
    private hasBeenHighlightedObjects = new Set<BrepObjectAll>();
    private materialMap = new Map<BrepObjectAll, THREE.Material | LineMaterial>();

    private currentHighlightedGroup: BrepGroup | null = null;
    private renderedHighlightedGroup = new THREE.Group();

    constructor(private renderer: ThreeRenderer, private app: App) { }

    addHeightlight(item: BrepObjectAll | BrepGroup): void {
        if (item instanceof BrepGroup) {
            if (this.currentHighlightedGroup === item) return;
            this.currentHighlightedGroup = item;
            this.renderedHighlightedGroup.clear();
            this.renderedHighlightedGroup.add(...item.faces);
            this.updateOutlineObjects();
            return;
        }
        const selectedSet = new Set(this.renderer.getSelectionObjects());
        if (selectedSet.has(item)) return;
        if (this.currentHighlightedObjects.size === 1 && this.currentHighlightedObjects.has(item)) return;
        if (this.currentHighlightedObjects.size > 0) this.clearHeightlight();
        this.materialMap.set(item, item.material);
        this.currentHighlightedObjects.add(item);
        this.updateHeightlight();
    }

    remove(item: BrepObjectAll | BrepGroup): void {
        if (item instanceof BrepGroup) {
            if (this.currentHighlightedGroup === item) {
                this.currentHighlightedGroup = null;
                this.renderedHighlightedGroup.clear();
                this.updateOutlineObjects();
            }
            return;
        }
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
    public removeObject(object: BrepObjectAll): void {
        this.remove(object);
    }

    private updateHeightlight(): void {
        this.currentHighlightedObjects.forEach(object => {
            if (this.hasBeenHighlightedObjects.has(object)) return;
            if (object.type === BrepObjectType.FACE) {
                object.material = this.heightLightFaceMaterial;
            } else if (object.type === BrepObjectType.POINT) {
                object.material = this.heightLightPointMaterial;
            } else if (object.type === BrepObjectType.EDGE) {
                object.material = this.heightLightEdgeMaterial;
            }
            object.renderOrder = 2;
            this.hasBeenHighlightedObjects.add(object);
            this.lastHighlightedObjects.add(object);
        });
    }

    private updateUnHeightlight(): void {
        const selectedSet = new Set(this.renderer.getSelectionObjects());
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
        this.currentHighlightedGroup = null;
        this.renderedHighlightedGroup.clear();
        this.updateOutlineObjects();
    }

    /** 当选择变化后由 ThreeRenderer 调用，将选择与 hover 合并更新 outline */
    private updateOutlineObjects(): void {
        this.renderer.outlinePass.selectedObjects = this.renderedHighlightedGroup.children;
    }

    getHeightlightObjects(): BrepObjectAll[] {
        return Array.from(this.currentHighlightedObjects);
    }

    getStoredOriginalMaterial(object: BrepObjectAll): THREE.Material | LineMaterial {
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
