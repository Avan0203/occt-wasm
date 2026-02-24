#include "ModelerBindings.h"
#include "shared/Shared.hpp"
#include "utils/UtilsBindings.h"
#include <TopoDS_Shape.hxx>
#include <BRepAlgoAPI_BooleanOperation.hxx>
#include <BRepAlgoAPI_Fuse.hxx>
#include <BRepAlgoAPI_Cut.hxx>
#include <BRepAlgoAPI_Common.hxx>
#include <TopoDS_Edge.hxx>
#include <BRepFilletAPI_MakeFillet.hxx>
#include <BRepFilletAPI_MakeChamfer.hxx>
#include <BRepPrimAPI_MakePrism.hxx>
#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;

namespace {

/**
 * @description: 倒圆角
 * @param {TopoDS_Shape&} shape
 * @param {TopoEdgeArray&} edges
 * @param {double} radius
 * @return {TopoDS_Shape} 倒圆角后的shape
 */
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

/**
 * @description: 倒角
 * @param {TopoDS_Shape&} shape
 * @param {TopoEdgeArray&} edges
 * @param {double} distance
 * @return {TopoDS_Shape} 倒角后的shape
 */
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

/**
 * @description: 拉伸
 * @param {TopoDS_Shape&} shape
 * @param {Vector3&} direction
 * @return {TopoDS_Shape} 拉伸后的shape
 */
TopoDS_Shape prism(const TopoDS_Shape& shape, const Vector3& direction) {
    gp_Vec dir(direction.x, direction.y, direction.z);
    BRepPrimAPI_MakePrism prismBuilder(shape, dir);
    prismBuilder.Build();
    return prismBuilder.IsDone() ? prismBuilder.Shape() : TopoDS_Shape();
}


/**
 * @description: 布尔运算
 * @param {BRepAlgoAPI_BooleanOperation&} boolOperator
 * @param {TopoShapeArray&} args
 * @param {TopoShapeArray&} tools
 * @return {TopoDS_Shape} 布尔运算后的shape
 */
TopoDS_Shape booleanOperate(BRepAlgoAPI_BooleanOperation& boolOperator, const TopoShapeArray& args, const TopoShapeArray& tools, double fuzzyValue){
    TopTools_ListOfShape argsList = topoShapeArrayToListOfShape(args);
    TopTools_ListOfShape toolsList = topoShapeArrayToListOfShape(tools);

    boolOperator.SetFuzzyValue(fuzzyValue);
    boolOperator.SetToFillHistory(false);
    boolOperator.SetArguments(argsList);
    boolOperator.SetTools(toolsList);
    boolOperator.Build();
    return boolOperator.IsDone() ? boolOperator.Shape() : TopoDS_Shape();
}

/**
 * @description: 并集
 * @param {TopoShapeArray&} args
 * @param {TopoShapeArray&} tools
 * @return {TopoDS_Shape} 并集后的shape
 */
TopoDS_Shape fuse(const TopoShapeArray& args, const TopoShapeArray& tools, double fuzzyValue = Constants::EPSILON) {
    BRepAlgoAPI_Fuse boolOperator;
    return booleanOperate(boolOperator, args, tools, fuzzyValue);
}

/**
 * @description: 差集
 * @param {TopoShapeArray&} args
 * @param {TopoShapeArray&} tools
 * @return {TopoDS_Shape} 差集后的shape
 */
TopoDS_Shape difference(const TopoShapeArray& args, const TopoShapeArray& tools, double fuzzyValue = Constants::EPSILON) {
    BRepAlgoAPI_Cut boolOperator;
    return booleanOperate(boolOperator, args, tools, fuzzyValue);
}

/**
 * @description: 交集
 * @param {TopoShapeArray&} args
 * @param {TopoShapeArray&} tools
 * @return {TopoDS_Shape} 交集后的shape
 */
TopoDS_Shape intersection(const TopoShapeArray& args, const TopoShapeArray& tools, double fuzzyValue = Constants::EPSILON) {
    BRepAlgoAPI_Common boolOperator;
    return booleanOperate(boolOperator, args, tools, fuzzyValue);
}


} // anonymous namespace

namespace ModelerBindings {

struct Modeler {};

void registerBindings() {
    class_<Modeler>("Modeler")
        .class_function("fillet", &fillet)
        .class_function("chamfer", &chamfer)
        .class_function("prism", &prism)
        .class_function("union", &fuse)
        .class_function("difference", &difference)
        .class_function("intersection", &intersection);
}

} // namespace ModelerBindings
