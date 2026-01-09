#ifndef UTILS_BINDINGS_H
#define UTILS_BINDINGS_H

#include <emscripten/bind.h>

// Forward declarations
class TopoDS_Shape;

namespace UtilsBindings {
    void registerBindings();
}

#endif // UTILS_BINDINGS_H

