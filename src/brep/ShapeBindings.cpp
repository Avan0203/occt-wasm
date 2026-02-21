#include "BRepBindings.h"
#include "brep/ShapeBindings.h"
#include "shared/Shared.hpp"
#include <emscripten/bind.h>
#include <BRep_Tool.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <BRepAdaptor_Surface.hxx>
#include <BRepGProp.hxx>
#include <GProp_GProps.hxx>
#include <BRepBuilderAPI_MakeEdge.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <BRepBuilderAPI_MakeSolid.hxx>
#include <BRepBuilderAPI_MakeWire.hxx>
#include <BRep_Builder.hxx>
#include <BRepLib_MakeWire.hxx>
#include <Geom_Curve.hxx>
#include <GCPnts_AbscissaPoint.hxx>
#include <GCPnts_QuasiUniformDeflection.hxx>
#include <IntTools_CommonPrt.hxx>
#include <IntTools_EdgeEdge.hxx>
#include <IntTools_Range.hxx>
#include <Precision.hxx>
#include <TopAbs_ShapeEnum.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Shell.hxx>
#include <TopoDS_Solid.hxx>
#include <TopoDS_Vertex.hxx>
#include <TopoDS_Wire.hxx>
#include <emscripten/val.h>

namespace {
void performEdgeEdge(IntTools_EdgeEdge& iee, const TopoDS_Edge& e1, const TopoDS_Edge& e2, double tol) {
  iee.SetEdge1(e1);
  iee.SetEdge2(e2);
  iee.SetFuzzyValue(tol);
  iee.Perform();
}

void appendCommonPrtPoints(emscripten::val& result, const IntTools_CommonPrt& cprt) {
  double u1, u2;
  Handle(Geom_Curve) curve = BRep_Tool::Curve(cprt.Edge1(), u1, u2);
  if (curve.IsNull()) return;
  if (cprt.Type() == TopAbs_VERTEX) {
    result.call<void>("push", Vector3::fromPnt(curve->Value(cprt.VertexParameter1())));
  } else if (cprt.Type() == TopAbs_EDGE) {
    const IntTools_Range& r = cprt.Range1();
    result.call<void>("push", Vector3::fromPnt(curve->Value(r.First())));
    result.call<void>("push", Vector3::fromPnt(curve->Value(r.Last())));
  }
}
} // namespace

Vector3 Vertex::toVector3(const TopoDS_Vertex& vertex) {
  return Vector3::fromPnt(BRep_Tool::Pnt(vertex));
}

TopoDS_Edge Edge::fromCurve(const Geom_Curve* curve) {
  Handle(Geom_Curve) curveHandle(curve);
  BRepBuilderAPI_MakeEdge builder(curveHandle);
  return builder.Edge();
}

double Edge::getLength(const TopoDS_Edge& edge) {
  BRepAdaptor_Curve curve(edge);
  return GCPnts_AbscissaPoint::Length(curve, curve.FirstParameter(), curve.LastParameter());
}

bool Edge::isIntersect(const TopoDS_Edge& edge1, const TopoDS_Edge& edge2, double tolerance) {
  IntTools_EdgeEdge iee;
  performEdgeEdge(iee, edge1, edge2, tolerance);
  return iee.IsDone() && iee.CommonParts().Length() > 0;
}

Vector3Array Edge::intersections(const TopoDS_Edge& edge1, const TopoDS_Edge& edge2, double tolerance) {
  using namespace emscripten;
  val result = val::array();
  IntTools_EdgeEdge iee;
  performEdgeEdge(iee, edge1, edge2, tolerance);
  if (!iee.IsDone()) return Vector3Array(result);
  const IntTools_SequenceOfCommonPrts& parts = iee.CommonParts();
  for (Standard_Integer i = 1; i <= parts.Length(); ++i)
    appendCommonPrtPoints(result, parts(i));
  return Vector3Array(result);
}

TopoDS_Edge Edge::trim(const TopoDS_Edge& edge, double start, double end) {
  double u1(0.0), u2(0.0);
  auto curve = BRep_Tool::Curve(edge, u1, u2);
  BRepBuilderAPI_MakeEdge builder(curve, start, end);
  return builder.Edge();
}

