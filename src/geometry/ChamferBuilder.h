#ifndef CHAMFER_BUILDER_H
#define CHAMFER_BUILDER_H

#include <BRepFilletAPI_MakeChamfer.hxx>
#include <TopoDS_Shape.hxx>
#include <TopoDS_Edge.hxx>
#include <TopoDS_Face.hxx>

class ChamferBuilder {
public:
    explicit ChamferBuilder(const TopoDS_Shape& shape);

    void addEqual(double dist, const TopoDS_Edge& edge);
    void addDistances(double d1, double d2, const TopoDS_Edge& edge, const TopoDS_Face& face);
    TopoDS_Shape build();

private:
    BRepFilletAPI_MakeChamfer myChamfer;
};

#endif
