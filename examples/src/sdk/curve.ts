import type { TopoDS_Edge, TopoDS_Shape } from "public/occt-wasm";
import { Vector3 } from "./vector3";
import { EN_Direction } from "./types";
import { getOCCTModule } from "./occt-loader";
import { Constants } from "./utils";
import { Axis2 } from "./axis";

const TMP_VECTOR3 = new Vector3();


function normAngle(a: number): number {
    while (a < 0) a += Constants.TWO_PI;
    while (a >= Constants.TWO_PI) a -= Constants.TWO_PI;
    return a;
}

abstract class Curve3D {
    shape: TopoDS_Edge | null = null;
    protected isDirty: boolean = true;

    protected axis = new Axis2();
    start = new Vector3();
    end = new Vector3();

    setAxis(axis: Axis2): this {
        this.axis.copy(axis);
        return this;
    }

    getAxis(): Axis2 {
        return this.axis;
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
        const { CurveFactory } = getOCCTModule();
        const edge = CurveFactory.Line(this.start, this.end);
        if (edge && !edge.isNull()) {
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
        const { CurveFactory } = getOCCTModule();
        const angle = this.axis.angleOnAxis(TMP_VECTOR3.subVectors(this.end, this.center));
        console.log(angle, angle + Constants.TWO_PI);
        const edge = CurveFactory.Circle(this.center, this.radius, angle, angle + Constants.TWO_PI, true, this.axis.direction);
        if (edge && !edge.isNull()) {
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
        const { CurveFactory } = getOCCTModule();
        let u1 = this.axis.angleOnAxis(TMP_VECTOR3.subVectors(this.startPoint, this.center));
        let u2 = this.axis.angleOnAxis(TMP_VECTOR3.subVectors(this.endPoint, this.center));
        u1 = normAngle(u1);
        u2 = normAngle(u2);
        let trimU1: number, trimU2: number;
        let adjustPeriodic: boolean;
        if (this.direction > 0) {
            [trimU1, trimU2] = [u2, u1];
            adjustPeriodic = false;
        } else {
            if (u2 <= u1) u2 += Constants.TWO_PI;
            trimU1 = u1;
            trimU2 = u2;
            adjustPeriodic = true;
        }
        const edge = CurveFactory.Circle(this.center, this.radius, trimU1, trimU2, adjustPeriodic, this.axis.direction);
        if (edge && !edge.isNull()) {
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
        super.set();
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
        const { CurveFactory } = getOCCTModule();
        const major = Math.max(this.radiusX, this.radiusY);
        const minor = Math.min(this.radiusX, this.radiusY) || major;
        const edge = CurveFactory.Ellipse(this.center, major, minor, this.axis.direction);
        if (edge && !edge.isNull()) {
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
        const { CurveFactory } = getOCCTModule();
        const edge = CurveFactory.BSpline(this.controlPoints, this.knots, this.multiplicities, this.degree, this.periodic, this.weights);
        if (edge && !edge.isNull()) {
            this.shape = edge;
        }
    }
}

export { Curve3D, Line, Circle, Arc, Ellipse, BspLineCurve };
