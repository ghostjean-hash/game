// 역추첨 페이지: 6개 번호 선택 → 전 회차 매칭 → 최고 등수 표시.
// SSOT: docs/01_spec.md 5.7.
import { numberColor } from '../data/colors.js';
import { NUMBER_MIN, NUMBER_MAX, PICK_COUNT } from '../data/numbers.js';
import { reverseSearch, validateUserNumbers } from '../core/reverse.js';

const RANK_LABELS = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등' };

let selected = []; // 사용자가 선택한 번호 (모듈 상태, 페이지 재진입 시 보존)

/**
 * 역추첨 탭 렌더.
 * @param {HTMLElement} container
 * @param {Array} draws
 */
export function renderReversePage(container, draws) {
  const result = selected.length === PICK_COUNT
    ? reverseSearch(selected, draws)
    : null;

  container.innerHTML = `
    <header class="app-header tab-header">
      <h1 class="app-title">역추첨</h1>
      <p class="app-subtitle">6개 번호를 골라 1~${draws.length || '?'}회까지 가장 높은 등수를 확인합니다.</p>
    </header>

    <section class="stats-section">
      <h2 class="stats-title">번호 선택 (${selected.length} / ${PICK_COUNT})</h2>
      ${gridHtml(selected)}
      <div class="reverse-actions">
        <button type="button" class="btn-secondary" data-action="reverse-clear" ${selected.length === 0 ? 'disabled' : ''}>전체 해제</button>
        <button type="button" class="btn-primary" data-action="reverse-random">랜덤 6개 선택</button>
      </div>
    </section>

    ${selectedSummaryHtml(selected)}

    ${result ? resultHtml(result, draws.length) : emptyResultHtml()}
  `;

  // 번호 그리드 클릭
  container.querySelectorAll('[data-num]').forEach((el) => {
    el.addEventListener('click', () => {
      const n = Number(el.dataset.num);
      togglePick(n);
      renderReversePage(container, draws);
    });
  });

  container.querySelector('[data-action="reverse-clear"]')?.addEventListener('click', () => {
    selected = [];
    renderReversePage(container, draws);
  });

  container.querySelector('[data-action="reverse-random"]')?.addEventListener('click', () => {
    selected = randomPick();
    renderReversePage(container, draws);
  });
}

function togglePick(n) {
  if (selected.includes(n)) {
    selected = selected.filter((x) => x !== n);
  } else if (selected.length < PICK_COUNT) {
    selected = [...selected, n].sort((a, b) => a - b);
  }
}

function randomPick() {
  const pool = [];
  for (let i = NUMBER_MIN; i <= NUMBER_MAX; i += 1) pool.push(i);
  // Fisher-Yates 부분
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, PICK_COUNT).sort((a, b) => a - b);
}

function gridHtml(picked) {
  const cells = [];
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
    const isPicked = picked.includes(n);
    const { bg } = numberColor(n);
    const style = isPicked ? `style="background-color:${bg};"` : '';
    cells.push(`
      <button type="button"
              class="reverse-cell${isPicked ? ' is-picked' : ''}"
              data-num="${n}"
              ${style}
              aria-pressed="${isPicked ? 'true' : 'false'}"
              aria-label="${n}번 ${isPicked ? '선택 해제' : '선택'}">
        ${n}
      </button>
    `);
  }
  return `<div class="reverse-grid" role="group" aria-label="번호 그리드">${cells.join('')}</div>`;
}

function selectedSummaryHtml(picked) {
  if (picked.length === 0) return '';
  const balls = picked.map((n) => {
    const { bg } = numberColor(n);
    return `<span class="num" style="background-color:${bg};">${n}</span>`;
  }).join('');
  return `
    <section class="stats-section">
      <h2 class="stats-title">선택한 번호</h2>
      <div class="reverse-selected">${balls}</div>
    </section>
  `;
}

function resultHtml(result, totalDraws) {
  const { bestRank, bestDraw, counts, bestRankCount } = result;
  const validation = validateUserNumbers(selected);
  if (!validation.valid) {
    return `<section class="stats-section"><p class="stats-note">${validation.reason}</p></section>`;
  }

  const bestRankLabel = bestRank === null ? '미적중' : RANK_LABELS[bestRank];
  const bestDrawHtml = bestDraw ? drawSummaryHtml(bestDraw, selected) : '';

  const countRows = [1, 2, 3, 4, 5].map((rank) => {
    const c = counts[rank];
    return `
      <li class="rank-row${c > 0 ? ' has-hits' : ''}">
        <span class="rank-label">${RANK_LABELS[rank]}</span>
        <span class="rank-count">${c}회</span>
      </li>
    `;
  }).join('');

  const missRow = `
    <li class="rank-row miss">
      <span class="rank-label">미적중</span>
      <span class="rank-count">${counts.miss}회</span>
    </li>
  `;

  return `
    <section class="stats-section">
      <h2 class="stats-title">최고 등수</h2>
      <div class="reverse-best${bestRank ? ' has-rank' : ''}">
        <div class="reverse-best-rank">${bestRankLabel}</div>
        ${bestRankCount > 0 ? `<div class="reverse-best-meta">총 ${totalDraws}회 중 ${bestRankCount}회 매칭</div>` : ''}
      </div>
      ${bestDrawHtml}
    </section>

    <section class="stats-section">
      <h2 class="stats-title">등수별 매칭 횟수</h2>
      <ul class="rank-counts">${countRows}${missRow}</ul>
      <p class="stats-note">로또 6/45는 매 회차 독립 시행이므로 과거 매칭 횟수가 미래 적중률을 보장하지 않습니다. 참고용.</p>
    </section>
  `;
}

function emptyResultHtml() {
  return `
    <section class="stats-section">
      <p class="stats-note">${PICK_COUNT}개를 모두 선택하면 결과가 표시됩니다.</p>
    </section>
  `;
}

function drawSummaryHtml(draw, userPick) {
  const userSet = new Set(userPick);
  const balls = draw.numbers.map((n) => {
    const { bg } = numberColor(n);
    const matched = userSet.has(n);
    return `<span class="num${matched ? ' is-matched' : ''}" style="background-color:${bg};">${n}</span>`;
  }).join('');
  const bonusColor = numberColor(draw.bonus).bg;
  const bonusMatched = userSet.has(draw.bonus);
  return `
    <div class="reverse-best-draw">
      <div class="reverse-best-draw-meta"><strong>${draw.drwNo}회</strong> · ${draw.drwDate}</div>
      <div class="reverse-best-draw-balls">
        ${balls}
        <span class="bonus-divider" aria-hidden="true">+</span>
        <span class="num bonus${bonusMatched ? ' is-matched' : ''}" style="background-color:${bonusColor};">${draw.bonus}</span>
      </div>
    </div>
  `;
}
