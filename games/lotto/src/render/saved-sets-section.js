// 누적 추천 세트 섹션. SSOT: docs/01_spec.md 5.2.5 (신규).
// S095 (2026-05-19): row 단위 개별 삭제 폐기. "확정" 텍스트 버튼 → 토글 아이콘(빈 원/채워진 원).
//   사용자 명시 "휴지통 삭제 + 확정을 토글 아이콘으로". 본질 = 한 row에 액션 2개 = 공간 부족.
//   row 단위 삭제 동선은 "+1세트/+5세트 재시도" 또는 "전체 삭제"로 흡수.
// 메인 카드 아래에 1, 2, ... 세로 스택. 액션 = 토글 아이콘 1개만.
// 비어있으면 섹션 자체 미표시 (UI 노이즈 회피).

import { numberColor, strategyTagColor } from '../data/colors.js';
import { STRATEGY_CATEGORIES, SOURCE_DISPLAY_DOT, SOURCE_DISPLAY_LABEL, SOURCE_DISPLAY_OFF, SOURCE_DISPLAY_DEFAULT } from '../data/numbers.js';
import { strategyShort, strategyLabel } from './strategy-picker.js';
import { trash, circleOutline, circleCheck } from './icons.js';

const CATEGORY_TAG_CLASS = {
  stats: 'is-stats',
  mapping: 'is-mapping',
  random: 'is-random',
};

