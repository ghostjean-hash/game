// 단순 막대 차트 헬퍼. 외부 lib 없음. 순수 HTML / CSS.

/**
 * 가로 막대 차트.
 * @param {Array<{ label: string, value: number, color?: string }>} items
 * @returns {string} HTML
 */
export function horizontalBarsHtml(items) {
  if (!items.length) return '<div class="bar-empty">데이터 없음</div>';
  const max = items.reduce((m, x) => Math.max(m, x.value), 1);
  const rows = items.map((it) => {
    const ratio = (it.value / max) * 100;
    const color = it.color || 'var(--color-accent)';
    return `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(it.label)}</div>
        <div class="bar-track"><span class="bar-fill" style="width: ${ratio}%; background: ${color};"></span></div>
        <div class="bar-value">${it.value}</div>
      </div>
    `;
  }).join('');
  return `<div class="bar-chart">${rows}</div>`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
