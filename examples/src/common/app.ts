import { BrepGroup, BrepObjectAll } from "./object";
import { ThreeRenderer } from "./three-renderer";
import { EventListener } from "./event-listener";
import { PickType, RenderMode } from "./types";
import { MOUSE, Plane, Vector2, Vector3 } from 'three';
import type { Object3D } from 'three';

const startPos = new Vector2(0, 0);
const mouse = new Vector2(0, 0);
// 是否正在拖拽中
let isDragging = false;
// 是否已经拖拽过
let isDragged = false;

class App extends EventListener {
    private renderer: ThreeRenderer;
    private resizeObserver: ResizeObserver | null = null;
    private mode = RenderMode.IDLE;
    private workingPlane = new Plane(new Vector3(0, 1, 0), 0);

    constructor(private container: HTMLElement) {
        super();
        this.renderer = new ThreeRenderer(this.container);
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    const rect = (entry.target as HTMLElement).getBoundingClientRect();
                    this.renderer.handleResize(width, height, rect.left, rect.top);
                }
            }
        });
        this.resizeObserver.observe(this.container);

        this.container.addEventListener('pointerdown', this.onPointerDown);
        this.container.addEventListener('pointermove', this.onPointerMove);
        this.container.addEventListener('pointerup', this.onPointerUp);
        this.container.addEventListener('keyup', this.onKeyUp);
        // 创建控制器（Blender 操作习惯：中键旋转，滚轮缩放，Shift+中键平移）
        this.renderer.controls.getMouseAction = (event: MouseEvent) => {
            const { button, shiftKey } = event;
            if (button === 1 && shiftKey) {
                return MOUSE.PAN;
            } else if (button === 1) {
                return MOUSE.ROTATE;
            } else {
                return -1;
            }
        };

        this.renderer.addEventListener('selection', this.onSelection);
        this.renderer.addEventListener('heightlight', this.onHeightlight);
    }

    private onSelection = (e: CustomEvent): void => {
        this.dispatchEvent('selection', new CustomEvent('selection', { detail: e.detail }));
    }

    private onHeightlight = (e: CustomEvent): void => {
        this.dispatchEvent('heightlight', new CustomEvent('heightlight', { detail: e.detail }));
    }

    private onPointerDown = (e: PointerEvent): void => {
        startPos.set(e.clientX, e.clientY);
        isDragging = true;
        isDragged = false;
        const renderSize = this.renderer.getRenderSize();
        mouse.set(e.clientX, e.clientY);
        mouse.x = mouse.x - renderSize.z;
        mouse.y = mouse.y - renderSize.w;
        this.renderer.dispatchEvent('pointerdown', new CustomEvent('pointerdown', {
            detail: {
                mouse,
                event: e
            }
        }));
    }

    private onPointerMove = (e: PointerEvent): void => {
        isDragged = isDragged || (startPos.distanceTo({ x: e.clientX, y: e.clientY }) >= 1);
        const renderSize = this.renderer.getRenderSize();
        mouse.set(e.clientX, e.clientY);
        mouse.x = mouse.x - renderSize.z;
        mouse.y = mouse.y - renderSize.w;
        if (this.mode === RenderMode.EDIT) {
            const point = this.renderer.getPointOnPlane(mouse, this.workingPlane);
            if (point) {
                this.dispatchEvent('editPointerMove', new CustomEvent('editPointerMove', { detail: { point } }));
            }
        } else if (this.mode === RenderMode.IDLE) {
            this.renderer.dispatchEvent('pointermove', new CustomEvent('pointermove', {
                detail: {
                    mouse,
                    event: e
                }
            }));
        }
    }

    private onPointerUp = (e: PointerEvent): void => {
        const renderSize = this.renderer.getRenderSize();
        mouse.set(e.clientX, e.clientY);
        mouse.x = mouse.x - renderSize.z;
        mouse.y = mouse.y - renderSize.w;
        const releasedNearStart = startPos.distanceTo({ x: e.clientX, y: e.clientY }) < 1;
        if (releasedNearStart && !isDragged) {
            if (this.mode === RenderMode.IDLE) {
                this.renderer.dispatchEvent('click', new CustomEvent('click', {
                    detail: { mouse, event: e }
                }));
            } else if (this.mode === RenderMode.EDIT) {
                const point = this.renderer.getPointOnPlane(mouse, this.workingPlane);
                if (point) {
                    this.dispatchEvent('editClick', new CustomEvent('editClick', { detail: { point } }));
                }
            }
        } else {
            this.renderer.dispatchEvent('pointerup', new CustomEvent('pointerup', {
                detail: {
                    mouse,
                    event: e
                }
            }));
        }
        isDragging = false;
        isDragged = false;
    }

    private onKeyUp = (e: KeyboardEvent) => {
        this.dispatchEvent('keyup', new CustomEvent('keyup', { detail: e }));
    }

    add(object: BrepGroup): void {
        this.renderer.add(object);
    }

    remove(object: BrepGroup): void {
        this.renderer.remove(object);
    }

    addHelper(helper: Object3D): void {
        this.renderer.addHelper(helper);
    }

    removeHelper(helper: Object3D): void {
        this.renderer.removeHelper(helper);
    }

    getMode(): RenderMode {
        return this.mode;
    }

    setMode(mode: RenderMode): void {
        this.mode = mode;
    }

    setWorkingPlane(normal: Vector3, distance: number): void {
        this.workingPlane.set(normal, distance);
    }

    getWorkingPlane(): { normal: Vector3, distance: number } {
        return { normal: this.workingPlane.normal.clone(), distance: this.workingPlane.constant };
    }

    fitToView(): void {
        this.renderer.fitToView();
    }

    getSelectionObjects(): BrepObjectAll[] {
        return this.renderer.getSelectionObjects();
    }

    setPickType(type: PickType): void {
        this.renderer.setPickType(type);
    }

    clearSelection(): void {
        this.renderer.clearSelection();
    }

    dispose(): void {
        this.container.removeEventListener('pointerdown', this.onPointerDown);
        this.container.removeEventListener('pointermove', this.onPointerMove);
        this.container.removeEventListener('pointerup', this.onPointerUp);
        this.renderer.dispose();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        super.clear();
    }
}

export { App };