import { Box3, Object3D, Vector3, Quaternion, Matrix4 } from "three";
import { TransformControls as ThreeTransformControls } from "three/examples/jsm/Addons.js";
import { ThreeRenderer } from "./three-renderer";
import { BrepGroup } from "./object";

const tmpBox = new Box3();
const worldBox = new Box3();

const worldPosition = new Vector3();
const worldQuaternion = new Quaternion();
const worldScale = new Vector3();

const objectMatrixWorld = new Matrix4();

const attachObjects = new Map<BrepGroup, Object3D>();


class TransformControls extends ThreeTransformControls {
    private transformObject: Object3D;
    constructor(renderer: ThreeRenderer) {
        super(renderer.getCamera(), renderer.getContainer());
        this.transformObject = new Object3D();

        this.addEventListener('mouseUp',this.syncTransform.bind(this))
    }

    private resetState(): void {
        attachObjects.clear();
        this.transformObject.clear();
        worldBox.makeEmpty();
        this.transformObject.matrix.identity();
        this.transformObject.matrix.decompose(this.transformObject.position, this.transformObject.quaternion, this.transformObject.scale);
    }

    attachObject(objects: BrepGroup[]): void {
        if (objects.length === 0) return;
        console.log('--- attachObject start ---');
        console.log('worldBox before:', worldBox.min.toArray(), worldBox.max.toArray());
        objects.forEach(object => {
            object.updateMatrixWorld();
            tmpBox.setFromObject(object, true);
            tmpBox.applyMatrix4(object.matrixWorld);
            console.log(`object[${object.id}] setFromObject:`, tmpBox.min.toArray(), tmpBox.max.toArray());
            console.log(`object[${object.id}] position:`, object.position.toArray());
            console.log(`object[${object.id}] matrixWorld:`, object.matrixWorld.elements);
            worldBox.union(tmpBox);
            attachObjects.set(object, object.parent as Object3D);
        });

        console.log(worldBox.clone(),'跟新后的worldBox');

        worldBox.getCenter(this.transformObject.position);
        console.log('worldBox after:', worldBox.min.toArray(), worldBox.max.toArray());
        console.log('transformObject.position (center):', this.transformObject.position.toArray());

        objects.forEach(object => {
            object.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
            console.log(`object[${object.id}] worldPosition:`, worldPosition.toArray());

            object.removeFromParent();
            this.transformObject.add(object);
            object.position.copy(worldPosition).sub(this.transformObject.position);
            console.log(`object[${object.id}] localPosition after:`, object.position.toArray());
            object.quaternion.copy(worldQuaternion);
            object.scale.copy(worldScale);
        })

        this.attach(this.transformObject);
        console.log('--- attachObject end ---');
    }

    /** mouseUp 时同步 GPUPickScene 和 TopoDS_Shape location，物体保留在 transformObject 中 */
    private syncTransform(): void {
        const groups = this.transformObject.children as BrepGroup[];
        groups.forEach((object: BrepGroup) => {
            object.updateMatrixWorld();
            object.syncTransform();
        });
    }

    detachObject(): void {
        const groups = [...this.transformObject.children] as BrepGroup[];
        groups.forEach((object: BrepGroup) => {
            object.updateMatrixWorld();
            objectMatrixWorld.copy(object.matrixWorld);
            const parent = attachObjects.get(object)!;

            object.removeFromParent();
            parent.add(object);
            object.transformToWorldMatrix(objectMatrixWorld);
        });

        this.resetState();
        super.detach();
    }

    getTransformObject(): Object3D {
        return this.transformObject;
    }
}

enum TransformControlsMode {
    TRANSLATE = 'translate',
    ROTATE = 'rotate',
    SCALE = 'scale',
}

export { TransformControls, TransformControlsMode };