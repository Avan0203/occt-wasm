
import { getOCCTModule } from "./occt-loader";
import type { gp_Pnt, gp_XYZ, gp_Vec, gp_Dir ,Vector3 as Vector3Wasm, TopoDS_Vertex} from "public/occt-wasm.js";

type Vector3Like = {
    x: number;
    y: number;
    z: number;
}

class Vector3 {
    x: number;
    y: number;
    z: number;

    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x: number | Vector3Like, y: number, z: number): this {
        if (typeof x === 'number') {
            this.x = x;
            this.y = y;
            this.z = z;
        } else {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
        }
        return this;
    }

    add(v: Vector3Like): this {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    sub(v: Vector3Like): this {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    multiply(v: Vector3Like): this {
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
        return this;
    }

    multiplyScalar(s: number): this {
        this.x *= s;
        this.y *= s;
        this.z *= s;
        return this;
    }

    divideScalar(s: number): this {
        this.x /= s;
        this.y /= s;
        this.z /= s;
        return this;
    }

    divide(v: Vector3Like): this {
        this.x /= v.x;
        this.y /= v.y;
        this.z /= v.z;
        return this;
    }

    dot(v: Vector3Like): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    cross(v: Vector3Like): Vector3 {
        return new Vector3(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x);
    }

    normalize(): this {
        const length = this.length();
        this.x /= length;
        this.y /= length;
        this.z /= length;
        return this;
    }

    length(): number {
        return Math.sqrt(this.lengthSquared());
    }

    lengthSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    distanceTo(v: Vector3Like): number {
        return Math.sqrt(this.distanceSquared(v));
    }

    distanceSquared(v: Vector3Like): number {
        return (this.x - v.x) * (this.x - v.x) + (this.y - v.y) * (this.y - v.y) + (this.z - v.z) * (this.z - v.z);
    }

    copy(v: Vector3Like) {
        this.set(v.x, v.y, v.z);
        return this;
    }

    clone(): Vector3 {
        return new Vector3(this.x, this.y, this.z);
    }

    toPnt(): gp_Pnt {
        return new (getOCCTModule().gp_Pnt)(this.x, this.y, this.z);
    }

    toXYZ(): gp_XYZ {
        return new (getOCCTModule().gp_XYZ)(this.x, this.y, this.z);
    }

    toVec(): gp_Vec {
        return new (getOCCTModule().gp_Vec)(this.x, this.y, this.z);
    }

    toDir(): gp_Dir {
        return new (getOCCTModule().gp_Dir)(this.x, this.y, this.z);
    }

    toTopoDSVertex(): TopoDS_Vertex {
        const { Vertex } = getOCCTModule();
        return Vertex.fromPoint(this);
    }

    negate(): this {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    static ZERO(): Vector3 {
        return new Vector3(0, 0, 0);
    }

    static X(): Vector3 {
        return new Vector3(1, 0, 0);
    }

    static Y(): Vector3 {
        return new Vector3(0, 1, 0);
    }
    
    static Z(): Vector3 {
        return new Vector3(0, 0, 1);
    }

    static fromVec3(vec3: Vector3Wasm): Vector3 {
        return new Vector3(vec3.x, vec3.y, vec3.z);
    }

    static fromXYZ(xyz: gp_XYZ): Vector3 {
        return new Vector3(xyz.x(), xyz.y(), xyz.z());
    }

    static fromPnt(pnt: gp_Pnt): Vector3 {
        return new Vector3(pnt.x(), pnt.y(), pnt.z());
    }

    static fromVec(vec: gp_Vec): Vector3 {
        return new Vector3(vec.x(), vec.y(), vec.z());
    }

    static fromDir(dir: gp_Dir): Vector3 {
        return new Vector3(dir.x(), dir.y(), dir.z());
    }

    static fromTopoDSVertex(vertex: TopoDS_Vertex): Vector3 {
        const { Vertex } = getOCCTModule();
        return new Vector3().copy(Vertex.toVector3(vertex));
    }
}

export { Vector3, type Vector3Like };