#include "Mesher.h"
#include <TopExp.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopoDS.hxx>
#include <BRep_Tool.hxx>
#include <BRepMesh_IncrementalMesh.hxx>
#include <Poly_Triangulation.hxx>
#include <Poly_Connect.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <GCPnts_UniformAbscissa.hxx>
#include <GCPnts_QuasiUniformDeflection.hxx>
#include <TopLoc_Location.hxx>
#include <gp_Trsf.hxx>
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <gp_Pnt2d.hxx>
#include <Precision.hxx>
#include <BRepTools.hxx>

std::vector<TopoDS_Vertex> Mesher::getVertices(const TopoDS_Shape& shape) {
    std::vector<TopoDS_Vertex> vertices;
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_VERTEX, map);
    
    for (int i = 1; i <= map.Extent(); i++) {
        vertices.push_back(TopoDS::Vertex(map(i)));
    }
    
    return vertices;
}

std::vector<TopoDS_Edge> Mesher::getEdges(const TopoDS_Shape& shape) {
    std::vector<TopoDS_Edge> edges;
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_EDGE, map);
    
    for (int i = 1; i <= map.Extent(); i++) {
        edges.push_back(TopoDS::Edge(map(i)));
    }
    
    return edges;
}

std::vector<TopoDS_Face> Mesher::getFaces(const TopoDS_Shape& shape) {
    std::vector<TopoDS_Face> faces;
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_FACE, map);
    
    for (int i = 1; i <= map.Extent(); i++) {
        faces.push_back(TopoDS::Face(map(i)));
    }
    
    return faces;
}

MeshResult Mesher::triangulateFace(const TopoDS_Face& face, double deflection) {
    MeshResult result;
    
    // Ensure the face has triangulation
    TopLoc_Location loc;
    Handle(Poly_Triangulation) triangulation = BRep_Tool::Triangulation(face, loc);
    
    if (triangulation.IsNull()) {
        // Create triangulation if it doesn't exist
        BRepMesh_IncrementalMesh mesher(face, deflection, Standard_False, deflection * 0.1, Standard_True);
        triangulation = BRep_Tool::Triangulation(face, loc);
        
        if (triangulation.IsNull()) {
            return result; // Return empty result
        }
    }
    
    const gp_Trsf& trsf = loc.Transformation();
    Standard_Boolean isMirrored = trsf.VectorialPart().Determinant() < 0;
    Standard_Boolean isReversed = (face.Orientation() == TopAbs_REVERSED);
    
    // Extract positions
    Standard_Integer nbNodes = triangulation->NbNodes();
    result.positions.reserve(nbNodes * 3);
    
    for (Standard_Integer i = 1; i <= nbNodes; i++) {
        gp_Pnt pnt = triangulation->Node(i);
        if (!loc.IsIdentity()) {
            pnt.Transform(trsf);
        }
        result.positions.push_back(static_cast<float>(pnt.X()));
        result.positions.push_back(static_cast<float>(pnt.Y()));
        result.positions.push_back(static_cast<float>(pnt.Z()));
    }
    
    // Extract indices
    Standard_Integer nbTriangles = triangulation->NbTriangles();
    result.indices.reserve(nbTriangles * 3);
    
    for (Standard_Integer i = 1; i <= nbTriangles; i++) {
        Poly_Triangle triangle = triangulation->Triangle(i);
        Standard_Integer n1, n2, n3;
        triangle.Get(n1, n2, n3);
        
        // Convert from 1-based to 0-based indexing
        n1--; n2--; n3--;
        
        if ((isReversed ^ isMirrored)) {
            // Reverse triangle winding
            result.indices.push_back(static_cast<uint32_t>(n1));
            result.indices.push_back(static_cast<uint32_t>(n3));
            result.indices.push_back(static_cast<uint32_t>(n2));
        } else {
            result.indices.push_back(static_cast<uint32_t>(n1));
            result.indices.push_back(static_cast<uint32_t>(n2));
            result.indices.push_back(static_cast<uint32_t>(n3));
        }
    }
    
    // Extract normals
    if (triangulation->HasNormals()) {
        result.normals.reserve(nbNodes * 3);
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
            result.normals.push_back(static_cast<float>(normal.X()));
            result.normals.push_back(static_cast<float>(normal.Y()));
            result.normals.push_back(static_cast<float>(normal.Z()));
        }
    } else {
        // Compute normals if not present
        Poly_Connect connect(triangulation);
        result.normals.reserve(nbNodes * 3);
        for (Standard_Integer i = 1; i <= nbNodes; i++) {
            gp_Vec normalVec(0.0, 0.0, 0.0);
            const Poly_Array1OfTriangle& triangles = triangulation->Triangles();
            
            // Find triangles containing this node
            for (Standard_Integer j = 1; j <= nbTriangles; j++) {
                Poly_Triangle triangle = triangles(j);
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
            
            result.normals.push_back(static_cast<float>(normalVec.X()));
            result.normals.push_back(static_cast<float>(normalVec.Y()));
            result.normals.push_back(static_cast<float>(normalVec.Z()));
        }
    }
    
    // Extract UV coordinates
    if (triangulation->HasUVNodes()) {
        result.uvs.reserve(nbNodes * 2);
        for (Standard_Integer i = 1; i <= nbNodes; i++) {
            gp_Pnt2d uv = triangulation->UVNode(i);
            result.uvs.push_back(static_cast<float>(uv.X()));
            result.uvs.push_back(static_cast<float>(uv.Y()));
        }
    }
    
    return result;
}

