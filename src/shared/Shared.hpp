#pragma once

#include <emscripten/bind.h>
#include <emscripten/val.h>

#include <gp_Ax1.hxx>
#include <gp_Ax2.hxx>
#include <gp_Ax3.hxx>
#include <gp_Dir.hxx>
#include <gp_XYZ.hxx>
#include <gp_Pln.hxx>
#include <gp_Pnt.hxx>
#include <gp_Vec.hxx>

#define REGISTER_HANDLE(T)                                                    \
    class_<Handle(T)>("Handle_" #T)                                           \
        .constructor<>()                                                      \
        .function("get", &Handle(T)::get, allow_raw_pointers())               \
        .function("isNull", &Handle(T)::IsNull)

class Constants {
    public:
    constexpr static const double PI = 3.14159265358979323846;
    constexpr static const double EPSILON = 1e-6;
    constexpr static const double HALF_PI = PI / 2;
    constexpr static const double TWO_PI = PI * 2;
    constexpr static const double SQRT_2 = 1.41421356237309504880;
    constexpr static const double LINE_DEFLECTION = 0.1;
    constexpr static const double ANGLE_DEFLECTION = 0.5;
};


struct Vector3 {
    double x;
    double y;
    double z;

    Vector3() = default;
    Vector3(double x_, double y_, double z_) : x(x_), y(y_), z(z_) {}

    static gp_XYZ toXYZ(const Vector3& v) {
        return gp_XYZ(v.x, v.y, v.z);
    }

    static Vector3 fromXYZ(const gp_XYZ& xyz) {
        return Vector3(xyz.X(), xyz.Y(), xyz.Z());
    }

    static gp_Vec toVec(const Vector3& v) {
        return gp_Vec(v.x, v.y, v.z);
    }

    static Vector3 fromVec(const gp_Vec& vec) {
        return Vector3(vec.X(), vec.Y(), vec.Z());
    }

    static gp_Pnt toPnt(const Vector3& v) {
        return gp_Pnt(v.x, v.y, v.z);
    }

    static Vector3 fromPnt(const gp_Pnt& pnt) {
        return Vector3(pnt.X(), pnt.Y(), pnt.Z());
    }

    static gp_Dir toDir(const Vector3& v) {
        return gp_Dir(v.x, v.y, v.z);
    }

    static Vector3 fromDir(const gp_Dir& dir) {
        return Vector3(dir.X(), dir.Y(), dir.Z());
    }
};


EMSCRIPTEN_DECLARE_VAL_TYPE(Int8Array)
EMSCRIPTEN_DECLARE_VAL_TYPE(Int16Array)
EMSCRIPTEN_DECLARE_VAL_TYPE(Int32Array)
EMSCRIPTEN_DECLARE_VAL_TYPE(Uint8Array)
EMSCRIPTEN_DECLARE_VAL_TYPE(Uint16Array)
EMSCRIPTEN_DECLARE_VAL_TYPE(Uint32Array)
EMSCRIPTEN_DECLARE_VAL_TYPE(Float32Array)
EMSCRIPTEN_DECLARE_VAL_TYPE(Float64Array)
EMSCRIPTEN_DECLARE_VAL_TYPE(BigInt64Array)
EMSCRIPTEN_DECLARE_VAL_TYPE(BigUint64Array)

EMSCRIPTEN_DECLARE_VAL_TYPE(Vector3Array)
EMSCRIPTEN_DECLARE_VAL_TYPE(Vector3ArrayArray)
EMSCRIPTEN_DECLARE_VAL_TYPE(NumberArray)
EMSCRIPTEN_DECLARE_VAL_TYPE(TopoShapeArray)
EMSCRIPTEN_DECLARE_VAL_TYPE(TopoEdgeArray)
EMSCRIPTEN_DECLARE_VAL_TYPE(TopoFaceArray)
EMSCRIPTEN_DECLARE_VAL_TYPE(TopoWireArray)
EMSCRIPTEN_DECLARE_VAL_TYPE(ShellArray)
EMSCRIPTEN_DECLARE_VAL_TYPE(GpPntArray)



