#ifndef GEOMETRY_BINDINGS_H
#define GEOMETRY_BINDINGS_H

#include <emscripten/bind.h>

// Forward declarations
class TopoDS_Shape;

namespace GeometryBindings {
    void registerBindings();
}

#endif // GEOMETRY_BINDINGS_H

