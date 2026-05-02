// 추천 엔진. SSOT: docs/01_spec.md 4.5 / 5.2.
// core/는 DOM 금지. 순수 함수.
// 전략(strategy)은 캐릭터 속성이 아니라 추첨 시 사용자가 선택하는 가중치 정책.

import {
  NUMBER_MIN, NUMBER_MAX, PICK_COUNT, BONUS_COUNT,
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_PAIR_TRACKER, STRATEGY_ASTROLOGER,
  STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  STRATEGY_MBTI, STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS,
  OBJECTIVE_STRATEGIES, OBJECTIVE_SEED_SALT,
  WEIGHT_MIN_FLOOR, STATS_POWER, GAP_POWER,
  SUM_RANGE_MIN, SUM_RANGE_MAX,
  ODD_EVEN_PREFERRED,
  ZODIAC_LUCKY,
  MBTI_LUCKY,
  ZODIAC_ELEMENTS, ZODIAC_ELEMENT_LUCKY,
  FIVE_ELEMENTS_LUCKY, STEM_TO_ELEMENT,
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
  // count^STATS_POWER 보정. SSOT: docs/02_data.md 1.7.
  // 1222회 시점 본번호 totalCount는 ±10% 편차로 거의 균등 → power 보정으로 분포 차이 증폭.
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = WEIGHT_MIN_FLOOR;
  for (const s of stats) {
    const base = Math.max(s.totalCount, WEIGHT_MIN_FLOOR);
    arr[s.number - 1] = Math.pow(base, STATS_POWER);
  }
  return arr;
}

function gapWeights(numberStats) {
  // gap^GAP_POWER 보정. gap은 이미 편차 큼 → 약한 증폭(1.3).
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = 1;
  for (const s of numberStats) {
    const base = Math.max(s.currentGap, 1);
    arr[s.number - 1] = Math.pow(base, GAP_POWER);
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

/** 최근 30회 가중 (최근 트렌드 전략). raw 유지 (실측 결과 1.5 보정 시 27배 증폭으로 과도, 2026-05-02 시뮬). */
function trendWeights(numberStats) {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = WEIGHT_MIN_FLOOR;
  for (const s of numberStats) {
    arr[s.number - 1] = Math.max(s.recent30, WEIGHT_MIN_FLOOR);
  }
  return arr;
}

/** 시드 기반 의사난수 가중치 (직감 전략). 매 회차 다른 분포. */
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

/** 일주(dayPillar) → 천간 오행 (목/화/토/금/수). */
function fiveElementOf(dayPillar) {
  if (!dayPillar || !dayPillar.stem) return null;
  return STEM_TO_ELEMENT[dayPillar.stem] || null;
}

/** 5원소 행운 번호 → weight 벡터 (사주 전략). */
function fiveElementsWeights(dayPillar) {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = 1;
  const el = fiveElementOf(dayPillar);
  if (!el) return arr;
  const lucky = FIVE_ELEMENTS_LUCKY[el] || [];
  for (const n of lucky) {
    if (n >= NUMBER_MIN && n <= NUMBER_MAX) arr[n - 1] = arr[n - 1] * 5;
  }
  return arr;
}

/**
 * 균형 조합: 시드 변형으로 최대 50회 재추첨하여 필터 통과 조합 찾기.
 * 못 찾으면 첫 시도 반환 (fallback).
 * @param {number} samplingSeed 객관 전략은 드wNo 기반 객관 시드, 시드 의존 전략은 drawSeed.
 */
function balancedSample(weights, count, samplingSeed) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const seed = mixSeeds(samplingSeed, attempt);
    const picked = weightedSample(weights, count, seed);
    if (passesBalanceFilters(picked)) {
      return picked;
    }
  }
  return weightedSample(weights, count, samplingSeed);
}

/**
 * 가중치 기반 비복원 추출.
 * @param {number[]} weights length 45 (index 0 = number 1)
 * @param {number} count
 * @param {number} seed
 * @param {Set<number>} [exclude] 풀에서 사전 제외할 번호 집합 (예: 보너스 추출 시 본번호)
 * @returns {number[]}
 */
