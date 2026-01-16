import { MainModule } from "public/occt-wasm";
import { GUI } from 'lil-gui'

/**
 * Case 上下文，包含案例运行所需的所有资源
 */
export interface CaseContext {
  container: HTMLElement;
  occtModule: MainModule; // OCCT WASM 模块实例
  gui: GUI;
  worker?: Worker; // 可选的 Worker 实例（未来使用）
}

/**
 * Case 接口 - 统一的案例模版格式
 */
export interface Case {
  id: string;
  name: string;
  description?: string;
  /**
   * 加载案例 - 进入案例时调用
   * @param context 案例上下文，包含 container、occtModule 等
   */
  load: (context: CaseContext) => Promise<void> | void;
  /**
   * 卸载案例 - 切换案例时调用
   * @param context 案例上下文
   */
  unload?: (context: CaseContext) => Promise<void> | void;
}

class Router {
  private cases: Map<string, Case> = new Map();
  private currentCase: Case | null = null;
  private currentContext: CaseContext | null = null;
  private occtModule: any = null; // OCCT 模块实例（全局单例）
  private gui: GUI;

  constructor() {
    this.gui = new GUI({ width: 300 });
  }
  /**
   * 设置 OCCT 模块实例（应用启动时调用）
   */
  setOCCTModule(module: any): void {
    console.log('[Router] Setting OCCT module:', module ? 'module exists' : 'module is null');
    this.occtModule = module;
    console.log('[Router] OCCT module set, current value:', this.occtModule ? 'exists' : 'null');
  }

  /**
   * 注册案例
   */
  register(caseItem: Case): void {
    this.cases.set(caseItem.id, caseItem);
  }

  /**
   * 获取所有案例
   */
  getAllCases(): Case[] {
    return Array.from(this.cases.values());
  }

  /**
   * 切换到指定案例
   */
  async navigateTo(caseId: string, container: HTMLElement): Promise<void> {
    const caseItem = this.cases.get(caseId);
    if (!caseItem) {
      throw new Error(`Case "${caseId}" not found`);
    }

    console.log('[Router] navigateTo called, occtModule:', this.occtModule ? 'exists' : 'null');
    if (!this.occtModule) {
      console.error('[Router] OCCT module is null!');
      throw new Error('OCCT module not loaded. Call setOCCTModule() first.');
    }

    // 卸载当前案例
    if (this.currentCase?.unload && this.currentContext) {
      try {
        await this.currentCase.unload(this.currentContext);
        // 清除 GUI内容
        this.gui.destroy();
        this.gui = new GUI({ width: 300 });
      } catch (error) {
        console.error(`Error unloading case "${this.currentCase.id}":`, error);
      }
    }

    // 清空容器
    container.innerHTML = '';

    // 创建新的上下文
    const context: CaseContext = {
      container,
      occtModule: this.occtModule,
      gui: this.gui,
    };

    // 加载新案例
    this.currentCase = caseItem;
    this.currentContext = context;
    await caseItem.load(context);
  }

  /**
   * 获取当前案例
   */
  getCurrentCase(): Case | null {
    return this.currentCase;
  }

  /**
   * 获取当前上下文
   */
  getCurrentContext(): CaseContext | null {
    return this.currentContext;
  }

  /**
   * 检查 OCCT 模块是否已加载
   */
  isOCCTModuleLoaded(): boolean {
    return this.occtModule !== null && this.occtModule !== undefined;
  }
}

export const router = new Router();
