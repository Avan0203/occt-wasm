#include "UtilsBindings.h"
#include <TopoDS_Shape.hxx>
#include <TopExp.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <BRep_Tool.hxx>
#include <TopAbs.hxx>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>

using namespace emscripten;

namespace UtilsBindings {

/**
 * 将 TopTools_IndexedMapOfShape 转换为 JavaScript 数组
 * @param map - 形状索引映射表
 * @returns JavaScript 数组，包含所有形状对象
 */
val mapShapesToArray(const TopTools_IndexedMapOfShape& map) {
    val result = val::array();
    for (int i = 1; i <= map.Extent(); i++) {
        result.call<void>("push", map(i));
    }
    return result;
}

/**
 * 从形状中提取所有顶点
 * @param shape - 要提取顶点的形状对象
 * @returns JavaScript 数组，包含所有顶点对象
 */
val extractVertices(const TopoDS_Shape& shape) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_VERTEX, map);
    return mapShapesToArray(map);
}

/**
 * 从形状中提取所有边
 * @param shape - 要提取边的形状对象
 * @returns JavaScript 数组，包含所有边对象
 */
val extractEdges(const TopoDS_Shape& shape) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_EDGE, map);
    return mapShapesToArray(map);
}

/**
 * 从形状中提取所有面
 * @param shape - 要提取面的形状对象
 * @returns JavaScript 数组，包含所有面对象
 */
val extractFaces(const TopoDS_Shape& shape) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_FACE, map);
    return mapShapesToArray(map);
}

/**
 * 从形状中提取所有线框
 * @param shape - 要提取线框的形状对象
 * @returns JavaScript 数组，包含所有线框对象
 */
val extractWires(const TopoDS_Shape& shape) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_WIRE, map);
    return mapShapesToArray(map);
}

/**
 * 从形状中提取所有壳体
 * @param shape - 要提取壳体的形状对象
 * @returns JavaScript 数组，包含所有壳体对象
 */
val extractShells(const TopoDS_Shape& shape) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_SHELL, map);
    return mapShapesToArray(map);
}

/**
 * 从形状中提取所有实体
 * @param shape - 要提取实体的形状对象
 * @returns JavaScript 数组，包含所有实体对象
 */
val extractSolids(const TopoDS_Shape& shape) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_SOLID, map);
    return mapShapesToArray(map);
}

/**
 * 统计形状中指定类型的子形状数量
 * @param shape - 要统计的形状对象
 * @param type - 形状类型枚举（如 TopAbs_VERTEX, TopAbs_EDGE 等）
 * @returns 指定类型子形状的数量
 */
int countShapes(const TopoDS_Shape& shape, TopAbs_ShapeEnum type) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, type, map);
    return map.Extent();
}

/**
 * 注册所有工具函数到 Emscripten 绑定系统
 * 包括 TopExp、TopExp_Explorer 和 BRepTools 的相关方法
 */
void registerBindings() {
    // ========== TopExp 静态方法 ==========
    class_<TopExp>("TopExp")
        .class_function("extractVertices", &extractVertices)
        .class_function("extractEdges", &extractEdges)
        .class_function("extractFaces", &extractFaces)
        .class_function("extractWires", &extractWires)
        .class_function("extractShells", &extractShells)
        .class_function("extractSolids", &extractSolids)
        .class_function("countShapes", &countShapes)
        ;

    // ========== TopExp_Explorer 类 ==========
    class_<TopExp_Explorer>("TopExp_Explorer")
        .constructor<>()
        .constructor<const TopoDS_Shape&, TopAbs_ShapeEnum, TopAbs_ShapeEnum>()
        .function("init", &TopExp_Explorer::Init)
        .function("more", &TopExp_Explorer::More)
        .function("next", &TopExp_Explorer::Next)
        .function("current", &TopExp_Explorer::Current)
        .function("reInit", &TopExp_Explorer::ReInit)
        .function("value", &TopExp_Explorer::Value)
        .function("clear", &TopExp_Explorer::Clear)
        .function("depth", &TopExp_Explorer::Depth)
        ;
}

} // namespace UtilsBindings

