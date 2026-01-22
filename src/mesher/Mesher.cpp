#include "Mesher.h"
#include <TopExp.hxx>
#include <TopExp_Explorer.hxx>
#include <TopTools_IndexedMapOfShape.hxx>
#include <TopoDS.hxx>
#include <BRep_Tool.hxx>
#include <BRepMesh_IncrementalMesh.hxx>
#include <Poly_Triangulation.hxx>
#include <Poly_Connect.hxx>
#include <BRepAdaptor_Curve.hxx>
#include <GCPnts_UniformAbscissa.hxx>
#include <GCPnts_QuasiUniformDeflection.hxx>
#include <GCPnts_TangentialDeflection.hxx>
#include <TopLoc_Location.hxx>
#include <gp_Trsf.hxx>
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <gp_Pnt2d.hxx>
#include <Precision.hxx>
#include <BRepTools.hxx>
#include <BRepTools_WireExplorer.hxx>
#include <ShapeAnalysis.hxx>
#include <Geom_Curve.hxx>
#include <BRepBuilderAPI_MakePolygon.hxx>
#include <BRepBuilderAPI_MakeFace.hxx>
#include <Geom_Plane.hxx>
#include <sstream>
#include <iomanip>
#include <unordered_map>

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

std::vector<TopoDS_Wire> Mesher::getWires(const TopoDS_Shape& shape) {
    std::vector<TopoDS_Wire> wires;
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, TopAbs_WIRE, map);
    
    for (int i = 1; i <= map.Extent(); i++) {
        wires.push_back(TopoDS::Wire(map(i)));
    }
    
    return wires;
}

