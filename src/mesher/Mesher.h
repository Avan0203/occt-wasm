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
    std::string hash;
    std::vector<float> value;          // [x, y, z]
    bool isBRep;                       // true for original BRep vertices, false for discretized vertices
    TopoDS_Vertex shape;               // pointer to TopoDS_Vertex or null (empty shape)
};

struct BRepEdge {
    std::string hash;
    std::string start;                 // hash of start vertex
    std::string end;                   // hash of end vertex
    std::vector<std::string> value;    // complete discretized segment data, vertex hashes from start to end
    GeomAbs_CurveType type;            // curve type enum
    TopoDS_Edge shape;                 // pointer to TopoDS_Edge
};

struct BRepWire {
    std::string hash;
    std::vector<std::string> value;    // edges hashes
    TopoDS_Wire shape;                 // pointer to TopoDS_Wire
};

struct BRepFace {
    std::string hash;
    std::vector<std::string> path;     // outer wire hashes
    std::vector<std::string> holes;    // hole wire hashes
    TopoDS_Face shape;                 // pointer to TopoDS_Face
};

struct BRepResult {
    std::vector<BRepVertex> vertices;
    std::vector<BRepEdge> edges;
    std::vector<BRepWire> wires;
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
    
    // Mesh entire shape (all faces)
    static MeshResult meshShape(const TopoDS_Shape& shape, double lineDeflection = 0.01, double angleDeviation = 0.5);
    
    // Generate BRep result from a shape
    static BRepResult shapeToBRepResult(const TopoDS_Shape& shape, double lineDeflection = 0.01, double angleDeviation = 0.5);
};

#endif // MESHER_H

