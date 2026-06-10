# WASM 拆分为 Core + Exchange 双模块

OCCT WASM 单体约 14MB，其中建模 Core 约 7MB，数据交换（含 XCAF、Forced Viz Coupling）约 7MB。决定将构建产物拆为 `occt-wasm-core`（MAIN_MODULE）与 `occt-wasm-exchange.wasm`（SIDE_MODULE），首屏只加载 Core，Exchange 按 Exchange Load Policy 懒加载。

## Considered Options

- **单体 WASM**：实现最简单，首屏 14MB，放弃。
- **两个独立 WASM 实例**：无法共享 C++ 对象句柄（如 `TopoDS_Shape`），放弃。
- **wasm-split（SPLIT_MODULE）**：需 profiling 工具链，与 embind 配合复杂，暂不采用。
- **Emscripten 动态链接（选定）**：`MAIN_MODULE=2` + `SIDE_MODULE=2`；exchange 经 `STATIC` + `--whole-archive` 打入完整 side wasm；构建期 `target_link_libraries(core exchange)` 解析符号，`-sAUTOLOAD_DYLIBS=0` 延迟运行时加载。

## Consequences

- 全部 embind（含 `ExchangeBindings`）留在 Core；Exchange 侧模块**禁止** `--bind`。
- OCCT 文档装配强制依赖 TKService / TKV3d / TKVCAF（Forced Viz Coupling），编入 Exchange 包而非删除。
- `Exchange.importBREP` / `exportBREP` 保持同步（Core）；STEP / IGES / STL 方法改为 async，内部 `await ensureExchange()`。
- 不暴露额外 loader 状态 API；闲时 `requestIdleCallback` 预取与用户触发共用同一加载 Promise；预取失败静默，用户 async 调用时重试。
- 产物命名：`occt-wasm-core.js/wasm` + `occt-wasm-exchange.wasm` + 统一 `occt-wasm.d.ts`（破坏性改名）。
- Exchange ~7MB 须异步 `dlopen`（Chromium 主线程同步编译 >8MB 限制）。
- 构建通过 `OCCT_WASM_BUILD_MODE` 切换：`MONOLITH`（单体 `occt-wasm.js/wasm`）| `SPLIT`（core + exchange）。`OCCT_WASM_BUILD_SCOPE` 控制 SPLIT 下默认构建范围；增量编译用 `pnpm build:exchange` / `pnpm build:core-wasm`。
- **ccache**：PATH 中有 ccache 时默认启用（`OCCT_WASM_USE_CCACHE=AUTO`）；可加速 MONOLITH ↔ SPLIT 切换时对同一 `.cxx` 的重编。强制开关：`pnpm build:split --ccache` / `--no-ccache`。
