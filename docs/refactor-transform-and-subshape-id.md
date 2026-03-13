# Chili3D 重构方案：Transform 与 SubShape ID 解耦

## 1. 背景与问题

### 1.1 现状

- Mesh 顶点坐标将 shape 的 `TopLoc_Location` 烘焙进世界坐标
- `shape.matrix` 变更时，`onTransformChanged()` 清空 mesh 缓存，下次访问时重新 Mesher、重建 BufferGeometry
- Sub-shape（Face/Edge/Vertex）直接持有 TopoDS 引用；父 shape 的 location 变化后，这些引用与其解耦，造成错误行为
- Chamfer/Fillet 等需要子拓扑时，依赖可能已过期的 TopoDS 引用

### 1.2 目标

- 降低对象创建：Transform 变化时不再重建 Mesher 与 BufferGeometry
- 解决 sub-shape 引用失效：用 ID + Index 映射替代直接 TopoDS 引用
- 明确职责：Transform 统一由 `node.transform` 承载，Mesh 使用 shape 局部坐标

---

## 2. 方案概述

| 变更类型               | TopoDS_Shape | Mesher | BufferGeometry |
| ---------------------- | ------------ | ------ | -------------- |
| 纯变换（Move/Rotate）  | 不创建       | 不运行 | 不创建         |
| 几何/拓扑变化          | 可能新建     | 运行   | 创建           |

---

## 3. 详细设计

### 3.1 Transform 与 Mesh 解耦

#### 3.1.1 约定

- **TopoDS_Shape**：`TopLoc_Location` 保持 identity
- **node.transform**：所有放置、移动、旋转由 `VisualNode.transform` 表示
- **Mesh 顶点**：shape 局部空间，不烘焙 shape 的 location

#### 3.1.2 实现要点

1. **C++ Mesher**  
   - 输出顶点为 shape 局部坐标  
   - 若当前已为局部坐标（`face.Location()` 相对 shape），则无需改动  
   - 否则对输入 shape 使用 `shape.Located(TopLoc_Location())` 再 mesher，或生成时明确不乘 shape root 的 location  

2. **OccShape.set matrix**  
   - 不再在 `onTransformChanged()` 中清空 `_mesh`  
   - 或仅当几何/拓扑变化时清空 mesh  

3. **TransformedCommand（Move 等）**  
   - 只更新 `node.transform`，保持现有实现  

4. **Three.js 渲染**  
   - BufferGeometry 使用局部坐标  
   - `Object3D.matrix` 由 `node.transform` 驱动  
   - Transform 变化时仅更新 matrix，不重建 geometry  

#### 3.1.3 Component 合并（可选）

- 当前：合并 mesh 时用 `node.transform` 将顶点转到世界空间，任一节点 transform 变化都会整棵 Component 重建  
- 可选：改为每个 ShapeNode 单独 BufferGeometry，挂在各自 Object3D 下，由 scene graph 做 transform，避免整体 mesh 重建  

---

### 3.2 SubShape ID 与 Index 映射

#### 3.2.1 数据结构

```text
┌─────────────────┐                    ┌─────────────────┐
│   Global ID     │◄──── 双向映射 ────►│  OCCT Index     │
│  (渲染/UI 用)    │                    │ (TopExp 索引)   │
└─────────────────┘                    └─────────────────┘
       │                                        │
  IDIndexMap                              IndexedMap.FindKey(index)
  IndexIdMap                              → TopoDS_Edge/Face/Vertex
```

- **Global ID**：应用层唯一标识，用于渲染、选中、Undo 等
- **Index**：`TopExp::MapShapes` 得到的 1-based 索引，拓扑不变时稳定
- **IDIndexMap**：`id → index`
- **IndexIdMap**：`index → id`，与 IDIndexMap 同增同减，保持 O(1) 双向查找

#### 3.2.2 生命周期

- **创建**：Shape 创建或几何/拓扑变化时，`TopExp::MapShapes` 构建 IndexedMap，为每个 sub-shape 分配 ID，填充 IDIndexMap 与 IndexIdMap
- **失效**：Fillet/Boolean 等产生新 shape 时，旧 map 整体废弃
- **查询**：`getSubShapeById(shape, idMap, id, type)` 通过 ID → Index → FindKey 取 TopoDS

