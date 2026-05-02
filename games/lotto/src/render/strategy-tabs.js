// 추첨 전략 카테고리별 그룹 탭 + 활성 전략 설명 + 카테고리 배지.
// SSOT: docs/01_spec.md 4.7.1~4.7.5, docs/02_data.md 1.5.2 (카테고리).
// 11개 전략을 카테고리별 3줄에 그룹화. 줄 순서: 운세 → 랜덤 → 통계.
// 줄 앞 카테고리 라벨 chip + 한 줄 폭 초과 시 wrap. 가로 스크롤 폐기 (S9, 2026-05-02).
// S10(2026-05-02): 운세 매핑 + 사주 → 운세 단일 카테고리 통합.
// S11(2026-05-02): 줄 순서 운세 → 랜덤 → 통계로 변경 (정체성 우선, 객관 통계 후순위).
// S3-T1: 다중 전략 모드(multi=true)면 탭 클릭 = 토글, 활성 N개 표시.
import { STRATEGY_LIST } from './strategy-picker.js';
import { MULTI_STRATEGY_MAX } from '../data/numbers.js';

const CATEGORY_CLASS = {
  '통계': 'is-stats',
  '운세': 'is-mapping',
  '랜덤': 'is-random',
};

// 줄 순서 SSOT: docs/02_data.md 1.5.2 표 순서. 매핑 폐지 / 추가 시 본 배열 동기화.
const CATEGORY_ROW_ORDER = ['운세', '랜덤', '통계'];

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

  // 카테고리별 그룹화. CATEGORY_ROW_ORDER 순서대로 줄 생성.
  const rows = CATEGORY_ROW_ORDER.map((cat) => {
    const members = STRATEGY_LIST.filter((s) => s.category === cat);
    if (members.length === 0) return '';
    const catCls = CATEGORY_CLASS[cat] || '';
    const tabs = members.map((s) => {
      const isActive = activeSet.has(s.id);
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
    return `
      <div class="strategy-row ${catCls}" role="group" aria-label="${escapeAttr(cat)} 카테고리 전략">
        <span class="strategy-row-label" aria-hidden="true">${escapeHtml(cat)}</span>
        <div class="strategy-row-tabs" role="tablist">${tabs}</div>
      </div>
    `;
  }).join('');

  const curCatCls = CATEGORY_CLASS[cur.category] || '';

  // 다중 모드 표시: "N / MAX 선택. 토글로 변경"
  const multiHint = multi
    ? `<p class="strategy-multi-hint">다중 전략 모드 · ${activeSet.size} / ${MULTI_STRATEGY_MAX} 선택. 분배는 균등 (6 / N).</p>`
    : '';

  // S15(2026-05-02): 학설 기반 재작성 후 면책 톤 변경. 출처 + 비과학 + 보장 없음 3축 명시.
  // S16(2026-05-02): 운세 카테고리 전략별 variability chip ("주간 변경" / "평생 동일").
  const isMappingCat = cur.category === '운세';
  const STRATEGY_VARIABILITY = {
    astrologer: 'lifetime',     // 출생 별자리 = 평생 동일
    zodiacElement: 'lifetime',  // 출생 별자리 4원소 = 평생 동일
    fiveElements: 'weekly',     // 출생 일주 + 추첨일 일진 보너스 (S16) = 주간 변경
  };
  const variabilityKind = STRATEGY_VARIABILITY[cur.id];
  const variabilityChip = variabilityKind
    ? `<span class="strategy-variability strategy-variability-${variabilityKind}">${variabilityKind === 'weekly' ? '주간 변경' : '평생 동일'}</span>`
    : '';
  const mappingNote = isMappingCat
    ? `<p class="strategy-mapping-note">${variabilityChip} 전통 학설 출처 (점성술 / 河圖數) · 학설 자체는 과학 검증 없음 · 추첨 결과 보장 없음</p>`
    : '';

  return `
    <section class="strategy-tabs-section${multi ? ' is-multi' : ''}" aria-label="추첨 전략 선택">
      <div class="strategy-tabs">${rows}</div>
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
