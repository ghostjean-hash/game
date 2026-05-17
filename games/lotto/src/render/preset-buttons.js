// 프리셋 3슬롯 버튼. SSOT: docs/01_spec.md 5.1.5 (S36, 2026-05-08).
// S36.2 (2026-05-08): UX 정돈 - 타이틀 / ✏ 박스 / 칩 폐기.
// S61 (2026-05-10): 추첨 탭의 "편집" 텍스트 링크 폐기. 편집 진입은 설정 탭 - 프리셋 관리로 일원화.
// S63 (2026-05-10): 사용자 입력 부제 → 묶인 전략 label list 자동 표시. "애매한 설명"보다 정직한 노출.
import { PRESET_SLOT_COUNT } from '../data/numbers.js';
import { strategyLabel } from './strategy-picker.js';
import { strategyTagColor } from '../data/colors.js';

/**
 * 프리셋 3슬롯 버튼 HTML.
 * @param {Array} presets 프리셋 배열 [{id, label, subtitle, strategyIds}].
 * @param {Array} activeStrategyIds 현재 활성 전략 list. 같은 묶음 = is-active.
 * @returns {string} HTML.
 */
export function presetButtonsHtml(presets, activeStrategyIds) {
  const list = (Array.isArray(presets) ? presets : []).slice(0, PRESET_SLOT_COUNT);
  while (list.length < PRESET_SLOT_COUNT) list.push(null);

  const buttons = list.map((p, idx) => {
    if (!p) {
      return `
        <button type="button" class="preset-slot is-empty" disabled aria-label="빈 슬롯 ${idx + 1}">
          <span class="preset-label">슬롯 ${idx + 1}</span>
        </button>
      `;
    }
    const active = isSamePresetActive(p.strategyIds, activeStrategyIds);
    // S63 (2026-05-10): 묶인 전략 label list 자동 표시 (예: "최신 · 별자리 · 직감").
    // S79 (2026-05-17): 각 학설 label 앞에 색점 (strategyTagColor). 설정 무관 = 항상 표시.
    const sids = Array.isArray(p.strategyIds) ? p.strategyIds : [];
    const strategyLineAria = sids.map((sid) => strategyLabel(sid)).filter(Boolean).join(' · ');
    const strategyTokens = sids.map((sid) => {
      const label = strategyLabel(sid);
      if (!label) return '';
      const color = strategyTagColor(sid);
      return `<span class="preset-strategy-token"><span class="preset-strategy-dot" style="background-color:${color};" aria-hidden="true"></span>${escapeHtml(label)}</span>`;
    }).filter(Boolean).join('<span class="preset-strategy-sep" aria-hidden="true"> · </span>');
    return `
      <button type="button"
              class="preset-slot${active ? ' is-active' : ''}"
              data-preset-id="${p.id}"
              data-action="preset-pick"
              aria-pressed="${active ? 'true' : 'false'}"
              aria-label="${escapeHtml(p.label)} - ${escapeHtml(strategyLineAria)}">
        <span class="preset-label">${escapeHtml(p.label || '')}</span>
        ${strategyTokens ? `<span class="preset-strategy-line">${strategyTokens}</span>` : ''}
      </button>
    `;
  }).join('');

  return `
    <section class="preset-section" aria-label="추천 프리셋">
      <div class="preset-list" role="group">${buttons}</div>
    </section>
  `;
}

function isSamePresetActive(presetIds, activeIds) {
  if (!Array.isArray(presetIds) || !Array.isArray(activeIds)) return false;
  if (presetIds.length !== activeIds.length) return false;
  const a = [...presetIds].sort();
  const b = [...activeIds].sort();
  return a.every((id, i) => id === b[i]);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
