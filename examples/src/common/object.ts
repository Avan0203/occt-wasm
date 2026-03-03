import { TopoDS_Shape } from "public/occt-wasm";
import * as THREE from 'three';
import { BrepNodeType } from "./types";
import { OBJECT_MANAGER } from "./object-manager";
import { Vertex, Edge, Face } from "./brep-result";
import { LineGeometry, LineMaterial, LineSegments2 } from "three/examples/jsm/Addons.js";
import { ObjectID } from "./id-tool";

const _m = new THREE.Matrix4();
const _pm = new THREE.Matrix4();

type BrepGeometryType = BrepGeometry<Vertex> | BrepGeometry<Edge> | BrepGeometry<Face> | BrepLineGeometry;

interface BrepNode extends BrepBase {
    readonly objectId: string;
    dispose: () => void;
    readonly type: BrepNodeType;
    geometry: BrepGeometryType;
    material: THREE.Material | LineMaterial;
}

/** 仅释放 OBJECT_MANAGER 与 shape 引用，不调用 geometry.dispose，避免与 BrepGeometry.dispose 互相递归。对已 dispose 的 geometry（_data 已为 null）做空检查，避免与主组共享 geometry 的 GPU 组二次 dispose 时报错。 */
function cleanupBrepGeometry(geometry: BrepGeometry<Vertex | Edge | Face> | BrepLineGeometry): void {
    if (OBJECT_MANAGER.hasUseId(geometry.objectId)) {
        ObjectID.release(OBJECT_MANAGER.getUseId(geometry.objectId)!);
        OBJECT_MANAGER.deleteUseId(geometry.objectId);
    }
    if (geometry.shape && !geometry.shape.isDeleted()) {
        geometry.shape.delete();
    }
}

function disposeObject(object: BrepNode) {
    OBJECT_MANAGER.deleteObject(object.objectId);
    object.geometry.dispose();
    const material = Array.isArray(object.material) ? object.material : [object.material];
    material.forEach((m) => {
        m.dispose();
    });
}

class BrepGeometry<T extends Vertex | Edge | Face> extends THREE.BufferGeometry {
    readonly brepId = ObjectID.generate();
    constructor(private _data: T) {
        super();
        OBJECT_MANAGER.addUseId(this.objectId, this.brepId);
    }

    get data(): T {
        return this._data;
    }

    get objectId(): string {
        return this.brepId.toString();
    }

    get shape(): TopoDS_Shape | null {
        return this._data ? this._data.shape : null;
    }

    dispose(): void {
        if (this._data == null) return; // 已 dispose（如与 GPU 组共享 geometry 时二次调用），直接返回
        cleanupBrepGeometry(this);
        this._data = null as unknown as T;
        super.dispose();
    }
}

class BrepLineGeometry extends LineGeometry {
    readonly brepId = ObjectID.generate();
    constructor(private _data: Edge) {
        super();
        OBJECT_MANAGER.addUseId(this.objectId, this.brepId);
    }

    get data(): Edge {
        return this._data;
    }

    get objectId(): string {
        return this.brepId.toString();
    }

    /** 已 dispose 后 _data 为 null，返回 null 避免二次 dispose 时报错 */
    get shape(): TopoDS_Shape | null {
        return this._data ? this._data.shape : null;
    }

    dispose(): void {
        if (this._data == null) return;
        cleanupBrepGeometry(this);
        this._data = null as unknown as Edge;
        super.dispose();
    }
}


type BrepNodes = BrepFace | BrepPoint | BrepEdge;

class BrepFace extends THREE.Mesh implements BrepNode {
    readonly objectId: string;
    readonly type: BrepNodeType;
    geometry: BrepGeometry<Face>;
    material: THREE.Material;

    constructor(geometry: BrepGeometry<Face>, material: THREE.Material) {
        super(geometry, material);
        this.objectId = geometry.objectId;
        this.type = BrepNodeType.FACE;
        this.geometry = geometry;
        this.material = material;
    }
    getData(): Face {
        return this.geometry.data;
    }
    dispose(): void {
        disposeObject(this);
    }
}

class BrepPoint extends THREE.Points implements BrepNode {
    readonly objectId: string;
    readonly type: BrepNodeType;
    geometry: BrepGeometry<Vertex>;
    material: THREE.Material;
    constructor(geometry: BrepGeometry<Vertex>, material: THREE.Material) {
        super(geometry, material);
        this.objectId = geometry.objectId;
        this.type = BrepNodeType.POINT;
        this.geometry = geometry;
        this.material = material;
    }
    getData(): Vertex {
        return this.geometry.data;
    }

    dispose(): void {
        disposeObject(this);
    }
}

class BrepEdge extends LineSegments2 implements BrepNode {
    readonly objectId: string;
    readonly type: BrepNodeType;
    geometry: BrepLineGeometry;
    material: LineMaterial;
    constructor(geometry: BrepLineGeometry, material: LineMaterial) {
        super(geometry, material);
        this.objectId = geometry.objectId;
        this.type = BrepNodeType.EDGE;
        this.geometry = geometry;
        this.material = material;
    }
    getData(): Edge {
        return this.geometry.data;
    }

    dispose(): void {
        disposeObject(this);
    }
}

class BrepGPUEdge extends THREE.LineSegments implements BrepNode {
    readonly objectId: string;
    readonly type: BrepNodeType;
    readonly geometry: BrepGeometry<Edge>;
    readonly material: THREE.Material;

    constructor(geometry: BrepGeometry<Edge>, material: THREE.Material) {
        super(geometry, material);
        this.objectId = geometry.objectId;
        this.type = BrepNodeType.EDGE;
        this.geometry = geometry;
        this.material = material;
    }

