import { gp_Ax1 } from "public/occt-wasm";
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

    static fromAx1(ax1: gp_Ax1): Axis1 {
        return new Axis1(Vector3.fromPnt(ax1.location()), Vector3.fromDir(ax1.direction()));
    }
}

export { Axis1 };