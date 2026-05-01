// 다음 추첨 회차 카운트다운 카드. SSOT: docs/01_spec.md 5.2.2.
// render/는 DOM 사용 OK. 1초마다 텍스트 노드만 갱신해 리플로우 최소화.
import { nextDraw, diffParts, formatKstDate } from '../core/schedule.js';
import { COUNTDOWN_TICK_MS } from '../data/numbers.js';

const PARTS = [
  { key: 'days', label: '일' },
  { key: 'hours', label: '시' },
  { key: 'mins', label: '분' },
  { key: 'secs', label: '초' },
];

/**
 * 카드 HTML. 숫자 자리는 비워두고 mount() 후 update()로 채움.
 * @param {{ drwNo: number|null, drawAtMs: number }} info
 */
export function nextDrawCardHtml(info) {
  const drwLabel = info.drwNo ? `제${info.drwNo}회` : '다음 회차';
  const dateLabel = `${formatKstDate(info.drawAtMs)} 추첨 예정`;
  const cells = PARTS.map((p) => `
    <div class="next-draw-cell">
      <span class="next-draw-num" data-part="${p.key}">--</span>
      <span class="next-draw-unit">${p.label}</span>
    </div>
  `).join('');
  return `
    <section class="next-draw-card" aria-labelledby="next-draw-title">
      <h2 class="next-draw-title" id="next-draw-title">${drwLabel}</h2>
      <p class="next-draw-date">${dateLabel}</p>
      <p class="next-draw-label">남은시간</p>
      <div class="next-draw-grid" role="timer" aria-live="off">${cells}</div>
    </section>
  `;
}

/**
 * 카드 카운트다운 시작. 1초 tick으로 숫자 텍스트만 갱신.
 * 반환된 stop()을 호출하면 interval 정리.
 *
 * @param {HTMLElement} root 카드(.next-draw-card)를 포함한 컨테이너
 * @param {Array<{drwNo:number,drwDate:string}>} draws
 * @param {() => void} [onElapsed] 추첨 시각 경과 시 1회 호출 (다음 추첨으로 자동 진행 트리거 등)
 * @returns {() => void} stop 함수
 */
export function startCountdown(root, draws, onElapsed) {
  const card = root.querySelector('.next-draw-card');
  if (!card) return () => {};
  const cells = {};
  PARTS.forEach((p) => {
    cells[p.key] = card.querySelector(`[data-part="${p.key}"]`);
  });

  let target = nextDraw(draws, Date.now()).drawAtMs;
  let elapsedFired = false;

  function tick() {
    const now = Date.now();
    const d = diffParts(target, now);
    cells.days.textContent = pad(d.days);
    cells.hours.textContent = pad(d.hours);
    cells.mins.textContent = pad(d.mins);
    cells.secs.textContent = pad(d.secs);
    if (d.totalSec === 0 && !elapsedFired) {
      elapsedFired = true;
      // 추첨 시각 도달 - 새 target 산출 (다음 토요일).
      // history 갱신은 미러 페치가 별도. 여기선 카운트다운만 다음 주기로.
      target = nextDraw(draws, now + 1000).drawAtMs;
      if (onElapsed) onElapsed();
    }
  }

  tick(); // 즉시 1회
  const id = setInterval(tick, COUNTDOWN_TICK_MS);
  return () => clearInterval(id);
}

function pad(n) {
  return String(n).padStart(2, '0');
}
