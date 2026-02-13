import type { gp_Pnt, gp_Dir, gp_Ax2, gp_Circ, Geom_Circle, Geom_Ellipse, Handle_Geom_TrimmedCurve, TopoDS_Edge, TopoDS_Shape } from "public/occt-wasm";
import { Vector3 } from "./vector3";
import { EN_Direction } from "./types";
import { getOCCTModule } from "./occt-loader";
import { gc } from "./gc";

const TMP_VECTOR3 = new Vector3();
const PI = Math.PI;

function normAngle(a: number): number {
    while (a < 0) a += 2 * PI;
    while (a >= 2 * PI) a -= 2 * PI;
    return a;
}

function angleInPlane(x: number, y: number, cx: number, cy: number): number {
    return Math.atan2(y - cy, x - cx);
}

abstract class Curve {
    shape: TopoDS_Shape | null = null;
    isDirty: boolean = true;

    start = new Vector3();
    end = new Vector3();
    getLength(): number {
        return 0;
    }

    reverse(): this {
        TMP_VECTOR3.copy(this.start);
        this.start.copy(this.end);
        this.end.copy(TMP_VECTOR3);
        return this;
    }

    pointAt(t: number): Vector3 {
        return new Vector3();
    }

    isIntersects(curve: Curve): boolean {
        return false;
    }

    intersects(curve: Curve): Vector3[] {
        return [];
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

    protected build(): void {
        if (this.shape) {
            this.deleteShape();
        }
        if (!this.isDirty) {
            return;
        }
    }
}

class Line extends Curve {
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
        super.build();
        if (!this.isDirty) return;
        const occt = getOCCTModule();
        const { result: edge } = gc((c) => {
            const p1 = c(this.start.toPnt());
            const p2 = c(this.end.toPnt());
            const makeEdge = c(new occt.BRepBuilderAPI_MakeEdge(p1, p2));
            if (!makeEdge.isDone()) return null;
            return makeEdge.edge();
        });
        if (edge && !edge!.isNull()) {
            this.deleteShape();
            this.shape = edge as unknown as TopoDS_Shape;
            this.isDirty = false;
        }
    }
}

class Circle extends Curve {
    constructor(public center: Vector3, public radius: number) {
        super();
        this.set(center, radius);
    }

    set(center: Vector3, radius: number): this {
        this.center.copy(center);
        this.radius = radius;
        this.start.copy(this.center).add(new Vector3(radius, 0, 0));
        this.end.copy(this.center).add(new Vector3(radius, 0, 0));
        return this;
    }

    build(): void {
        super.build();
        if (!this.isDirty) return;
        const occt = getOCCTModule();
        const { result: edge } = gc((c) => {
            const center = c(this.center.toPnt());
            const dir = c(new occt.gp_Dir(0, 0, 1));
            const ax2 = c(new occt.gp_Ax2(center, dir));
            const circ = new occt.gp_Circ(ax2, this.radius);
            c(circ);
            const makeEdge = c(occt.BRepBuilderAPI_MakeEdge.createFromCircle(circ));
            if (!makeEdge.isDone()) return null;
            return makeEdge.edge();
        });
        if (edge && !edge!.isNull()) {
            this.deleteShape();
            this.shape = edge as unknown as TopoDS_Shape;
            this.isDirty = false;
        }
    }
}

// 逆时针方向
class Arc extends Curve {
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
        super.build();
        if (!this.isDirty) return;
        const occt = getOCCTModule();
        const ex = this.center.x + this.endPoint.x;
        const ey = this.center.y + this.endPoint.y;
        const ez = this.center.z + this.endPoint.z;
        let u1 = angleInPlane(this.startPoint.x, this.startPoint.y, this.center.x, this.center.y);
        let u2 = angleInPlane(ex, ey, this.center.x, this.center.y);
        u1 = normAngle(u1);
        u2 = normAngle(u2);
        if (this.direction > 0) {
            if (u2 >= u1) u2 -= 2 * PI;
        } else {
            if (u2 <= u1) u2 += 2 * PI;
        }
        const { result: edge } = gc((c) => {
            const center = c(this.center.toPnt());
            const dir = c(new occt.gp_Dir(0, 0, 1));
            const ax2 = c(new occt.gp_Ax2(center, dir));
            const geomCircle = c(new occt.Geom_Circle(ax2, this.radius));
            const trimmed = c(occt.Geom.trim(geomCircle, u1, u2));
            return occt.Geom.edgeFromCurve(trimmed?.get() ?? null);
        });
        if (edge && !edge!.isNull()) {
            this.deleteShape();
            this.shape = edge as unknown as TopoDS_Shape;
            this.isDirty = false;
        }
    }
}

class Ellipse extends Curve {
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
        super.build();
        if (!this.isDirty) return;
        const occt = getOCCTModule();
        const major = Math.max(this.radiusX, this.radiusY);
        const minor = Math.min(this.radiusX, this.radiusY) || major;
        const { result: edge } = gc((c) => {
            const center = c(this.center.toPnt());
            const dir = c(new Vector3(0, 0, 1).toDir());
            const ax2 = c(new occt.gp_Ax2(center, dir));
            const geomEllipse = c(new occt.Geom_Ellipse(ax2, major, minor));
            return occt.Geom.edgeFromCurve(geomEllipse);
        });
        if (edge && !edge!.isNull()) {
            this.deleteShape();
            this.shape = edge as unknown as TopoDS_Shape;
            this.isDirty = false;
        }
    }
}

class BspLineCurve extends Curve {
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
        super.build();
        if (!this.isDirty) return;
        const occt = getOCCTModule();
        const polesFlat = this.controlPoints.flatMap(p => [p.x, p.y, p.z]);
        const edge = this.weights
            ? occt.Geom.edgeFromBSplineWithWeights(polesFlat, this.knots, this.multiplicities, this.degree, this.periodic, this.weights)
            : occt.Geom.edgeFromBSpline(polesFlat, this.knots, this.multiplicities, this.degree, this.periodic);
        if (edge && !edge.isNull()) {
            this.deleteShape();
            this.shape = edge as unknown as TopoDS_Shape;
            this.isDirty = false;
        }
    }
}

export { Curve, Line, Circle, Arc, Ellipse, BspLineCurve };
