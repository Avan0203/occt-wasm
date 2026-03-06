import { Case, CaseContext } from '@/router';
import { createBrepMesh } from '@/common/shape-converter';
import * as THREE from 'three';
import { MainModule } from 'public/occt-wasm';
import { BrepMesh } from '@/common/object';
import { App } from '@/common/app';
import { ShapeFactory, Shape } from '@/sdk';

let app: App | null = null;

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
async function createBox(): Promise<BrepMesh> {
  const shape = ShapeFactory.Box(2, 2, 2);
  return createBrepMesh(
    shape,
    Shape.toBRepResult(shape, 0.1, 0.5),
    new THREE.MeshMatcapMaterial({
      matcap: texture,
      color: colors.box,
    })
  );
}

/**
 * 创建 Sphere
 */
async function createSphere(): Promise<BrepMesh> {
  const shape = ShapeFactory.Sphere(1.5);
  const material = new THREE.MeshMatcapMaterial({
    matcap: texture,
    color: colors.sphere,
  });
  return createBrepMesh(shape,Shape.toBRepResult(shape, 0.1, 0.5), material);
}

/**
 * 创建 Cylinder
 */
async function createCylinder(): Promise<BrepMesh> {
  const shape = ShapeFactory.Cylinder(1, 3);
  const material = new THREE.MeshMatcapMaterial({
    matcap: texture,
    color: colors.cylinder,
  });

  return createBrepMesh(shape, Shape.toBRepResult(shape, 0.1, 0.5), material);
}

/**
 * 创建 Cone
 */
async function createCone(): Promise<BrepMesh> {
  const shape = ShapeFactory.Cone(1.5, 0.5, 3);
  const material = new THREE.MeshMatcapMaterial({
    color: colors.cone,
    matcap: texture,
  });
  return createBrepMesh(shape, Shape.toBRepResult(shape, 0.1, 0.5), material);
}

/**
 * 创建 Torus
 */
async function createTorus(): Promise<BrepMesh> {
  const shape = ShapeFactory.Torus(1.5, 0.5);
  const material = new THREE.MeshMatcapMaterial({
    color: colors.torus,
    matcap: texture,
  });
  return createBrepMesh(shape, Shape.toBRepResult(shape, 0.1, 0.5), material);
}


/**
 * 加载案例
 */
async function load(context: CaseContext): Promise<void> {
  const { container } = context;

  try {
    container.innerHTML = '';
    app = new App(container);

    // 创建所有形状
    const box = await createBox();
    box.position.set(0, 0, 0);
    app.add(box);

    const sphere = await createSphere();
    sphere.position.set(4, 0, 0);
    app.add(sphere);

    const cylinder = await createCylinder();
    cylinder.position.set(4, 0, 4);
    app.add(cylinder);

    const cone = await createCone();
    cone.position.set(-4, 0, 4);
    app.add(cone);

    const torus = await createTorus();
    torus.position.set(0, 0, -4);
    app.add(torus);

    app.fitToView();
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
  if (app) {
    app.dispose();
    app = null;
  }
}

export const basicShapesCase: Case = {
  id: 'basic-shapes',
  name: 'Basic Shapes',
  description: 'Display basic geometric shapes: Box, Sphere, Cylinder, Cone, and Torus',
  load,
  unload,
};
