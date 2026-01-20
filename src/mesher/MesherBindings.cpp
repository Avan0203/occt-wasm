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

// Convert BRepResult to JavaScript object
val brepResultToObject(const BRepResult& result) {
    val obj = val::object();
    
    // Convert vertices
    val vertices = val::array();
    for (const auto& v : result.vertices) {
        val vertex = val::object();
        vertex.set("hash", v.hash);
        val value = val::array();
        for (float coord : v.value) {
            value.call<void>("push", coord);
        }
        vertex.set("value", value);
        vertex.set("isBRep", v.isBRep);
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
        edge.set("hash", e.hash);
        edge.set("start", e.start);
        edge.set("end", e.end);
        val value = val::array();
        for (const std::string& hash : e.value) {
            value.call<void>("push", hash);
        }
        edge.set("value", value);
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
    
    // Convert wires
    val wires = val::array();
    for (const auto& w : result.wires) {
        val wire = val::object();
        wire.set("hash", w.hash);
        val value = val::array();
        for (const std::string& hash : w.value) {
            value.call<void>("push", hash);
        }
        wire.set("value", value);
        // Set shape: TopoDS_Wire or null
        if (w.shape.IsNull()) {
            wire.set("shape", val::null());
        } else {
            wire.set("shape", w.shape);
        }
        wires.call<void>("push", wire);
    }
    obj.set("wires", wires);
    
    // Convert faces
    val faces = val::array();
    for (const auto& f : result.faces) {
        val face = val::object();
        face.set("hash", f.hash);
        val path = val::array();
        for (const std::string& hash : f.path) {
            path.call<void>("push", hash);
        }
        face.set("path", path);
        val holes = val::array();
        for (const std::string& hash : f.holes) {
            holes.call<void>("push", hash);
        }
        face.set("holes", holes);
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
    register_vector<std::string>("StringVector");
    
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
        ;
}

} // namespace MesherBindings

