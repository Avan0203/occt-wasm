#ifndef SHAPE_BINDINGS_H
#define SHAPE_BINDINGS_H

#include "shared/Shared.hpp"

class TopoDS_Vertex;
class TopoDS_Edge;
class TopoDS_Wire;
class TopoDS_Face;
class TopoDS_Solid;
class Geom_Curve;

class Vertex {
public:
  static Vector3 toVector3(const TopoDS_Vertex& vertex);
};

class Edge {
public:
  static TopoDS_Edge fromCurve(const Geom_Curve* curve);
  static double getLength(const TopoDS_Edge& edge);
  static bool isIntersect(const TopoDS_Edge& edge1, const TopoDS_Edge& edge2, double tolerance = Constants::EPSILON);
  static Vector3Array intersections(const TopoDS_Edge& edge1, const TopoDS_Edge& edge2, double tolerance = Constants::EPSILON);
  static TopoDS_Edge trim(const TopoDS_Edge& edge, double start, double end);
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
};

class Solid {
public:
  static TopoDS_Solid fromFaces(const TopoDS_Face& face);
  static double volume(const TopoDS_Solid& solid);
};

#endif // SHAPE_BINDINGS_H
