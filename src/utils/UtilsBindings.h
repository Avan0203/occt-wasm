#ifndef UTILS_BINDINGS_H
#define UTILS_BINDINGS_H

#include "shared/Shared.hpp"
#include <TopTools_ListOfShape.hxx>
#include <TopTools_SequenceOfShape.hxx>

namespace UtilsBindings {
    void registerBindings();
}

TopTools_SequenceOfShape topoShapeArrayToSequenceOfShape(const TopoShapeArray& shapes);
TopTools_ListOfShape topoShapeArrayToListOfShape(const TopoShapeArray& shapes);

#endif // UTILS_BINDINGS_H

