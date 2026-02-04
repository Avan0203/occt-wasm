import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import * as THREE from 'three';
import { createPointMaterial, createLineMaterial } from './shape-converter';
import { BrepObject, BrepObjectType } from "./types";
import { ThreeRenderer } from "./three-renderer";

const faceColor = '#e6a23c';
const lineColor = '#ffce00';
const pointColor = '#eece00';


function createHeightlightMaterial(type: BrepObjectType) {
    let material: THREE.Material | LineMaterial;
    switch (type) {
        case BrepObjectType.FACE:
            material = new THREE.MeshBasicMaterial({ color: faceColor, depthTest: false, polygonOffset: true, polygonOffsetUnits: 1, polygonOffsetFactor: 1 });
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

    private lastHighlightedObjects = new Set<BrepObject>();
    private currentHighlightedObjects = new Set<BrepObject>();
    private hasBeenHighlightedObjects = new Set<BrepObject>();
    // 存储原来的材质
    private materialMap = new Map<BrepObject, THREE.Material | LineMaterial | THREE.Material[]>();

    constructor(private renderer: ThreeRenderer) {}

    addHeightlight(object: BrepObject): void {
        const selectedSet = new Set(this.renderer.getSelectionObjects());
        if (selectedSet.has(object)) {
            return;
        }
        if (this.currentHighlightedObjects.size === 1 && this.currentHighlightedObjects.has(object)) {
            return;
        }
        if (this.currentHighlightedObjects.size > 0) {
            this.clearHeightlight();
        }
        this.materialMap.set(object, object.material);
        this.currentHighlightedObjects.add(object);
        this.updateHeightlight();
    }

    private removeHeightlight(object: BrepObject): void {
        const original = this.materialMap.get(object);
        if (original !== undefined) {
            object.material = original;
        }
        this.currentHighlightedObjects.delete(object);
        this.lastHighlightedObjects.delete(object);
        this.hasBeenHighlightedObjects.delete(object);
        this.materialMap.delete(object);
    }

    private updateHeightlight(): void {
        this.currentHighlightedObjects.forEach(object => {
            if (this.hasBeenHighlightedObjects.has(object)) {
                return;
            }
            if (object.type === BrepObjectType.FACE) {
                object.material = this.heightLightFaceMaterial;
            } else if (object.type === BrepObjectType.POINT) {
                object.material = this.heightLightPointMaterial;
            } else if (object.type === BrepObjectType.EDGE) {
                object.material = this.heightLightEdgeMaterial;
            }
            this.hasBeenHighlightedObjects.add(object);
            this.lastHighlightedObjects.add(object);
        })
    }

    private updateUnHeightlight(): void {
        const selectedSet = new Set(this.renderer.getSelectionObjects());
        this.lastHighlightedObjects.forEach(object => {
            if (selectedSet.has(object)) {
                return;
            }
            const original = this.materialMap.get(object);
            if (original !== undefined) {
                object.material = original;
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

    getHeightlightObjects(): BrepObject[] {
        return Array.from(this.currentHighlightedObjects);
    }

    getStoredOriginalMaterial(object: BrepObject): THREE.Material | LineMaterial | THREE.Material[] | undefined {
        return this.materialMap.get(object);
    }

    dispose(): void {
        this.clearHeightlight();
        this.heightLightFaceMaterial.dispose();
        this.heightLightPointMaterial.dispose();
        this.heightLightEdgeMaterial.dispose();
    }
}

export { HeightlightManager };