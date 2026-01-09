#ifndef EXPORTER_BINDINGS_H
#define EXPORTER_BINDINGS_H

#include <emscripten/bind.h>

// Forward declarations
class TopoDS_Shape;

namespace ExporterBindings {
    void registerBindings();
}

#endif // EXPORTER_BINDINGS_H

