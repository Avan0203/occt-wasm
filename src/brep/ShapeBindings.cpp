#include "BRepBindings.h"
#include "TopoDS_Wire.hxx"
#include "brep/ShapeBindings.h"
#include "shared/Shared.hpp"
#include <cmath>
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
#include <TopExp.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopoDS.hxx>
#include <TopLoc_Location.hxx>
#include <Poly_Triangulation.hxx>
#include <Poly_Connect.hxx>
#include <Poly_Triangle.hxx>
#include <BRepMesh_IncrementalMesh.hxx>
#include <GCPnts_TangentialDeflection.hxx>
#include <GCPnts_QuasiUniformDeflection.hxx>
#include <GCPnts_UniformAbscissa.hxx>
#include <Poly_Polygon3D.hxx>
#include <Poly_PolygonOnTriangulation.hxx>
#include <gp_Trsf.hxx>
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <gp_Pnt2d.hxx>
#include <gp_Dir.hxx>
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

template<typename T>
emscripten::val vectorToTypedArray(const std::vector<T>& vec) {
    if (vec.empty()) return emscripten::val::null();
    emscripten::val result = emscripten::val::global("Float32Array").new_(vec.size());
    for (size_t i = 0; i < vec.size(); i++) {
        result.set(i, vec[i]);
    }
    return result;
}

template<>
emscripten::val vectorToTypedArray<uint32_t>(const std::vector<uint32_t>& vec) {
    if (vec.empty()) return emscripten::val::null();
    emscripten::val result = emscripten::val::global("Uint32Array").new_(vec.size());
    for (size_t i = 0; i < vec.size(); i++) {
        result.set(i, vec[i]);
    }
    return result;
}

emscripten::val faceResultToObject(const FaceResult& result) {
    using emscripten::val;
    val obj = val::object();
    val positionVal = vectorToTypedArray(result.position);
    val indexVal = vectorToTypedArray(result.index);
    val normalVal = vectorToTypedArray(result.normal);
    val uvVal = vectorToTypedArray(result.uv);
    obj.set("position", positionVal.isNull() ? val::global("Float32Array").new_(0) : positionVal);
    obj.set("index", indexVal.isNull() ? val::global("Uint32Array").new_(0) : indexVal);
    obj.set("normal", normalVal.isNull() ? val::global("Float32Array").new_(0) : normalVal);
    obj.set("uv", uvVal.isNull() ? val::global("Float32Array").new_(0) : uvVal);
    return obj;
}

emscripten::val edgeResultToObject(const EdgeResult& result) {
    using emscripten::val;
    val obj = val::object();
    obj.set("position", vectorToTypedArray(result.position));
    return obj;
}

emscripten::val brepResultToObject(const BRepResult& result) {
    using emscripten::val;
    val obj = val::object();

    val vertices = val::array();
    for (const auto& v : result.vertices) {
        val vertex = val::object();
        val position = vectorToTypedArray(v.position);
        vertex.set("position", position.isNull() ? val::global("Float32Array").new_(0) : position);
        if (v.shape.IsNull()) {
            vertex.set("shape", val::null());
        } else {
            vertex.set("shape", v.shape);
        }
        vertices.call<void>("push", vertex);
    }
    obj.set("vertices", vertices);

    val edges = val::array();
    for (const auto& e : result.edges) {
        val edge = val::object();
        val position = vectorToTypedArray(e.position);
        edge.set("position", position.isNull() ? val::global("Float32Array").new_(0) : position);
        edge.set("type", static_cast<int>(e.type));
        if (e.shape.IsNull()) {
            edge.set("shape", val::null());
        } else {
            edge.set("shape", e.shape);
        }
        edges.call<void>("push", edge);
    }
    obj.set("edges", edges);

    val faces = val::array();
    for (const auto& f : result.faces) {
        val face = val::object();
        val position = vectorToTypedArray(f.position);
        val index = vectorToTypedArray(f.index);
        val uv = vectorToTypedArray(f.uv);
        val normal = vectorToTypedArray(f.normal);
        face.set("position", position.isNull() ? val::global("Float32Array").new_(0) : position);
        face.set("index", index.isNull() ? val::global("Uint32Array").new_(0) : index);
        face.set("uv", uv.isNull() ? val::global("Float32Array").new_(0) : uv);
        face.set("normal", normal.isNull() ? val::global("Float32Array").new_(0) : normal);
        if (f.shape.IsNull()) {
            face.set("shape", val::null());
        } else {
            face.set("shape", f.shape);
        }
        faces.call<void>("push", face);
    }
    obj.set("faces", faces);

    return obj;
}

