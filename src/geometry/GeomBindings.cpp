#include "GeomBindings.h"
#include "shared/Shared.h"
#include <TColgp_Array1OfPnt.hxx>
#include <TColStd_Array1OfReal.hxx>
#include <TColStd_Array1OfInteger.hxx>
#include <Standard_Transient.hxx>
#include <Standard_Type.hxx>
#include <Geom_Geometry.hxx>
#include <Geom_Curve.hxx>
#include <Geom_Conic.hxx>
#include <Geom_BoundedCurve.hxx>
#include <Geom_Line.hxx>
#include <Geom_Circle.hxx>
#include <Geom_Ellipse.hxx>
#include <Geom_TrimmedCurve.hxx>
#include <Geom_BezierCurve.hxx>
#include <Geom_BSplineCurve.hxx>
#include <Geom_OffsetCurve.hxx>
#include <GeomAbs_Shape.hxx>
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <gp_Ax1.hxx>
#include <gp_Ax2.hxx>
#include <BRep_Tool.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <TopoDS_Edge.hxx>
#include <emscripten/bind.h>

using namespace emscripten;

namespace GeomBindings {

// Dummy type for namespace-style bindings (Geom.makeLine, Geom.trim, etc.)
struct GeomNamespace {};

// ----- Helper: Curve from Edge (BRep_Tool::Curve returns Handle + first/last) -----
struct CurveOnEdgeResult {
    Handle(Geom_TrimmedCurve) curve;
    double first;
    double last;
};

CurveOnEdgeResult curveFromEdge(const TopoDS_Edge& edge) {
    CurveOnEdgeResult out = { Handle(Geom_TrimmedCurve)(), 0, 0 };
    if (edge.IsNull()) return out;
    double first = 0, last = 0;
    Handle(Geom_Curve) h = BRep_Tool::Curve(edge, first, last);
    Handle(Geom_TrimmedCurve) trimmed = Handle(Geom_TrimmedCurve)::DownCast(h);
    if (trimmed.IsNull() && !h.IsNull()) {
        trimmed = new Geom_TrimmedCurve(h, first, last);
    }
    out.curve = trimmed;
    out.first = first;
    out.last = last;
    return out;
}

// ----- Helper: Make Edge from Geom_Curve (raw pointer, wrap in Handle) -----
TopoDS_Edge edgeFromCurve(const Geom_Curve* curve) {
    if (!curve) return TopoDS_Edge();
    BRepBuilderAPI_MakeEdge builder(Handle(Geom_Curve)(const_cast<Geom_Curve*>(curve)));
    return builder.IsDone() ? builder.Edge() : TopoDS_Edge();
}

// ----- Helper: Trim curve (raw pointer -> Handle) -----
Handle(Geom_TrimmedCurve) trimCurve(const Geom_Curve* curve, double u1, double u2) {
    if (!curve) return Handle(Geom_TrimmedCurve)();
    return new Geom_TrimmedCurve(Handle(Geom_Curve)(const_cast<Geom_Curve*>(curve)), u1, u2);
}

// ----- Helper: Make line (point + direction) -> Handle_Geom_Line -----
Handle(Geom_Line) makeLine(const gp_Pnt& pnt, const gp_Dir& dir) {
    return new Geom_Line(pnt, dir);
}

// ----- Helper: Edge from BSpline (poles flat [x,y,z,...], knots, mults, degree, periodic, weights?) -----
TopoDS_Edge edgeFromBSpline(const val& polesFlat, const val& knots, const val& multiplicities,
    int degree, bool periodic, const val& weights)
{
    if (!polesFlat.isArray() || !knots.isArray() || !multiplicities.isArray())
        return TopoDS_Edge();
    int poleCount = polesFlat["length"].as<int>() / 3;
    int knotCount = knots["length"].as<int>();
    int multCount = multiplicities["length"].as<int>();
    if (poleCount < 2 || knotCount < 1 || multCount != knotCount)
        return TopoDS_Edge();
    TColgp_Array1OfPnt poles(1, poleCount);
    for (int i = 0; i < poleCount; i++)
        poles.SetValue(i + 1, gp_Pnt(polesFlat[i * 3].as<double>(), polesFlat[i * 3 + 1].as<double>(), polesFlat[i * 3 + 2].as<double>()));
    TColStd_Array1OfReal knotArr(1, knotCount);
    for (int i = 0; i < knotCount; i++)
        knotArr.SetValue(i + 1, knots[i].as<double>());
    TColStd_Array1OfInteger multArr(1, multCount);
    for (int i = 0; i < multCount; i++)
        multArr.SetValue(i + 1, multiplicities[i].as<int>());
    Handle(Geom_BSplineCurve) bspline;
    if (weights.isNull() || !weights.isArray() || weights["length"].as<int>() == 0)
        bspline = new Geom_BSplineCurve(poles, knotArr, multArr, degree, periodic);
    else {
        TColStd_Array1OfReal weightArr(1, poleCount);
        for (int i = 0; i < poleCount; i++)
            weightArr.SetValue(i + 1, weights[i].as<double>());
        bspline = new Geom_BSplineCurve(poles, weightArr, knotArr, multArr, degree, periodic);
    }
    return edgeFromCurve(bspline.get());
}

// ----- Geom_Curve D0/D1 return wrappers (OCCT uses in/out params) -----
gp_Pnt curveD0(const Geom_Curve* curve, double u) {
    gp_Pnt p;
    if (curve) curve->D0(u, p);
    return p;
}

val curveD1(const Geom_Curve* curve, double u) {
    val result = val::object();
    if (!curve) return result;
    gp_Pnt p;
    gp_Vec v;
    curve->D1(u, p, v);
    result.set("point", p);
    result.set("vec", v);
    return result;
}

void registerBindings() {
    // ========== GeomAbs_Shape (continuity enum for Geom_Curve::Continuity) ==========
    enum_<GeomAbs_Shape>("GeomAbs_Shape")
        .value("GeomAbs_C0", GeomAbs_C0)
        .value("GeomAbs_G1", GeomAbs_G1)
        .value("GeomAbs_C1", GeomAbs_C1)
        .value("GeomAbs_G2", GeomAbs_G2)
        .value("GeomAbs_C2", GeomAbs_C2)
        .value("GeomAbs_C3", GeomAbs_C3)
        .value("GeomAbs_CN", GeomAbs_CN)
        ;

    // ========== Standard_Transient (base for Geom, refcount) ==========
    class_<Standard_Transient>("Standard_Transient")
        .function("getRefCount", &Standard_Transient::GetRefCount)
        .class_function("isInstance", optional_override([](const Standard_Transient* t, const std::string& typeName) -> bool {
            if (!t || typeName.empty()) return false;
            return t->IsInstance(typeName.c_str());
        }), allow_raw_pointers())
        ;

    // ========== Handle bindings (Geometry, Curve, Line, TrimmedCurve) ==========
    REGISTER_HANDLE(Geom_Geometry);

    // ========== Geom_Geometry (base) ==========
    class_<Geom_Geometry, base<Standard_Transient>>("Geom_Geometry")
        .function("copy", &Geom_Geometry::Copy)
        .function("transform", &Geom_Geometry::Transform)
        .function("transformed", &Geom_Geometry::Transformed)
        ;

    // ========== Geom_Curve (base) ==========
    class_<Geom_Curve, base<Geom_Geometry>>("Geom_Curve")
        .function("isClosed", &Geom_Curve::IsClosed)
        .function("isPeriodic", &Geom_Curve::IsPeriodic)
        .function("period", &Geom_Curve::Period)
        .function("reverse", &Geom_Curve::Reverse)
        .function("reversed", &Geom_Curve::Reversed)
        .function("firstParameter", &Geom_Curve::FirstParameter)
        .function("lastParameter", &Geom_Curve::LastParameter)
        .function("value", &Geom_Curve::Value)
        .function("d0", optional_override([](const Geom_Curve* self, double u) { return curveD0(self, u); }), allow_raw_pointers())
        .function("d1", optional_override([](const Geom_Curve* self, double u) { return curveD1(self, u); }), allow_raw_pointers())
        .function("continuity", &Geom_Curve::Continuity)
        .function("isCN", &Geom_Curve::IsCN)
        ;

    // ========== Geom_Conic (base for circle/ellipse) ==========
    class_<Geom_Conic, base<Geom_Curve>>("Geom_Conic")
        .function("axis", &Geom_Conic::Axis)
        .function("xAxis", &Geom_Conic::XAxis)
        .function("yAxis", &Geom_Conic::YAxis)
        .function("eccentricity", &Geom_Conic::Eccentricity)
        ;

    // ========== Geom_BoundedCurve (base for trimmed/bezier/bspline) ==========
    class_<Geom_BoundedCurve, base<Geom_Curve>>("Geom_BoundedCurve")
        .function("startPoint", &Geom_BoundedCurve::StartPoint)
        .function("endPoint", &Geom_BoundedCurve::EndPoint)
        ;

    // ========== Geom_Line ==========
    class_<Geom_Line, base<Geom_Curve>>("Geom_Line")
        .constructor<const gp_Ax1&>()
        .constructor<const gp_Pnt&, const gp_Dir&>()
        .function("position", &Geom_Line::Position)
        .function("setPosition", &Geom_Line::SetPosition)
        .function("setDirection", &Geom_Line::SetDirection)
        .function("setLocation", &Geom_Line::SetLocation)
        ;

    // ========== Geom_Circle ==========
    class_<Geom_Circle, base<Geom_Conic>>("Geom_Circle")
        .constructor<const gp_Ax2&, double>()
        .function("radius", &Geom_Circle::Radius)
        .function("setRadius", &Geom_Circle::SetRadius)
        .function("location", &Geom_Circle::Location)
        .function("setLocation", &Geom_Circle::SetLocation)
        ;

    // ========== Geom_Ellipse ==========
    class_<Geom_Ellipse, base<Geom_Conic>>("Geom_Ellipse")
        .constructor<const gp_Ax2&, double, double>()
        .function("majorRadius", &Geom_Ellipse::MajorRadius)
        .function("minorRadius", &Geom_Ellipse::MinorRadius)
        .function("setMajorRadius", &Geom_Ellipse::SetMajorRadius)
        .function("setMinorRadius", &Geom_Ellipse::SetMinorRadius)
        .function("location", &Geom_Ellipse::Location)
        .function("setLocation", &Geom_Ellipse::SetLocation)
        .function("focus1", &Geom_Ellipse::Focus1)
        .function("focus2", &Geom_Ellipse::Focus2)
        ;

    // ========== Geom_TrimmedCurve ==========
    class_<Geom_TrimmedCurve, base<Geom_BoundedCurve>>("Geom_TrimmedCurve")
        .function("basisCurve", &Geom_TrimmedCurve::BasisCurve)
        .function("setTrim", &Geom_TrimmedCurve::SetTrim)
        ;

    // ========== Geom_OffsetCurve ==========
    class_<Geom_OffsetCurve, base<Geom_Curve>>("Geom_OffsetCurve")
        .function("basisCurve", &Geom_OffsetCurve::BasisCurve)
        .function("offset", &Geom_OffsetCurve::Offset)
        .function("direction", &Geom_OffsetCurve::Direction)
        ;

    // ========== Geom_BezierCurve (essential API) ==========
    class_<Geom_BezierCurve, base<Geom_BoundedCurve>>("Geom_BezierCurve")
        .function("degree", &Geom_BezierCurve::Degree)
        .function("nbPoles", &Geom_BezierCurve::NbPoles)
        .function("pole", &Geom_BezierCurve::Pole)
        .function("weight", &Geom_BezierCurve::Weight)
        .function("setPole", select_overload<void(int, const gp_Pnt&)>(&Geom_BezierCurve::SetPole))
        .function("setPoleWithWeight", select_overload<void(int, const gp_Pnt&, double)>(&Geom_BezierCurve::SetPole))
        .function("setWeight", &Geom_BezierCurve::SetWeight)
        ;

    // ========== Geom_BSplineCurve (essential API) ==========
    class_<Geom_BSplineCurve, base<Geom_BoundedCurve>>("Geom_BSplineCurve")
        .function("degree", &Geom_BSplineCurve::Degree)
        .function("nbKnots", &Geom_BSplineCurve::NbKnots)
        .function("knot", &Geom_BSplineCurve::Knot)
        .function("setKnot", select_overload<void(int, double)>(&Geom_BSplineCurve::SetKnot))
        .function("nbPoles", &Geom_BSplineCurve::NbPoles)
        .function("pole", &Geom_BSplineCurve::Pole)
        .function("weight", &Geom_BSplineCurve::Weight)
        .function("setWeight", &Geom_BSplineCurve::SetWeight)
        ;

    REGISTER_HANDLE(Geom_Curve);

    REGISTER_HANDLE(Geom_Line)
        .class_function("create", optional_override([](const gp_Pnt& pnt, const gp_Dir& dir) {
            return makeLine(pnt, dir);
        }));

    REGISTER_HANDLE(Geom_TrimmedCurve);

    // ========== Geom namespace: factory and curve-from-edge ==========
    class_<CurveOnEdgeResult>("CurveOnEdgeResult")
        .property("curve", &CurveOnEdgeResult::curve)
        .property("first", &CurveOnEdgeResult::first)
        .property("last", &CurveOnEdgeResult::last)
        ;

    class_<GeomNamespace>("Geom")
        .class_function("makeLine", &makeLine)
        .class_function("trim", &trimCurve, allow_raw_pointers())
        .class_function("curveFromEdge", &curveFromEdge)
        .class_function("edgeFromCurve", &edgeFromCurve, allow_raw_pointers())
        .class_function("edgeFromBSpline", optional_override(
            [](const val& poles, const val& knots, const val& mults, int degree, bool periodic) {
                return edgeFromBSpline(poles, knots, mults, degree, periodic, val::null());
            }))
        .class_function("edgeFromBSplineWithWeights", optional_override(
            [](const val& poles, const val& knots, const val& mults, int degree, bool periodic, const val& weights) {
                return edgeFromBSpline(poles, knots, mults, degree, periodic, weights);
            }))
        ;
}

} // namespace GeomBindings
