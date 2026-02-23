#include "shared/Shared.hpp"

#include <TopoDS_Shape.hxx>

using namespace emscripten;

EMSCRIPTEN_BINDINGS(Shared)
{
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


    value_object<Vector3>("Vector3").field("x", &Vector3::x).field("y", &Vector3::y).field("z", &Vector3::z);
}