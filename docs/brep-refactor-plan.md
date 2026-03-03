# Brep 类型重构与 ShapeNode 转换计划

## 一、目标概述

1. 将 `BrepGroup` 重命名为 `BrepMesh`，并新增 `BrepCompound`
2. 抽离基类，供 `BrepCompound` 与 `BrepMesh` 继承
3. `App` 与 `ThreeRenderer` 的 `add`/`remove` 支持 `BrepCompound` 和 `BrepMesh`
4. 实现 ShapeNode → 场景对象的转换逻辑（Compound 递归，非 Compound 作为 Mesh）
5. Exchange 导入导出流程打通

---

## 二、类型设计

### 2.1 类型层级

```
THREE.Group
    └── BrepNode (抽象基类，新建)
            ├── BrepCompound (容器，children: BrepNode[])
            └── BrepMesh (叶子，原 BrepGroup，faces/points/edges/shape)
```

**命名说明**：
- `BrepObject` 已用于 Face/Edge/Point，基类命名为 `BrepNode`
- `BrepNode` 表示「可加入场景的 brep 节点」，区分于 `BrepObject`（face/edge/point 子对象）

### 2.2 BrepNode 基类

| 属性/方法 | 说明 |
|-----------|------|
| `dispose(): void` | 抽象，子类实现 |
| `setWireframeVisible(visible: boolean): void` | 抽象，子类实现 |
| 继承 `THREE.Group` | 可加入场景树 |

### 2.3 BrepMesh（原 BrepGroup）

- 重命名 `BrepGroup` → `BrepMesh`
- 保持现有：`faces`、`points`、`edges`、`shape`、`boundingBox`
- 保持：`syncTransform`、`transformToWorldMatrix`、`computeBoundingBox`
- 可选：`export type BrepGroup = BrepMesh` 用于兼容（或一次性全部替换）

### 2.4 BrepCompound（新建）

| 属性/方法 | 说明 |
|-----------|------|
| `children` | `BrepNode[]`（BrepMesh | BrepCompound） |
| `boundingBox` | 可选，用于 fitToView，从子节点计算 |
| `dispose()` | 递归 dispose 所有子节点 |
| `setWireframeVisible(visible)` | 递归调用子节点 |
| 无 `shape`、`faces`、`points`、`edges` | 纯容器 |

---

## 三、ShapeNode 转换逻辑

### 3.1 规则（与 C++ parseShape 一致）

| 条件 | 处理 |
|------|------|
| `node.shape` 有值 | 创建 **BrepMesh** |
| `node.shape` 无值 且 `getChildren().length > 0` | 创建 **BrepCompound**，递归处理 children |
| `node.shape` 无值 且 `getChildren().length === 0` | 空容器，可建空 BrepCompound 或跳过 |

### 3.2 新增函数（shape-converter.ts）

- `shapeNodeToSceneObject(node, occtModule, defaultMaterial): BrepNode`
- `collectShapesFromShapeNode(node): TopoDS_Shape[]`：用于导出时生成 Compound

---

## 四、App / ThreeRenderer 修改

### 4.1 类型联合

```ts
type BrepSceneNode = BrepMesh | BrepCompound;
```

### 4.2 add(object: BrepSceneNode)

| 类型 | 处理 |
|------|------|
| BrepMesh | 沿用现有逻辑：mainGroup.add、createGPUBrepGroup、setWireframeVisible |
| BrepCompound | mainGroup.add(compound)；递归遍历，对每个 BrepMesh 注册 GPU |

### 4.3 remove(object: BrepSceneNode)

| 类型 | 处理 |
|------|------|
| BrepMesh | 沿用现有 remove 逻辑 |
| BrepCompound | 递归遍历，对每个 BrepMesh 做 removeBrepGroupFromManagers、删除 GPU；compound.dispose()；mainGroup.remove |

### 4.4 新增辅助

- `collectBrepMeshes(node: THREE.Object3D): BrepMesh[]`：递归收集所有 BrepMesh（用于 add/remove 时的 GPU 注册）

---

## 五、相关函数重命名与调整

| 原名称 | 新名称 / 调整 |
|--------|----------------|
| `getBrepGroupFromBrepObject` | `getBrepMeshFromBrepObject`，查找逻辑改为 `instanceof BrepMesh` |
| `createBrepGroup` | `createBrepMesh` |
| `createGPUBrepGroup(brepGroup)` | `createGPUBrepGroup(brepMesh)` 参数类型改为 BrepMesh |
| `removeBrepGroupFromManagers` | `removeBrepMeshFromManagers` 或保持，内部逻辑不变 |
| `updateWireframeVisibilityByMode` | 遍历时需识别 BrepCompound 并递归到 BrepMesh |

---

