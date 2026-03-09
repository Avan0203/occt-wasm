#include "shared/Shared.hpp"

#include <TopoDS_Shape.hxx>
#include <GeomAbs_Shape.hxx>
#include <GeomAbs_CurveType.hxx>
#include <TopAbs.hxx>
#include <BRepBuilderAPI_ShellError.hxx>
#include <gp_TrsfForm.hxx>
#include <gp_EulerSequence.hxx>

using namespace emscripten;

EMSCRIPTEN_BINDINGS(Shared) {
  register_type<Int8Array>("Int8Array");
  register_type<Int16Array>("Int16Array");
  register_type<Int32Array>("Int32Array");
  register_type<Uint8Array>("Uint8Array");
  register_type<Uint16Array>("Uint16Array");
  register_type<Uint32Array>("Uint32Array");
  register_type<Float32Array>("Float32Array");
  register_type<Float64Array>("Float64Array");
  register_type<BigInt64Array>("BigInt64Array");
  register_type<BigUint64Array>("BigUint64Array");

  register_type<Vector3Array>("Array<Vector3>");
  register_type<Vector3ArrayArray>("Array<Array<Vector3>>");

  register_type<NumberArray>("Array<number>");
  register_type<TopoShapeArray>("Array<TopoDS_Shape>");
  register_type<TopoEdgeArray>("Array<TopoDS_Edge>");
  register_type<TopoFaceArray>("Array<TopoDS_Face>");
  register_type<TopoWireArray>("Array<TopoDS_Wire>");
  register_type<TopoShellArray>("Array<TopoDS_Shell>");
  register_type<TopoSolidArray>("Array<TopoDS_Solid>");
  register_type<TopoCompoundArray>("Array<TopoDS_Compound>");
  register_type<GpPntArray>("Array<gp_Pnt>");

  register_optional<double>();
  register_optional<std::string>();

  value_object<Vector3>("Vector3")
      .field("x", &Vector3::x)
      .field("y", &Vector3::y)
      .field("z", &Vector3::z);
  value_object<Axis1>("Axis1")
      .field("origin", &Axis1::origin)
      .field("direction", &Axis1::direction);

  value_object<BoundingBox3>("BoundingBox3")
      .field("min", &BoundingBox3::min)
      .field("max", &BoundingBox3::max);

  class_<TopoResult>("TopoResult")
      .property("shape", &TopoResult::shape, return_value_policy::reference())
      .property("status", &TopoResult::status)
      .property("message", &TopoResult::message);

  // ==== Enums ====
  enum_<GeomAbs_Shape>("GeomAbs_Shape")
      .value("GeomAbs_C0", GeomAbs_C0)
      .value("GeomAbs_G1", GeomAbs_G1)
      .value("GeomAbs_C1", GeomAbs_C1)
      .value("GeomAbs_G2", GeomAbs_G2)
      .value("GeomAbs_C2", GeomAbs_C2)
      .value("GeomAbs_C3", GeomAbs_C3)
      .value("GeomAbs_CN", GeomAbs_CN);

  enum_<TopAbs_ShapeEnum>("TopAbs_ShapeEnum")
      .value("TopAbs_COMPOUND", TopAbs_COMPOUND)
      .value("TopAbs_COMPSOLID", TopAbs_COMPSOLID)
      .value("TopAbs_SOLID", TopAbs_SOLID)
      .value("TopAbs_SHELL", TopAbs_SHELL)
      .value("TopAbs_FACE", TopAbs_FACE)
      .value("TopAbs_WIRE", TopAbs_WIRE)
      .value("TopAbs_EDGE", TopAbs_EDGE)
      .value("TopAbs_VERTEX", TopAbs_VERTEX);

  enum_<TopAbs_Orientation>("TopAbs_Orientation")
      .value("TopAbs_FORWARD", TopAbs_FORWARD)
      .value("TopAbs_REVERSED", TopAbs_REVERSED)
      .value("TopAbs_INTERNAL", TopAbs_INTERNAL)
      .value("TopAbs_EXTERNAL", TopAbs_EXTERNAL);

  enum_<GeomAbs_CurveType>("GeomAbs_CurveType")
      .value("GeomAbs_Line", GeomAbs_Line)
      .value("GeomAbs_Circle", GeomAbs_Circle)
      .value("GeomAbs_Ellipse", GeomAbs_Ellipse)
      .value("GeomAbs_Hyperbola", GeomAbs_Hyperbola)
      .value("GeomAbs_Parabola", GeomAbs_Parabola)
      .value("GeomAbs_BezierCurve", GeomAbs_BezierCurve)
      .value("GeomAbs_BSplineCurve", GeomAbs_BSplineCurve)
      .value("GeomAbs_OffsetCurve", GeomAbs_OffsetCurve)
      .value("GeomAbs_OtherCurve", GeomAbs_OtherCurve);

  enum_<BRepBuilderAPI_ShellError>("BRepBuilderAPI_ShellError")
      .value("ShellDone", BRepBuilderAPI_ShellDone)
      .value("EmptyShell", BRepBuilderAPI_EmptyShell)
      .value("DisconnectedShell", BRepBuilderAPI_DisconnectedShell)
      .value("ShellParametersOutOfRange", BRepBuilderAPI_ShellParametersOutOfRange);

  enum_<gp_TrsfForm>("gp_TrsfForm")
      .value("gp_Identity", gp_Identity)
      .value("gp_Rotation", gp_Rotation)
      .value("gp_Translation", gp_Translation)
      .value("gp_PntMirror", gp_PntMirror)
      .value("gp_Ax1Mirror", gp_Ax1Mirror)
      .value("gp_Ax2Mirror", gp_Ax2Mirror)
      .value("gp_Scale", gp_Scale)
      .value("gp_CompoundTrsf", gp_CompoundTrsf)
      .value("gp_Other", gp_Other);

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
      .value("gp_Intrinsic_ZYZ", gp_Intrinsic_ZYZ);
}