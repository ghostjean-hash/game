// 추첨 전략 카테고리별 그룹 탭 + 활성 전략 설명 + 카테고리 배지.
// SSOT: docs/01_spec.md 4.7.1~4.7.5, docs/02_data.md 1.5.2 (카테고리).
// 11개 전략을 카테고리별 3줄에 그룹화. 줄 순서: 운세 → 랜덤 → 통계.
// 줄 앞 카테고리 라벨 chip + 한 줄 폭 초과 시 wrap. 가로 스크롤 폐기 (S9, 2026-05-02).
// S10(2026-05-02): 운세 매핑 + 사주 → 운세 단일 카테고리 통합.
// S11(2026-05-02): 줄 순서 운세 → 랜덤 → 통계로 변경 (정체성 우선, 객관 통계 후순위).
// S3-T1: 다중 전략 모드(multi=true)면 탭 클릭 = 토글, 활성 N개 표시.
import { STRATEGY_LIST } from './strategy-picker.js';
import { MULTI_STRATEGY_MAX } from '../data/numbers.js';
import { numberColor } from '../data/colors.js';

const CATEGORY_CLASS = {
  '통계': 'is-stats',
  '운세': 'is-mapping',
  '랜덤': 'is-random',
};

// 줄 순서 SSOT: docs/02_data.md 1.5.2 표 순서. 매핑 폐지 / 추가 시 본 배열 동기화.
const CATEGORY_ROW_ORDER = ['운세', '랜덤', '통계'];

/**
 * @param {string | string[]} activeIds 단일 모드면 string, 다중 모드면 string[].
 *   다중 모드 시 배열 순서 = 활성화 순서 (push 순서 보존). 마지막 원소 = 가장 최근 활성.
 * @param {{ multi?: boolean, pool?: number[], poolNote?: string, pairs?: Array<{a:number,b:number,count:number}> }} [opts]
 *   pool: S29.2 / S30.1 - 포커스 전략 1개 풀.
 *   poolNote: S30.3 - 풀 라벨 동적 노트 (짝꿍 키번호 등). 사용자 직관 ↑.
 *   pairs: S31 - 짝꿍 포커스 시 페어 list. 페어 박스 단위로 표시 (pool 대체).
 *
 * S30 (2026-05-04): 포커스 분리. desc 표시 대상 = activeIds 마지막 원소(가장 최근 활성).
 *   토글 ON 시: push로 그 전략이 자동 포커스. 토글 OFF (포커스 전략) 시: filter 후 직전 활성이 자동 포커스.
 *   활성 0개 케이스 없음 (마지막 1개 보존 룰).
 */
export function strategyTabsHtml(activeIds, opts = {}) {
  const multi = opts.multi === true;
  const pool = Array.isArray(opts.pool) ? opts.pool : null;
  const poolNote = typeof opts.poolNote === 'string' ? opts.poolNote : null;
  const pairs = Array.isArray(opts.pairs) ? opts.pairs : null;
  const arr = Array.isArray(activeIds) ? activeIds : [activeIds];
  const activeSet = new Set(arr);
  // S30: 포커스 = 활성 list 마지막 (가장 최근 활성). 빈 배열이면 STRATEGY_LIST[0]로 폴백.
  const focusedId = arr.length > 0 ? arr[arr.length - 1] : null;
  const cur = STRATEGY_LIST.find((s) => s.id === focusedId) || STRATEGY_LIST[0];

  const isAtMax = multi && activeSet.size >= MULTI_STRATEGY_MAX;

  // 카테고리별 그룹화. CATEGORY_ROW_ORDER 순서대로 줄 생성.
  const rows = CATEGORY_ROW_ORDER.map((cat) => {
    const members = STRATEGY_LIST.filter((s) => s.category === cat);
    if (members.length === 0) return '';
    const catCls = CATEGORY_CLASS[cat] || '';
    const tabs = members.map((s) => {
      const isActive = activeSet.has(s.id);
      const isFocused = s.id === focusedId; // S30: 포커스 시각 표시
      const disabled = multi && !isActive && isAtMax;
      return `
        <button type="button"
                class="strategy-tab${isActive ? ' is-active' : ''}${isFocused ? ' is-focused' : ''}${disabled ? ' is-disabled' : ''} ${catCls}"
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

  // S29.2 (2026-05-04): 기존 "다중 전략 모드 · N/6 선택. 분배는 균등(6/N)" 메타 텍스트 폐기.
  //   대체: 활성 전략의 사용 번호 풀을 번호공으로 표시 (사용자 신뢰 + 사행성 회피).
  // S30.1 (2026-05-04): 합집합 → 포커스 전략 1개 풀. 랜덤 카테고리는 호출부에서 pool=null로 미전달.
  //   풀이 비거나 null이면 미표시.
  let poolBlock = '';
  // S31 (2026-05-04): 짝꿍 포커스 시 페어 박스 단위로 표시 (pool 대체).
  //   각 페어 = 두 번호공 + 작은 횟수 라벨. 풀 list보다 "어떤 두 번호가 짝꿍인지" 즉답.
  if (pairs && pairs.length > 0) {
    const pairsHtml = pairs.map(({ a, b, count }) => {
      const ca = numberColor(a);
      const cb = numberColor(b);
      return `
        <span class="strategy-pool-pair" role="listitem" aria-label="${a}번 ${b}번 짝꿍 ${count}회">
          <span class="strategy-pool-num" style="background-color:${ca.bg};">${a}</span>
          <span class="strategy-pool-num" style="background-color:${cb.bg};">${b}</span>
          <span class="strategy-pool-pair-count" aria-hidden="true">${count}회</span>
        </span>
      `;
    }).join('');
    poolBlock = `
      <div class="strategy-pool" aria-label="짝꿍 페어 목록">
        <span class="strategy-pool-label">짝꿍 페어 · ${pairs.length}쌍</span>
        <div class="strategy-pool-pairs" role="list">${pairsHtml}</div>
      </div>
    `;
  } else if (pool && pool.length > 0) {
    const poolNumsHtml = pool.map((n) => {
      const c = numberColor(n);
      return `<span class="strategy-pool-num" style="background-color:${c.bg};" aria-label="${n}번">${n}</span>`;
    }).join('');
    // S30.3: poolNote가 있으면 라벨에 결합 → "사용 풀 · 18개 (키번호 7번과 자주 함께)"
    const noteSuffix = poolNote ? ` · ${escapeHtml(poolNote)}` : '';
    const sizeSuffix = `${pool.length}개`;
    poolBlock = `
      <div class="strategy-pool" aria-label="포커스 전략 사용 번호 풀">
        <span class="strategy-pool-label">사용 풀 · ${sizeSuffix}${noteSuffix}</span>
        <div class="strategy-pool-list" role="list">${poolNumsHtml}</div>
      </div>
    `;
  }

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
      ${poolBlock}
    </section>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
function escapeAttr(text) { return escapeHtml(text); }
