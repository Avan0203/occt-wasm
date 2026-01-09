#include "MesherBindings.h"
#include "Mesher.h"
#include <TopoDS_Shape.hxx>
#include <TopoDS_Face.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Vertex.hxx>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>

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
    obj.set("positions", vectorToTypedArray(result.positions));
    obj.set("indices", vectorToTypedArray(result.indices));
    obj.set("normals", vectorToTypedArray(result.normals));
    obj.set("uvs", vectorToTypedArray(result.uvs));
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
            optional_override([](const TopoDS_Face& face, double deflection) -> val {
                MeshResult result = Mesher::triangulateFace(face, deflection);
                return meshResultToObject(result);
            }))
        .class_function("discretizeEdge",
            optional_override([](const TopoDS_Edge& edge, double deflection) -> val {
                EdgeDiscretizationResult result = Mesher::discretizeEdge(edge, deflection);
                return edgeResultToObject(result);
            }))
        .class_function("meshShape",
            optional_override([](const TopoDS_Shape& shape, double deflection) -> val {
                MeshResult result = Mesher::meshShape(shape, deflection);
                return meshResultToObject(result);
            }))
        ;
}

} // namespace MesherBindings

