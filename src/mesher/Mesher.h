#ifndef MESHER_H
#define MESHER_H

#include <TopoDS_Shape.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Vertex.hxx>
#include <vector>
#include <memory>

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

class Mesher {
public:
    // Extract topology elements from a shape
    static std::vector<TopoDS_Vertex> getVertices(const TopoDS_Shape& shape);
    static std::vector<TopoDS_Edge> getEdges(const TopoDS_Shape& shape);
    static std::vector<TopoDS_Face> getFaces(const TopoDS_Shape& shape);
    
    // Triangulate a face
    static MeshResult triangulateFace(const TopoDS_Face& face, double deflection = 0.01, double angleDeviation = 0.5);
    
    // Discretize an edge
    static EdgeDiscretizationResult discretizeEdge(const TopoDS_Edge& edge, double deflection = 0.01);
    
    // Mesh entire shape (all faces)
    static MeshResult meshShape(const TopoDS_Shape& shape, double deflection = 0.01, double angleDeviation = 0.5);
};

#endif // MESHER_H

