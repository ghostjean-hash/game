// 추천 카드 HTML. SSOT: docs/01_spec.md 4.2 / 5.2.
import { numberColor } from '../data/colors.js';

function numHtml(n, extraClass = '') {
  const c = numberColor(n);
  const cls = `num${extraClass ? ' ' + extraClass : ''}`;
  return `<span class="${cls}" role="listitem" aria-label="${n}번" style="background-color:${c.bg};">${n}</span>`;
}

export function drawCardHtml(drwNo, recommendation, fortune) {
  const numbersHtml = recommendation.numbers.map((n) => numHtml(n)).join('');
  const reasonsHtml = recommendation.reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join('');
  const isBad = fortune === 'bad';
  const isGreat = fortune === 'great';
  const cardClass = `draw-card${isBad ? ' is-bad' : ''}${isGreat ? ' is-great' : ''}`;
  const banner = isBad
    ? '<p class="draw-banner is-bad">흉일. 방어 모드 권장 - 이번 회차는 신중히.</p>'
    : isGreat
    ? '<p class="draw-banner is-great">대길. 캐릭터 운세 최상.</p>'
    : '';
  const bonusColor = numberColor(recommendation.bonus);
  return `
    <section class="${cardClass}">
      <header class="draw-header">
        <button type="button" class="draw-nav" data-action="prev-draw" aria-label="이전 회차" ${drwNo <= 1 ? 'disabled' : ''}>‹</button>
        <div class="draw-title">
          <span class="draw-no">${drwNo}회차</span>
          <span class="draw-tag">추천</span>
        </div>
        <button type="button" class="draw-nav" data-action="next-draw" aria-label="다음 회차">›</button>
      </header>
      ${banner}
      <div class="draw-numbers" role="list" aria-label="추천 본번호">${numbersHtml}</div>
      <div class="draw-bonus" aria-label="보너스볼">
        <span class="bonus-divider" aria-hidden="true">+</span>
        <div class="bonus-cell">
          <span class="bonus-label">보너스</span>
          <span class="num bonus-num" aria-label="보너스 ${recommendation.bonus}번" style="background-color:${bonusColor.bg};">${recommendation.bonus}</span>
        </div>
      </div>
      <ul class="draw-reasons">${reasonsHtml}</ul>
    </section>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
