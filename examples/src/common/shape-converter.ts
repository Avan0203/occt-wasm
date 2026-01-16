import * as THREE from 'three';

export interface MeshData {
  positions: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  uvs: Float32Array;
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
