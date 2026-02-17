import * as THREE from 'three';
import { LineMaterial } from 'three/addons';
import type { BRepResult, Edge, Face, Vertex } from './brep-result';
import { BrepObjectType } from './types';
import { convertLineLoopToLineSegments, id2color } from './utils';
import { TopoDS_Shape } from 'public/occt-wasm';
import { OBJECT_MANAGER } from './object-manager';
import { 
  BrepFace, 
  BrepGeometry, 
  BrepGeometryType, 
  BrepLineGeometry, 
  BrepObject, 
  BrepObjectAll,
  BrepPoint,
  BrepEdge,
  BrepGroup,
  BrepGPUEdge,
  BrepGPUGroup,
} from './object';

export const POINT_SIZE = 5;
export const LINE_WIDTH = 2;
const FACE_COLOR = 0x4a90e2;



export function getObjectById(id: string): BrepObjectAll | undefined {
  return OBJECT_MANAGER.getObject(id);
}

function wrapMaterial(material: THREE.Material): void {
  const originalDispose = material.dispose.bind(material);
  material.dispose = () => {
    originalDispose();
    const { map } = material as THREE.MeshBasicMaterial;
    if (map) {
      map.dispose();
    }
  };
}

type ResultGeometry = {
  points: BrepGeometry<Vertex>[];
  edges: BrepLineGeometry[];
  faces: BrepGeometry<Face>[];
}

