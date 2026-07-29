// 추천 엔진. SSOT: docs/01_spec.md 5.1.3.0.
// core/는 DOM 금지. 순수 함수.
//
// S43 (2026-05-08) 알고리즘 처음부터 재구축.
// S43.3 (2026-05-08, Sprint 053) dead code 통째로 정리. 옛 architecture 함수 / 헬퍼 모두 폐기.

import {
  NUMBER_MAX, NUMBER_MIN, PICK_COUNT, BONUS_COUNT,
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_ASTROLOGER,
  STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS,
  WEIGHT_MIN_FLOOR,
  ZODIAC_LUCKY,
  ZODIAC_ELEMENT_LUCKY,
  FIVE_ELEMENTS_LUCKY, STEM_TO_ELEMENT,
  STRATEGY_ORDER,
  STAT_LABEL_TOP_K,
  STRATEGY_CATEGORIES,
} from '../data/numbers.js';
import { mulberry32, mixSeeds } from './random.js';

const VECTOR_LEN = NUMBER_MAX - NUMBER_MIN + 1;

const ZODIAC_TO_ELEMENT = {
  aries: 'fire', leo: 'fire', sagittarius: 'fire',
  taurus: 'earth', virgo: 'earth', capricorn: 'earth',
  gemini: 'air', libra: 'air', aquarius: 'air',
  cancer: 'water', scorpio: 'water', pisces: 'water',
};

function uniformWeights() {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = 1;
  return arr;
}

/** weight 비례 비복원 추첨. exclude는 풀에서 사전 제외. */
function weightedSample(weights, count, seed, exclude = null) {
  let pool = weights.map((w, i) => ({ n: i + 1, w: w > 0 ? Math.max(w, WEIGHT_MIN_FLOOR) : 0 }));
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

/** 다중 strategy 정규화. 클릭 순서 무관 결정론 보장. */
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

/** 순수 운세(학설) 프리셋 판정 (2026-07-14, B안).
 *  활성 전략이 전부 mapping 카테고리(별자리/사주/4원소)면 true.
 *  true일 때만 recommendMulti가 행운 번호 union 안에서만 추첨. SSOT: docs/01_spec.md 5.1.3.0. */
function isPureMappingPreset(strategyIds) {
  return strategyIds.length > 0
    && strategyIds.every((sid) => STRATEGY_CATEGORIES[sid] === 'mapping');
}

/** 캐릭터 시드 6번호 추출 (Fisher-Yates shuffle). */
function seedSixNumbers(seed) {
  const pool = [];
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) pool.push(n);
  const rng = mulberry32(seed >>> 0);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, PICK_COUNT);
}

/**
 * S43 단일 weight 벡터 합성. 모든 strategy의 가중을 1-45 base 1.0 + 보너스 +0.3~+0.5로 통합.
 * SSOT: docs/01_spec.md 5.1.3.0.
 */
function computeUnifiedWeights(ctx, strategyIds) {
  const w = new Array(VECTOR_LEN).fill(1.0);
  // S089 (2026-05-17): luck 인자 폐기. BLESSED boost는 고정 +0.5.
  const { seed = 0, drwNo = 0, numberStats = [], bonusStats = [], zodiac, dayPillar } = ctx;

  for (const sid of strategyIds) {
    if (sid === STRATEGY_ASTROLOGER) {
      const lucky = ZODIAC_LUCKY[zodiac] || [];
      for (const n of lucky) w[n - 1] += 0.4;
    } else if (sid === STRATEGY_ZODIAC_ELEMENT) {
      const lucky = ZODIAC_ELEMENT_LUCKY[ZODIAC_TO_ELEMENT[zodiac]] || [];
      for (const n of lucky) w[n - 1] += 0.3;
    } else if (sid === STRATEGY_FIVE_ELEMENTS) {
      const stemEl = STEM_TO_ELEMENT[dayPillar?.stem];
      const lucky = FIVE_ELEMENTS_LUCKY[stemEl] || [];
      for (const n of lucky) w[n - 1] += 0.4;
    } else if (sid === STRATEGY_STATISTICIAN && numberStats.length > 0) {
      const max = Math.max(...numberStats.map((s) => s.totalCount || 0), 1);
      for (const s of numberStats) w[s.number - 1] += ((s.totalCount || 0) / max) * 0.3;
    } else if (sid === STRATEGY_REGRESSIONIST && numberStats.length > 0) {
      const max = Math.max(...numberStats.map((s) => s.currentGap || 0), 1);
      for (const s of numberStats) w[s.number - 1] += ((s.currentGap || 0) / max) * 0.3;
    } else if (sid === STRATEGY_TREND_FOLLOWER && numberStats.length > 0) {
      const max = Math.max(...numberStats.map((s) => s.recent30 || 0), 1);
      for (const s of numberStats) w[s.number - 1] += ((s.recent30 || 0) / max) * 0.3;
    } else if (sid === STRATEGY_SECOND_STAR && bonusStats.length > 0) {
      const max = Math.max(...bonusStats.map((s) => s.totalCount || 0), 1);
      for (const s of bonusStats) w[s.number - 1] += ((s.totalCount || 0) / max) * 0.3;
    } else if (sid === STRATEGY_INTUITIVE) {
      const rng = mulberry32(mixSeeds(seed >>> 0, ((drwNo || 0) + 1) >>> 0));
      for (let i = 0; i < VECTOR_LEN; i += 1) w[i] += rng() * 0.6 - 0.3;
    } else if (sid === STRATEGY_BLESSED) {
      // S089 (2026-05-17): luck 비례 boost 폐기. 시드 6번호에 고정 +0.5.
      const pref = seedSixNumbers(seed);
      for (const n of pref) w[n - 1] += 0.5;
    }
    // STRATEGY_BALANCER: post-filter 폐기. base 1.0 균등 가중. 추가 보너스 0.
  }

  for (let i = 0; i < VECTOR_LEN; i += 1) if (w[i] < 0.1) w[i] = 0.1;
  return w;
}

