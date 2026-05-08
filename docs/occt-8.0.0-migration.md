# OCCT 8.0.0 迁移说明

## 背景

项目原先基于 OCCT 7.9.3 绑定与调用，现切换至 OCCT 8.0.0。  
本次迁移目标是先保证核心逻辑跑通与接口一致性，体积优化（减少暴露面）后续单独进行。

## 本次迁移范围

- `CMakeLists.txt`
- `src/brep/ShapeBindings.cpp`
- `src/exchange/ExchangeBindings.cpp`
- `src/geometry/ModelerBindings.cpp`
- `examples/src/sdk/modeler.ts`
- `examples/src/cases/bool-operate/index.ts`

## 关键决策

1. `Standard_*` 类型与 `Standard_True/Standard_False` 全量替换为原生 C++ 类型与 `true/false`。
2. `BRep_Tool` 调用方式对齐 OCCT 8.0 风格（优先采用返回值重载）。
3. 布尔运算 API 严格改名为 OCCT 术语：`fuse/cut/common`，移除 `union/difference/intersection`。
4. 本轮不做 wasm 暴露面裁剪，先以功能可用和迁移正确为目标。

## 具体改动

## 0) `CMakeLists.txt`

- 构建脚本从旧目录模型切换为 OCCT 8.0 目录模型：
  - 旧：`src/<Toolkit>/PACKAGES`
  - 新：`src/<Module>/<Toolkit>/PACKAGES.cmake`
- 新增模块与工具包解析流程：
  - 读取 `src/MODULES.cmake`
  - 逐模块读取 `src/<Module>/TOOLKITS.cmake`
  - 按工具包读取 `src/<Module>/<Toolkit>/PACKAGES.cmake`
- include 与源码收集路径改为按 package 目录收集：
  - `src/<Module>/<Toolkit>/<Package>`
- 去掉已过时硬编码目录：
  - 删除 `src/TPrsStd`（OCCT 8.0 源码树不存在）
- 保留 `XCAFApp` 源码排除策略，并将其头文件路径改为：
  - `src/DataExchange/TKXCAF/XCAFApp`
- 已做配置级验证：
  - `cmake -S . -B build/cmake-check -G Ninja` 通过
  - 成功收集 OCCT 源文件数量：`5062`

## 1) `src/brep/ShapeBindings.cpp`

- 将 `Standard_Integer/Standard_Real/Standard_Boolean` 替换为 `int/double/bool`。
- 将 `Abs(...)` 替换为 `std::abs(...)`。
- 将 `Standard_False/Standard_True` 替换为 `false/true`。
- `PolygonOnTriangulation` 调用改为返回值重载形式：
  - 从出参式 `BRep_Tool::PolygonOnTriangulation(...)`
  - 调整为 `Handle(Poly_PolygonOnTriangulation) polygonOnTri = BRep_Tool::PolygonOnTriangulation(...)`

## 2) `src/exchange/ExchangeBindings.cpp`

- 将 `Standard_Integer` 替换为 `int`。
- 将 `Standard_True/Standard_False` 替换为 `true/false`。
- 保持导入导出行为与接口不变。

## 3) `src/geometry/ModelerBindings.cpp`

- 将 `Standard_True/Standard_False` 替换为 `true/false`。
- 形状数组转换辅助函数命名与 OCCT 8 `NCollection` 语义对齐：
  - `topoShapeArrayToListOfShape` -> `topoShapeArrayToNCollectionListOfShape`
- 绑定接口重命名：
  - `union` -> `fuse`
  - `difference` -> `cut`
  - `intersection` -> `common`
- 内部实现函数名同步语义对齐：
  - `difference(...)` -> `cut(...)`
  - `intersection(...)` -> `common(...)`

## 4) `examples/src/sdk/modeler.ts`

- SDK 对应改名：
  - `Modeler.union()` -> `Modeler.fuse()`
  - `Modeler.difference()` -> `Modeler.cut()`
  - `Modeler.intersection()` -> `Modeler.common()`

## 5) `examples/src/cases/bool-operate/index.ts`

- 示例操作枚举与调用同步改名：
  - `union/intersection/difference`
  - -> `fuse/common/cut`

## 验证建议

由于 C++/WASM 编译耗时较长，本次未自动执行完整构建。建议手动验证：

1. 执行项目类型检查（examples）并确认 TS 无报错。
2. 手动执行 wasm 编译流程并确认通过。
3. 打开 `bool-operate` 示例，验证 `fuse/common/cut` 三种操作结果。
4. 验证导入导出链路（STEP/IGES/STL/BREP）基础可用。

## 后续计划（下一阶段）

- 基于实际调用频率，收敛低频绑定暴露面以降低 wasm 体积。
- 对 `ShapeBindings` 内部重复逻辑做进一步抽取（保持行为不变）。
- 补充 8.0 升级专项回归用例（布尔、网格、曲线离散、导出链路）。
