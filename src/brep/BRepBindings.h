#ifndef BREP_BINDINGS_H
#define BREP_BINDINGS_H

#include <emscripten/bind.h>

// Forward declarations
class TopoDS_Shape;
class TopoDS_Face;
class TopoDS_Edge;
class TopoDS_Vertex;
class TopoDS_Wire;
class TopoDS_Shell;
class TopoDS_Solid;
class TopoDS_Compound;

namespace BRepBindings {
    void registerBindings();
}

#endif // BREP_BINDINGS_H

