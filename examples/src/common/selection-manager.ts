import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import * as THREE from 'three';
import { createPointMaterial, createLineMaterial } from './shape-converter';
import { BrepObjectType } from "./types";
import { ThreeRenderer } from "./three-renderer";
import { BrepObjectAll, BrepGroup, BrepFace } from "./object";
import { App } from "./app";

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

    private currentSelectedGroups = new Set<BrepGroup>();
    private renderedSelectedGroup = new Set<BrepFace>();

    constructor(private renderer: ThreeRenderer, private app: App) {
        this.renderer.outlinePass.edgeThickness = 1;
        this.renderer.outlinePass.edgeStrength = 10;
        this.renderer.outlinePass.visibleEdgeColor.set(faceColor);
        this.renderer.outlinePass.hiddenEdgeColor.set(pointColor);
        // 使用 Alpha 混合替代加法混合，使描边颜色与配置一致（加法在亮背景上会偏浅）
        this.renderer.outlinePass.overlayMaterial.blending = THREE.CustomBlending;
        this.renderer.outlinePass.overlayMaterial.blendSrc = THREE.SrcAlphaFactor;
        this.renderer.outlinePass.overlayMaterial.blendDst = THREE.OneMinusSrcAlphaFactor;
    }

    addSelection(item: BrepObjectAll | BrepGroup): void {
        // OBJECT MODE
        if (item instanceof BrepGroup) {
            // 如果已经选择，则移除, 实现反选功能
            if (this.currentSelectedGroups.has(item)) {
                this.removeSelection(item);
                return;
            };
            this.currentSelectedGroups.add(item);
            item.faces.forEach(face => this.renderedSelectedGroup.add(face));
            this.updateOutlineObjects();
        } else {
            // 
            // 如果已经选择，则移除, 实现反选功能
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
            this.currentSelectedGroups.delete(item);
            item.faces.forEach(face => this.renderedSelectedGroup.delete(face));
            this.updateOutlineObjects();
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


    /** 当选择变化后由 ThreeRenderer 调用，将选择与 hover 合并更新 outline */
    private updateOutlineObjects(): void {
        this.renderer.outlinePass.selectedObjects = Array.from(this.renderedSelectedGroup);
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
        this.currentSelectedGroups.clear();
        this.renderedSelectedGroup.clear();
        this.updateOutlineObjects();
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
