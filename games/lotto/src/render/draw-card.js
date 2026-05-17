// 추천 번호 패널. SSOT: docs/01_spec.md 5.2.1.
// S20(2026-05-02): 추천에서 보너스 번호 폐기 (실제 로또 구매 시 사용자는 6개만 선택).
//   UI = 본번호 6개 + "추천N" 라벨 (앞쪽). 보너스 그리드 / "추천번호·보너스번호" 라벨 폐기.
//   데이터 차원 rec.bonus는 매칭 호환 위해 유지(미표시).
// S3-T1 / S22(2026-05-03): 다중 전략 모드면 본번호 아래 출처 표시.
//   S3-T1 = 카테고리 색 dot. S22 = dot 폐기, 1글자 short 라벨로 교체 (같은 카테고리 안 전략 식별 가능).
import { numberColor, strategyTagColor } from '../data/colors.js';
import { STRATEGY_CATEGORIES, SOURCE_DISPLAY_DOT, SOURCE_DISPLAY_OFF, SOURCE_DISPLAY_DEFAULT } from '../data/numbers.js';
import { strategyShort, strategyLabel } from './strategy-picker.js';

const CATEGORY_TAG_CLASS = {
  stats: 'is-stats',
  mapping: 'is-mapping',
  random: 'is-random',
};

// S77 (2026-05-17): 다중 학설 매칭 시 출처 태그만 색 분할 + 라벨 다글자.
// S79 (2026-05-17): 모드 분기 (dot / label). 번호공(.num)은 6/45 룰 색 단색 유지.
// S088 후속 (2026-05-17): 'off' 모드 추가 = 출처 표시 안 함. 번호공만 노출.
function numHtml(n, ariaLabel, sources, mode = SOURCE_DISPLAY_DEFAULT) {
  const label = ariaLabel || `${n}번`;
  const c = numberColor(n);
  const list = Array.isArray(sources) ? sources : (sources ? [sources] : []);
  let tagHtml = '';
  if (mode === SOURCE_DISPLAY_DOT) tagHtml = dotHtmlFromSources(list);
  else if (mode === SOURCE_DISPLAY_OFF) tagHtml = '';
  else tagHtml = labelHtmlFromSources(list);
  return `<span class="num-cell" role="listitem" aria-label="${label}">
    <span class="num" style="background-color:${c.bg};">${n}</span>
    ${tagHtml}
  </span>`;
}

function labelHtmlFromSources(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  const shorts = list.map((sid) => strategyShort(sid) || '').filter(Boolean).join('');
  const fullLabels = list.map((sid) => strategyLabel(sid) || sid).join(' · ');
  const firstCat = STRATEGY_CATEGORIES[list[0]] || null;
  const tagCls = firstCat ? CATEGORY_TAG_CLASS[firstCat] : '';
  const tagBg = tagBackgroundFromSources(list);
  return `<span class="num-source-tag ${tagCls}" style="background:${tagBg};" data-sources="${list.join(',')}" aria-label="${fullLabels} 출처" title="${fullLabels}">${shorts}</span>`;
}

function dotHtmlFromSources(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  const fullLabels = list.map((sid) => strategyLabel(sid) || sid).join(' · ');
  const dots = list.map((sid) => {
    const color = strategyTagColor(sid);
    return `<span class="num-source-dot" style="background-color:${color};" data-source="${sid}"></span>`;
  }).join('');
  return `<span class="num-source-dots" data-sources="${list.join(',')}" aria-label="${fullLabels} 출처" title="${fullLabels}">${dots}</span>`;
}

function tagBackgroundFromSources(list) {
  const colors = list.map((sid) => strategyTagColor(sid));
  if (colors.length === 1) return colors[0];
  if (colors.length === 2) return `linear-gradient(90deg, ${colors[0]} 50%, ${colors[1]} 50%)`;
  const stops = [];
  const step = 100 / colors.length;
  colors.forEach((c, i) => {
    const start = (i * step).toFixed(2);
    const end = ((i + 1) * step).toFixed(2);
    stops.push(`${c} ${start}% ${end}%`);
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
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
  // S24 (2026-05-03): 흉/대길 배너 제거. 운세 정보는 캐릭터 카드의 "운세 · 흉/대길"에 이미 노출 - 중복.
  //   카드 외곽 톤(is-bad / is-great)은 유지하여 운세 시각 단서 보존.
  return `
    <section class="${cardClass}" aria-label="제${drwNo}회 추천 번호">
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
