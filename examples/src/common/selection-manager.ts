import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import * as THREE from 'three';
import { createPointMaterial, createLineMaterial } from './shape-converter';
import { BrepObject, BrepObjectType } from "./types";
import { ThreeRenderer } from "./three-renderer";

const faceColor = '#1890FF';
const lineColor = '#409EFF';
const pointColor = '#50BFFF';


class SelectionManager {
    private selectionFaceMaterial = this.createSelectionMaterial(BrepObjectType.FACE);
    private selectionPointMaterial = this.createSelectionMaterial(BrepObjectType.POINT);
    private selectionEdgeMaterial = this.createSelectionMaterial(BrepObjectType.EDGE);

    private lastSelectedObjects = new Set<BrepObject>();
    private currentSelectedObjects = new Set<BrepObject>();
    private hasBeenSelectedObjects = new Set<BrepObject>();
    // 存储原来的材质
    private materialMap = new Map<BrepObject, THREE.Material | LineMaterial | THREE.Material[]>();

    constructor(private renderer: ThreeRenderer) { }

    addSelection(object: BrepObject): void {
        if (this.currentSelectedObjects.has(object)) {
            this.removeSelection(object);
        } else {
            const original = this.renderer.heightlightManager.getStoredOriginalMaterial(object) ?? object.material;
            this.materialMap.set(object, original);
            this.currentSelectedObjects.add(object);
            this.updateSelection();
        }
    }

    private removeSelection(object: BrepObject): void {
        const original = this.materialMap.get(object);
        if (original !== undefined) {
            object.material = original;
        }
        this.currentSelectedObjects.delete(object);
        this.lastSelectedObjects.delete(object);
        this.hasBeenSelectedObjects.delete(object);
        this.materialMap.delete(object);
    }

    private updateSelection(): void {
        this.currentSelectedObjects.forEach(object => {
            if (this.hasBeenSelectedObjects.has(object)) {
                return;
            }
            if (object.type === BrepObjectType.FACE) {
                object.material = this.selectionFaceMaterial;
            } else if (object.type === BrepObjectType.POINT) {
                object.material = this.selectionPointMaterial;
            } else if (object.type === BrepObjectType.EDGE) {
                object.material = this.selectionEdgeMaterial;
            }
            object.renderOrder = 1;
            this.hasBeenSelectedObjects.add(object);
            this.lastSelectedObjects.add(object);
        })
    }

    private updateUnSelection(): void {
        this.lastSelectedObjects.forEach(object => {
            const original = this.materialMap.get(object);
            if (original !== undefined) {
                object.material = original;
                object.renderOrder = 0;
            }
        });
    }

    clearSelection(): void {
        this.updateUnSelection();
        this.lastSelectedObjects.clear();
        this.currentSelectedObjects.clear();
        this.hasBeenSelectedObjects.clear();
        this.materialMap.clear();
    }

    getSelectionObjects(): BrepObject[] {
        return Array.from(this.currentSelectedObjects);
    }

    private createSelectionMaterial(type: BrepObjectType) {
        let material: THREE.Material | LineMaterial;
        switch (type) {
            case BrepObjectType.FACE:
                material = new THREE.MeshLambertMaterial({
                    color: faceColor,
                    depthWrite: false,
                    polygonOffset: true,
                    polygonOffsetUnits: 1,
                    polygonOffsetFactor: -1,
                    transparent: true,
                    depthTest: false,
                });
                break;
            case BrepObjectType.POINT:
                material = createPointMaterial(pointColor);
                material.transparent = true;
                (material as THREE.PointsMaterial).size = (material as THREE.PointsMaterial).size + 1;
                break;
            case BrepObjectType.EDGE:
                material = createLineMaterial(lineColor);
                (material as LineMaterial).transparent = true;
                (material as LineMaterial).linewidth = (material as LineMaterial).linewidth + 1;
                break;
        }
        material.depthTest = false;
        return material;
    }

    dispose(): void {
        this.clearSelection();
        this.selectionFaceMaterial.dispose();
        this.selectionPointMaterial.dispose();
        this.selectionEdgeMaterial.dispose();
    }

}

export { SelectionManager };
