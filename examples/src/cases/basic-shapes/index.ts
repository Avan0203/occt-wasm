import { Case, CaseContext } from '../../router';
import { ThreeRenderer } from '../../common/three-renderer';
import { createBrepGroup } from '../../common/shape-converter';
import * as THREE from 'three';
import { MainModule } from 'public/occt-wasm';
import { BrepGroup } from '@/common/object';

let renderer: ThreeRenderer | null = null;

const colors = {
  box: 0x4a90e2,
  sphere: 0x50c878,
  cylinder: 0xe74c3c,
  cone: 0xff9900,
  torus: 0x9b59b6,
};

const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('/matcaps_64px.png');

/**
 * 创建 Box
 */
async function createBox(occtModule: MainModule): Promise<BrepGroup> {
  const makeBox = new occtModule.BRepPrimAPI_MakeBox(2, 2, 2);
  const shape = makeBox.shape();
  shape.deleteLater();
  makeBox.deleteLater();

  console.log(occtModule.Mesher.shapeToBRepResult(shape, 0.1, 0.5));

  return createBrepGroup(
    shape,
    occtModule.Mesher.shapeToBRepResult(shape, 0.1, 0.5),
    new THREE.MeshMatcapMaterial({
      matcap: texture,
      color: colors.box,
    })
  );
}

/**
 * 创建 Sphere
 */
async function createSphere(occtModule: MainModule): Promise<BrepGroup> {
  const makeSphere = new occtModule.BRepPrimAPI_MakeSphere(1.5);
  const shape = makeSphere.shape();
  const material = new THREE.MeshMatcapMaterial({
    matcap: texture,
    color: colors.sphere,
  });
  shape.deleteLater();
  makeSphere.deleteLater();
  return createBrepGroup(shape,occtModule.Mesher.shapeToBRepResult(shape, 0.1, 0.5), material);
}

/**
 * 创建 Cylinder
 */
async function createCylinder(occtModule: MainModule): Promise<BrepGroup> {
  const makeCylinder = new occtModule.BRepPrimAPI_MakeCylinder(1, 3);
  const shape = makeCylinder.shape();
  const material = new THREE.MeshMatcapMaterial({
    matcap: texture,
    color: colors.cylinder,
  });

  shape.deleteLater();
  makeCylinder.deleteLater();
  return createBrepGroup(shape, occtModule.Mesher.shapeToBRepResult(shape, 0.1, 0.5), material);
}

/**
 * 创建 Cone
 */
async function createCone(occtModule: MainModule): Promise<BrepGroup> {
  const makeCone = new occtModule.BRepPrimAPI_MakeCone(1.5, 0.5, 3);
  const shape = makeCone.shape();
  shape.deleteLater();
  makeCone.deleteLater();
  const material = new THREE.MeshMatcapMaterial({
    color: colors.cone,
    matcap: texture,
  });
  return createBrepGroup(shape, occtModule.Mesher.shapeToBRepResult(shape, 0.1, 0.5), material);
}

/**
 * 创建 Torus
 */
async function createTorus(occtModule: any): Promise<BrepGroup> {
  const makeTorus = new occtModule.BRepPrimAPI_MakeTorus(1.5, 0.5);
  const shape = makeTorus.shape();
  shape.deleteLater();
  makeTorus.deleteLater();
  const material = new THREE.MeshMatcapMaterial({
    color: colors.torus,
    matcap: texture,
  });
  return createBrepGroup(shape, occtModule.Mesher.shapeToBRepResult(shape, 0.1, 0.5), material);
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
