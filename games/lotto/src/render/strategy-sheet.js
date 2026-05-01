// 전략 선택 바텀 시트 + 추첨 탭 본문에 표시할 한 줄 요약.
// 기존 strategy-picker(11개 칩 동시 노출)를 대체.
import { STRATEGY_LIST } from './strategy-picker.js';

/**
 * 추첨 탭 본문에 표시할 "전략 ▾ {이름} - {설명}" 한 줄.
 * 클릭 시 시트 오픈.
 */
export function strategyBarHtml(activeId) {
  const cur = STRATEGY_LIST.find((s) => s.id === activeId) || STRATEGY_LIST[0];
  return `
    <button type="button" class="strategy-bar" data-action="open-strategy-sheet" aria-haspopup="dialog" aria-label="전략 선택">
      <span class="strategy-bar-label">전략</span>
      <span class="strategy-bar-name">${escapeHtml(cur.label)}</span>
      <span class="strategy-bar-desc">${escapeHtml(cur.desc)}</span>
      <span class="strategy-bar-caret" aria-hidden="true">▾</span>
    </button>
  `;
}

/**
 * 전략 시트 오픈. 모달 인프라 재사용.
 * @param {(strategyId: string) => void} onSelect
 * @param {string} activeId 현재 활성 전략
 * @param {(html: string) => () => void} showModal modal.showModal 함수
 */
export function openStrategySheet(showModal, activeId, onSelect) {
  const items = STRATEGY_LIST.map((s) => {
    const isActive = s.id === activeId;
    return `
      <button type="button"
              class="sheet-strategy${isActive ? ' is-active' : ''}"
              data-strategy-id="${s.id}"
              aria-pressed="${isActive ? 'true' : 'false'}">
        <span class="sheet-strategy-short" aria-hidden="true">${s.short}</span>
        <span class="sheet-strategy-body">
          <span class="sheet-strategy-name">${escapeHtml(s.label)}</span>
          <span class="sheet-strategy-desc">${escapeHtml(s.desc)}</span>
        </span>
      </button>
    `;
  }).join('');

  const close = showModal(`
    <h2 class="sheet-title">추첨 전략</h2>
    <p class="sheet-help">캐릭터의 정체성과 분리된 추첨 도구. 매 추첨마다 변경 가능.</p>
    <div class="sheet-strategy-list" role="group">${items}</div>
  `, { dismissible: true });

  // 시트 외형 차별화
  const card = document.querySelector('#modal-root .modal-card');
  if (card) card.classList.add('sheet-card');

  // 시트 안 전략 클릭 → 선택 + 시트 닫기
  document.querySelectorAll('#modal-root .sheet-strategy[data-strategy-id]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.strategyId;
      close();
      onSelect(id);
    });
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
