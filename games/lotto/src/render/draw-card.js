// 추천 번호 패널. SSOT: docs/01_spec.md 5.2.1 (동행복권 결과 페이지 호환).
// 회차 헤더(nav 포함)는 카운트다운 카드와 통합되어 제거됨. 본 컴포넌트는 번호 패널만 책임.
// S3-T1: 다중 전략 모드면 본번호 아래 카테고리 색 dot으로 출처 표시.
import { numberColor } from '../data/colors.js';
import { STRATEGY_CATEGORIES } from '../data/numbers.js';
import { plus } from './icons.js';

const CATEGORY_DOT_CLASS = {
  stats: 'is-stats',
  mapping: 'is-mapping',
  saju: 'is-saju',
  random: 'is-random',
};

function numHtml(n, ariaLabel, source) {
  const c = numberColor(n);
  const label = ariaLabel || `${n}번`;
  const sourceCat = source ? STRATEGY_CATEGORIES[source] : null;
  const dotCls = sourceCat ? CATEGORY_DOT_CLASS[sourceCat] : '';
  const dotHtml = sourceCat
    ? `<span class="num-source-dot ${dotCls}" data-source="${source}" aria-label="${source} 출처" title="${source}"></span>`
    : '';
  return `<span class="num-cell" role="listitem" aria-label="${label}">
    <span class="num" style="background-color:${c.bg};">${n}</span>
    ${dotHtml}
  </span>`;
}

export function drawCardHtml(drwNo, recommendation, fortune) {
  const sources = recommendation.strategySources || []; // 단일 모드면 빈 배열 → dot 미표시
  const mainHtml = recommendation.numbers.map((n, i) => numHtml(n, undefined, sources[i] || null)).join('');
  const bonusHtml = numHtml(recommendation.bonus, `보너스 ${recommendation.bonus}번`, null);
  const isBad = fortune === 'bad';
  const isGreat = fortune === 'great';
  const cardClass = `draw-card${isBad ? ' is-bad' : ''}${isGreat ? ' is-great' : ''}`;
  const banner = isBad
    ? '<p class="draw-banner is-bad">흉일. 방어 모드 권장 - 이번 회차는 신중히.</p>'
    : isGreat
    ? '<p class="draw-banner is-great">대길. 캐릭터 운세 최상.</p>'
    : '';
  return `
    <section class="${cardClass}" aria-label="제${drwNo}회 추천 번호">
      ${banner}
      <div class="draw-panel">
        <div class="draw-balls">
          <div class="draw-main" role="list" aria-label="추천 본번호">${mainHtml}</div>
          <span class="draw-plus" aria-hidden="true">${plus('icon')}</span>
          <div class="draw-bonus" role="list" aria-label="보너스볼">${bonusHtml}</div>
        </div>
        <div class="draw-labels" aria-hidden="true">
          <div class="draw-label draw-label-main"><span>추천번호</span></div>
          <div class="draw-label draw-label-bonus"><span>보너스번호</span></div>
        </div>
      </div>
    </section>
  `;
}
