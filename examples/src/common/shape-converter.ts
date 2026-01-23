/*
 * @Author: wuyifan wuyifan@udschina.com
 * @Date: 2026-01-20 15:22:16
 * @LastEditors: wuyifan wuyifan@udschina.com
 * @LastEditTime: 2026-01-23 17:53:44
 * @FilePath: \occt-wasm\examples\src\common\shape-converter.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import * as THREE from 'three';
import { Line2, LineGeometry, LineMaterial } from 'three/addons';
import type { BRepResult } from './BRepResult';

export interface MeshData {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  uvs: Float32Array;
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

let count = 0;
export function parseBRepResult(result: BRepResult) {
  const { vertices, edges, faces } = result;

  const pointGeo = new THREE.BufferGeometry();
  const lineGeo = new THREE.BufferGeometry();
  const faceGeo = new THREE.BufferGeometry();

  const pointBuffer: number[] = [];
  const lineBuffer: number[] = [];
  const faceBuffer: number[] = [];
  const faceIndexBuffer: number[] = [];
  const faceUvBuffer: number[] = [];

  count = 0;
  vertices.forEach((vertex, index) => {
    pointBuffer.push(...vertex.position);
    pointGeo.groups.push({ start: count, count: vertex.position.length / 3, materialIndex: index, shape: vertex.shape } as THREE.GeometryGroup);
    count += vertex.position.length / 3;
  });

  pointGeo.setAttribute('position', new THREE.Float32BufferAttribute(pointBuffer, 3));

  count = 0;
  edges.forEach((edge, index) => {
    lineBuffer.push(...edge.position);
    lineGeo.groups.push({ start: count, count: edge.position.length / 3, materialIndex: index, shape: edge.shape } as THREE.GeometryGroup);
    count += edge.position.length / 3;
  });

  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineBuffer, 3));

  // 处理 faces：需要合并顶点并对索引进行偏移
  let vertexOffset = 0; // 顶点偏移量
  count = 0;  // 索引缓冲区偏移量（用于 groups.start）
  faces.forEach((face, index) => {
    // 添加顶点位置
    faceBuffer.push(...face.position);

    // 对索引进行偏移并添加到索引缓冲区
    const offsetIndices = indexOffset(face.index, vertexOffset);
    faceIndexBuffer.push(...offsetIndices);
    faceUvBuffer.push(...face.uvs);
    // groups.start 基于索引缓冲区的位置，count 是索引数量
    faceGeo.groups.push({
      start: count,
      count: face.index.length,
      materialIndex: index,
      shape: face.shape
    } as THREE.GeometryGroup);

    // 更新偏移量
    vertexOffset += face.position.length / 3; // 每个顶点3个分量
    count += face.index.length;
  });

  faceGeo.setAttribute('position', new THREE.Float32BufferAttribute(faceBuffer, 3));
  faceGeo.setIndex(faceIndexBuffer);
  faceGeo.computeVertexNormals();

  return { points: pointGeo, lines: lineGeo, faces: faceGeo };
}


const pointMaterial = new THREE.PointsMaterial({ color: 0x000000, size: 0.01 });
const lineMaterial = new LineMaterial({ color: 0x000000, linewidth: 2 });
const faceMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90e2 });


export type BrepMeshGroup = THREE.Group & { faces: THREE.Mesh, points: THREE.Points, lines: Line2 };

export function createBrepMesh(brepResult: BRepResult, material: THREE.Material = faceMaterial): BrepMeshGroup {
  const { points, lines, faces } = parseBRepResult(brepResult);
  const group = new THREE.Group() as BrepMeshGroup;
  const facesMesh = new THREE.Mesh(faces, material);
  const pointsMesh = new THREE.Points(points, pointMaterial);
  const lineGeometry = new LineGeometry().setPositions(lines.attributes.position.array as unknown as number[]);
  const linesMesh = new Line2(lineGeometry, lineMaterial);
  group.faces = facesMesh;
  group.points = pointsMesh;
  group.lines = linesMesh;
  group.add(pointsMesh);
  group.add(linesMesh);
  group.add(facesMesh);
  return group;
}