#include "UtilsBindings.h"
#include <TopoDS_Shape.hxx>
#include <TopExp.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <BRepTools.hxx>
#include <TopAbs.hxx>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>

using namespace emscripten;

namespace UtilsBindings {

// Helper function to convert TopTools_IndexedMapOfShape to JavaScript array
val mapShapesToArray(const TopTools_IndexedMapOfShape& map) {
    val result = val::array();
    for (int i = 1; i <= map.Extent(); i++) {
        result.call<void>("push", map(i));
    }
    return result;
}

// Extract vertices from shape
val extractVertices(const TopoDS_Shape& shape) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_VERTEX, map);
    return mapShapesToArray(map);
}

// Extract edges from shape
val extractEdges(const TopoDS_Shape& shape) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_EDGE, map);
    return mapShapesToArray(map);
}

// Extract faces from shape
val extractFaces(const TopoDS_Shape& shape) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_FACE, map);
    return mapShapesToArray(map);
}

// Extract wires from shape
val extractWires(const TopoDS_Shape& shape) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_WIRE, map);
    return mapShapesToArray(map);
}

// Extract shells from shape
val extractShells(const TopoDS_Shape& shape) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_SHELL, map);
    return mapShapesToArray(map);
}

// Extract solids from shape
val extractSolids(const TopoDS_Shape& shape) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_SOLID, map);
    return mapShapesToArray(map);
}

// Count shapes of specific type
int countShapes(const TopoDS_Shape& shape, TopAbs_ShapeEnum type) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, type, map);
    return map.Extent();
}

// Check if shape is valid (using IsNull as validation check)
bool isValid(const TopoDS_Shape& shape) {
    return !shape.IsNull();
}

// Clean shape
void cleanShape(TopoDS_Shape& shape) {
    BRepTools::Clean(shape);
}

// Write shape to BRep format (returns as string, not file)
// Note: This is a placeholder - actual file writing will be in Exporter module
bool writeBRep(const TopoDS_Shape& shape, const std::string& filename) {
    return BRepTools::Write(shape, filename.c_str());
}

void registerBindings() {
    // ========== TopExp static methods ==========
    class_<TopExp>("TopExp")
        .class_function("mapShapes", static_cast<void(*)(const TopoDS_Shape&, TopAbs_ShapeEnum, TopTools_IndexedMapOfShape&)>(&TopExp::MapShapes))
        .class_function("extractVertices", &extractVertices)
        .class_function("extractEdges", &extractEdges)
        .class_function("extractFaces", &extractFaces)
        .class_function("extractWires", &extractWires)
        .class_function("extractShells", &extractShells)
        .class_function("extractSolids", &extractSolids)
        .class_function("countShapes", &countShapes)
        ;

    // ========== TopExp_Explorer ==========
    class_<TopExp_Explorer>("Explorer")
        .constructor<>()
        .constructor<const TopoDS_Shape&, TopAbs_ShapeEnum, TopAbs_ShapeEnum>()
        .function("init", &TopExp_Explorer::Init)
        .function("more", &TopExp_Explorer::More)
        .function("next", &TopExp_Explorer::Next)
        .function("current", &TopExp_Explorer::Current)
        .function("reInit", &TopExp_Explorer::ReInit)
        .function("value", &TopExp_Explorer::Value)
        ;

    // ========== BRepTools static methods ==========
    class_<BRepTools>("BRepTools")
        .class_function("isValid", &isValid)
        .class_function("clean", &cleanShape)
        .class_function("write", &writeBRep)
        ;
}

} // namespace UtilsBindings

