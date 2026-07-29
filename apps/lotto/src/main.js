// 진입점. SSOT: docs/03_architecture.md.
// 첫 진입 시 면책 안내 → 메인 화면.
// 페이지 진입 시 정적 draws.json 동기화 (M6).

import { hasSeenHelp, markSeenHelp, syncDraws } from './data/storage.js';
import { showDisclaimer } from './render/modal.js';
import { initRender } from './render/main.js';

async function boot() {
  const app = document.getElementById('app');
  if (!app) return;

  // draws.json → localStorage 동기화. 실패해도 진행 (빈 데이터).
  await syncDraws().catch(() => {});

  if (!hasSeenHelp()) {
    showDisclaimer(() => {
      markSeenHelp();
      initRender(app);
    });
  } else {
    initRender(app);
  }
}

document.addEventListener('DOMContentLoaded', boot);
