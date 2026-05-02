// 캐릭터 슬롯 HTML. 추첨 탭에서는 빠른 전환 전용. 추가/삭제는 설정 탭으로 이동(2.32, T1).

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

  return `
    <section class="character-slots" aria-label="캐릭터 슬롯">
      <div class="slot-list" role="group">${slots}</div>
    </section>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
function escapeAttr(text) { return escapeHtml(text); }
