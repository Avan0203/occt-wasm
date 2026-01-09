#include "BRepBindings.h"
#include <TopoDS_Shape.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Vertex.hxx>
#include <TopoDS_Wire.hxx>
#include <TopoDS_Shell.hxx>
#include <TopoDS_Solid.hxx>
#include <TopoDS_Compound.hxx>
#include <TopoDS.hxx>
#include <TopAbs.hxx>
#include <gp_Trsf.hxx>
#include <BRepBuilderAPI_Transform.hxx>
#include <emscripten/bind.h>

using namespace emscripten;

namespace BRepBindings {

// Helper functions for shape type checking
bool isFace(const TopoDS_Shape& shape) {
    return shape.ShapeType() == TopAbs_FACE;
}

bool isEdge(const TopoDS_Shape& shape) {
    return shape.ShapeType() == TopAbs_EDGE;
}

bool isVertex(const TopoDS_Shape& shape) {
    return shape.ShapeType() == TopAbs_VERTEX;
}

bool isWire(const TopoDS_Shape& shape) {
    return shape.ShapeType() == TopAbs_WIRE;
}

bool isShell(const TopoDS_Shape& shape) {
    return shape.ShapeType() == TopAbs_SHELL;
}

bool isSolid(const TopoDS_Shape& shape) {
    return shape.ShapeType() == TopAbs_SOLID;
}

bool isCompound(const TopoDS_Shape& shape) {
    return shape.ShapeType() == TopAbs_COMPOUND;
}

// Helper functions for casting
TopoDS_Face toFace(const TopoDS_Shape& shape) {
    return TopoDS::Face(shape);
}

TopoDS_Edge toEdge(const TopoDS_Shape& shape) {
    return TopoDS::Edge(shape);
}

TopoDS_Vertex toVertex(const TopoDS_Shape& shape) {
    return TopoDS::Vertex(shape);
}

TopoDS_Wire toWire(const TopoDS_Shape& shape) {
    return TopoDS::Wire(shape);
}

TopoDS_Shell toShell(const TopoDS_Shape& shape) {
    return TopoDS::Shell(shape);
}

TopoDS_Solid toSolid(const TopoDS_Shape& shape) {
    return TopoDS::Solid(shape);
}

TopoDS_Compound toCompound(const TopoDS_Shape& shape) {
    return TopoDS::Compound(shape);
}

// Helper function to get shape type as string
std::string getShapeTypeString(const TopoDS_Shape& shape) {
    switch (shape.ShapeType()) {
        case TopAbs_COMPOUND: return "COMPOUND";
        case TopAbs_COMPSOLID: return "COMPSOLID";
        case TopAbs_SOLID: return "SOLID";
        case TopAbs_SHELL: return "SHELL";
        case TopAbs_FACE: return "FACE";
        case TopAbs_WIRE: return "WIRE";
        case TopAbs_EDGE: return "EDGE";
        case TopAbs_VERTEX: return "VERTEX";
        default: return "SHAPE";
    }
}

void registerBindings() {
    // ========== Shape (TopoDS_Shape) ==========
    class_<TopoDS_Shape>("Shape")
        .constructor<>()
        .constructor<const TopoDS_Shape&>()
        .function("isNull", &TopoDS_Shape::IsNull)
        .function("shapeType", &TopoDS_Shape::ShapeType)
        .function("shapeTypeString", &getShapeTypeString)
        .function("isFace", &isFace)
        .function("isEdge", &isEdge)
        .function("isVertex", &isVertex)
        .function("isWire", &isWire)
        .function("isShell", &isShell)
        .function("isSolid", &isSolid)
        .function("isCompound", &isCompound)
        .function("toFace", &toFace)
        .function("toEdge", &toEdge)
        .function("toVertex", &toVertex)
        .function("toWire", &toWire)
        .function("toShell", &toShell)
        .function("toSolid", &toSolid)
        .function("toCompound", &toCompound)
        .function("transform", 
            optional_override([](const TopoDS_Shape& shape, const gp_Trsf& trsf) -> TopoDS_Shape {
                BRepBuilderAPI_Transform transformer(shape, trsf);
                return transformer.Shape();
            }))
        .function("location", 
            optional_override([](const TopoDS_Shape& shape) -> TopLoc_Location {
                return shape.Location();
            }))
        .function("orientation", 
            optional_override([](const TopoDS_Shape& shape) -> TopAbs_Orientation {
                return shape.Orientation();
            }))
        ;

    // ========== Face (TopoDS_Face) ==========
    class_<TopoDS_Face, base<TopoDS_Shape>>("Face")
        .constructor<>()
        .constructor<const TopoDS_Face&>()
        ;

    // ========== Edge (TopoDS_Edge) ==========
    class_<TopoDS_Edge, base<TopoDS_Shape>>("Edge")
        .constructor<>()
        .constructor<const TopoDS_Edge&>()
        ;

    // ========== Vertex (TopoDS_Vertex) ==========
    class_<TopoDS_Vertex, base<TopoDS_Shape>>("Vertex")
        .constructor<>()
        .constructor<const TopoDS_Vertex&>()
        ;

    // ========== Wire (TopoDS_Wire) ==========
    class_<TopoDS_Wire, base<TopoDS_Shape>>("Wire")
        .constructor<>()
        .constructor<const TopoDS_Wire&>()
        ;

    // ========== Shell (TopoDS_Shell) ==========
    class_<TopoDS_Shell, base<TopoDS_Shape>>("Shell")
        .constructor<>()
        .constructor<const TopoDS_Shell&>()
        ;

    // ========== Solid (TopoDS_Solid) ==========
    class_<TopoDS_Solid, base<TopoDS_Shape>>("Solid")
        .constructor<>()
        .constructor<const TopoDS_Solid&>()
        ;

    // ========== Compound (TopoDS_Compound) ==========
    class_<TopoDS_Compound, base<TopoDS_Shape>>("Compound")
        .constructor<>()
        .constructor<const TopoDS_Compound&>()
        ;

    // ========== ShapeType enum ==========
    enum_<TopAbs_ShapeEnum>("ShapeType")
        .value("COMPOUND", TopAbs_COMPOUND)
        .value("COMPSOLID", TopAbs_COMPSOLID)
        .value("SOLID", TopAbs_SOLID)
        .value("SHELL", TopAbs_SHELL)
        .value("FACE", TopAbs_FACE)
        .value("WIRE", TopAbs_WIRE)
        .value("EDGE", TopAbs_EDGE)
        .value("VERTEX", TopAbs_VERTEX)
        ;

    // ========== Orientation enum ==========
    enum_<TopAbs_Orientation>("Orientation")
        .value("FORWARD", TopAbs_FORWARD)
        .value("REVERSED", TopAbs_REVERSED)
        .value("INTERNAL", TopAbs_INTERNAL)
        .value("EXTERNAL", TopAbs_EXTERNAL)
        ;
}

} // namespace BRepBindings