template<typename TopoType>
emscripten::val topoVectorToArray(const std::vector<TopoType>& shapes) {
    emscripten::val result = emscripten::val::array();
    for (const auto& shape : shapes) {
        result.call<void>("push", shape);
    }
    return result;
}

} // namespace

// ==================== Vertex ====================

Vector3 Vertex::toVector3(const TopoDS_Vertex& vertex) {
  return Vector3::fromPnt(BRep_Tool::Pnt(vertex));
}

// ==================== Edge ====================

TopoDS_Edge Edge::fromCurve(const Geom_Curve* curve) {
  Handle(Geom_Curve) curveHandle(curve);
  BRepBuilderAPI_MakeEdge builder(curveHandle);
  return builder.Edge();
}

double Edge::getLength(const TopoDS_Edge& edge) {
  BRepAdaptor_Curve curve(edge);
  return GCPnts_AbscissaPoint::Length(curve, curve.FirstParameter(), curve.LastParameter());
}

bool Edge::isIntersect(const TopoDS_Edge& edge1, const TopoDS_Edge& edge2, double tolerance = Constants::EPSILON) {
  IntTools_EdgeEdge iee;
  performEdgeEdge(iee, edge1, edge2, tolerance);
  return iee.IsDone() && iee.CommonParts().Length() > 0;
}

Vector3 Edge::pointAt(const TopoDS_Edge& edge, double t) {
  double u1(0.0), u2(0.0);
  auto curve = BRep_Tool::Curve(edge, u1, u2);
  if (curve.IsNull()) return Vector3(NAN, NAN, NAN);
  return Vector3::fromPnt(curve->Value(t));
}

