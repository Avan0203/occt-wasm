import {
    Vector2,
    Vector3,
    Matrix4,
    Spherical,
    Controls,
    MOUSE,
    type Camera,
    type OrthographicCamera,
    type PerspectiveCamera,
    type Object3D
} from 'three';

const PI2 = Math.PI * 2;

let defaultUp = new Vector3(0, 1, 0);
const oppositeUp = new Vector3(0, -1, 0);

export interface BlenderControlsEventMap {
    change: { type: 'change' };
    start: { type: 'start' };
    end: { type: 'end' };
}

const _changeEvent: BlenderControlsEventMap['change'] = { type: 'change' };
const _startEvent: BlenderControlsEventMap['start'] = { type: 'start' };
const _endEvent: BlenderControlsEventMap['end'] = { type: 'end' };

/** 返回 MOUSE.ROTATE | MOUSE.PAN | MOUSE.DOLLY 或 -1 表示无操作。子类可重写以自定义按键/修饰键逻辑。 */
export type GetMouseAction = (event: MouseEvent) => number;

class BlenderControls extends Controls<BlenderControlsEventMap> {
    target = new Vector3();
    private state = 'none';
    private dragStart = new Vector2();
    private dragEnd = new Vector2();
    private _rotateDelta = new Vector2();
    private _panDelta = new Vector2();
    private _zoomScale = 1;
    private panOffset = new Vector3();
    private _lastTarget = new Vector3();
    private screenSpacePanning = true;
    private zoomScale = 0.95;
    private spherical = new Spherical();
    private rotateDir = 'xy';
    private enablePan = true;
    private minZoom = 0;
    private maxZoom = Infinity;
    private pvMatrix = new Matrix4();
    private minPolar = 1e-5;
    private maxPolar = 0.9999999 * Math.PI;
    private unlimited = true;
    private sign = 1;

    public rotateSpeed = 1;
    public zoomSpeed = 1;
    public panSpeed = 1;

    constructor(object: Camera, public domElement: HTMLElement) {
        super(object, domElement);

        this.resetSpherical();
        this._lastTarget.copy(this.target);
        this.updateCamera();
        this.connect(domElement);
        this.update();
    }

    /* -------------------- Events -------------------- */

    connect(domElement: HTMLElement) {
        super.connect(domElement);

        domElement.addEventListener('pointerdown', this.onPointerDown);
        domElement.addEventListener('pointermove', this.onPointerMove);

        window.addEventListener('pointerup', this.onPointerUp);

        domElement.addEventListener('wheel', this.onWheel, { passive: true });
    }

    /**
     * 根据鼠标事件返回操作类型：MOUSE.ROTATE | MOUSE.PAN | MOUSE.DOLLY 或 -1（无操作）。
     * 可重写以自定义按键与修饰键逻辑；默认：左键旋转、右键平移、中键缩放，Shift+中键平移。
     */
    getMouseAction(event: MouseEvent): number {
        const { button } = event;
        switch (button) {
            case 0: return MOUSE.ROTATE;
            case 1: return MOUSE.DOLLY;
            case 2: return MOUSE.PAN;
            default: return -1;
        }
    }

    private _actionToState(action: number): 'rotate' | 'pan' | 'dolly' | 'none' {
        switch (action) {
            case MOUSE.ROTATE: return 'rotate';
            case MOUSE.PAN: return 'pan';
            case MOUSE.DOLLY: return 'dolly';
            default: return 'none';
        }
    }

    private onPointerDown = (event: MouseEvent) => {
        const { clientX, clientY } = event;
        this.dragStart.set(clientX, clientY);
        const action = this.getMouseAction(event);
        this.state = this._actionToState(action);
        if (this.state === 'rotate' || this.state === 'pan' || this.state === 'dolly') {
            this.dispatchEvent(_startEvent);
        }
    }

    private onPointerMove = ({ clientX, clientY }: MouseEvent) => {
        this.dragEnd.set(clientX, clientY);
        const delta = this.dragEnd.clone().sub(this.dragStart);

        if (this.state === 'pan' && this.enablePan) {
            this._panDelta.add(delta);
        } else if (this.state === 'rotate') {
            this._rotateDelta.add(delta);
        } else if (this.state === 'dolly') {
            this._zoomScale *= Math.pow(this.zoomScale, -delta.y * 0.01);
        }

        this.dragStart.copy(this.dragEnd);
    }

    private onPointerUp = () => {
        if (this.state === 'rotate' || this.state === 'pan' || this.state === 'dolly') {
            this.dispatchEvent(_endEvent);
        }
        this.state = 'none';
        this.sign = this.object.up.y;
    }

    private onWheel = ({ deltaY }: WheelEvent) => {
        let scale = deltaY < 0 ? 1 / this.zoomScale : this.zoomScale;
        scale = Math.pow(scale, this.zoomSpeed);
        this._zoomScale *= scale;
    }

    /* -------------------- Zoom -------------------- */

    private dollyPerspectiveCamera(scale: number) {
        this.spherical.radius /= scale;
    }

