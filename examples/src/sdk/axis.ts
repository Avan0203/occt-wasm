import { gp_Ax1, gp_Ax2, gp_Ax3, gp_Pln } from "public/occt-wasm";
import { Matrix4 } from "three";
import { Vector3, Vector3Like } from "./vector3";

class Axis1 {
    origin = new Vector3();
    direction = new Vector3();

    constructor(origin: Vector3Like = { x: 0, y: 0, z: 0 }, direction: Vector3Like = { x: 0, y: 0, z: 1 }) {
        this.set(origin, direction);
    }

    set(origin: Vector3Like, direction: Vector3Like) {
        this.origin.copy(origin);
        this.direction.copy(direction);
    }

    copy(axis: Axis1) {
        this.origin.copy(axis.origin);
        this.direction.copy(axis.direction);
    }

    clone() {
        return new Axis1(this.origin.clone(), this.direction.clone());
    }

    reverse() {
        this.direction.negate();
    }

    static Y(): Axis1 {
        return new Axis1(Vector3.ZERO(), Vector3.Y());
    }

    static Z(): Axis1 {
        return new Axis1(Vector3.ZERO(), Vector3.Z());
    }

    static X(): Axis1 {
        return new Axis1(Vector3.ZERO(), Vector3.X());
    }

    static fromAx1(ax1: gp_Ax1): Axis1 {
        return new Axis1(Vector3.fromPnt(ax1.location()), Vector3.fromDir(ax1.direction()));
    }
}


class Axis2 {
    origin = new Vector3();
    direction = new Vector3();
    xDirection = new Vector3();
    yDirection = new Vector3();

    constructor(origin: Vector3Like = { x: 0, y: 0, z: 0 }, direction: Vector3Like = { x: 0, y: 0, z: 1 }, xDirection: Vector3Like = { x: 1, y: 0, z: 0 }, yDirection: Vector3Like = { x: 0, y: 1, z: 0 }) {
        this.set(origin, direction, xDirection, yDirection);
    }

    set(origin: Vector3Like, direction: Vector3Like, xDirection: Vector3Like, yDirection: Vector3Like) {
        this.origin.copy(origin);
        this.direction.copy(direction);
        this.xDirection.copy(xDirection);
        this.yDirection.copy(yDirection);
    }

    copy(axis: Axis2) {
        this.origin.copy(axis.origin);
        this.direction.copy(axis.direction);
        this.xDirection.copy(axis.xDirection);
        this.yDirection.copy(axis.yDirection);
    }

    clone() {
        return new Axis2(this.origin.clone(), this.direction.clone(), this.xDirection.clone(), this.yDirection.clone());
    }

    reverse() {
        this.direction.negate();
        this.xDirection.negate();
        this.yDirection.negate();
    }

    angleOnAxis(v: Vector3): number {
        return Math.atan2(v.x * this.xDirection.x + v.y * this.xDirection.y + v.z * this.xDirection.z,
            v.x * this.yDirection.x + v.y * this.yDirection.y + v.z * this.yDirection.z);
    }

    applyMatrix(matrix: Matrix4): this {
        this.origin.applyMatrix4(matrix);
        this.direction.transformDirection(matrix);
        this.xDirection.transformDirection(matrix);
        this.yDirection.transformDirection(matrix);
        return this;
    }

    static Y(): Axis2 {
        return new Axis2(Vector3.ZERO(), Vector3.Y(), Vector3.X(), Vector3.Z());
    }

    static Z(): Axis2 {
        return new Axis2(Vector3.ZERO(), Vector3.Z(), Vector3.X(), Vector3.Y());
    }

    static X(): Axis2 {
        return new Axis2(Vector3.ZERO(), Vector3.X(), Vector3.Y(), Vector3.Z());
    }

    static fromAx2(ax2: gp_Ax2): Axis2 {
        return new Axis2(Vector3.fromPnt(ax2.location()), Vector3.fromDir(ax2.direction()), Vector3.fromDir(ax2.xDirection()), Vector3.fromDir(ax2.yDirection()));
    }
}


class Axis3 {
    origin = new Vector3();
    direction = new Vector3();
    xDirection = new Vector3();
    yDirection = new Vector3();
    zDirection = new Vector3();

