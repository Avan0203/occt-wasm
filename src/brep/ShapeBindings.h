#ifndef SHAPE_BINDINGS_H
#define SHAPE_BINDINGS_H

#include "shared/Shared.hpp"

#include <TopoDS_Shape.hxx>
#include <TopoDS_Vertex.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Wire.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Solid.hxx>
#include <TopoDS_Compound.hxx>
#include <GeomAbs_CurveType.hxx>
#include <vector>

class Geom_Curve;

struct EdgeResult {
  std::vector<float> position;
};

struct FaceResult {
    std::vector<float> position;
    std::vector<uint32_t> index;
    std::vector<float> normal;
    std::vector<float> uv;
};


struct BRepVertex {
    std::vector<float> position;
    TopoDS_Vertex shape;
};

struct BRepEdge {
    std::vector<float> position;
    GeomAbs_CurveType type;
    TopoDS_Edge shape;
};

struct BRepFace {
    std::vector<float> position;
    std::vector<uint32_t> index;
    std::vector<float> uv;
    std::vector<float> normal;
    TopoDS_Face shape;
};

struct BRepResult {
    std::vector<BRepVertex> vertices;
    std::vector<BRepEdge> edges;
    std::vector<BRepFace> faces;
};

class Vertex {
public:
  static Vector3 toVector3(const TopoDS_Vertex& vertex);
};

class Edge {
public:
  static TopoDS_Edge fromCurve(const Geom_Curve* curve);
  static double getLength(const TopoDS_Edge& edge);
  static bool isIntersect(const TopoDS_Edge& edge1, const TopoDS_Edge& edge2, double tolerance);
  static Vector3Array intersections(const TopoDS_Edge& edge1, const TopoDS_Edge& edge2, double tolerance);
  static Vector3 pointAt(const TopoDS_Edge& edge, double t);
  static TopoDS_Edge trim(const TopoDS_Edge& edge, double start, double end);
  static EdgeResult discretize(const TopoDS_Edge& edge, double lineDeflection, double angleDeviation);
  static GeomAbs_CurveType getCurveType(const TopoDS_Edge& edge);
};

class Wire {
public:
  static TopoDS_Wire fromEdges(const TopoEdgeArray& edges);
  static TopoDS_Wire fromVertices(const Vector3Array& vertices);
  static TopoDS_Face makeFace(const TopoDS_Wire& wire);
};

class Face {
public:
  static TopoDS_Face fromVertices(const Vector3Array& outerVertices, const Vector3ArrayArray& innerVertices);
  static double area(const TopoDS_Face& face);
  static FaceResult triangulate(const TopoDS_Face& face, double deflection, double angleDeviation);
};

class Solid {
public:
  static TopoDS_Solid fromFaces(const TopoFaceArray& faces);
  static double volume(const TopoDS_Solid& solid);
};

class Compound {
public:
  static TopoDS_Compound fromShapes(const TopoShapeArray& shapes);
};

class Shape {
public:
  static std::vector<TopoDS_Vertex> getVertices(const TopoDS_Shape& shape);
  static std::vector<TopoDS_Edge> getEdges(const TopoDS_Shape& shape);
  static std::vector<TopoDS_Face> getFaces(const TopoDS_Shape& shape);
  static std::vector<TopoDS_Wire> getWires(const TopoDS_Shape& shape);
  static std::vector<TopoDS_Solid> getSolids(const TopoDS_Shape& shape);
  static std::vector<TopoDS_Compound> getCompounds(const TopoDS_Shape& shape);
  static BRepResult toBRepResult(const TopoDS_Shape& shape, double lineDeflection, double angleDeviation);
};

#endif // SHAPE_BINDINGS_H
