// 추첨 전략 선택 UI. 캐릭터 카드와 분리. 매 추첨마다 사용자가 선택.
import {
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_PAIR_TRACKER, STRATEGY_ASTROLOGER,
  STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  STRATEGY_MBTI, STRATEGY_ZODIAC_ELEMENT,
} from '../data/numbers.js';

// 라벨/설명 톤 가이드: 라벨은 직관적으로, 설명은 "어떻게 뽑는지" 한 줄로.
// 설명에서 라벨 단어 반복 금지 (UI 줄에서 라벨 + 설명 동시 노출).
const STRATEGIES = [
  { id: STRATEGY_BLESSED, label: '축복받은 자', short: '축', desc: '모든 번호에서 균등 추출, Luck이 시드 번호 가중치를 강화' },
  { id: STRATEGY_STATISTICIAN, label: '통계 추첨', short: '통', desc: '역대 회차에 가장 많이 나온 번호 위주' },
  { id: STRATEGY_SECOND_STAR, label: '보너스볼 사냥', short: '별', desc: '역대 보너스볼로 자주 나온 번호 위주' },
  { id: STRATEGY_REGRESSIONIST, label: '미출현 회귀', short: '회', desc: '오랫동안 안 나온 번호 위주' },
  { id: STRATEGY_PAIR_TRACKER, label: '짝꿍 번호', short: '짝', desc: '캐릭터 키번호와 자주 함께 나왔던 번호 묶음' },
  { id: STRATEGY_ASTROLOGER, label: '별자리 행운', short: '점', desc: '캐릭터 별자리 12종의 행운 번호 위주' },
  { id: STRATEGY_TREND_FOLLOWER, label: '최근 트렌드', short: '추', desc: '최근 30회에 자주 나온 번호 위주' },
  { id: STRATEGY_INTUITIVE, label: '직감', short: '직', desc: '회차마다 다른 분포 (같은 캐릭터는 같은 결과)' },
  { id: STRATEGY_BALANCER, label: '균형 조합', short: '균', desc: '번호 합 121~160 + 홀짝 3:3 필터를 통과한 조합만' },
  { id: STRATEGY_MBTI, label: 'MBTI 행운', short: 'M', desc: '캐릭터 MBTI 16종의 행운 번호 위주' },
  { id: STRATEGY_ZODIAC_ELEMENT, label: '별자리 4원소', short: '원', desc: '별자리 4원소(불/땅/공기/물) 그룹 행운 번호' },
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
