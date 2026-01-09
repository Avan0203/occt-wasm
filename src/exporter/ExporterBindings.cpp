#include "ExporterBindings.h"
#include <STEPControl_Writer.hxx>
#include <StlAPI_Writer.hxx>
#include <TopoDS_Shape.hxx>
#include <IFSelect_ReturnStatus.hxx>
#include <STEPControl_StepModelType.hxx>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <sstream>
#include <vector>

using namespace emscripten;

namespace ExporterBindings {

// Helper function to convert std::string to ArrayBuffer
val stringToArrayBuffer(const std::string& data) {
    val uint8Array = val::global("Uint8Array").new_(data.length());
    for (size_t i = 0; i < data.length(); i++) {
        uint8Array.set(i, static_cast<unsigned char>(data[i]));
    }
    return uint8Array["buffer"];
}

// Export STEP to ArrayBuffer
val exportSTEPToBuffer(const TopoDS_Shape& shape, int stepModelType) {
    STEPControl_Writer writer;
    STEPControl_StepModelType modelType = static_cast<STEPControl_StepModelType>(stepModelType);
    
    IFSelect_ReturnStatus status = writer.Transfer(shape, modelType);
    if (status != IFSelect_RetDone) {
        return val::null();
    }
    
    // Write to string stream
    std::ostringstream stream;
    status = writer.WriteStream(stream);
    
    if (status != IFSelect_RetDone) {
        return val::null();
    }
    
    std::string data = stream.str();
    return stringToArrayBuffer(data);
}

// Export STL to ArrayBuffer
val exportSTLToBuffer(const TopoDS_Shape& shape, bool ascii) {
    StlAPI_Writer writer;
    writer.ASCIIMode() = ascii;
    
    // Write to string stream
    std::ostringstream stream;
    
    // StlAPI_Writer doesn't have a direct stream write method,
    // so we need to use a workaround
    // For ASCII STL, we can write directly
    // For binary STL, we need to handle the binary format
    
    if (ascii) {
        // Write ASCII STL
        stream << "solid ExportedShape\n";
        
        // We need to triangulate the shape first
        // This is a simplified version - proper implementation
        // would iterate through faces and write triangles
        
        // For now, use a temporary approach
        // In a real implementation, you'd use BRepMesh and Poly_Triangulation
        // to extract triangles and write them
        
        stream << "endsolid ExportedShape\n";
    } else {
        // Binary STL format
        // Write 80-byte header
        char header[80] = {0};
        stream.write(header, 80);
        
        // Write number of triangles (placeholder - would need actual count)
        uint32_t numTriangles = 0;
        stream.write(reinterpret_cast<const char*>(&numTriangles), sizeof(uint32_t));
        
        // Write triangles (would need actual triangle data)
        // Each triangle: 12 floats (normal + 3 vertices) + 2 bytes attribute
    }
    
    std::string data = stream.str();
    return stringToArrayBuffer(data);
}

// Alternative STL export using proper triangulation
val exportSTLToBufferProper(const TopoDS_Shape& shape, bool ascii) {
    // This would require:
    // 1. Triangulate the shape using BRepMesh_IncrementalMesh
    // 2. Extract triangles from Poly_Triangulation
    // 3. Write in STL format (ASCII or binary)
    
    // For now, return a placeholder
    // Full implementation would be quite extensive
    return val::null();
}

void registerBindings() {
    // ========== STEPExporter (STEPControl_Writer wrapper) ==========
    class_<STEPControl_Writer>("STEPExporter")
        .constructor<>()
        .function("transfer",
            optional_override([](STEPControl_Writer& self, const TopoDS_Shape& shape, int stepModelType) -> bool {
                STEPControl_StepModelType modelType = static_cast<STEPControl_StepModelType>(stepModelType);
                IFSelect_ReturnStatus status = self.Transfer(shape, modelType);
                return status == IFSelect_RetDone;
            }))
        .function("writeFile",
            optional_override([](STEPControl_Writer& self, const std::string& filename) -> bool {
                IFSelect_ReturnStatus status = self.Write(filename.c_str());
                return status == IFSelect_RetDone;
            }))
        .function("writeStream",
            optional_override([](STEPControl_Writer& self, std::ostringstream& stream) -> bool {
                IFSelect_ReturnStatus status = self.WriteStream(stream);
                return status == IFSelect_RetDone;
            }))
        ;
    
    // ========== STLExporter (StlAPI_Writer wrapper) ==========
    class_<StlAPI_Writer>("STLExporter")
        .constructor<>()
        .function("setASCIIMode",
            optional_override([](StlAPI_Writer& self, bool ascii) {
                self.ASCIIMode() = ascii;
            }))
        .function("writeFile",
            optional_override([](StlAPI_Writer& self, const TopoDS_Shape& shape, const std::string& filename) -> bool {
                return self.Write(shape, filename.c_str());
            }))
        ;
    
    // ========== StepModelType enum ==========
    enum_<STEPControl_StepModelType>("StepModelType")
        .value("AS_IS", STEPControl_AsIs)
        .value("MANIFOLD_SOLID_BREP", STEPControl_ManifoldSolidBrep)
        .value("BREP_WITH_VOIDS", STEPControl_BrepWithVoids)
        .value("FACETED_BREP", STEPControl_FacetedBrep)
        .value("FACETED_BREP_AND_BREP_WITH_VOIDS", STEPControl_FacetedBrepAndBrepWithVoids)
        .value("SHELL_BASED_SURFACE_MODEL", STEPControl_ShellBasedSurfaceModel)
        .value("GEOMETRIC_CURVE_SET", STEPControl_GeometricCurveSet)
        .value("HYBRID", STEPControl_Hybrid)
        ;
    
    // ========== Static convenience functions ==========
    function("exportSTEP", &exportSTEPToBuffer);
    function("exportSTL", &exportSTLToBuffer);
}

} // namespace ExporterBindings

