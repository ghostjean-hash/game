// 캐릭터 슬롯 HTML. 캐릭터 정체성(이름)만 표시. 전략은 별도 picker.
import { plus, close } from './icons.js';

export function characterSlotsHtml(characters, activeId) {
  const slots = characters.map((c) => {
    const isActive = c.id === activeId;
    const initial = (c.name || '?').slice(0, 1);
    return `
      <button type="button" class="slot${isActive ? ' is-active' : ''}"
              data-slot-id="${escapeAttr(c.id)}"
              aria-pressed="${isActive ? 'true' : 'false'}"
              aria-label="${escapeAttr(c.name)} 캐릭터로 전환"
              title="${escapeAttr(c.name)}">
        <span class="slot-class" aria-hidden="true">${escapeHtml(initial)}</span>
        <span class="slot-name">${escapeHtml(c.name)}</span>
      </button>
    `;
  }).join('');

  const canDelete = characters.length > 1;

  return `
    <section class="character-slots" aria-label="캐릭터 슬롯">
      <div class="slot-list" role="group">${slots}</div>
      <div class="slot-actions">
        <button type="button" class="slot-add" data-action="add-character" aria-label="새 캐릭터 추가">${plus()}</button>
        <button type="button" class="slot-del" data-action="delete-active" ${!canDelete ? 'disabled' : ''} aria-label="활성 캐릭터 삭제">${close()}</button>
      </div>
    </section>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
function escapeAttr(text) { return escapeHtml(text); }