MeshResult Mesher::triangulateFace(const TopoDS_Face& face, double deflection, double angleDeviation) {
    MeshResult result;
    
    // Ensure the face has triangulation
    TopLoc_Location loc;
    Handle(Poly_Triangulation) triangulation = BRep_Tool::Triangulation(face, loc);
    
    if (triangulation.IsNull()) {
        // Create triangulation if it doesn't exist
        BRepMesh_IncrementalMesh mesher(face, deflection, Standard_False, angleDeviation, Standard_True);
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
            
            // Find triangles containing this node
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

EdgeDiscretizationResult Mesher::discretizeEdge(const TopoDS_Edge& edge, double lineDeflection, double angleDeviation) {
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
    
    // Use tangential deflection which supports both angular and linear deflection
    // This provides better control over curve discretization based on both angle and distance
    GCPnts_TangentialDeflection discretizer(curve, first, last, angleDeviation, lineDeflection, 2, Precision::Confusion());
    
    // GCPnts_TangentialDeflection doesn't have IsDone(), check NbPoints() instead
    if (discretizer.NbPoints() == 0) {
        // Fallback to quasi-uniform deflection
        GCPnts_QuasiUniformDeflection quasiDiscretizer(curve, lineDeflection, first, last);
        if (!quasiDiscretizer.IsDone()) {
            // Final fallback to uniform abscissa
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
        
        // Use quasi-uniform deflection result
        Standard_Integer nbPoints = quasiDiscretizer.NbPoints();
        result.positions.reserve(nbPoints * 3);
        for (Standard_Integer i = 1; i <= nbPoints; i++) {
            Standard_Real param = quasiDiscretizer.Parameter(i);
            gp_Pnt pnt = curve.Value(param);
            result.positions.push_back(static_cast<float>(pnt.X()));
            result.positions.push_back(static_cast<float>(pnt.Y()));
            result.positions.push_back(static_cast<float>(pnt.Z()));
        }
        return result;
    }
    
    Standard_Integer nbPoints = discretizer.NbPoints();
    result.positions.reserve(nbPoints * 3);
    
    for (Standard_Integer i = 1; i <= nbPoints; i++) {
        Standard_Real param = discretizer.Parameter(i);
        gp_Pnt pnt = discretizer.Value(i);
        result.positions.push_back(static_cast<float>(pnt.X()));
        result.positions.push_back(static_cast<float>(pnt.Y()));
        result.positions.push_back(static_cast<float>(pnt.Z()));
    }
    
    return result;
}

MeshResult Mesher::meshShape(const TopoDS_Shape& shape, double lineDeflection, double angleDeviation) {
    MeshResult result;
    
    // Ensure the shape has triangulation
    BRepMesh_IncrementalMesh mesher(shape, lineDeflection, Standard_False, angleDeviation, Standard_True);
    
    // Get all faces
    std::vector<TopoDS_Face> faces = getFaces(shape);
    
    // Accumulate results from all faces
    Standard_Integer vertexOffset = 0;
    
    for (const TopoDS_Face& face : faces) {
        MeshResult faceResult = triangulateFace(face, lineDeflection, angleDeviation);
        
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


// Helper function to get curve type of an edge
static GeomAbs_CurveType getCurveType(const TopoDS_Edge& edge) {
    if (BRep_Tool::Degenerated(edge)) {
        return GeomAbs_OtherCurve;
    }
    BRepAdaptor_Curve curve(edge);
    return curve.GetType();
}

BRepResult Mesher::shapeToBRepResult(const TopoDS_Shape& shape, double lineDeflection, double angleDeviation) {
    BRepResult result;

    // ===== Extract all vertices =====
    std::vector<TopoDS_Vertex> vertices = getVertices(shape);
    for (const TopoDS_Vertex& v : vertices) {
        gp_Pnt p = BRep_Tool::Pnt(v);
        BRepVertex brepVertex;
        brepVertex.position = { (float)p.X(), (float)p.Y(), (float)p.Z() };
        brepVertex.shape = v;
        result.vertices.push_back(brepVertex);
    }

    // ===== Extract and discretize all edges =====
    std::vector<TopoDS_Edge> edges = getEdges(shape);
    for (const TopoDS_Edge& edge : edges) {
        if (BRep_Tool::Degenerated(edge)) {
            continue;
        }

        // Discretize edge to get all points
        EdgeDiscretizationResult disc = discretizeEdge(edge, lineDeflection, angleDeviation);
        if (disc.positions.size() < 6) { // Need at least 2 points (6 floats)
            continue;
        }

        BRepEdge brepEdge;
        brepEdge.position = disc.positions; // Direct copy of discretized positions
        brepEdge.type = getCurveType(edge);
        brepEdge.shape = edge;
        result.edges.push_back(brepEdge);
    }

    // ===== Extract and triangulate all faces =====
    std::vector<TopoDS_Face> faces = getFaces(shape);
    for (const TopoDS_Face& face : faces) {
        // Triangulate the face
        MeshResult meshResult = triangulateFace(face, lineDeflection, angleDeviation);
        
        if (meshResult.positions.empty() || meshResult.indices.empty()) {
            continue;
        }

        BRepFace brepFace;
        brepFace.position = meshResult.positions; // Triangulated mesh vertices
        brepFace.index = meshResult.indices;      // Triangle indices
        brepFace.shape = face;
        result.faces.push_back(brepFace);
    }

    return result;
}

MeshResult Mesher::triangulatePolygon(const std::vector<float>& path, const std::vector<std::vector<float>>& holes, double deflection) {
    MeshResult result;
    
    // Validate input
    if (path.size() < 9) { // Need at least 3 points (3 * 3 coordinates)
        return result; // Return empty result
    }
    
    if (path.size() % 3 != 0) {
        return result; // Invalid point data
    }
    
    try {
        // Create outer boundary wire from path points
        BRepBuilderAPI_MakePolygon outerPolygon;
        Standard_Integer nbPoints = static_cast<Standard_Integer>(path.size() / 3);
        
        for (Standard_Integer i = 0; i < nbPoints; i++) {
            Standard_Real x = static_cast<Standard_Real>(path[i * 3]);
            Standard_Real y = static_cast<Standard_Real>(path[i * 3 + 1]);
            Standard_Real z = static_cast<Standard_Real>(path[i * 3 + 2]);
            outerPolygon.Add(gp_Pnt(x, y, z));
        }
        outerPolygon.Close();
        
        if (!outerPolygon.IsDone()) {
            return result;
        }
        
        TopoDS_Wire outerWire = outerPolygon.Wire();
        
        // Create face from outer wire
        // Use the first three points to define a plane
        gp_Pnt p1(static_cast<Standard_Real>(path[0]), 
                  static_cast<Standard_Real>(path[1]), 
                  static_cast<Standard_Real>(path[2]));
        gp_Pnt p2(static_cast<Standard_Real>(path[3]), 
                  static_cast<Standard_Real>(path[4]), 
                  static_cast<Standard_Real>(path[5]));
        gp_Pnt p3(static_cast<Standard_Real>(path[6]), 
                  static_cast<Standard_Real>(path[7]), 
                  static_cast<Standard_Real>(path[8]));
        
        gp_Vec v1(p1, p2);
        gp_Vec v2(p1, p3);
        gp_Vec normal = v1.Crossed(v2);
        
        Handle(Geom_Plane) geomPlane;
        if (normal.Magnitude() < Precision::Confusion()) {
            // Points are collinear, use default plane
            geomPlane = new Geom_Plane(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1));
        } else {
            // Create plane from the three points
            normal.Normalize();
            gp_Pln plane(p1, gp_Dir(normal));
            geomPlane = new Geom_Plane(plane);
        }
        
        BRepBuilderAPI_MakeFace faceMaker(geomPlane, outerWire);
        
        // Add holes
        for (const auto& hole : holes) {
            if (hole.size() < 9 || hole.size() % 3 != 0) {
                continue; // Skip invalid holes
            }
            
            BRepBuilderAPI_MakePolygon holePolygon;
            Standard_Integer nbHolePoints = static_cast<Standard_Integer>(hole.size() / 3);
            
            for (Standard_Integer i = 0; i < nbHolePoints; i++) {
                Standard_Real x = static_cast<Standard_Real>(hole[i * 3]);
                Standard_Real y = static_cast<Standard_Real>(hole[i * 3 + 1]);
                Standard_Real z = static_cast<Standard_Real>(hole[i * 3 + 2]);
                holePolygon.Add(gp_Pnt(x, y, z));
            }
            holePolygon.Close();
            
            if (holePolygon.IsDone()) {
                faceMaker.Add(holePolygon.Wire());
            }
        }
        
        if (!faceMaker.IsDone()) {
            return result;
        }
        
        TopoDS_Face face = faceMaker.Face();
        
        // Triangulate the face using OCCT's Delaunay triangulation
        BRepMesh_IncrementalMesh mesher(face, deflection, Standard_False, 0.5, Standard_True);
        
        // Extract triangulation result
        TopLoc_Location location;
        Handle(Poly_Triangulation) triangulation = BRep_Tool::Triangulation(face, location);
        
        if (triangulation.IsNull()) {
            return result;
        }
        
        // Apply transformation if needed
        gp_Trsf trsf = location.Transformation();
        Standard_Boolean hasTransform = (trsf.Form() != gp_Identity);
        
        Standard_Integer nbNodes = triangulation->NbNodes();
        Standard_Integer nbTriangles = triangulation->NbTriangles();
        
        result.positions.reserve(nbNodes * 3);
        result.indices.reserve(nbTriangles * 3);
        
        // Extract positions
        for (Standard_Integer i = 1; i <= nbNodes; i++) {
            gp_Pnt pnt = triangulation->Node(i);
            if (hasTransform) {
                pnt.Transform(trsf);
            }
            result.positions.push_back(static_cast<float>(pnt.X()));
            result.positions.push_back(static_cast<float>(pnt.Y()));
            result.positions.push_back(static_cast<float>(pnt.Z()));
        }
        
        // Extract indices (convert from 1-based to 0-based)
        for (Standard_Integer i = 1; i <= nbTriangles; i++) {
            Poly_Triangle triangle = triangulation->Triangle(i);
            Standard_Integer n1, n2, n3;
            triangle.Get(n1, n2, n3);
            result.indices.push_back(static_cast<uint32_t>(n1 - 1));
            result.indices.push_back(static_cast<uint32_t>(n2 - 1));
            result.indices.push_back(static_cast<uint32_t>(n3 - 1));
        }
    }
    catch (Standard_Failure const&) {
        // Return empty result on failure
        return result;
    }
    
    return result;
}