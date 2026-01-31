import * as THREE from 'three';
import { LineMaterial, LineSegmentsGeometry, LineSegments2 } from 'three/addons';
import type { BRepResult } from './BRepResult';
import { ObjectID } from './id-tool';
import { type BrepGeometry, type BrepMesh, type BrepPoint, type BrepLine, type BrepGroup, type BrepObject, BrepObjectType } from './types';
import { convertLineLoopToLineSegments, id2color } from './utils';

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
  });
}

export function parseBRepResult2Geometry(result: BRepResult): { points: BrepGeometry[], lines: BrepGeometry[], faces: BrepGeometry[] } {
  const { vertices, edges, faces } = result;
  const [pointsGeo, linesGeo, facesGeo] = [[], [], []] as BrepGeometry[][];

  vertices.forEach((vertex) => {
    const geometry = new THREE.BufferGeometry() as BrepGeometry;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertex.position, 3));
    geometry.shape = vertex.shape;
    wrapBrepGeometry(geometry);
    pointsGeo.push(geometry);
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
    linesGeo.push(geometry);
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
  });


  return { points: pointsGeo, lines: linesGeo, faces: facesGeo };
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
  type: BrepObjectType.MESH,
  registerInMap?: boolean
): BrepMesh;
function createBrepObject(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  type: BrepObjectType.POINT,
  registerInMap?: boolean
): BrepPoint;
function createBrepObject(
  geometry: LineSegmentsGeometry,
  material: LineMaterial,
  type: BrepObjectType.LINE,
  registerInMap?: boolean
): BrepLine;

function createBrepObject(
  geometry: THREE.BufferGeometry | LineSegmentsGeometry,
  material: THREE.Material | LineMaterial,
  type: BrepObjectType,
  /** 为 false 时不写入 ID_OBJECT_MAP，用于 GPUPickScene 的副本，避免覆盖主场景对象导致高亮污染 GPU 场景 */
  registerInMap = true
): BrepObject {
  let object: BrepObject;

  switch (type) {
    case BrepObjectType.MESH:
      object = new THREE.Mesh(geometry as THREE.BufferGeometry, material as THREE.Material) as BrepMesh;
      object.type = BrepObjectType.MESH;
      break;
    case BrepObjectType.POINT:
      object = new THREE.Points(geometry as THREE.BufferGeometry, material as THREE.Material) as BrepPoint;
      object.type = BrepObjectType.POINT;
      break;
    case BrepObjectType.LINE:
      object = new LineSegments2(geometry as LineSegmentsGeometry, material as LineMaterial) as BrepLine;
      object.type = BrepObjectType.LINE;
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


export function createBrepGroup(brepResult: BRepResult, material: THREE.Material = faceMaterial): BrepGroup {
  material.polygonOffset = true;
  material.polygonOffsetUnits = 1;
  material.polygonOffsetFactor = 1;

  const { points, lines, faces } = parseBRepResult2Geometry(brepResult);
  const group = new THREE.Group() as BrepGroup;

  group.faces = faces.map((face) => {
    const mesh = createBrepObject(face, material, BrepObjectType.MESH);
    ID_OBJECT_MAP.set(face.uuid, mesh);
    group.add(mesh);
    return mesh;
  });
  group.points = points.map((point) => {
    const points = createBrepObject(point, pointMaterial, BrepObjectType.POINT);
    ID_OBJECT_MAP.set(point.uuid, points);
    group.add(points);
    return points;
  });
  group.lines = lines.map((line) => {
    const lines = createBrepObject(line as unknown as LineSegmentsGeometry, lineMaterial, BrepObjectType.LINE);
    ID_OBJECT_MAP.set(line.uuid, lines);
    group.add(lines);
    return lines;
  });
  group.dispose = () => {
    faces.forEach((face) => {
      ID_OBJECT_MAP.delete(face.uuid);
      face.dispose();
    });
    points.forEach((point) => {
      ID_OBJECT_MAP.delete(point.uuid);
      point.dispose();
    });
    lines.forEach((line) => {
      ID_OBJECT_MAP.delete(line.uuid);
      line.dispose();
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
      return createLineMaterial(color);
  }
}


export function createGPUBrepGroup(brepMesh: BrepGroup): BrepGroup {
  const group = new THREE.Group() as BrepGroup;
  group.position.copy(brepMesh.position);
  group.scale.copy(brepMesh.scale);
  group.quaternion.copy(brepMesh.quaternion);
  group.faces = brepMesh.faces.map((face) => {
    const material = createGPUObjectMaterial(face.objectId, 'face');
    const mesh = createBrepObject(face.geometry, material, BrepObjectType.MESH, false);
    mesh.position.copy(face.position);
    mesh.scale.copy(face.scale);
    mesh.quaternion.copy(face.quaternion);
    group.add(mesh);
    return mesh;
  });
  group.points = brepMesh.points.map((point) => {
    const material = createGPUObjectMaterial(point.objectId, 'point');
    const points = createBrepObject(point.geometry, material, BrepObjectType.POINT, false);
    points.position.copy(point.position);
    points.scale.copy(point.scale);
    points.quaternion.copy(point.quaternion);
    group.add(points);
    return points;
  });
  group.lines = brepMesh.lines.map((line) => {
    const material = createGPUObjectMaterial(line.objectId, 'line') as LineMaterial;
    const lines = createBrepObject(line.geometry, material, BrepObjectType.LINE, false);
    lines.position.copy(line.position);
    lines.scale.copy(line.scale);
    lines.quaternion.copy(line.quaternion);
    group.add(lines);
    return lines;
  });

  group.dispose = () => {
    group.faces.forEach((face) => {
      face.dispose();
    });
    group.points.forEach((point) => {
      point.dispose();
    });
    group.lines.forEach((line) => {
      line.dispose();
    });
  }

  return group;
}

