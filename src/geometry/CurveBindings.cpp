#include "CurveBindings.h"
#include "shared/Shared.hpp"
#include <TColgp_Array1OfPnt.hxx>
#include <TColStd_Array1OfReal.hxx>
#include <TColStd_Array1OfInteger.hxx>
#include <Geom_Circle.hxx>
#include <Geom_Ellipse.hxx>
#include <Geom_TrimmedCurve.hxx>
#include <Geom_BSplineCurve.hxx>
#include <gp_Ax2.hxx>
#include <TopoDS_Edge.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <emscripten/bind.h>

using namespace emscripten;

namespace CurveBindings {

TopoDS_Edge CurveFactory::Line(const Vector3& p1, const Vector3& p2) {
    BRepBuilderAPI_MakeEdge maker(Vector3::toPnt(p1), Vector3::toPnt(p2));
    return maker.IsDone() ? maker.Edge() : TopoDS_Edge();
}

TopoDS_Edge CurveFactory::Circle(const Vector3& center, double radius, double u1, double u2, bool adjustPeriodic, const Vector3& normal) {
    gp_Ax2 ax2(Vector3::toPnt(center), Vector3::toDir(normal));
    Handle(Geom_Circle) circle = new Geom_Circle(ax2, radius);
    Handle(Geom_TrimmedCurve) trimmed = new Geom_TrimmedCurve(circle, u1, u2, true, adjustPeriodic);
    BRepBuilderAPI_MakeEdge builder(trimmed);
    return builder.IsDone() ? builder.Edge() : TopoDS_Edge();
}

TopoDS_Edge CurveFactory::Ellipse(const Vector3& center, double majorRadius, double minorRadius, const Vector3& normal) {
    gp_Ax2 ax2(Vector3::toPnt(center), Vector3::toDir(normal));
    Handle(Geom_Ellipse) ellipse = new Geom_Ellipse(ax2, majorRadius, minorRadius);
    BRepBuilderAPI_MakeEdge builder(ellipse);
    return builder.IsDone() ? builder.Edge() : TopoDS_Edge();
}

TopoDS_Edge CurveFactory::BSpline(const Vector3Array& controlPoints, const NumberArray& knots, const NumberArray& multiplicities,
    int degree, bool periodic, const std::optional<NumberArray>& weights)
{
    std::vector<Vector3> poleList = emscripten::vecFromJSArray<Vector3>(controlPoints);
    std::vector<double> knotVec = emscripten::convertJSArrayToNumberVector<double>(knots);
    std::vector<double> multVec = emscripten::convertJSArrayToNumberVector<double>(multiplicities);
    int poleCount = static_cast<int>(poleList.size());
    int knotCount = static_cast<int>(knotVec.size());
    int multCount = static_cast<int>(multVec.size());
    if (poleCount < 2 || knotCount < 1 || multCount != knotCount)
        return TopoDS_Edge();
    TColgp_Array1OfPnt poles(1, poleCount);
    for (int i = 0; i < poleCount; i++)
        poles.SetValue(i + 1, Vector3::toPnt(poleList[i]));
    TColStd_Array1OfReal knotArr(1, knotCount);
    for (int i = 0; i < knotCount; i++)
        knotArr.SetValue(i + 1, knotVec[i]);
    TColStd_Array1OfInteger multArr(1, multCount);
    for (int i = 0; i < multCount; i++)
        multArr.SetValue(i + 1, static_cast<int>(multVec[i]));
    Handle(Geom_BSplineCurve) bspline;
    if (!weights || !weights->isArray() || (*weights)["length"].as<int>() == 0) {
        bspline = new Geom_BSplineCurve(poles, knotArr, multArr, degree, periodic);
    } else {
        std::vector<double> weightVec = emscripten::convertJSArrayToNumberVector<double>(*weights);
        TColStd_Array1OfReal weightArr(1, poleCount);
        for (int i = 0; i < poleCount; i++)
            weightArr.SetValue(i + 1, weightVec[i]);
        bspline = new Geom_BSplineCurve(poles, weightArr, knotArr, multArr, degree, periodic);
    }
    BRepBuilderAPI_MakeEdge builder(bspline);
    return builder.IsDone() ? builder.Edge() : TopoDS_Edge();
}

void registerBindings() {
    class_<CurveFactory>("CurveFactory")
        .class_function("Line", &CurveFactory::Line)
        .class_function("Circle", &CurveFactory::Circle)
        .class_function("Ellipse", &CurveFactory::Ellipse)
        .class_function("BSpline", &CurveFactory::BSpline)
        ;
}

} // namespace CurveBindings
