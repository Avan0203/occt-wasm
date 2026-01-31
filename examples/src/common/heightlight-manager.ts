import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import * as THREE from 'three';
import { createPointMaterial, createLineMaterial } from './shape-converter';
import { BrepObject, BrepObjectType } from "./types";

const color = '#ffce00';

function createHeightlightMaterial(type: BrepObjectType) {
    let material: THREE.Material | LineMaterial;
    switch (type) {
        case BrepObjectType.MESH:
            material = new THREE.MeshBasicMaterial({ color, depthTest: false, polygonOffset: true, polygonOffsetUnits: 1, polygonOffsetFactor: 1 });
            break;
        case BrepObjectType.POINT:
            material = createPointMaterial(color);
            break;
        case BrepObjectType.LINE:
            material = createLineMaterial(color);
            break;
    }
    material.depthTest = false;
    return material;
}

class HeightlightManager {
    private heightLightFaceMaterial = createHeightlightMaterial(BrepObjectType.MESH);
    private heightLightPointMaterial = createHeightlightMaterial(BrepObjectType.POINT);
    private heightLightLineMaterial = createHeightlightMaterial(BrepObjectType.LINE);

    private lastHighlightedObjects = new Set<BrepObject>();
    private currentHighlightedObjects = new Set<BrepObject>();
    private hasBeenHighlightedObjects = new Set<BrepObject>();
    // 存储原来的材质
    private materialMap = new Map<BrepObject, THREE.Material | LineMaterial | THREE.Material[]>();

    addHeightlight(object: BrepObject): void {
        if (this.currentHighlightedObjects.has(object)) {
            this.removeHeightlight(object);
        } else {
            this.materialMap.set(object, object.material);
            this.currentHighlightedObjects.add(object);
            this.updateHeightlight();
        }
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
            if (object.type === BrepObjectType.MESH) {
                object.material = this.heightLightFaceMaterial.clone();
            } else if (object.type === BrepObjectType.POINT) {
                object.material = this.heightLightPointMaterial.clone();
            } else if (object.type === BrepObjectType.LINE) {
                object.material = this.heightLightLineMaterial.clone();
            }
            this.hasBeenHighlightedObjects.add(object);
            this.lastHighlightedObjects.add(object);
        })
    }

    private updateUnHeightlight(): void {
        this.lastHighlightedObjects.forEach(object => {
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

}

export { HeightlightManager };