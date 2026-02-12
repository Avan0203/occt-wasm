import { TopoDS_Shape } from "public/occt-wasm";
import { Vector3 } from "./vector3";

abstract class Curve {
    shape: TopoDS_Shape | null = null;
    isDirty: boolean = true;
    getLength(): number {
        return 0;
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
        if(this.shape && this.shape.isDeleted()){
            this.shape.delete();
            this.shape = null as any;
            this.isDirty = false;
        }
    }

    protected set(..._: any[]): this {
        this.isDirty = true;
        return this;
    };

    protected build(): void{
        if(this.shape){
            this.deleteShape();
        }
        if(!this.isDirty){
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
        // build the shape
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
        return this;
    }

    build(): void {
        super.build();
        // build the shape
    }
}

class Arc extends Curve {
    constructor(public center: Vector3, startPoint: Vector3, endPoint: Vector3) {
        super();
        this.set(center, startPoint, endPoint);
    }
    set(center: Vector3, startPoint: Vector3, endPoint: Vector3): this {
        this.center.copy(center);
        // 计算半径 和 夹角，真实结束点
        return this;
    }
    build(): void {
        super.build();
        // build the shape
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
        return this;
    }

    build(): void {
        super.build();
        // build the shape
    }
}

class BspLineCurve extends Curve {
}