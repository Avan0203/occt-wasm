import { BoundingBox3, TopoDS_Compound, TopoDS_Edge, TopoDS_Face, TopoDS_Shape, TopoDS_Shell, TopoDS_Solid, TopoDS_Vertex, TopoDS_Wire } from "public/occt-wasm";
import { getOCCTModule } from "./occt-loader";
import { BRepResult, Edge as EdgeResult } from "@/common/brep-result";
import { Vector3, type Vector3Like } from "./vector3";

class Shape {
    static toBRepResult(shape: TopoDS_Shape, lineDeflection: number, angleDeviation: number): BRepResult {
        const { Shape } = getOCCTModule();
        return Shape.toBRepResult(shape, lineDeflection, angleDeviation);
    }

    static getVertices(shape: TopoDS_Shape): TopoDS_Vertex[] {
        const { Shape } = getOCCTModule();
        return Shape.getVertices(shape);
    }

    static getEdges(shape: TopoDS_Shape): TopoDS_Edge[] {
        const { Shape } = getOCCTModule();
        return Shape.getEdges(shape);
    }

    static getFaces(shape: TopoDS_Shape): TopoDS_Face[] {
        const { Shape } = getOCCTModule();
        return Shape.getFaces(shape);
    }

    static getWires(shape: TopoDS_Shape): TopoDS_Wire[] {
        const { Shape } = getOCCTModule();
        return Shape.getWires(shape);
    }

    static getSolids(shape: TopoDS_Shape): TopoDS_Solid[] {
        const { Shape } = getOCCTModule();
        return Shape.getSolids(shape);
    }

    static getCompounds(shape: TopoDS_Shape): TopoDS_Compound[] {
        const { Shape } = getOCCTModule();
        return Shape.getCompounds(shape);
    }

    static isClosed(shape: TopoDS_Shape): boolean {
        const { Shape } = getOCCTModule();
        return Shape.isClosed(shape);
    }

    static getBoundingBox(shape: TopoDS_Shape): BoundingBox3 {
        const { Shape } = getOCCTModule();
        return Shape.getBoundingBox(shape);
    }
}

class Compound {
    static fromShapes(shapes: TopoDS_Shape[]): TopoDS_Compound {
        const { Compound } = getOCCTModule();
        return Compound.fromShapes(shapes);
    }
}


class Shell {
    static fromFaces(faces: TopoDS_Face[]): TopoDS_Shell {
        const { Shell } = getOCCTModule();
        return Shell.fromFaces(faces);
    }
}

class Solid {
    static fromFaces(faces: TopoDS_Face[]): TopoDS_Solid {
        const { Solid } = getOCCTModule();
        return Solid.fromFaces(faces);
    }

    static volume(solid: TopoDS_Solid): number {
        const { Solid } = getOCCTModule();
        return Solid.volume(solid);
    }
}

class Face {
    static fromVertices(outerVertices: Vector3[], innerVertices: Vector3[][]): TopoDS_Face {
        const { Face } = getOCCTModule();
        return Face.fromVertices(outerVertices, innerVertices);
    }

    static area(face: TopoDS_Face): number {
        const { Face } = getOCCTModule();
        return Face.area(face);
    }

    static triangulate(face: TopoDS_Face, deflection: number, angleDeviation: number): TopoDS_Face {
        const { Face } = getOCCTModule();
        return Face.triangulate(face, deflection, angleDeviation);
    }
}

class Wire {
    static fromVertices(vertices: Vector3[]): TopoDS_Wire {
        const { Wire } = getOCCTModule();
        return Wire.fromVertices(vertices);
    }

    static makeFace(wire: TopoDS_Wire): TopoDS_Face {
        const { Wire } = getOCCTModule();
        return Wire.makeFace(wire);
    }

    static fromEdges(edges: TopoDS_Edge[]): TopoDS_Wire {
        const { Wire } = getOCCTModule();
        return Wire.fromEdges(edges);
    }

    static close(wire: TopoDS_Wire): TopoDS_Wire {
        const { Wire } = getOCCTModule();
        return Wire.close(wire);
    }
}


class Edge {
    static getLength(edge: TopoDS_Edge): number {
        const { Edge } = getOCCTModule();
        return Edge.getLength(edge);
    }

    static isIntersect(edge1: TopoDS_Edge, edge2: TopoDS_Edge, tolerance: number): boolean {
        const { Edge } = getOCCTModule();
        return Edge.isIntersect(edge1, edge2, tolerance);
    }

    static intersections(edge1: TopoDS_Edge, edge2: TopoDS_Edge, tolerance: number): Vector3[] {
        const { Edge } = getOCCTModule();
        return Edge.intersections(edge1, edge2, tolerance).map(intersection => new Vector3().copy(intersection));
    }

    static pointAt(edge: TopoDS_Edge, t: number): Vector3 {
        const { Edge } = getOCCTModule();
        return new Vector3().copy(Edge.pointAt(edge, t));
    }

    static trim(edge: TopoDS_Edge, start: number, end: number): TopoDS_Edge {
        const { Edge } = getOCCTModule();
        return Edge.trim(edge, start, end);
    }

    static discretize(edge: TopoDS_Edge, deflection: number, angleDeviation: number): EdgeResult {
        const { Edge } = getOCCTModule();
        return Edge.discretize(edge, deflection, angleDeviation);
    }
}


class Vertex {
    static toVector3(vertex: TopoDS_Vertex): Vector3 {
        const { Vertex } = getOCCTModule();
        return new Vector3().copy(Vertex.toVector3(vertex));
    }

    static makeVertex(point: Vector3Like): TopoDS_Vertex {
        const { Vertex } = getOCCTModule();
        const v = new Vector3(point.x, point.y, point.z);
        return Vertex.fromPoint(v);
    }
}

export {
    Vertex,
    Edge,
    Wire,
    Shape,
    Compound,
    Face,
    Shell,
    Solid,
}
