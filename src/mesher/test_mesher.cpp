#include "Mesher.h"
#include <BRepPrimAPI_MakeBox.hxx>
#include <BRepPrimAPI_MakeCylinder.hxx>
#include <iostream>
#include <iomanip>

// Helper function to print BRepResult
void printBRepResult(const BRepResult& result) {
    std::cout << "========== BRepResult ==========" << std::endl;
    
    std::cout << "\n--- Vertices (" << result.vertices.size() << ") ---" << std::endl;
    for (size_t i = 0; i < result.vertices.size(); ++i) {
        const auto& v = result.vertices[i];
        std::cout << "  [" << i << "] hash: " << v.hash 
                  << ", value: [" << std::fixed << std::setprecision(3)
                  << v.value[0] << ", " << v.value[1] << ", " << v.value[2] << "]"
                  << ", isBRep: " << (v.isBRep ? "true" : "false")
                  << ", shape: " << (v.shape.IsNull() ? "null" : "TopoDS_Vertex") << std::endl;
    }
    
    std::cout << "\n--- Edges (" << result.edges.size() << ") ---" << std::endl;
    for (size_t i = 0; i < result.edges.size(); ++i) {
        const auto& e = result.edges[i];
        std::cout << "  [" << i << "] hash: " << e.hash 
                  << ", type: " << static_cast<int>(e.type)
                  << ", start: " << e.start << ", end: " << e.end
                  << ", polyline size: " << e.value.size()
                  << ", shape: " << (e.shape.IsNull() ? "null" : "TopoDS_Edge") << std::endl;
        if (e.value.size() <= 10) {
            std::cout << "    polyline: ";
            for (const auto& vh : e.value) {
                std::cout << vh << " ";
            }
            std::cout << std::endl;
        }
    }
    
    std::cout << "\n--- Wires (" << result.wires.size() << ") ---" << std::endl;
    for (size_t i = 0; i < result.wires.size(); ++i) {
        const auto& w = result.wires[i];
        std::cout << "  [" << i << "] hash: " << w.hash 
                  << ", edges (" << w.value.size() << "): ";
        for (const auto& eh : w.value) {
            std::cout << eh << " ";
        }
        std::cout << ", shape: " << (w.shape.IsNull() ? "null" : "TopoDS_Wire") << std::endl;
    }
    
    std::cout << "\n--- Faces (" << result.faces.size() << ") ---" << std::endl;
    for (size_t i = 0; i < result.faces.size(); ++i) {
        const auto& f = result.faces[i];
        std::cout << "  [" << i << "] hash: " << f.hash 
                  << ", shape: " << (f.shape.IsNull() ? "null" : "TopoDS_Face") << std::endl;
        std::cout << "    path (" << f.path.size() << "): ";
        for (const auto& wh : f.path) {
            std::cout << wh << " ";
        }
        std::cout << std::endl;
        std::cout << "    holes (" << f.holes.size() << "): ";
        for (const auto& wh : f.holes) {
            std::cout << wh << " ";
        }
        std::cout << std::endl;
    }
    
    std::cout << "\n========== Summary ==========" << std::endl;
    std::cout << "Total vertices: " << result.vertices.size() << std::endl;
    std::cout << "Total edges: " << result.edges.size() << std::endl;
    std::cout << "Total wires: " << result.wires.size() << std::endl;
    std::cout << "Total faces: " << result.faces.size() << std::endl;
}

int main() {
    std::cout << "Testing shapeToBRepResult function..." << std::endl;
    std::cout << "=====================================" << std::endl;
    
    // Test 1: Box
    std::cout << "\n[Test 1] Creating a Box (10x20x30)..." << std::endl;
    TopoDS_Shape box = BRepPrimAPI_MakeBox(10.0, 20.0, 30.0).Shape();
    
    BRepResult boxResult = Mesher::shapeToBRepResult(box, 0.1, 0.5);
    printBRepResult(boxResult);
    
    // Test 2: Cylinder
    std::cout << "\n\n[Test 2] Creating a Cylinder (radius=5, height=20)..." << std::endl;
    TopoDS_Shape cylinder = BRepPrimAPI_MakeCylinder(5.0, 20.0).Shape();
    
    BRepResult cylinderResult = Mesher::shapeToBRepResult(cylinder, 0.1, 0.5);
    printBRepResult(cylinderResult);
    
    // Test 3: Box with different deflection
    std::cout << "\n\n[Test 3] Box with finer discretization (deflection=0.01)..." << std::endl;
    BRepResult boxResultFine = Mesher::shapeToBRepResult(box, 0.01, 0.1);
    std::cout << "Vertices: " << boxResultFine.vertices.size() 
              << " (coarse: " << boxResult.vertices.size() << ")" << std::endl;
    std::cout << "Edges: " << boxResultFine.edges.size() << std::endl;
    
    std::cout << "\nAll tests completed!" << std::endl;
    return 0;
}
