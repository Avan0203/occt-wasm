import * as THREE from 'three';
import { TopoDS_Edge, TopoDS_Face, TopoDS_Shape, TopoDS_Vertex } from 'public/occt-wasm';
import { LineSegments2 } from 'three/addons';


export interface BrepGeometry<T extends TopoDS_Shape = TopoDS_Shape> extends THREE.BufferGeometry {
    shape: T;
    data?: any;
}


export interface MeshData {
    positions: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;
    uvs: Float32Array;
}


export interface BrepGroup extends THREE.Group {
    shape: TopoDS_Shape;
    faces: BrepFace[];
    points: BrepPoint[];
    edges: BrepEdge[];
    dispose: () => void;
}

type BrepObjectExtend<T extends TopoDS_Shape = TopoDS_Shape> = { 
    objectId: string , 
    dispose: () => void, 
    type: BrepObjectType,
    geometry: BrepGeometry<T>,
}

export enum BrepObjectType {
    POINT = 'point',
    EDGE = 'edge',
    FACE = 'face',
}

export type BrepPoint = THREE.Points & BrepObjectExtend<TopoDS_Vertex>;
export type BrepEdge = LineSegments2 & BrepObjectExtend<TopoDS_Edge>;
export type BrepFace = THREE.Mesh & BrepObjectExtend<TopoDS_Face>;

export type BrepObject = BrepPoint | BrepEdge | BrepFace;

export enum PickType {
    FACE = 'face',
    EDGE = 'edge',
    VERTEX = 'vertex',
    ALL = 'all',
}