#ifndef FILLET_BUILDER_H
#define FILLET_BUILDER_H

#include <BRepFilletAPI_MakeFillet.hxx>
#include <TopoDS_Shape.hxx>
#include <TopoDS_Edge.hxx>

class FilletBuilder {
public:
    explicit FilletBuilder(const TopoDS_Shape& shape);

    void addConstantRadius(double radius, const TopoDS_Edge& edge);
    void addVariableRadius(double r1, double r2, const TopoDS_Edge& edge);
    TopoDS_Shape build();

private:
    BRepFilletAPI_MakeFillet myFillet;
};

#endif
