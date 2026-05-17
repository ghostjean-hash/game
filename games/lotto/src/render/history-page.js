// 캐릭터 전적 / 이력 페이지.
// S3-T2: 등수별 막대 차트 + 누적 통계 + 최근 30회 타임라인 추가.
import { characterStats } from '../core/history.js';
import { numberColor, RANK_GLOW_COLORS, RANK_MISS_COLOR } from '../data/colors.js';
import { horizontalBarsHtml } from './charts.js';
// S20: 보너스 표시 폐기로 plus 아이콘 미사용.
// S58 (2026-05-09): RANK 색상 / 미적중 hex 인라인 → colors.js SSOT 위탁.

const RANK_LABELS = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등' };
const TIMELINE_RECENT = 30; // 최근 N회 타임라인 길이

function colorNum(n, extraClass = '') {
  const c = numberColor(n);
  const cls = extraClass ? `num ${extraClass}` : 'num';
  return `<span class="${cls}" style="background-color:${c.bg};">${n}</span>`;
}

/**
 * 전적 페이지 렌더. S3-T2 강화 4섹션 구조 + S090-후속 5섹션 (현재 회차 발표 대기 섹션 추가).
 * @param {HTMLElement} container
 * @param {object} character 활성 캐릭터
 * @param {number} [currentDrwNo] 현재 추첨 회차 (미발표). 본 회차 확정 항목은 "발표 대기" 별도 섹션에 노출.
 */