#### 3.2.3 Mesher 遍历顺序

- Face/Edge/Vertex 均使用 `TopExp::MapShapes(shape, type, map)` 遍历
- Mesher 输出 group/range 顺序与 map 索引一一对应
- 每个 group 携带对应 index（或由 index 推导出的 ID），供应用层建立映射

#### 3.2.4 查询接口

**C++ 侧**（暴露给 WASM）：

```cpp
TopoDS_Shape getSubShape(const TopoDS_Shape& shape, int index, TopAbs_ShapeEnum type) {
    TopTools_IndexedMapOfShape map;
    TopExp::MapShapes(shape, type, map);
    if (index < 1 || index > map.Extent()) return TopoDS_Shape();
    return map.FindKey(index);
}
```

**TS 侧**：

```ts
class SubShapeIdMap {
  private idToIndex = new Map<string, number>();
  private indexToId = new Map<number, string>();

  add(id: string, index: number): void { ... }
  remove(id: string): void { ... }
  getIndex(id: string): number | undefined { ... }
  getId(index: number): string | undefined { ... }
}

function getSubShapeById(
  shape: TopoDS_Shape,
  idMap: SubShapeIdMap,
  id: string,
  type: 'face' | 'edge' | 'vertex'
): TopoDS_Shape | undefined;
```

---

### 3.3 一致性约定

1. **遍历顺序**：Mesher、ID 分配、查询均依赖 `TopExp::MapShapes` 的固定遍历顺序  
2. **Index 基准**：统一使用 OCCT 的 1-based index，或项目内约定 0-based，并在所有模块中一致  
3. **ID 作用域**：明确为“shape 内唯一”或“文档内唯一”，若文档级则需与 shape 身份绑定  
4. **封装**：所有对 IDIndexMap/IndexIdMap 的修改通过 SubShapeIdMap 的 add/remove 完成，避免单边修改导致不同步  

---

## 4. 实施步骤

### 阶段一：Transform 与 Mesh 解耦（优先）

1. 确认 C++ Mesher 输出是否已是 shape 局部坐标；若否，调整 mesher 使其输出局部坐标  
2. 修改 OccShape：`set matrix` 时不再在 `onTransformChanged` 中清空 `_mesh`  
3. 验证 Move/Rotate 只更新 `node.transform`，且 Three.js 仅更新 matrix 即可正确显示  
4. 按需调整 Component 合并策略，减少不必要的大 mesh 重建  

### 阶段二：SubShape ID-Index 映射

1. 在 C++ 中暴露 `getSubShape(shape, index, type)`  
2. 实现 `SubShapeIdMap` 及 add/remove/getIndex/getId  
3. 调整 Mesher 输出，使 group/range 与 `TopExp::MapShapes` 索引一一对应，并携带 index 或可推导 ID  
4. 在 mesh 构建/更新时建立 ID 与 index 的映射  
5. 将 Chamfer/Fillet 等操作改为：通过 ID 解析出 index，再调用 `getSubShape` 获取当前 TopoDS  
6. 将 selection/highlight 等改为使用 ID 而非 TopoDS 引用  

---

## 5. 预期效果

- Transform 变更：仅更新 Object3D.matrix，无 Mesher 与 BufferGeometry 重建  
- Sub-shape 引用：通过 ID → Index → TopoDS 按需查询，避免 stale 引用  
- 对象创建：明显减少 TopoDS、Mesher、BufferGeometry 在 Transform 场景下的创建  
- 架构：职责清晰，扩展性更好（选择、Undo、序列化等可基于 ID 工作）  

---

## 6. 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| Mesher 与 TopExp 遍历顺序不一致 | 统一使用 `TopExp::MapShapes`，并在 Mesher 中复用同一 map/顺序 |
| ID-Index 映射不同步 | 严格通过 SubShapeIdMap 修改，禁止外部直接改 map |
| 拓扑变更后 ID 失效 | 明确语义：旧 ID 随 shape 废弃，操作完成后需重新选择 |
| 实施范围大 | 分阶段：先做 Transform 解耦，再做 ID-Index 映射 |
