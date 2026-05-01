// 휠링 페이지. 다구좌 모드 ON일 때 본문, OFF면 활성화 안내.
// Full Wheel (모든 조합) + Abbreviated Wheel (시드 기반 N장 + 4-if-4 자동 검증).
import { fullWheel, abbreviatedWheel, combinationCount } from '../core/wheeling.js';
import { NUMBER_MIN, NUMBER_MAX, PICK_COUNT } from '../data/numbers.js';
import { numberColor } from '../data/colors.js';

const TICKET_COST = 1000;

function colorNum(n, extraClass = '') {
  const c = numberColor(n);
  const cls = extraClass ? `num ${extraClass}` : 'num';
  return `<span class="${cls}" style="background-color:${c.bg};">${n}</span>`;
}

/**
 * 다구좌 OFF 시 활성화 안내 화면.
 * @param {HTMLElement} container
 * @param {() => void} onActivate 활성화 클릭 콜백 (윤리 모달 → advancedMode true 후 재렌더)
 */
export function renderWheelingDisabled(container, onActivate) {
  container.innerHTML = `
    <header class="app-header tab-header">
      <h1 class="app-title">휠링</h1>
    </header>
    <section class="empty-state">
      <p><strong>다구좌 모드가 꺼져 있습니다.</strong></p>
      <p>휠링은 분산 구매(Full / Abbreviated Wheel) 도구로, <strong>부분 당첨 보장</strong>이 목적입니다.</p>
      <p>1등 확률을 높이는 도구가 아니며, 비용 증가분에 비례한 가치 보장은 없습니다.</p>
      <button type="button" class="btn-primary" data-action="enable-advanced">다구좌 모드 켜기</button>
    </section>
  `;
  container.querySelector('[data-action="enable-advanced"]').addEventListener('click', onActivate);
}

