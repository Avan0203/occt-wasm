/*
 * @Author: wuyifan wuyifan@udschina.com
 * @Date: 2026-01-20 15:22:16
 * @LastEditors: wuyifan wuyifan@udschina.com
 * @LastEditTime: 2026-01-29 17:52:41
 * @FilePath: \occt-wasm\examples\src\common\shape-converter.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import * as THREE from 'three';
import { LineMaterial, LineSegmentsGeometry, LineSegments2 } from 'three/addons';
import type { BRepResult } from './BRepResult';
import { TopoDS_Shape } from 'public/occt-wasm';
import { ObjectID } from './id-tool';

export interface MeshData {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  uvs: Float32Array;
}

const usedIds = new Map<string, ObjectID>();

export interface BrepGeometry extends THREE.BufferGeometry {
  shape: TopoDS_Shape;
}

/**
 * 对索引数组进行偏移
 * @param indices 原始索引数组
 * @param offset 偏移量
 * @returns 偏移后的索引数组
 */
export function indexOffset(indices: number[], offset: number): number[] {
  return indices.map(idx => idx + offset);
}

function wrapBrepGeometry(geometry: BrepGeometry):void {
  geometry.addEventListener('dispose', () => {
    if (usedIds.has(geometry.uuid)) {
      ObjectID.release(usedIds.get(geometry.uuid)!);
      usedIds.delete(geometry.uuid);
    }
    if (geometry.shape.isDeleted()) {
      geometry.shape.deleteLater();
    }
  });
}

export function parseBRepResult2Geometry(result: BRepResult): { points: BrepGeometry[], lines: BrepGeometry[], faces: BrepGeometry[] } {
  const { vertices, edges, faces } = result;
  const [pointsGeo, linesGeo, facesGeo] = [[],[],[]] as BrepGeometry[][];

  vertices.forEach((vertex) => {
    const geometry = new THREE.BufferGeometry() as BrepGeometry;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertex.position, 3));
    const id = ObjectID.generate();
    geometry.uuid = id.toString();
    usedIds.set(id.toString(), id);

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
    const id = ObjectID.generate();
    geometry.uuid = id.toString();
    usedIds.set(id.toString(), id);
    geometry.shape = edge.shape;
    wrapBrepGeometry(geometry);
    linesGeo.push(geometry);
  });


  faces.forEach((face) => {
    const geometry = new THREE.BufferGeometry() as BrepGeometry;
    geometry.setAttribute('position', new THREE.BufferAttribute(face.position, 3));
    geometry.setIndex([...face.index]);
    geometry.setAttribute('uv', new THREE.BufferAttribute(face.uvs, 2));

    const id = ObjectID.generate();
    geometry.uuid = id.toString();
    usedIds.set(id.toString(), id); 
    geometry.shape = face.shape;
    wrapBrepGeometry(geometry);
    facesGeo.push(geometry);
    geometry.computeVertexNormals();

  });


  return { points: pointsGeo, lines: linesGeo, faces: facesGeo };
}

/**
 * @description: 将LineLoop转换成LineSegment
 * @param {number[]} position 位置数组
 * @return {number[]}
 * @example
 * 例如将LineLoop四个点分为1,2,3,4，
 * 转换后变成，1,2,2,3,3,4
 */
function convertLineLoopToLineSegments(position: Float32Array): Float32Array {
  const result: number[] = [];
  // 每个点由 3 个分量组成 (x, y, z)
  const stride = 3;
  const count = position.length / stride;
  // 少于 2 个点，无法形成线段
  if (count < 2) return new Float32Array(0);

  for (let i = 0; i < count - 1; i++) {
    const a = i * stride;
    const b = (i + 1) * stride;

    // 当前点 -> 下一个点
    result.push(
      position[a], position[a + 1], position[a + 2],
      position[b], position[b + 1], position[b + 2]
    );
  }
  return new Float32Array(result);
}


const pointMaterial = new THREE.PointsMaterial({ color: 0x000000, size: 0.01 });
const lineMaterial = new LineMaterial({ color: 0x000000, linewidth: 2 });
const faceMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });



export interface BrepMeshGroup extends THREE.Group {
  faces: THREE.Mesh[];
  points: THREE.Points[];
  lines: LineSegments2[];
  dispose: () => void;
}



export function createBrepMesh(brepResult: BRepResult, material: THREE.Material = faceMaterial): BrepMeshGroup {
  const { points, lines, faces } = parseBRepResult2Geometry(brepResult);
  const group = new THREE.Group() as BrepMeshGroup;
  group.faces = faces.map((face) => {
    const mesh = new THREE.Mesh(face, material);
    group.add(mesh);
    return mesh;
  });
  group.points = points.map((point) => {
    const points = new THREE.Points(point, pointMaterial);
    group.add(points);
    return points;
  });
  group.lines = lines.map((line) => {
    const lines = new LineSegments2(line as unknown as LineSegmentsGeometry, lineMaterial);
    group.add(lines);
    return lines;
  });
  group.dispose = () => {
    faces.forEach((face) => {
      face.dispose();
    });
    points.forEach((point) => {
      point.dispose();
    });
    lines.forEach((line) => {
      line.dispose();
    });
  }
  return group;
}