TopoDS_Wire Wire::fromEdges(const TopoEdgeArray& edges) {
  BRepBuilderAPI_MakeWire builder;
  const emscripten::val& arr = edges;
  Standard_Integer n = arr["length"].as<Standard_Integer>();
  for (Standard_Integer i = 0; i < n; i++)
    builder.Add(arr[i].as<TopoDS_Edge>());
  return builder.Wire();
}

TopoDS_Wire Wire::fromVertices(const Vector3Array& vertices) {
  BRepLib_MakeWire builder;
  const emscripten::val& v = vertices;
  Standard_Integer n = v["length"].as<Standard_Integer>();
  if (n < 2) return builder.Wire();
  auto toPnt = [&v](Standard_Integer i) {
    return Vector3::toPnt(Vector3(v[i]["x"].as<double>(), v[i]["y"].as<double>(), v[i]["z"].as<double>()));
  };
  for (Standard_Integer i = 0; i < n - 1; i++)
    builder.Add(BRepBuilderAPI_MakeEdge(toPnt(i), toPnt(i + 1)).Edge());
  if (n > 2) builder.Add(BRepBuilderAPI_MakeEdge(toPnt(n - 1), toPnt(0)).Edge());
  return builder.Wire();
}

TopoDS_Face Wire::makeFace(const TopoDS_Wire& wire) {
  BRepBuilderAPI_MakeFace face(wire);
  return face.Face();
}

TopoDS_Face Face::fromVertices(const Vector3Array& outerVertices, const Vector3ArrayArray& innerVertices) {
  BRepBuilderAPI_MakeFace face;
  face.Add(Wire::fromVertices(outerVertices));
  const emscripten::val& inners = innerVertices;
  Standard_Integer nInners = inners["length"].as<Standard_Integer>();
  for (Standard_Integer i = 0; i < nInners; i++)
    face.Add(Wire::fromVertices(Vector3Array(inners[i])));
  return face.Face();
}

double Face::area(const TopoDS_Face& face) {
  GProp_GProps props;
  BRepGProp::SurfaceProperties(face, props);
  return props.Mass();
}

TopoDS_Solid Solid::fromFaces(const TopoDS_Face& face) {
  BRep_Builder builder;
  TopoDS_Shell shell;
  builder.MakeShell(shell);
  builder.Add(shell, face);
  BRepBuilderAPI_MakeSolid solid(shell);
  return solid.Solid();
}

double Solid::volume(const TopoDS_Solid& solid) {
  GProp_GProps props;
  BRepGProp::VolumeProperties(solid, props);
  return props.Mass();
}

EMSCRIPTEN_BINDINGS(ShapeBindings) {
  using namespace emscripten;
  class_<Vertex>("Vertex")
      .class_function("toVector3", &Vertex::toVector3);
  class_<Edge>("Edge")
      .class_function("fromCurve", &Edge::fromCurve, allow_raw_pointers())
      .class_function("getLength", &Edge::getLength)
      .class_function("isIntersect", optional_override(
          [](const TopoDS_Edge& e1, const TopoDS_Edge& e2, emscripten::val optTol) {
            double tol = optTol.isUndefined() ? Constants::EPSILON : optTol.as<double>();
            return Edge::isIntersect(e1, e2, tol);
          }))
      .class_function("intersections", optional_override(
          [](const TopoDS_Edge& e1, const TopoDS_Edge& e2, emscripten::val optTol) {
            double tol = optTol.isUndefined() ? Constants::EPSILON : optTol.as<double>();
            return Edge::intersections(e1, e2, tol);
          }))
      .class_function("trim", &Edge::trim);
  class_<Wire>("Wire")
      .class_function("fromEdges", &Wire::fromEdges)
      .class_function("fromVertices", &Wire::fromVertices)
      .class_function("makeFace", &Wire::makeFace);
  class_<Face>("Face")
      .class_function("fromVertices", &Face::fromVertices)
      .class_function("area", &Face::area);
  class_<Solid>("Solid")
      .class_function("fromFaces", &Solid::fromFaces)
      .class_function("volume", &Solid::volume);
}