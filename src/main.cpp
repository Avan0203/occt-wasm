#include <emscripten/bind.h>

// Include all binding headers
#include "math/MathBindings.h"
#include "geometry/GeometryBindings.h"
#include "geometry/CurveBindings.h"
#include "geometry/ModelerBindings.h"
#include "brep/BRepBindings.h"
#include "exchange/ExchangeBindings.h"

EMSCRIPTEN_BINDINGS(occt_wasm_module) {
    // Register all module bindings
    // Order matters - register base types first
    MathBindings::registerBindings();
    BRepBindings::registerBindings();
    CurveBindings::registerBindings();
    GeometryBindings::registerBindings();
    ModelerBindings::registerBindings();
    ExchangeBindings::registerBindings();
}

