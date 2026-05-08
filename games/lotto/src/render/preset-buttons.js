// 프리셋 3슬롯 버튼 + 편집 진입. SSOT: docs/01_spec.md 5.1.5 (S36, 2026-05-08).
// S36.2 (2026-05-08): UX 정돈 - 타이틀 / ✏ 박스 / 칩 폐기. 슬롯 + 편집 텍스트 링크 단일 구조.
import { PRESET_SLOT_COUNT } from '../data/numbers.js';

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
    return `
      <button type="button"
              class="preset-slot${active ? ' is-active' : ''}"
              data-preset-id="${p.id}"
              data-action="preset-pick"
              aria-pressed="${active ? 'true' : 'false'}"
              aria-label="${escapeHtml(p.label)} - ${escapeHtml(p.subtitle || '')}">
        <span class="preset-label">${escapeHtml(p.label || '')}</span>
        ${p.subtitle ? `<span class="preset-subtitle">${escapeHtml(p.subtitle)}</span>` : ''}
      </button>
    `;
  }).join('');

  return `
    <section class="preset-section" aria-label="추천 프리셋">
      <div class="preset-list" role="group">${buttons}</div>
      <div class="preset-edit-row">
        <button type="button"
                class="preset-edit-link"
                data-action="preset-edit"
                aria-label="프리셋 편집">편집</button>
      </div>
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
