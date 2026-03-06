import { GeomAbs_Shape, TopoDS_Edge, TopoDS_Shape, TopoDS_Wire, TopoResult } from "public/occt-wasm";
import { getOCCTModule } from "./occt-loader";
import { Axis1 } from "./axis";
import { Constants } from "./utils";
import { Vector3 } from "./vector3";

class Modeler {
    static fillet(shape: TopoDS_Shape, edges: TopoDS_Edge[], radius: number): TopoResult {
        const { Modeler } = getOCCTModule();
        return Modeler.fillet(shape, edges, radius);
    }

    static chamfer(shape: TopoDS_Shape, edges: TopoDS_Edge[], distance: number): TopoResult {
        const { Modeler } = getOCCTModule();
        return Modeler.chamfer(shape, edges, distance);
    }

    static prism(shape: TopoDS_Shape, direction: Vector3): TopoResult {
        const { Modeler } = getOCCTModule();
        return Modeler.prism(shape, direction);
    }

    static union(target: TopoDS_Shape[], compare: TopoDS_Shape[], tolerance = Constants.EPSILON): TopoResult {
        const { Modeler } = getOCCTModule();
        return Modeler.union(target, compare, tolerance);
    }

    static difference(target: TopoDS_Shape[], compare: TopoDS_Shape[], tolerance = Constants.EPSILON): TopoResult {
        const { Modeler } = getOCCTModule();
        return Modeler.difference(target, compare, tolerance);
    }

    static intersection(target: TopoDS_Shape[], compare: TopoDS_Shape[], tolerance = Constants.EPSILON): TopoResult {
        const { Modeler } = getOCCTModule();
        return Modeler.intersection(target, compare, tolerance);
    }

    static revolve(shape: TopoDS_Shape, axis: Axis1, angle = Constants.TWO_PI): TopoResult {
        const { Modeler } = getOCCTModule();
        return Modeler.revolve(shape, axis, angle);
    }

    static sweep(profile: TopoDS_Wire[], path: TopoDS_Wire, isRound: boolean, isSolid: boolean, isFrenet: boolean): TopoResult {
        const { Modeler } = getOCCTModule();
        return Modeler.sweep(profile, path, isRound, isSolid, isFrenet);
    }

    static thickSolid(shape: TopoDS_Shape, tools: TopoDS_Shape[], thickness: number, tolerance = Constants.EPSILON): TopoResult {
        const { Modeler } = getOCCTModule();
        return Modeler.thickSolid(shape, tools, thickness, tolerance);
    }

    static loft(profile: TopoDS_Shape[], isRuled: boolean, continuity: GeomAbs_Shape, isSolid: boolean, tolerance = Constants.EPSILON): TopoResult {
        const { Modeler } = getOCCTModule();
        return Modeler.loft(profile, isRuled, continuity, isSolid, tolerance);
    }
}

export { Modeler };