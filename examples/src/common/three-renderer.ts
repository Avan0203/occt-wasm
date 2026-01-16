import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ThreeRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

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
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

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
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 添加对象到场景
   */
  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * 从场景移除对象
   */
  remove(object: THREE.Object3D): void {
    this.scene.remove(object);
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
    this.clear();
    this.renderer.dispose();
    this.controls.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
