#include "FilletBuilder.h"

FilletBuilder::FilletBuilder(const TopoDS_Shape& shape)
    : myFillet(shape) {}

void FilletBuilder::addConstantRadius(double radius, const TopoDS_Edge& edge) {
    if (!edge.IsNull()) {
        myFillet.Add(radius, edge);
    }
}

void FilletBuilder::addVariableRadius(double r1, double r2, const TopoDS_Edge& edge) {
    if (!edge.IsNull()) {
        myFillet.Add(r1, r2, edge);
    }
}

TopoDS_Shape FilletBuilder::build() {
    return myFillet.IsDone() ? myFillet.Shape() : TopoDS_Shape();
}
