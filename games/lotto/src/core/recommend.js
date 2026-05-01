// 추천 엔진. SSOT: docs/01_spec.md 4.5 / 5.2.
// core/는 DOM 금지. 순수 함수.
// 전략(strategy)은 캐릭터 속성이 아니라 추첨 시 사용자가 선택하는 가중치 정책.

import {
  NUMBER_MIN, NUMBER_MAX, PICK_COUNT, BONUS_COUNT,
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_PAIR_TRACKER, STRATEGY_ASTROLOGER,
  STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  STRATEGY_MBTI, STRATEGY_ZODIAC_ELEMENT,
  WEIGHT_MIN_FLOOR,
  SUM_RANGE_MIN, SUM_RANGE_MAX,
  ODD_EVEN_PREFERRED,
  ZODIAC_LUCKY,
  MBTI_LUCKY,
  ZODIAC_ELEMENTS, ZODIAC_ELEMENT_LUCKY,
} from '../data/numbers.js';
import { applyLuck } from './luck.js';
import { mulberry32, mixSeeds } from './random.js';

const VECTOR_LEN = NUMBER_MAX - NUMBER_MIN + 1;

function uniformWeights() {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = 1;
  return arr;
}

function statsToWeights(stats) {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = WEIGHT_MIN_FLOOR;
  for (const s of stats) {
    arr[s.number - 1] = Math.max(s.totalCount, WEIGHT_MIN_FLOOR);
  }
  return arr;
}

function gapWeights(numberStats) {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = 1;
  for (const s of numberStats) {
    arr[s.number - 1] = Math.max(s.currentGap, 1);
  }
  return arr;
}

function keyNumberFromSeed(seed) {
  return ((seed >>> 0) % VECTOR_LEN) + 1;
}

function pairWeights(cooccur, keyNumber) {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = WEIGHT_MIN_FLOOR;
  for (const p of cooccur) {
    if (p.a === keyNumber) arr[p.b - 1] = Math.max(p.count, WEIGHT_MIN_FLOOR);
    else if (p.b === keyNumber) arr[p.a - 1] = Math.max(p.count, WEIGHT_MIN_FLOOR);
  }
  arr[keyNumber - 1] = Math.max(arr[keyNumber - 1], 1);
  return arr;
}

function zodiacWeights(zodiac) {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = 1;
  const lucky = ZODIAC_LUCKY[zodiac] || [];
  for (const n of lucky) {
    if (n >= NUMBER_MIN && n <= NUMBER_MAX) arr[n - 1] = arr[n - 1] * 5;
  }
  return arr;
}

/** 최근 30회 가중 (추세추종자). */
function trendWeights(numberStats) {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = WEIGHT_MIN_FLOOR;
  for (const s of numberStats) {
    arr[s.number - 1] = Math.max(s.recent30, WEIGHT_MIN_FLOOR);
  }
  return arr;
}

/** 시드 기반 의사난수 가중치 (직감주의자). 매 회차 다른 분포. */
function intuitiveWeights(seed) {
  const rng = mulberry32(seed);
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) {
    arr[i] = 0.5 + rng() * 1.5; // 0.5~2.0
  }
  return arr;
}

/** 균형 필터: 합 121~160 + 홀짝 3:3. */
function passesBalanceFilters(numbers) {
  const sum = numbers.reduce((a, b) => a + b, 0);
  if (sum < SUM_RANGE_MIN || sum > SUM_RANGE_MAX) return false;
  const oddCount = numbers.filter((n) => n % 2 === 1).length;
  const [oddPref] = ODD_EVEN_PREFERRED;
  if (oddCount !== oddPref) return false;
  return true;
}

/** MBTI별 행운 번호 → weight 벡터. */
function mbtiWeights(mbti) {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = 1;
  const lucky = MBTI_LUCKY[mbti] || [];
  for (const n of lucky) {
    if (n >= NUMBER_MIN && n <= NUMBER_MAX) arr[n - 1] = arr[n - 1] * 5;
  }
  return arr;
}

/** 별자리 → 4원소 (fire / earth / air / water). */
function zodiacElementOf(zodiac) {
  if (!zodiac) return null;
  for (const [el, list] of Object.entries(ZODIAC_ELEMENTS)) {
    if (list.includes(zodiac)) return el;
  }
  return null;
}

/** 별자리 원소별 행운 번호 → weight 벡터. */
function zodiacElementWeights(zodiac) {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = 1;
  const el = zodiacElementOf(zodiac);
  if (!el) return arr;
  const lucky = ZODIAC_ELEMENT_LUCKY[el] || [];
  for (const n of lucky) {
    if (n >= NUMBER_MIN && n <= NUMBER_MAX) arr[n - 1] = arr[n - 1] * 5;
  }
  return arr;
}

/**
 * 균형주의자: 시드 변형으로 최대 50회 재추첨하여 필터 통과 조합 찾기.
 * 못 찾으면 첫 시도 반환 (fallback).
 */
function balancedSample(weights, count, drawSeed) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const seed = mixSeeds(drawSeed, attempt);
    const picked = weightedSample(weights, count, seed);
    if (passesBalanceFilters(picked)) {
      return picked;
    }
  }
  return weightedSample(weights, count, drawSeed);
}

