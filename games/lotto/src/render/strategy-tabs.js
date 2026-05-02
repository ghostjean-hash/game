// 추첨 전략 가로 스크롤 탭 + 활성 전략 설명 + 카테고리 배지.
// SSOT: docs/01_spec.md 4.7, docs/02_data.md 1.5.2 (카테고리).
// 12개 전략을 가로 일렬로 나열. 폭 초과 시 좌우 스크롤. 클릭 즉시 활성 변경.
// 활성 전략 desc 앞에 카테고리 배지([통계]/[운세 매핑]/[사주]/[랜덤])로 가중치 본질 시각화.
import { STRATEGY_LIST } from './strategy-picker.js';

const CATEGORY_CLASS = {
  '통계': 'is-stats',
  '운세 매핑': 'is-mapping',
  '사주': 'is-saju',
  '랜덤': 'is-random',
};

export function strategyTabsHtml(activeId) {
  const cur = STRATEGY_LIST.find((s) => s.id === activeId) || STRATEGY_LIST[0];
  const tabs = STRATEGY_LIST.map((s) => {
    const isActive = s.id === activeId;
    const catCls = CATEGORY_CLASS[s.category] || '';
    return `
      <button type="button"
              class="strategy-tab${isActive ? ' is-active' : ''} ${catCls}"
              data-strategy-id="${s.id}"
              data-category="${escapeAttr(s.category)}"
              aria-pressed="${isActive ? 'true' : 'false'}"
              title="[${escapeAttr(s.category)}] ${escapeAttr(s.label)}: ${escapeAttr(s.desc)}">
        ${escapeHtml(s.label)}
      </button>
    `;
  }).join('');
  const curCatCls = CATEGORY_CLASS[cur.category] || '';
  return `
    <section class="strategy-tabs-section" aria-label="추첨 전략 선택">
      <div class="strategy-tabs" role="tablist">${tabs}</div>
      <p class="strategy-desc" aria-live="polite">
        <span class="strategy-category ${curCatCls}">${escapeHtml(cur.category)}</span>
        ${escapeHtml(cur.desc)}
      </p>
    </section>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
function escapeAttr(text) { return escapeHtml(text); }
