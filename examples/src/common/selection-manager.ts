import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import * as THREE from 'three';
import { createPointMaterial, createLineMaterial } from './shape-converter';
import { BrepObjectType } from "./types";
import { ThreeRenderer } from "./three-renderer";
import { BrepObjectAll } from "./object";

const faceColor = '#1890FF';
const lineColor = '#409EFF';
const pointColor = '#50BFFF';


class SelectionManager {
    private selectionFaceMaterial = this.createSelectionMaterial(BrepObjectType.FACE);
    private selectionPointMaterial = this.createSelectionMaterial(BrepObjectType.POINT);
    private selectionEdgeMaterial = this.createSelectionMaterial(BrepObjectType.EDGE);

    private lastSelectedObjects = new Set<BrepObjectAll>();
    private currentSelectedObjects = new Set<BrepObjectAll>();
    private hasBeenSelectedObjects = new Set<BrepObjectAll>();
    // 存储原来的材质
    private materialMap = new Map<BrepObjectAll, THREE.Material | LineMaterial>();

    constructor(private renderer: ThreeRenderer) { }

    addSelection(object: BrepObjectAll): void {
        if (this.currentSelectedObjects.has(object)) {
            this.removeObject(object);
        } else {
            const original = this.renderer.heightlightManager.getStoredOriginalMaterial(object) ?? object.material;
            this.materialMap.set(object, original);
            this.currentSelectedObjects.add(object);
            this.updateSelection();
        }
    }

    /** 从选择中移除单个对象并恢复原材质，供 remove/clear 场景时调用，避免 dispose 时误释放共享材质 */
    public removeObject(object: BrepObjectAll): void {
        const original = this.materialMap.get(object);
        if (original !== undefined) {
            object.material = original;
            object.renderOrder = 0;
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

    getSelectionObjects(): BrepObjectAll[] {
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
