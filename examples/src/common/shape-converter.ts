import * as THREE from 'three';
import { LineMaterial, LineSegmentsGeometry, LineSegments2 } from 'three/addons';
import type { BRepResult } from './BRepResult';
import { ObjectID } from './id-tool';
import { type BrepGeometry, type BrepFace, type BrepPoint, type BrepEdge, type BrepGroup, type BrepObject, BrepObjectType } from './types';
import { convertLineLoopToLineSegments, id2color } from './utils';
import { TopoDS_Shape } from 'public/occt-wasm';

export const POINT_SIZE = 5;
export const LINE_WIDTH = 2;
const FACE_COLOR = 0x4a90e2;

const USE_ID_MAP = new Map<string, ObjectID>();
const ID_OBJECT_MAP = new Map<string, BrepObject>();

export function getObjectById(id: string): BrepObject | undefined {
  return ID_OBJECT_MAP.get(id);
}

function wrapBrepGeometry(geometry: BrepGeometry): void {
  const id = ObjectID.generate();
  geometry.uuid = id.toString();
  USE_ID_MAP.set(id.toString(), id);

  geometry.addEventListener('dispose', () => {
    if (USE_ID_MAP.has(geometry.uuid)) {
      ObjectID.release(USE_ID_MAP.get(geometry.uuid)!);
      USE_ID_MAP.delete(geometry.uuid);
    }
    if (geometry.shape.isDeleted()) {
      geometry.shape.deleteLater();
    }
    geometry.data = undefined;
  });
}

function wrapMaterial(material: THREE.Material): void {
  let originalDispose = material.dispose;
  material.dispose = () => {
    originalDispose();
    const { map } = material as THREE.MeshBasicMaterial;
    if (map) {
      map.dispose();
    }
  }
}

export function parseBRepResult2Geometry(result: BRepResult): { points: BrepGeometry[], edges: BrepGeometry[], faces: BrepGeometry[] } {
  const { vertices, edges, faces } = result;
  const [pointsGeo, edgesGeo, facesGeo] = [[], [], []] as BrepGeometry[][];

  vertices.forEach((vertex) => {
    const geometry = new THREE.BufferGeometry() as BrepGeometry;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertex.position, 3));
    geometry.shape = vertex.shape;
    wrapBrepGeometry(geometry);
    pointsGeo.push(geometry);
    geometry.data = {
      position: vertex.position,
    };
  });

  edges.forEach((edge) => {
    let lineSegments: Float32Array;
    if (edge.position.length > 6) {
      // 将LineLoop转换成LineSegment
      lineSegments = convertLineLoopToLineSegments(edge.position);
    } else {
      lineSegments = edge.position;
    }
    const geometry = new LineSegmentsGeometry() as LineSegmentsGeometry & BrepGeometry;
    geometry.setPositions(lineSegments);
    geometry.shape = edge.shape;
    wrapBrepGeometry(geometry);
    edgesGeo.push(geometry);
    geometry.data = {
      position: edge.position,
    };
  });


  faces.forEach((face) => {
    const geometry = new THREE.BufferGeometry() as BrepGeometry;
    geometry.setAttribute('position', new THREE.BufferAttribute(face.position, 3));
    geometry.setIndex([...face.index]);
    geometry.setAttribute('uv', new THREE.BufferAttribute(face.uvs, 2));
    geometry.shape = face.shape;
    wrapBrepGeometry(geometry);
    facesGeo.push(geometry);
    geometry.computeVertexNormals();
    geometry.data = {
      index: face.index,
      uvs: face.uvs,
      position: face.position,
    };
  });


  return { points: pointsGeo, edges: edgesGeo, faces: facesGeo };
}

export function createPointMaterial(color: THREE.Color | number | string): THREE.PointsMaterial {
  return new THREE.PointsMaterial({
    color,
    size: POINT_SIZE,
    polygonOffset: true,
    polygonOffsetUnits: 8,
    polygonOffsetFactor: -1,
    sizeAttenuation: false
  });
}

export function createLineMaterial(color: THREE.Color | number | string): LineMaterial {
  return new LineMaterial({
    color,
    linewidth: LINE_WIDTH,
    polygonOffset: true,
    polygonOffsetUnits: 4,
    polygonOffsetFactor: -1
  });
}

export function createFaceMaterial(color: THREE.Color | number | string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    polygonOffset: true,
    polygonOffsetUnits: 1,
    polygonOffsetFactor: 1
  });
}


const pointMaterial = createPointMaterial(0x000000);
const lineMaterial = createLineMaterial(0x000000);
const faceMaterial = createFaceMaterial(FACE_COLOR);


function createBrepObject(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  type: BrepObjectType.FACE,
  registerInMap?: boolean
): BrepFace;
function createBrepObject(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  type: BrepObjectType.POINT,
  registerInMap?: boolean
): BrepPoint;
function createBrepObject(
  geometry: LineSegmentsGeometry,
  material: LineMaterial,
  type: BrepObjectType.EDGE,
  registerInMap?: boolean
): BrepEdge;
function createBrepObject(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  type: 'base-line',
  registerInMap?: boolean
): BrepEdge;

