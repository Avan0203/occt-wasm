import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import * as THREE from 'three';
import { createPointMaterial, createLineMaterial } from './shape-converter';
import { BrepObjectType, RenderMode } from "./types";
import { ThreeRenderer } from "./three-renderer";
import { BrepObjectAll, BrepGroup } from "./object";

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

    private selectedGroups = new Set<BrepGroup>();

    constructor(private renderer: ThreeRenderer) { }

    setMode(_mode: RenderMode): void {
        this.clearSelection();
    }

    addSelection(item: BrepObjectAll | BrepGroup): void {
        if (item instanceof BrepGroup) {
            this.selectedGroups.add(item);
            this.renderer.heightlightManager.updateOutlineObjects();
        } else {
            if (this.currentSelectedObjects.has(item)) {
                this.removeSelection(item);
                return;
            }
            const original = this.renderer.heightlightManager.getStoredOriginalMaterial(item) ?? item.material;
            this.materialMap.set(item, original);
            this.currentSelectedObjects.add(item);
            this.updateSelection();
        }
    }

    removeSelection(item: BrepObjectAll | BrepGroup): void {
        if (item instanceof BrepGroup) {
            this.selectedGroups.delete(item);
            this.renderer.heightlightManager.updateOutlineObjects();
        } else {
            const original = this.materialMap.get(item);
            if (original !== undefined) {
                item.material = original;
                item.renderOrder = 0;
            }
            this.currentSelectedObjects.delete(item);
            this.lastSelectedObjects.delete(item);
            this.hasBeenSelectedObjects.delete(item);
            this.materialMap.delete(item);
        }
    }

    hasSelection(item: BrepObjectAll | BrepGroup): boolean {
        if (item instanceof BrepGroup) return this.selectedGroups.has(item);
        return this.currentSelectedObjects.has(item);
    }

    /** 从选择中移除单个对象并恢复原材质，供 remove/clear 场景时调用 */
    public removeObject(object: BrepObjectAll): void {
        this.removeSelection(object);
    }

    /** 从选择中移除组，供 remove 场景时调用 */
    public removeGroup(group: BrepGroup): void {
        this.removeSelection(group);
    }

    private updateSelection(): void {
        this.currentSelectedObjects.forEach(object => {
            if (this.hasBeenSelectedObjects.has(object)) return;
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
        });
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
        this.selectedGroups.clear();
        this.renderer.heightlightManager.updateOutlineObjects();
    }

    getSelectionObjects(): BrepObjectAll[] {
        return Array.from(this.currentSelectedObjects);
    }

    getSelectionGroups(): BrepGroup[] {
        return Array.from(this.selectedGroups);
    }

    dispose(): void {
        this.clearSelection();
        this.selectionFaceMaterial.dispose();
        this.selectionPointMaterial.dispose();
        this.selectionEdgeMaterial.dispose();
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
}

export { SelectionManager };
