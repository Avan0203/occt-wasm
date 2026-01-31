import * as THREE from 'three';
import { TopoDS_Shape } from 'public/occt-wasm';
import { LineSegments2 } from 'three/addons';

export interface BrepGeometry extends THREE.BufferGeometry {
    shape: TopoDS_Shape;
}


export interface MeshData {
    positions: Float32Array;
    indices: Uint32Array;
    normals: Float32Array;
    uvs: Float32Array;
}


export interface BrepGroup extends THREE.Group {
    faces: BrepMesh[];
    points: BrepPoint[];
    lines: BrepLine[];
    dispose: () => void;
}

type BrepObjectExtend= { 
    objectId: string , 
    dispose: () => void, 
    type: BrepObjectType,
}

export enum BrepObjectType {
    POINT = 'point',
    LINE = 'line',
    MESH = 'mesh',
}

export type BrepPoint = THREE.Points & BrepObjectExtend;
export type BrepLine = LineSegments2 & BrepObjectExtend;
export type BrepMesh = THREE.Mesh & BrepObjectExtend;

export type BrepObject = BrepPoint | BrepLine | BrepMesh;