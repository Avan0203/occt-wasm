# OCCT TopLoc_Location 与 TopoDS_Shape 定位模型

## 1. 核心概念

### TopLoc_Location
- 表示 shape 在空间中的**位置/朝向**，是一个**复合变换**（composite transition）
- 由一系列 `TopLoc_Datum3D` 及对应幂次组成，等价于一个 `gp_Trsf` 变换矩阵
- 空 location = 单位变换（Identity）
- 支持 `Transformation()` 获取 `gp_Trsf`，以及 `toMatrix4()` 转为 4x4 矩阵

### TopoDS_Shape 与 Location
- 每个 `TopoDS_Shape` 都有 `Location()`，表示其**本地坐标系**相对父级的位置
- `setLocation()` / `setLocationFromMatrix4()`：就地修改 shape 的 location
- `Located(loc)` / `Moved(loc)`：返回**新 shape**，原 shape 不变
- Shape 是值语义：修改或提取后得到的是独立副本，彼此解耦

### 子 shape 的 Location 传播
- `TopExp::MapShapes` 遍历拓扑，返回的 sub-shape（Vertex/Edge/Face）各有自己的 `Location()`
- 在装配体（Compound）中，最终变换 = 子 shape 的 location × 各级父 shape 的 location
- 对于单一 Solid（如 Box），通常子 shape 的 location 为 Identity，位置由根 shape 的 location 决定

## 2. toBRepResult 与 sub-shape 的解耦问题

### 当前流程
1. `Shape.toBRepResult(shape, ...)` 调用 `getVertices/getEdges/getFaces(shape)` 提取 sub-shape
2. 顶点/边/面的顶点坐标：在 C++ 中已用各 sub-shape 的 `loc` 变换到正确空间（如 `BRep_Tool::Triangulation(face, loc)` 后用 `pnt.Transform(loc.Transformation())`）
3. 返回的 `BRepResult` 中，`vertex.shape`、`edge.shape`、`face.shape` 是**提取时刻**的 TopoDS 引用快照

### 解耦问题
- 主 shape 通过 `setLocationFromMatrix4()` 修改 location 后，`BRepResult` 里的 sub-shape **不会自动更新**
- 这些 sub-shape 仍是旧引用，location 与主 shape 不一致
- 导致：fillet 选边、导出、比较等逻辑使用到 sub-shape 时，可能坐标系或引用不一致

### 解决方案
在 location 变化后**重新调用** `toBRepResult(shape)`，从**当前 shape** 重新提取 sub-shape，使 BrepResult 中的几何与 sub-shape 引用与 shape 保持一致。
