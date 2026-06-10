# occt-wasm

将 Open CASCADE (OCCT) 编译为 WebAssembly，通过 embind 暴露给 TypeScript/JavaScript 使用的 CAD 内核绑定项目。

## Language

**Core**:
建模内核 WASM 包，包含 FoundationClasses、ModelingData、ModelingAlgorithms 及对应 embind 绑定；首屏默认加载。
_Avoid_: base, main-only（易与 Emscripten MAIN_MODULE 混淆）

**Exchange**:
数据交换 WASM 侧模块，包含 XCAF、DataExchange，以及 OCCT 文档装配所强制依赖的 Visualization toolkits（TKService / TKV3d / TKVCAF）；按需或闲时加载。
_Avoid_: plugin（过于泛化）, import（易与 JS import 混淆）

**Forced Viz Coupling**:
OCCT 模块未完全解耦：启用 XCAF 文档装配/交换时，即使绑定层不直接调用渲染 API，链接阶段仍须编入 TKService / TKV3d / TKVCAF，否则报错。
_Avoid_: optional viz, dead code（在此语境下它们不是可选死代码）

**Exchange Load Policy**:
Exchange 默认不加载；`requestIdleCallback` 闲时后台预取；用户在此之前触发交换操作时立即异步加载并展示 loading 状态。闲时预取失败静默（`console.warn`），用户首次 async 调用时由 `ensureExchange()` 重试并将错误抛给调用方。
_Avoid_: eager load（与首屏减负目标冲突）, sync load（超过 Chromium 8MB 主线程同步编译限制）, 预取失败后放弃重试

**Exchange API**:
Exchange 相关 TS 方法为 `async`，内部 `await ensureExchange()`；预取与用户触发共用同一加载 Promise。
_Avoid_: 同步 throw（把加载责任推给业务方）, 独立 exchange 入口包（增加集成成本）

**Build Artifacts**:
构建产物显式命名：`occt-wasm-core.js` / `occt-wasm-core.wasm`（MAIN_MODULE）+ `occt-wasm-exchange.wasm`（SIDE_MODULE）；类型声明统一为 `occt-wasm.d.ts`。单体模式产物为 `occt-wasm.js/wasm`。
_Avoid_: 沿用 `occt-wasm.js` 指代 Core（拆分后语义不清）

**Build Mode**:
`OCCT_WASM_BUILD_MODE`：`MONOLITH`（整体打包）| `SPLIT`（分包）。SPLIT 下 `OCCT_WASM_BUILD_SCOPE` 为 `ALL` | `CORE` | `EXCHANGE`。
_Avoid_: 为每种模式维护独立 CMakeLists 副本

**Loader Surface**:
不额外暴露 `preloadExchange` / `isExchangeReady` 等状态 API；仅通过 async Exchange 方法隐式触发加载，UI 自行在 `await` 前后处理 loading。
_Avoid_: 事件回调（API 面过大）, 公开 loader 状态（用户明确不需要）

**Dynamic Linking**:
Exchange 构建为 `SIDE_MODULE=2`；Core 以 `MAIN_MODULE=2` 构建期链接 exchange.wasm 做符号校验，`-sAUTOLOAD_DYLIBS=0` 延迟运行时加载；`ExchangeBindings` 与全部 embind 留在 Core。
_Avoid_: 独立 dlsym 桥接（维护成本高）, 启动时并行加载全部 wasm（非按需）

## Relationships

- **Core** 在启动时加载；**Exchange** 按 **Exchange Load Policy** 加载
- **Exchange** 依赖 **Core** 已初始化的 WASM 运行时（MAIN_MODULE + SIDE_MODULE 动态链接）
- 全部 embind JS API 注册在 **Core**；**Exchange** 仅为纯 WASM 侧模块（无 `--bind`）
- BREP 读写（`Exchange.importBREP` / `exportBREP`）属于 **Core**，保持**同步**，不触发 Exchange 加载
- STEP / IGES / STL 读写（`Exchange.importSTEP` 等）属于 **Exchange**，API 为 **async**

## Example dialogue

> **Dev:** "用户打开应用就要导入 STP，exchange 包什么时候加载？"
> **Domain expert:** "首屏只加载 **Core**；用户触发导入或 `requestIdleCallback` 预取时再 `dlopen` **Exchange**。embind 的 `Exchange.importSTEP` 仍在 **Core** 里，内部确保 **Exchange** 已链接。"

## Flagged ambiguities

- "plugin" 曾用于指 exchange 侧模块 — 已 resolved：统一使用 **Exchange**。
- Visualization toolkits 看似绑定层未使用 — 已 resolved：属于 **Forced Viz Coupling**，编入 **Exchange** 包而非删除。
