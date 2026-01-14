#include "GeometryBindings.h"
#include <BRepPrimAPI_MakeBox.hxx>
#include <BRepPrimAPI_MakeSphere.hxx>
#include <BRepPrimAPI_MakeCylinder.hxx>
#include <BRepPrimAPI_MakeCone.hxx>
#include <BRepPrimAPI_MakeTorus.hxx>
#include <BRepBuilderAPI_Command.hxx>
#include <BRepBuilderAPI_MakeShape.hxx>
#include <gp_Pnt.hxx>
#include <gp_Ax2.hxx>
#include <gp_Ax1.hxx>
#include <gp_Dir.hxx>
#include <TopoDS_Shape.hxx>
#include <emscripten/bind.h>

using namespace emscripten;

namespace GeometryBindings {

// Helper function to get Shape from BRepPrimAPI makers
// Note: Shape() is non-const, so we use a lambda wrapper in each binding

void registerBindings() {
    // ========== Base classes (must be registered first) ==========
    // Register BRepBuilderAPI_Command base class
    class_<BRepBuilderAPI_Command>("BRepBuilderAPI_Command")
        .function("isDone", &BRepBuilderAPI_Command::IsDone)
        ;
    
    // Register BRepBuilderAPI_MakeShape intermediate base class
    class_<BRepBuilderAPI_MakeShape, base<BRepBuilderAPI_Command>>("BRepBuilderAPI_MakeShape")
        .function("shape", optional_override([](BRepBuilderAPI_MakeShape& self) -> TopoDS_Shape {
            return self.Shape();
        }))
        ;
    // ========== Box (BRepPrimAPI_MakeBox) ==========
    class_<BRepPrimAPI_MakeBox, base<BRepBuilderAPI_MakeShape>>("BRepPrimAPI_MakeBox")
        .constructor<>()
        .constructor<double, double, double>()
        .constructor<const gp_Pnt&, double, double, double>()
        .constructor<const gp_Pnt&, const gp_Pnt&>()
        .constructor<const gp_Ax2&, double, double, double>()
        .function("init", select_overload<void(double, double, double)>(&BRepPrimAPI_MakeBox::Init))
        .function("initWithPoint", select_overload<void(const gp_Pnt&, double, double, double)>(&BRepPrimAPI_MakeBox::Init))
        .function("initWithPoints", select_overload<void(const gp_Pnt&, const gp_Pnt&)>(&BRepPrimAPI_MakeBox::Init))
        .function("initWithAxes", select_overload<void(const gp_Ax2&, double, double, double)>(&BRepPrimAPI_MakeBox::Init))
        .function("shape", optional_override([](BRepPrimAPI_MakeBox& self) -> TopoDS_Shape {
            return self.Shape();
        }))
        .function("isDone", &BRepPrimAPI_MakeBox::IsDone)
        ;

    // ========== Sphere (BRepPrimAPI_MakeSphere) ==========
    // Note: BRepPrimAPI_MakeSphere has no Init methods, only constructors
    class_<BRepPrimAPI_MakeSphere, base<BRepBuilderAPI_MakeShape>>("BRepPrimAPI_MakeSphere")
        .constructor<double>()
        .constructor<const gp_Pnt&, double>()
        .constructor<const gp_Ax2&, double>()
        .constructor<double, double>()
        .constructor<const gp_Pnt&, double, double>()
        .constructor<const gp_Ax2&, double, double>()
        .constructor<double, double, double>()
        .constructor<const gp_Pnt&, double, double, double>()
        .constructor<const gp_Ax2&, double, double, double>()
        .function("shape", optional_override([](BRepPrimAPI_MakeSphere& self) -> TopoDS_Shape {
            return self.Shape();
        }))
        .function("isDone", &BRepPrimAPI_MakeSphere::IsDone)
        ;

    // ========== Cylinder (BRepPrimAPI_MakeCylinder) ==========
    // Note: BRepPrimAPI_MakeCylinder has no Init methods, only constructors
    class_<BRepPrimAPI_MakeCylinder, base<BRepBuilderAPI_MakeShape>>("BRepPrimAPI_MakeCylinder")
        .constructor<double, double>()
        .constructor<const gp_Ax2&, double, double>()
        .constructor<double, double, double>()
        .constructor<const gp_Ax2&, double, double, double>()
        .function("shape", optional_override([](BRepPrimAPI_MakeCylinder& self) -> TopoDS_Shape {
            return self.Shape();
        }))
        .function("isDone", &BRepPrimAPI_MakeCylinder::IsDone)
        ;

    // ========== Cone (BRepPrimAPI_MakeCone) ==========
    // Note: BRepPrimAPI_MakeCone has no Init methods, only constructors
    class_<BRepPrimAPI_MakeCone, base<BRepBuilderAPI_MakeShape>>("BRepPrimAPI_MakeCone")
        .constructor<double, double, double>()
        .constructor<const gp_Ax2&, double, double, double>()
        .constructor<double, double, double, double>()
        .constructor<const gp_Ax2&, double, double, double, double>()
        .function("shape", optional_override([](BRepPrimAPI_MakeCone& self) -> TopoDS_Shape {
            return self.Shape();
        }))
        .function("isDone", &BRepPrimAPI_MakeCone::IsDone)
        ;

    // ========== Torus (BRepPrimAPI_MakeTorus) ==========
    // Note: BRepPrimAPI_MakeTorus has no Init methods, only constructors
    class_<BRepPrimAPI_MakeTorus, base<BRepBuilderAPI_MakeShape>>("BRepPrimAPI_MakeTorus")
        .constructor<double, double>()
        .constructor<const gp_Ax2&, double, double>()
        .constructor<double, double, double>()
        .constructor<const gp_Ax2&, double, double, double>()
        .function("shape", optional_override([](BRepPrimAPI_MakeTorus& self) -> TopoDS_Shape {
            return self.Shape();
        }))
        .function("isDone", &BRepPrimAPI_MakeTorus::IsDone)
        ;
}

} // namespace GeometryBindings

