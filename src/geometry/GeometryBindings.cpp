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
        .constructor<double, double, double>()
        .function("shape", optional_override([](BRepPrimAPI_MakeBox& self) -> TopoDS_Shape {
            return self.Shape();
        }))
        .function("isDone", &BRepPrimAPI_MakeBox::IsDone)
        .class_function("createWithPoint", optional_override([](const gp_Pnt& p, double dx, double dy, double dz) {
            BRepPrimAPI_MakeBox box(p, dx, dy, dz);
            box.Build();
            return box;
        }))
        .class_function("createWithPoints", optional_override([](const gp_Pnt& p1, const gp_Pnt& p2) {
            BRepPrimAPI_MakeBox box(p1, p2);
            box.Build();
            return box;
        }))
        .class_function("createWithAxes", optional_override([](const gp_Ax2& ax2, double dx, double dy, double dz) {
            BRepPrimAPI_MakeBox box(ax2, dx, dy, dz);
            box.Build();
            return box;
        }));

    // ========== Sphere (BRepPrimAPI_MakeSphere) ==========
    class_<BRepPrimAPI_MakeSphere, base<BRepBuilderAPI_MakeShape>>("BRepPrimAPI_MakeSphere")
        .constructor<double>()
        .function("shape", optional_override([](BRepPrimAPI_MakeSphere& self) -> TopoDS_Shape {
            return self.Shape();
        }))
        .function("isDone", &BRepPrimAPI_MakeSphere::IsDone)
        .class_function("createWithPoint", optional_override([](const gp_Pnt& center, double radius) {
            BRepPrimAPI_MakeSphere sphere(center, radius);
            sphere.Build();
            return sphere;
        }))
        .class_function("createWithAxes", optional_override([](const gp_Ax2& ax2, double radius) {
            BRepPrimAPI_MakeSphere sphere(ax2, radius);
            sphere.Build();
            return sphere;
        }))
        .class_function("createWithRadiusAndAngle", optional_override([](double radius, double angle) {
            BRepPrimAPI_MakeSphere sphere(radius, angle);
            sphere.Build();
            return sphere;
        }))
        .class_function("createWithPointAndAngle", optional_override([](const gp_Pnt& center, double radius, double angle) {
            BRepPrimAPI_MakeSphere sphere(center, radius, angle);
            sphere.Build();
            return sphere;
        }))
        .class_function("createWithAxesAndAngle", optional_override([](const gp_Ax2& ax2, double radius, double angle) {
            BRepPrimAPI_MakeSphere sphere(ax2, radius, angle);
            sphere.Build();
            return sphere;
        }));

    // ========== Cylinder (BRepPrimAPI_MakeCylinder) ==========
    class_<BRepPrimAPI_MakeCylinder, base<BRepBuilderAPI_MakeShape>>("BRepPrimAPI_MakeCylinder")
    .constructor<double, double>()
    .function("shape", optional_override([](BRepPrimAPI_MakeCylinder& self) -> TopoDS_Shape {
        return self.Shape();
    }))
    .function("isDone", &BRepPrimAPI_MakeCylinder::IsDone)
    .class_function("createWithAxes", optional_override([](const gp_Ax2& ax2, double radius, double height) {
        BRepPrimAPI_MakeCylinder cyl(ax2, radius, height);
        cyl.Build();
        return cyl;
    }))
    .class_function("createWithRadiusHeightAndAngle", optional_override([](double radius, double height, double angle) {
        BRepPrimAPI_MakeCylinder cyl(radius, height, angle);
        cyl.Build();
        return cyl;
    }))
    .class_function("createWithAxesAndAngle", optional_override([](const gp_Ax2& ax2, double radius, double height, double angle) {
        BRepPrimAPI_MakeCylinder cyl(ax2, radius, height, angle);
        cyl.Build();
        return cyl;
    }));

    // ========== Cone (BRepPrimAPI_MakeCone) ==========
    class_<BRepPrimAPI_MakeCone, base<BRepBuilderAPI_MakeShape>>("BRepPrimAPI_MakeCone")
    .constructor<double, double, double>()
    .function("shape", optional_override([](BRepPrimAPI_MakeCone& self) -> TopoDS_Shape {
        return self.Shape();
    }))
    .function("isDone", &BRepPrimAPI_MakeCone::IsDone)
    .class_function("createWithAxes", optional_override([](const gp_Ax2& ax2, double radius1, double radius2, double height) {
        BRepPrimAPI_MakeCone cone(ax2, radius1, radius2, height);
        cone.Build();
        return cone;
    }))
    .class_function("createWithAngle", optional_override([](double radius1, double radius2, double height, double angle) {
        BRepPrimAPI_MakeCone cone(radius1, radius2, height, angle);
        cone.Build();
        return cone;
    }))
    .class_function("createWithAxesAndAngle", optional_override([](const gp_Ax2& ax2, double radius1, double radius2, double height, double angle) {
        BRepPrimAPI_MakeCone cone(ax2, radius1, radius2, height, angle);
        cone.Build();
        return cone;
    }));

    // ========== Torus (BRepPrimAPI_MakeTorus) ==========
    class_<BRepPrimAPI_MakeTorus, base<BRepBuilderAPI_MakeShape>>("BRepPrimAPI_MakeTorus")
    .constructor<double, double>()
    .function("shape", optional_override([](BRepPrimAPI_MakeTorus& self) -> TopoDS_Shape {
        return self.Shape();
    }))
    .function("isDone", &BRepPrimAPI_MakeTorus::IsDone)
    .class_function("createWithAxes", optional_override([](const gp_Ax2& ax2, double R1, double R2) {
        BRepPrimAPI_MakeTorus torus(ax2, R1, R2);
        torus.Build();
        return torus;
    }))
    .class_function("createWithAngle", optional_override([](double R1, double R2, double angle) {
        BRepPrimAPI_MakeTorus torus(R1, R2, angle);
        torus.Build();
        return torus;
    }))
    .class_function("createWithAxesAndAngle", optional_override([](const gp_Ax2& ax2, double R1, double R2, double angle) {
        BRepPrimAPI_MakeTorus torus(ax2, R1, R2, angle);
        torus.Build();
        return torus;
    }));
}

} // namespace GeometryBindings

