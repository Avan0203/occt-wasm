import { TopoDS_Shape } from "public/occt-wasm";
import * as THREE from 'three';
import { BrepObjectType } from "./types";
import { OBJECT_MANAGER } from "./object-manager";
import { Vertex, Edge, Face } from "./brep-result";
import { LineGeometry, LineMaterial, LineSegments2 } from "three/examples/jsm/Addons.js";
import { ObjectID } from "./id-tool";

type BrepGeometryType = BrepGeometry<Vertex> | BrepGeometry<Edge> | BrepGeometry<Face> | BrepLineGeometry;

interface BrepObject extends THREE.Object3D {
    readonly objectId: string;
    dispose: () => void;
    readonly type: BrepObjectType;
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

function disposeObject(object: BrepObject) {
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


type BrepObjectAll = BrepFace | BrepPoint | BrepEdge;

class BrepFace extends THREE.Mesh implements BrepObject {
    readonly objectId: string;
    readonly type: BrepObjectType;
    geometry: BrepGeometry<Face>;
    material: THREE.Material;

    constructor(geometry: BrepGeometry<Face>, material: THREE.Material) {
        super(geometry, material);
        this.objectId = geometry.objectId;
        this.type = BrepObjectType.FACE;
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

class BrepPoint extends THREE.Points implements BrepObject {
    readonly objectId: string;
    readonly type: BrepObjectType;
    geometry: BrepGeometry<Vertex>;
    material: THREE.Material;
    constructor(geometry: BrepGeometry<Vertex>, material: THREE.Material) {
        super(geometry, material);
        this.objectId = geometry.objectId;
        this.type = BrepObjectType.POINT;
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

class BrepEdge extends LineSegments2 implements BrepObject {
    readonly objectId: string;
    readonly type: BrepObjectType;
    geometry: BrepLineGeometry;
    material: LineMaterial;
    constructor(geometry: BrepLineGeometry, material: LineMaterial) {
        super(geometry, material);
        this.objectId = geometry.objectId;
        this.type = BrepObjectType.EDGE;
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

class BrepGPUEdge extends THREE.LineSegments implements BrepObject {
    readonly objectId: string;
    readonly type: BrepObjectType;
    readonly geometry: BrepGeometry<Edge>;
    readonly material: THREE.Material;

    constructor(geometry: BrepGeometry<Edge>, material: THREE.Material) {
        super(geometry, material);
        this.objectId = geometry.objectId;
        this.type = BrepObjectType.EDGE;
        this.geometry = geometry;
        this.material = material;
    }

    dispose(): void {
        this.geometry.dispose();
        this.material.dispose();
    }

}


class BrepGroup extends THREE.Group {
    faces: BrepFace[];
    points: BrepPoint[];
    edges: BrepEdge[];
    constructor(private _shape: TopoDS_Shape) {
        super();
        this.faces = [];
        this.points = [];
        this.edges = [];
    }

    get shape(): TopoDS_Shape {
        return this._shape;
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
    }

}


class BrepGPUGroup extends THREE.Group {
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

function getBrepGroupFromBrepObject(obj: BrepObjectAll): BrepGroup | null {
    let p: THREE.Object3D | null = obj.parent;
    while (p) {
        if (p instanceof BrepGroup) return p;
        p = p.parent;
    }
    return null;
}

export { getBrepGroupFromBrepObject };
export {
    BrepGroup,
    BrepFace,
    BrepPoint,
    BrepEdge,
    BrepGeometry,
    BrepLineGeometry,
    BrepObjectType,
    BrepGPUEdge,
    BrepGPUGroup
};
export type { BrepObject, BrepGeometryType, BrepObjectAll };

