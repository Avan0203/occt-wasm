import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BrepObjectType, PickType, RenderMode } from './types';
import { createGPUBrepGroup, getObjectById } from './shape-converter';
import { color2id, createSpiralOrder } from './utils';
import { HeightlightManager } from './heightlight-manager';
import { EventListener } from './event-listener';
import { SelectionManager } from './selection-manager';
import { Controls } from './controls';
import { BrepGroup, BrepObjectAll, getBrepGroupFromBrepObject } from './object';
import { App } from './app';
import { TransformControls, TransformControlsMode } from './transform-controls';
import { OBJECT_MANAGER } from './object-manager';
import { HelperRenderPass } from './helper-pass';

let pickBuffer = new Uint8Array(0);
const pickOrder: number[] = [];

const raycaster = new THREE.Raycaster();

class ThreeRenderer extends EventListener {
  private scene: THREE.Scene;
  private helperScene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  public controls: Controls;
  private transformControls: TransformControls;
  private container: HTMLElement;
  private animationId: number | null = null;
  private GPUPickScene: THREE.Scene;
  private helperGroup = new THREE.Group();
  private mainGroup = new THREE.Group();
  private pickTarget = new THREE.WebGLRenderTarget(1, 1);
  private pickSize = 1;

  private pickType: PickType = PickType.ALL;
  private isCameraDragging = false;
  // width,height,left,top
  private renderSize = new THREE.Vector4(0, 0, 0, 0);

  public heightlightManager: HeightlightManager;
  public selectionManager: SelectionManager;
  private composer!: EffectComposer;
  outlinePass: OutlinePass;
  private fxaaPass: FXAAPass;

  private ndcMatrix = new THREE.Matrix4();

  private get mode(): RenderMode {
    return this.app.getMode();
  }

  constructor(private app: App) {
    super();
    const container = this.container = app.container;

    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.add(this.helperGroup);
    this.scene.add(this.mainGroup);
    // 设置渐变背景：从上到下，从灰色到白色
    const gradientTexture = this.createGradientBackground();
    this.scene.background = gradientTexture;

    // helperScene：仅放 Gizmo、Axes 等辅助对象，独立渲染在 OutlinePass 之后，避免被描边
    this.helperScene = new THREE.Scene();

    // 创建相机
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(5, 5, 5);
    this.camera.lookAt(0, 0, 0);

    const selectionTexture = new THREE.TextureLoader().load(new URL('/select.png', import.meta.url).href);
    selectionTexture.wrapS = THREE.RepeatWrapping;
    selectionTexture.wrapT = THREE.RepeatWrapping;

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);
    this.renderer.autoClear = false;
    this.renderer.sortObjects = false;


    this.controls = new Controls(this.camera, this.container);
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
    this.addHelper(axesHelper);

    this.setPickSize(4);

    this.composer = new EffectComposer(this.renderer);
    this.fxaaPass = new FXAAPass();
    this.outlinePass = new OutlinePass(new THREE.Vector2(), this.scene, this.camera);
    this.outlinePass.usePatternTexture = true;
    this.outlinePass.patternTexture = selectionTexture;

    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(this.outlinePass);
    this.composer.addPass(new HelperRenderPass(this.helperScene, this.camera));
    this.composer.addPass(this.fxaaPass);
    this.composer.addPass(new OutputPass());

    this.heightlightManager = new HeightlightManager(this, this.app);
    this.selectionManager = new SelectionManager(this, this.app);

    const rect = container.getBoundingClientRect();
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.handleResize(w, h, rect.left, rect.top);

    this.transformControls = new TransformControls(this);
    this.addHelper(this.transformControls.getHelper());
    this.helperGroup.add(this.transformControls.getTransformObject());

    // 开始渲染循环
    this.animate();

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

