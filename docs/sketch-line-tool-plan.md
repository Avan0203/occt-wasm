# 草图直线工具最小闭环 - 实现计划

## 目标

实现「直线工具 + 点击串联 + 结果渲染」的最小闭环：用户在 EDIT 模式下依次点击，生成折线，双击或点击完成按钮后渲染到场景。

---

## 设计原则

1. **职责分离**：App 负责输入与模式分发，SketchBuilder 保持纯几何，Case/Controller 负责交互串联
2. **可扩展**：为后续工具（圆、弧）和预览预留接口
3. **最小侵入**：优先在 sketch case 内实现，必要时再抽取模块

---

## 架构示意

```
┌─────────────────────────────────────────────────────────────────┐
│  sketch/index.ts (Case)                                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  SketchLineController (或内联逻辑)                            │ │
│  │  - 工具状态：idle | drawing                                   │ │
│  │  - 监听 app 'click' → SketchBuilder.moveTo/lineTo             │ │
│  │  - 监听 app 'hover' → 预览线 (可选)                           │ │
│  │  - 完成 → build → toWire → 渲染 → reset                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│         │                    │                    │               │
│         ▼                    ▼                    ▼               │
│  SketchBuilder         app (事件)            createBrepGroup      │
│  (纯几何)              (click/hover)         Mesher.tessellate   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 阶段划分

### 阶段 1：App 支持 EDIT 模式下的 hover 事件

**目的**：为预览线和后续工具提供「光标在工作平面上的投影点」。

**变更**：
- 文件：`examples/src/common/app.ts`
- 在 `onPointerMove` 中：若 `mode === EDIT`，用 `getPointOnPlane` 计算 `hoverPoint`，dispatch `'hover'` 事件，detail 为 `{ point }`
- 仅在 EDIT 且未拖拽时 dispatch，避免噪音

**接口**：
```ts
// 监听方
app.addEventListener('hover', (e: CustomEvent) => {
  const { point } = e.detail;  // Vector3 | null
});
```

---

### 阶段 2：Sketch 支持输出 Wire（用于渲染）

**目的**：将多条连接的 Edge 合并为一个可 tessellate 的 Wire，便于一次性渲染。

**变更**：
- 文件：`examples/src/sdk/sketch.ts`
- 新增 `Sketch.toWire(): TopoDS_Wire | null`
  - 调用 `getShapes()` 得到 `TopoDS_Edge[]`
  - 0 条：返回 null
  - 1 条：`new BRepBuilderAPI_MakeWire(edge).wire()`
  - 多条：`new BRepBuilderAPI_MakeWire()`，`addEdge` 每条，`wire()`
- 需处理 `MakeWire` 失败（如边未相连），失败时返回 null 或 fallback 到 Compound

**依赖**：occt-wasm 已有 `BRepBuilderAPI_MakeWire`、`addEdge`、`wire`

---

### 阶段 3：SketchCase 串联点击与 SketchBuilder（直线工具）

**目的**：点击时把点传给 SketchBuilder，实现折线绘制逻辑。

**变更**：
- 文件：`examples/src/cases/sketch/index.ts`

**状态机**：
```
idle ──(首次点击)──> drawing ──(再次点击)──> drawing (循环)
                     │
                     └──(完成)──> idle
```

**逻辑**：
1. 仅在 `mode === EDIT` 时响应 `app.addEventListener('click', ...)`
2. 状态 `drawingState: 'idle' | 'drawing'`
3. 首次点击：`SketchBuilder.beginPath()`，`moveTo(point)`，状态 → `drawing`
4. 后续点击：`lineTo(point)`，保持 `drawing`
5. 完成时机（二选一或都支持）：
   - **方案 A**：双击最后一点
   - **方案 B**：GUI 增加「完成」按钮（推荐，实现简单）

**点坐标**：`e.detail.point` 为 Three.js `Vector3`，需转为 SDK `Vector3` 再传给 SketchBuilder（或扩展 SketchBuilder 支持 `{x,y,z}`）。

---

### 阶段 4：完成时渲染草图结果

**目的**：build 出 Sketch 后，转为 BrepGroup 并添加到场景。

**变更**：
- 文件：`examples/src/cases/sketch/index.ts`

**流程**：
1. 用户点击「完成」
2. `const sketch = SketchBuilder.build()`
3. `const wire = sketch.toWire()`
4. 若 `wire === null`（无有效几何）→ 仅 reset，不渲染
5. `const brepResult = Mesher.shapeToBRepResult(wire, 0.1, 0.5)`
6. `const group = createBrepGroup(wire, brepResult, material)`
7. `app.add(group)`，加入 `globalGC` 以便 unload 时释放
8. `SketchBuilder.reset()`（build 内部已 reset，但显式 reset 更清晰）

**注意**：单点（仅 moveTo 无 lineTo）无法形成 Edge，`getShapes()` 为空，`toWire()` 返回 null，属正常情况。

---

### 阶段 5：预览线（当前点 → 光标）

**目的**：drawing 状态下显示「当前折线终点到光标」的预览线，提升可感知性。

**变更**：
- 文件：`examples/src/cases/sketch/index.ts`
- 使用 Three.js `Line2` 或 `LineSegments` 作为预览，不经过 OCCT
- 监听 `app.addEventListener('hover', ...)`，在 drawing 时更新预览线端点
- 预览线加入 `app.addHelper()`，完成或取消时 `app.removeHelper()`
- 需要获取 SketchBuilder 的当前点：在 SketchBuilder 中增加 `getCurrentPoint(): Vector3`，或由 Case 自行维护 lastPoint

**可选**：若 SketchBuilder 不暴露 current，Case 可在每次 lineTo 后保存 `lastPoint`，moveTo 时也更新；预览线从 `lastPoint` 到 `hoverPoint`。

---

## 文件变更清单

| 文件 | 变更类型 | 简要说明 |
|------|----------|----------|
| `examples/src/common/app.ts` | 修改 | EDIT 模式下 pointermove 派发 `hover` 事件 |
| `examples/src/sdk/sketch.ts` | 修改 | 新增 `Sketch.toWire()`，SDK Vector3 与 Three.Vector3 互转工具 |
| `examples/src/cases/sketch/index.ts` | 修改 | 直线工具状态机、click 串联、完成渲染、预览线 |

---

## 实现顺序建议

1. **阶段 2**（Sketch.toWire）— 无 UI 依赖，可先实现并单测
2. **阶段 3 + 4**（点击串联 + 渲染）— 核心闭环，先不做预览
3. **阶段 1**（hover 事件）— 为预览铺路
4. **阶段 5**（预览线）— 体验增强

---

## 后续扩展预留

- 工具枚举：`SketchTool.LINE | CIRCLE | ARC`，Case 根据工具切换分支
- 取消：ESC 或按钮，`SketchBuilder.reset()`，清除预览
- 撤销：SketchBuilder 支持 `undoLastSegment()`（需在 builder 内维护历史）
