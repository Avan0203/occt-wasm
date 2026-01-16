# Worker 架构设计方案

## 概述

为了支持每个案例独立运行在 Web Worker 中，避免阻塞主线程，设计了以下架构方案。

## 架构设计

### 1. Worker 生命周期管理

每个案例可以拥有一个独立的 Worker，Worker 的生命周期与案例绑定：

```
案例加载 (load)  → 创建 Worker → 初始化 Worker → 案例运行
案例卸载 (unload) → 终止 Worker → 清理资源
```

### 2. CaseContext 扩展

`CaseContext` 接口已包含 `worker` 字段，用于存储 Worker 实例：

```typescript
export interface CaseContext {
  container: HTMLElement;
  occtModule: any;
  worker?: Worker; // 可选的 Worker 实例
}
```

### 3. Worker 创建和销毁流程

#### 创建 Worker（在 Case.load 中）

```typescript
async function load(context: CaseContext): Promise<void> {
  // 如果需要 Worker
  if (needsWorker) {
    context.worker = new Worker(
      new URL('./worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    // 监听 Worker 消息
    context.worker.onmessage = (event) => {
      // 处理 Worker 消息
    };
    
    // 监听 Worker 错误
    context.worker.onerror = (error) => {
      console.error('Worker error:', error);
    };
    
    // 初始化 Worker（发送初始化消息）
    context.worker.postMessage({
      type: 'init',
      data: { /* 初始化数据 */ }
    });
  }
  
  // 其他加载逻辑...
}
```

#### 销毁 Worker（在 Case.unload 中）

```typescript
async function unload(context: CaseContext): Promise<void> {
  // 清理 Worker
  if (context.worker) {
    // 发送终止消息
    context.worker.postMessage({ type: 'terminate' });
    
    // 终止 Worker
    context.worker.terminate();
    context.worker = undefined;
  }
  
  // 其他清理逻辑...
}
```

### 4. Worker 通信协议

#### 主线程 → Worker

```typescript
// 初始化
worker.postMessage({
  type: 'init',
  data: { occtModule: /* ... */ }
});

// 执行任务
worker.postMessage({
  type: 'task',
  taskId: 'unique-task-id',
  data: { /* 任务数据 */ }
});

// 终止
worker.postMessage({ type: 'terminate' });
```

#### Worker → 主线程

```typescript
// 任务完成
self.postMessage({
  type: 'task-complete',
  taskId: 'unique-task-id',
  result: { /* 结果数据 */ }
});

// 任务进度
self.postMessage({
  type: 'task-progress',
  taskId: 'unique-task-id',
  progress: 0.5 // 0-1
});

// 错误
self.postMessage({
  type: 'error',
  taskId: 'unique-task-id',
  error: { /* 错误信息 */ }
});
```

### 5. OCCT 模块在 Worker 中的使用

#### 方案 A：在主线程加载，通过 postMessage 传递（不推荐）

OCCT WASM 模块无法直接通过 postMessage 传递，因为包含函数和复杂对象。

#### 方案 B：在 Worker 中独立加载（推荐）

每个 Worker 独立加载 OCCT 模块：

```typescript
// worker.ts
import { loadOCCTModule } from '../common/occt-loader';

let occtModule: any = null;

self.onmessage = async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'init':
      // 在 Worker 中加载 OCCT 模块
      occtModule = await loadOCCTModule();
      self.postMessage({ type: 'init-complete' });
      break;
      
    case 'task':
      // 使用 occtModule 执行任务
      const result = await performTask(occtModule, data);
      self.postMessage({
        type: 'task-complete',
        taskId: data.taskId,
        result
      });
      break;
      
    case 'terminate':
      // 清理资源
      occtModule = null;
      self.close();
      break;
  }
};
```

### 6. 示例：使用 Worker 的案例

```typescript
// cases/heavy-computation/index.ts
import { Case, CaseContext } from '../../router';

let renderer: ThreeRenderer | null = null;

async function load(context: CaseContext): Promise<void> {
  const { container, occtModule } = context;
  
  // 创建 Worker（如果需要）
  if (needsHeavyComputation) {
    context.worker = new Worker(
      new URL('./worker.ts', import.meta.url),
      { type: 'module' }
    );
    
    context.worker.onmessage = (event) => {
      const { type, result } = event.data;
      if (type === 'mesh-complete') {
        // 更新 Three.js 场景
        updateScene(result);
      }
    };
    
    // 初始化 Worker
    context.worker.postMessage({ type: 'init' });
    
    // 发送计算任务
    context.worker.postMessage({
      type: 'compute-mesh',
      data: { shape: /* ... */ }
    });
  } else {
    // 不使用 Worker，直接在主线程计算
    // ...
  }
}

async function unload(context: CaseContext): Promise<void> {
  if (context.worker) {
    context.worker.terminate();
    context.worker = undefined;
  }
  
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
}

export const heavyComputationCase: Case = {
  id: 'heavy-computation',
  name: 'Heavy Computation',
  load,
  unload,
};
```

## 注意事项

1. **Worker 中的 OCCT 模块**：每个 Worker 需要独立加载 OCCT 模块，会增加内存占用
2. **数据传输**：主线程和 Worker 之间的数据传输需要通过 postMessage，只能传递可序列化的数据
3. **性能权衡**：不是所有案例都需要 Worker，只有计算密集型任务才需要
4. **错误处理**：需要妥善处理 Worker 中的错误，并传递回主线程
5. **资源清理**：确保在 unload 时正确清理 Worker 和所有资源

## 实现建议

1. **可选 Worker**：通过 `CaseContext.worker` 字段，让案例决定是否使用 Worker
2. **Worker 工具类**：可以创建一个 `WorkerManager` 工具类来管理 Worker 的生命周期
3. **类型安全**：定义 Worker 消息的类型，确保类型安全
4. **错误恢复**：实现 Worker 崩溃时的恢复机制

## 未来扩展

- Worker Pool：复用 Worker 实例，减少创建/销毁开销
- SharedArrayBuffer：如果浏览器支持，可以使用共享内存提高性能
- OffscreenCanvas：在 Worker 中直接渲染，减少主线程负担