export function parseBRepResult2Geometry(result: BRepResult): ResultGeometry {
  const { vertices, edges, faces } = result;
  const [pointsGeo, edgesGeo, facesGeo]: [BrepGeometry<Vertex>[], BrepLineGeometry[], BrepGeometry<Face>[]] = [[], [], []];

  vertices.forEach((vertex) => {
    const geometry = new BrepGeometry(vertex);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertex.position, 3));
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
    const geometry = new BrepLineGeometry(edge);
    geometry.setPositions(lineSegments);
    edgesGeo.push(geometry);
  });


  faces.forEach((face) => {
    const geometry = new BrepGeometry(face);
    geometry.setAttribute('position', new THREE.BufferAttribute(face.position, 3));
    geometry.setIndex([...face.index]);
    geometry.setAttribute('uv', new THREE.BufferAttribute(face.uvs, 2));
    facesGeo.push(geometry);
    geometry.computeVertexNormals();
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
  geometry: BrepGeometry<Face>,
  material: THREE.Material,
  type: BrepObjectType.FACE,
): BrepFace;
function createBrepObject(
  geometry: BrepGeometry<Vertex>,
  material: THREE.Material,
  type: BrepObjectType.POINT,
): BrepPoint;
function createBrepObject(
  geometry: BrepLineGeometry,
  material: LineMaterial,
  type: BrepObjectType.EDGE,
): BrepEdge;
function createBrepObject(
  geometry: BrepGeometryType,
  material: THREE.Material | LineMaterial,
  type: BrepObjectType,
): BrepObject {
  let object: BrepObjectAll;

  switch (type) {
    case BrepObjectType.FACE:
      object = new BrepFace(geometry as BrepGeometry<Face>, material as THREE.Material);
      break;
    case BrepObjectType.POINT:
      object = new BrepPoint(geometry as BrepGeometry<Vertex>, material as THREE.Material);
      break;
    case BrepObjectType.EDGE:
      object = new BrepEdge(geometry as BrepLineGeometry, material as LineMaterial);
      break;
  }

  OBJECT_MANAGER.addObject(geometry.objectId, object);
  return object;
}


export function createBrepGroup(shape: TopoDS_Shape, brepResult: BRepResult, material: THREE.Material = faceMaterial): BrepGroup {
  material.polygonOffset = true;
  material.polygonOffsetUnits = 1;
  material.polygonOffsetFactor = 1;

  wrapMaterial(material);

  const { points, edges, faces } = parseBRepResult2Geometry(brepResult);
  const group = new BrepGroup(shape);

  group.faces = faces.map((faceGeo) => {
    const mesh = createBrepObject(faceGeo, material, BrepObjectType.FACE);
    group.add(mesh);
    return mesh;
  });
  group.points = points.map((pointGeo) => {
    const point = createBrepObject(pointGeo, pointMaterial, BrepObjectType.POINT);
    group.add(point);
    return point;
  });
  group.edges = edges.map((edgeGeo) => {
    const edge = createBrepObject(edgeGeo, lineMaterial, BrepObjectType.EDGE);
    group.add(edge);
    return edge;
  });
  return group;
}

/** GPU 拾取用材质：GPUPickScene 无灯光，face 必须用 MeshBasicMaterial 否则面片全黑无法 pick */
function createGPUObjectMaterial(id: string, type: BrepObjectType) {
  const [r, g, b] = id2color(parseInt(id)).map(v => v / 255);
  const color = new THREE.Color().setRGB(r, g, b);
  switch (type) {
    case BrepObjectType.FACE:
      return new THREE.MeshBasicMaterial({ color, polygonOffset: true, polygonOffsetUnits: 1, polygonOffsetFactor: 1 });
    case BrepObjectType.POINT:
      return createPointMaterial(color);
    case BrepObjectType.EDGE:
      return new THREE.LineBasicMaterial({ color, polygonOffset: true, polygonOffsetUnits: 4, polygonOffsetFactor: -1 });
  }
}

function createGPUBrepObject(
  geometry: BrepGeometry<Face>,
  material: THREE.Material,
  type: BrepObjectType.FACE,
): BrepFace;
function createGPUBrepObject(
  geometry: BrepGeometry<Vertex>,
  material: THREE.Material,
  type: BrepObjectType.POINT,
): BrepPoint;
function createGPUBrepObject(
  geometry: BrepGeometry<Edge>,
  material: THREE.Material,
  type: BrepObjectType.EDGE,
): BrepGPUEdge;
function createGPUBrepObject(geometry: BrepGeometryType, material: THREE.Material, type: BrepObjectType): BrepFace | BrepPoint | BrepGPUEdge {
  switch (type) {
    case BrepObjectType.FACE:
      return new BrepFace(geometry as BrepGeometry<Face>, material);
    case BrepObjectType.POINT:
      return new BrepPoint(geometry as BrepGeometry<Vertex>, material);
    case BrepObjectType.EDGE:
      return new BrepGPUEdge(geometry as BrepGeometry<Edge>, material);
  }
}


export function createGPUBrepGroup(brepGroup: BrepGroup): BrepGPUGroup {
  const group = new BrepGPUGroup();
  group.position.copy(brepGroup.position);
  group.scale.copy(brepGroup.scale);
  group.quaternion.copy(brepGroup.quaternion);
  group.faces = brepGroup.faces.map((face) => {
    const material = createGPUObjectMaterial(face.objectId, BrepObjectType.FACE);
    const faceObject = createGPUBrepObject(face.geometry, material, BrepObjectType.FACE);
    faceObject.position.copy(face.position);
    faceObject.scale.copy(face.scale);
    faceObject.quaternion.copy(face.quaternion);
    group.add(faceObject);
    return faceObject;
  });
  group.points = brepGroup.points.map((point) => {
    const material = createGPUObjectMaterial(point.objectId, BrepObjectType.POINT);
    const pointObject = createGPUBrepObject(point.geometry, material, BrepObjectType.POINT);
    pointObject.position.copy(point.position);
    pointObject.scale.copy(point.scale);
    pointObject.quaternion.copy(point.quaternion);
    group.add(pointObject);
    return pointObject;
  });
  group.edges = brepGroup.edges.map((edge) => {
    const material = createGPUObjectMaterial(edge.objectId, BrepObjectType.EDGE);
    const geometry = new BrepGeometry<Edge>({} as Edge);
    geometry.setAttribute('position', new THREE.BufferAttribute((edge.geometry as any).data.position, 3));
    const edgeObject = createGPUBrepObject(geometry, material, BrepObjectType.EDGE);
    edgeObject.position.copy(edge.position);
    edgeObject.scale.copy(edge.scale);
    edgeObject.quaternion.copy(edge.quaternion);
    group.add(edgeObject);
    return edgeObject;
  });
  return group;
}

