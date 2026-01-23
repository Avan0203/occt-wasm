import { TopoDS_Edge, TopoDS_Vertex, TopoDS_Face ,GeomAbs_CurveType} from "public/occt-wasm";

export interface BRepResult {
    vertices: Vertex[];
    edges: Edge[];
    faces: Face[];
}

export interface BRep {
    position: number[]; // 存放顶点
    shape:  TopoDS_Edge | TopoDS_Vertex | TopoDS_Face | null; //指向TopoDS_Wire或TopoDS_Edge或TopoDS_Vertex或TopoDS_Face或null
}

export interface Vertex extends BRep {
    position: number[];
}

export interface Edge extends BRep {
    type: GeomAbs_CurveType; // 曲线类型，一个枚举
}

export interface Face extends BRep {
    position: number[]; // 存放顶点
    index: number[]; // 存放索引
    uvs: number[]; // 存放UV
}

// 案例数据
// const result: BRepResult = {
//     vertices: [
//         {
//             position: [1, 2, 3],
//             shape: TopoDS_Vertex //指向TopoDS_Vertex的对象
//         },
//         {
//             position: [4, 5, 6],
//             shape: TopoDS_Vertex //指向TopoDS_Vertex的对象
//         }
//     ],
//     edges: [
//         {
//             position: [1, 2, 3, 4, 5, 6],
//             type: CurveType.LINE
//             shape: TopoDS_Edge //指向TopoDS_Edge的对象
//         },
//         {
//             position: [7, 8, 9],
//             type: CurveType.LINE,
//             shape: TopoDS_Edge //指向TopoDS_Edge的对象
//         }
//     ],
//     faces: [
//         {
//             position:[1, 2, 3, 4, 5, 6, 7, 8, 9],
//             index:[0, 1, 2, 3, 4, 5, 6, 7, 8],
//             shape: TopoDS_Face //指向TopoDS_Face的对象
//         }
//     ]
// }