    private dollyOrthographicCamera(scale: number) {
        const object = this.object as OrthographicCamera;
        const zoom = object.zoom * scale;
        object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));

        object.updateProjectionMatrix();
    }

    /* -------------------- Pan -------------------- */

    private panPerspectiveCamera = ({ x, y }: { x: number, y: number }) => {
        const {
            panOffset,
            screenSpacePanning,
            target
        } = this;
        const object = this.object as PerspectiveCamera;

        const distance =
            object.position.clone().sub(target).length() *
            Math.tan(object.fov * Math.PI / 360) *
            2 / this.domElement.clientHeight;

        const offsetX = x * distance * this.panSpeed;
        const offsetY = y * distance * this.panSpeed;

        const right = new Vector3().setFromMatrixColumn(object.matrix, 0);
        const up = new Vector3();

        if (screenSpacePanning) {
            up.setFromMatrixColumn(object.matrix, 1);
        } else {
            up.crossVectors(object.up, right);
        }

        panOffset
            .copy(right.multiplyScalar(-offsetX))
            .add(up.multiplyScalar(offsetY));

        this.applyPan();
    }

    private panOrthographicCamera = ({ x, y }: { x: number, y: number }) => {
        const camera = this.object as OrthographicCamera;
        const { clientWidth, clientHeight } = this.domElement;

        const dx = x / clientWidth * (camera.right - camera.left) * this.panSpeed;
        const dy = y / clientHeight * (camera.top - camera.bottom) * this.panSpeed;

        const right = new Vector3().setFromMatrixColumn(camera.matrix, 0);
        const up = new Vector3();

        if (this.screenSpacePanning) {
            up.setFromMatrixColumn(camera.matrix, 1);
        } else {
            up.crossVectors(camera.up, right);
        }

        this.panOffset
            .copy(right.multiplyScalar(-dx))
            .add(up.multiplyScalar(dy));

        this.applyPan();
    }

    applyPan() {
        this.target.add(this.panOffset);
        this.object.position.add(this.panOffset);

        this.updateCamera();
        this.panOffset.set(0, 0, 0);
    }

    /* -------------------- Rotate -------------------- */

    private applyRotateDelta(delta: Vector2) {
        const { clientHeight } = this.domElement;
        const rotX = PI2 * delta.x / clientHeight * this.rotateSpeed;
        const rotY = PI2 * delta.y / clientHeight * this.rotateSpeed;

        if (this.rotateDir.includes('y')) {
            let phi = this.spherical.phi - rotY;
            if (phi < -Math.PI) phi += PI2;
            if (phi > PI2) phi -= PI2;
            this.spherical.phi = this.unlimited
                ? phi
                : Math.min(this.maxPolar, Math.max(this.minPolar, phi));
        }
        if (this.rotateDir.includes('x')) {
            this.spherical.theta -= this.sign * rotX;
        }
    }

    /* -------------------- Update -------------------- */

    /**
     * 应用本帧累积的 delta（旋转/平移/缩放），并同步相机状态。
     * 应在动画循环中每帧调用；也可在手动修改 target/相机后调用以强制同步。
     */
    update() {
        if (!this.object) return;
        if (this.target.distanceTo(this._lastTarget) > 1e-6) {
            this.resetSpherical();
            this._lastTarget.copy(this.target);
        }
        const camType = this.object.type;
        let changed = false;

        if (this._rotateDelta.x !== 0 || this._rotateDelta.y !== 0) {
            this.applyRotateDelta(this._rotateDelta);
            this.updateFromSpherical();
            this._rotateDelta.set(0, 0);
            changed = true;
        }

        if (this.enablePan && (this._panDelta.x !== 0 || this._panDelta.y !== 0)) {
            if (camType === 'PerspectiveCamera') {
                this.panPerspectiveCamera(this._panDelta);
            } else if (camType === 'OrthographicCamera') {
                this.panOrthographicCamera(this._panDelta);
            }
            this._panDelta.set(0, 0);
            changed = true;
        }

        if (this._zoomScale !== 1) {
            if (camType === 'PerspectiveCamera') {
                this.dollyPerspectiveCamera(this._zoomScale);
                this.updateFromSpherical();
            } else if (camType === 'OrthographicCamera') {
                this.dollyOrthographicCamera(this._zoomScale);
            }
            this._zoomScale = 1;
            changed = true;
        }

        if (changed) {
            this.dispatchEvent(_changeEvent);
        }
        this.getPvMatrix();
    }

    updateFromSpherical() {
        const offset = new Vector3().setFromSpherical(this.spherical);

        if (this.unlimited) {
            const { phi, theta } = this.spherical;

            if (phi === 0 || phi === Math.PI) {
                defaultUp = this.object.up.clone();
                this.object.up.set(
                    -Math.sin(theta),
                    0,
                    Math.cos(-theta)
                );
            } else if (phi > Math.PI || phi < 0) {
                this.object.up.copy(oppositeUp);
            } else {
                this.object.up.copy(defaultUp);
            }
        }

        this.object.position.copy(this.target.clone().add(offset));
        this.updateCamera();
    }

    updateCamera() {
        this.object.lookAt(this.target);
        this.object.updateMatrixWorld(true);
    }

    resetSpherical() {
        this.spherical.setFromVector3(
            this.object.position.clone().sub(this.target)
        );
    }

    getPvMatrix() {
        const { projectionMatrix, matrixWorldInverse } = this.object as Camera;
        return this.pvMatrix.multiplyMatrices(
            projectionMatrix,
            matrixWorldInverse
        );
    }

    disconnect() {
        this.domElement.removeEventListener('pointerdown', this.onPointerDown);
        this.domElement.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
        this.domElement.removeEventListener('wheel', this.onWheel);
    }

    dispose() {
        this.disconnect();
        this.object = undefined as unknown as Object3D;
        this.domElement = undefined as unknown as HTMLElement;
    }
}


export { BlenderControls as Controls }