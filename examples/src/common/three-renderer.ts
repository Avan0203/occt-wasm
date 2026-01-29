import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { BrepMeshGroup } from './shape-converter';
import { LineMaterial } from 'three/examples/jsm/Addons.js';

let colorIndex = 0;

export class ThreeRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: TrackballControls;
  private container: HTMLElement;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private GPUPickScene: THREE.Scene;
  private objectMap = new WeakMap<THREE.Object3D, THREE.Object3D>();
  private pickRelationMap = new Map<number, THREE.GeometryGroup>

  constructor(container: HTMLElement) {
    this.container = container;

    // 创建场景
    this.scene = new THREE.Scene();
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

    // 创建控制器
    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 5.0;
    this.controls.zoomSpeed = 0.8;
    this.controls.dynamicDampingFactor = 0.2;

    this.GPUPickScene = new THREE.Scene();

    // 添加灯光
    this.setupLights();

    // 添加坐标轴辅助
    const axesHelper = new THREE.AxesHelper(2);
    this.scene.add(axesHelper);

    // 使用 ResizeObserver 观察容器尺寸变化
    this.initResizeObserver();

    // 开始渲染循环
    this.animate();
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
    this.scene.add(ambientLight);

    // 主光源
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 10, 5);
    this.scene.add(directionalLight1);

    // 辅助光源
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -5, -5);
    this.scene.add(directionalLight2);
  }

  /**
   * 初始化 ResizeObserver 来观察容器尺寸变化
   */
  private initResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            this.handleResize(width, height);
          }
        }
      });
      this.resizeObserver.observe(this.container);
    } else {
      // 降级方案：使用 window resize 事件
      window.addEventListener('resize', () => {
        this.handleResize(this.container.clientWidth, this.container.clientHeight);
      });
    }
  }

  /**
   * 处理容器尺寸变化
   */
  private handleResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    this.scene.traverse((object) => {
      if (object instanceof Line2 || object instanceof LineSegments2) {
        const material = Array.isArray((object as THREE.Mesh).material) ? (object as THREE.Mesh).material as THREE.Material[] : [(object as THREE.Mesh).material];
        material.forEach((mat) => {
          (mat as THREE.ShaderMaterial).uniforms.resolution.value.set(width, height);
        });
      }
    })
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    // this.renderer.render(this.GPUPickScene, this.camera);
  }

  /**
   * 添加对象到场景
   */
  add(object: THREE.Object3D): void {
    this.scene.add(object);

    // const pickObject = this.createPickObject(object);
    // this.GPUPickScene.add(pickObject);
    // this.objectMap.set(object, pickObject);
  }

  /**
   * 从场景移除对象
   */
  remove(object: THREE.Object3D): void {
    this.scene.remove(object);
    const pickObject = this.objectMap.get(object);
    if (pickObject) {
      this.GPUPickScene.remove(pickObject);
      this.objectMap.delete(object);

      pickObject.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).material !== undefined) {
          const material: THREE.Material[] = Array.isArray((child as THREE.Mesh).material) ? (child as THREE.Mesh).material as THREE.Material[] : [(child as THREE.Mesh).material as THREE.Material];
          material.forEach((mat) => mat.dispose());
        }
      });
    }
  }

  /**
   * 清空场景（保留灯光和辅助对象）
   */
  clear(): void {
    const objectsToRemove: THREE.Object3D[] = [];
    this.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Line ||
        object instanceof THREE.Points
      ) {
        objectsToRemove.push(object);
      }
    });
    objectsToRemove.forEach((obj) => {
      this.scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
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
  }

  /**
   * 销毁渲染器
   */
  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    // 断开 ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.scene.children.forEach((child) => {
      (child as BrepMeshGroup)?.dispose();
    })
    this.clear();
    this.renderer.dispose();
    this.controls.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  private createPickObject(obj: THREE.Object3D): THREE.Object3D {
    const pickObject = obj.clone(true);

    pickObject.traverse((child: THREE.Object3D) => {
      if ((child as any).material !== undefined) {
        colorIndex+=20;
        const id = colorIndex;
        const rgb = id2color(id);
        const color = new THREE.Color().setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
        if (child instanceof THREE.Mesh) {
          const geom = child.geometry as THREE.BufferGeometry;
          const pickMat = new THREE.MeshBasicMaterial({ color });
          child.material = geom.groups.length > 0
            ? geom.groups.map((group) => {
                this.pickRelationMap.set(id, group);
                return new THREE.MeshBasicMaterial({ color });
              })
            : pickMat;
        } else if (child instanceof LineSegments2) {
          const geom = child.geometry as THREE.BufferGeometry;
          const pickMat = new LineMaterial({ color, linewidth: 2 });
          (child as any).material = geom.groups.length > 0
            ? (geom.groups.map((group) => {
                this.pickRelationMap.set(id, group);
                return new LineMaterial({ color, linewidth: 2 });
              }) as LineMaterial[])
            : pickMat;
        } else if (child instanceof THREE.Points) {
          const geom = child.geometry as THREE.BufferGeometry;
          const pickMat = new THREE.PointsMaterial({ color, size: 0.1 });
          child.material = geom.groups.length > 0
            ? geom.groups.map((group) => {
                this.pickRelationMap.set(id, group);
                return new THREE.PointsMaterial({ color, size: 0.1 });
              })
            : pickMat;
        }
      }
    });

    return pickObject;
  }
}


function color2id(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

function id2color(id: number): [number, number, number] {
  const r = (id >> 16) & 0xff;
  const g = (id >> 8) & 0xff;
  const b = id & 0xff;
  return [r, g, b];
}

function createSpiralOrder(w: number, h: number, ret: number[] = []) {
  let u = 0;
  let d = h - 1;
  let l = 0;
  let r = w - 1;
  ret.length = 0;
  while (true) {
    // moving right
    for (let i = l; i <= r; ++i) {
      ret.push(u * w + i);
    }
    if (++u > d) {
      break;
    }
    // moving down
    for (let i = u; i <= d; ++i) {
      ret.push(i * w + r);
    }
    if (--r < l) {
      break;
    }
    // moving left
    for (let i = r; i >= l; --i) {
      ret.push(d * w + i);
    }
    if (--d < u) {
      break;
    }
    // moving up
    for (let i = d; i >= u; --i) {
      ret.push(i * w + l);
    }
    if (++l > r) {
      break;
    }
  }
  ret.reverse();
  return ret;
}