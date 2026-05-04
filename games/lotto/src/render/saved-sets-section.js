// 누적 추천 세트 섹션. SSOT: docs/01_spec.md 5.2.5 (신규).
// 메인 카드 아래에 추천1, 추천2 ... 세로 스택. 개별 삭제 + 전체 비우기.
// 비어있으면 섹션 자체 미표시 (UI 노이즈 회피).

import { numberColor, strategyTagColor } from '../data/colors.js';
import { STRATEGY_CATEGORIES } from '../data/numbers.js';
import { strategyShort, strategyLabel } from './strategy-picker.js';
import { trash } from './icons.js';

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
 * 추천 리스트 섹션. S27: 메인 카드 폐기 후 추첨 탭의 유일한 추천 표시 영역.
 * @param {Array} list character.savedSets.list
 * @param {number} [labelStart=1] 라벨 시작 인덱스. S27 이후 메인 카드 폐기로 1부터 시작.
 *   SSOT: docs/01_spec.md 5.2.5.
 * @returns {string} html. list 비면 빈 상태 안내(추첨 탭 빈 화면 회피).
 */
export function savedSetsSectionHtml(list, labelStart = 1) {
  if (!Array.isArray(list) || list.length === 0) {
    return `
      <section class="saved-sets-section is-empty" aria-label="추천 리스트 (비어있음)">
        <p class="saved-sets-empty">아래 전략을 골라 조립식을 만든 뒤 <strong>+ 1세트</strong> 또는 <strong>+ 5세트</strong>로 추천을 추가하세요.</p>
      </section>
    `;
  }

  const items = list.map((set, i) => {
    const label = `추천${labelStart + i}`;
    const sources = Array.isArray(set.strategySources) ? set.strategySources : [];
    const ballsHtml = set.numbers.map((n, k) => numHtml(n, sources[k] || null)).join('');
    return `
      <div class="saved-set-row" data-saved-idx="${i}" aria-label="${label}">
        <span class="saved-set-idx" aria-hidden="true">${label}</span>
        <div class="saved-set-balls" role="list">${ballsHtml}</div>
        <button type="button" class="saved-set-remove" data-action="remove-saved-set" data-saved-idx="${i}" aria-label="${label} 삭제" title="삭제">${trash('icon icon-sm')}</button>
      </div>
    `;
  }).join('');

  return `
    <section class="saved-sets-section" aria-label="저장된 추천 세트">
      <header class="saved-sets-header">
        <h2 class="saved-sets-title">추천 리스트 (${list.length})</h2>
      </header>
      <div class="saved-sets-list">${items}</div>
    </section>
  `;
}

/**
 * 추천 리스트 액션 바.
 * S29.1 (2026-05-04): grid 3열 (좌 spacer / 가운데 + 1세트 + 5세트 / 우측 전체 비우기). hint는 두 번째 줄 가운데.
 * 누적 cap 도달 시 + 버튼 disable. list 비어있으면 전체 비우기 disable.
 */
export function savedSetsAddBarHtml(currentCount, cap) {
  const remain = cap - currentCount;
  const disabledAttr = remain <= 0 ? 'disabled aria-disabled="true"' : '';
  const fiveDisabledAttr = remain < 5 ? 'disabled aria-disabled="true"' : '';
  const clearDisabledAttr = currentCount <= 0 ? 'disabled aria-disabled="true"' : '';
  const hint = remain <= 0
    ? `<span class="saved-add-hint is-cap">최대 ${cap}세트 도달. 일부 삭제 후 추가하세요.</span>`
    : `<span class="saved-add-hint">${remain}세트 더 추가 가능</span>`;
  return `
    <div class="saved-add-bar" aria-label="추천 리스트 액션">
      <div class="saved-add-buttons">
        <button type="button" class="saved-add-btn" data-action="add-saved-1" ${disabledAttr}>+ 1세트</button>
        <button type="button" class="saved-add-btn" data-action="add-saved-5" ${fiveDisabledAttr}>+ 5세트</button>
      </div>
      <div class="saved-add-actions">
        <button type="button" class="saved-sets-clear" data-action="clear-saved-sets" aria-label="추천 리스트 모두 삭제" title="전체 비우기" ${clearDisabledAttr}>${trash('icon icon-sm')}<span class="saved-clear-text">전체 비우기</span></button>
      </div>
      ${hint}
    </div>
  `;
}
