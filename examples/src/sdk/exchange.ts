import { ShapeNode, TopoDS_Shape } from "public/occt-wasm";
import { getOCCTModule } from "./occt-loader";
import { Constants } from "./utils";

class Exchange {
    static importSTEP(buffer: Uint8Array): ShapeNode {
        const { Exchange } = getOCCTModule();
        return Exchange.importSTEP(buffer) as ShapeNode;
    }

    static importIGES(buffer: Uint8Array): ShapeNode {
        const { Exchange } = getOCCTModule();
        return Exchange.importIGES(buffer) as ShapeNode;
    }

    static importSTL(buffer: Uint8Array): ShapeNode {
        const { Exchange } = getOCCTModule();
        return Exchange.importSTL(buffer) as ShapeNode;
    }

    static importBREP(buffer: Uint8Array): TopoDS_Shape {
        const { Exchange } = getOCCTModule();
        return Exchange.importBREP(buffer);
    }

    static exportSTEP(shapeNode: ShapeNode): Uint8Array {
        const { Exchange } = getOCCTModule();
        return Exchange.exportSTEP(shapeNode);
    }

    static exportIGES(shapeNode: ShapeNode): Uint8Array {
        const { Exchange } = getOCCTModule();
        return Exchange.exportIGES(shapeNode);
    }

    static exportSTL(shapes: TopoDS_Shape[], linearDeflection = Constants.LINE_DEFLECTION, angularDeflection = Constants.ANGLE_DEFLECTION): Uint8Array {
        const { Exchange } = getOCCTModule();
        return Exchange.exportSTL(shapes, linearDeflection, angularDeflection);
    }

    static exportBREP(shapes: TopoDS_Shape[]): Uint8Array {
        const { Exchange } = getOCCTModule();
        return Exchange.exportBREP(shapes);
    }
}

export { Exchange };