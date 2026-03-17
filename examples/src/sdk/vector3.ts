import type { Matrix4 } from "three";
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

    subVectors(v1: Vector3Like, v2: Vector3Like): this {
        this.x = v1.x - v2.x;
        this.y = v1.y - v2.y;
        this.z = v1.z - v2.z;
        return this;
    }

    addVectors(v1: Vector3Like, v2: Vector3Like): this {
        this.x = v1.x + v2.x;
        this.y = v1.y + v2.y;
        this.z = v1.z + v2.z;
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

    /** 与 Three.js Vector3.applyMatrix4 一致 */
    applyMatrix4(m: Matrix4): this {
        const x = this.x, y = this.y, z = this.z;
        const e = m.elements;
        const w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
        this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
        this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
        this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
        return this;
    }

    /** 与 Three.js Vector3.transformDirection 一致，用于方向向量 */
    transformDirection(m: Matrix4): this {
        const x = this.x, y = this.y, z = this.z;
        const e = m.elements;
        this.x = e[0] * x + e[4] * y + e[8] * z;
        this.y = e[1] * x + e[5] * y + e[9] * z;
        this.z = e[2] * x + e[6] * y + e[10] * z;
        return this.normalize();
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