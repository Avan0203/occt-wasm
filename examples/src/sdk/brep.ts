import { TopoDS_Edge, TopoDS_Face, TopoDS_Shape, TopoDS_Wire } from "public/occt-wasm";

abstract class Brep<T extends TopoDS_Shape> {
    // abstract build(): T;
}



class Edge extends Brep<TopoDS_Edge> {

}

class Wire extends Brep<TopoDS_Wire> {
}

class Face extends Brep<TopoDS_Face> {
}