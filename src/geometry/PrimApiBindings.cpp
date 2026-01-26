#include "PrimApiBindings.h"
#include <BRepPrimAPI_MakePrism.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_MakeShape.hxx>
#include <BRepBuilderAPI_Command.hxx>
#include <TopoDS_Shape.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Wire.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Vertex.hxx>
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <gp_Dir.hxx>
#include <gp_Lin.hxx>
#include <gp_Circ.hxx>
#include <gp_Pln.hxx>
#include <emscripten/bind.h>

using namespace emscripten;

namespace PrimApiBindings {

void registerBindings() {
    // ========== MakePrism (BRepPrimAPI_MakePrism) - 拉伸 ==========
    class_<BRepPrimAPI_MakePrism, base<BRepBuilderAPI_MakeShape>>("BRepPrimAPI_MakePrism")
        // Only keep the most common constructor to avoid signature conflicts
        .constructor<const TopoDS_Shape&, const gp_Vec&>()
        .function("shape", optional_override([](BRepPrimAPI_MakePrism& self) -> TopoDS_Shape {
            return self.Shape();
        }))
        .function("isDone", &BRepPrimAPI_MakePrism::IsDone)
        .function("firstShape", optional_override([](BRepPrimAPI_MakePrism& self) -> TopoDS_Shape {
            return self.FirstShape();
        }))
        .function("lastShape", optional_override([](BRepPrimAPI_MakePrism& self) -> TopoDS_Shape {
            return self.LastShape();
        }))
        // Other constructors via class_function
        .class_function("createWithVector", optional_override([](const TopoDS_Shape& shape, const gp_Vec& vec) {
            BRepPrimAPI_MakePrism prism(shape, vec);
            prism.Build();
            return prism;
        }))
        .class_function("createWithVectorAndOptions", optional_override([](const TopoDS_Shape& shape, const gp_Vec& vec, bool copy, bool canonize) {
            BRepPrimAPI_MakePrism prism(shape, vec, copy, canonize);
            prism.Build();
            return prism;
        }))
        .class_function("createWithDirection", optional_override([](const TopoDS_Shape& shape, const gp_Dir& dir) {
            BRepPrimAPI_MakePrism prism(shape, dir);
            prism.Build();
            return prism;
        }))
        .class_function("createWithDirectionAndOptions", optional_override([](const TopoDS_Shape& shape, const gp_Dir& dir, bool inf, bool copy, bool canonize) {
            BRepPrimAPI_MakePrism prism(shape, dir, inf, copy, canonize);
            prism.Build();
            return prism;
        }));

    // ========== MakeEdge (BRepBuilderAPI_MakeEdge) - 制作边 ==========
    class_<BRepBuilderAPI_MakeEdge, base<BRepBuilderAPI_MakeShape>>("BRepBuilderAPI_MakeEdge")
        // Only keep the most common constructor (two points)
        .constructor<const gp_Pnt&, const gp_Pnt&>()
        .function("shape", optional_override([](BRepBuilderAPI_MakeEdge& self) -> TopoDS_Shape {
            return self.Shape();
        }))
        .function("isDone", &BRepBuilderAPI_MakeEdge::IsDone)
        .function("edge", optional_override([](BRepBuilderAPI_MakeEdge& self) -> TopoDS_Edge {
            return self.Edge();
        }))
        .function("vertex1", optional_override([](BRepBuilderAPI_MakeEdge& self) -> TopoDS_Vertex {
            return self.Vertex1();
        }))
        .function("vertex2", optional_override([](BRepBuilderAPI_MakeEdge& self) -> TopoDS_Vertex {
            return self.Vertex2();
        }))
        // Other constructors via class_function
        .class_function("createFromVertices", optional_override([](const TopoDS_Vertex& v1, const TopoDS_Vertex& v2) {
            BRepBuilderAPI_MakeEdge edge(v1, v2);
            return edge;
        }))
        .class_function("createFromLine", optional_override([](const gp_Lin& line) {
            BRepBuilderAPI_MakeEdge edge(line);
            return edge;
        }))
        .class_function("createFromLineParams", optional_override([](const gp_Lin& line, double p1, double p2) {
            BRepBuilderAPI_MakeEdge edge(line, p1, p2);
            return edge;
        }))
        .class_function("createFromLineAndPoints", optional_override([](const gp_Lin& line, const gp_Pnt& p1, const gp_Pnt& p2) {
            BRepBuilderAPI_MakeEdge edge(line, p1, p2);
            return edge;
        }))
        .class_function("createFromLineAndVertices", optional_override([](const gp_Lin& line, const TopoDS_Vertex& v1, const TopoDS_Vertex& v2) {
            BRepBuilderAPI_MakeEdge edge(line, v1, v2);
            return edge;
        }))
        .class_function("createFromCircle", optional_override([](const gp_Circ& circle) {
            BRepBuilderAPI_MakeEdge edge(circle);
            return edge;
        }))
        .class_function("createFromCircleParams", optional_override([](const gp_Circ& circle, double p1, double p2) {
            BRepBuilderAPI_MakeEdge edge(circle, p1, p2);
            return edge;
        }))
        .class_function("createFromCircleAndPoints", optional_override([](const gp_Circ& circle, const gp_Pnt& p1, const gp_Pnt& p2) {
            BRepBuilderAPI_MakeEdge edge(circle, p1, p2);
            return edge;
        }))
        .class_function("createFromCircleAndVertices", optional_override([](const gp_Circ& circle, const TopoDS_Vertex& v1, const TopoDS_Vertex& v2) {
            BRepBuilderAPI_MakeEdge edge(circle, v1, v2);
            return edge;
        }));

    // ========== MakeWire (BRepBuilderAPI_MakeWire) - 制作Wire ==========
    class_<BRepBuilderAPI_MakeWire, base<BRepBuilderAPI_MakeShape>>("BRepBuilderAPI_MakeWire")
        // Only keep empty constructor, use addEdge/addWire to build
        .constructor<>()
        .constructor<const TopoDS_Edge&>()
        .constructor<const TopoDS_Edge&, const TopoDS_Edge&>()
        .constructor<const TopoDS_Edge&, const TopoDS_Edge&, const TopoDS_Edge&>()
        .constructor<const TopoDS_Edge&, const TopoDS_Edge&, const TopoDS_Edge&, const TopoDS_Edge&>()
        .function("shape", optional_override([](BRepBuilderAPI_MakeWire& self) -> TopoDS_Shape {
            return self.Shape();
        }))
        .function("isDone", &BRepBuilderAPI_MakeWire::IsDone)
        .function("wire", optional_override([](BRepBuilderAPI_MakeWire& self) -> TopoDS_Wire {
            return self.Wire();
        }))
        .function("addEdge", optional_override([](BRepBuilderAPI_MakeWire& self, const TopoDS_Edge& edge) {
            self.Add(edge);
        }))
        .function("addWire", optional_override([](BRepBuilderAPI_MakeWire& self, const TopoDS_Wire& wire) {
            self.Add(wire);
        }))
        .function("edge", optional_override([](BRepBuilderAPI_MakeWire& self) -> TopoDS_Edge {
            return self.Edge();
        }))
        .function("vertex", optional_override([](BRepBuilderAPI_MakeWire& self) -> TopoDS_Vertex {
            return self.Vertex();
        }))
        // Other constructors via class_function
        .class_function("createFromWire", optional_override([](const TopoDS_Wire& w) {
            BRepBuilderAPI_MakeWire wire(w);
            return wire;
        }))
        .class_function("createFromWireAndEdge", optional_override([](const TopoDS_Wire& w, const TopoDS_Edge& e) {
            BRepBuilderAPI_MakeWire wire(w, e);
            return wire;
        }));

    // ========== MakeFace (BRepBuilderAPI_MakeFace) - 制作面 ==========
    class_<BRepBuilderAPI_MakeFace, base<BRepBuilderAPI_MakeShape>>("BRepBuilderAPI_MakeFace")
        // Only keep empty constructor, use class_function for other ways
        .constructor<>()
        .constructor<const TopoDS_Face&>()
        .function("shape", optional_override([](BRepBuilderAPI_MakeFace& self) -> TopoDS_Shape {
            return self.Shape();
        }))
        .function("isDone", &BRepBuilderAPI_MakeFace::IsDone)
        .function("face", optional_override([](BRepBuilderAPI_MakeFace& self) -> TopoDS_Face {
            return self.Face();
        }))
        .function("addWire", optional_override([](BRepBuilderAPI_MakeFace& self, const TopoDS_Wire& wire) {
            self.Add(wire);
        }))
        // Other constructors via class_function
        .class_function("createFromWire", optional_override([](const TopoDS_Wire& wire, bool onlyPlane) {
            BRepBuilderAPI_MakeFace face(wire, onlyPlane);
            return face;
        }))
        .class_function("createFromPlane", optional_override([](const gp_Pln& plane) {
            BRepBuilderAPI_MakeFace face(plane);
            return face;
        }))
        .class_function("createFromPlaneAndWire", optional_override([](const gp_Pln& plane, const TopoDS_Wire& wire, bool inside) {
            BRepBuilderAPI_MakeFace face(plane, wire, inside);
            return face;
        }));
}

} // namespace PrimApiBindings
