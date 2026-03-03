import * as THREE from 'three';
import { LineMaterial } from 'three/addons';
import type { BRepResult, Edge, Face, Vertex } from './brep-result';
import { BrepNodeType } from './types';
import { convertLineLoopToLineSegments, id2color } from './utils';
import { TopoDS_Shape, ShapeNode } from 'public/occt-wasm';
import { OBJECT_MANAGER } from './object-manager';
import {
  BrepFace,
  BrepGeometry,
  BrepGeometryType,
  BrepLineGeometry,
  BrepPoint,
  BrepEdge,
  BrepMesh,
  BrepCompound,
  BrepGPUEdge,
  BrepGPUGroup,
  BrepNodes,
} from './object';
import { getOCCTModule } from '@/sdk';

export const POINT_SIZE = 5;
export const LINE_WIDTH = 2;
const FACE_COLOR = 0x4a90e2;



export function getObjectById(id: string): BrepNodes | undefined {
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
    geometry.setAttribute('uv', new THREE.BufferAttribute(face.uv, 2));
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
  type: BrepNodeType.FACE,
): BrepFace;
function createBrepObject(
  geometry: BrepGeometry<Vertex>,
  material: THREE.Material,
  type: BrepNodeType.POINT,
): BrepPoint;
function createBrepObject(
  geometry: BrepLineGeometry,
  material: LineMaterial,
  type: BrepNodeType.EDGE,
): BrepEdge;
function createBrepObject(
  geometry: BrepGeometryType,
  material: THREE.Material | LineMaterial,
  type: BrepNodeType,
):BrepEdge | BrepPoint | BrepFace {
  let object: BrepEdge | BrepPoint | BrepFace;

  switch (type) {
    case BrepNodeType.FACE:
      object = new BrepFace(geometry as BrepGeometry<Face>, material as THREE.Material);
      break;
    case BrepNodeType.POINT:
      object = new BrepPoint(geometry as BrepGeometry<Vertex>, material as THREE.Material);
      break;
    case BrepNodeType.EDGE:
      object = new BrepEdge(geometry as BrepLineGeometry, material as LineMaterial);
      break;
  }

  OBJECT_MANAGER.addObject(geometry.objectId, object);
  return object;
}


export function createBrepMesh(shape: TopoDS_Shape, brepResult: BRepResult, material: THREE.Material = faceMaterial): BrepMesh {
  material.polygonOffset = true;
  material.polygonOffsetUnits = 1;
  material.polygonOffsetFactor = 1;

  wrapMaterial(material);

  const { points, edges, faces } = parseBRepResult2Geometry(brepResult);
  const mesh = new BrepMesh(shape);

  mesh.faces = faces.map((faceGeo) => {
    const faceMesh = createBrepObject(faceGeo, material, BrepNodeType.FACE);
    mesh.add(faceMesh);
    return faceMesh;
  });
  mesh.points = points.map((pointGeo) => {
    const point = createBrepObject(pointGeo, pointMaterial, BrepNodeType.POINT);
    mesh.add(point);
    return point;
  });
  mesh.edges = edges.map((edgeGeo) => {
    const edge = createBrepObject(edgeGeo, lineMaterial, BrepNodeType.EDGE);
    mesh.add(edge);
    return edge;
  });
  mesh.computeBoundingBox();
  return mesh;
}

/** GPU 拾取用材质：GPUPickScene 无灯光，face 必须用 MeshBasicMaterial 否则面片全黑无法 pick */
function createGPUObjectMaterial(id: string, type: BrepNodeType) {
  const [r, g, b] = id2color(parseInt(id)).map(v => v / 255);
  const color = new THREE.Color().setRGB(r, g, b);
  switch (type) {
    case BrepNodeType.FACE:
      return new THREE.MeshBasicMaterial({ color, polygonOffset: true, polygonOffsetUnits: 1, polygonOffsetFactor: 1 });
    case BrepNodeType.POINT:
      return createPointMaterial(color);
    case BrepNodeType.EDGE:
      return new THREE.LineBasicMaterial({ color, polygonOffset: true, polygonOffsetUnits: 4, polygonOffsetFactor: -1 });
  }
}

function createGPUBrepObject(
  geometry: BrepGeometry<Face>,
  material: THREE.Material,
  type: BrepNodeType.FACE,
): BrepFace;
function createGPUBrepObject(
  geometry: BrepGeometry<Vertex>,
  material: THREE.Material,
  type: BrepNodeType.POINT,
): BrepPoint;
function createGPUBrepObject(
  geometry: BrepGeometry<Edge>,
  material: THREE.Material,
  type: BrepNodeType.EDGE,
): BrepGPUEdge;
function createGPUBrepObject(geometry: BrepGeometryType, material: THREE.Material, type: BrepNodeType): BrepFace | BrepPoint | BrepGPUEdge {
  switch (type) {
    case BrepNodeType.FACE:
      return new BrepFace(geometry as BrepGeometry<Face>, material);
    case BrepNodeType.POINT:
      return new BrepPoint(geometry as BrepGeometry<Vertex>, material);
    case BrepNodeType.EDGE:
      return new BrepGPUEdge(geometry as BrepGeometry<Edge>, material);
  }
}


