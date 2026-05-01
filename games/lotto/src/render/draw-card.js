// 추천 카드 HTML. SSOT: docs/01_spec.md 4.2 / 5.2.

export function drawCardHtml(drwNo, recommendation, fortune) {
  const numbersHtml = recommendation.numbers
    .map((n) => `<span class="num" role="listitem" aria-label="${n}번">${n}</span>`)
    .join('');
  const reasonsHtml = recommendation.reasons
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join('');
  const isBad = fortune === 'bad';
  const isGreat = fortune === 'great';
  const cardClass = `draw-card${isBad ? ' is-bad' : ''}${isGreat ? ' is-great' : ''}`;
  const banner = isBad
    ? '<p class="draw-banner is-bad">흉일. 방어 모드 권장 - 이번 회차는 신중히.</p>'
    : isGreat
    ? '<p class="draw-banner is-great">대길. 캐릭터 운세 최상.</p>'
    : '';
  return `
    <section class="${cardClass}">
      <header class="draw-header">
        <span class="draw-no">${drwNo}회차</span>
        <span class="draw-tag">참고용 추천</span>
      </header>
      ${banner}
      <div class="draw-numbers" role="list" aria-label="추천 본번호">${numbersHtml}</div>
      <div class="draw-bonus" aria-label="보너스볼">
        <span class="bonus-plus" aria-hidden="true">+</span>
        <span class="num bonus-num" aria-label="보너스 ${recommendation.bonus}번">${recommendation.bonus}</span>
      </div>
      <ul class="draw-reasons">${reasonsHtml}</ul>
    </section>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
}
