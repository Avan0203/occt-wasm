import { Vector3, Vector3Like } from "./vector3";
import {
    Curve3D,
    Line,
    Circle,
    Arc,
    Ellipse,
    BspLineCurve
} from "./curve";
import { EN_Direction } from "./types";
import type { TopoDS_Shape } from "public/occt-wasm";

let builderInstance: SketchBuilder | null = null;

class SketchBuilder {
    private start: Vector3;
    private current: Vector3;
    private curves: Curve3D[] = [];
    private normal: Vector3;

    private constructor() {
        this.start = new Vector3();
        this.current = new Vector3();
        this.normal = new Vector3();
    }

    static getInstance(): SketchBuilder {
        if (builderInstance === null) {
            builderInstance = new SketchBuilder();
        }
        return builderInstance;
    }

    moveTo(point: Vector3): void {
        this.current.copy(point);
        this.start.copy(point);
    }

    lineTo(point: Vector3): void {
        this.curves.push(new Line(this.current.clone(), point.clone()));
        this.current.copy(point);
    }

    circle(center: Vector3, endPoint: Vector3): void {
        console.log('circle', center, endPoint);
        this.curves.push(new Circle(center.clone(), endPoint.clone()));
    }

    arc(
        center: Vector3,
        startPoint: Vector3,
        endPoint: Vector3,
        direction: EN_Direction = EN_Direction.COUNTER_CLOCKWISE
    ): void {
        this.curves.push(
            new Arc(
                center.clone(),
                startPoint.clone(),
                endPoint.clone(),
                direction
            )
        );
        this.current.copy(endPoint);
    }

    ellipse(center: Vector3, radiusX: number, radiusY: number): void {
        this.curves.push(
            new Ellipse(center.clone(), radiusX, radiusY)
        );
    }

    /**
     * 根据控制点数量和阶数生成 clamped uniform 的 knots 与 multiplicities。
     * 约束：sum(multiplicities) = poleCount + degree + 1。
     */
    private static clampedUniformKnots(poleCount: number, degree: number): { knots: number[]; multiplicities: number[] } {
        if (poleCount < degree + 1) {
            throw new Error("控制点数量必须 >= degree + 1");
        }
        const n = poleCount;
        const d = degree;
        const interiorCount = n - d - 1;
        const knots: number[] = [];
        const multiplicities: number[] = [];
        knots.push(0);
        multiplicities.push(d + 1);
        for (let i = 1; i <= interiorCount; i++) {
            knots.push(i);
            multiplicities.push(1);
        }
        knots.push(interiorCount + 1);
        multiplicities.push(d + 1);
        return { knots, multiplicities };
    }

    /**
     * 仅提供控制点，自动生成 clamped uniform 的 knots 与 multiplicities。
     * 当前笔位置会作为第一个控制点，因此通常先 moveTo(第一点) 再传入其余控制点，或直接传入全部控制点且不 moveTo。
     */
    bSplineFromControlPoints(
        controlPoints: Vector3[],
        options?: { degree?: number; periodic?: boolean; weights?: number[] }
    ): void {
        const degree = options?.degree ?? 3;
        const periodic = options?.periodic ?? false;
        const weights = options?.weights;
        const points = [this.current.clone(), ...controlPoints.map((p) => p.clone())];
        const { knots, multiplicities } = SketchBuilder.clampedUniformKnots(points.length, degree);
        this.curves.push(
            new BspLineCurve(points, degree, knots, multiplicities, periodic, weights)
        );
        if (controlPoints.length > 0) {
            this.current.copy(controlPoints[controlPoints.length - 1]);
        }
    }

    bSpline(
        controlPoints: Vector3[],
        degree: number,
        knots: number[],
        multiplicities: number[],
        periodic: boolean = false,
        weights?: number[]
    ): void {
        const points = [this.current.clone(), ...controlPoints.map((p) => p.clone())];
        this.curves.push(
            new BspLineCurve(
                points,
                degree,
                knots,
                multiplicities,
                periodic,
                weights
            )
        );
        if (controlPoints.length > 0) {
            this.current.copy(controlPoints[controlPoints.length - 1]);
        }
    }

    closePath(): void {
        this.curves.push(new Line(this.current.clone(), this.start.clone()));
        this.current.copy(this.start);
    }

    beginPath(normal: Vector3Like): void {
        this.reset();
        this.normal.copy(normal);
    }

    reset(): void {
        this.curves.length = 0;
        this.current.set(0, 0, 0);
        this.start.set(0, 0, 0);
        this.normal.set(0, 0, 1);
    }

    build(): Sketch {
        const curves = [...this.curves];
        const sketch = new Sketch(curves);
        sketch.normal.copy(this.normal);
        this.reset();
        return sketch;
    }
}

class Sketch {
    private curves: Curve3D[];
    readonly start = new Vector3();
    readonly end = new Vector3();
    readonly normal = new Vector3();

    constructor(curves: Curve3D[]) {
        this.curves = curves;
        this.start.copy(curves[0].start);
        this.end.copy(curves[curves.length - 1].end);
    }

    /**
     * 返回图元列表引用，便于二次修改（如修改某条 curve 的点后再 build）。
     * 修改后需对对应 curve 调用 build()，再通过 getShapes() 获取最新 shape。
     */
    getCurves(): Curve3D[] {
        return this.curves;
    }

    /**
     * 对每条 curve 执行 build() 并收集 shape，返回非 null 的 shape 列表。
     */
    getShapes(): TopoDS_Shape[] {
        const shapes: TopoDS_Shape[] = [];
        for (const curve of this.curves) {
            curve.setNormal(this.normal);
            curve.build();
            if (curve.shape != null && !curve.shape.isDeleted()) {
                shapes.push(curve.shape);
            }
        }
        return shapes;
    }

    dispose(): void {
        for (const curve of this.curves) {
            curve.dispose();
        }
        this.curves.length = 0;
    }
}

export { SketchBuilder, Sketch };