Vector3Array Edge::intersections(const TopoDS_Edge& edge1, const TopoDS_Edge& edge2, double tolerance = Constants::EPSILON) {
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

EdgeResult Edge::discretize(const TopoDS_Edge& edge, double lineDeflection = Constants::LINE_DEFLECTION, double angleDeviation = Constants::ANGLE_DEFLECTION) {
  EdgeResult result;

  if (BRep_Tool::Degenerated(edge)) {
      return result;
  }

  BRepAdaptor_Curve curve(edge);
  Standard_Real first = curve.FirstParameter();
  Standard_Real last = curve.LastParameter();

  if (Abs(last - first) < Precision::Confusion()) {
      gp_Pnt pnt = curve.Value(first);
      result.position.push_back(static_cast<float>(pnt.X()));
      result.position.push_back(static_cast<float>(pnt.Y()));
      result.position.push_back(static_cast<float>(pnt.Z()));
      return result;
  }

  GCPnts_TangentialDeflection discretizer(curve, first, last, angleDeviation, lineDeflection, 2, Precision::Confusion());

  if (discretizer.NbPoints() == 0) {
      GCPnts_QuasiUniformDeflection quasiDiscretizer(curve, lineDeflection, first, last);
      if (!quasiDiscretizer.IsDone()) {
          Standard_Integer nbPoints = 100;
          GCPnts_UniformAbscissa uniformDiscretizer(curve, nbPoints, first, last);
          if (uniformDiscretizer.IsDone()) {
              Standard_Integer nbPnts = uniformDiscretizer.NbPoints();
              result.position.reserve(nbPnts * 3);
              for (Standard_Integer i = 1; i <= nbPnts; i++) {
                  Standard_Real param = uniformDiscretizer.Parameter(i);
                  gp_Pnt pnt = curve.Value(param);
                  result.position.push_back(static_cast<float>(pnt.X()));
                  result.position.push_back(static_cast<float>(pnt.Y()));
                  result.position.push_back(static_cast<float>(pnt.Z()));
              }
          }
          return result;
      }

      Standard_Integer nbPoints = quasiDiscretizer.NbPoints();
      result.position.reserve(nbPoints * 3);
      for (Standard_Integer i = 1; i <= nbPoints; i++) {
          Standard_Real param = quasiDiscretizer.Parameter(i);
          gp_Pnt pnt = curve.Value(param);
          result.position.push_back(static_cast<float>(pnt.X()));
          result.position.push_back(static_cast<float>(pnt.Y()));
          result.position.push_back(static_cast<float>(pnt.Z()));
      }
      return result;
  }

  Standard_Integer nbPoints = discretizer.NbPoints();
  result.position.reserve(nbPoints * 3);

  for (Standard_Integer i = 1; i <= nbPoints; i++) {
      gp_Pnt pnt = discretizer.Value(i);
      result.position.push_back(static_cast<float>(pnt.X()));
      result.position.push_back(static_cast<float>(pnt.Y()));
      result.position.push_back(static_cast<float>(pnt.Z()));
  }

  return result;
}

GeomAbs_CurveType Edge::getCurveType(const TopoDS_Edge& edge) {
  if (BRep_Tool::Degenerated(edge)) {
      return GeomAbs_OtherCurve;
  }
  BRepAdaptor_Curve curve(edge);
  return curve.GetType();
}

// ==================== Wire ====================

TopoDS_Wire Wire::fromEdges(const TopoEdgeArray& edges) {
  std::vector<TopoDS_Edge> edgeList = emscripten::vecFromJSArray<TopoDS_Edge>(edges);
  BRepBuilderAPI_MakeWire builder;
  for (const TopoDS_Edge& edge : edgeList){
    builder.Add(edge);
  }
  return builder.Wire();
}

TopoDS_Wire Wire::fromVertices(const Vector3Array& vertices) {
  BRepLib_MakeWire builder;
  std::vector<Vector3> vectorList = emscripten::vecFromJSArray<Vector3>(vertices);
  if (vectorList.size() < 2) return builder.Wire();
  for (size_t i = 0; i < vectorList.size() - 1; i++){
    gp_Pnt p = Vector3::toPnt(vectorList[i]);
    gp_Pnt q = Vector3::toPnt(vectorList[i + 1]);
    builder.Add(BRepBuilderAPI_MakeEdge(p, q).Edge());
  }
  return builder.Wire();
}

TopoDS_Face Wire::makeFace(const TopoDS_Wire& wire) {
  BRepBuilderAPI_MakeFace face(wire);
  return face.Face();
}

TopoDS_Wire Wire::close(const TopoDS_Wire& wire) {
  if(Shape::isClosed(wire)) {
    return wire;
  }
  TopoDS_Vertex firstVertex, lastVertex;
  TopExp::Vertices(wire, firstVertex, lastVertex);
  if(firstVertex.IsNull() || lastVertex.IsNull()) {
    return wire;
  }
  // 创建新的边
  TopoDS_Edge newEdge = BRepBuilderAPI_MakeEdge(firstVertex, lastVertex).Edge();
  return BRepBuilderAPI_MakeWire(wire, newEdge).Wire();
}

// ==================== Face ====================

TopoDS_Face Face::fromVertices(const Vector3Array& outerVertices, const Vector3ArrayArray& innerVertices) {
  TopoDS_Wire outerWire = Wire::fromVertices(outerVertices);
  if (!Shape::isClosed(outerWire)) {
    outerWire = Wire::close(outerWire);
  }
  // 使用 wire 构造函数创建面（Add 仅用于添加孔洞）
  BRepBuilderAPI_MakeFace face(outerWire);
  std::vector<Vector3Array> innerList = emscripten::vecFromJSArray<Vector3Array>(innerVertices);
  for (const Vector3Array& inner : innerList) {
    TopoDS_Wire innerWire = Wire::fromVertices(inner);
    if (!Shape::isClosed(innerWire)) {
      innerWire = Wire::close(innerWire);
    }
    face.Add(innerWire);
  }
  return face.Face();
}

double Face::area(const TopoDS_Face& face) {
  GProp_GProps props;
  BRepGProp::SurfaceProperties(face, props);
  return props.Mass();
}

FaceResult Face::triangulate(const TopoDS_Face& face, double deflection = Constants::LINE_DEFLECTION, double angleDeviation = Constants::ANGLE_DEFLECTION) {
  FaceResult result;

  TopLoc_Location loc;
  Handle(Poly_Triangulation) triangulation = BRep_Tool::Triangulation(face, loc);

  BRepMesh_IncrementalMesh mesher(face, deflection, Standard_False, angleDeviation, Standard_True);
  triangulation = BRep_Tool::Triangulation(face, loc);

  if (triangulation.IsNull()) {
      return result;
  }

  const gp_Trsf& trsf = loc.Transformation();
  Standard_Boolean isMirrored = trsf.VectorialPart().Determinant() < 0;
  Standard_Boolean isReversed = (face.Orientation() == TopAbs_REVERSED);

  Standard_Integer nbNodes = triangulation->NbNodes();
  result.position.reserve(nbNodes * 3);

  for (Standard_Integer i = 1; i <= nbNodes; i++) {
      gp_Pnt pnt = triangulation->Node(i);
      if (!loc.IsIdentity()) {
          pnt.Transform(trsf);
      }
      result.position.push_back(static_cast<float>(pnt.X()));
      result.position.push_back(static_cast<float>(pnt.Y()));
      result.position.push_back(static_cast<float>(pnt.Z()));
  }

  Standard_Integer nbTriangles = triangulation->NbTriangles();
  result.index.reserve(nbTriangles * 3);

  for (Standard_Integer i = 1; i <= nbTriangles; i++) {
      Poly_Triangle triangle = triangulation->Triangle(i);
      Standard_Integer n1, n2, n3;
      triangle.Get(n1, n2, n3);

      n1--; n2--; n3--;

      if ((isReversed ^ isMirrored)) {
          result.index.push_back(static_cast<uint32_t>(n1));
          result.index.push_back(static_cast<uint32_t>(n3));
          result.index.push_back(static_cast<uint32_t>(n2));
      } else {
          result.index.push_back(static_cast<uint32_t>(n1));
          result.index.push_back(static_cast<uint32_t>(n2));
          result.index.push_back(static_cast<uint32_t>(n3));
      }
  }

  if (triangulation->HasNormals()) {
      result.normal.reserve(nbNodes * 3);
      for (Standard_Integer i = 1; i <= nbNodes; i++) {
          gp_Dir normal = triangulation->Normal(i);
          if ((isReversed ^ isMirrored)) {
              normal.Reverse();
          }
          if (!loc.IsIdentity()) {
              gp_Vec normalVec(normal);
              normalVec.Transform(trsf);
              normal = gp_Dir(normalVec);
          }
          result.normal.push_back(static_cast<float>(normal.X()));
          result.normal.push_back(static_cast<float>(normal.Y()));
          result.normal.push_back(static_cast<float>(normal.Z()));
      }
  } else {
      Poly_Connect connect(triangulation);
      result.normal.reserve(nbNodes * 3);
      for (Standard_Integer i = 1; i <= nbNodes; i++) {
          gp_Vec normalVec(0.0, 0.0, 0.0);

          for (Standard_Integer j = 1; j <= nbTriangles; j++) {
              Poly_Triangle triangle = triangulation->Triangle(j);
              Standard_Integer n1, n2, n3;
              triangle.Get(n1, n2, n3);

              if (n1 == i || n2 == i || n3 == i) {
                  gp_Pnt p1 = triangulation->Node(n1);
                  gp_Pnt p2 = triangulation->Node(n2);
                  gp_Pnt p3 = triangulation->Node(n3);

                  gp_Vec v1(p1, p2);
                  gp_Vec v2(p1, p3);
                  gp_Vec faceNormal = v1.Crossed(v2);

                  if (faceNormal.Magnitude() > Precision::Confusion()) {
                      normalVec.Add(faceNormal);
                  }
              }
          }

          if (normalVec.Magnitude() > Precision::Confusion()) {
              normalVec.Normalize();
              if ((isReversed ^ isMirrored)) {
                  normalVec.Reverse();
              }
              if (!loc.IsIdentity()) {
                  normalVec.Transform(trsf);
              }
          } else {
              normalVec = gp_Vec(0.0, 0.0, 1.0);
          }

          result.normal.push_back(static_cast<float>(normalVec.X()));
          result.normal.push_back(static_cast<float>(normalVec.Y()));
          result.normal.push_back(static_cast<float>(normalVec.Z()));
      }
  }

  if (triangulation->HasUVNodes()) {
      result.uv.reserve(nbNodes * 2);
      for (Standard_Integer i = 1; i <= nbNodes; i++) {
          gp_Pnt2d uvPnt = triangulation->UVNode(i);
          result.uv.push_back(static_cast<float>(uvPnt.X()));
          result.uv.push_back(static_cast<float>(uvPnt.Y()));
      }
  }

  return result;
}

// ==================== Solid ====================

TopoDS_Solid Solid::fromFaces(const TopoFaceArray& faces) {
  std::vector<TopoDS_Face> faceList = emscripten::vecFromJSArray<TopoDS_Face>(faces);

  if (faceList.empty()) {
      return TopoDS_Solid();
  }

  BRep_Builder builder;
  TopoDS_Shell shell;
  builder.MakeShell(shell);
  for (const auto& face : faceList) {
      if (!face.IsNull()) {
          builder.Add(shell, face);
      }
  }

  BRepBuilderAPI_MakeSolid mkSolid(shell);
  
  if (!mkSolid.IsDone()) {
      return TopoDS_Solid();
  }

  return mkSolid.Solid();
}

double Solid::volume(const TopoDS_Solid& solid) {
  GProp_GProps props;
  BRepGProp::VolumeProperties(solid, props);
  return props.Mass();
}

// ==================== Compound ====================

TopoDS_Compound Compound::fromShapes(const TopoShapeArray& shapes) {
  std::vector<TopoDS_Shape> shapeList = emscripten::vecFromJSArray<TopoDS_Shape>(shapes);
  BRep_Builder builder;
  TopoDS_Compound compound;
  builder.MakeCompound(compound);
  for (const TopoDS_Shape& shape : shapeList) {
    builder.Add(compound, shape);
  }
  return compound;
}

// ==================== Shape ====================

std::vector<TopoDS_Vertex> Shape::getVertices(const TopoDS_Shape& shape) {
  std::vector<TopoDS_Vertex> vertices;
  TopTools_IndexedMapOfShape map;
  TopExp::MapShapes(shape, TopAbs_VERTEX, map);
  for (int i = 1; i <= map.Extent(); i++) {
      vertices.push_back(TopoDS::Vertex(map(i)));
  }
  return vertices;
}

std::vector<TopoDS_Edge> Shape::getEdges(const TopoDS_Shape& shape) {
  std::vector<TopoDS_Edge> edges;
  TopTools_IndexedMapOfShape map;
  TopExp::MapShapes(shape, TopAbs_EDGE, map);
  for (int i = 1; i <= map.Extent(); i++) {
      edges.push_back(TopoDS::Edge(map(i)));
  }
  return edges;
}

std::vector<TopoDS_Face> Shape::getFaces(const TopoDS_Shape& shape) {
  std::vector<TopoDS_Face> faces;
  TopTools_IndexedMapOfShape map;
  TopExp::MapShapes(shape, TopAbs_FACE, map);
  for (int i = 1; i <= map.Extent(); i++) {
      faces.push_back(TopoDS::Face(map(i)));
  }
  return faces;
}

std::vector<TopoDS_Wire> Shape::getWires(const TopoDS_Shape& shape) {
  std::vector<TopoDS_Wire> wires;
  TopTools_IndexedMapOfShape map;
  TopExp::MapShapes(shape, TopAbs_WIRE, map);
  for (int i = 1; i <= map.Extent(); i++) {
      wires.push_back(TopoDS::Wire(map(i)));
  }
  return wires;
}

std::vector<TopoDS_Solid> Shape::getSolids(const TopoDS_Shape& shape) {
  std::vector<TopoDS_Solid> solids;
  TopTools_IndexedMapOfShape map;
  TopExp::MapShapes(shape, TopAbs_SOLID, map);
  for (int i = 1; i <= map.Extent(); i++) {
      solids.push_back(TopoDS::Solid(map(i)));
  }
  return solids;
}

std::vector<TopoDS_Compound> Shape::getCompounds(const TopoDS_Shape& shape) {
  std::vector<TopoDS_Compound> compounds;
  TopTools_IndexedMapOfShape map;
  TopExp::MapShapes(shape, TopAbs_COMPOUND, map);
  for (int i = 1; i <= map.Extent(); i++) {
      compounds.push_back(TopoDS::Compound(map(i)));
  }
  return compounds;
}

bool Shape::isClosed(const TopoDS_Shape& shape) {
  return BRep_Tool::IsClosed(shape);
}

BRepResult Shape::toBRepResult(const TopoDS_Shape& shape, double lineDeflection, double angleDeviation) {
  BRepResult result;

  BRepMesh_IncrementalMesh mesher(shape, lineDeflection, Standard_False, angleDeviation, Standard_True);

  std::vector<TopoDS_Vertex> vertices = Shape::getVertices(shape);
  for (const TopoDS_Vertex& v : vertices) {
      gp_Pnt p = BRep_Tool::Pnt(v);
      BRepVertex brepVertex;
      brepVertex.position = { (float)p.X(), (float)p.Y(), (float)p.Z() };
      brepVertex.shape = v;
      result.vertices.push_back(brepVertex);
  }

  std::vector<TopoDS_Edge> edges = Shape::getEdges(shape);
  for (const TopoDS_Edge& edge : edges) {
      if (BRep_Tool::Degenerated(edge)) {
          continue;
      }

      BRepEdge brepEdge;
      brepEdge.type = Edge::getCurveType(edge);
      brepEdge.shape = edge;

      TopLoc_Location loc;
      Handle(Poly_Polygon3D) polygon3D = BRep_Tool::Polygon3D(edge, loc);

      if (!polygon3D.IsNull()) {
          const TColgp_Array1OfPnt& nodes = polygon3D->Nodes();
          brepEdge.position.reserve(nodes.Length() * 3);

          for (Standard_Integer i = nodes.Lower(); i <= nodes.Upper(); i++) {
              gp_Pnt pnt = nodes.Value(i);
              if (!loc.IsIdentity()) {
                  pnt.Transform(loc.Transformation());
              }
              brepEdge.position.push_back(static_cast<float>(pnt.X()));
              brepEdge.position.push_back(static_cast<float>(pnt.Y()));
              brepEdge.position.push_back(static_cast<float>(pnt.Z()));
          }
      } else {
          Handle(Poly_Triangulation) triangulation;
          Handle(Poly_PolygonOnTriangulation) polygonOnTri;
          BRep_Tool::PolygonOnTriangulation(edge, polygonOnTri, triangulation, loc);

          if (!polygonOnTri.IsNull() && !triangulation.IsNull()) {
              const TColStd_Array1OfInteger& indices = polygonOnTri->Nodes();
              brepEdge.position.reserve(indices.Length() * 3);

              for (Standard_Integer i = indices.Lower(); i <= indices.Upper(); i++) {
                  gp_Pnt pnt = triangulation->Node(indices.Value(i));
                  if (!loc.IsIdentity()) {
                      pnt.Transform(loc.Transformation());
                  }
                  brepEdge.position.push_back(static_cast<float>(pnt.X()));
                  brepEdge.position.push_back(static_cast<float>(pnt.Y()));
                  brepEdge.position.push_back(static_cast<float>(pnt.Z()));
              }
          } else {
              EdgeResult disc = Edge::discretize(edge, lineDeflection, angleDeviation);
              if (disc.position.size() >= 6) {
                  brepEdge.position = disc.position;
              } else {
                  continue;
              }
          }
      }

      if (brepEdge.position.size() < 6) {
          continue;
      }

      result.edges.push_back(brepEdge);
  }

  std::vector<TopoDS_Face> faces = Shape::getFaces(shape);
  for (const TopoDS_Face& face : faces) {
      FaceResult faceResult = Face::triangulate(face, lineDeflection, angleDeviation);

      if (faceResult.position.empty() || faceResult.index.empty()) {
          continue;
      }

      BRepFace brepFace;
      brepFace.position = faceResult.position;
      brepFace.index = faceResult.index;
      brepFace.uv = faceResult.uv;
      brepFace.normal = faceResult.normal;
      brepFace.shape = face;
      result.faces.push_back(brepFace);
  }

  return result;
}




// ==================== WASM Bindings ====================

EMSCRIPTEN_BINDINGS(ShapeBindings) {
  using namespace emscripten;

  register_vector<float>("FloatVector");
  register_vector<uint32_t>("Uint32Vector");

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
      .class_function("pointAt", &Edge::pointAt)
      .class_function("trim", &Edge::trim)
      .class_function("discretize", optional_override(
          [](const TopoDS_Edge& edge, emscripten::val optLineDeflection, emscripten::val optAngleDeviation) {
            double lineDeflection = optLineDeflection.isUndefined() ? Constants::LINE_DEFLECTION : optLineDeflection.as<double>();
            double angleDeviation = optAngleDeviation.isUndefined() ? Constants::ANGLE_DEFLECTION : optAngleDeviation.as<double>();
            EdgeResult result = Edge::discretize(edge, lineDeflection, angleDeviation);
            return edgeResultToObject(result);
          }));
  class_<Wire>("Wire")
      .class_function("fromEdges", &Wire::fromEdges)
      .class_function("fromVertices", &Wire::fromVertices)
      .class_function("close", &Wire::close)
      .class_function("makeFace", &Wire::makeFace);
  class_<Face>("Face")
      .class_function("fromVertices", &Face::fromVertices)
      .class_function("area", &Face::area)
      .class_function("triangulate", optional_override(
          [](const TopoDS_Face& face, double deflection, double angleDeviation) {
            FaceResult result = Face::triangulate(face, deflection, angleDeviation);
            return faceResultToObject(result);
          }));
  class_<Solid>("Solid")
      .class_function("fromFaces", &Solid::fromFaces)
      .class_function("volume", &Solid::volume);
  class_<Compound>("Compound")
      .class_function("fromShapes", &Compound::fromShapes);
  class_<Shape>("Shape")
      .class_function("isClosed", &Shape::isClosed)
      .class_function("getVertices", optional_override(
          [](const TopoDS_Shape& shape) {
            return topoVectorToArray(Shape::getVertices(shape));
          }))
      .class_function("getEdges", optional_override(
          [](const TopoDS_Shape& shape) {
            return topoVectorToArray(Shape::getEdges(shape));
          }))
      .class_function("getFaces", optional_override(
          [](const TopoDS_Shape& shape) {
            return topoVectorToArray(Shape::getFaces(shape));
          }))
      .class_function("getWires", optional_override(
          [](const TopoDS_Shape& shape) {
            return topoVectorToArray(Shape::getWires(shape));
          }))
      .class_function("getSolids", optional_override(
          [](const TopoDS_Shape& shape) {
            return topoVectorToArray(Shape::getSolids(shape));
          }))
      .class_function("getCompounds", optional_override(
          [](const TopoDS_Shape& shape) {
            return topoVectorToArray(Shape::getCompounds(shape));
          }))
      .class_function("toBRepResult", optional_override(
          [](const TopoDS_Shape& shape, double lineDeflection, double angleDeviation) {
            BRepResult result = Shape::toBRepResult(shape, lineDeflection, angleDeviation);
            return brepResultToObject(result);
          }));
}
