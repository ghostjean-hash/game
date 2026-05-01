// 캐릭터 전적 / 이력 페이지.
import { characterStats } from '../core/history.js';
import { numberColor } from '../data/colors.js';
import { plus } from './icons.js';

const RANK_LABELS = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등' };
const RANK_COLORS = { 1: '#c9a050', 2: '#b88830', 3: '#10b981', 4: '#06b6d4', 5: '#6b6b75' };

function colorNum(n, extraClass = '') {
  const c = numberColor(n);
  const cls = extraClass ? `num ${extraClass}` : 'num';
  return `<span class="${cls}" style="background-color:${c.bg};">${n}</span>`;
}

/**
 * 전적 페이지 렌더 (탭 모델: 백버튼 없음, 헤더는 sticky 탭 영역).
 * @param {HTMLElement} container
 * @param {object} character 활성 캐릭터
 */
export function renderHistoryPage(container, character) {
  const stats = characterStats(character);
  const sortedHistory = [...character.history].sort((a, b) => b.drwNo - a.drwNo);

  const summaryHtml = `
    <section class="stats-section">
      <h2 class="stats-title">${escapeHtml(character.name)} 전적</h2>
      <ul class="summary-grid">
        <li><span class="summary-label">총 추천</span><span class="summary-value">${stats.total}</span></li>
        <li><span class="summary-label">발표 완료</span><span class="summary-value">${stats.settled}</span></li>
        <li><span class="summary-label">적중 (3-5등)</span><span class="summary-value">${stats.hits}</span></li>
        <li><span class="summary-label">최고 등수</span><span class="summary-value">${stats.bestRank ? RANK_LABELS[stats.bestRank] : '없음'}</span></li>
      </ul>
      <div class="rank-counts">
        ${[1,2,3,4,5].map((r) => `
          <span class="rank-chip" style="color: ${RANK_COLORS[r]}; border-color: ${RANK_COLORS[r]}80;">
            ${RANK_LABELS[r]} <strong>${stats.ranks[r]}</strong>
          </span>
        `).join('')}
      </div>
    </section>
  `;

  const historyItems = sortedHistory.length === 0
    ? '<section class="empty-state"><p>추천 이력이 없습니다. 추첨 탭에서 추천 카드를 보면 자동으로 기록됩니다.</p></section>'
    : `<section class="stats-section">
        <h2 class="stats-title">이력 (${sortedHistory.length}건, 최근 회차순)</h2>
        <div class="history-list">
          ${sortedHistory.map((h) => historyItemHtml(h)).join('')}
        </div>
      </section>`;

  container.innerHTML = `
    <header class="app-header tab-header">
      <h1 class="app-title">전적</h1>
    </header>
    ${summaryHtml}
    ${historyItems}
  `;
}

function historyItemHtml(h) {
  const rank = h.matchedRank;
  const rankLabel = rank ? RANK_LABELS[rank] : (rank === null ? '미적중 / 미발표' : '-');
  const rankColor = rank ? RANK_COLORS[rank] : 'var(--color-text-dim)';
  const numsHtml = h.numbers.map((n) => colorNum(n, 'history-num')).join('');
  const bonusHtml = colorNum(h.bonus, 'history-bonus');
  return `
    <article class="history-item">
      <header class="history-header">
        <span class="history-drw">${h.drwNo}회차</span>
        <span class="history-rank" style="color: ${rankColor}">${rankLabel}</span>
      </header>
      <div class="history-numbers">${numsHtml} <span class="draw-plus" aria-hidden="true">${plus('icon icon-sm')}</span> ${bonusHtml}</div>
    </article>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
