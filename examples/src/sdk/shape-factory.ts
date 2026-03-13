import { TopoDS_Solid, TopoResult } from "public/occt-wasm";
import { getOCCTModule } from "./occt-loader";
import { gc } from "./gc";
import { Axis2 } from "./axis";

function createPrimitive(
    factory: (axis: ReturnType<typeof Axis2.Y>) => TopoResult,
    axis = Axis2.Y()
): TopoDS_Solid {
    return gc((c) => {
        const result = factory(axis);
        if (!result.status) {
            throw new Error(`Shape creation failed: ${result.message}`);
        }
        const shape = result.takeShape();
        c(result);
        return shape;
    });
}

class ShapeFactory {
    static Box(width: number, height: number, depth: number, axis = Axis2.Y()): TopoDS_Solid {
        const { GeometryFactory } = getOCCTModule();
        return createPrimitive((ax) => GeometryFactory.Box(width, height, depth, ax), axis);
    }

    static Sphere(radius: number, axis = Axis2.Y()): TopoDS_Solid {
        const { GeometryFactory } = getOCCTModule();
        return createPrimitive((ax) => GeometryFactory.Sphere(radius, ax), axis);
    }

    static Cylinder(radius: number, height: number, axis = Axis2.Y()): TopoDS_Solid {
        const { GeometryFactory } = getOCCTModule();
        return createPrimitive((ax) => GeometryFactory.Cylinder(radius, height, ax), axis);
    }

    static Cone(radius1: number, radius2: number, height: number, axis = Axis2.Y()): TopoDS_Solid {
        const { GeometryFactory } = getOCCTModule();
        return createPrimitive((ax) => GeometryFactory.Cone(radius1, radius2, height, ax), axis);
    }

    static Torus(radius: number, tube: number, axis = Axis2.Y()): TopoDS_Solid {
        const { GeometryFactory } = getOCCTModule();
        return createPrimitive((ax) => GeometryFactory.Torus(radius, tube, ax), axis);
    }
}

export { ShapeFactory };