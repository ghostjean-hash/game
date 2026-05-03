// 추천 엔진. SSOT: docs/01_spec.md 4.5 / 5.2.
// core/는 DOM 금지. 순수 함수.
// 전략(strategy)은 캐릭터 속성이 아니라 추첨 시 사용자가 선택하는 가중치 정책.

import {
  NUMBER_MIN, NUMBER_MAX, PICK_COUNT, BONUS_COUNT,
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_PAIR_TRACKER, STRATEGY_ASTROLOGER,
  STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS,
  OBJECTIVE_STRATEGIES, OBJECTIVE_SEED_SALT,
  WEIGHT_MIN_FLOOR, STATS_POWER, GAP_POWER,
  SUM_RANGE_MIN, SUM_RANGE_MAX,
  ODD_EVEN_PREFERRED,
  ZODIAC_LUCKY,
  ZODIAC_ELEMENTS, ZODIAC_ELEMENT_LUCKY,
  FIVE_ELEMENTS_LUCKY, STEM_TO_ELEMENT,
  SAJU_RELATION_BOOST,
  MULTI_STRATEGY_MAX,
  STATS_POOL_SIZE,
  FIVE_SETS_COUNT, FIVE_SETS_SALT_BASE,
  STRATEGY_ORDER,
} from '../data/numbers.js';
import { applyLuck } from './luck.js';
import { mulberry32, mixSeeds } from './random.js';
import { dateToDayPillar, elementRelation } from './saju.js';

const VECTOR_LEN = NUMBER_MAX - NUMBER_MIN + 1;

/**
 * S21 (2026-05-03): 전략 ID 결정론 해시 (djb2, 32bit unsigned).
 * 객관 전략 시드 분산용. 같은 strategyId는 항상 같은 해시 → 결정론.
 * 다른 strategyId는 다른 해시 → 풀 안 다른 위치 추출.
 * SSOT: docs/02_data.md 1.5.1.
 */
