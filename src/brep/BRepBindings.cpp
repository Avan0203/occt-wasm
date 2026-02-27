#include "BRepBindings.h"
#include "shared/Shared.hpp"
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
#include <TopLoc_Location.hxx>
#include <TopoDS_Iterator.hxx>
#include <TopExp_Explorer.hxx>
#include <TopExp.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <GeomAbs_CurveType.hxx>
#include <BRep_Tool.hxx>
#include <emscripten/bind.h>

using namespace emscripten;

namespace BRepBindings {

// Helper function to get shape type as string
std::string getShapeTypeString(const TopoDS_Shape& shape) {
    switch (shape.ShapeType()) {
        case TopAbs_COMPOUND: return "TopAbs_COMPOUND";
        case TopAbs_COMPSOLID: return "TopAbs_COMPSOLID";
        case TopAbs_SOLID: return "TopAbs_SOLID";
        case TopAbs_SHELL: return "TopAbs_SHELL";
        case TopAbs_FACE: return "TopAbs_FACE";
        case TopAbs_WIRE: return "TopAbs_WIRE";
        case TopAbs_EDGE: return "TopAbs_EDGE";
        case TopAbs_VERTEX: return "TopAbs_VERTEX";
        default: return "TopAbs_SHAPE";
    }
}

// Helper function to get all children as array
val getChildren(const TopoDS_Shape& shape) {
    val result = val::array();
    TopoDS_Iterator it(shape);
    int index = 0;
    for (; it.More(); it.Next()) {
        result.set(index++, it.Value());
    }
    return result;
}

// Helper function to get curve type of an edge
GeomAbs_CurveType getCurveType(const TopoDS_Edge& edge) {
    if (BRep_Tool::Degenerated(edge)) {
        return GeomAbs_OtherCurve;
    }
    BRepAdaptor_Curve curve(edge);
    return curve.GetType();
}

void registerBindings() {
    // ========== Location (TopLoc_Location) ==========
    class_<TopLoc_Location>("TopLoc_Location")
        .constructor<>()
        .constructor<const TopLoc_Location&>()
        .class_function("createWithTrsf", optional_override([](const gp_Trsf& trsf) {
            return TopLoc_Location(trsf);
        }))
        .function("isIdentity", &TopLoc_Location::IsIdentity)
        .function("identity", &TopLoc_Location::Identity)
        .function("transformation", &TopLoc_Location::Transformation)
        .function("inverted", &TopLoc_Location::Inverted)
        .function("multiplied", &TopLoc_Location::Multiplied)
        .function("divided", &TopLoc_Location::Divided)
        .function("predivided", &TopLoc_Location::Predivided)
        .function("powered", &TopLoc_Location::Powered)
        .function("isEqual", &TopLoc_Location::IsEqual)
        .function("isDifferent", &TopLoc_Location::IsDifferent)
        .function("clear", &TopLoc_Location::Clear)
        ;

    // ========== Iterator (TopoDS_Iterator) ==========
    class_<TopoDS_Iterator>("TopoDS_Iterator")
        .constructor<>()
        .constructor<const TopoDS_Shape&>()
        .constructor<const TopoDS_Shape&, bool, bool>()
        .function("initialize", 
            optional_override([](TopoDS_Iterator& self, const TopoDS_Shape& shape, bool cumOri, bool cumLoc) {
                self.Initialize(shape, cumOri, cumLoc);
            }))
        .function("more", &TopoDS_Iterator::More)
        .function("next", &TopoDS_Iterator::Next)
        .function("value", &TopoDS_Iterator::Value)
        ;

    // ========== Shape (TopoDS_Shape) ==========
    class_<TopoDS_Shape>("TopoDS_Shape")
        .constructor<>()
        .constructor<const TopoDS_Shape&>()
        // Basic queries
        .function("isNull", &TopoDS_Shape::IsNull)
        .function("nullify", &TopoDS_Shape::Nullify)
        .function("shapeType", &TopoDS_Shape::ShapeType)
        .function("shapeTypeString", &getShapeTypeString)
        // Location - simplified for frontend
        .function("location", 
            optional_override([](const TopoDS_Shape& shape) -> TopLoc_Location {
                return shape.Location();
            }))
        .function("setLocation", 
            optional_override([](TopoDS_Shape& shape, const TopLoc_Location& loc) {
                shape.Location(loc);
            }))
        .function("located", 
            optional_override([](const TopoDS_Shape& shape, const TopLoc_Location& loc) -> TopoDS_Shape {
                return shape.Located(loc);
            }))
        .function("moved", 
            optional_override([](const TopoDS_Shape& shape, const TopLoc_Location& position) -> TopoDS_Shape {
                return shape.Moved(position);
            }))
        .function("setLocationFromMatrix4",
            optional_override([](TopoDS_Shape& shape, const val& elements) {
                gp_Trsf trsf = trsfFromMatrix4Elements(elements);
                shape.Location(TopLoc_Location(trsf));
            }))
        // Orientation - simplified for frontend
        .function("orientation", 
            optional_override([](const TopoDS_Shape& shape) -> TopAbs_Orientation {
                return shape.Orientation();
            }))
        .function("setOrientation", 
            optional_override([](TopoDS_Shape& shape, TopAbs_Orientation orient) {
                shape.Orientation(orient);
            }))
        .function("oriented", 
            optional_override([](const TopoDS_Shape& shape, TopAbs_Orientation orient) -> TopoDS_Shape {
                return shape.Oriented(orient);
            }))
        .function("reverse", &TopoDS_Shape::Reverse)
        .function("reversed", &TopoDS_Shape::Reversed)
        // Comparison
        .function("isPartner", &TopoDS_Shape::IsPartner)
        .function("isSame", &TopoDS_Shape::IsSame)
        .function("isEqual", &TopoDS_Shape::IsEqual)
        .function("isNotEqual", &TopoDS_Shape::IsNotEqual)
        // Children and traversal
        .function("nbChildren", &TopoDS_Shape::NbChildren)
        .function("children", &getChildren)
        ;

    // ========== Face (TopoDS_Face) ==========
    class_<TopoDS_Face, base<TopoDS_Shape>>("TopoDS_Face")
        .constructor<>()
        .constructor<const TopoDS_Face&>()
        ;

    // ========== Edge (TopoDS_Edge) ==========
    class_<TopoDS_Edge, base<TopoDS_Shape>>("TopoDS_Edge")
        .constructor<>()
        .constructor<const TopoDS_Edge&>()
        .function("getCurveType", &getCurveType)
        ;

    // ========== Vertex (TopoDS_Vertex) ==========
    class_<TopoDS_Vertex, base<TopoDS_Shape>>("TopoDS_Vertex")
        .constructor<>()
        .constructor<const TopoDS_Vertex&>()
        ;

    // ========== Wire (TopoDS_Wire) ==========
    class_<TopoDS_Wire, base<TopoDS_Shape>>("TopoDS_Wire")
        .constructor<>()
        .constructor<const TopoDS_Wire&>()
        ;

    // ========== Shell (TopoDS_Shell) ==========
    class_<TopoDS_Shell, base<TopoDS_Shape>>("TopoDS_Shell")
        .constructor<>()
        .constructor<const TopoDS_Shell&>()
        ;

    // ========== Solid (TopoDS_Solid) ==========
    class_<TopoDS_Solid, base<TopoDS_Shape>>("TopoDS_Solid")
        .constructor<>()
        .constructor<const TopoDS_Solid&>()
        ;

    // ========== Compound (TopoDS_Compound) ==========
    class_<TopoDS_Compound, base<TopoDS_Shape>>("TopoDS_Compound")
        .constructor<>()
        .constructor<const TopoDS_Compound&>()
        ;

    // ========== ShapeType enum ==========
    enum_<TopAbs_ShapeEnum>("TopAbs_ShapeEnum")
        .value("TopAbs_COMPOUND", TopAbs_COMPOUND)
        .value("TopAbs_COMPSOLID", TopAbs_COMPSOLID)
        .value("TopAbs_SOLID", TopAbs_SOLID)
        .value("TopAbs_SHELL", TopAbs_SHELL)
        .value("TopAbs_FACE", TopAbs_FACE)
        .value("TopAbs_WIRE", TopAbs_WIRE)
        .value("TopAbs_EDGE", TopAbs_EDGE)
        .value("TopAbs_VERTEX", TopAbs_VERTEX)
        ;

    // ========== Orientation enum ==========
    enum_<TopAbs_Orientation>("TopAbs_Orientation")
        .value("TopAbs_FORWARD", TopAbs_FORWARD)
        .value("TopAbs_REVERSED", TopAbs_REVERSED)
        .value("TopAbs_INTERNAL", TopAbs_INTERNAL)
        .value("TopAbs_EXTERNAL", TopAbs_EXTERNAL)
        ;

    // ========== CurveType enum ==========
    enum_<GeomAbs_CurveType>("GeomAbs_CurveType")
        .value("GeomAbs_Line", GeomAbs_Line)
        .value("GeomAbs_Circle", GeomAbs_Circle)
        .value("GeomAbs_Ellipse", GeomAbs_Ellipse)
        .value("GeomAbs_Hyperbola", GeomAbs_Hyperbola)
        .value("GeomAbs_Parabola", GeomAbs_Parabola)
        .value("GeomAbs_BezierCurve", GeomAbs_BezierCurve)
        .value("GeomAbs_BSplineCurve", GeomAbs_BSplineCurve)
        .value("GeomAbs_OffsetCurve", GeomAbs_OffsetCurve)
        .value("GeomAbs_OtherCurve", GeomAbs_OtherCurve)
        ;
}

} // namespace BRepBindings

