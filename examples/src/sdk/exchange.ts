import { ShapeNode, TopoDS_Shape } from "public/occt-wasm";
import { getOCCTModule } from "./occt-loader";
import { Constants } from "./utils";

/** 自定义序列化格式：单个节点的 JSON 表示（树结构 + 可选 BRep base64） */
export interface SerializedShapeNode {
    name?: string;
    color?: string;
    /** 该节点 shape 的 BRep 二进制经 base64 编码，仅当节点有 shape 时存在 */
    brep?: string;
    children?: SerializedShapeNode[];
}

/** 自定义格式文件根结构，便于后续版本演进 */
export interface SerializedShapeDocument {
    version: 1;
    root: SerializedShapeNode;
}

const CUSTOM_FORMAT_VERSION = 1 as const;

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = "";
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
        const sub = bytes.subarray(i, Math.min(i + chunk, bytes.length));
        binary += String.fromCharCode.apply(null, sub as unknown as number[]);
    }
    return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function hasValidShape(shape: TopoDS_Shape | undefined): boolean {
    return shape != null && !shape.isDeleted();
}

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

    /**
     * 将 ShapeNode 树序列化为自定义格式的 JSON 字符串（含 name/color/树结构，每个有 shape 的节点存 BRep base64）。
     */
    static serializeToCustomFormat(shapeNode: ShapeNode): string {
        const doc: SerializedShapeDocument = {
            version: CUSTOM_FORMAT_VERSION,
            root: serializeNode(shapeNode),
        };
        return JSON.stringify(doc);
    }

    /**
     * 从自定义格式的 JSON 字符串反序列化为 ShapeNode 树（可传入 shapeNodeToBrepRenderNode 等使用）。
     */
    static deserializeFromCustomFormat(json: string): ShapeNode {
        const doc = JSON.parse(json) as SerializedShapeDocument;
        if (doc.version !== 1 || !doc.root) {
            throw new Error("Unsupported or invalid serialized document");
        }
        return deserializeNode(doc.root) as unknown as ShapeNode;
    }
}

function serializeNode(node: ShapeNode): SerializedShapeNode {
    const out: SerializedShapeNode = {};
    if (node.name != null && node.name !== "") out.name = node.name;
    if (node.color != null && node.color !== "") out.color = node.color;
    if (hasValidShape(node.shape)) {
        out.brep = uint8ArrayToBase64(Exchange.exportBREP([node.shape!]));
    }
    const children = node.getChildren();
    if (children && children.length > 0) {
        out.children = children.map(serializeNode);
    }
    return out;
}

function deserializeNode(data: SerializedShapeNode): { shape?: TopoDS_Shape; name: string; color?: string; getChildren: () => ReturnType<typeof deserializeNode>[] } {
    let shape: TopoDS_Shape | undefined;
    if (data.brep) {
        const raw = Exchange.importBREP(base64ToUint8Array(data.brep));
        shape = unwrapSingleChildCompound(raw);
    }
    const name = data.name ?? "";
    const color = data.color;
    const childData = data.children ?? [];
    const childNodes = childData.map(deserializeNode);
    return {
        shape,
        name,
        color,
        getChildren: () => childNodes,
    };
}

/** 若为仅含一个子 shape 的 Compound，返回该子 shape，否则返回原 shape */
function unwrapSingleChildCompound(shape: TopoDS_Shape): TopoDS_Shape {
    const { TopAbs_ShapeEnum } = getOCCTModule();
    if (shape.shapeType() !== TopAbs_ShapeEnum.TopAbs_COMPOUND) return shape;
    const kids = shape.children() as TopoDS_Shape[] | undefined;
    if (kids && kids.length === 1) return kids[0];
    return shape;
}

export { Exchange };