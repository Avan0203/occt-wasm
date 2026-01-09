#ifndef LOADER_BINDINGS_H
#define LOADER_BINDINGS_H

#include <emscripten/bind.h>

// Forward declarations
class TopoDS_Shape;

namespace LoaderBindings {
    void registerBindings();
}

#endif // LOADER_BINDINGS_H

