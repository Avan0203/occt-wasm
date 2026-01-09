#include "MathBindings.h"
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <gp_XYZ.hxx>
#include <gp_Trsf.hxx>
#include <gp_Ax1.hxx>
#include <gp_Ax2.hxx>
#include <gp_Mat.hxx>
#include <gp_Dir.hxx>
#include <gp_Ax3.hxx>
#include <emscripten/bind.h>

using namespace emscripten;

namespace MathBindings {

// Helper function to convert array to gp_XYZ
gp_XYZ arrayToXYZ(const val& arr) {
    if (arr.isArray() && arr["length"].as<int>() >= 3) {
        return gp_XYZ(arr[0].as<double>(), arr[1].as<double>(), arr[2].as<double>());
    }
    return gp_XYZ(0, 0, 0);
}

// Helper function to convert gp_XYZ to array
val xyzToArray(const gp_XYZ& xyz) {
    val result = val::array();
    result.call<void>("push", xyz.X());
    result.call<void>("push", xyz.Y());
    result.call<void>("push", xyz.Z());
    return result;
}

void registerBindings() {
    // ========== Point3 (gp_Pnt) ==========
    class_<gp_Pnt>("Point3")
        .constructor<>()
        .constructor<double, double, double>()
        .constructor<const gp_XYZ&>()
        .function("x", &gp_Pnt::X)
        .function("y", &gp_Pnt::Y)
        .function("z", &gp_Pnt::Z)
        .function("setX", &gp_Pnt::SetX)
        .function("setY", &gp_Pnt::SetY)
        .function("setZ", &gp_Pnt::SetZ)
        .function("setCoord", select_overload<void(double, double, double)>(&gp_Pnt::SetCoord))
        .function("coord", select_overload<double(int) const>(&gp_Pnt::Coord))
        .function("distance", &gp_Pnt::Distance)
        .function("squareDistance", &gp_Pnt::SquareDistance)
        .function("transform", &gp_Pnt::Transform)
        .function("transformed", &gp_Pnt::Transformed)
        .function("isEqual", &gp_Pnt::IsEqual)
        ;

    // ========== Vector3 (gp_Vec) ==========
    class_<gp_Vec>("Vector3")
        .constructor<>()
        .constructor<double, double, double>()
        .constructor<const gp_XYZ&>()
        .constructor<const gp_Pnt&, const gp_Pnt&>()
        .function("x", &gp_Vec::X)
        .function("y", &gp_Vec::Y)
        .function("z", &gp_Vec::Z)
        .function("setX", &gp_Vec::SetX)
        .function("setY", &gp_Vec::SetY)
        .function("setZ", &gp_Vec::SetZ)
        .function("setCoord", select_overload<void(double, double, double)>(&gp_Vec::SetCoord))
        .function("coord", select_overload<double(int) const>(&gp_Vec::Coord))
        .function("magnitude", &gp_Vec::Magnitude)
        .function("squareMagnitude", &gp_Vec::SquareMagnitude)
        .function("normalize", &gp_Vec::Normalize)
        .function("normalized", &gp_Vec::Normalized)
        .function("reverse", &gp_Vec::Reverse)
        .function("reversed", &gp_Vec::Reversed)
        .function("scale", &gp_Vec::Scale)
        .function("scaled", &gp_Vec::Scaled)
        .function("add", select_overload<gp_Vec(const gp_Vec&) const>(&gp_Vec::Added))
        .function("subtract", select_overload<gp_Vec(const gp_Vec&) const>(&gp_Vec::Subtracted))
        .function("multiply", select_overload<gp_Vec(double) const>(&gp_Vec::Multiplied))
        .function("dot", &gp_Vec::Dot)
        .function("cross", &gp_Vec::Crossed)
        .function("crossMagnitude", &gp_Vec::CrossMagnitude)
        .function("crossSquareMagnitude", &gp_Vec::CrossSquareMagnitude)
        .function("transform", &gp_Vec::Transform)
        .function("transformed", &gp_Vec::Transformed)
        ;

    // ========== XYZ (gp_XYZ) ==========
    class_<gp_XYZ>("XYZ")
        .constructor<>()
        .constructor<double, double, double>()
        .function("x", &gp_XYZ::X)
        .function("y", &gp_XYZ::Y)
        .function("z", &gp_XYZ::Z)
        .function("setX", &gp_XYZ::SetX)
        .function("setY", &gp_XYZ::SetY)
        .function("setZ", &gp_XYZ::SetZ)
        .function("setCoord", select_overload<void(double, double, double)>(&gp_XYZ::SetCoord))
        .function("coord", select_overload<double(int) const>(&gp_XYZ::Coord))
        .function("modulus", &gp_XYZ::Modulus)
        .function("squareModulus", &gp_XYZ::SquareModulus)
        .function("normalize", &gp_XYZ::Normalize)
        .function("normalized", &gp_XYZ::Normalized)
        .function("reverse", &gp_XYZ::Reverse)
        .function("reversed", &gp_XYZ::Reversed)
        .function("add", &gp_XYZ::Add)
        .function("subtract", &gp_XYZ::Subtract)
        .function("multiply", select_overload<void(double)>(&gp_XYZ::Multiply))
        .function("divide", &gp_XYZ::Divide)
        .function("cross", &gp_XYZ::Cross)
        .function("dot", &gp_XYZ::Dot)
        ;

    // ========== Matrix4 (gp_Trsf) ==========
    class_<gp_Trsf>("Matrix4")
        .constructor<>()
        .function("setTranslation", 
            optional_override([](gp_Trsf& self, const gp_Vec& vec) {
                gp_Trsf trans;
                trans.SetTranslationPart(vec);
                self = trans;
            }))
        .function("setRotation", 
            optional_override([](gp_Trsf& self, const gp_Ax1& axis, double angle) {
                self.SetRotation(axis, angle);
            }))
        .function("setScale", &gp_Trsf::SetScaleFactor)
        .function("setMirror", select_overload<void(const gp_Pnt&)>(&gp_Trsf::SetMirror))
        .function("setMirrorAxis", select_overload<void(const gp_Ax1&)>(&gp_Trsf::SetMirror))
        .function("setMirrorPlane", select_overload<void(const gp_Ax2&)>(&gp_Trsf::SetMirror))
        .function("setTransformation",
            optional_override([](gp_Trsf& self, const gp_Ax3& from, const gp_Ax3& to) {
                self.SetTransformation(from, to);
            }))
        .function("translationPart", &gp_Trsf::TranslationPart)
        .function("vectorialPart", &gp_Trsf::VectorialPart)
        .function("scaleFactor", &gp_Trsf::ScaleFactor)
        .function("form", &gp_Trsf::Form)
        .function("isNegative", &gp_Trsf::IsNegative)
        .function("multiply", &gp_Trsf::Multiply)
        .function("multiplied", &gp_Trsf::Multiplied)
        .function("invert", &gp_Trsf::Invert)
        .function("inverted", &gp_Trsf::Inverted)
        .function("power", &gp_Trsf::Power)
        .function("powered", &gp_Trsf::Powered)
        ;

    // ========== Axis1 (gp_Ax1) ==========
    class_<gp_Ax1>("Axis1")
        .constructor<>()
        .constructor<const gp_Pnt&, const gp_Dir&>()
        .function("location", &gp_Ax1::Location)
        .function("direction", &gp_Ax1::Direction)
        .function("setLocation", &gp_Ax1::SetLocation)
        .function("setDirection", &gp_Ax1::SetDirection)
        .function("reverse", &gp_Ax1::Reverse)
        .function("reversed", &gp_Ax1::Reversed)
        .function("transform", &gp_Ax1::Transform)
        .function("transformed", &gp_Ax1::Transformed)
        ;

    // ========== Axis2 (gp_Ax2) ==========
    class_<gp_Ax2>("Axis2")
        .constructor<>()
        .constructor<const gp_Pnt&, const gp_Dir&>()
        .constructor<const gp_Pnt&, const gp_Dir&, const gp_Dir&>()
        .function("location", &gp_Ax2::Location)
        .function("direction", &gp_Ax2::Direction)
        .function("xDirection", &gp_Ax2::XDirection)
        .function("yDirection", &gp_Ax2::YDirection)
        .function("setLocation", &gp_Ax2::SetLocation)
        .function("setDirection", &gp_Ax2::SetDirection)
        .function("setXDirection", &gp_Ax2::SetXDirection)
        .function("setYDirection", &gp_Ax2::SetYDirection)
        .function("transform", &gp_Ax2::Transform)
        .function("transformed", &gp_Ax2::Transformed)
        ;

    // ========== Matrix3 (gp_Mat) ==========
    class_<gp_Mat>("Matrix3")
        .constructor<>()
        .constructor<const gp_XYZ&, const gp_XYZ&, const gp_XYZ&>()
        .function("setValue", &gp_Mat::SetValue)
        .function("value", &gp_Mat::Value)
        .function("row", &gp_Mat::Row)
        .function("column", &gp_Mat::Column)
        .function("setRow", &gp_Mat::SetRow)
        .function("determinant", &gp_Mat::Determinant)
        .function("invert", &gp_Mat::Invert)
        .function("inverted", &gp_Mat::Inverted)
        .function("multiply",
            optional_override([](gp_Mat& self, const gp_Mat& other) {
                self.Multiply(other);
            }))
        .function("multiplied",
            optional_override([](const gp_Mat& self, const gp_Mat& other) -> gp_Mat {
                return self.Multiplied(other);
            }))
        .function("add", &gp_Mat::Add)
        .function("added", &gp_Mat::Added)
        .function("subtract", &gp_Mat::Subtract)
        .function("subtracted", &gp_Mat::Subtracted)
        .function("transpose", &gp_Mat::Transpose)
        .function("transposed", &gp_Mat::Transposed)
        .function("setCol", 
            optional_override([](gp_Mat& self, int col, const gp_XYZ& value) {
                self.SetCol(col, value);
            }))
        ;

    // ========== Dir (gp_Dir) - helper for Axis ==========
    class_<gp_Dir>("Dir")
        .constructor<>()
        .constructor<double, double, double>()
        .constructor<const gp_XYZ&>()
        .function("x", &gp_Dir::X)
        .function("y", &gp_Dir::Y)
        .function("z", &gp_Dir::Z)
        .function("setX", &gp_Dir::SetX)
        .function("setY", &gp_Dir::SetY)
        .function("setZ", &gp_Dir::SetZ)
        .function("reverse", &gp_Dir::Reverse)
        .function("reversed", &gp_Dir::Reversed)
        .function("transform", &gp_Dir::Transform)
        .function("transformed", &gp_Dir::Transformed)
        ;
}

} // namespace MathBindings

