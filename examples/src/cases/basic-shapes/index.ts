import { Case, CaseContext } from '../../router';
import { meshShape } from '../../common/occt-loader';
import { ThreeRenderer } from '../../common/three-renderer';
import { createGeometryFromMesh, createMeshFromGeometry } from '../../common/shape-converter';
import * as THREE from 'three';
import { MainModule } from 'public/occt-wasm';

let renderer: ThreeRenderer | null = null;

const colors = {
  box: 0x4a90e2,
  sphere: 0x50c878,
  cylinder: 0xe74c3c,
  cone: 0xf39c12,
  torus: 0x9b59b6,
};

/**
 * 创建 Box
 */
async function createBox(occtModule: MainModule): Promise<THREE.Mesh> {
  const makeBox = new occtModule.BRepPrimAPI_MakeBox(2, 2, 2);
  const shape = makeBox.shape();
  const meshData = await meshShape(shape, 1);
  shape.deleteLater();
  makeBox.deleteLater();

  return createMeshFromGeometry(
    createGeometryFromMesh(meshData),
    new THREE.MeshStandardMaterial({
      color: colors.box,
      metalness: 0.3,
      roughness: 0.7,
    })
  );
}

/**
 * 创建 Sphere
 */
async function createSphere(occtModule: any): Promise<THREE.Mesh> {
  const makeSphere = new occtModule.BRepPrimAPI_MakeSphere(1.5);
  const shape = makeSphere.shape();
  const meshData = await meshShape(shape, 1);
  const geometry = createGeometryFromMesh(meshData);
  const material = new THREE.MeshStandardMaterial({
    color: colors.sphere,
    metalness: 0.3,
    roughness: 0.7,
  });
  shape.deleteLater();
  makeSphere.deleteLater();
  return createMeshFromGeometry(geometry, material);
}

/**
 * 创建 Cylinder
 */
async function createCylinder(occtModule: any): Promise<THREE.Mesh> {
  const makeCylinder = new occtModule.BRepPrimAPI_MakeCylinder(1, 3);
  const shape = makeCylinder.shape();
  const meshData = await meshShape(shape, 1);
  const geometry = createGeometryFromMesh(meshData);
  const material = new THREE.MeshStandardMaterial({
    color: colors.cylinder,
    metalness: 0.3,
    roughness: 0.7,
  });

  shape.deleteLater();
  makeCylinder.deleteLater();
  return createMeshFromGeometry(geometry, material);
}

/**
 * 创建 Cone
 */
async function createCone(occtModule: any): Promise<THREE.Mesh> {
  const makeCone = new occtModule.BRepPrimAPI_MakeCone(1.5, 0.5, 3);
  const shape = makeCone.shape();
  const meshData = await meshShape(shape, 1);
  shape.deleteLater();
  makeCone.deleteLater();
  const geometry = createGeometryFromMesh(meshData);
  const material = new THREE.MeshStandardMaterial({
    color: colors.cone,
    metalness: 0.3,
    roughness: 0.7,
  });
  return createMeshFromGeometry(geometry, material);
}

/**
 * 创建 Torus
 */
async function createTorus(occtModule: any): Promise<THREE.Mesh> {
  const makeTorus = new occtModule.BRepPrimAPI_MakeTorus(1.5, 0.5);
  const shape = makeTorus.shape();
  const meshData = await meshShape(shape, 1);
  shape.deleteLater();
  makeTorus.deleteLater();
  const geometry = createGeometryFromMesh(meshData);
  const material = new THREE.MeshStandardMaterial({
    color: colors.torus,
    metalness: 0.3,
    roughness: 0.7,
  });
  return createMeshFromGeometry(geometry, material);
}


/**
 * 加载案例
 */
async function load(context: CaseContext): Promise<void> {
  const { container, occtModule } = context;

  try {
    container.innerHTML = '';
    renderer = new ThreeRenderer(container);

    // 创建所有形状
    const box = await createBox(occtModule);
    box.position.set(0, 0, 0);
    renderer.add(box);

    const sphere = await createSphere(occtModule);
    sphere.position.set(4, 0, 0);
    renderer.add(sphere);

    const cylinder = await createCylinder(occtModule);
    cylinder.position.set(4, 0, 4);
    renderer.add(cylinder);

    const cone = await createCone(occtModule);
    cone.position.set(-4, 0, 4);
    renderer.add(cone);

    const torus = await createTorus(occtModule);
    torus.position.set(0, 0, -4);
    renderer.add(torus);

    renderer.fitToView();
  } catch (error) {
    console.error('[BasicShapes] Failed to load case:', error);
    container.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error instanceof Error ? error.message : String(error)}</div>`;
    throw error;
  }
}

/**
 * 卸载案例
 */
async function unload(context: CaseContext): Promise<void> {
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
}

export const basicShapesCase: Case = {
  id: 'basic-shapes',
  name: 'Basic Shapes',
  description: 'Display basic geometric shapes: Box, Sphere, Cylinder, Cone, and Torus',
  load,
  unload,
};
