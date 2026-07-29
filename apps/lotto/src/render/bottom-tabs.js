// 하단 탭 네비게이션. SSOT: docs/01_spec.md 4장.
// 탭 5개: 추첨 / 통계 / 역추첨 / 전적 / 설정. 휠링은 다구좌 모드 ON 시 설정 탭에서 진입(T2).
// 역추첨(reverse)는 Sprint 012로 추가. 사용자가 6개 골라 최고 등수 검증.
import { sparkles, barChart, grid, clock, gear } from './icons.js';

// S091 (2026-05-18): 사용자 명시 - 탭 순서 변경(추천/기록/통계/게임/설정) + 라벨 정정(추첨→추천 / 전적→기록 / 역추첨→게임).
export const TABS = Object.freeze([
  { id: 'home', label: '추천', short: '추천', icon: sparkles },
  { id: 'history', label: '기록', short: '기록', icon: clock },
  { id: 'stats', label: '통계', short: '통계', icon: barChart },
  { id: 'reverse', label: '게임', short: '게임', icon: grid },
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
