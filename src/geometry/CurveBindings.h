#ifndef CURVE_BINDINGS_H
#define CURVE_BINDINGS_H

#include "shared/Shared.hpp"
#include <TopoDS_Edge.hxx>
#include <optional>

namespace CurveBindings {

class CurveFactory {
public:
    static TopoDS_Edge Line(const Vector3& p1, const Vector3& p2);
    static TopoDS_Edge Circle(const Vector3& center, double radius, double u1, double u2, bool adjustPeriodic, const Vector3& normal);
    static TopoDS_Edge Ellipse(const Vector3& center, double majorRadius, double minorRadius, const Vector3& normal);
    static TopoDS_Edge BSpline(const Vector3Array& controlPoints, const NumberArray& knots, const NumberArray& multiplicities, int degree, bool periodic, const std::optional<NumberArray>& weights);
};

void registerBindings();

} // namespace CurveBindings

#endif // CURVE_BINDINGS_H
