#include <emscripten/bind.h>

// Include all binding headers
#include "math/MathBindings.h"
#include "geometry/GeometryBindings.h"
#include "brep/BRepBindings.h"
#include "utils/UtilsBindings.h"
#include "mesher/MesherBindings.h"
// #include "loader/LoaderBindings.h"
// #include "exporter/ExporterBindings.h"

EMSCRIPTEN_BINDINGS(occt_wasm_module) {
    // Register all module bindings
    // Order matters - register base types first
    MathBindings::registerBindings();
    BRepBindings::registerBindings();
    GeometryBindings::registerBindings();
    UtilsBindings::registerBindings();
    MesherBindings::registerBindings();
    // LoaderBindings::registerBindings();
    // ExporterBindings::registerBindings();
}