    constructor(origin: Vector3Like = { x: 0, y: 0, z: 0 }, direction: Vector3Like = { x: 0, y: 0, z: 1 }, xDirection: Vector3Like = { x: 1, y: 0, z: 0 }, yDirection: Vector3Like = { x: 0, y: 1, z: 0 }, zDirection: Vector3Like = { x: 0, y: 0, z: 1 }) {
        this.set(origin, direction, xDirection, yDirection, zDirection);
    }

    set(origin: Vector3Like, direction: Vector3Like, xDirection: Vector3Like, yDirection: Vector3Like, zDirection: Vector3Like) {
        this.origin.copy(origin);
        this.direction.copy(direction);
        this.xDirection.copy(xDirection);
        this.yDirection.copy(yDirection);
        this.zDirection.copy(zDirection);
    }

    copy(axis: Axis3) {
        this.origin.copy(axis.origin);
        this.direction.copy(axis.direction);
        this.xDirection.copy(axis.xDirection);
        this.yDirection.copy(axis.yDirection);
        this.zDirection.copy(axis.zDirection);
    }

    clone() {
        return new Axis3(this.origin.clone(), this.direction.clone(), this.xDirection.clone(), this.yDirection.clone(), this.zDirection.clone());
    }

    reverse() {
        this.direction.negate();
        this.xDirection.negate();
        this.yDirection.negate();
        this.zDirection.negate();
    }

    applyMatrix(matrix: Matrix4): this {
        this.origin.applyMatrix4(matrix);
        this.direction.transformDirection(matrix);
        this.xDirection.transformDirection(matrix);
        this.yDirection.transformDirection(matrix);
        this.zDirection.transformDirection(matrix);
        return this;
    }

    static Y(): Axis3 {
        return new Axis3(Vector3.ZERO(), Vector3.Y(), Vector3.Z(), Vector3.X(), Vector3.Y());
    }
    static Z(): Axis3 {
        return new Axis3(Vector3.ZERO(), Vector3.Z(), Vector3.X(), Vector3.Y(), Vector3.Z());
    }
    static X(): Axis3 {
        return new Axis3(Vector3.ZERO(), Vector3.X(), Vector3.Y(), Vector3.Z(), Vector3.X());
    }

    static fromAx3(ax3: gp_Ax3): Axis3 {
        return new Axis3(Vector3.fromPnt(ax3.location()), Vector3.fromDir(ax3.direction()), Vector3.fromDir(ax3.xDirection()), Vector3.fromDir(ax3.yDirection()), Vector3.fromDir(ax3.direction()));
    }
}

class Plane {
    origin = new Vector3();
    normal = new Vector3();

    constructor(origin: Vector3Like = { x: 0, y: 0, z: 0 }, normal: Vector3Like = { x: 0, y: 0, z: 1 }) {
        this.set(origin, normal);
    }

    set(origin: Vector3Like, normal: Vector3Like) {
        this.origin.copy(origin);
        this.normal.copy(normal);
    }

    copy(plane: Plane) {
        this.origin.copy(plane.origin);
        this.normal.copy(plane.normal);
    }

    clone() {
        return new Plane(this.origin.clone(), this.normal.clone());
    }

    reverse() {
        this.normal.negate();
    }

    static Y(): Plane {
        return new Plane(Vector3.ZERO(), Vector3.Y());
    }
    static Z(): Plane {
        return new Plane(Vector3.ZERO(), Vector3.Z());
    }
    static X(): Plane {
        return new Plane(Vector3.ZERO(), Vector3.X());
    }
    
    static fromAx3(ax3: gp_Ax3): Plane {
        return new Plane(Vector3.fromPnt(ax3.location()), Vector3.fromDir(ax3.direction()));
    }
    static fromAx2(ax2: gp_Ax2): Plane {
        return new Plane(Vector3.fromPnt(ax2.location()), Vector3.fromDir(ax2.direction()));
    }
    static fromPln(pln: gp_Pln): Plane {
        return new Plane(Vector3.fromPnt(pln.location()), Vector3.fromDir(pln.axis().direction()));
    }
}


export { Axis1, Axis2, Axis3, Plane };