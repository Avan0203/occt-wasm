/*
 * @Author: wuyifan wuyifan@udschina.com
 * @Date: 2026-01-20 15:22:16
 * @LastEditors: wuyifan wuyifan@udschina.com
 * @LastEditTime: 2026-01-22 18:04:04
 * @FilePath: \occt-wasm\examples\src\common\shape-converter.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import * as THREE from 'three';
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

/**
 * 将 occt-wasm 的网格数据转换为 Three.js BufferGeometry
 */
export function createGeometryFromMesh(meshData: MeshData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  // 设置顶点位置
  geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));

  // 设置索引
  if (meshData.indices.length > 0) {
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
  }

  // 设置法线
  if (meshData.normals.length > 0) {
    geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
  } else {
    // 如果没有法线，自动计算
    geometry.computeVertexNormals();
  }

  // 设置 UV 坐标
  if (meshData.uvs.length > 0) {
    geometry.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2));
  }

  return geometry;
}


/**
 * 创建带材质的 Mesh 对象
 */
export function createMeshFromGeometry(
  geometry: THREE.BufferGeometry,
  material?: THREE.Material
): THREE.Mesh {
  const defaultMaterial = material || new THREE.MeshStandardMaterial({
    color: 0x4a90e2,
    metalness: 0.3,
    roughness: 0.7,
  });

  return new THREE.Mesh(geometry, defaultMaterial);
}