function weightedSample(weights, count, seed, exclude = null) {
  let pool = weights.map((w, i) => ({ n: i + 1, w: Math.max(w, WEIGHT_MIN_FLOOR) }));
  if (exclude && exclude.size > 0) {
    pool = pool.filter((x) => !exclude.has(x.n));
  }
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
 * @param {string} [ctx.zodiac] - 별자리 행운 / 별자리 원소 전략용
 * @param {string} [ctx.mbti] - MBTI 전략용
 * @param {{ stem: string, branch: string }} [ctx.dayPillar] - 사주 전략(fiveElements)용 일주
 * @returns {{ numbers: number[], bonus: number, reasons: string[] }}
 */
export function recommend(ctx) {
  const {
    seed, strategyId, luck, drwNo,
    numberStats = [], bonusStats = [], cooccur = [], zodiac = null, mbti = null, dayPillar = null,
  } = ctx;
  const drawSeed = mixSeeds(seed, drwNo);
  const bonusSeed = mixSeeds(drawSeed, 0x12345678);
  // 객관 전략용 시드: 캐릭터 시드 무관, 회차만으로 결정. SSOT: docs/02_data.md 1.5.
  const objectiveSeed = mixSeeds(drwNo, OBJECTIVE_SEED_SALT);
  const objectiveBonusSeed = mixSeeds(objectiveSeed, 0x12345678);
  const isObjective = OBJECTIVE_STRATEGIES.has(strategyId);

  let mainWeights;
  let bonusW;
  const reasons = [];

  if (strategyId === STRATEGY_BLESSED) {
    mainWeights = uniformWeights();
    bonusW = uniformWeights();
    reasons.push('축복받은 자: 모든 번호 균등 + Luck이 시드 번호 가중치 강화.');
  } else if (strategyId === STRATEGY_STATISTICIAN) {
    mainWeights = statsToWeights(numberStats);
    bonusW = uniformWeights();
    reasons.push('통계 추첨: 역대 회차에 가장 많이 나온 번호 위주.');
  } else if (strategyId === STRATEGY_SECOND_STAR) {
    // 보너스볼 빈도가 높은 번호는 본번호로도 자주 나오는 경향이 있다.
    // 본번호와 보너스 모두 보너스볼 통계 가중을 적용해 라벨-동작 일관성 확보.
    mainWeights = statsToWeights(bonusStats);
    bonusW = statsToWeights(bonusStats);
    reasons.push('보너스볼 사냥: 역대 보너스볼로 자주 나온 번호 위주 (본번호 + 보너스 모두).');
  } else if (strategyId === STRATEGY_REGRESSIONIST) {
    mainWeights = gapWeights(numberStats);
    bonusW = uniformWeights();
    reasons.push('미출현 회귀: 오랫동안 안 나온 번호 위주.');
  } else if (strategyId === STRATEGY_PAIR_TRACKER) {
    const keyNumber = keyNumberFromSeed(seed);
    mainWeights = pairWeights(cooccur, keyNumber);
    bonusW = uniformWeights();
    reasons.push(`짝꿍 번호: 캐릭터 키번호 ${keyNumber}번과 자주 함께 나왔던 번호 묶음.`);
  } else if (strategyId === STRATEGY_ASTROLOGER) {
    mainWeights = zodiacWeights(zodiac);
    bonusW = uniformWeights();
    const label = zodiac || '미지정';
    reasons.push(`별자리 행운: ${label} 행운 번호 위주.`);
  } else if (strategyId === STRATEGY_TREND_FOLLOWER) {
    mainWeights = trendWeights(numberStats);
    bonusW = uniformWeights();
    reasons.push('최근 트렌드: 최근 30회에 자주 나온 번호 위주.');
  } else if (strategyId === STRATEGY_INTUITIVE) {
    mainWeights = intuitiveWeights(drawSeed);
    bonusW = uniformWeights();
    reasons.push('직감: 회차마다 다른 분포 (같은 캐릭터는 같은 결과).');
  } else if (strategyId === STRATEGY_BALANCER) {
    mainWeights = uniformWeights();
    bonusW = uniformWeights();
    reasons.push(`균형 조합: 번호 합 ${SUM_RANGE_MIN}~${SUM_RANGE_MAX} + 홀짝 ${ODD_EVEN_PREFERRED.join(':')} 필터를 통과한 조합만.`);
  } else if (strategyId === STRATEGY_MBTI) {
    mainWeights = mbtiWeights(mbti);
    bonusW = uniformWeights();
    reasons.push(`MBTI 행운: ${mbti || '미지정'} 행운 번호 위주.`);
  } else if (strategyId === STRATEGY_ZODIAC_ELEMENT) {
    mainWeights = zodiacElementWeights(zodiac);
    bonusW = uniformWeights();
    const el = zodiacElementOf(zodiac);
    const elLabel = el ? `${el}` : '미지정';
    reasons.push(`별자리 4원소: ${elLabel} 그룹 행운 번호 위주.`);
  } else if (strategyId === STRATEGY_FIVE_ELEMENTS) {
    mainWeights = fiveElementsWeights(dayPillar);
    bonusW = uniformWeights();
    const el = fiveElementOf(dayPillar);
    const elLabel = el ? `${el}` : '미지정';
    reasons.push(`일주 오행: ${elLabel} 그룹 행운 번호 위주.`);
  } else {
    throw new Error(`Unknown strategy: ${strategyId}`);
  }

  // 객관 전략: 캐릭터 시드 / Luck 무관. 회차만으로 결정 (모든 캐릭터 동일 결과).
  // 시드 의존 전략: drawSeed + applyLuck (캐릭터별 다른 결과).
  const finalWeights = isObjective ? mainWeights : applyLuck(mainWeights, drawSeed, luck);
  const samplingSeed = isObjective ? objectiveSeed : drawSeed;
  const samplingBonusSeed = isObjective ? objectiveBonusSeed : bonusSeed;

  const numbers = strategyId === STRATEGY_BALANCER
    ? balancedSample(finalWeights, PICK_COUNT, samplingSeed).sort((a, b) => a - b)
    : weightedSample(finalWeights, PICK_COUNT, samplingSeed).sort((a, b) => a - b);
  // 6/45 룰: 보너스는 본번호와 겹치지 않아야 함. 본번호 6개를 풀에서 제외하고 추출.
  const bonusArr = weightedSample(bonusW, BONUS_COUNT, samplingBonusSeed, new Set(numbers));
  const bonus = bonusArr[0];

  return { numbers, bonus, reasons };
}
