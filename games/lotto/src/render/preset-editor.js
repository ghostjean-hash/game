// 프리셋 편집 모달. SSOT: docs/01_spec.md 5.1.5.2 (S36, 2026-05-08).
// 슬롯 3개 라벨 / 전략 체크리스트 편집. 슬롯 추가 / 삭제 X.
// S63 (2026-05-10): 부제 필드 폐기. 사용자 입력 항목 = 라벨 + 묶음 전략. 묶음 표시는 자동.
// 기본값 복원 버튼 = 첫 진입 데이터로 reset.
import { showModal } from './modal.js';
import { STRATEGY_LIST } from './strategy-picker.js';
import { savePresets } from '../data/storage.js';
import { DEFAULT_PRESETS, PRESET_LABEL_MAX, PRESET_SLOT_COUNT } from '../data/numbers.js';

/**
 * 프리셋 편집 모달 열기.
 * @param {Array} currentPresets 현재 프리셋 (clone 후 편집).
 * @param {Function} onSaved (newPresets) => void. 저장 후 main.js가 state 갱신.
 */
export function openPresetEditor(currentPresets, onSaved) {
  const draft = JSON.parse(JSON.stringify(currentPresets));
  ensureSlots(draft);

  let closeModal;

  function render() {
    const html = `
      <div class="preset-editor">
        <h2 class="preset-editor-title">프리셋 편집</h2>
        <p class="preset-editor-desc">슬롯 ${PRESET_SLOT_COUNT}개. 라벨과 묶을 전략을 선택하세요. 묶음 표시는 자동입니다.</p>
        <div class="preset-editor-list">
          ${draft.slice(0, PRESET_SLOT_COUNT).map((p, idx) => slotEditorHtml(p, idx)).join('')}
        </div>
        <div class="preset-editor-actions">
          <button type="button" class="preset-editor-reset" data-action="reset">기본값 복원</button>
          <div class="preset-editor-actions-right">
            <button type="button" class="preset-editor-cancel" data-action="cancel">취소</button>
            <button type="button" class="preset-editor-save" data-action="save">저장</button>
          </div>
        </div>
      </div>
    `;
    closeModal = showModal(html);
    bind();
  }

  function bind() {
    const root = document.querySelector('.preset-editor');
    if (!root) return;

    root.querySelectorAll('[data-slot-idx]').forEach((slotEl) => {
      const idx = parseInt(slotEl.dataset.slotIdx, 10);
      if (Number.isNaN(idx)) return;

      const labelInput = slotEl.querySelector('[data-field="label"]');
      labelInput?.addEventListener('input', () => {
        draft[idx].label = labelInput.value.slice(0, PRESET_LABEL_MAX);
      });

      slotEl.querySelectorAll('[data-strategy-id]').forEach((cb) => {
        cb.addEventListener('change', () => {
          const sid = cb.dataset.strategyId;
          const set = new Set(draft[idx].strategyIds || []);
          if (cb.checked) set.add(sid);
          else set.delete(sid);
          if (set.size === 0) {
            cb.checked = true;
            return;
          }
          draft[idx].strategyIds = Array.from(set);
        });
      });
    });

    root.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
      const ok = window.confirm('기본 3종 (균형 / 통계파 / 운세파)으로 되돌릴까요?');
      if (!ok) return;
      const fresh = JSON.parse(JSON.stringify(DEFAULT_PRESETS));
      draft.length = 0;
      fresh.forEach((p) => draft.push(p));
      ensureSlots(draft);
      if (closeModal) closeModal();
      render();
    });
    root.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      if (closeModal) closeModal();
    });
    root.querySelector('[data-action="save"]')?.addEventListener('click', () => {
      // S63 (2026-05-10): subtitle 필드 제거. id / label / strategyIds 만 보존.
      //   storage 옛 데이터에 subtitle 잔존해도 다음 save로 자연 소실.
      const cleaned = draft.slice(0, PRESET_SLOT_COUNT).map((p, idx) => ({
        id: p.id || `preset-${idx + 1}`,
        label: (p.label || `슬롯 ${idx + 1}`).slice(0, PRESET_LABEL_MAX),
        strategyIds: Array.isArray(p.strategyIds) && p.strategyIds.length > 0
          ? p.strategyIds
          : [STRATEGY_LIST[0].id],
      }));
      savePresets(cleaned);
      if (closeModal) closeModal();
      if (typeof onSaved === 'function') onSaved(cleaned);
    });
  }

  render();
}

function ensureSlots(draft) {
  while (draft.length < PRESET_SLOT_COUNT) {
    draft.push({
      id: `preset-${draft.length + 1}`,
      label: `슬롯 ${draft.length + 1}`,
      strategyIds: [STRATEGY_LIST[0].id],
    });
  }
}

function slotEditorHtml(preset, idx) {
  const strategySet = new Set(preset.strategyIds || []);
  const groups = groupByCategory(STRATEGY_LIST);
  const strategyChecks = Object.keys(groups).map((cat) => `
    <div class="preset-cat">
      <div class="preset-cat-title">${cat}</div>
      <div class="preset-cat-list">
        ${groups[cat].map((s) => `
          <label class="preset-strategy">
            <input type="checkbox"
                   data-strategy-id="${s.id}"
                   ${strategySet.has(s.id) ? 'checked' : ''} />
            <span>${s.label}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `).join('');

  return `
    <fieldset class="preset-slot-editor" data-slot-idx="${idx}">
      <legend>슬롯 ${idx + 1}</legend>
      <div class="preset-field">
        <label>
          <span>라벨 (${PRESET_LABEL_MAX}자)</span>
          <input type="text"
                 data-field="label"
                 maxlength="${PRESET_LABEL_MAX}"
                 value="${escapeAttr(preset.label || '')}" />
        </label>
      </div>
      <div class="preset-strategies">${strategyChecks}</div>
    </fieldset>
  `;
}

function groupByCategory(list) {
  const out = {};
  list.forEach((s) => {
    const cat = s.category || '기타';
    if (!out[cat]) out[cat] = [];
    out[cat].push(s);
  });
  return out;
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
