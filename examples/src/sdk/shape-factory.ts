import { TopoDS_Solid } from "public/occt-wasm";
import { getOCCTModule } from "./occt-loader";
import { Vector3Like } from "./vector3";
import { gc } from "./gc";

class ShapeFactory {
    static Box(width: number , height: number, depth: number): TopoDS_Solid {
        const { BRepPrimAPI_MakeBox } = getOCCTModule();
        return gc((c)=> {
            const maker = c(new BRepPrimAPI_MakeBox(width, height, depth));
            return maker.shape();
        })
    }

    static Sphere(radius: number): TopoDS_Solid {
        const { BRepPrimAPI_MakeSphere } = getOCCTModule();
        return gc((c)=> {
            const maker = c(new BRepPrimAPI_MakeSphere(radius));
            return maker.shape();
        })
    }

    static Cylinder(radius: number, height: number): TopoDS_Solid {
        const { BRepPrimAPI_MakeCylinder } = getOCCTModule();
        return gc((c)=> {
            const maker = c(new BRepPrimAPI_MakeCylinder(radius, height));
            return maker.shape();
        })
    }

    static Cone(radius1: number, radius2: number, height: number): TopoDS_Solid {
        const { BRepPrimAPI_MakeCone } = getOCCTModule();
        return gc((c)=> {
            const maker = c(new BRepPrimAPI_MakeCone(radius1, radius2, height));
            return maker.shape();
        })
    }


    static Torus(radius: number, tube: number): TopoDS_Solid {
        const { BRepPrimAPI_MakeTorus } = getOCCTModule();
        return gc((c)=> {
            const maker = c(new BRepPrimAPI_MakeTorus(radius, tube));
            return maker.shape();
        })
    }
}

export { ShapeFactory };