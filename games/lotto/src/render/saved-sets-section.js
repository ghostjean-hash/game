// 누적 추천 세트 섹션. SSOT: docs/01_spec.md 5.2.5 (신규).
// 메인 카드 아래에 추천1, 추천2 ... 세로 스택. 개별 삭제 + 전체 비우기.
// 비어있으면 섹션 자체 미표시 (UI 노이즈 회피).

import { numberColor, strategyTagColor } from '../data/colors.js';
import { STRATEGY_CATEGORIES } from '../data/numbers.js';
import { strategyShort, strategyLabel } from './strategy-picker.js';

const CATEGORY_TAG_CLASS = {
  stats: 'is-stats',
  mapping: 'is-mapping',
  random: 'is-random',
};

function numHtml(n, source) {
  const c = numberColor(n);
  const sourceCat = source ? STRATEGY_CATEGORIES[source] : null;
  const tagCls = sourceCat ? CATEGORY_TAG_CLASS[sourceCat] : '';
  const short = source ? strategyShort(source) : null;
  const fullLabel = source ? strategyLabel(source) : '';
  const tagBg = source ? strategyTagColor(source) : null;
  const tagHtml = (sourceCat && short)
    ? `<span class="num-source-tag ${tagCls}" style="background-color:${tagBg};" data-source="${source}" aria-label="${fullLabel} 출처" title="${fullLabel}">${short}</span>`
    : '';
  return `<span class="num-cell" role="listitem" aria-label="${n}번">
    <span class="num" style="background-color:${c.bg};">${n}</span>
    ${tagHtml}
  </span>`;
}

/**
 * @param {Array} list character.savedSets.list
 * @returns {string} html. list 비면 빈 문자열.
 */
export function savedSetsSectionHtml(list) {
  if (!Array.isArray(list) || list.length === 0) return '';

  const items = list.map((set, i) => {
    const sources = Array.isArray(set.strategySources) ? set.strategySources : [];
    const ballsHtml = set.numbers.map((n, k) => numHtml(n, sources[k] || null)).join('');
    return `
      <div class="saved-set-row" data-saved-idx="${i}" aria-label="추천${i + 1}">
        <span class="saved-set-idx" aria-hidden="true">추천${i + 1}</span>
        <div class="saved-set-balls" role="list">${ballsHtml}</div>
        <button type="button" class="saved-set-remove" data-action="remove-saved-set" data-saved-idx="${i}" aria-label="추천${i + 1} 삭제" title="삭제">×</button>
      </div>
    `;
  }).join('');

  return `
    <section class="saved-sets-section" aria-label="저장된 추천 세트">
      <header class="saved-sets-header">
        <h2 class="saved-sets-title">저장된 추천 세트 (${list.length})</h2>
        <button type="button" class="saved-sets-clear" data-action="clear-saved-sets" aria-label="저장된 추천 세트 모두 삭제">전체 비우기</button>
      </header>
      <div class="saved-sets-list">${items}</div>
      <p class="saved-sets-disclaimer">비교 / 보관용. 추첨 결과 보장 없음. 회차 전환 시 자동 비워집니다.</p>
    </section>
  `;
}

/**
 * 메인 카드 하단 "+ 1세트 / + 5세트" 버튼.
 * 누적 cap 도달 시 disable.
 */
export function savedSetsAddBarHtml(currentCount, cap) {
  const remain = cap - currentCount;
  const disabledAttr = remain <= 0 ? 'disabled aria-disabled="true"' : '';
  const fiveDisabledAttr = remain < 5 ? 'disabled aria-disabled="true"' : '';
  const hint = remain <= 0
    ? `<span class="saved-add-hint is-cap">최대 ${cap}세트 도달. 일부 삭제 후 추가하세요.</span>`
    : `<span class="saved-add-hint">${remain}세트 더 추가 가능</span>`;
  return `
    <div class="saved-add-bar" aria-label="현재 조립식으로 세트 추가">
      <button type="button" class="saved-add-btn" data-action="add-saved-1" ${disabledAttr}>+ 1세트</button>
      <button type="button" class="saved-add-btn" data-action="add-saved-5" ${fiveDisabledAttr}>+ 5세트</button>
      ${hint}
    </div>
  `;
}
