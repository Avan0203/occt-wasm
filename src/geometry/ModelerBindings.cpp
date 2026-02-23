#include "ModelerBindings.h"
#include "shared/Shared.hpp"
#include <TopoDS_Shape.hxx>
#include <TopoDS_Edge.hxx>
#include <BRepFilletAPI_MakeFillet.hxx>
#include <BRepFilletAPI_MakeChamfer.hxx>
#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;

namespace {

TopoDS_Shape fillet(const TopoDS_Shape& shape, const TopoEdgeArray& edges, double radius) {
    std::vector<TopoDS_Edge> edgeList = emscripten::vecFromJSArray<TopoDS_Edge>(edges);
    BRepFilletAPI_MakeFillet filletBuilder(shape);
    for (const TopoDS_Edge& edge : edgeList) {
        if (!edge.IsNull()) {
            filletBuilder.Add(radius, edge);
        }
    }
    filletBuilder.Build();
    return filletBuilder.IsDone() ? filletBuilder.Shape() : TopoDS_Shape();
}

TopoDS_Shape chamfer(const TopoDS_Shape& shape, const TopoEdgeArray& edges, double distance) {
    std::vector<TopoDS_Edge> edgeList = emscripten::vecFromJSArray<TopoDS_Edge>(edges);
    BRepFilletAPI_MakeChamfer chamferBuilder(shape);
    for (const TopoDS_Edge& edge : edgeList) {
        if (!edge.IsNull()) {
            chamferBuilder.Add(distance, edge);
        }
    }
    chamferBuilder.Build();
    return chamferBuilder.IsDone() ? chamferBuilder.Shape() : TopoDS_Shape();
}

} // anonymous namespace

namespace ModelerBindings {

struct Modeler {};

void registerBindings() {
    class_<Modeler>("Modeler")
        .class_function("fillet", &fillet)
        .class_function("chamfer", &chamfer);
}

} // namespace ModelerBindings
