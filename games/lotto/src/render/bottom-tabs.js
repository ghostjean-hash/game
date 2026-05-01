// 하단 탭 네비게이션. SSOT: docs/01_spec.md 4장.
// 탭 5개: 추첨 / 통계 / 전적 / 휠링 / 설정.
import { sparkles, barChart, clock, grid, gear } from './icons.js';

export const TABS = Object.freeze([
  { id: 'home', label: '추첨', short: '추첨', icon: sparkles },
  { id: 'stats', label: '통계', short: '통계', icon: barChart },
  { id: 'history', label: '전적', short: '전적', icon: clock },
  { id: 'wheeling', label: '휠링', short: '휠링', icon: grid },
  { id: 'settings', label: '설정', short: '설정', icon: gear },
]);

/**
 * 하단 탭 HTML.
 * @param {string} activeTab 현재 활성 탭 id
 */
export function bottomTabsHtml(activeTab) {
  const items = TABS.map((t) => {
    const isActive = t.id === activeTab;
    return `
      <button type="button"
              class="tab-item${isActive ? ' is-active' : ''}"
              data-tab-id="${t.id}"
              role="tab"
              aria-selected="${isActive ? 'true' : 'false'}"
              aria-label="${t.label} 탭">
        <span class="tab-icon" aria-hidden="true">${t.icon('icon')}</span>
        <span class="tab-label">${t.short}</span>
      </button>
    `;
  }).join('');
  return `<nav class="bottom-tabs" role="tablist" aria-label="주요 화면"><div class="bottom-tabs-inner">${items}</div></nav>`;
}
