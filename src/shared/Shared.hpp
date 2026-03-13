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
#include <gp_Trsf.hxx>
#include <TopoDS_Shape.hxx>
#include <cmath>
#include <utility>

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

struct Axis1 {
    Vector3 origin;
    Vector3 direction;

    Axis1() = default;
    Axis1(const Vector3& origin_, const Vector3& direction_) : origin(origin_), direction(direction_) {}

    static gp_Ax1 toAx1(const Axis1& axis) {
        return gp_Ax1(Vector3::toPnt(axis.origin), Vector3::toDir(axis.direction));
    }

    static Axis1 fromAx1(const gp_Ax1& ax1) {
        return Axis1(Vector3::fromPnt(ax1.Location()), Vector3::fromDir(ax1.Direction()));
    }
};

struct Axis2;

struct Plane {
    Vector3 origin;
    Vector3 normal;

    Plane() = default;
    Plane(const Vector3& origin_, const Vector3& normal_) : origin(origin_), normal(normal_) {}

    static gp_Pln toPln(const Plane& plane) {
        return gp_Pln(Vector3::toPnt(plane.origin), Vector3::toDir(plane.normal));
    }

    static Plane fromPln(const gp_Pln& pln) {
        return Plane(Vector3::fromPnt(pln.Location()), Vector3::fromDir(pln.Axis().Direction()));
    }

    static gp_Ax2 toAx2(const Plane& plane) {
        return gp_Ax2(Vector3::toPnt(plane.origin), Vector3::toDir(plane.normal));
    }

    static Plane fromAxis2(const Axis2& axis);
};

struct Axis2 {
    Vector3 origin;
    Vector3 xDirection;
    Vector3 yDirection;

    Axis2() = default;
    Axis2(const Vector3& origin_, const Vector3& xDirection_, const Vector3& yDirection_) : origin(origin_), xDirection(xDirection_), yDirection(yDirection_) {}

    static gp_Ax2 toAx2(const Axis2& axis) {
        return gp_Ax2(Vector3::toPnt(axis.origin), Vector3::toDir(axis.xDirection), Vector3::toDir(axis.yDirection));
    }

    static Axis2 fromAx2(const gp_Ax2& ax2) {
        return Axis2(Vector3::fromPnt(ax2.Location()), Vector3::fromDir(ax2.XDirection()), Vector3::fromDir(ax2.YDirection()));
    }

    static Plane toPlane(const Axis2& axis) {
        return Plane::fromAxis2(axis);
    }

    static Axis2 fromPlane(const Plane& plane) {
        return Axis2::fromAx2(Plane::toAx2(plane));
    }
};

inline Plane Plane::fromAxis2(const Axis2& axis) {
    gp_Ax2 ax2 = Axis2::toAx2(axis);
    return Plane(Vector3::fromPnt(ax2.Location()), Vector3::fromDir(ax2.Direction()));
}

struct Axis3 {
    Vector3 origin;
    Vector3 xDirection;
    Vector3 yDirection;
    Vector3 zDirection;

    Axis3() = default;
    Axis3(const Vector3& origin_, const Vector3& xDirection_, const Vector3& yDirection_, const Vector3& zDirection_) : origin(origin_), xDirection(xDirection_), yDirection(yDirection_), zDirection(zDirection_) {}

    static gp_Ax3 toAx3(const Axis3& axis) {
        return gp_Ax3(Vector3::toPnt(axis.origin), Vector3::toDir(axis.zDirection), Vector3::toDir(axis.xDirection));
    }

    static Axis3 fromAx3(const gp_Ax3& ax3) {
        return Axis3(Vector3::fromPnt(ax3.Location()), Vector3::fromDir(ax3.XDirection()), Vector3::fromDir(ax3.YDirection()), Vector3::fromDir(ax3.Direction()));
    }
};

struct TopoResult {
    TopoDS_Shape shape;
    bool status;
    std::string message;

    TopoResult() = default;
    TopoResult(const TopoDS_Shape& s, bool st, const std::string& m)
        : shape(s), status(st), message(m) {}

    /** 移出 shape，调用后 TopoResult 内的 shape 为空，所有权转移给返回值 */
    TopoDS_Shape takeShape() { return std::move(shape); }
};

struct BoundingBox3 {
    Vector3 min;
    Vector3 max;

    BoundingBox3() = default;
    BoundingBox3(const Vector3& min_, const Vector3& max_) : min(min_), max(max_) {}
};

/**
 * Three.js Matrix4.elements (column-major, 16 doubles) -> gp_Trsf
 * Supports rotation + translation + uniform scale.
 */
inline gp_Trsf trsfFromMatrix4Elements(const emscripten::val& elements) {
    std::vector<double> e = emscripten::convertJSArrayToNumberVector<double>(elements);

    double sx = std::sqrt(e[0]*e[0] + e[1]*e[1] + e[2]*e[2]);
    double sy = std::sqrt(e[4]*e[4] + e[5]*e[5] + e[6]*e[6]);
    double sz = std::sqrt(e[8]*e[8] + e[9]*e[9] + e[10]*e[10]);

    double scale = (sx + sy + sz) / 3.0;
    double invSx = 1.0 / sx, invSy = 1.0 / sy, invSz = 1.0 / sz;

    gp_Trsf trsf;
    trsf.SetValues(
        e[0]*invSx,  e[4]*invSy,  e[8]*invSz,  e[12],
        e[1]*invSx,  e[5]*invSy,  e[9]*invSz,  e[13],
        e[2]*invSx,  e[6]*invSy,  e[10]*invSz, e[14]
    );

    if (std::abs(scale - 1.0) > 1e-14) {
        trsf.SetScaleFactor(scale);
    }

    return trsf;
}

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
EMSCRIPTEN_DECLARE_VAL_TYPE(TopoShellArray)
EMSCRIPTEN_DECLARE_VAL_TYPE(TopoSolidArray)
EMSCRIPTEN_DECLARE_VAL_TYPE(TopoCompoundArray)
EMSCRIPTEN_DECLARE_VAL_TYPE(GpPntArray)



