#ifndef MESHER_H
#define MESHER_H

#include <TopoDS_Shape.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Vertex.hxx>
#include <TopoDS_Wire.hxx>
#include <GeomAbs_CurveType.hxx>
#include <vector>
#include <memory>
#include <string>
#include <map>

// Result structure for mesh data
struct MeshResult {
    std::vector<float> positions;      // [x1,y1,z1, x2,y2,z2, ...]
    std::vector<uint32_t> indices;      // [i1,i2,i3, i4,i5,i6, ...]
    std::vector<float> normals;         // [nx1,ny1,nz1, ...]
    std::vector<float> uvs;             // [u1,v1, u2,v2, ...]
};

// Result structure for edge discretization
struct EdgeDiscretizationResult {
    std::vector<float> positions;      // [x1,y1,z1, x2,y2,z2, ...]
};

// BRep result structures
struct BRepVertex {
    std::vector<float> position;       // [x, y, z]
    TopoDS_Vertex shape;               // pointer to TopoDS_Vertex or null (empty shape)
};

struct BRepEdge {
    std::vector<float> position;       // [x1,y1,z1, x2,y2,z2, ...] - discretized edge points
    GeomAbs_CurveType type;            // curve type enum
    TopoDS_Edge shape;                 // pointer to TopoDS_Edge or null (empty shape)
};

struct BRepFace {
    std::vector<float> position;       // [x1,y1,z1, x2,y2,z2, ...] - triangulated mesh vertices
    std::vector<uint32_t> index;       // [i1,i2,i3, i4,i5,i6, ...] - triangle indices
    std::vector<float> uvs;            // [u1,v1, u2,v2, ...] - UV coordinates for texture mapping (optional)
    TopoDS_Face shape;                 // pointer to TopoDS_Face or null (empty shape)
};

struct BRepResult {
    std::vector<BRepVertex> vertices;
    std::vector<BRepEdge> edges;
    std::vector<BRepFace> faces;
};

class Mesher {
public:
    // Extract topology elements from a shape
    static std::vector<TopoDS_Vertex> getVertices(const TopoDS_Shape& shape);
    static std::vector<TopoDS_Edge> getEdges(const TopoDS_Shape& shape);
    static std::vector<TopoDS_Face> getFaces(const TopoDS_Shape& shape);
    static std::vector<TopoDS_Wire> getWires(const TopoDS_Shape& shape);
    
    // Triangulate a face
    static MeshResult triangulateFace(const TopoDS_Face& face, double deflection = 0.01, double angleDeviation = 0.5);
    
    // Discretize an edge
    static EdgeDiscretizationResult discretizeEdge(const TopoDS_Edge& edge, double lineDeflection = 0.01, double angleDeviation = 0.5);
    
    // Generate BRep result from a shape
    static BRepResult shapeToBRepResult(const TopoDS_Shape& shape, double lineDeflection = 0.01, double angleDeviation = 0.5);
    
    // Triangulate a polygon with holes using Delaunay triangulation
    // path: outer boundary points [x1,y1,z1, x2,y2,z2, ...]
    // holes: array of hole boundaries, each hole is [x1,y1,z1, x2,y2,z2, ...]
    // Returns MeshResult with positions and indices
    static MeshResult triangulatePolygon(const std::vector<float>& path, const std::vector<std::vector<float>>& holes, double deflection = 0.01);
};

#endif // MESHER_H

