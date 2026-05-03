// 추천 번호 패널. SSOT: docs/01_spec.md 5.2.1.
// S20(2026-05-02): 추천에서 보너스 번호 폐기 (실제 로또 구매 시 사용자는 6개만 선택).
//   UI = 본번호 6개 + "추천N" 라벨 (앞쪽). 보너스 그리드 / "추천번호·보너스번호" 라벨 폐기.
//   데이터 차원 rec.bonus는 매칭 호환 위해 유지(미표시).
// S3-T1 / S22(2026-05-03): 다중 전략 모드면 본번호 아래 출처 표시.
//   S3-T1 = 카테고리 색 dot. S22 = dot 폐기, 1글자 short 라벨로 교체 (같은 카테고리 안 전략 식별 가능).
import { numberColor, strategyTagColor } from '../data/colors.js';
import { STRATEGY_CATEGORIES } from '../data/numbers.js';
import { strategyShort, strategyLabel } from './strategy-picker.js';

// S10(2026-05-02): saju → mapping 통합. 운세 카테고리 단일 색.
// S22(2026-05-03): tag(1글자 short) 배경색 카테고리 별로 유지.
// S23(2026-05-03): 전략별 색 차등 (계열은 카테고리 hue 유지). 클래스 fallback 유지 +
//   배경은 inline style로 strategyTagColor 적용. SSOT: src/data/colors.js STRATEGY_TAG_COLORS.
const CATEGORY_TAG_CLASS = {
  stats: 'is-stats',
  mapping: 'is-mapping',
  random: 'is-random',
};

function numHtml(n, ariaLabel, source) {
  const c = numberColor(n);
  const label = ariaLabel || `${n}번`;
  const sourceCat = source ? STRATEGY_CATEGORIES[source] : null;
  const tagCls = sourceCat ? CATEGORY_TAG_CLASS[sourceCat] : '';
  const short = source ? strategyShort(source) : null;
  const fullLabel = source ? strategyLabel(source) : '';
  const tagBg = source ? strategyTagColor(source) : null;
  const tagHtml = (sourceCat && short)
    ? `<span class="num-source-tag ${tagCls}" style="background-color:${tagBg};" data-source="${source}" aria-label="${fullLabel} 출처" title="${fullLabel}">${short}</span>`
    : '';
  return `<span class="num-cell" role="listitem" aria-label="${label}">
    <span class="num" style="background-color:${c.bg};">${n}</span>
    ${tagHtml}
  </span>`;
}

/**
 * @param {number} drwNo
 * @param {object} recommendation
 * @param {string} fortune
 * @param {{ ritualFilled?: boolean }} [opts] S5-T2: 의식 만땅 시 골드 글로우.
 */
export function drawCardHtml(drwNo, recommendation, fortune, opts = {}) {
  const { ritualFilled = false } = opts;
  const sources = recommendation.strategySources || [];
  const mainHtml = recommendation.numbers.map((n, i) => numHtml(n, undefined, sources[i] || null)).join('');
  const isBad = fortune === 'bad';
  const isGreat = fortune === 'great';
  const ritualCls = ritualFilled ? ' is-blessed-ritual' : '';
  const cardClass = `draw-card${isBad ? ' is-bad' : ''}${isGreat ? ' is-great' : ''}${ritualCls}`;
  const banner = isBad
    ? '<p class="draw-banner is-bad">흉일. 방어 모드 권장 - 이번 회차는 신중히.</p>'
    : isGreat
    ? '<p class="draw-banner is-great">대길. 캐릭터 운세 최상.</p>'
    : '';
  return `
    <section class="${cardClass}" aria-label="제${drwNo}회 추천 번호">
      ${banner}
      <div class="draw-panel">
        <div class="draw-row">
          <span class="draw-row-idx" aria-hidden="true">추천1</span>
          <div class="draw-main" role="list" aria-label="추천 본번호">${mainHtml}</div>
        </div>
      </div>
    </section>
  `;
}

/**
 * S4-T1: 5세트 컴팩트 카드 (#2~#5). SSOT: docs/01_spec.md 5.1.3.2.
 * 메인 카드(#1)는 drawCardHtml로 별도 렌더. 본 함수는 후속 sets.length-1장만.
 * 라벨 / 배너 / 운세 외곽 없음. 인덱스 + 번호줄 + 보너스만.
 * @param {Array<{numbers: number[], bonus: number, strategySources?: string[]}>} sets
 * @param {Array<{bestRank: number|null, bestRankCount: number}|null>} [matchInfos]
 *   S5-T1: sets와 동일 길이의 reverseSearch 결과(또는 null). 인덱스 0은 무시(메인 #1은 hero).
 */
export function fiveSetsExtraHtml(sets, matchInfos = null) {
  if (!Array.isArray(sets) || sets.length <= 1) return '';
  const extras = sets.slice(1);
  const infos = Array.isArray(matchInfos) ? matchInfos.slice(1) : [];
  const items = extras.map((rec, i) => {
    const idx = i + 2; // 표시용 (추천2부터)
    const sources = rec.strategySources || [];
    const balls = rec.numbers.map((n, k) => numHtml(n, undefined, sources[k] || null)).join('');
    const info = infos[i] || null;
    const chip = info
      ? (info.bestRank
        ? `<span class="five-set-chip has-rank" title="과거 회차 매칭 횟수">과거 최고 ${info.bestRank}등 · ${info.bestRankCount}회</span>`
        : '<span class="five-set-chip" title="과거 회차 매칭 없음">과거 매칭 없음</span>')
      : '';
    // S20: 보너스 영역 제거. "#N" → "추천N".
    return `
      <div class="five-set-row" aria-label="추천 세트 ${idx}번">
        <span class="five-set-idx" aria-hidden="true">추천${idx}</span>
        <div class="five-set-balls" role="list">
          <div class="five-set-main" role="list" aria-label="추천${idx} 본번호">${balls}</div>
        </div>
        ${chip}
      </div>
    `;
  }).join('');
  return `
    <section class="five-sets-extra" aria-label="추가 추천 세트 ${extras.length}장">
      ${items}
      <p class="five-sets-disclaimer">5세트는 '한 회차의 다양한 시도'를 보여주는 콘텐츠입니다. 5장 구매 권유가 아니며, 당첨 확률 변화도 없습니다. 과거 매칭 횟수는 미래 적중률과 무관합니다.</p>
    </section>
  `;
}
