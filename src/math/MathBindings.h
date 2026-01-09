#ifndef MATH_BINDINGS_H
#define MATH_BINDINGS_H

#include <emscripten/bind.h>

// Forward declarations
class gp_Pnt;
class gp_Vec;
class gp_XYZ;
class gp_Trsf;
class gp_Ax1;
class gp_Ax2;
class gp_Mat;

namespace MathBindings {
    void registerBindings();
}

#endif // MATH_BINDINGS_H