export function renderHistoryPage(container, character, currentDrwNo = null) {
  const stats = characterStats(character);
  const sortedHistory = [...character.history].sort((a, b) => b.drwNo - a.drwNo);

  // S090-후속 (2026-05-17): 현재 회차 = 미래 회차(미발표) 확정 항목 별도 섹션.
  //   사용자 명시 "이번회차에 선택된것들은 실시간으로 등록되었으면 좋겠는데" 직접 대응.
  //   사용자가 "확정" 누른 직후 본 섹션에 즉시 노출 = 실시간 인지 보장. 발표 후 자동 매칭으로 옛 이력 섹션으로 이동.
  const pendingItems = currentDrwNo
    ? sortedHistory.filter((h) => h.drwNo === currentDrwNo && (h.matchedRank === null || h.matchedRank === undefined))
    : [];
  const pendingHtml = pendingItems.length === 0 ? '' : `
    <section class="stats-section history-pending-section">
      <h2 class="stats-title">현재 회차 ${currentDrwNo}회 · 발표 대기 ${pendingItems.length}건</h2>
      <p class="stats-note">추첨 발표 후 자동 매칭됩니다. (등록 직후 본 섹션에 실시간 노출)</p>
      <div class="history-list">
        ${pendingItems.map((h) => historyItemHtml(h, false, false)).join('')}
      </div>
    </section>
  `;

  const hitRate = stats.settled > 0 ? Math.round((stats.hits / stats.settled) * 1000) / 10 : 0;

  // 누적 요약 (강화 + 적중률). S089 (2026-05-17): Luck 셀 폐기 (5셀 그리드).
  const summaryHtml = `
    <section class="stats-section">
      <h2 class="stats-title">${escapeHtml(character.name)} 전적</h2>
      <ul class="summary-grid">
        <li><span class="summary-label">총 추천</span><span class="summary-value">${stats.total}</span></li>
        <li><span class="summary-label">발표 완료</span><span class="summary-value">${stats.settled}</span></li>
        <li><span class="summary-label">적중 (3-5등)</span><span class="summary-value">${stats.hits}</span></li>
        <li><span class="summary-label">적중률</span><span class="summary-value">${stats.settled > 0 ? hitRate + '%' : '-'}</span></li>
        <li><span class="summary-label">최고 등수</span><span class="summary-value">${stats.bestRank ? RANK_LABELS[stats.bestRank] : '없음'}</span></li>
      </ul>
    </section>
  `;

  // 등수별 분포 차트 (S3-T2)
  const rankItems = [1, 2, 3, 4, 5].map((r) => ({
    label: RANK_LABELS[r],
    value: stats.ranks[r],
    color: RANK_GLOW_COLORS[r],
  }));
  const missCount = stats.settled - stats.hits;
  if (missCount > 0) {
    rankItems.push({ label: '미적중', value: missCount, color: RANK_MISS_COLOR });
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
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_GLOW_COLORS[1]}"></span>1등</span>
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_GLOW_COLORS[2]}"></span>2등</span>
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_GLOW_COLORS[3]}"></span>3등</span>
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_GLOW_COLORS[4]}"></span>4등</span>
        <span class="legend-item"><span class="legend-dot" style="background:${RANK_GLOW_COLORS[5]}"></span>5등</span>
        <span class="legend-item"><span class="legend-dot legend-miss"></span>미적중</span>
      </div>
    </section>
  `;

  // S090-후속: 옛 이력 = 현재 회차 외 모든 항목 (발표 회차 + 매칭 완료).
  const pastItems = currentDrwNo
    ? sortedHistory.filter((h) => h.drwNo !== currentDrwNo)
    : sortedHistory;
  const historyItems = pastItems.length === 0
    ? (pendingItems.length === 0
        ? '<section class="empty-state"><p>기록이 비어있습니다.<br/>추천 탭에서 추천을 받고 <strong>"확정"</strong>을 누르면 본 회차에 등록됩니다.<br/>매주 토요일 발표 후 자동 매칭됩니다.</p></section>'
        : '')
    : `<section class="stats-section">
        <h2 class="stats-title">옛 회차 이력 (${pastItems.length}건, 최근 회차순)</h2>
        <div class="history-list">
          ${pastItems.map((h) => historyItemHtml(h)).join('')}
        </div>
      </section>`;

  container.innerHTML = `
    <header class="app-header tab-header">
      <h1 class="app-title">기록</h1>
    </header>
    ${summaryHtml}
    ${pendingHtml}
    ${rankChartHtml}
    ${timelineHtml}
    ${historyItems}
  `;
}

function timelineDotHtml(h) {
  const rank = h.matchedRank;
  const color = rank ? RANK_GLOW_COLORS[rank] : null;
  const cls = rank ? '' : ' is-miss';
  const style = color ? `style="background:${color}"` : '';
  const label = rank ? `${h.drwNo}회 ${RANK_LABELS[rank]}` : `${h.drwNo}회 미적중`;
  return `<span class="timeline-dot${cls}" ${style} role="listitem" title="${label}" aria-label="${label}"></span>`;
}

/**
 * history 항목 카드.
 * @param {object} h history 항목
 * @param {boolean} [showRound=true] 항목 헤더에 "NNNN회차" 표기 (S090-후속 3).
 * @param {boolean} [showRank=true] 항목 헤더에 rank 라벨 표기 (S090-후속 4, 2026-05-17). false면 헤더 자체 폐기 = 번호공만 노출.
 */
function historyItemHtml(h, showRound = true, showRank = true) {
  // S20(2026-05-02): 추천에서 보너스 폐기. 이력 카드도 본번호 6개만 표시.
  const rank = h.matchedRank;
  const rankLabel = rank ? RANK_LABELS[rank] : (rank === null ? '미적중 / 미발표' : '-');
  const rankColor = rank ? RANK_GLOW_COLORS[rank] : 'var(--color-text-dim)';
  const numsHtml = h.numbers.map((n) => colorNum(n, 'history-num')).join('');
  let headerHtml = '';
  if (showRound && showRank) {
    headerHtml = `<header class="history-header">
        <span class="history-drw">${h.drwNo}회차</span>
        <span class="history-rank" style="color: ${rankColor}">${rankLabel}</span>
      </header>`;
  } else if (showRound) {
    headerHtml = `<header class="history-header history-header-no-rank">
        <span class="history-drw">${h.drwNo}회차</span>
      </header>`;
  } else if (showRank) {
    headerHtml = `<header class="history-header history-header-no-round">
        <span class="history-rank" style="color: ${rankColor}">${rankLabel}</span>
      </header>`;
  }
  // S090-후속 4: showRound=false + showRank=false = 헤더 자체 폐기. 번호공만 노출 (발표 대기 섹션).
  return `
    <article class="history-item">
      ${headerHtml}
      <div class="history-numbers">${numsHtml}</div>
    </article>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
