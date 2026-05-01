// 추첨 전략 가로 스크롤 탭 + 활성 전략 설명. SSOT: docs/01_spec.md 4.7.
// 11개 전략을 가로 일렬로 나열. 폭 초과 시 좌우 스크롤. 클릭 즉시 활성 변경.
import { STRATEGY_LIST } from './strategy-picker.js';

export function strategyTabsHtml(activeId) {
  const cur = STRATEGY_LIST.find((s) => s.id === activeId) || STRATEGY_LIST[0];
  const tabs = STRATEGY_LIST.map((s) => {
    const isActive = s.id === activeId;
    return `
      <button type="button"
              class="strategy-tab${isActive ? ' is-active' : ''}"
              data-strategy-id="${s.id}"
              aria-pressed="${isActive ? 'true' : 'false'}"
              title="${escapeAttr(s.label)}: ${escapeAttr(s.desc)}">
        ${escapeHtml(s.label)}
      </button>
    `;
  }).join('');
  // 설명 줄에는 desc만. 라벨은 위 활성 탭에 이미 있으므로 중복 제거.
  return `
    <section class="strategy-tabs-section" aria-label="추첨 전략 선택">
      <div class="strategy-tabs" role="tablist">${tabs}</div>
      <p class="strategy-desc" aria-live="polite">${escapeHtml(cur.desc)}</p>
    </section>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
function escapeAttr(text) { return escapeHtml(text); }
