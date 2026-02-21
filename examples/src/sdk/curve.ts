import type { TopoDS_Edge, TopoDS_Shape } from "public/occt-wasm";
import { Vector3 } from "./vector3";
import { EN_Direction } from "./types";
import { getOCCTModule } from "./occt-loader";
import { gc } from "./gc";
import { Constants } from "./utils";



const TMP_VECTOR3 = new Vector3();
const PI = Math.PI;
const TWO_PI = 2 * PI;

interface gp_Ax2Handle {
    xDirection(): { x(): number; y(): number; z(): number };
    yDirection(): { x(): number; y(): number; z(): number };
}

function angleOnAx2(ax2: gp_Ax2Handle, dx: number, dy: number, dz: number): number {
    const xd = ax2.xDirection();
    const yd = ax2.yDirection();
    return Math.atan2(
        dx * yd.x() + dy * yd.y() + dz * yd.z(),
        dx * xd.x() + dy * xd.y() + dz * xd.z()
    );
}

function normAngle(a: number): number {
    while (a < 0) a += 2 * PI;
    while (a >= 2 * PI) a -= 2 * PI;
    return a;
}

abstract class Curve3D {
    shape: TopoDS_Edge | null = null;
    protected isDirty: boolean = true;

    normal = new Vector3();
    start = new Vector3();
    end = new Vector3();

    setNormal(normal: Vector3): this {
        this.normal.copy(normal);
        return this;
    }

    getNormal(): Vector3 {
        return this.normal.clone();
    }

    getLength(): number {
        if (this.isDirty) {
            this.build();
        }
        const occt = getOCCTModule();
        return occt.Edge.getLength(this.shape!);
    }

    reverse(): this {
        TMP_VECTOR3.copy(this.start);
        this.start.copy(this.end);
        this.end.copy(TMP_VECTOR3);
        this.isDirty = true;
        return this;
    }

    isIntersects(curve: Curve3D): boolean {
        const occt = getOCCTModule();
        if (curve.isDirty) {
            curve.build();
        }
        if (this.isDirty) {
            this.build();
        }
        return occt.Edge.isIntersect(this.shape!, curve.shape!, Constants.EPSILON);
    }

    intersects(curve: Curve3D): Vector3[] {
        const occt = getOCCTModule();
        if (this.isDirty) {
            this.build();
        }
        if (curve.isDirty) {
            curve.build();
        }
        const intersections = occt.Edge.intersections(this.shape!, curve.shape!, Constants.EPSILON);
        return intersections.map(intersection => Vector3.fromVec3(intersection));
    }

    dispose(): void {
        this.deleteShape();
    }

    protected deleteShape(): void {
        if (this.shape && !this.shape.isDeleted()) {
            this.shape.delete();
            this.shape = null as any;
        }
    }

    protected set(..._: any[]): this {
        this.isDirty = true;
        return this;
    };

    build(): void {
        this.isDirty = false;
        if (this.shape) {
            this.deleteShape();
        }
    }
}

class Line extends Curve3D {
    constructor(public start: Vector3, public end: Vector3) {
        super();
        this.set(start, end);
    }

    set(start: Vector3, end: Vector3): this {
        super.set();
        this.start.copy(start);
        this.end.copy(end);
        return this;
    }

    build(): void {
        if (!this.isDirty) return;
        super.build();
        const occt = getOCCTModule();
        const edge = gc((c) => {
            const p1 = c(this.start.toPnt());
            const p2 = c(this.end.toPnt());
            const makeEdge = c(new occt.BRepBuilderAPI_MakeEdge(p1, p2));
            if (!makeEdge.isDone()) return null;
            return makeEdge.edge();
        });
        if (edge && !edge!.isNull()) {
            this.shape = edge;
        }
    }
}

class Circle extends Curve3D {
    public radius: number = 0;
    constructor(public center: Vector3, public endPoint: Vector3) {
        super();
        this.set(center, endPoint);
    }

    set(center: Vector3, endPoint: Vector3): this {
        super.set();
        this.center.copy(center);
        this.radius = endPoint.distanceTo(center);
        this.start.copy(endPoint);
        this.end.copy(endPoint);
        return this;
    }

    build(): void {
        if (!this.isDirty) return;
        super.build();
        const occt = getOCCTModule();
        const edge = gc((c) => {
            const center = c(this.center.toPnt());
            const dir = c(this.normal.toDir());
            const ax2 = c(new occt.gp_Ax2(center, dir));

            const u = angleOnAx2(ax2,
                this.end.x - this.center.x,
                this.end.y - this.center.y,
                this.end.z - this.center.z
            );

            const geomCircle = new occt.Geom_Circle(ax2, this.radius);
            const trimmed = occt.Geom.trim(geomCircle, u, u + TWO_PI);
            return occt.Geom.edgeFromCurve(trimmed?.get() ?? null);
        });
        if (edge && !edge!.isNull()) {
            this.shape = edge;
        }
    }
}

// 逆时针方向
class Arc extends Curve3D {
    public radius: number = 0;
    public center: Vector3 = new Vector3();
    public startPoint: Vector3 = new Vector3();
    public endPoint: Vector3 = new Vector3();
    public direction: EN_Direction = EN_Direction.COUNTER_CLOCKWISE;
    constructor(center: Vector3 = new Vector3(), startPoint: Vector3 = new Vector3(), endPoint: Vector3 = new Vector3(), direction: EN_Direction = EN_Direction.COUNTER_CLOCKWISE) {
        super();
        this.set(center, startPoint, endPoint, direction);
    }
    set(center: Vector3, startPoint: Vector3, endPoint: Vector3, direction: EN_Direction): this {
        super.set();
        this.center.copy(center);
        this.startPoint.copy(startPoint);
        this.radius = this.startPoint.distanceTo(center);
        this.endPoint.copy(endPoint).sub(center).normalize().multiplyScalar(this.radius);
        this.direction = direction;
        return this;
    }

