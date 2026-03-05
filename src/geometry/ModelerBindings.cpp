#include "ModelerBindings.h"
#include "TopoDS_Solid.hxx"
#include "TopoDS_Wire.hxx"
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
#include <BRepPrimAPI_MakeRevol.hxx>
#include <BRepOffsetAPI_MakePipeShell.hxx>
#include <BRepBuilderAPI_TransitionMode.hxx>
#include <BRepOffsetAPI_MakeThickSolid.hxx>
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

/**
 * @description: 旋转
 * @param {TopoDS_Shape&} shape
 * @param {Axis1&} axis
 * @param {double} angle
 * @return {TopoDS_Shape} 旋转后的shape
 */
TopoDS_Shape revolve(const TopoDS_Shape& shape, const Axis1& axis, double angle) {
    gp_Ax1 ax1 = Axis1::toAx1(axis);
    BRepPrimAPI_MakeRevol makeRevol(shape, ax1, angle);
    return makeRevol.IsDone() ? makeRevol.Shape() : TopoDS_Shape();
}

/**
 * @description: 扫掠
 * @param {TopoWireArray&} profile 扫掠的轮廓
 * @param {TopoDS_Wire&} path 扫掠的路径
 * @param {bool} isFrenet 是否使用Frenet模式
 * @param {bool} isForceC1 是否强制C1连续
 * @return {TopoDS_Shape} 扫掠后的shape
 */
TopoDS_Shape sweep(const TopoWireArray& profile, const TopoDS_Wire& path, bool isFrenet, bool isRound ) {
    BRepOffsetAPI_MakePipeShell makePipeShell(path);

    // 是否使用Frenet模式
    if (isFrenet) {
        makePipeShell.SetMode(isFrenet);
    }

    // 拐点处理模式
    if (isRound) {
        // 圆角处理模式
        makePipeShell.SetTransitionMode(BRepBuilderAPI_RoundCorner);
        makePipeShell.SetForceApproxC1(true);
    }else{
        // 拐角处理模式
        makePipeShell.SetTransitionMode(BRepBuilderAPI_RightCorner);
    }

    std::vector<TopoDS_Wire> wireList = emscripten::vecFromJSArray<TopoDS_Wire>(profile);
    for (const TopoDS_Wire& wire : wireList) {
        makePipeShell.Add(wire);
    }

    makePipeShell.Build();
    makePipeShell.MakeSolid();

    return makePipeShell.IsDone() ? makePipeShell.Shape() : TopoDS_Shape();
}

/**
 * @description: 抽壳
 * @param {TopoDS_Shape&} shape
 * @param {double} thickness
 * @return {TopoDS_Shape} 抽壳后的shape
*/
TopoDS_Shape thickSolid(const TopoDS_Solid& solid, const TopoShapeArray& faces, double thickness, double tolerance = Constants::EPSILON){
    // 空列表
    TopTools_ListOfShape facesList = topoShapeArrayToListOfShape(faces);

    BRepOffsetAPI_MakeThickSolid makeThickSolid;
    makeThickSolid.MakeThickSolidByJoin(solid, facesList, thickness, tolerance);
    return makeThickSolid.IsDone() ? makeThickSolid.Shape() : TopoDS_Shape();
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
        .class_function("intersection", &intersection)
        .class_function("revolve", &revolve)
        .class_function("sweep", &sweep)
        .class_function("thickSolid", &thickSolid)
        ;
}

} // namespace ModelerBindings