EdgeDiscretizationResult Mesher::discretizeEdge(const TopoDS_Edge& edge, double deflection) {
    EdgeDiscretizationResult result;
    
    if (BRep_Tool::Degenerated(edge)) {
        return result; // Return empty result for degenerated edges
    }
    
    BRepAdaptor_Curve curve(edge);
    Standard_Real first = curve.FirstParameter();
    Standard_Real last = curve.LastParameter();
    
    if (Abs(last - first) < Precision::Confusion()) {
        // Single point
        gp_Pnt pnt = curve.Value(first);
        result.positions.push_back(static_cast<float>(pnt.X()));
        result.positions.push_back(static_cast<float>(pnt.Y()));
        result.positions.push_back(static_cast<float>(pnt.Z()));
        return result;
    }
    
    // Use quasi-uniform deflection for better curve sampling
    GCPnts_QuasiUniformDeflection discretizer(curve, deflection, first, last);
    
    if (!discretizer.IsDone()) {
        // Fallback to uniform abscissa
        Standard_Integer nbPoints = 100;
        GCPnts_UniformAbscissa uniformDiscretizer(curve, nbPoints, first, last);
        if (uniformDiscretizer.IsDone()) {
            Standard_Integer nbPnts = uniformDiscretizer.NbPoints();
            result.positions.reserve(nbPnts * 3);
            for (Standard_Integer i = 1; i <= nbPnts; i++) {
                Standard_Real param = uniformDiscretizer.Parameter(i);
                gp_Pnt pnt = curve.Value(param);
                result.positions.push_back(static_cast<float>(pnt.X()));
                result.positions.push_back(static_cast<float>(pnt.Y()));
                result.positions.push_back(static_cast<float>(pnt.Z()));
            }
        }
        return result;
    }
    
    Standard_Integer nbPoints = discretizer.NbPoints();
    result.positions.reserve(nbPoints * 3);
    
    for (Standard_Integer i = 1; i <= nbPoints; i++) {
        Standard_Real param = discretizer.Parameter(i);
        gp_Pnt pnt = curve.Value(param);
        result.positions.push_back(static_cast<float>(pnt.X()));
        result.positions.push_back(static_cast<float>(pnt.Y()));
        result.positions.push_back(static_cast<float>(pnt.Z()));
    }
    
    return result;
}

MeshResult Mesher::meshShape(const TopoDS_Shape& shape, double deflection) {
    MeshResult result;
    
    // Ensure the shape has triangulation
    BRepMesh_IncrementalMesh mesher(shape, deflection, Standard_False, deflection * 0.1, Standard_True);
    
    // Get all faces
    std::vector<TopoDS_Face> faces = getFaces(shape);
    
    // Accumulate results from all faces
    Standard_Integer vertexOffset = 0;
    
    for (const TopoDS_Face& face : faces) {
        MeshResult faceResult = triangulateFace(face, deflection);
        
        if (faceResult.positions.empty()) {
            continue;
        }
        
        // Append positions
        result.positions.insert(result.positions.end(), 
                                faceResult.positions.begin(), 
                                faceResult.positions.end());
        
        // Append indices with offset
        for (uint32_t idx : faceResult.indices) {
            result.indices.push_back(idx + vertexOffset);
        }
        
        // Append normals
        if (!faceResult.normals.empty()) {
            result.normals.insert(result.normals.end(),
                                 faceResult.normals.begin(),
                                 faceResult.normals.end());
        }
        
        // Append UVs
        if (!faceResult.uvs.empty()) {
            result.uvs.insert(result.uvs.end(),
                             faceResult.uvs.begin(),
                             faceResult.uvs.end());
        }
        
        // Update vertex offset
        vertexOffset += static_cast<Standard_Integer>(faceResult.positions.size() / 3);
    }
    
    return result;
}

