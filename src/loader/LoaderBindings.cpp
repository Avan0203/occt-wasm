#include "LoaderBindings.h"
#include <STEPControl_Reader.hxx>
#include <StlAPI_Reader.hxx>
#include <TopoDS_Shape.hxx>
#include <TopoDS_Compound.hxx>
#include <BRep_Builder.hxx>
#include <Standard_ArrayStreamBuffer.hxx>
#include <IFSelect_ReturnStatus.hxx>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <sstream>
#include <memory>

using namespace emscripten;

namespace LoaderBindings {

// Helper function to convert ArrayBuffer to std::string
std::string arrayBufferToString(val buffer) {
    val uint8Array = val::global("Uint8Array").new_(buffer);
    size_t length = uint8Array["length"].as<size_t>();
    std::string result(length, '\0');
    
    for (size_t i = 0; i < length; i++) {
        result[i] = static_cast<char>(uint8Array[i].as<unsigned char>());
    }
    
    return result;
}

// Load STEP from ArrayBuffer
TopoDS_Shape loadSTEPFromBuffer(val buffer) {
    std::string data = arrayBufferToString(buffer);
    
    // Create stream from string
    std::istringstream stream(data);
    
    STEPControl_Reader reader;
    IFSelect_ReturnStatus status = reader.ReadStream("step", stream);
    
    if (status != IFSelect_RetDone) {
        return TopoDS_Shape(); // Return null shape on error
    }
    
    // Transfer all roots
    Standard_Integer nbRoots = reader.NbRootsForTransfer();
    if (nbRoots == 0) {
        return TopoDS_Shape();
    }
    
    if (nbRoots == 1) {
        // Single root - return the shape directly
        reader.TransferRoot(1);
        if (reader.NbShapes() > 0) {
            return reader.Shape(1);
        }
    } else {
        // Multiple roots - create a compound
        BRep_Builder builder;
        TopoDS_Compound compound;
        builder.MakeCompound(compound);
        
        bool hasShapes = false;
        for (Standard_Integer i = 1; i <= nbRoots; i++) {
            reader.TransferRoot(i);
            if (reader.NbShapes() > 0) {
                builder.Add(compound, reader.Shape(1));
                hasShapes = true;
            }
        }
        
        if (hasShapes) {
            return compound;
        }
    }
    
    return TopoDS_Shape();
}

// Load STL from ArrayBuffer
TopoDS_Shape loadSTLFromBuffer(val buffer) {
    std::string data = arrayBufferToString(buffer);
    
    // Create stream from string
    std::istringstream stream(data);
    
    StlAPI_Reader reader;
    TopoDS_Shape shape;
    
    // StlAPI_Reader doesn't have a stream-based Read method,
    // so we need to use a workaround with Standard_ArrayStreamBuffer
    // For now, we'll write to a temporary approach
    // Note: This is a simplified implementation
    // In a real scenario, you might need to handle binary STL differently
    
    // Try to read as ASCII STL first
    // For binary STL, we'd need to parse the header and triangles
    
    // Since StlAPI_Reader::Read expects a filename, we need a different approach
    // We'll use RWStl::ReadFile with a memory buffer approach
    // This is a limitation - STL reading from memory may require additional work
    
    // For now, return null shape - this needs to be implemented properly
    // with a custom memory-based STL reader or by using a temporary file approach
    return TopoDS_Shape();
}

// Alternative STL loader using RWStl directly
TopoDS_Shape loadSTLFromBufferAlternative(val buffer) {
    std::string data = arrayBufferToString(buffer);
    std::istringstream stream(data);
    
    // Read STL data from stream
    // This is a simplified version - proper implementation would
    // need to handle both ASCII and binary STL formats
    
    // For now, we'll use a workaround by writing to a stringstream
    // and using the existing OCCT STL reading infrastructure
    
    // Note: This requires additional implementation for proper STL parsing
    return TopoDS_Shape();
}

void registerBindings() {
    // ========== STEPLoader (STEPControl_Reader wrapper) ==========
    class_<STEPControl_Reader>("STEPLoader")
        .constructor<>()
        .function("readFile", 
            optional_override([](STEPControl_Reader& self, const std::string& filename) -> bool {
                IFSelect_ReturnStatus status = self.ReadFile(filename.c_str());
                return status == IFSelect_RetDone;
            }))
        .function("readStream",
            optional_override([](STEPControl_Reader& self, const std::string& name, val buffer) -> bool {
                std::string data = arrayBufferToString(buffer);
                std::istringstream stream(data);
                IFSelect_ReturnStatus status = self.ReadStream(name.c_str(), stream);
                return status == IFSelect_RetDone;
            }))
        .function("transferRoot",
            optional_override([](STEPControl_Reader& self, int rootIndex) -> bool {
                return self.TransferRoot(rootIndex);
            }))
        .function("nbRootsForTransfer", &STEPControl_Reader::NbRootsForTransfer)
        .function("nbShapes", &STEPControl_Reader::NbShapes)
        .function("shape",
            optional_override([](STEPControl_Reader& self, int index) -> TopoDS_Shape {
                if (index >= 1 && index <= self.NbShapes()) {
                    return self.Shape(index);
                }
                return TopoDS_Shape();
            }))
        ;
    
    // ========== STLLoader (StlAPI_Reader wrapper) ==========
    class_<StlAPI_Reader>("STLLoader")
        .constructor<>()
        .function("readFile",
            optional_override([](StlAPI_Reader& self, const std::string& filename, TopoDS_Shape& shape) -> bool {
                return self.Read(shape, filename.c_str());
            }))
        ;
    
    // ========== Static convenience functions ==========
    function("loadSTEP", &loadSTEPFromBuffer);
    function("loadSTL", &loadSTLFromBuffer);
}

} // namespace LoaderBindings