function weightedSample(weights, count, seed) {
  const pool = weights.map((w, i) => ({ n: i + 1, w: Math.max(w, WEIGHT_MIN_FLOOR) }));
  const rng = mulberry32(seed);
  const picked = [];
  for (let k = 0; k < count; k += 1) {
    if (pool.length === 0) break;
    const total = pool.reduce((s, x) => s + x.w, 0);
    if (total <= 0) break;
    let r = rng() * total;
    let chosenIdx = 0;
    for (let i = 0; i < pool.length; i += 1) {
      r -= pool[i].w;
      if (r <= 0) { chosenIdx = i; break; }
    }
    picked.push(pool[chosenIdx].n);
    pool.splice(chosenIdx, 1);
  }
  return picked;
}

/**
 * 추천 결과. 결정론.
 * @param {object} ctx
 * @param {number} ctx.seed - 캐릭터 시드
 * @param {string} ctx.strategyId - 추첨 전략 (사용자가 선택)
 * @param {number} ctx.luck - 0~100
 * @param {number} ctx.drwNo - 다음 회차 번호
 * @param {object[]} [ctx.numberStats]
 * @param {object[]} [ctx.bonusStats]
 * @param {object[]} [ctx.cooccur]
 * @param {string} [ctx.zodiac] - 점성술사 전략용 별자리
 * @returns {{ numbers: number[], bonus: number, reasons: string[] }}
 */
export function recommend(ctx) {
  const {
    seed, strategyId, luck, drwNo,
    numberStats = [], bonusStats = [], cooccur = [], zodiac = null, mbti = null,
  } = ctx;
  const drawSeed = mixSeeds(seed, drwNo);
  const bonusSeed = mixSeeds(drawSeed, 0x12345678);

  let mainWeights;
  let bonusW;
  const reasons = [];

  if (strategyId === STRATEGY_BLESSED) {
    mainWeights = uniformWeights();
    bonusW = uniformWeights();
    reasons.push('축복받은 자: 시드 + Luck 분산 적용.');
  } else if (strategyId === STRATEGY_STATISTICIAN) {
    mainWeights = statsToWeights(numberStats);
    bonusW = uniformWeights();
    reasons.push('통계학자: 본번호 누적 빈도 가중.');
  } else if (strategyId === STRATEGY_SECOND_STAR) {
    mainWeights = uniformWeights();
    bonusW = statsToWeights(bonusStats);
    reasons.push('2등의 별: 보너스볼 빈도 극대화.');
  } else if (strategyId === STRATEGY_REGRESSIONIST) {
    mainWeights = gapWeights(numberStats);
    bonusW = uniformWeights();
    reasons.push('회귀주의자: 오래 미출현 번호 우대.');
  } else if (strategyId === STRATEGY_PAIR_TRACKER) {
    const keyNumber = keyNumberFromSeed(seed);
    mainWeights = pairWeights(cooccur, keyNumber);
    bonusW = uniformWeights();
    reasons.push(`짝궁추적자: 키번호 ${keyNumber}번과 자주 함께 나온 번호 가중.`);
  } else if (strategyId === STRATEGY_ASTROLOGER) {
    mainWeights = zodiacWeights(zodiac);
    bonusW = uniformWeights();
    const label = zodiac || '미지정';
    reasons.push(`점성술사: ${label} 행운 번호 가중.`);
  } else if (strategyId === STRATEGY_TREND_FOLLOWER) {
    mainWeights = trendWeights(numberStats);
    bonusW = uniformWeights();
    reasons.push('추세추종자: 최근 30회 Hot 번호 가중.');
  } else if (strategyId === STRATEGY_INTUITIVE) {
    mainWeights = intuitiveWeights(drawSeed);
    bonusW = uniformWeights();
    reasons.push('직감주의자: 매 회차 다른 가중치 (시드 결정론).');
  } else if (strategyId === STRATEGY_BALANCER) {
    mainWeights = uniformWeights();
    bonusW = uniformWeights();
    reasons.push(`균형주의자: 합 ${SUM_RANGE_MIN}~${SUM_RANGE_MAX} + 홀짝 ${ODD_EVEN_PREFERRED.join(':')} 필터 통과 조합.`);
  } else if (strategyId === STRATEGY_MBTI) {
    mainWeights = mbtiWeights(mbti);
    bonusW = uniformWeights();
    reasons.push(`MBTI: ${mbti || '미지정'} 행운 번호 가중.`);
  } else if (strategyId === STRATEGY_ZODIAC_ELEMENT) {
    mainWeights = zodiacElementWeights(zodiac);
    bonusW = uniformWeights();
    const el = zodiacElementOf(zodiac);
    const elLabel = el ? `${el}` : '미지정';
    reasons.push(`별자리 원소: ${elLabel} 그룹 행운 번호 가중.`);
  } else {
    throw new Error(`Unknown strategy: ${strategyId}`);
  }

  const lucked = applyLuck(mainWeights, drawSeed, luck);
  const numbers = strategyId === STRATEGY_BALANCER
    ? balancedSample(lucked, PICK_COUNT, drawSeed).sort((a, b) => a - b)
    : weightedSample(lucked, PICK_COUNT, drawSeed).sort((a, b) => a - b);
  const bonusArr = weightedSample(bonusW, BONUS_COUNT, bonusSeed);
  const bonus = bonusArr[0];

  return { numbers, bonus, reasons };
}