/** 통계 전략별 top K 번호 집합 산출 (라벨 매칭용. 추첨 영향 0).
 *  S72 (2026-05-16): 통계 카테고리 라벨 매핑 결손 정정.
 *  S73 (2026-05-16): STAT_LABEL_TOP_K 상수를 src/data/numbers.js로 이전 (매직 넘버 0 룰).
 *  computeUnifiedWeights의 가중 부여 metric을 그대로 사용해 상위 K개 추출.
 *  numberStats / bonusStats가 비면 빈 배열 → 라벨 매칭 fall-through. */
function topKForStatStrategy(ctx, sid, k = STAT_LABEL_TOP_K) {
  const { numberStats = [], bonusStats = [] } = ctx;
  if (sid === STRATEGY_TREND_FOLLOWER && numberStats.length > 0) {
    return numberStats.slice().sort((a, b) => (b.recent30 || 0) - (a.recent30 || 0)).slice(0, k).map((s) => s.number);
  }
  if (sid === STRATEGY_STATISTICIAN && numberStats.length > 0) {
    return numberStats.slice().sort((a, b) => (b.totalCount || 0) - (a.totalCount || 0)).slice(0, k).map((s) => s.number);
  }
  if (sid === STRATEGY_REGRESSIONIST && numberStats.length > 0) {
    return numberStats.slice().sort((a, b) => (b.currentGap || 0) - (a.currentGap || 0)).slice(0, k).map((s) => s.number);
  }
  if (sid === STRATEGY_SECOND_STAR && bonusStats.length > 0) {
    return bonusStats.slice().sort((a, b) => (b.totalCount || 0) - (a.totalCount || 0)).slice(0, k).map((s) => s.number);
  }
  return [];
}

/** 번호가 어느 strategy 풀에 속하는지 매핑 (시각 라벨용. 추첨 영향 0).
 *  S77 (2026-05-17): 단일 → **배열 반환**. 다중 학설/통계 매칭 모두 수집.
 *    사용자 명시 "별자리에 동일 번호 있어도 그 번호를 추출한 전략 표시 (오해 차단)".
 *    옛 S72 단일 우선순위(학설→통계→BLESSED→INTUITIVE→BALANCER→첫)는 풀 겹친 번호의 다른 학설 기여를 가렸음.
 *  반환: string[] - 학설/통계 매칭 학설 모두 (strategyIds 순서 보존). 매칭 0건 시 폴백 1개.
 */
function assignSourcesForNumber(n, ctx, strategyIds) {
  const { seed = 0, zodiac, dayPillar } = ctx;
  const matched = [];
  // 1. 학설 매칭 (모두 수집. strategyIds 순서 보존).
  for (const sid of strategyIds) {
    if (sid === STRATEGY_ASTROLOGER && (ZODIAC_LUCKY[zodiac] || []).includes(n)) matched.push(sid);
    if (sid === STRATEGY_FIVE_ELEMENTS) {
      const lucky = FIVE_ELEMENTS_LUCKY[STEM_TO_ELEMENT[dayPillar?.stem]] || [];
      if (lucky.includes(n)) matched.push(sid);
    }
    if (sid === STRATEGY_ZODIAC_ELEMENT) {
      const lucky = ZODIAC_ELEMENT_LUCKY[ZODIAC_TO_ELEMENT[zodiac]] || [];
      if (lucky.includes(n)) matched.push(sid);
    }
  }
  // 2. 통계 매칭 (top K). 모두 수집.
  for (const sid of strategyIds) {
    if (sid === STRATEGY_TREND_FOLLOWER || sid === STRATEGY_STATISTICIAN
      || sid === STRATEGY_REGRESSIONIST || sid === STRATEGY_SECOND_STAR) {
      if (topKForStatStrategy(ctx, sid).includes(n)) matched.push(sid);
    }
  }
  if (matched.length > 0) return matched;
  // 3. BLESSED 시드 매칭 (단독 폴백).
  if (strategyIds.includes(STRATEGY_BLESSED) && seedSixNumbers(seed).includes(n)) {
    return [STRATEGY_BLESSED];
  }
  // 4. INTUITIVE 폴백.
  if (strategyIds.includes(STRATEGY_INTUITIVE)) return [STRATEGY_INTUITIVE];
  // 5. BALANCER 폴백.
  if (strategyIds.includes(STRATEGY_BALANCER)) return [STRATEGY_BALANCER];
  // 6. 첫 전략 폴백.
  return [strategyIds[0]];
}