export function createGPUBrepGroup(brepMesh: BrepMesh): BrepGPUGroup {
  const group = new BrepGPUGroup();
  group.position.copy(brepMesh.position);
  group.scale.copy(brepMesh.scale);
  group.quaternion.copy(brepMesh.quaternion);
  group.faces = brepMesh.faces.map((face) => {
    const material = createGPUObjectMaterial(face.objectId, BrepNodeType.FACE);
    const faceObject = createGPUBrepObject(face.geometry, material, BrepNodeType.FACE);
    faceObject.position.copy(face.position);
    faceObject.scale.copy(face.scale);
    faceObject.quaternion.copy(face.quaternion);
    group.add(faceObject);
    return faceObject;
  });
  group.points = brepMesh.points.map((point) => {
    const material = createGPUObjectMaterial(point.objectId, BrepNodeType.POINT);
    const pointObject = createGPUBrepObject(point.geometry, material, BrepNodeType.POINT);
    pointObject.position.copy(point.position);
    pointObject.scale.copy(point.scale);
    pointObject.quaternion.copy(point.quaternion);
    group.add(pointObject);
    return pointObject;
  });
  group.edges = brepMesh.edges.map((edge) => {
    const material = createGPUObjectMaterial(edge.objectId, BrepNodeType.EDGE);
    const geometry = new BrepGeometry<Edge>({} as Edge);
    geometry.setAttribute('position', new THREE.BufferAttribute((edge.geometry as any).data.position, 3));
    const edgeObject = createGPUBrepObject(geometry, material, BrepNodeType.EDGE);
    edgeObject.position.copy(edge.position);
    edgeObject.scale.copy(edge.scale);
    edgeObject.quaternion.copy(edge.quaternion);
    group.add(edgeObject);
    return edgeObject;
  });
  return group;
}

/** 递归收集 ShapeNode 树中所有 shape（用于导出 Compound） */
export function collectShapesFromShapeNode(node: ShapeNode): TopoDS_Shape[] {
  const result: TopoDS_Shape[] = [];
  if (node.shape != null && !node.shape.isDeleted()) {
    result.push(node.shape);
  }
  const children = node.getChildren();
  if (children && children.length > 0) {
    for (let i = 0; i < children.length; i++) {
      result.push(...collectShapesFromShapeNode(children[i]));
    }
  }
  return result;
}

const checkShape = (shape: TopoDS_Shape | undefined): boolean => {
  return shape != null && !shape.isDeleted();
}

const getMaterial = (color: string | undefined | number | THREE.Color): THREE.Material => {
  return color ? createFaceMaterial(color) : faceMaterial;
}

/** ShapeNode 转为场景对象：有 shape 为 BrepMesh，无 shape 有 children 为 BrepCompound */
export function shapeNodeToBrepRenderNode(node: ShapeNode, defaultMaterial: THREE.Material = faceMaterial): BrepMesh | BrepCompound {
  const { Shape, TopAbs_ShapeEnum } = getOCCTModule();
  if (checkShape(node.shape)) {
    // 判断是否为 Compound
    if (node.shape!.shapeType() === TopAbs_ShapeEnum.TopAbs_COMPOUND || node.shape!.shapeType() === TopAbs_ShapeEnum.TopAbs_COMPSOLID) {
      const compound = new BrepCompound(node.shape!);
      node.name && (compound.name = node.name);
      const children = node.getChildren();
      if (children && children.length > 0) {
        for (let i = 0; i < children.length; i++) {
          compound.add(shapeNodeToBrepRenderNode(children[i], defaultMaterial));
        }
      }
      compound.computeBoundingBox();
      return compound;
    } else {
      const material = getMaterial(node.color);
      const brepResult = Shape.toBRepResult(node.shape!, 0.1, 0.5);
      const mesh = createBrepMesh(node.shape!, brepResult, material);
      node.name && (mesh.name = node.name);
      return mesh;
    }
  } 
  throw new Error('ShapeNode is not a valid shape');
}

/** 递归收集对象树中所有 BrepMesh（用于 add/remove BrepCompound 时的 GPU 注册） */
export function collectBrepMeshes(node: THREE.Object3D): BrepMesh[] {
  const result: BrepMesh[] = [];
  node.traverse((child) => {
    if (child instanceof BrepMesh) {
      result.push(child);
    }
  });
  return result;
}

