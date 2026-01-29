/*
 * @Author: wuyifan wuyifan@udschina.com
 * @Date: 2026-01-26 15:33:22
 * @LastEditors: wuyifan wuyifan@udschina.com
 * @LastEditTime: 2026-01-26 15:33:51
 * @FilePath: \occt-wasm\src\geometry\PrimApiBindings.h
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
#ifndef PRIM_API_BINDINGS_H
#define PRIM_API_BINDINGS_H

#include <emscripten/bind.h>

// Forward declarations
class TopoDS_Shape;

namespace PrimApiBindings {
    void registerBindings();
}

#endif // PRIM_API_BINDINGS_H