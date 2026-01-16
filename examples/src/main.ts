import { router } from './router';
import { basicShapesCase } from './cases/basic-shapes';
import { boxShowCase } from './cases/box-show';
import { loadOCCTModule } from './common/occt-loader';

// 注册案例
router.register(basicShapesCase);
router.register(boxShowCase);
// 初始化应用
async function initApp() {
  const container = document.getElementById('viewer-container')!;
  const caseList = document.getElementById('case-list')!;

  if (!container || !caseList) {
    console.error('Required DOM elements not found');
    return;
  }

  // 显示加载提示
  container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 18px;">Loading OCCT module...</div>';

  try {
    // 全局加载 OCCT 模块（只加载一次）
    console.log('[App] Loading OCCT module...');
    const occtModule = await loadOCCTModule();
    console.log('[App] OCCT module loaded:', occtModule ? 'module exists' : 'module is null');
    
    if (!occtModule) {
      throw new Error('Failed to load OCCT module: module is null or undefined');
    }
    
    // 设置到 router
    console.log('[App] Setting OCCT module to router...');
    router.setOCCTModule(occtModule);
    console.log('[App] OCCT module set to router');
    
    // 验证设置是否成功
    if (!router.isOCCTModuleLoaded()) {
      throw new Error('Failed to set OCCT module to router');
    }
    console.log('[App] OCCT module verified in router');

    // 渲染案例列表
    renderCaseList();

    // 默认加载第一个案例
    const cases = router.getAllCases();
    console.log('[App] Total cases:', cases.length);
    if (cases.length > 0) {
      const firstCase = cases[0];
      console.log('[App] Loading first case:', firstCase.id);
      const firstItem = caseList.querySelector(`[data-case-id="${firstCase.id}"]`);
      if (firstItem) {
        firstItem.classList.add('active');
        console.log('[App] Navigating to first case...');
        await router.navigateTo(firstCase.id, container);
        console.log('[App] First case loaded');
      } else {
        console.warn('[App] First case item not found in DOM');
      }
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
    container.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error instanceof Error ? error.message : String(error)}</div>`;
  }

  function renderCaseList() {
    const cases = router.getAllCases();
    caseList.innerHTML = cases
      .map(
        (caseItem) => `
      <div class="case-item" data-case-id="${caseItem.id}">
        <h3>${caseItem.name}</h3>
        ${caseItem.description ? `<p>${caseItem.description}</p>` : ''}
      </div>
    `
      )
      .join('');

    // 添加点击事件
    caseList.querySelectorAll('.case-item').forEach((item) => {
      item.addEventListener('click', async () => {
        const caseId = item.getAttribute('data-case-id');
        if (caseId) {
          // 更新选中状态
          caseList.querySelectorAll('.case-item').forEach((i) => {
            i.classList.remove('active');
          });
          item.classList.add('active');

          // 导航到案例
          try {
            await router.navigateTo(caseId, container);
          } catch (error) {
            console.error('Failed to navigate to case:', error);
            container.innerHTML = `<div style="color: red; padding: 20px;">Error: ${error instanceof Error ? error.message : String(error)}</div>`;
          }
        }
      });
    });
  }
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
