# OCCT 8.0.0 已知问题清单

## P0（需优先确认）

- **WASM 全量编译结果未在本次改动中自动验证**  
  - 原因：项目 C++ 编译耗时长，按当前协作约定不自动执行完整 build。  
  - 影响：存在编译器/链接器层面的潜在问题尚未被机器确认。  
  - 建议：在你本地统一修改后执行一次完整构建并记录错误日志。

## P1（功能回归风险）

- **CMake 已切换到 OCCT 8.0 目录模型，后续改动需遵循新规则**  
  - 变化：从 `src/<Toolkit>/PACKAGES` 切换到 `src/<Module>/<Toolkit>/PACKAGES.cmake`。  
  - 风险：若后续按旧路径新增/修改构建逻辑，会导致 package 和源码收集失败。  
  - 建议：后续新增 toolkit 时统一走 `MODULES.cmake + TOOLKITS.cmake + PACKAGES.cmake` 解析链路。

- **布尔 API 改名为 `fuse/cut/common` 产生调用兼容性变化**  
  - 影响范围：所有直接调用 `Modeler.union/difference/intersection` 的上层代码。  
  - 当前处理：已同步更新 `examples/src/sdk/modeler.ts` 与 `bool-operate` 示例。  
  - 当前处理补充：`ModelerBindings` 内部实现命名也已对齐为 `fuse/cut/common`。  
  - 建议：统一编译后确认生成产物中的类型声明不再残留旧命名（`union/difference/intersection`）。

- **`BRep_Tool::PolygonOnTriangulation` 改为返回值重载后需实际运行验证**  
  - 影响范围：边离散数据提取链路（`Shape::toBRepResult`）。  
  - 建议：重点验证复杂模型的 edge 折线提取与渲染结果。

## P1（WASM 拆分）

- **Exchange 侧模块须异步 `loadDynamicLibrary` / `dlopen`**  
  - 背景：构建产物拆为 `occt-wasm-core` + `occt-wasm-exchange.wasm`，`-sAUTOLOAD_DYLIBS=0` 延迟加载。  
  - 约束：Exchange ~7MB，Chromium 主线程同步编译 WASM 上限约 8MB，必须 `loadAsync: true`。
  - SIDE_MODULE 链接不能带 `INITIAL_HEAP` / `ALLOW_MEMORY_GROWTH`（会触发 IMPORTED_MEMORY 冲突）。
  - 详见：`docs/adr/0001-wasm-core-exchange-split.md`。

## P2（后续优化项）

- **绑定暴露面仍偏大，未纳入本轮**  
  - 影响：wasm 体积仍有优化空间。  
  - 建议：按“高频优先”策略分批裁剪，先统计 TS 侧真实调用再移除低频绑定。

- **重复逻辑仍存在（可继续 DRY）**  
  - 例：`Shape::getVertices/getEdges/getFaces/getWires/getSolids/getCompounds` 可统一模板化。  
  - 建议：在功能稳定后做无行为变化重构。
