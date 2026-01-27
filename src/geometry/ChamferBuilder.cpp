#include "ChamferBuilder.h"

ChamferBuilder::ChamferBuilder(const TopoDS_Shape& shape)
    : myChamfer(shape) {}

void ChamferBuilder::addEqual(double dist, const TopoDS_Edge& edge) {
    if (!edge.IsNull()) {
        myChamfer.Add(dist, edge);
    }
}

void ChamferBuilder::addDistances(double d1, double d2, const TopoDS_Edge& edge, const TopoDS_Face& face) {
    if (!edge.IsNull() && !face.IsNull()) {
        myChamfer.Add(d1, d2, edge, face);
    }
}

TopoDS_Shape ChamferBuilder::build() {
    return myChamfer.IsDone() ? myChamfer.Shape() : TopoDS_Shape();
}
