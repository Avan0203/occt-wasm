import { Box3, Object3D, Vector3, Quaternion, Matrix4 } from "three";
import { TransformControls as ThreeTransformControls } from "three/examples/jsm/Addons.js";
import { ThreeRenderer } from "./three-renderer";
import { BrepGroup } from "./object";

const transformObject = new Object3D();
const tmpBox = new Box3();
const worldBox = new Box3();

const worldPosition = new Vector3();
const worldQuaternion = new Quaternion();
const worldScale = new Vector3();

const parentMatrixWorld = new Matrix4();
const objectMatrixWorld = new Matrix4();

const attachObjects = new Map<BrepGroup, Object3D>();

class TransformControls extends ThreeTransformControls {
    constructor(renderer: ThreeRenderer) {
        super(renderer.getCamera(), renderer.getContainer());
    }

    private resetState(): void {
        attachObjects.clear();
        transformObject.clear();
        worldBox.makeEmpty();
        transformObject.matrix.identity();
        transformObject.matrix.decompose(transformObject.position, transformObject.quaternion, transformObject.scale);
    }

    attachObject(objects: BrepGroup[]): void {
        if (objects.length === 0) return;
        objects.forEach(object => {
            object.updateMatrixWorld();
            tmpBox.copy(object.boundingBox);
            tmpBox.applyMatrix4(object.matrixWorld);
            worldBox.union(tmpBox);
            attachObjects.set(object, object.parent as Object3D);
        });

        worldBox.getCenter(transformObject.position);

        objects.forEach(object => {
            object.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

            object.removeFromParent();
            transformObject.add(object);
            object.position.copy(worldPosition).sub(transformObject.position);
            object.quaternion.copy(worldQuaternion);
            object.scale.copy(worldScale);
        })

        this.attach(transformObject);
    }

    detachObject(): void {
        const groups = transformObject.children as BrepGroup[];
        groups.forEach((object:BrepGroup) => {
            object.updateMatrixWorld();
            objectMatrixWorld.copy(object.matrixWorld);
            const parent = attachObjects.get(object)!;
            parent.updateMatrixWorld();
            parentMatrixWorld.copy(parent.matrixWorld);
            objectMatrixWorld.premultiply(parentMatrixWorld.invert());
            objectMatrixWorld.decompose(object.position, object.quaternion, object.scale);

            object.removeFromParent();
            parent.add(object);
        })

        this.detach();
        this.resetState();
    }
}

export { TransformControls };