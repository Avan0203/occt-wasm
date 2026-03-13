#include "GeometryBindings.h"
#include "shared/Shared.hpp"
#include <BRepPrimAPI_MakeBox.hxx>
#include <BRepPrimAPI_MakeSphere.hxx>
#include <BRepPrimAPI_MakeCylinder.hxx>
#include <BRepPrimAPI_MakeCone.hxx>
#include <BRepPrimAPI_MakeTorus.hxx>
#include <TopoDS_Shape.hxx>
#include <emscripten/bind.h>

using namespace emscripten;

namespace GeometryBindings {

struct GeometryFactory {};

namespace {

TopoResult Box(double width, double height, double depth, const Axis2& axis) {
    gp_Ax2 ax2 = Axis2::toAx2(axis);
    BRepPrimAPI_MakeBox maker(width, height, depth);
    maker.Build();
    if (maker.IsDone()) {
        return TopoResult(maker.Shape(), true, "");
    }
    return TopoResult(TopoDS_Shape(), false, "Box creation failed");
}

TopoResult Sphere(double radius, const Axis2& axis) {
    gp_Ax2 ax2 = Axis2::toAx2(axis);
    BRepPrimAPI_MakeSphere maker(ax2, radius);
    maker.Build();
    if (maker.IsDone()) {
        return TopoResult(maker.Shape(), true, "");
    }
    return TopoResult(TopoDS_Shape(), false, "Sphere creation failed");
}

TopoResult Cylinder(double radius, double height, const Axis2& axis) {
    gp_Ax2 ax2 = Axis2::toAx2(axis);
    BRepPrimAPI_MakeCylinder maker(ax2, radius, height);
    maker.Build();
    if (maker.IsDone()) {
        return TopoResult(maker.Shape(), true, "");
    }
    return TopoResult(TopoDS_Shape(), false, "Cylinder creation failed");
}

TopoResult Cone(double radius1, double radius2, double height, const Axis2& axis) {
    gp_Ax2 ax2 = Axis2::toAx2(axis);
    BRepPrimAPI_MakeCone maker(ax2, radius1, radius2, height);
    maker.Build();
    if (maker.IsDone()) {
        return TopoResult(maker.Shape(), true, "");
    }
    return TopoResult(TopoDS_Shape(), false, "Cone creation failed");
}

TopoResult Torus(double majorRadius, double minorRadius, const Axis2& axis) {
    gp_Ax2 ax2 = Axis2::toAx2(axis);
    BRepPrimAPI_MakeTorus maker(ax2, majorRadius, minorRadius);
    maker.Build();
    if (maker.IsDone()) {
        return TopoResult(maker.Shape(), true, "");
    }
    return TopoResult(TopoDS_Shape(), false, "Torus creation failed");
}

} // anonymous namespace

void registerBindings() {

    // ========== GeometryFactory - primitives return TopoResult ==========
    class_<GeometryFactory>("GeometryFactory")
        .class_function("Box", &Box)
        .class_function("Sphere", &Sphere)
        .class_function("Cylinder", &Cylinder)
        .class_function("Cone", &Cone)
        .class_function("Torus", &Torus);
}

} // namespace GeometryBindings
