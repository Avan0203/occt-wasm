#ifndef SHARED_H
#define SHARED_H

#include <emscripten/bind.h>

namespace Shared {
    constexpr double PI = 3.14159265358979323846;
}

/**
 * 通用 OCCT Handle 绑定宏。使用 Handle(T) 以兼容 OCCT 7.9+。
 * 用法: REGISTER_HANDLE(Geom_Curve);
 * 需在使用处 include 对应 OCCT 头文件以提供 Handle(T) 类型定义。
 */
#define REGISTER_HANDLE(T)                                                    \
    class_<Handle(T)>("Handle_" #T)                                           \
        .constructor<>()                                                      \
        .function("get", &Handle(T)::get, allow_raw_pointers())               \
        .function("isNull", &Handle(T)::IsNull)

#endif // SHARED_H