export function renderWheelingPage(container, currentRecommendation) {
  let pool = currentRecommendation && Array.isArray(currentRecommendation.numbers)
    ? [...currentRecommendation.numbers]
    : [];
  let wheelType = 'full'; // 'full' | 'abbreviated'
  let abbreviatedCount = 0; // 0이면 자동 (full / 4)

  function poolSeed() {
    return pool.reduce((a, b) => ((a * 31) ^ b) >>> 0, 0x9e3779b1);
  }

  function render() {
    const fullCount = pool.length >= PICK_COUNT ? combinationCount(pool.length, PICK_COUNT) : 0;
    if (abbreviatedCount === 0 && fullCount > 0) {
      abbreviatedCount = Math.max(1, Math.floor(fullCount / 4));
    }

    container.innerHTML = `
      <header class="app-header tab-header">
        <h1 class="app-title">휠링 (다구좌 모드)</h1>
        <p class="app-subtitle">부분 당첨 보장 도구. 당첨 확률은 높이지 않습니다.</p>
      </header>

      <section class="stats-section">
        <h2 class="stats-title">번호 풀</h2>
        <p class="stats-note">최소 ${PICK_COUNT}개. 8~10개 권장.</p>
        <div class="pool-display" role="list" aria-label="현재 풀">
          ${pool.length > 0
            ? [...pool].sort((a, b) => a - b).map((n) => {
                const c = numberColor(n);
                return `<button type="button" class="num pool-num" data-pool-num="${n}" aria-label="${n}번 제거" title="제거" style="background-color:${c.bg};">${n}</button>`;
              }).join('')
            : '<span class="empty-note">풀이 비어있습니다.</span>'}
        </div>
        <div class="pool-input">
          <label>번호 추가
            <input type="number" id="pool-input-num" min="${NUMBER_MIN}" max="${NUMBER_MAX}" placeholder="1~45" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
          </label>
          <button type="button" class="btn-secondary" data-action="add-num">추가</button>
          <button type="button" class="btn-secondary" data-action="clear">전체 비우기</button>
        </div>
      </section>

      <section class="stats-section">
        <h2 class="stats-title">휠 종류</h2>
        <div class="wheel-type-list" role="group">
          <button type="button" class="strategy${wheelType === 'full' ? ' is-active' : ''}" data-wheel-type="full" aria-pressed="${wheelType === 'full'}">
            <span class="strategy-short" aria-hidden="true">F</span>
            <span class="strategy-label">Full Wheel</span>
          </button>
          <button type="button" class="strategy${wheelType === 'abbreviated' ? ' is-active' : ''}" data-wheel-type="abbreviated" aria-pressed="${wheelType === 'abbreviated'}">
            <span class="strategy-short" aria-hidden="true">A</span>
            <span class="strategy-label">Abbreviated</span>
          </button>
        </div>
        <p class="stats-note">
          Full: 풀의 모든 조합 (C(${pool.length || '?'}, ${PICK_COUNT}) = ${fullCount}장). 4-if-4 보장.<br />
          Abbreviated: 시드 기반 N장. 4-if-4 보장은 자동 검증 (통과 / 미통과 표시).
        </p>
        ${wheelType === 'abbreviated' && fullCount > 0 ? `
          <div class="pool-input">
            <label>티켓 수 (1 ~ ${fullCount})
              <input type="number" id="abbreviated-count" min="1" max="${fullCount}" value="${abbreviatedCount}" inputmode="numeric" pattern="[0-9]*" autocomplete="off" />
            </label>
            <button type="button" class="btn-secondary" data-action="apply-count">적용</button>
          </div>
        ` : ''}
      </section>

      ${renderResult()}
      <p class="legal">휠링은 부분 당첨 커버리지 도구입니다. 각 티켓의 1등 확률은 1/8,145,060로 동일하며, 비용 증가만큼 1등 확률이 N배 비례합니다. "보장"은 풀의 핵심 K개가 발표 본번호와 일치할 때만 발생합니다.</p>
    `;

    bindEvents();
  }

  function renderResult() {
    if (pool.length < PICK_COUNT) {
      return `<section class="empty-state"><p>번호 ${PICK_COUNT}개 이상 필요합니다.</p></section>`;
    }
    let wheel;
    try {
      wheel = wheelType === 'full'
        ? fullWheel(pool)
        : abbreviatedWheel(pool, abbreviatedCount, poolSeed());
    } catch (err) {
      return `<section class="empty-state"><p>${escapeHtml(err.message)}</p></section>`;
    }
    const cost = wheel.ticketCount * TICKET_COST;
    const ticketsHtml = wheel.tickets.map((t, i) => {
      const numsHtml = t.map((n) => colorNum(n, 'history-num')).join('');
      return `<div class="wheel-ticket"><span class="wheel-idx">${i + 1}</span><div class="wheel-nums">${numsHtml}</div></div>`;
    }).join('');
    const tooManyWarn = wheel.ticketCount > 100
      ? '<p class="draw-banner is-bad">티켓이 100장을 초과합니다. 비용을 신중히 검토하세요.</p>'
      : '';
    const guaranteeMsg = wheelType === 'full'
      ? '풀 6개 모두 일치 시 1등 1장 보장. 4개 일치 시 4-if-4 보장.'
      : (wheel.isCovering4if4
        ? '4-if-4 보장 통과 (풀에서 4개 일치 시 4등 1장 이상).'
        : '4-if-4 보장 미통과. 풀에서 4개 일치해도 적중 없을 수 있습니다.');
    const guaranteeClass = wheelType === 'abbreviated' && !wheel.isCovering4if4 ? 'is-bad' : 'is-great';
    return `
      <section class="stats-section">
        <h2 class="stats-title">${wheelType === 'full' ? 'Full Wheel' : 'Abbreviated Wheel'} · ${wheel.ticketCount}개 티켓</h2>
        ${tooManyWarn}
        <p class="draw-banner ${guaranteeClass}">${guaranteeMsg}</p>
        <ul class="summary-grid">
          <li><span class="summary-label">풀 크기</span><span class="summary-value">${wheel.pool.length}</span></li>
          <li><span class="summary-label">티켓 수</span><span class="summary-value">${wheel.ticketCount}</span></li>
          <li><span class="summary-label">예상 비용</span><span class="summary-value">${cost.toLocaleString()}원</span></li>
          <li><span class="summary-label">보장 검증</span><span class="summary-value">${wheel.isCovering4if4 ? '통과' : '미통과'}</span></li>
        </ul>
        <div class="wheel-tickets" role="list" aria-label="휠 티켓">${ticketsHtml}</div>
      </section>
    `;
  }

  function bindEvents() {
    container.querySelector('[data-action="add-num"]')?.addEventListener('click', () => {
      const input = container.querySelector('#pool-input-num');
      const v = parseInt(input.value, 10);
      if (!Number.isInteger(v) || v < NUMBER_MIN || v > NUMBER_MAX) return;
      if (pool.includes(v)) return;
      pool.push(v);
      abbreviatedCount = 0;
      render();
    });

    container.querySelector('#pool-input-num')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        container.querySelector('[data-action="add-num"]').click();
      }
    });

    container.querySelectorAll('[data-pool-num]').forEach((el) => {
      el.addEventListener('click', () => {
        const v = parseInt(el.dataset.poolNum, 10);
        pool = pool.filter((n) => n !== v);
        abbreviatedCount = 0;
        render();
      });
    });

    container.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
      pool = [];
      abbreviatedCount = 0;
      render();
    });

    container.querySelectorAll('[data-wheel-type]').forEach((el) => {
      el.addEventListener('click', () => {
        wheelType = el.dataset.wheelType;
        render();
      });
    });

    container.querySelector('[data-action="apply-count"]')?.addEventListener('click', () => {
      const input = container.querySelector('#abbreviated-count');
      const v = parseInt(input.value, 10);
      if (Number.isInteger(v) && v > 0) {
        abbreviatedCount = v;
        render();
      }
    });
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  }

  render();
}