    reverse(): this {
        this.direction = -this.direction;
        return super.reverse();
    }

    getAngle(): number {
        const angle = Math.acos(this.startPoint.dot(this.endPoint) / (this.startPoint.length() * this.endPoint.length()));
        return angle * this.direction;
    }

    build(): void {
        if (!this.isDirty) return;
        super.build();
        const occt = getOCCTModule();
        const ex = this.center.x + this.endPoint.x;
        const ey = this.center.y + this.endPoint.y;
        const ez = this.center.z + this.endPoint.z;
        const edge = gc((c) => {
            const center = c(this.center.toPnt());
            const dir = c(this.normal.toDir());
            const ax2 = c(new occt.gp_Ax2(center, dir));

            let u1 = angleOnAx2(ax2,
                this.startPoint.x - this.center.x,
                this.startPoint.y - this.center.y,
                this.startPoint.z - this.center.z
            );
            let u2 = angleOnAx2(ax2,
                ex - this.center.x,
                ey - this.center.y,
                ez - this.center.z
            );

            u1 = normAngle(u1);
            u2 = normAngle(u2);
            if (this.direction > 0) {
                if (u2 >= u1) u2 -= TWO_PI;
            } else {
                if (u2 <= u1) u2 += TWO_PI;
            }

            const geomCircle = new occt.Geom_Circle(ax2, this.radius);
            const trimmed = occt.Geom.trim(geomCircle, u1, u2);
            return occt.Geom.edgeFromCurve(trimmed?.get() ?? null);
        });
        if (edge && !edge!.isNull()) {
            this.shape = edge;
        }
    }
}

class Ellipse extends Curve3D {
    constructor(public center: Vector3, public radiusX: number, public radiusY: number) {
        super();
        this.set(center, radiusX, radiusY);
    }

    set(center: Vector3, radiusX: number, radiusY: number): this {
        this.center.copy(center);
        this.radiusX = radiusX;
        this.radiusY = radiusY;
        this.start.copy(this.center).add(new Vector3(radiusX, 0, 0));
        this.end.copy(this.center).add(new Vector3(radiusX, 0, 0));
        return this;
    }

    build(): void {
        if (!this.isDirty) return;
        super.build();
        const occt = getOCCTModule();
        const major = Math.max(this.radiusX, this.radiusY);
        const minor = Math.min(this.radiusX, this.radiusY) || major;
        const edge = gc((c) => {
            const center = c(this.center.toPnt());
            const dir = c(this.normal.toDir());
            const ax2 = c(new occt.gp_Ax2(center, dir));
            const geomEllipse = new occt.Geom_Ellipse(ax2, major, minor);
            return occt.Geom.edgeFromCurve(geomEllipse);
        });
        if (edge && !edge!.isNull()) {
            this.shape = edge;
        }
    }
}

class BspLineCurve extends Curve3D {
    public controlPoints: Vector3[] = [];
    public degree: number = 3;
    public knots: number[] = [];
    public multiplicities: number[] = [];
    public periodic: boolean = false;
    public weights?: number[];

    constructor(
        controlPoints: Vector3[],
        degree: number,
        knots: number[],
        multiplicities: number[],
        periodic: boolean = false,
        weights?: number[]
    ) {
        super();
        this.set(controlPoints, degree, knots, multiplicities, periodic, weights);
    }

    set(
        controlPoints: Vector3[],
        degree: number,
        knots: number[],
        multiplicities: number[],
        periodic: boolean = false,
        weights?: number[]
    ): this {
        super.set();
        this.controlPoints = controlPoints.map(p => p.clone());
        this.degree = degree;
        this.knots = knots.slice();
        this.multiplicities = multiplicities.slice();
        this.periodic = periodic;
        this.weights = weights ? weights.slice() : undefined;
        this.validate();
        if (this.controlPoints.length) {
            this.start.copy(this.controlPoints[0]);
            this.end.copy(this.controlPoints[this.controlPoints.length - 1]);
        }
        return this;
    }

    private validate(): void {
        const poleCount = this.controlPoints.length;
        const degree = this.degree;
        if (poleCount < degree + 1) throw new Error("控制点数量必须 >= degree + 1");
        if (this.knots.length !== this.multiplicities.length) throw new Error("knots 与 multiplicities 数量必须一致");
        const sumMultiplicity = this.multiplicities.reduce((a, b) => a + b, 0);
        const expected = poleCount + degree + 1;
        if (sumMultiplicity !== expected) throw new Error(`multiplicity 总和必须等于 controlPoints + degree + 1`);
        if (this.weights && this.weights.length !== poleCount) throw new Error("weights 数量必须等于控制点数量");
    }

    build(): void {
        if (!this.isDirty) return;
        super.build();
        const occt = getOCCTModule();
        const polesFlat = this.controlPoints.flatMap(p => [p.x, p.y, p.z]);
        const edge = this.weights
            ? occt.Geom.edgeFromBSplineWithWeights(polesFlat, this.knots, this.multiplicities, this.degree, this.periodic, this.weights)
            : occt.Geom.edgeFromBSpline(polesFlat, this.knots, this.multiplicities, this.degree, this.periodic);
        if (edge && !edge.isNull()) {
            this.shape = edge;
        }
    }
}

export { Curve3D, Line, Circle, Arc, Ellipse, BspLineCurve };
