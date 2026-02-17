import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { BrepObjectType, PickType } from './types';
import { createGPUBrepGroup, getObjectById } from './shape-converter';
import { color2id, createSpiralOrder } from './utils';
import { HeightlightManager } from './heightlight-manager';
import { EventListener } from './event-listener';
import { SelectionManager } from './selection-manager';
import { Controls } from './controls';
import { BrepGPUGroup, BrepGroup, BrepObjectAll } from './object';

let pickBuffer = new Uint8Array(0);
const pickOrder: number[] = [];

const raycaster = new THREE.Raycaster();


class ThreeRenderer extends EventListener {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  public controls: Controls;
  private container: HTMLElement;
  private animationId: number | null = null;
  private GPUPickScene: THREE.Scene;
  private helperGroup = new THREE.Group();
  private mainGroup = new THREE.Group();
  private gpuObjectMap = new WeakMap<BrepGroup, BrepGPUGroup>();
  private pickTarget = new THREE.WebGLRenderTarget(1, 1);
  private pickSize = 1;

  private pickType: PickType = PickType.ALL;
  private isCameraDragging = false;
  // width,height,left,top
  private renderSize = new THREE.Vector4(0, 0, 0, 0);

  public heightlightManager = new HeightlightManager(this);
  public selectionManager = new SelectionManager(this);

  constructor(container: HTMLElement) {
    super();
    this.container = container;

    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.add(this.helperGroup);
    this.scene.add(this.mainGroup);
    // 设置渐变背景：从上到下，从灰色到白色
    const gradientTexture = this.createGradientBackground();
    this.scene.background = gradientTexture;

    // 创建相机
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);
    this.renderer.autoClear = false;
    this.renderer.sortObjects = false;

  
    this.controls = new Controls(this.camera, this.renderer.domElement);
    this.controls.zoomSpeed = 2;
    this.controls.rotateSpeed = 1.5;
    this.controls.addEventListener('start', () => {
      this.isCameraDragging = true;
    });
    this.controls.addEventListener('end', () => {
      this.isCameraDragging = false;
    });

    this.GPUPickScene = new THREE.Scene();

    // 添加灯光
    this.setupLights();

    // 添加坐标轴辅助
    const axesHelper = new THREE.AxesHelper(2);
    this.helperGroup.add(axesHelper);

    this.setPickSize(4);

    // 开始渲染循环
    this.animate();

    const rect = container.getBoundingClientRect();
    this.handleResize(container.clientWidth, container.clientHeight, rect.left, rect.top);

    this.pickType = PickType.ALL;

    this.addEventListener('click', this.onClick);
    this.addEventListener('pointermove', this.onPointerMove);