function createBrepObject(
  geometry: THREE.BufferGeometry | LineSegmentsGeometry,
  material: THREE.Material | LineMaterial,
  type: 'face' | 'point' | 'edge' | 'base-line',
  /** 为 false 时不写入 ID_OBJECT_MAP，用于 GPUPickScene 的副本，避免覆盖主场景对象导致高亮污染 GPU 场景 */
  registerInMap = true
): BrepObject {
  let object: BrepObject;

  switch (type) {
    case 'face':
      object = new THREE.Mesh(geometry as THREE.BufferGeometry, material as THREE.Material) as BrepFace;
      object.type = BrepObjectType.FACE;
      break;
    case 'point':
      object = new THREE.Points(geometry as THREE.BufferGeometry, material as THREE.Material) as BrepPoint;
      object.type = BrepObjectType.POINT;
      break;
    case 'edge':
      object = new LineSegments2(geometry as LineSegmentsGeometry, material as LineMaterial) as BrepEdge;
      object.type = BrepObjectType.EDGE;
      break;
    case 'base-line':
      object = new THREE.LineSegments(geometry, material) as unknown as BrepEdge;
      object.type = BrepObjectType.EDGE;
      break;
    default:
      throw new Error(`Unsupported BrepObjectType: ${type} satisfies never`);
  }

  object.objectId = geometry.uuid;
  if (registerInMap) {
    ID_OBJECT_MAP.set(geometry.uuid, object);
  }
  object.dispose = () => {
    geometry.dispose();
    (material as any).dispose?.(); // 更安全的 dispose 调用
  };

  return object;
}


export function createBrepGroup(shape: TopoDS_Shape, brepResult: BRepResult, material: THREE.Material = faceMaterial): BrepGroup {
  material.polygonOffset = true;
  material.polygonOffsetUnits = 1;
  material.polygonOffsetFactor = 1;

  wrapMaterial(material);

  const { points, edges, faces } = parseBRepResult2Geometry(brepResult);
  const group = new THREE.Group() as BrepGroup;
  group.shape = shape;

  group.faces = faces.map((faceGeo) => {
    const mesh = createBrepObject(faceGeo, material, BrepObjectType.FACE);
    ID_OBJECT_MAP.set(faceGeo.uuid, mesh);
    group.add(mesh);
    return mesh;
  });
  group.points = points.map((pointGeo) => {
    const point = createBrepObject(pointGeo, pointMaterial, BrepObjectType.POINT);
    ID_OBJECT_MAP.set(pointGeo.uuid, point);
    group.add(point);
    return point;
  });
  group.edges = edges.map((edgeGeo) => {
    const edge = createBrepObject(edgeGeo as unknown as LineSegmentsGeometry, lineMaterial, BrepObjectType.EDGE);
    ID_OBJECT_MAP.set(edgeGeo.uuid, edge);
    group.add(edge);
    return edge;
  });
  group.dispose = () => {
    if (shape.isDeleted()) {
      shape.deleteLater();
    }
    faces.forEach((face) => {
      ID_OBJECT_MAP.delete(face.uuid);
      face.dispose();
    });
    points.forEach((point) => {
      ID_OBJECT_MAP.delete(point.uuid);
      point.dispose();
    });
    edges.forEach((edge) => {
      ID_OBJECT_MAP.delete(edge.uuid);
      edge.dispose();
    });
  }
  return group;
}

/** GPU 拾取用材质：GPUPickScene 无灯光，face 必须用 MeshBasicMaterial 否则面片全黑无法 pick */
function createGPUObjectMaterial(id: string, type: 'face' | 'point' | 'line') {
  const [r, g, b] = id2color(parseInt(id)).map(v => v / 255);
  const color = new THREE.Color().setRGB(r, g, b);
  switch (type) {
    case 'face':
      return new THREE.MeshBasicMaterial({ color, polygonOffset: true, polygonOffsetUnits: 1, polygonOffsetFactor: 1 });
    case 'point':
      return createPointMaterial(color);
    case 'line':
      return new THREE.LineBasicMaterial({ color, polygonOffset: true, polygonOffsetUnits: 4, polygonOffsetFactor: -1 });
  }
}


export function createGPUBrepGroup(brepMesh: BrepGroup): BrepGroup {
  const group = new THREE.Group() as BrepGroup;
  group.position.copy(brepMesh.position);
  group.scale.copy(brepMesh.scale);
  group.quaternion.copy(brepMesh.quaternion);
  group.faces = brepMesh.faces.map((face) => {
    const material = createGPUObjectMaterial(face.objectId, 'face');
    const faceObject = createBrepObject(face.geometry, material, BrepObjectType.FACE, false);
    faceObject.position.copy(face.position);
    faceObject.scale.copy(face.scale);
    faceObject.quaternion.copy(face.quaternion);
    group.add(faceObject);
    return faceObject;
  });
  group.points = brepMesh.points.map((point) => {
    const material = createGPUObjectMaterial(point.objectId, 'point');
    const pointObject = createBrepObject(point.geometry, material, BrepObjectType.POINT, false);
    pointObject.position.copy(point.position);
    pointObject.scale.copy(point.scale);
    pointObject.quaternion.copy(point.quaternion);
    group.add(pointObject);
    return pointObject;
  });
  group.edges = brepMesh.edges.map((edge) => {
    const material = createGPUObjectMaterial(edge.objectId, 'line');
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute((edge.geometry as any).data.position, 3));
    const edgeObject = createBrepObject(geometry, material, 'base-line', false);
    edgeObject.position.copy(edge.position);
    edgeObject.scale.copy(edge.scale);
    edgeObject.quaternion.copy(edge.quaternion);
    group.add(edgeObject);
    return edgeObject;
  });

  group.dispose = () => {
    group.faces.forEach((face) => {
      face.dispose();
    });
    group.points.forEach((point) => {
      point.dispose();
    });
    group.edges.forEach((edge) => {
      edge.dispose();
    });
  }

  return group;
}

