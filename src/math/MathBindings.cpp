#include "MathBindings.h"
#include <emscripten/bind.h>
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>
#include <gp_XYZ.hxx>
#include <gp_Trsf.hxx>
#include <gp_TrsfForm.hxx>
#include <gp_Ax1.hxx>
#include <gp_Ax2.hxx>
#include <gp_Mat.hxx>
#include <gp_Dir.hxx>
#include <gp_Ax3.hxx>
#include <gp_Quaternion.hxx>
#include <gp_EulerSequence.hxx>
#include <gp_Lin.hxx>
#include <gp_Circ.hxx>
#include <gp_Pln.hxx>

using namespace emscripten;

namespace MathBindings {

void registerBindings() {
    // ========== Point3 (gp_Pnt) ==========
    class_<gp_Pnt>("gp_Pnt")
        .constructor<>()
        .constructor<double, double, double>()
        .constructor<const gp_XYZ&>()
        .function("x", &gp_Pnt::X)
        .function("y", &gp_Pnt::Y)
        .function("z", &gp_Pnt::Z)
        .function("setX", &gp_Pnt::SetX)
        .function("setY", &gp_Pnt::SetY)
        .function("setZ", &gp_Pnt::SetZ)
        .function("setXYZ", select_overload<void(const gp_XYZ&)>(&gp_Pnt::SetXYZ))
        .function("setCoord", select_overload<void(double, double, double)>(&gp_Pnt::SetCoord))
        .function("coord", select_overload<double(int) const>(&gp_Pnt::Coord))
        .function("distance", &gp_Pnt::Distance)
        .function("squareDistance", &gp_Pnt::SquareDistance)
        .function("transform", &gp_Pnt::Transform)
        .function("transformed", &gp_Pnt::Transformed)
        .function("isEqual", &gp_Pnt::IsEqual)
        ;

    // ========== Vector3 (gp_Vec) ==========
    class_<gp_Vec>("gp_Vec")
        .constructor<>()
        .constructor<double, double, double>()
        .function("x", &gp_Vec::X)
        .function("y", &gp_Vec::Y)
        .function("z", &gp_Vec::Z)
        .function("setX", &gp_Vec::SetX)
        .function("setY", &gp_Vec::SetY)
        .function("setZ", &gp_Vec::SetZ)
        .function("setXYZ", select_overload<void(const gp_XYZ&)>(&gp_Vec::SetXYZ))
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
    class_<gp_XYZ>("gp_XYZ")
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
    class_<gp_Trsf>("gp_Trsf")
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
    class_<gp_Ax1>("gp_Ax1")
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
    class_<gp_Ax2>("gp_Ax2")
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

    // ========== Axis3 (gp_Ax3) ==========
    class_<gp_Ax3>("gp_Ax3")
        .constructor<>()
        .constructor<const gp_Ax2&>()
        .constructor<const gp_Pnt&, const gp_Dir&>()
        .constructor<const gp_Pnt&, const gp_Dir&, const gp_Dir&>()
        .function("location", &gp_Ax3::Location)
        .function("direction", &gp_Ax3::Direction)
        .function("xDirection", &gp_Ax3::XDirection)
        .function("yDirection", &gp_Ax3::YDirection)
        .function("setLocation", &gp_Ax3::SetLocation)
        .function("setDirection", &gp_Ax3::SetDirection)
        .function("setXDirection", &gp_Ax3::SetXDirection)
        .function("setYDirection", &gp_Ax3::SetYDirection)
        .function("transform", &gp_Ax3::Transform)
        .function("transformed", &gp_Ax3::Transformed)
        ;

    // ========== Quaternion (gp_Quaternion) ==========
    class_<gp_Quaternion>("gp_Quaternion")
        .constructor<>()
        .constructor<double, double, double, double>()
        .constructor<const gp_Vec&, const gp_Vec&>()
        .constructor<const gp_Vec&, const gp_Vec&, const gp_Vec&>()
        .constructor<const gp_Mat&>()
        .function("set", select_overload<void(double, double, double, double)>(&gp_Quaternion::Set))
        .function("set", select_overload<void(const gp_Quaternion&)>(&gp_Quaternion::Set))
        .function("x", &gp_Quaternion::X)
        .function("y", &gp_Quaternion::Y)
        .function("z", &gp_Quaternion::Z)
        .function("w", &gp_Quaternion::W)
        .function("setIdent", &gp_Quaternion::SetIdent)
        .function("isEqual", &gp_Quaternion::IsEqual)
        // SetRotation overloads
        .function("setRotation", select_overload<void(const gp_Vec&, const gp_Vec&)>(&gp_Quaternion::SetRotation))
        .function("setRotationWithHelp", select_overload<void(const gp_Vec&, const gp_Vec&, const gp_Vec&)>(&gp_Quaternion::SetRotation))
        // Vector and Angle
        .function("setVectorAndAngle", &gp_Quaternion::SetVectorAndAngle)
        .function("getVectorAndAngle",
            optional_override([](const gp_Quaternion& self) -> val {
                gp_Vec axis;
                double angle;
                self.GetVectorAndAngle(axis, angle);
                val result = val::object();
                result.set("axis", axis);
                result.set("angle", angle);
                return result;
            }))
        // Euler Angles
        .function("setEulerAngles", &gp_Quaternion::SetEulerAngles)
        .function("getEulerAngles",
            optional_override([](const gp_Quaternion& self, gp_EulerSequence order) -> val {
                double alpha, beta, gamma;
                self.GetEulerAngles(order, alpha, beta, gamma);
                val result = val::array();
                result.call<void>("push", alpha);
                result.call<void>("push", beta);
                result.call<void>("push", gamma);
                return result;
            }))
        // Matrix conversion
        .function("setMatrix", &gp_Quaternion::SetMatrix)
        .function("getMatrix", &gp_Quaternion::GetMatrix)
        // Normalization
        .function("normalize", &gp_Quaternion::Normalize)
        .function("normalized", &gp_Quaternion::Normalized)
        .function("stabilizeLength", &gp_Quaternion::StabilizeLength)
        // Reverse/Conjugate
        .function("reverse", &gp_Quaternion::Reverse)
        .function("reversed", &gp_Quaternion::Reversed)
        // Invert
        .function("invert", &gp_Quaternion::Invert)
        .function("inverted", &gp_Quaternion::Inverted)
        // Norm
        .function("norm", &gp_Quaternion::Norm)
        .function("squareNorm", &gp_Quaternion::SquareNorm)
        // Scale
        .function("scale", &gp_Quaternion::Scale)
        .function("scaled", &gp_Quaternion::Scaled)
        // Arithmetic operations
        .function("add", &gp_Quaternion::Add)
        .function("added", &gp_Quaternion::Added)
        .function("subtract", &gp_Quaternion::Subtract)
        .function("subtracted", &gp_Quaternion::Subtracted)
        .function("multiply", select_overload<void(const gp_Quaternion&)>(&gp_Quaternion::Multiply))
        .function("multiplied", &gp_Quaternion::Multiplied)
        .function("multiplyVector", select_overload<gp_Vec(const gp_Vec&) const>(&gp_Quaternion::Multiply))
        // Dot product
        .function("dot", &gp_Quaternion::Dot)
        // Rotation angle
        .function("getRotationAngle", &gp_Quaternion::GetRotationAngle)
        // Negate
        .function("negated", &gp_Quaternion::Negated)
        ;

    // ========== Matrix3 (gp_Mat) ==========
    class_<gp_Mat>("gp_Mat")
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
    class_<gp_Dir>("gp_Dir")
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

    // ========== TrsfForm (gp_TrsfForm) ==========
    enum_<gp_TrsfForm>("gp_TrsfForm")
        .value("gp_Identity", gp_Identity)
        .value("gp_Rotation", gp_Rotation)
        .value("gp_Translation", gp_Translation)
        .value("gp_PntMirror", gp_PntMirror)
        .value("gp_Ax1Mirror", gp_Ax1Mirror)
        .value("gp_Ax2Mirror", gp_Ax2Mirror)
        .value("gp_Scale", gp_Scale)
        .value("gp_CompoundTrsf", gp_CompoundTrsf)
        .value("gp_Other", gp_Other)
        ;

    // ========== EulerSequence (gp_EulerSequence) ==========
    enum_<gp_EulerSequence>("gp_EulerSequence")
        .value("gp_EulerAngles", gp_EulerAngles)
        .value("gp_YawPitchRoll", gp_YawPitchRoll)
        .value("gp_Extrinsic_XYZ", gp_Extrinsic_XYZ)
        .value("gp_Extrinsic_XZY", gp_Extrinsic_XZY)
        .value("gp_Extrinsic_YZX", gp_Extrinsic_YZX)
        .value("gp_Extrinsic_YXZ", gp_Extrinsic_YXZ)
        .value("gp_Extrinsic_ZXY", gp_Extrinsic_ZXY)
        .value("gp_Extrinsic_ZYX", gp_Extrinsic_ZYX)
        .value("gp_Intrinsic_XYZ", gp_Intrinsic_XYZ)
        .value("gp_Intrinsic_XZY", gp_Intrinsic_XZY)
        .value("gp_Intrinsic_YZX", gp_Intrinsic_YZX)
        .value("gp_Intrinsic_YXZ", gp_Intrinsic_YXZ)
        .value("gp_Intrinsic_ZXY", gp_Intrinsic_ZXY)
        .value("gp_Intrinsic_ZYX", gp_Intrinsic_ZYX)
        .value("gp_Extrinsic_XYX", gp_Extrinsic_XYX)
        .value("gp_Extrinsic_XZX", gp_Extrinsic_XZX)
        .value("gp_Extrinsic_YZY", gp_Extrinsic_YZY)
        .value("gp_Extrinsic_YXY", gp_Extrinsic_YXY)
        .value("gp_Extrinsic_ZXZ", gp_Extrinsic_ZXZ)
        .value("gp_Extrinsic_ZYZ", gp_Extrinsic_ZYZ)
        .value("gp_Intrinsic_XYX", gp_Intrinsic_XYX)
        .value("gp_Intrinsic_XZX", gp_Intrinsic_XZX)
        .value("gp_Intrinsic_YZY", gp_Intrinsic_YZY)
        .value("gp_Intrinsic_YXY", gp_Intrinsic_YXY)
        .value("gp_Intrinsic_ZXZ", gp_Intrinsic_ZXZ)
        .value("gp_Intrinsic_ZYZ", gp_Intrinsic_ZYZ)
        ;

    // ========== Line (gp_Lin) ==========
    class_<gp_Lin>("gp_Lin")
        .constructor<>()
        .constructor<const gp_Ax1&>()
        .constructor<const gp_Pnt&, const gp_Dir&>()
        .function("location", &gp_Lin::Location)
        .function("direction", &gp_Lin::Direction)
        .function("setLocation", &gp_Lin::SetLocation)
        .function("setDirection", &gp_Lin::SetDirection)
        .function("reverse", &gp_Lin::Reverse)
        .function("reversed", &gp_Lin::Reversed)
        .function("transform", &gp_Lin::Transform)
        .function("transformed", &gp_Lin::Transformed)
        ;

    // ========== Circle (gp_Circ) ==========
    class_<gp_Circ>("gp_Circ")
        .constructor<>()
        .constructor<const gp_Ax2&, double>()
        .function("location", &gp_Circ::Location)
        .function("axis", &gp_Circ::Axis)
        .function("xAxis", &gp_Circ::XAxis)
        .function("yAxis", &gp_Circ::YAxis)
        .function("position", &gp_Circ::Position)
        .function("radius", &gp_Circ::Radius)
        .function("setAxis", &gp_Circ::SetAxis)
        .function("setLocation", &gp_Circ::SetLocation)
        .function("setPosition", &gp_Circ::SetPosition)
        .function("setRadius", &gp_Circ::SetRadius)
        .function("transform", &gp_Circ::Transform)
        .function("transformed", &gp_Circ::Transformed)
        ;

    // ========== Plane (gp_Pln) ==========
    class_<gp_Pln>("gp_Pln")
        .constructor<>()
        .constructor<const gp_Ax3&>()
        .constructor<const gp_Pnt&, const gp_Dir&>()
        .function("location", &gp_Pln::Location)
        .function("axis", &gp_Pln::Axis)
        .function("xAxis", &gp_Pln::XAxis)
        .function("yAxis", &gp_Pln::YAxis)
        .function("position", &gp_Pln::Position)
        .function("setAxis", &gp_Pln::SetAxis)
        .function("setLocation", &gp_Pln::SetLocation)
        .function("setPosition", &gp_Pln::SetPosition)
        .function("transform", &gp_Pln::Transform)
        .function("transformed", &gp_Pln::Transformed)
        ;
}

} // namespace MathBindings

