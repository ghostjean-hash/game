// 추첨 전략 선택 UI. 캐릭터 카드와 분리. 매 추첨마다 사용자가 선택.
import {
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_PAIR_TRACKER, STRATEGY_ASTROLOGER,
  STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  STRATEGY_MBTI, STRATEGY_ZODIAC_ELEMENT,
} from '../data/numbers.js';

const STRATEGIES = [
  { id: STRATEGY_BLESSED, label: '축복받은 자', short: '축', desc: '시드 + Luck 분산' },
  { id: STRATEGY_STATISTICIAN, label: '통계학자', short: '통', desc: '본번호 누적 빈도 가중' },
  { id: STRATEGY_SECOND_STAR, label: '2등의 별', short: '별', desc: '보너스볼 빈도 극대화' },
  { id: STRATEGY_REGRESSIONIST, label: '회귀주의자', short: '회', desc: '오래 미출현 번호 우대' },
  { id: STRATEGY_PAIR_TRACKER, label: '짝궁추적자', short: '짝', desc: '시드 키번호 + 동시출현 페어' },
  { id: STRATEGY_ASTROLOGER, label: '점성술사', short: '점', desc: '캐릭터 별자리 행운 번호' },
  { id: STRATEGY_TREND_FOLLOWER, label: '추세추종자', short: '추', desc: '최근 30회 Hot 번호 가중' },
  { id: STRATEGY_INTUITIVE, label: '직감주의자', short: '직', desc: '매 회차 다른 무작위 가중 (결정론)' },
  { id: STRATEGY_BALANCER, label: '균형주의자', short: '균', desc: '합 / 홀짝 필터 통과 조합만' },
  { id: STRATEGY_MBTI, label: 'MBTI', short: 'M', desc: '캐릭터 MBTI 행운 번호 가중' },
  { id: STRATEGY_ZODIAC_ELEMENT, label: '별자리 원소', short: '원', desc: '별자리 4원소(불/땅/공기/물) 그룹 가중' },
];

export const STRATEGY_LIST = STRATEGIES;

export function strategyPickerHtml(activeId) {
  const buttons = STRATEGIES.map((s) => {
    const isActive = s.id === activeId;
    return `
      <button type="button"
              class="strategy${isActive ? ' is-active' : ''}"
              data-strategy-id="${s.id}"
              aria-pressed="${isActive ? 'true' : 'false'}"
              aria-label="${s.label} 전략 - ${s.desc}"
              title="${s.label}: ${s.desc}">
        <span class="strategy-short" aria-hidden="true">${s.short}</span>
        <span class="strategy-label">${s.label}</span>
      </button>
    `;
  }).join('');
  return `
    <section class="strategy-picker" aria-label="추첨 전략 선택">
      <div class="strategy-title">추첨 전략</div>
      <div class="strategy-list" role="group">${buttons}</div>
    </section>
  `;
}

export function strategyLabel(id) {
  const s = STRATEGIES.find((x) => x.id === id);
  return s ? s.label : id;
}