    dispose(): void {
        this.geometry.dispose();
        this.material.dispose();
    }

}

/** 场景中可添加的 brep 节点基类（区分于 BrepObject：face/edge/point 子对象） */
abstract class BrepBase extends THREE.Object3D {
    abstract dispose(): void;
}

abstract class BrepRenderBase extends BrepBase {
    boundingBox = new THREE.Box3();
    abstract get shape(): TopoDS_Shape;
    abstract setWireframeVisible(visible: boolean): void;
    abstract computeBoundingBox(): void;
    abstract transformToWorldMatrix(worldMatrix: THREE.Matrix4): void;
    abstract syncTransform(worldMatrix: THREE.Matrix4): void;
}

/** 叶子节点：单个 shape 的网格化表示 */
class BrepMesh extends BrepRenderBase {
    faces: BrepFace[] = [];
    points: BrepPoint[] = [];
    edges: BrepEdge[] = [];
    constructor(private _shape: TopoDS_Shape) {
        super();
    }

    get shape(): TopoDS_Shape {
        return this._shape;
    }

    computeBoundingBox(): void {
        this.boundingBox.makeEmpty();
        this.boundingBox.setFromObject(this, false);
    }

    /** 设置点与线的渲染可见性（仅影响主场景，不影响 GPU 拾取） */
    setWireframeVisible(visible: boolean): void {
        this.points.forEach((p) => { p.visible = visible; });
        this.edges.forEach((e) => { e.visible = visible; });
    }

    dispose(): void {
        if (this.shape && !this.shape.isDeleted()) {
            this.shape.delete();
        }
        this.faces.forEach((face) => {
            face.dispose();
        });
        this.points.forEach((point) => {
            point.dispose();
        });
        this.edges.forEach((edge) => {
            edge.dispose();
        });
        const id = this.id.toString();
        OBJECT_MANAGER.deleteObject(id);
        const gpuObject = OBJECT_MANAGER.getGPUGroup(id);
        if (gpuObject) {
            gpuObject.removeFromParent();
            OBJECT_MANAGER.deleteGPUGroup(id);
            gpuObject.dispose();
        }
    }

    /**
     * @description: 当前物体移动到世界矩阵坐标系下位置
     * @param {Matrix4} worldMatrix
     * @return {void}
     */
    transformToWorldMatrix(worldMatrix: THREE.Matrix4): void {
        this.updateWorldMatrix(true, false);
        _m.copy(worldMatrix);
        _pm.copy(this.parent!.matrixWorld!);
        _m.premultiply(_pm.invert());
        _m.decompose(this.position, this.quaternion, this.scale);
        this.syncTransform(worldMatrix);
    }

    /** 同步 GPUPickScene 和 TopoDS_Shape location，默认使用当前 matrixWorld，也可传入指定的世界矩阵 */
    syncTransform(worldMatrix: THREE.Matrix4 = this.matrixWorld): void {
        const gpuObject = OBJECT_MANAGER.getGPUGroup(this.id.toString());
        if (gpuObject) {
            worldMatrix.decompose(gpuObject.position, gpuObject.quaternion, gpuObject.scale);
            gpuObject.updateMatrixWorld(true);
        }
        this.shape.setLocationFromMatrix4(worldMatrix.elements);
    }
}

/** 容器节点：children 为 BrepMesh | BrepCompound */
class BrepCompound extends BrepRenderBase {
    children: BrepRenderBase[] = [];

    constructor(private _shape: TopoDS_Shape) {
        super();
    }

    get shape(): TopoDS_Shape {
        return this._shape;
    }

    computeBoundingBox(): void {
        this.boundingBox.makeEmpty();
        this.children.forEach((child) => {
            child.computeBoundingBox();
            this.boundingBox.union(child.boundingBox);
        });
    }

    setWireframeVisible(visible: boolean): void {
        this.children.forEach((child) => {
            child.setWireframeVisible(visible);
        });
    }

    transformToWorldMatrix(worldMatrix: THREE.Matrix4): void {
        this.children.forEach((child) => {
            child.transformToWorldMatrix(worldMatrix);
        });
    }

    syncTransform(worldMatrix: THREE.Matrix4): void {
        this.children.forEach((child) => {
            child.syncTransform(worldMatrix);
        });
    }

    dispose(): void {
        const children = [...this.children];
        children.forEach((child) => {
            if (child instanceof BrepRenderBase) {
                child.dispose();
            }
        });
    }
}

type BrepObject = BrepMesh | BrepCompound

class BrepGPUGroup extends BrepBase {
    faces: BrepFace[];
    points: BrepPoint[];
    edges: BrepGPUEdge[];
    constructor() {
        super();
        this.faces = [];
        this.points = [];
        this.edges = [];
    }

    dispose(): void {
        this.faces.forEach((face) => {
            face.dispose();
        });
        this.points.forEach((point) => {
            point.dispose();
        });
        this.edges.forEach((edge) => {
            edge.dispose();
        });
    }

}

function getBrepMeshFromBrepObject(obj: BrepNodes): BrepMesh | null {
    let p: THREE.Object3D | null = obj.parent;
    while (p) {
        if (p instanceof BrepMesh) return p;
        p = p.parent;
    }
    return null;
}

export { getBrepMeshFromBrepObject };
export {
    BrepMesh,
    BrepCompound,
    BrepFace,
    BrepPoint,
    BrepEdge,
    BrepGeometry,
    BrepLineGeometry,
    BrepNodeType,
    BrepGPUEdge,
    BrepGPUGroup
};
export type { BrepNode, BrepGeometryType, BrepNodes, BrepObject };
