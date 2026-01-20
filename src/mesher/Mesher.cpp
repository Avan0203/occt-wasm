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

// Helper function to generate 6-digit hex hash (like color code)
static std::string generateHexHash(int counter) {
    std::ostringstream ss;
    ss << std::hex << std::uppercase << std::setfill('0') << std::setw(6) << counter;
    return ss.str();
}

// Helper function to generate hash string from coordinates (used for checking duplicates)
static std::string coordinateHash(float x, float y, float z) {
    std::ostringstream ss;
    ss << std::fixed << std::setprecision(6)
       << x << "_" << y << "_" << z;
    return ss.str();
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

    // ===== Hash counter (6-digit hex, starting from 1) =====
    int hashCounter = 1;

    // ===== IndexedMap（唯一正确的 ID 系统） =====
    TopTools_IndexedMapOfShape vMap, eMap, wMap, fMap;
    TopExp::MapShapes(shape, TopAbs_VERTEX, vMap);
    TopExp::MapShapes(shape, TopAbs_EDGE,   eMap);
    TopExp::MapShapes(shape, TopAbs_WIRE,   wMap);
    TopExp::MapShapes(shape, TopAbs_FACE,   fMap);

    // ===== Vertex =====
    std::unordered_map<int, std::string> vertexIndexToHash;  // Map from IndexedMap index to hash
    for (int i = 1; i <= vMap.Extent(); ++i) {
        TopoDS_Vertex v = TopoDS::Vertex(vMap(i));
        gp_Pnt p = BRep_Tool::Pnt(v);

        BRepVertex out;
        out.hash = generateHexHash(hashCounter++);
        out.value = { (float)p.X(), (float)p.Y(), (float)p.Z() };
        out.isBRep = true;
        out.shape = v;  // Set shape to TopoDS_Vertex

        result.vertices.push_back(out);
        vertexIndexToHash[i] = out.hash;
    }

    // ===== Edge =====
    std::unordered_map<int, std::string> edgeIndexToHash;  // Map from IndexedMap index to hash

    for (int i = 1; i <= eMap.Extent(); ++i) {
        TopoDS_Edge edge = TopoDS::Edge(eMap(i));
        if (BRep_Tool::Degenerated(edge)) continue;

        // Discretize edge to get all points
        EdgeDiscretizationResult disc = discretizeEdge(edge, lineDeflection, angleDeviation);
        if (disc.positions.size() < 6) continue; // Need at least 2 points (6 floats)

        BRepEdge out;
        out.hash = generateHexHash(hashCounter++);
        out.type = getCurveType(edge);
        out.shape = edge;  // Set shape to TopoDS_Edge

        std::vector<std::string> polyline;

        // Process all discretized points
        for (size_t k = 0; k < disc.positions.size(); k += 3) {
            float x = disc.positions[k];
            float y = disc.positions[k + 1];
            float z = disc.positions[k + 2];

            // Check if this vertex already exists (check both BRep and non-BRep vertices)
            bool found = false;
            std::string vh;
            for (auto& v : result.vertices) {
                if (v.value.size() == 3 &&
                    std::abs(v.value[0] - x) < 1e-6 &&
                    std::abs(v.value[1] - y) < 1e-6 &&
                    std::abs(v.value[2] - z) < 1e-6) {
                    vh = v.hash;
                    found = true;
                    break;
                }
            }

            if (!found) {
                BRepVertex discVertex;
                discVertex.hash = generateHexHash(hashCounter++);
                discVertex.value = { x, y, z };
                discVertex.isBRep = false;
                discVertex.shape = TopoDS_Vertex();  // Empty shape (null)
                result.vertices.push_back(discVertex);
                vh = discVertex.hash;
            }

            polyline.push_back(vh);
        }

        // Set start and end from polyline
        if (!polyline.empty()) {
            out.start = polyline.front();
            out.end   = polyline.back();
        }
        out.value = polyline;

        result.edges.push_back(out);
        edgeIndexToHash[i] = out.hash;
    }

    // ===== Wire（顺序必须用 WireExplorer） =====
    std::unordered_map<int, std::string> wireIndexToHash;  // Map from IndexedMap index to hash
    for (int i = 1; i <= wMap.Extent(); ++i) {
        TopoDS_Wire wire = TopoDS::Wire(wMap(i));

        BRepWire out;
        out.hash = generateHexHash(hashCounter++);
        out.shape = wire;  // Set shape to TopoDS_Wire

        BRepTools_WireExplorer we(wire);
        for (; we.More(); we.Next()) {
            int eIdx = eMap.FindIndex(we.Current());
            if (eIdx > 0 && edgeIndexToHash.count(eIdx)) {
                out.value.push_back(edgeIndexToHash[eIdx]);
            }
        }

        if (!out.value.empty()) {
            result.wires.push_back(out);
            wireIndexToHash[i] = out.hash;
        }
    }

    // ===== Face =====
    for (int i = 1; i <= fMap.Extent(); ++i) {
        TopoDS_Face face = TopoDS::Face(fMap(i));

        BRepFace out;
        out.hash = generateHexHash(hashCounter++);
        out.shape = face;  // Set shape to TopoDS_Face

        TopoDS_Wire outer = ShapeAnalysis::OuterWire(face);

        TopExp_Explorer ex(face, TopAbs_WIRE);
        for (; ex.More(); ex.Next()) {
            TopoDS_Wire w = TopoDS::Wire(ex.Current());
            int wIdx = wMap.FindIndex(w);
            if (wIdx <= 0 || !wireIndexToHash.count(wIdx)) continue;

            std::string wh = wireIndexToHash[wIdx];
            if (w.IsSame(outer)) {
                out.path.push_back(wh);
            } else {
                out.holes.push_back(wh);
            }
        }

        if (!out.path.empty()) {
            result.faces.push_back(out);
        }
    }

    return result;
}