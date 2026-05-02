// 행운 의식 게이지 위젯 + 8행위 모달 렌더 (T4).
// SSOT: docs/01_spec.md 5.6, docs/02_data.md 1.19.
import { RITUAL_LIST, RITUAL_GAUGE_MAX, LUCK_BONUS_RITUAL } from '../data/numbers.js';
import { progressRatio, isRitualPerformed } from '../core/ritual.js';
import { showModal } from './modal.js';

/**
 * 추첨 탭 게이지 위젯 HTML.
 * @param {object} state ritual state (ensureCurrentState 적용된 것)
 */
export function ritualWidgetHtml(state) {
  const ratio = progressRatio(state);
  const pct = Math.round(ratio * 100);
  const filled = state.gauge >= RITUAL_GAUGE_MAX;
  const flameClass = filled ? ' is-filled' : '';
  return `
    <section class="ritual-widget${flameClass}" aria-label="행운 의식 게이지 ${pct} / 100">
      <div class="ritual-header">
        <span class="ritual-title">행운 의식</span>
        <span class="ritual-pct">${pct} / 100</span>
      </div>
      <div class="ritual-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <span class="ritual-bar-fill" style="width: ${pct}%;"></span>
        ${filled ? '<span class="ritual-flame" aria-hidden="true"></span>' : ''}
      </div>
      <div class="ritual-actions">
        <button type="button" class="btn-secondary" data-action="open-ritual">
          ${filled ? '의식 완성 ✓' : '의식 시작'}
        </button>
        <span class="ritual-caption">정성 콘텐츠 / 추첨 확률 영향 없음</span>
      </div>
    </section>
  `;
}

/**
 * 8행위 모달 열기. 행위 클릭 시 onPerform(ritualId) 호출.
 * @param {object} state
 * @param {(ritualId: string) => void} onPerform
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

  const completionBanner = filled
    ? `<div class="ritual-complete-banner" role="status">의식 완성. Luck +${LUCK_BONUS_RITUAL} 부여됨.</div>`
    : '';

  return `
    <div class="ritual-modal" data-role="ritual-modal">
      <h2>행운 의식</h2>
      <p class="ritual-intro">8가지 정성 행위로 게이지를 채웁니다. 회차 1회 한정. <strong>당첨 확률에는 영향이 없으며</strong> 만땅 시 캐릭터 Luck +${LUCK_BONUS_RITUAL}이 1회 적용됩니다.</p>
      ${completionBanner}
      <div class="ritual-grid" role="group">${cards}</div>
      <p class="ritual-disclaimer">본 콘텐츠는 정성 / 캐릭터 정체성 강화 목적이며, 실제 미신 행위를 권유하지 않습니다.</p>
    </div>
  `;
}

function attachRitualHandlers(state, onPerform, closeFn) {
  const modal = document.querySelector('[data-role="ritual-modal"]');
  if (!modal) return;
  modal.querySelectorAll('[data-ritual-id]').forEach((el) => {
    el.addEventListener('click', () => {
      if (el.disabled) return;
      const ritualId = el.dataset.ritualId;
      // 클릭 즉시 시각 애니메이션 트리거 (CSS .is-performing 1s).
      el.classList.add('is-performing');
      setTimeout(() => {
        // 1초 후 onPerform 호출 → 게이지 갱신 + 재렌더로 모달 다시 그림
        onPerform(ritualId);
      }, 800);
    });
  });
}
