#include "FilletChamferBindings.h"
#include "FilletBuilder.h"
#include "ChamferBuilder.h"
#include <emscripten/bind.h>

using namespace emscripten;

namespace FilletChamferBindings {

void registerBindings() {
    class_<FilletBuilder>("FilletBuilder")
        .constructor<const TopoDS_Shape&>()
        .function("addConstantRadius", &FilletBuilder::addConstantRadius)
        .function("addVariableRadius", &FilletBuilder::addVariableRadius)
        .function("build", &FilletBuilder::build);

    class_<ChamferBuilder>("ChamferBuilder")
        .constructor<const TopoDS_Shape&>()
        .function("addEqual", &ChamferBuilder::addEqual)
        .function("addDistances", &ChamferBuilder::addDistances)
        .function("build", &ChamferBuilder::build);
}

} // namespace FilletChamferBindings
