// 추첨 전략 가로 스크롤 탭 + 활성 전략 설명 + 카테고리 배지.
// SSOT: docs/01_spec.md 4.7, docs/02_data.md 1.5.2 (카테고리).
// 12개 전략을 가로 일렬로 나열. 폭 초과 시 좌우 스크롤. 클릭 즉시 활성 변경.
// S3-T1: 다중 전략 모드(multi=true)면 탭 클릭 = 토글, 활성 N개 표시.
import { STRATEGY_LIST } from './strategy-picker.js';
import { MULTI_STRATEGY_MAX } from '../data/numbers.js';

const CATEGORY_CLASS = {
  '통계': 'is-stats',
  '운세 매핑': 'is-mapping',
  '사주': 'is-saju',
  '랜덤': 'is-random',
};

/**
 * @param {string | string[]} activeIds 단일 모드면 string, 다중 모드면 string[]
 * @param {{ multi?: boolean }} [opts]
 */
export function strategyTabsHtml(activeIds, opts = {}) {
  const multi = opts.multi === true;
  const activeSet = new Set(Array.isArray(activeIds) ? activeIds : [activeIds]);
  const firstActive = Array.isArray(activeIds) ? activeIds[0] : activeIds;
  const cur = STRATEGY_LIST.find((s) => s.id === firstActive) || STRATEGY_LIST[0];

  const isAtMax = multi && activeSet.size >= MULTI_STRATEGY_MAX;

  const tabs = STRATEGY_LIST.map((s) => {
    const isActive = activeSet.has(s.id);
    const catCls = CATEGORY_CLASS[s.category] || '';
    // 다중 모드 + 만선 + 비활성 탭 = 클릭 안 됨 표시
    const disabled = multi && !isActive && isAtMax;
    return `
      <button type="button"
              class="strategy-tab${isActive ? ' is-active' : ''}${disabled ? ' is-disabled' : ''} ${catCls}"
              data-strategy-id="${s.id}"
              data-category="${escapeAttr(s.category)}"
              aria-pressed="${isActive ? 'true' : 'false'}"
              ${disabled ? 'aria-disabled="true"' : ''}
              title="[${escapeAttr(s.category)}] ${escapeAttr(s.label)}: ${escapeAttr(s.desc)}">
        ${escapeHtml(s.label)}
      </button>
    `;
  }).join('');
  const curCatCls = CATEGORY_CLASS[cur.category] || '';

  // 다중 모드 표시: "N / MAX 선택. 토글로 변경"
  const multiHint = multi
    ? `<p class="strategy-multi-hint">다중 전략 모드 · ${activeSet.size} / ${MULTI_STRATEGY_MAX} 선택. 분배는 균등 (6 / N).</p>`
    : '';

  // S6-T1: 운세 매핑 / 사주 카테고리는 임의 매핑 면책 1줄.
  const isMappingCat = cur.category === '운세 매핑' || cur.category === '사주';
  const mappingNote = isMappingCat
    ? '<p class="strategy-mapping-note">임의 매핑 · 점성술·명리학 학설과 무관 · 추첨 확률 영향 없음</p>'
    : '';

  return `
    <section class="strategy-tabs-section${multi ? ' is-multi' : ''}" aria-label="추첨 전략 선택">
      <div class="strategy-tabs" role="tablist">${tabs}</div>
      <p class="strategy-desc" aria-live="polite">
        <span class="strategy-category ${curCatCls}">${escapeHtml(cur.category)}</span>
        ${escapeHtml(cur.desc)}
      </p>
      ${mappingNote}
      ${multiHint}
    </section>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
function escapeAttr(text) { return escapeHtml(text); }
