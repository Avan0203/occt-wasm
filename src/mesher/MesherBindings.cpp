#include "MesherBindings.h"
#include "Mesher.h"
#include <TopoDS_Shape.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Vertex.hxx>
#include <GeomAbs_CurveType.hxx>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <string>

using namespace emscripten;

namespace MesherBindings {

// Helper function to convert vector to JavaScript typed array
template<typename T>
val vectorToTypedArray(const std::vector<T>& vec) {
    if (vec.empty()) {
        return val::null();
    }
    
    val result = val::global("Float32Array").new_(vec.size());
    for (size_t i = 0; i < vec.size(); i++) {
        result.set(i, vec[i]);
    }
    return result;
}

// Specialization for uint32_t
template<>
val vectorToTypedArray<uint32_t>(const std::vector<uint32_t>& vec) {
    if (vec.empty()) {
        return val::null();
    }
    
    val result = val::global("Uint32Array").new_(vec.size());
    for (size_t i = 0; i < vec.size(); i++) {
        result.set(i, vec[i]);
    }
    return result;
}

// Convert MeshResult to JavaScript object
val meshResultToObject(const MeshResult& result) {
    val obj = val::object();
    // Always set positions and indices, even if empty (use empty arrays instead of null)
    val positionsVal = vectorToTypedArray(result.positions);
    val indicesVal = vectorToTypedArray(result.indices);
    val normalsVal = vectorToTypedArray(result.normals);
    val uvsVal = vectorToTypedArray(result.uvs);
    
    obj.set("positions", positionsVal.isNull() ? val::global("Float32Array").new_(0) : positionsVal);
    obj.set("indices", indicesVal.isNull() ? val::global("Uint32Array").new_(0) : indicesVal);
    obj.set("normals", normalsVal.isNull() ? val::global("Float32Array").new_(0) : normalsVal);
    obj.set("uvs", uvsVal.isNull() ? val::global("Float32Array").new_(0) : uvsVal);
    return obj;
}

// Convert EdgeDiscretizationResult to JavaScript object
val edgeResultToObject(const EdgeDiscretizationResult& result) {
    val obj = val::object();
    obj.set("positions", vectorToTypedArray(result.positions));
    return obj;
}

// Convert vector of shapes to JavaScript array
val shapesToArray(const std::vector<TopoDS_Vertex>& shapes) {
    val result = val::array();
    for (const auto& shape : shapes) {
        result.call<void>("push", shape);
    }
    return result;
}

val edgesToArray(const std::vector<TopoDS_Edge>& shapes) {
    val result = val::array();
    for (const auto& shape : shapes) {
        result.call<void>("push", shape);
    }
    return result;
}

val facesToArray(const std::vector<TopoDS_Face>& shapes) {
    val result = val::array();
    for (const auto& shape : shapes) {
        result.call<void>("push", shape);
    }
    return result;
}

// Convert BRepResult to JavaScript object
val brepResultToObject(const BRepResult& result) {
    val obj = val::object();
    
    // Convert vertices (position as Float32Array, same as edges/faces)
    val vertices = val::array();
    for (const auto& v : result.vertices) {
        val vertex = val::object();
        val position = vectorToTypedArray(v.position);
        vertex.set("position", position.isNull() ? val::global("Float32Array").new_(0) : position);
        // Set shape: TopoDS_Vertex or null
        if (v.shape.IsNull()) {
            vertex.set("shape", val::null());
        } else {
            vertex.set("shape", v.shape);
        }
        vertices.call<void>("push", vertex);
    }
    obj.set("vertices", vertices);
    
    // Convert edges
    val edges = val::array();
    for (const auto& e : result.edges) {
        val edge = val::object();
        val position = vectorToTypedArray(e.position);
        edge.set("position", position.isNull() ? val::global("Float32Array").new_(0) : position);
        edge.set("type", static_cast<int>(e.type));
        // Set shape: TopoDS_Edge or null
        if (e.shape.IsNull()) {
            edge.set("shape", val::null());
        } else {
            edge.set("shape", e.shape);
        }
        edges.call<void>("push", edge);
    }
    obj.set("edges", edges);
    
    // Convert faces
    val faces = val::array();
    for (const auto& f : result.faces) {
        val face = val::object();
        val position = vectorToTypedArray(f.position);
        val index = vectorToTypedArray(f.index);
        val uvs = vectorToTypedArray(f.uvs);
        face.set("position", position.isNull() ? val::global("Float32Array").new_(0) : position);
        face.set("index", index.isNull() ? val::global("Uint32Array").new_(0) : index);
        face.set("uvs", uvs.isNull() ? val::global("Float32Array").new_(0) : uvs);
        // Set shape: TopoDS_Face or null
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

void registerBindings() {
    // Register vector types for use in value objects
    register_vector<float>("FloatVector");
    register_vector<uint32_t>("Uint32Vector");
    
    // ========== MeshResult ==========
    value_object<MeshResult>("MeshResult")
        .field("positions", &MeshResult::positions)
        .field("indices", &MeshResult::indices)
        .field("normals", &MeshResult::normals)
        .field("uvs", &MeshResult::uvs)
        ;
    
    register_vector<MeshResult>("MeshResultVector");
    
    // ========== EdgeDiscretizationResult ==========
    value_object<EdgeDiscretizationResult>("EdgeDiscretizationResult")
        .field("positions", &EdgeDiscretizationResult::positions)
        ;
    
    register_vector<EdgeDiscretizationResult>("EdgeDiscretizationResultVector");
    
    // ========== Mesher static methods ==========
    class_<Mesher>("Mesher")
        .class_function("getVertices", 
            optional_override([](const TopoDS_Shape& shape) -> val {
                std::vector<TopoDS_Vertex> vertices = Mesher::getVertices(shape);
                return shapesToArray(vertices);
            }))
        .class_function("getEdges",
            optional_override([](const TopoDS_Shape& shape) -> val {
                std::vector<TopoDS_Edge> edges = Mesher::getEdges(shape);
                return edgesToArray(edges);
            }))
        .class_function("getFaces",
            optional_override([](const TopoDS_Shape& shape) -> val {
                std::vector<TopoDS_Face> faces = Mesher::getFaces(shape);
                return facesToArray(faces);
            }))
        .class_function("triangulateFace", 
            optional_override([](const TopoDS_Face& face, double deflection, double angleDeviation) -> val {
                MeshResult result = Mesher::triangulateFace(face, deflection, angleDeviation);
                return meshResultToObject(result);
            }))
        .class_function("discretizeEdge",
            optional_override([](const TopoDS_Edge& edge, double lineDeflection, double angleDeviation) -> val {
                EdgeDiscretizationResult result = Mesher::discretizeEdge(edge, lineDeflection, angleDeviation);
                return edgeResultToObject(result);
            }))
        .class_function("meshShape",
            optional_override([](const TopoDS_Shape& shape, double deflection, double angleDeviation) -> val {
                MeshResult result = Mesher::meshShape(shape, deflection, angleDeviation);
                return meshResultToObject(result);
            }))
        .class_function("getWires",
            optional_override([](const TopoDS_Shape& shape) -> val {
                std::vector<TopoDS_Wire> wires = Mesher::getWires(shape);
                val result = val::array();
                for (const auto& wire : wires) {
                    result.call<void>("push", wire);
                }
                return result;
            }))
        .class_function("shapeToBRepResult",
            optional_override([](const TopoDS_Shape& shape, double lineDeflection, double angleDeviation) -> val {
                BRepResult result = Mesher::shapeToBRepResult(shape, lineDeflection, angleDeviation);
                return brepResultToObject(result);
            }))
        .class_function("triangulatePolygon",
            optional_override([](val pathArray, val holesArray, double deflection) -> val {
                // Convert JavaScript array (or TypedArray) to std::vector<float>
                std::vector<float> path;
                if (!pathArray.isNull()) {
                    // Check if it's an array or TypedArray
                    bool isArray = pathArray.isArray();
                    bool isTypedArray = pathArray.instanceof(val::global("Float32Array")) ||
                                       pathArray.instanceof(val::global("Array"));
                    
                    if (isArray || isTypedArray) {
                        Standard_Integer length = pathArray["length"].as<Standard_Integer>();
                        if (length > 0) {
                            path.reserve(length);
                            for (Standard_Integer i = 0; i < length; i++) {
                                path.push_back(pathArray[i].as<float>());
                            }
                        }
                    }
                }
                
                // Convert JavaScript array of arrays to std::vector<std::vector<float>>
                std::vector<std::vector<float>> holes;
                if (!holesArray.isNull() && holesArray.isArray()) {
                    Standard_Integer nbHoles = holesArray["length"].as<Standard_Integer>();
                    holes.reserve(nbHoles);
                    for (Standard_Integer i = 0; i < nbHoles; i++) {
                        val holeArray = holesArray[i];
                        if (!holeArray.isNull()) {
                            bool isHoleArray = holeArray.isArray();
                            bool isHoleTypedArray = holeArray.instanceof(val::global("Float32Array")) ||
                                                   holeArray.instanceof(val::global("Array"));
                            
                            if (isHoleArray || isHoleTypedArray) {
                                std::vector<float> hole;
                                Standard_Integer holeLength = holeArray["length"].as<Standard_Integer>();
                                if (holeLength > 0) {
                                    hole.reserve(holeLength);
                                    for (Standard_Integer j = 0; j < holeLength; j++) {
                                        hole.push_back(holeArray[j].as<float>());
                                    }
                                    holes.push_back(hole);
                                }
                            }
                        }
                    }
                }
                
                MeshResult result = Mesher::triangulatePolygon(path, holes, deflection);
                return meshResultToObject(result);
            }))
        ;
}

} // namespace MesherBindings

