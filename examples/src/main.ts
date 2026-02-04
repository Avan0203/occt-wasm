import { router } from './router';
import { basicShapesCase, brepShowCase, exturdeCase, filletChamferCase } from './cases';
import { loadOCCTModule } from './common/occt-loader';

// 注册案例
router.register(basicShapesCase);
router.register(brepShowCase);
router.register(exturdeCase);
router.register(filletChamferCase);
// 初始化应用
async function initApp() {
  const container = document.getElementById('viewer-container')!;
  const caseList = document.getElementById('case-list')!;
  const sidebar = document.getElementById('sidebar')!;
  const sidebarToggle = document.getElementById('sidebar-toggle')!;

  if (!container || !caseList || !sidebar || !sidebarToggle) {
    console.error('Required DOM elements not found');
    return;
  }

  // 初始化侧边栏折叠功能
  initSidebarToggle(sidebar, sidebarToggle, container);

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

    // 初始化hash路由（会自动处理初始hash或加载第一个案例）
    router.initHashRouter(container);
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
          // 更新hash（会触发hashchange事件，由router处理导航）
          router.setHash(caseId);
        }
      });
    });
  }

  function initSidebarToggle(sidebar: HTMLElement, toggle: HTMLElement, viewerContainer: HTMLElement) {
    let isCollapsed = false;

    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // 防止事件冒泡
      isCollapsed = !isCollapsed;
      
      if (isCollapsed) {
        sidebar.classList.add('collapsed');
        toggle.textContent = '›';
        toggle.setAttribute('aria-label', 'Expand sidebar');
      } else {
        sidebar.classList.remove('collapsed');
        toggle.textContent = '‹';
        toggle.setAttribute('aria-label', 'Collapse sidebar');
      }
      
      // 强制设置宽度，确保生效
      if (isCollapsed) {
        sidebar.style.width = '15px';
        sidebar.style.minWidth = '15px';
        sidebar.style.maxWidth = '15px';
      } else {
        sidebar.style.width = '300px';
        sidebar.style.minWidth = '300px';
        sidebar.style.maxWidth = '300px';
      }
    });
  }
}

// DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
