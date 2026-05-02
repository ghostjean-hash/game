// 행운 쌓기 한 줄 바 + 모달 (T4 / S14, 2026-05-02 시각 단순화).
// SSOT: docs/01_spec.md 5.6, docs/02_data.md 1.19.
// S14: 게이지 바 + % → 한 줄 바 + 8 아이콘 진척도. 라벨 "행운 의식" → "행운 쌓기".
//      모달 상단에 한 줄 바 동일 정보 재표시(배경 가림 보완) + 빈 애니메이션 영역.
import { RITUAL_LIST, RITUAL_GAUGE_MAX, LUCK_BONUS_RITUAL } from '../data/numbers.js';
import { isRitualPerformed } from '../core/ritual.js';
import { showModal } from './modal.js';

const RITUAL_LABEL = '행운 쌓기';

/**
 * 진척도 아이콘 8개 HTML. 수행분만큼 .is-done. SSOT: 01_spec 5.6.4.
 */
function progressIconsHtml(state) {
  return RITUAL_LIST.map((r) => {
    const done = isRitualPerformed(state, r.id);
    return `<span class="ritual-row-icon${done ? ' is-done' : ''}"
                  aria-label="${r.label} ${done ? '수행 완료' : '미수행'}"
                  title="${r.label}">${r.short}</span>`;
  }).join('');
}

/**
 * 추첨 탭 한 줄 바 HTML. 영역 전체가 button.
 * @param {object} state ritual state
 */
export function ritualWidgetHtml(state) {
  const filled = state.gauge >= RITUAL_GAUGE_MAX;
  const filledCls = filled ? ' is-filled' : '';
  const doneCount = (state.performed || []).length;
  const ariaLabel = `${RITUAL_LABEL} ${doneCount} / ${RITUAL_LIST.length}${filled ? ' 완성' : ''}`;
  const bonusChip = filled
    ? `<span class="ritual-row-bonus" aria-hidden="true">+${LUCK_BONUS_RITUAL} 적용</span>`
    : '';
  const ctaLabel = filled ? '완성 ✓' : '시작';
  return `
    <button type="button"
            class="ritual-row${filledCls}"
            data-action="open-ritual"
            aria-label="${ariaLabel}">
      <span class="ritual-row-label">${RITUAL_LABEL}</span>
      <span class="ritual-row-icons" role="list">${progressIconsHtml(state)}</span>
      ${bonusChip}
      <span class="ritual-row-cta" aria-hidden="true">${ctaLabel}</span>
    </button>
  `;
}

/**
 * 8행위 모달 열기. 행위 클릭 시 onPerform(ritualId, animStageEl) 호출.
 * animStageEl은 main.js에서 burst anchor로 사용.
 * @param {object} state
 * @param {(ritualId: string, animStageEl: HTMLElement|null) => void} onPerform
 * @param {() => void} [onClose] 모달 닫힘 시 호출 (메인 재렌더용)
 */
export function openRitualModal(state, onPerform, onClose) {
  const close = showModal(ritualModalHtml(state), { dismissible: true, onClose });
  attachRitualHandlers(state, onPerform, close);
  return close;
}

function ritualModalHtml(state) {
  const filled = state.gauge >= RITUAL_GAUGE_MAX;
  const cards = RITUAL_LIST.map((r) => {
    const done = isRitualPerformed(state, r.id);
    return `
      <button type="button"
              class="ritual-card${done ? ' is-done' : ''}"
              data-ritual-id="${r.id}"
              ${done ? 'disabled' : ''}
              aria-label="${r.label}: ${r.desc}">
        <span class="ritual-card-short" aria-hidden="true">${r.short}</span>
        <span class="ritual-card-label">${r.label}</span>
        <span class="ritual-card-desc">${r.desc}</span>
        ${done ? '<span class="ritual-card-done">완료</span>' : ''}
      </button>
    `;
  }).join('');

  // S14: 모달 상단에 한 줄 바와 동일한 정보 재표시 (배경 가림 보완).
  const bonusChip = filled
    ? `<span class="ritual-row-bonus" aria-hidden="true">+${LUCK_BONUS_RITUAL} 적용</span>`
    : '';
  const headerRow = `
    <div class="ritual-row ritual-row-in-modal${filled ? ' is-filled' : ''}" aria-hidden="true">
      <span class="ritual-row-label">${RITUAL_LABEL}</span>
      <span class="ritual-row-icons" role="list">${progressIconsHtml(state)}</span>
      ${bonusChip}
    </div>
  `;

  const completionBanner = filled
    ? `<div class="ritual-complete-banner" role="status">의식 완성. Luck +${LUCK_BONUS_RITUAL} 부여됨.</div>`
    : '';

  return `
    <div class="ritual-modal" data-role="ritual-modal">
      <h2>${RITUAL_LABEL}</h2>
      ${headerRow}
      <div class="ritual-anim-stage" data-role="ritual-anim-stage" aria-hidden="true"></div>
      ${completionBanner}
      <p class="ritual-intro">8가지 정성 행위로 행운을 쌓습니다. 회차 1회 한정. <strong>당첨 확률에는 영향이 없으며</strong> 만땅 시 캐릭터 Luck +${LUCK_BONUS_RITUAL}이 1회 적용됩니다.</p>
      <div class="ritual-grid" role="group">${cards}</div>
      <p class="ritual-disclaimer">본 콘텐츠는 정성 / 캐릭터 정체성 강화 목적이며, 실제 미신 행위를 권유하지 않습니다.</p>
    </div>
  `;
}

function attachRitualHandlers(state, onPerform, closeFn) {
  const modal = document.querySelector('[data-role="ritual-modal"]');
  if (!modal) return;
  const animStage = modal.querySelector('[data-role="ritual-anim-stage"]');
  modal.querySelectorAll('[data-ritual-id]').forEach((el) => {
    el.addEventListener('click', () => {
      if (el.disabled) return;
      const ritualId = el.dataset.ritualId;
      // 클릭 즉시 시각 애니메이션 트리거 (CSS .is-performing 1s).
      el.classList.add('is-performing');
      setTimeout(() => {
        // 1초 후 onPerform 호출 → 게이지 갱신 + 재렌더로 모달 다시 그림.
        // animStage는 모달 재렌더 전에 캡처해 main.js가 burst anchor로 활용.
        onPerform(ritualId, animStage);
      }, 800);
    });
  });
}
