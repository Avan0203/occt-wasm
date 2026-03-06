#include <emscripten/bind.h>
#include <emscripten/val.h>

#include "ModelerBindings.h"
#include "TopAbs_ShapeEnum.hxx"
#include "TopoDS_Solid.hxx"
#include "TopoDS_Wire.hxx"
#include "shared/Shared.hpp"
#include "utils/UtilsBindings.h"
#include <TopoDS.hxx>
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
#include <BRepOffsetAPI_ThruSections.hxx>
#include <GeomAbs_Shape.hxx>


using namespace emscripten;

namespace {

/**
 * @description: 倒圆角
 * @param {TopoDS_Shape&} shape
 * @param {TopoEdgeArray&} edges
 * @param {double} radius
 * @return {TopoResult} 倒圆角后的shape
 */
TopoResult fillet(const TopoDS_Shape& shape, const TopoEdgeArray& edges, double radius) {
    std::vector<TopoDS_Edge> edgeList = emscripten::vecFromJSArray<TopoDS_Edge>(edges);
    BRepFilletAPI_MakeFillet filletBuilder(shape);
    for (const TopoDS_Edge& edge : edgeList) {
        if (!edge.IsNull()) {
            filletBuilder.Add(radius, edge);
        }
    }
    filletBuilder.Build();
    if (filletBuilder.IsDone()) {
        return TopoResult(filletBuilder.Shape(), true, "");
    } else {
        return TopoResult(TopoDS_Shape(), false, "Fillet operation failed");
    }
}

/**
 * @description: 倒角
 * @param {TopoDS_Shape&} shape
 * @param {TopoEdgeArray&} edges
 * @param {double} distance
 * @return {TopoResult} 倒角后的shape
 */
TopoResult chamfer(const TopoDS_Shape& shape, const TopoEdgeArray& edges, double distance) {
    std::vector<TopoDS_Edge> edgeList = emscripten::vecFromJSArray<TopoDS_Edge>(edges);
    BRepFilletAPI_MakeChamfer chamferBuilder(shape);
    for (const TopoDS_Edge& edge : edgeList) {
        if (!edge.IsNull()) {
            chamferBuilder.Add(distance, edge);
        }
    }
    chamferBuilder.Build();
    if (chamferBuilder.IsDone()) {
        return TopoResult(chamferBuilder.Shape(), true, "");
    } else {
        return TopoResult(TopoDS_Shape(), false, "Chamfer operation failed");
    }
}

/**
 * @description: 拉伸
 * @param {TopoDS_Shape&} shape
 * @param {Vector3&} direction
 * @return {TopoResult} 拉伸后的shape
 */
TopoResult prism(const TopoDS_Shape& shape, const Vector3& direction) {
    gp_Vec dir(direction.x, direction.y, direction.z);
    BRepPrimAPI_MakePrism prismBuilder(shape, dir);
    prismBuilder.Build();
    if (prismBuilder.IsDone()) {
        return TopoResult(prismBuilder.Shape(), true, "");
    } else {
        return TopoResult(TopoDS_Shape(), false, "Prism operation failed");
    }
}


/**
 * @description: 布尔运算
 * @param {BRepAlgoAPI_BooleanOperation&} boolOperator
 * @param {TopoShapeArray&} args
 * @param {TopoShapeArray&} tools
 * @return {TopoResult} 布尔运算后的shape
 */
TopoResult booleanOperate(BRepAlgoAPI_BooleanOperation& boolOperator, const TopoShapeArray& args, const TopoShapeArray& tools, double fuzzyValue){
    TopTools_ListOfShape argsList = topoShapeArrayToListOfShape(args);
    TopTools_ListOfShape toolsList = topoShapeArrayToListOfShape(tools);

    boolOperator.SetFuzzyValue(fuzzyValue);
    boolOperator.SetToFillHistory(false);
    boolOperator.SetArguments(argsList);
    boolOperator.SetTools(toolsList);
    boolOperator.Build();
    if (boolOperator.IsDone()) {
        return TopoResult(boolOperator.Shape(), true, "");
    } else {
        return TopoResult(TopoDS_Shape(), false, "Boolean operation failed");
    }
}

/**
 * @description: 并集
 * @param {TopoShapeArray&} args
 * @param {TopoShapeArray&} tools
 * @return {TopoResult} 并集后的shape
 */
TopoResult fuse(const TopoShapeArray& args, const TopoShapeArray& tools, double fuzzyValue = Constants::EPSILON) {
    BRepAlgoAPI_Fuse boolOperator;
    return booleanOperate(boolOperator, args, tools, fuzzyValue);
}

/**
 * @description: 差集
 * @param {TopoShapeArray&} args
 * @param {TopoShapeArray&} tools
 * @return {TopoResult} 差集后的shape
 */
TopoResult difference(const TopoShapeArray& args, const TopoShapeArray& tools, double fuzzyValue = Constants::EPSILON) {
    BRepAlgoAPI_Cut boolOperator;
    return booleanOperate(boolOperator, args, tools, fuzzyValue);
}

/**
 * @description: 交集
 * @param {TopoShapeArray&} args
 * @param {TopoShapeArray&} tools
 * @return {TopoResult} 交集后的shape
 */
TopoResult intersection(const TopoShapeArray& args, const TopoShapeArray& tools, double fuzzyValue = Constants::EPSILON) {
    BRepAlgoAPI_Common boolOperator;
    return booleanOperate(boolOperator, args, tools, fuzzyValue);
}

/**
 * @description: 旋转
 * @param {TopoDS_Shape&} shape
 * @param {Axis1&} axis
 * @param {double} angle
 * @return {TopoResult} 旋转后的shape
 */
TopoResult revolve(const TopoDS_Shape& shape, const Axis1& axis, double angle) {
    gp_Ax1 ax1 = Axis1::toAx1(axis);
    BRepPrimAPI_MakeRevol makeRevol(shape, ax1, angle);
    if (makeRevol.IsDone()) {
        return TopoResult(makeRevol.Shape(), true, "");
    } else {
        return TopoResult(TopoDS_Shape(), false, "Revolve operation failed");
    }
}

/**
 * @description: 扫掠
 * @param {TopoWireArray&} profile 扫掠的轮廓
 * @param {TopoDS_Wire&} path 扫掠的路径
 * @param {bool} isFrenet 是否使用Frenet模式
 * @param {bool} isForceC1 是否强制C1连续
 * @return {TopoResult} 扫掠后的shape
 */
TopoResult sweep(const TopoWireArray& profile, const TopoDS_Wire& path, bool isRound ,bool isSolid, bool isFrenet) {
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

    // 是否生成Solid
    if (isSolid) {
        makePipeShell.MakeSolid();
    }


    if (makePipeShell.IsDone()) {
        return TopoResult(makePipeShell.Shape(), true, "");
    } else {
        return TopoResult(TopoDS_Shape(), false, "Sweep operation failed");
    }
}

/**
 * @description: 抽壳
 * @param {TopoDS_Shape&} shape 实体（内部会转为 TopoDS_Solid）
 * @param {TopoShapeArray&} faces 要移除的面，空数组表示对所有面抽壳
 * @param {double} thickness 厚度
 * @return {TopoResult} 抽壳后的shape
*/
TopoResult thickSolid(const TopoDS_Shape& shape, const TopoShapeArray& faces, double thickness, double tolerance = Constants::EPSILON){
    TopoDS_Solid solid = TopoDS::Solid(shape);
    if (solid.IsNull()) {
        return TopoResult(TopoDS_Shape(), false, "Input shape is not a solid");
    }
    TopTools_ListOfShape facesList = topoShapeArrayToListOfShape(faces);

    BRepOffsetAPI_MakeThickSolid makeThickSolid;
    makeThickSolid.MakeThickSolidByJoin(solid, facesList, thickness, tolerance);
    if (makeThickSolid.IsDone()) {
        return TopoResult(makeThickSolid.Shape(), true, "");
    } else {
        return TopoResult(TopoDS_Shape(), false, "Thick solid operation failed");
    }
}

/**
 * @description: 放样
 * @param {TopoWireArray&} profile 放样的轮廓
 * @param {bool&} isRuled 是否使用Ruled模式 true：相邻截面用直线连接（直纹 loft，速度快但不光滑） false：相邻截面用圆弧连接（光滑 loft，速度慢但光滑）
 * @param {GeomAbs_Shape&} continuity 连续性 0：C0连续 1：C1连续 2：C2连续 3：C3连续 4：G1连续 5：G2连续
 * @param {bool&} isSolid 是否生成Solid true：生成Solid false：生成Shell
 * @param {double} tolerance 容差
 * @return {TopoResult} 放样后的shape
 */
TopoResult loft(const TopoShapeArray& profile,const bool& isRuled, const GeomAbs_Shape& continuity , const bool& isSolid, double tolerance = Constants::EPSILON) {
    std::vector<TopoDS_Shape> shapeList = emscripten::vecFromJSArray<TopoDS_Shape>(profile);

    if(shapeList.size() < 2) {
        return TopoResult(TopoDS_Shape(), false, "Loft operation need at least 2 shapes");
    }else if(shapeList.size() == 2 && shapeList[0].ShapeType() == TopAbs_VERTEX && shapeList[1].ShapeType() == TopAbs_VERTEX) {
        return TopoResult(TopoDS_Shape(), false, "Loft operation need at least 1 wire");
    }

    BRepOffsetAPI_ThruSections makeLoft(isSolid, isRuled, tolerance);
    if (!isRuled) {
        makeLoft.SetContinuity(continuity);
    }

    for (const TopoDS_Shape& shape : shapeList) {
        if (shape.ShapeType() == TopAbs_VERTEX) {
            makeLoft.AddVertex(TopoDS::Vertex(shape));
        } else if (shape.ShapeType() == TopAbs_WIRE) {
            makeLoft.AddWire(TopoDS::Wire(shape));
        }
    }

    makeLoft.Build();
    if (makeLoft.IsDone()) {
        return TopoResult(makeLoft.Shape(), true, "");
    } else {
        return TopoResult(TopoDS_Shape(), false, "Loft operation failed");
    }
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
        .class_function("loft", &loft)
        ;
}

} // namespace ModelerBindings
