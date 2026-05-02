// 캐릭터 전적 / 이력 페이지.
// S3-T2: 등수별 막대 차트 + 누적 통계 + 최근 30회 타임라인 추가.
import { characterStats } from '../core/history.js';
import { numberColor } from '../data/colors.js';
import { horizontalBarsHtml } from './charts.js';
import { plus } from './icons.js';

const RANK_LABELS = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등' };
const RANK_COLORS = { 1: '#c9a050', 2: '#b88830', 3: '#10b981', 4: '#06b6d4', 5: '#6b6b75' };
const TIMELINE_RECENT = 30; // 최근 N회 타임라인 길이

function colorNum(n, extraClass = '') {
  const c = numberColor(n);
  const cls = extraClass ? `num ${extraClass}` : 'num';
  return `<span class="${cls}" style="background-color:${c.bg};">${n}</span>`;
}

/**
 * 전적 페이지 렌더. S3-T2 강화 4섹션 구조.
 * @param {HTMLElement} container
 * @param {object} character 활성 캐릭터
 */
export function renderHistoryPage(container, character) {
  const stats = characterStats(character);
  const sortedHistory = [...character.history].sort((a, b) => b.drwNo - a.drwNo);

  const hitRate = stats.settled > 0 ? Math.round((stats.hits / stats.settled) * 1000) / 10 : 0;

  // 누적 요약 (강화 + 적중률 + Luck)
  const summaryHtml = `
    <section class="stats-section">
      <h2 class="stats-title">${escapeHtml(character.name)} 전적</h2>
      <ul class="summary-grid">
        <li><span class="summary-label">총 추천</span><span class="summary-value">${stats.total}</span></li>
        <li><span class="summary-label">발표 완료</span><span class="summary-value">${stats.settled}</span></li>
        <li><span class="summary-label">적중 (3-5등)</span><span class="summary-value">${stats.hits}</span></li>
        <li><span class="summary-label">적중률</span><span class="summary-value">${stats.settled > 0 ? hitRate + '%' : '-'}</span></li>
        <li><span class="summary-label">최고 등수</span><span class="summary-value">${stats.bestRank ? RANK_LABELS[stats.bestRank] : '없음'}</span></li>
        <li><span class="summary-label">Luck</span><span class="summary-value">${character.luck} / 100</span></li>
      </ul>
    </section>
  `;

  // 등수별 분포 차트 (S3-T2)
  const rankItems = [1, 2, 3, 4, 5].map((r) => ({
    label: RANK_LABELS[r],
    value: stats.ranks[r],
    color: RANK_COLORS[r],
  }));
  const missCount = stats.settled - stats.hits;
  if (missCount > 0) {
    rankItems.push({ label: '미적중', value: missCount, color: '#d1d5db' });
  }
  const rankChartHtml = `
    <section class="stats-section">
      <h2 class="stats-title">등수별 분포</h2>
      ${horizontalBarsHtml(rankItems)}
      <p class="stats-note">참고용. 매 회차 독립 시행이므로 누적 분포가 미래 적중률을 보장하지 않습니다.</p>
    </section>
  `;

  // 최근 30회 타임라인 (도트, S3-T2)
  const timelineSrc = sortedHistory.slice(0, TIMELINE_RECENT).reverse(); // 시간 순
  const timelineHtml = timelineSrc.length === 0 ? '' : `
    <section class="stats-section">
      <h2 class="stats-title">최근 ${TIMELINE_RECENT}회 타임라인</h2>
      <div class="timeline-dots" role="list">
        ${timelineSrc.map((h) => timelineDotHtml(h)).join('')}
      </div>
      <div class="timeline-legend">
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_COLORS[1]}"></span>1등</span>
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_COLORS[2]}"></span>2등</span>
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_COLORS[3]}"></span>3등</span>
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_COLORS[4]}"></span>4등</span>
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_COLORS[5]}"></span>5등</span>
        <span class="legend-item"><span class="legend-dot legend-miss"></span>미적중</span>
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
    ${rankChartHtml}
    ${timelineHtml}
    ${historyItems}
  `;
}

function timelineDotHtml(h) {
  const rank = h.matchedRank;
  const color = rank ? RANK_COLORS[rank] : null;
  const cls = rank ? '' : ' is-miss';
  const style = color ? `style="background:${color}"` : '';
  const label = rank ? `${h.drwNo}회 ${RANK_LABELS[rank]}` : `${h.drwNo}회 미적중`;
  return `<span class="timeline-dot${cls}" ${style} role="listitem" title="${label}" aria-label="${label}"></span>`;
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