## 六、选择与变换控制器

- `getSelectionObjects()`：返回类型改为 `BrepObjectAll[] | BrepSceneNode[]`，实际选择仍为 BrepMesh（叶子）
- `SelectionManager.currentSelectedGroups`：类型改为 `Set<BrepMesh>`（选择的是叶子 Mesh）
- `TransformControls.attachObject`：参数改为 `BrepMesh[]`（变换仅作用在 Mesh，因其有 shape/syncTransform）
- 若未来支持选择 BrepCompound：需扩展 TransformControls 对 Compound 的支持（遍历子 Mesh 统一变换）

---

## 七、OBJECT_MANAGER / GPU

- `OBJECT_MANAGER.setGPUGroup(id, gpuGroup)`：仅 BrepMesh 需要，id 仍为 `brepMesh.id.toString()`
- BrepCompound 不注册 GPU
- `clear()` 等：遍历 mainGroup.children 时需识别 BrepSceneNode，分别处理 BrepMesh 与 BrepCompound

---

## 八、文件变更清单

### 8.1 核心类型（object.ts）

- [ ] 新建 `BrepNode` 抽象基类（extends THREE.Group）
- [ ] `BrepGroup` 重命名为 `BrepMesh`，改为继承 `BrepNode`
- [ ] 新建 `BrepCompound` 类，继承 `BrepNode`
- [ ] `getBrepGroupFromBrepObject` → `getBrepMeshFromBrepObject`
- [ ] 导出 `BrepSceneNode` 类型、`BrepCompound`、`BrepMesh`

### 8.2 场景转换（shape-converter.ts）

- [ ] `createBrepGroup` → `createBrepMesh`
- [ ] `createGPUBrepGroup` 参数类型改为 BrepMesh
- [ ] 新增 `shapeNodeToSceneObject(node, occtModule, defaultMaterial): BrepNode`
- [ ] 新增 `collectShapesFromShapeNode(node): TopoDS_Shape[]`
- [ ] 新增 `collectBrepMeshes(node: THREE.Object3D): BrepMesh[]`

### 8.3 渲染与场景管理（three-renderer.ts）

- [ ] `add(object: BrepSceneNode)`：分支处理 BrepMesh / BrepCompound
- [ ] `remove(object: BrepSceneNode)`：分支处理
- [ ] `removeBrepGroupFromManagers` 改名为 `removeBrepMeshFromManagers` 或保持
- [ ] `updateWireframeVisibilityByMode`：支持 BrepCompound 递归
- [ ] `clear()`：支持 BrepCompound

### 8.4 App（app.ts）

- [ ] `add(object: BrepSceneNode)`
- [ ] `remove(object: BrepSceneNode)`
- [ ] `getSelectionObjects()` 返回类型更新
- [ ] 快捷键等逻辑中的 `BrepGroup` → `BrepMesh`

### 8.5 选择 / 高亮 / 变换

- [ ] **selection-manager.ts**：`BrepGroup` → `BrepMesh`
- [ ] **transform-controls.ts**：`BrepGroup` → `BrepMesh`
- [ ] **heightlight-manager.ts**：无需改（操作 BrepObjectAll）

### 8.6 业务 Case

- [ ] **exchange/index.ts**：完整导入导出流程，使用 `shapeNodeToSceneObject`、`collectShapesFromShapeNode`
- [ ] **basic-shapes**、**bool-operate**、**brep-show**、**exturde**、**fillet-chamfer**、**sketch**：`BrepGroup` → `BrepMesh`，`createBrepGroup` → `createBrepMesh`

### 8.7 文档

- [ ] **docs/sketch-line-tool-plan.md**：BrepGroup → BrepMesh

---

## 九、实施顺序建议

1. **Phase 1：类型重构**
   - object.ts：BrepNode、BrepMesh、BrepCompound、getBrepMeshFromBrepObject
   - shape-converter.ts：createBrepMesh、createGPUBrepGroup 参数
   - 全局替换 BrepGroup → BrepMesh，createBrepGroup → createBrepMesh

2. **Phase 2：add/remove 支持 BrepCompound**
   - three-renderer：add/remove、updateWireframeVisibilityByMode、clear
   - app：add/remove
   - 其他：selection-manager、transform-controls 等类型更新

3. **Phase 3：ShapeNode 转换**
   - shape-converter：shapeNodeToSceneObject、collectShapesFromShapeNode、collectBrepMeshes
   - exchange/index.ts：导入、导出流程

4. **Phase 4：验证与清理**
   - 各 case 功能验证
   - 删除无用兼容代码

---

## 十、兼容性说明

- 若需渐进迁移，可添加 `export type BrepGroup = BrepMesh`
- 建议一次性替换，减少技术债