function strategyHash(sid) {
  let h = 5381;
  for (let i = 0; i < sid.length; i += 1) {
    h = ((h << 5) + h + sid.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

function uniformWeights() {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = 1;
  return arr;
}

/**
 * S18 (2026-05-02): 풀 컷팅 + 균등 weight.
 * 원본 weight에서 상위 poolSize 인덱스만 1, 나머지는 0 (절대 안 뽑힘).
 * weight 비례 PRNG의 모호성 제거: "1등 자주 / 30등 가끔" → "상위 N 안에서 균등".
 * SSOT: docs/02_data.md 1.5.6.
 */
function poolFromWeights(weights, poolSize) {
  const indexed = weights.map((w, i) => ({ w, i }));
  indexed.sort((a, b) => b.w - a.w);
  const topSet = new Set(indexed.slice(0, poolSize).map((x) => x.i));
  const out = new Array(weights.length);
  for (let i = 0; i < weights.length; i += 1) {
    out[i] = topSet.has(i) ? 1 : 0;
  }
  return out;
}

/**
 * S18: 인덱스 집합에서 풀 균등 weight 벡터 생성.
 * 운세 매핑(이미 풀 정의된 전략)용. 풀 안 = 1, 풀 밖 = 0.
 */
function poolFromIndices(indices) {
  const out = new Array(VECTOR_LEN);
  for (let i = 0; i < VECTOR_LEN; i += 1) out[i] = 0;
  for (const n of indices) {
    if (n >= NUMBER_MIN && n <= NUMBER_MAX) out[n - 1] = 1;
  }
  return out;
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

// S18: 풀 컷팅. lucky 풀 안 = 1, 풀 밖 = 0 (절대 안 뽑힘).
function zodiacWeights(zodiac) {
  const lucky = ZODIAC_LUCKY[zodiac] || [];
  return poolFromIndices(lucky);
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

/** 별자리 → 4원소 (fire / earth / air / water). */
function zodiacElementOf(zodiac) {
  if (!zodiac) return null;
  for (const [el, list] of Object.entries(ZODIAC_ELEMENTS)) {
    if (list.includes(zodiac)) return el;
  }
  return null;
}

/** S18: 별자리 원소 풀 컷팅 + 균등. */
function zodiacElementWeights(zodiac) {
  const el = zodiacElementOf(zodiac);
  if (!el) return uniformWeights();
  const lucky = ZODIAC_ELEMENT_LUCKY[el] || [];
  return poolFromIndices(lucky);
}

/** 일주(dayPillar) → 천간 오행 (목/화/토/금/수). */
function fiveElementOf(dayPillar) {
  if (!dayPillar || !dayPillar.stem) return null;
  return STEM_TO_ELEMENT[dayPillar.stem] || null;
}

/**
 * 5원소 행운 번호 → weight 벡터 (사주 전략).
 * S16: 추첨일 일진 보너스 (출생 일주 + 추첨일 일주 통변성).
 * S18: 풀 컷팅 + 균등. 출생 풀 ∪ 추첨일 풀 (관계가 보너스 발생 케이스만)이 단일 풀.
 *   풀 안 = 1 (균등), 풀 밖 = 0. 일진은 풀 합집합 자체로 매주 변경 (보너스 boost 차등 폐기).
 * @returns {{weights: number[], relation: string|null, drawElement: string|null}}
 */
function fiveElementsWeights(dayPillar, drawDate) {
  const el = fiveElementOf(dayPillar);
  if (!el) return { weights: uniformWeights(), relation: null, drawElement: null };

  const poolSet = new Set();
  // 출생 일주 풀 (영원)
  for (const n of FIVE_ELEMENTS_LUCKY[el] || []) poolSet.add(n);

  let relation = null;
  let drawElement = null;
  if (drawDate) {
    const drawPillar = dateToDayPillar(drawDate);
    if (drawPillar) {
      drawElement = STEM_TO_ELEMENT[drawPillar.stem] || null;
      if (drawElement) {
        relation = elementRelation(dayPillar, drawPillar);
        const boost = SAJU_RELATION_BOOST[relation] || 1;
        // 보너스가 발생하는 관계(boost > 1)만 추첨일 풀 추가. boost = 1(관성)은 풀 추가 X.
        if (boost > 1) {
          for (const n of FIVE_ELEMENTS_LUCKY[drawElement] || []) poolSet.add(n);
        }
      }
    }
  }

  return { weights: poolFromIndices(Array.from(poolSet)), relation, drawElement };
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
 * S25 (2026-05-03): strategy weight + 시드 + reasons 계산만 분리.
 * recommend / recommendMulti 양쪽이 공유. 외부 호출 안 됨 (내부 helper).
 *
 * @returns {{
 *   finalWeights: number[],
 *   bonusW: number[],
 *   samplingSeed: number,
 *   samplingBonusSeed: number,
 *   isObjective: boolean,
 *   isBalancer: boolean,
 *   reasons: string[],
 * }}
 */
function computeStrategyContext(ctx) {
  const {
    seed, strategyId, luck, drwNo,
    numberStats = [], bonusStats = [], cooccur = [], zodiac = null, dayPillar = null,
    drawDate = null,
  } = ctx;
  const drawSeed = mixSeeds(seed, drwNo);
  const bonusSeed = mixSeeds(drawSeed, 0x12345678);
  // 객관 전략용 시드 (S21): 캐릭터 시드 무관, drwNo + SALT + strategyHash. SSOT: docs/02_data.md 1.5.1.
  const objectiveSeed = mixSeeds(mixSeeds(drwNo, OBJECTIVE_SEED_SALT), strategyHash(strategyId));
  const objectiveBonusSeed = mixSeeds(objectiveSeed, 0x12345678);
  const isObjective = OBJECTIVE_STRATEGIES.has(strategyId);
  const isBalancer = strategyId === STRATEGY_BALANCER;

  let mainWeights;
  let bonusW;
  const reasons = [];

  if (strategyId === STRATEGY_BLESSED) {
    mainWeights = uniformWeights();
    bonusW = uniformWeights();
    reasons.push('축복받은 자: 모든 번호 균등 + Luck이 시드 번호 가중치 강화.');
  } else if (strategyId === STRATEGY_STATISTICIAN) {
    mainWeights = poolFromWeights(statsToWeights(numberStats), STATS_POOL_SIZE);
    bonusW = uniformWeights();
    reasons.push(`많이 나온 수: 역대 회차 빈도 상위 ${STATS_POOL_SIZE}등 풀에서 시드 추첨.`);
  } else if (strategyId === STRATEGY_SECOND_STAR) {
    mainWeights = poolFromWeights(statsToWeights(bonusStats), STATS_POOL_SIZE);
    bonusW = poolFromWeights(statsToWeights(bonusStats), STATS_POOL_SIZE);
    reasons.push(`보너스볼: 역대 보너스볼 빈도 상위 ${STATS_POOL_SIZE}등 풀 (본번호 + 보너스 모두).`);
  } else if (strategyId === STRATEGY_REGRESSIONIST) {
    mainWeights = poolFromWeights(gapWeights(numberStats), STATS_POOL_SIZE);
    bonusW = uniformWeights();
    reasons.push(`안 나온 수: 가장 오래 안 나온 상위 ${STATS_POOL_SIZE}등 풀에서 시드 추첨.`);
  } else if (strategyId === STRATEGY_PAIR_TRACKER) {
    const keyNumber = keyNumberFromSeed(seed);
    mainWeights = poolFromWeights(pairWeights(cooccur, keyNumber), STATS_POOL_SIZE);
    bonusW = uniformWeights();
    reasons.push(`짝꿍 번호: 키번호 ${keyNumber}번과 동시출현 상위 ${STATS_POOL_SIZE}등 풀에서 시드 추첨.`);
  } else if (strategyId === STRATEGY_ASTROLOGER) {
    mainWeights = zodiacWeights(zodiac);
    bonusW = uniformWeights();
    const label = zodiac || '미지정';
    reasons.push(`별자리 행운: ${label} (Sun Sign + Ruler Planet 전통 점성술 출처, 추첨 결과 보장 없음).`);
  } else if (strategyId === STRATEGY_TREND_FOLLOWER) {
    mainWeights = poolFromWeights(trendWeights(numberStats), STATS_POOL_SIZE);
    bonusW = uniformWeights();
    reasons.push(`최근 트렌드: 최근 30회 빈도 상위 ${STATS_POOL_SIZE}등 풀에서 시드 추첨.`);
  } else if (strategyId === STRATEGY_INTUITIVE) {
    mainWeights = intuitiveWeights(drawSeed);
    bonusW = uniformWeights();
    reasons.push('직감: 회차마다 다른 분포 (같은 캐릭터는 같은 결과).');
  } else if (strategyId === STRATEGY_BALANCER) {
    mainWeights = uniformWeights();
    bonusW = uniformWeights();
    reasons.push(`균형 조합: 번호 합 ${SUM_RANGE_MIN}~${SUM_RANGE_MAX} + 홀짝 ${ODD_EVEN_PREFERRED.join(':')} 필터를 통과한 조합만.`);
  } else if (strategyId === STRATEGY_ZODIAC_ELEMENT) {
    mainWeights = zodiacElementWeights(zodiac);
    bonusW = uniformWeights();
    const el = zodiacElementOf(zodiac);
    const elLabel = el ? `${el}` : '미지정';
    reasons.push(`원소 행운: ${elLabel} 그룹 (전통 점성술 4원소 출처, 추첨 결과 보장 없음).`);
  } else if (strategyId === STRATEGY_FIVE_ELEMENTS) {
    const fe = fiveElementsWeights(dayPillar, drawDate);
    mainWeights = fe.weights;
    bonusW = uniformWeights();
    const el = fiveElementOf(dayPillar);
    const elLabel = el ? `${el}` : '미지정';
    if (fe.relation && fe.drawElement) {
      const REL_LABEL = { self: '비견', generate: '식상', beGenerated: '인성', overcome: '재성', beOvercome: '관성', normal: '무관' };
      const boost = SAJU_RELATION_BOOST[fe.relation];
      if (boost > 1) {
        reasons.push(`사주 일진 (S18): 추첨일 ${fe.drawElement} 오행 풀 추가 (${REL_LABEL[fe.relation] || fe.relation}, 매주 변동).`);
      } else {
        reasons.push(`사주 일진: 추첨일 ${fe.drawElement} 오행 = ${REL_LABEL[fe.relation] || fe.relation} (보너스 없음, 출생 풀만).`);
      }
    }
    reasons.push(`사주 행운: ${elLabel} 오행 (河圖數 출처 / 易經, 추첨 결과 보장 없음).`);
  } else {
    throw new Error(`Unknown strategy: ${strategyId}`);
  }

  // 객관: 캐릭터 시드 / Luck 무관. 시드 의존: drawSeed + applyLuck.
  const finalWeights = isObjective ? mainWeights : applyLuck(mainWeights, drawSeed, luck);
  const samplingSeed = isObjective ? objectiveSeed : drawSeed;
  const samplingBonusSeed = isObjective ? objectiveBonusSeed : bonusSeed;

  return { finalWeights, bonusW, samplingSeed, samplingBonusSeed, isObjective, isBalancer, reasons };
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
 * @param {{ stem: string, branch: string }} [ctx.dayPillar] - 사주 전략(fiveElements)용 일주
 * @param {string} [ctx.drawDate] - 추첨일 YYYY-MM-DD (S16 사주 일진 보너스용)
 * @returns {{ numbers: number[], bonus: number, reasons: string[] }}
 */
export function recommend(ctx) {
  const c = computeStrategyContext(ctx);
  const numbers = c.isBalancer
    ? balancedSample(c.finalWeights, PICK_COUNT, c.samplingSeed).sort((a, b) => a - b)
    : weightedSample(c.finalWeights, PICK_COUNT, c.samplingSeed).sort((a, b) => a - b);
  // 6/45 룰: 보너스는 본번호와 겹치지 않아야 함.
  const bonusArr = weightedSample(c.bonusW, BONUS_COUNT, c.samplingBonusSeed, new Set(numbers));
  const bonus = bonusArr[0];
  return { numbers, bonus, reasons: c.reasons };
}

/**
 * 다중 전략 분배 카운트 (S3-T1, A안 균등). SSOT: docs/02_data.md 1.5.4.
 * 6 / N 베이스 + 나머지를 첫 N에 +1.
 * @param {number} n 전략 개수 (1~MULTI_STRATEGY_MAX)
 * @returns {number[]} 길이 n. 합계 PICK_COUNT(6).
 */
export function distributeCounts(n) {
  if (!Number.isInteger(n) || n < 1 || n > MULTI_STRATEGY_MAX) {
    throw new Error(`다중 전략은 1~${MULTI_STRATEGY_MAX} 범위만 가능합니다`);
  }
  const base = Math.floor(PICK_COUNT / n);
  const extra = PICK_COUNT % n;
  const counts = new Array(n).fill(base);
  for (let i = 0; i < extra; i += 1) counts[i] += 1;
  return counts;
}

/**
 * S25 (2026-05-03): strategyIds 결정론 정규화 (E안).
 * STRATEGY_ORDER 기준으로 sort. 사용자 클릭 순서 무관 → 같은 strategy 조합은 항상 같은 결과.
 * 알 수 없는 ID는 끝으로 (안전 fallback).
 */
function normalizeStrategyIds(ids) {
  const orderIdx = new Map();
  STRATEGY_ORDER.forEach((id, i) => orderIdx.set(id, i));
  const indexed = ids.map((id, originalIdx) => ({
    id,
    order: orderIdx.has(id) ? orderIdx.get(id) : (STRATEGY_ORDER.length + originalIdx),
  }));
  indexed.sort((a, b) => a.order - b.order);
  return indexed.map((x) => x.id);
}

/**
 * 다중 전략 추천 (S3-T1, S25 재작성). C+E안.
 * S25 변경:
 *   C안: 각 strategy 풀에서 직접 targetCount개 추출 (recommend 6개 추출 → 잘라쓰기 폐기).
 *        누적 collected를 exclude로 weightedSample → 풀 안 균등하게 풀 평균에 수렴.
 *        balancer는 다중 모드에서 일반 균등(균형 필터 미적용 - count<6이라 합/홀짝 검증 불가).
 *   E안: strategyIds를 STRATEGY_ORDER 기준 정규화 → 클릭 순서 무관 결정론.
 * 보너스: 정규화 후 첫 전략 결과 채택. 본번호와 겹치면 균등 추출 fallback.
 *
 * SSOT: docs/02_data.md 1.5.4.
 *
 * @param {object} ctx
 * @param {string[]} ctx.strategyIds 1~MULTI_STRATEGY_MAX개 (정규화 전)
 * @returns {{
 *   numbers: number[],
 *   bonus: number,
 *   reasons: string[],
 *   strategySources: string[],
 * }}
 */
export function recommendMulti(ctx) {
  const { strategyIds, ...rest } = ctx;
  if (!Array.isArray(strategyIds) || strategyIds.length === 0) {
    throw new Error('strategyIds가 비어있음');
  }
  // E안: 정규화. 같은 조합 = 같은 결과 보장.
  const normalized = normalizeStrategyIds(strategyIds);
  const distribution = distributeCounts(normalized.length);
  const collected = [];
  const sources = [];
  const allReasons = [];
  let bonus = null;

  for (let i = 0; i < normalized.length; i += 1) {
    const sid = normalized[i];
    const targetCount = distribution[i];
    const sc = computeStrategyContext({ ...rest, strategyId: sid });

    if (i === 0) {
      // 보너스는 첫 정규화 strategy의 보너스 풀에서 추출 (본번호 미정 → exclude 없이).
      const bonusArr = weightedSample(sc.bonusW, BONUS_COUNT, sc.samplingBonusSeed);
      bonus = bonusArr[0];
    }

    // C안: 풀에서 targetCount개 직접 추출. 누적 collected를 exclude로 풀에서 사전 제외.
    //   풀 안 균등 분포 → 풀 평균에 수렴. "잘라쓰기 휴리스틱" 제거.
    const excludeSet = new Set(collected);
    const picked = weightedSample(sc.finalWeights, targetCount, sc.samplingSeed, excludeSet);
    for (const n of picked) {
      collected.push(n);
      sources.push(sid);
    }
    allReasons.push(...sc.reasons);
  }

  // 부족분 (풀 작은 strategy + 누적 exclude로 풀이 비는 경우) 보충.
  if (collected.length < PICK_COUNT) {
    const fallback = recommend({ ...rest, strategyId: STRATEGY_BLESSED });
    for (const n of fallback.numbers) {
      if (collected.length >= PICK_COUNT) break;
      if (collected.includes(n)) continue;
      collected.push(n);
      sources.push(STRATEGY_BLESSED);
    }
  }

  // numbers + sources 함께 오름차순 정렬 (카드 표시 순서).
  const paired = collected
    .map((n, idx) => ({ n, source: sources[idx] }))
    .sort((a, b) => a.n - b.n);

  // 보너스가 본번호와 겹치면 균등 fallback.
  const numbersOnly = paired.map((p) => p.n);
  if (numbersOnly.includes(bonus)) {
    const { seed = 0, drwNo = 0 } = rest;
    const fbSeed = mixSeeds(mixSeeds(seed >>> 0, drwNo >>> 0), 0xBABA1234);
    const fb = weightedSample(uniformWeights(), 1, fbSeed, new Set(numbersOnly));
    bonus = fb[0];
  }

  return {
    numbers: numbersOnly,
    bonus,
    reasons: allReasons,
    strategySources: paired.map((p) => p.source),
  };
}

/**
 * 5세트 동시 추천 (S4-T1). SSOT: docs/02_data.md 1.5.5, docs/01_spec.md 5.1.3.2.
 * 시드 변형으로 5개 결정론적 다른 결과. i=0이 메인(이력 기록 대상), i=1..4는 표시 전용.
 *
 * 객관 전략은 캐릭터 시드 무관 → 시드 변형이 의미 없음.
 *   대신 mixSeeds(drwNo, OBJECTIVE_SEED_SALT + i)로 회차 내부 5분기.
 *   객관성(캐릭터 무관) 유지.
 *
 * 다중 모드 호환: opts.multi=true이면 각 세트 안에서 recommendMulti 사용.
 *
 * @param {object} ctx recommend / recommendMulti와 동일 ctx
 * @param {object} [opts]
 * @param {boolean} [opts.multi=false] 다중 전략 모드면 true (ctx.strategyIds 필수).
 * @returns {Array<{numbers: number[], bonus: number, reasons: string[], strategySources?: string[]}>}
 *   길이 FIVE_SETS_COUNT.
 */
export function recommendFiveSets(ctx, opts = {}) {
  const { multi = false } = opts;
  const baseSeed = (ctx.seed || 0) >>> 0;
  const drwNo = (ctx.drwNo || 0) >>> 0;

  // 객관 전략 판정. 다중 모드면 strategyIds[0] 기준.
  const probeStrategyId = multi
    ? (Array.isArray(ctx.strategyIds) && ctx.strategyIds.length > 0 ? ctx.strategyIds[0] : STRATEGY_BLESSED)
    : ctx.strategyId;
  const isObjective = OBJECTIVE_STRATEGIES.has(probeStrategyId);

  const out = [];
  for (let i = 0; i < FIVE_SETS_COUNT; i += 1) {
    let setCtx;
    if (i === 0) {
      // 메인 = 기존 동작과 완전 동일 (호환).
      setCtx = ctx;
    } else if (isObjective) {
      // 객관 전략: drwNo 분기 솔트로 회차 내부 5세트. 캐릭터 시드 영향 없음.
      // recommend 내부 objectiveSeed = mixSeeds(drwNo, OBJECTIVE_SEED_SALT)인데
      // 외부에서 drwNo만으로 다양화하려면 drwNo를 분기 솔트로 mix.
      const drwNoVariant = mixSeeds(drwNo, FIVE_SETS_SALT_BASE + i);
      setCtx = { ...ctx, drwNo: drwNoVariant };
    } else {
      // 시드 의존 전략: baseSeed 변형.
      const seedVariant = mixSeeds(baseSeed, FIVE_SETS_SALT_BASE + i);
      setCtx = { ...ctx, seed: seedVariant };
    }
    const rec = multi ? recommendMulti(setCtx) : recommend(setCtx);
    out.push(rec);
  }
  return out;
}