/**
 * 추천. SSOT: docs/01_spec.md 5.1.3.0.
 * S43 새 architecture: 단일 weight 벡터 + weightedSample 1번 호출.
 *
 * @param {object} ctx
 * @param {number} ctx.seed 캐릭터 결정론 시드
 * @param {string[]} ctx.strategyIds 1개 이상 strategy ID
 * @param {number} [ctx.drwNo=0]
 * @param {Array} [ctx.numberStats]
 * @param {Array} [ctx.bonusStats]
 * @param {string} [ctx.zodiac]
 * @param {object} [ctx.dayPillar]
 * @returns {{numbers: number[], bonus: number, reasons: string[], strategySources: string[][]}}
 *   S77 (2026-05-17): strategySources를 string[] → **string[][]** 변경. 각 번호당 다중 학설/통계 매칭 모두 반환.
 */
export function recommendMulti(ctx) {
  // S43.6 (2026-05-08): ctx.strategyId 단일 입력 호환 (recommend wrapper 폐기 동반).
  let { strategyIds } = ctx;
  const { strategyId, seed = 0, drwNo = 0 } = ctx;
  if (!Array.isArray(strategyIds) || strategyIds.length === 0) {
    strategyIds = strategyId ? [strategyId] : [];
  }
  if (strategyIds.length === 0) {
    throw new Error('strategyIds가 비어있음');
  }
  const normalized = normalizeStrategyIds(strategyIds);
  let w = computeUnifiedWeights(ctx, normalized);
  // B안 (2026-07-14): 순수 운세(학설) 프리셋은 행운 번호 union 안에서만 추첨.
  //   union 밖 번호를 weightedSample exclude로 전부 제외. union < PICK_COUNT면 안전하게 전 범위 유지.
  //   SSOT: docs/01_spec.md 5.1.3.0 "순수 운세(학설) 프리셋 풀 제한".
  let exclude = null;
  if (isPureMappingPreset(normalized)) {
    const poolArr = computePoolForStrategies(normalized, ctx);
    if (poolArr.length >= PICK_COUNT) {
      const poolSet = new Set(poolArr);
      exclude = new Set();
      for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
        if (!poolSet.has(n)) exclude.add(n);
      }
      // 사용자 결정 (2026-07-14): 풀 안에서는 가중치 없이 순수 무작위 (실제 로또처럼 각 번호 동일 확률).
      //   다중 학설 매칭 boost가 특정 작은 수(1/3 등)를 과대표집시켜 "앞번호 반복"을 유발 →
      //   풀 안 균등 weight로 교체해 인위적 밀어주기 제거. 학설 매칭 라벨(색점)은 표시용이라 무관.
      w = uniformWeights();
    }
  }
  const samplingSeed = mixSeeds(seed >>> 0, ((drwNo || 0) + 0xC0FFEE) >>> 0);
  const collected = weightedSample(w, PICK_COUNT, samplingSeed, exclude);
  collected.sort((a, b) => a - b);
  // S77: 다중 학설/통계 매칭 모두 수집 (배열 of 배열).
  const sources = collected.map((n) => assignSourcesForNumber(n, ctx, normalized));

  const bonusSeed = mixSeeds(samplingSeed >>> 0, 0xBABA1234);
  const bonusArr = weightedSample(uniformWeights(), BONUS_COUNT, bonusSeed, new Set(collected));
  const bonus = bonusArr[0];

  return {
    numbers: collected,
    bonus,
    reasons: [`S43 단일 추첨 (${normalized.length}개 strategy 합성 weight).`],
    strategySources: sources,
  };
}

/**
 * 학설 풀 union 반환 (시각 표시용). S43.3 (2026-05-08) 단순화.
 * 통계/랜덤/직감/균형은 풀 = 1-45 전체라 표시 의미 없음 → 빈 set 반환.
 * 학설 strategy(별자리/4원소/사주)만 lucky 집합 union 반환.
 */
export function computePoolForStrategies(strategyIds, ctx) {
  if (!Array.isArray(strategyIds) || strategyIds.length === 0) return [];
  const { zodiac, dayPillar } = ctx;
  const union = new Set();
  for (const sid of strategyIds) {
    if (sid === STRATEGY_ASTROLOGER) {
      (ZODIAC_LUCKY[zodiac] || []).forEach((n) => union.add(n));
    } else if (sid === STRATEGY_ZODIAC_ELEMENT) {
      (ZODIAC_ELEMENT_LUCKY[ZODIAC_TO_ELEMENT[zodiac]] || []).forEach((n) => union.add(n));
    } else if (sid === STRATEGY_FIVE_ELEMENTS) {
      (FIVE_ELEMENTS_LUCKY[STEM_TO_ELEMENT[dayPillar?.stem]] || []).forEach((n) => union.add(n));
    }
  }
  return [...union].sort((a, b) => a - b);
}