    if (typeof window !== 'undefined') {
      (window as any).DEBUG = { renderer: this };
    }
  }

  public setPickSize(size: number): void {
    this.pickSize = size;
    createSpiralOrder(size, size, pickOrder);
  }

  public setPickType(type: PickType): void {
    this.pickType = type;
  }

  public getSelectionObjects(): BrepObjectAll[] {
    return this.selectionManager.getSelectionObjects();
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * 将画布坐标的鼠标点转换为射线与平面的交点（用于 EDIT 模式投影到工作平面）。
   * @param mouse 画布坐标系下的鼠标位置（与 pick 使用同一坐标系）
   * @param plane 工作平面
   * @param target 可选，用于接收结果的 Vector3，避免分配
   * @returns 交点，若无交点（射线与平面平行）返回 null
   */
  public getPointOnPlane(
    mouse: THREE.Vector2Like,
    plane: THREE.Plane,
    target?: THREE.Vector3
  ): THREE.Vector3 | null {
    const ndc = new THREE.Vector2(
      (mouse.x / this.renderSize.x) * 2 - 1,
      -(mouse.y / this.renderSize.y) * 2 + 1
    );
    raycaster.setFromCamera(ndc, this.camera);
    const out = target ?? new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, out) ? out : null;
  }

  private onClick = (e: CustomEvent) => {
    const { mouse, event } = e.detail;
    const result = this.pick(mouse);
    if (result) {
      if (!event.shiftKey) {
        this.selectionManager.clearSelection();
      }
      this.selectionManager.addSelection(result);
      this.dispatchEvent('selection', new CustomEvent('selection', { detail: result }));
    } else {
      this.selectionManager.clearSelection();
    }
  }

  private onPointerMove = (e: CustomEvent) => {
    if (this.isCameraDragging) {
      this.heightlightManager.clearHeightlight();
      return;
    }
    const { mouse } = e.detail;
    const result = this.pick(mouse);
    if (result) {
      this.heightlightManager.addHeightlight(result);
      this.dispatchEvent('heightlight', new CustomEvent('heightlight', { detail: result }));
    } else {
      this.heightlightManager.clearHeightlight();
    }
  }

  private preparePick(): void {
    const size = this.pickSize;
    pickBuffer = new Uint8Array(size * size * 4);

    this.pickTarget.setSize(size, size);
  }

  public pick(pos: THREE.Vector2Like, pickType = this.pickType): BrepObjectAll | null {
    this.preparePick();

    const length = this.pickSize * 2;

    this.renderer.setRenderTarget(this.pickTarget);
    this.renderer.setClearColor(0x000000);
    this.renderer.clear();


    this.camera.setViewOffset(
      this.renderSize.x, this.renderSize.y,
      pos.x - this.pickSize,
      pos.y - this.pickSize,
      length, length,
    );

    this.renderer.render(this.GPUPickScene, this.camera);
    this.renderer.readRenderTargetPixels(this.pickTarget, 0, 0, this.pickSize, this.pickSize, pickBuffer);
    this.camera.clearViewOffset();
    this.renderer.setRenderTarget(null);


    const allowedTypes = getBrepObjectTypesByPickType(pickType);
    const candidateByType: Partial<Record<BrepObjectType, BrepObjectAll>> = {};

    for (let i of pickOrder) {
      const index = i * 4;
      const id = color2id(pickBuffer[index], pickBuffer[index + 1], pickBuffer[index + 2]);
      const object = getObjectById(id.toString());

      if (object && allowedTypes.includes(object.type) && candidateByType[object.type] === undefined) {
        candidateByType[object.type] = object;
        if (allowedTypes.every((t) => candidateByType[t] !== undefined)) {
          break;
        }
      }
    }

    for (const type of allowedTypes) {
      if (candidateByType[type]) {
        return candidateByType[type]!;
      }
    }

    return null;
  }

  /**
   * 创建渐变背景纹理
   */
  private createGradientBackground(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d')!;

    // 创建渐变：从上到下，从灰色到白色
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#121212'); // 顶部：浅灰色
    gradient.addColorStop(0.6, '#ffffff'); // 底部：白色

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private setupLights(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.helperGroup.add(ambientLight);

    // 主光源
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 10, 5);
    this.helperGroup.add(directionalLight1);

    // 辅助光源
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -5, -5);
    this.helperGroup.add(directionalLight2);
  }

  /**
   * 处理容器尺寸变化
   */
  handleResize(width: number, height: number, left: number, top: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderSize.set(width, height, left, top);

    this.mainGroup.traverse((object) => {
      if (object instanceof Line2 || object instanceof LineSegments2) {
        const material = Array.isArray((object as THREE.Mesh).material) ? (object as THREE.Mesh).material as THREE.Material[] : [(object as THREE.Mesh).material];
        material.forEach((mat) => {
          (mat as THREE.ShaderMaterial).uniforms.resolution.value.set(width, height);
        });
      }
    })
  }

  getRenderSize(): THREE.Vector4 {
    return this.renderSize;
  }

  private animate(): void {
    this.renderer.clear();
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    // this.renderer.render(this.GPUPickScene, this.camera);
  }

  /**
   * 添加对象到场景
   */
  add(object: BrepGroup): void {
    this.mainGroup.add(object);

    const gpuObject = createGPUBrepGroup(object);
    this.GPUPickScene.add(gpuObject);
    this.gpuObjectMap.set(object, gpuObject);
  }

  /**
   * 从场景移除对象
   */
  remove(object: BrepGroup): void {
    this.removeBrepGroupFromManagers(object);
    this.mainGroup.remove(object);
    object.dispose();
    const gpuObject = this.gpuObjectMap.get(object);
    if (gpuObject) {
      this.GPUPickScene.remove(gpuObject);
      this.gpuObjectMap.delete(object);
      gpuObject.dispose();
    }
  }

  /** 在 dispose 前从高亮/选择中移除，避免 dispose 掉共享材质并释放对已销毁对象的引用 */
  private removeBrepGroupFromManagers(group: BrepGroup): void {
    [...group.faces, ...group.points, ...group.edges].forEach((obj) => {
      this.heightlightManager.removeObject(obj);
      this.selectionManager.removeObject(obj);
    });
  }

  /**
   * 清空场景（保留灯光和辅助对象）
   */
  clear(): void {
    Array.from(this.mainGroup.children).forEach((child) => {
      if (child.hasOwnProperty('dispose')) {
        this.removeBrepGroupFromManagers(child as BrepGroup);
        (child as any).dispose();
      }
      this.mainGroup.remove(child);
    });
    this.mainGroup.clear();
    this.helperGroup.children.forEach((child) => {
      if (child.hasOwnProperty('dispose')) {
        (child as any).dispose();
      }
      this.helperGroup.remove(child);
    });
    this.helperGroup.clear();
    this.scene.remove(this.mainGroup);
    this.scene.remove(this.helperGroup);

    this.GPUPickScene.children.forEach((child) => {
      if (child.hasOwnProperty('dispose')) {
        (child as any).dispose();
      }
      this.GPUPickScene.remove(child);
    });
    this.GPUPickScene.clear();
  }

  /**
   * 自动调整相机位置以显示所有对象
   */
  fitToView(): void {
    const box = new THREE.Box3();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        box.expandByObject(object);
      }
    });

    if (box.isEmpty()) {
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;

    this.camera.position.set(
      center.x + distance,
      center.y + distance,
      center.z + distance
    );
    this.camera.lookAt(center);
    this.controls.target.copy(center);
    this.controls.update();
    super.clear();
  }

  /**
   * 销毁渲染器
   */
  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.clear();
    this.heightlightManager.dispose();
    this.selectionManager.dispose();
    this.pickTarget.dispose();
    this.renderer.dispose();
    this.controls.dispose();
    if (this.scene.background && typeof (this.scene.background as THREE.Texture).dispose === 'function') {
      (this.scene.background as THREE.Texture).dispose();
    }
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    if (typeof window !== 'undefined' && (window as any).DEBUG?.renderer === this) {
      delete (window as any).DEBUG;
    }
  }

  public clearHeightlight(): void {
    this.heightlightManager.clearHeightlight();
  }

  public clearSelection(): void {
    this.selectionManager.clearSelection();
  }

}

function getBrepObjectTypesByPickType(pickType: PickType): BrepObjectType[] {
  switch (pickType) {
    case PickType.VERTEX: return [BrepObjectType.POINT];
    case PickType.EDGE: return [BrepObjectType.EDGE];
    case PickType.FACE: return [BrepObjectType.FACE];
    case PickType.ALL: return [BrepObjectType.POINT, BrepObjectType.EDGE, BrepObjectType.FACE];
    default: return [BrepObjectType.POINT, BrepObjectType.EDGE, BrepObjectType.FACE];
  }
}

export { ThreeRenderer };