// S77 (2026-05-17): 다중 학설 매칭 시 출처 태그만 색 분할 + 라벨 다글자.
// S79 (2026-05-17): 모드 분기. 'dot' = 색점 N개 나란히 (한글 없음) / 'label' = 한글 머리글자 (옛 동작).
//   번호공(.num)은 6/45 룰 색(numberColor) 단색 유지.
// S088 후속 (2026-05-17): 'off' 모드 추가 = 출처 표시 안 함. 번호공만 노출.
function numHtml(n, sources, mode = SOURCE_DISPLAY_DEFAULT) {
  const list = Array.isArray(sources) ? sources : (sources ? [sources] : []);
  const c = numberColor(n);
  let tagHtml = '';
  if (mode === SOURCE_DISPLAY_DOT) tagHtml = dotHtmlFromSources(list);
  else if (mode === SOURCE_DISPLAY_OFF) tagHtml = '';
  else tagHtml = labelHtmlFromSources(list);
  return `<span class="num-cell" role="listitem" aria-label="${n}번">
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
 * 추천 리스트 섹션. S27: 메인 카드 폐기 후 추천 탭의 유일한 추천 표시 영역.
 * S32 (2026-05-07): poolExhausted 배너 슬롯 추가. SSOT: docs/01_spec.md 5.2.5.4 / docs/02_data.md 1.5.8.6.
 * @param {Array} list character.savedSets.list
 * @param {number} [labelStart=1] 라벨 시작 인덱스. S27 이후 메인 카드 폐기로 1부터 시작.
 * @param {boolean} [poolExhausted=false] 같은 strategyIds로 풀 한계 도달 상태. true면 배너 노출.
 * @returns {string} html. list 비면 빈 상태 안내(추천 탭 빈 화면 회피).
 */
/**
 * S090 (2026-05-17): registeredKeys = Set<string> - 각 세트 numbers.join(',')로 history 등록 여부 판정.
 * S090-후속 7 (2026-05-18): cap 폐기 (사용자 명시 "5개 제한 없애줘"). registerCap 인자 폐기. counter 라벨 단순화.
 */
export function savedSetsSectionHtml(list, labelStart = 1, poolExhausted = false, sourceDisplayMode = SOURCE_DISPLAY_DEFAULT, registeredKeys = null, registerCount = 0) {
  const isEmpty = !Array.isArray(list) || list.length === 0;
  // S32: 풀 한계 배너. 비어있어도 노출 (사용자가 0세트 상태에서 풀 한계 인지 가능).
  const bannerHtml = poolExhausted
    ? `<div class="saved-sets-banner" role="status" aria-live="polite">이 전략 조합으로 만들 수 있는 모든 추천을 가져왔습니다 (총 ${list?.length || 0}세트). 다른 전략을 골라 추가할 수 있어요.</div>`
    : '';

  if (isEmpty) {
    return `
      <section class="saved-sets-section is-empty" aria-label="추천 리스트 (비어있음)">
        ${bannerHtml}
        <p class="saved-sets-empty">아래 프리셋을 고르고 <strong>+ 1세트</strong> 또는 <strong>+ 5세트</strong>로 추천을 받으세요.</p>
      </section>
    `;
  }

  const regSet = registeredKeys instanceof Set ? registeredKeys : new Set();

  const items = list.map((set, i) => {
    // S094 (2026-05-18): 라벨 시각 단축. "추천N" → "N" (영역 확보). aria-label은 의미 보존 "추천N".
    const label = `추천${labelStart + i}`;  // aria/스크린리더 의미 보존
    const shortLabel = `${labelStart + i}`;  // 시각 노출만 단축
    const sources = Array.isArray(set.strategySources) ? set.strategySources : [];
    const ballsHtml = set.numbers.map((n, k) => numHtml(n, sources[k] || null, sourceDisplayMode)).join('');
    // S090-후속 7 (2026-05-18): cap 폐기 = 모든 row 버튼 enabled.
    const key = set.numbers.join(',');
    const isReg = regSet.has(key);
    const regCls = isReg ? ' is-registered' : '';
    // S095 (2026-05-19): "확정" 텍스트 버튼 → 토글 아이콘 (빈 원 / 채워진 원 + ✓).
    //   aria-label은 의미 보존 ("확정" / "확정 취소"). 시각만 아이콘.
    const regBtnAria = isReg ? `${label} 확정 취소` : `${label} 확정`;
    const regBtnTitle = isReg ? '확정 취소' : '내 번호로 확정';
    const regBtnCls = `saved-set-register${isReg ? ' is-registered' : ''}`;
    const regBtnIcon = isReg ? circleCheck('icon icon-toggle') : circleOutline('icon icon-toggle');
    return `
      <div class="saved-set-row${regCls}" data-saved-idx="${i}" aria-label="${label}${isReg ? ' (확정됨)' : ''}">
        <span class="saved-set-idx" aria-hidden="true">${shortLabel}</span>
        <div class="saved-set-balls" role="list">${ballsHtml}</div>
        <button type="button" class="${regBtnCls}" data-action="toggle-register-saved" data-saved-idx="${i}" aria-label="${regBtnAria}" title="${regBtnTitle}" aria-pressed="${isReg ? 'true' : 'false'}">${regBtnIcon}</button>
      </div>
    `;
  }).join('');

  // S090-후속 7 (2026-05-18): 카운터 = 등록 N건 단순 표기 (cap 무관). cap hint 폐기.
  const counterHtml = registerCount > 0
    ? `<span class="saved-sets-register-counter" aria-label="이번 회차 확정 ${registerCount}건">확정 ${registerCount}건</span>`
    : '';

  return `
    <section class="saved-sets-section" aria-label="저장된 추천 세트">
      <header class="saved-sets-header">
        <h2 class="saved-sets-title">추천 리스트 (${list.length})</h2>
        ${counterHtml}
      </header>
      ${bannerHtml}
      <div class="saved-sets-list">${items}</div>
    </section>
  `;
}

/**
 * 추천 리스트 액션 바.
 * S29.1 (2026-05-04): grid 3열 (좌 spacer / 가운데 + 1세트 + 5세트 / 우측 전체 삭제). hint는 두 번째 줄 가운데. (S088 라벨 정정)
 * S32 (2026-05-07): poolExhausted 시 + 버튼 비활성. 우선순위 cap > poolExhausted > 정상.
 * S60 (2026-05-10): 액션바 인라인 토스트 슬롯 폐기. 토스트는 화면 하단 fixed 팝업으로 이동 (main.js flashSavedSetsToast).
 *   SSOT: docs/02_data.md 1.5.8.6.6.
 * S75 (2026-05-16): `presetSelected` 인자 신설. false면 + 버튼 disabled + "프리셋을 선택하세요" hint.
 *   사용자 명시 "프리셋이 선택되지 않을 경우 세트 추천이 안 되어야 함" 직접 대응. 우선순위: cap > poolExhausted > presetSelected > 정상.
 * 누적 cap 도달 시 + 버튼 disable. list 비어있으면 전체 삭제 disable.
 */
export function savedSetsAddBarHtml(currentCount, cap, poolExhausted = false, presetSelected = true) {
  const remain = cap - currentCount;
  const capDisabled = remain <= 0;
  const noPreset = !presetSelected;
  // S32 / S75: cap 우선 → poolExhausted → presetSelected → 정상.
  const disabledAttr = (capDisabled || poolExhausted || noPreset) ? 'disabled aria-disabled="true"' : '';
  const fiveDisabledAttr = (remain < 5 || poolExhausted || noPreset) ? 'disabled aria-disabled="true"' : '';
  const clearDisabledAttr = currentCount <= 0 ? 'disabled aria-disabled="true"' : '';
  let hint;
  if (capDisabled) {
    hint = `<span class="saved-add-hint is-cap">최대 ${cap}세트에 도달했습니다 · 일부 삭제 후 추가 가능</span>`;
  } else if (poolExhausted) {
    hint = `<span class="saved-add-hint is-exhausted">전략을 변경하면 추가 가능</span>`;
  } else if (noPreset) {
    hint = `<span class="saved-add-hint is-no-preset">아래 프리셋을 선택하세요</span>`;
  } else {
    hint = `<span class="saved-add-hint">${remain}세트 더 추가 가능</span>`;
  }
  return `
    <div class="saved-add-bar" aria-label="추천 리스트 액션">
      <div class="saved-add-buttons">
        <button type="button" class="saved-add-btn" data-action="add-saved-1" ${disabledAttr}>+ 1세트</button>
        <button type="button" class="saved-add-btn" data-action="add-saved-5" ${fiveDisabledAttr}>+ 5세트</button>
      </div>
      <div class="saved-add-actions">
        <button type="button" class="saved-sets-clear" data-action="clear-saved-sets" aria-label="추천 리스트 모두 삭제" title="전체 삭제" ${clearDisabledAttr}>${trash('icon icon-sm')}<span class="saved-clear-text">전체 삭제</span></button>
      </div>
      ${hint}
    </div>
  `;
}