  public getSelectionObjects(): BrepObjectAll[] | BrepGroup[] {
    if (this.mode === RenderMode.OBJECT) {
      return this.selectionManager.getSelectionGroups();
    } else {
      return this.selectionManager.getSelectionObjects();
    }
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getContainer(): HTMLElement {
    return this.container;
  }

  public attachObject(objects: BrepGroup[]): void {
    this.transformControls.attachObject(objects);
  }

  public detachObject(): void {
    this.transformControls.detachObject();
  }

  public setTransformControlsMode(mode: TransformControlsMode): void {
    this.detachObject();
    this.transformControls.setMode(mode);
  }

  /**
   * 将画布坐标的鼠标点转换为射线与平面的交点（用于 EDIT 模式投影到工作平面）。
   * @param mouse 画布坐标系下的鼠标位置（与 pick 使用同一坐标系）
   * @param plane 工作平面
   * @param target 可选，用于接收结果的 Vector3，避免分配
   * @returns 交点，若无交点（射线与平面平行）返回 null
   */
  public getPointOnPlane(mouse: THREE.Vector2Like,
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
    const result = this.pick(mouse, this.pickType);
    if (this.mode === RenderMode.OBJECT) {
      const group = result ? getBrepGroupFromBrepObject(result) : null;
      if (group) {
        if (!event.shiftKey) {
          this.selectionManager.clearSelection();
          this.transformControls.detachObject();
        }
        if (this.selectionManager.hasSelection(group)) {
          this.selectionManager.removeSelection(group);
        } else {
          this.selectionManager.addSelection(group);
        }
        // this.transformControls.attach(transformGroup);
        this.dispatchEvent('selection', new CustomEvent('selection', { detail: { group } }));
      } else {
        this.transformControls.detachObject();
        this.selectionManager.clearSelection();
      }
    } else if (this.mode === RenderMode.EDIT) {
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
  }

  private onPointerMove = (e: CustomEvent) => {
    if (this.isCameraDragging) {
      this.heightlightManager.clearHeightlight();
      return;
    }
    const { mouse } = e.detail;
    if (this.mode === RenderMode.EDIT) {
      const result = this.pick(mouse, this.pickType);
      if (result) {
        this.heightlightManager.addHeightlight(result);
        this.dispatchEvent('heightlight', new CustomEvent('heightlight', { detail: result }));
      } else {
        this.heightlightManager.clearHeightlight();
      }
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
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(width, height);
    createNDCMatrix(width, height, this.ndcMatrix);

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
    this.composer.render();
  }

  /**
   * 根据模式更新所有 BrepGroup 中点与线的渲染可见性（object 模式隐藏，其它模式显示）
   */
  updateWireframeVisibilityByMode(mode: RenderMode): void {
    const visible = mode !== RenderMode.OBJECT;
    this.mainGroup.children.forEach((child) => {
      if (child instanceof BrepGroup) {
        child.setWireframeVisible(visible);
      }
    });
  }

  /**
   * 添加对象到场景
   */
  add(object: BrepGroup): void {
    this.mainGroup.add(object);
    object.setWireframeVisible(this.mode !== RenderMode.OBJECT);

    const gpuObject = createGPUBrepGroup(object);
    this.GPUPickScene.add(gpuObject);
    OBJECT_MANAGER.setGPUGroup(object.id.toString(), gpuObject);
  }

  /**
   * 从场景移除对象
   */
  remove(object: BrepGroup): void {
    this.removeBrepGroupFromManagers(object);
    this.mainGroup.remove(object);
    object.dispose();
  }

  addHelper(helper: THREE.Object3D): void {
    this.helperScene.add(helper);
  }

  removeHelper(helper: THREE.Object3D): void {
    this.helperScene.remove(helper);
  }

  /** 在 dispose 前从高亮/选择中移除，避免 dispose 掉共享材质并释放对已销毁对象的引用 */
  private removeBrepGroupFromManagers(group: BrepGroup): void {
    [...group.faces, ...group.points, ...group.edges].forEach((obj) => {
      this.heightlightManager.removeObject(obj);
      this.selectionManager.removeObject(obj);
    });
    this.selectionManager.removeSelection(group);
  }

  /**
   * 清空场景（保留灯光和辅助对象）
   */
  clear(): void {
    [...this.mainGroup.children].forEach((child) => {
      if (child.hasOwnProperty('dispose')) {
        this.removeBrepGroupFromManagers(child as BrepGroup);
        (child as any).dispose();
      }
    });
    this.mainGroup.clear();

    [...this.helperGroup.children].forEach((child) => {
      if (child.hasOwnProperty('dispose')) {
        (child as any).dispose();
      }
    });
    this.helperGroup.clear();
    this.scene.remove(this.mainGroup);
    this.scene.remove(this.helperGroup);

    [...this.helperScene.children].forEach((child) => {
      if (child.hasOwnProperty('dispose')) {
        (child as any).dispose();
      }
    });
    this.helperScene.clear();

    [...this.GPUPickScene.children].forEach((child) => {
      if (child.hasOwnProperty('dispose')) {
        (child as any).dispose();
      }
    });
    this.GPUPickScene.clear();
    OBJECT_MANAGER.clear();
    this.transformControls.detachObject();
  }

  /**
   * 自动调整相机位置以显示所有对象
   */
  fitToView(): void {
    this.mainGroup.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.mainGroup, true);

    if (box.isEmpty()) {
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const isOrthographic = this.camera instanceof THREE.OrthographicCamera;
    const direction = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();

    if (isOrthographic) {
      const box2d = new THREE.Box2();
      const { min, max } = box;
      const points = [
        new THREE.Vector3(min.x, min.y, max.z),
        new THREE.Vector3(max.x, min.y, max.z),
        new THREE.Vector3(max.x, max.y, max.z),
        new THREE.Vector3(min.x, max.y, max.z),
        new THREE.Vector3(min.x, min.y, min.z),
        new THREE.Vector3(max.x, min.y, min.z),
        new THREE.Vector3(max.x, max.y, min.z),
        new THREE.Vector3(min.x, max.y, min.z),
      ];

      points.forEach((v) => {
        box2d.expandByPoint(this.projectToScreen(v));
      });

      const width = this.renderSize.x;
      const height = this.renderSize.y;
      const boxWidth = box2d.max.x - box2d.min.x;
      const boxHeight = box2d.max.y - box2d.min.y;
      const tempZoom = (this.camera as unknown as THREE.OrthographicCamera).zoom;
      const targetWidth = width * 0.8;
      const targetHeight = height * 0.8;
      const radius = this.camera.position.distanceTo(this.controls.target);

      const zoom = Math.min(
        (targetWidth * tempZoom) / Math.max(boxWidth, 1e-6),
        (targetHeight * tempZoom) / Math.max(boxHeight, 1e-6),
      );
      const position = direction.clone().multiplyScalar(radius).add(center);

      this.controls.object.position.copy(position);
      (this.controls.object as unknown as THREE.OrthographicCamera).zoom = zoom;
    } else {
      // 透视相机：用包围球半径 + FOV 公式计算距离，支持任意相机朝向
      const cam = this.camera as THREE.PerspectiveCamera;
      const fovRad = (cam.fov * Math.PI) / 180;
      const fovH = 2 * Math.atan(Math.tan(fovRad / 2) * cam.aspect);
      const fovLim = Math.min(fovRad, fovH);
      const sphereRadius = 0.5 * size.length();
      const margin = 1 / 0.8;
      const distance = Math.max(sphereRadius / Math.tan(fovLim / 2), cam.near * 2) * margin;

      const position = direction.clone().multiplyScalar(distance).add(center);

      this.controls.object.position.copy(position);
    }
    this.controls.target.copy(center);
    this.controls.update();
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
    this.composer.dispose();
    this.pickTarget.dispose();
    this.renderer.dispose();
    this.controls.dispose();
    this.transformControls.dispose();
    this.outlinePass.patternTexture.dispose();
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

  public projectToScreen(v: THREE.Vector3, target = new THREE.Vector2()): THREE.Vector2 {
    v.applyMatrix4(this.camera.matrixWorldInverse);
    v.applyMatrix4(this.camera.projectionMatrix);
    v.applyMatrix4(this.ndcMatrix);
    return target.set(v.x, v.y);
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

/**
 * @description: webgl -> canvas
 * @param {Number} width canvas width
 * @param {Number} height canvas height
 * @param {THREE.Matrix4} target
 * @return {THREE.Matrix4}
 */
function createNDCMatrix(width: number, height: number, target = new THREE.Matrix4()) {
  const W = width / 2;
  const H = height / 2;
  return target.set(W, 0, 0, W, 0, -H, 0, H, 0, 0, 1, 0, 0, 0, 0, 1);
}

export { ThreeRenderer };