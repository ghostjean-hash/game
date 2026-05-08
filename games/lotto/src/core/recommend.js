// 추천 엔진. SSOT: docs/01_spec.md 4.5 / 5.2.
// core/는 DOM 금지. 순수 함수.
// 전략(strategy)은 캐릭터 속성이 아니라 추첨 시 사용자가 선택하는 가중치 정책.

// S34 (2026-05-08): STRATEGY_PAIR_TRACKER import 제거 (전략 폐기 동반).
import {
  NUMBER_MIN, NUMBER_MAX, PICK_COUNT, BONUS_COUNT,
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_ASTROLOGER,
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
  // S38 (2026-05-08): 데이터 부재 fix. 모든 weight 동일이면 풀 컷팅 의미 없음.
  //   기존: 데이터 비어있어 모두 WEIGHT_MIN_FLOOR/1 균등 → sort stable → 인덱스 0~9(=번호 1~10) 풀 결정론.
  //   사용자가 페치 전 / 새 캐릭터 / 신규 구좌에서 "1~9 위주 추천" 시청. 균형 프리셋(trendFollower 포함)이 본 결함 노출.
  //   fix: max === min이면 풀 컷팅 우회 → 1~45 균등 반환. 정상 데이터(가중 차등)는 영향 0.
  if (!Array.isArray(weights) || weights.length === 0) return [];
  let max = -Infinity;
  let min = Infinity;
  for (const w of weights) {
    if (w > max) max = w;
    if (w < min) min = w;
  }
  if (max === min) {
    return new Array(weights.length).fill(1);
  }
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

// S34 (2026-05-08): keyNumberFromSeed / objectivePairWeights 폐기 - 짝꿍 전략 폐기 동반.
//   동시출현 매트릭스(cooccur) 자체는 stats.js에서 통계 탭 노출용으로 유지.

// S18: 풀 컷팅. lucky 풀 안 = 1, 풀 밖 = 0 (절대 안 뽑힘).
// S33 (2026-05-08): 별자리 미지정 fallback 명시. zodiac 없으면 균등.
//   weightedSample의 floor 제거(S33)로 모든 weight 0이면 추첨 0개가 되므로 안전망.
function zodiacWeights(zodiac) {
  const lucky = ZODIAC_LUCKY[zodiac] || [];
  if (lucky.length === 0) return uniformWeights();
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
  // S33 (2026-05-07): 풀 외 0 유지. 원본 0(풀 외)은 0으로 유지하여 추첨 차단.
  //   이전 구현은 모든 weight를 WEIGHT_MIN_FLOOR로 floor → 풀 외도 추첨 가능.
  //   total <= 0 가드로 모든 weight=0 케이스도 안전. SSOT: docs/02_data.md 1.5.2.5 / 1.7.
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

/**
 * S25 (2026-05-03): strategy weight + 시드 + reasons 계산만 분리.
 * recommend / recommendMulti 양쪽이 공유. 외부 호출 안 됨 (내부 helper).
 *
 * @returns {{
 *   finalWeights: number[],
 *   mainWeights: number[],
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

  // S30.2 (2026-05-04): mainWeights를 노출.
  //   풀 표시(computePoolForStrategies)는 mainWeights 기준 (applyLuck 전).
  //   applyLuck의 WEIGHT_MIN_FLOOR가 풀 외 0을 양수로 만들어 풀이 1~45로 확장되는 문제 해결.
  return { finalWeights, mainWeights, bonusW, samplingSeed, samplingBonusSeed, isObjective, isBalancer, reasons };
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
/**
 * @deprecated S43 (2026-05-08): 알고리즘 처음부터 재구축. 새 architecture는 `recommendMulti`만 사용.
 *   본 함수 + 옛 헬퍼들(`distributeCounts` / `computeStrategyContext` / `poolFromWeights` / 통계 weight 함수)은
 *   외부 호출 0건. 다음 sprint에서 폐기. 현재는 테스트 import 영향 보존용.
 *   SSOT: docs/01_spec.md 5.1.3.0.
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
/**
 * S43 (2026-05-08) - 알고리즘 처음부터 재구축.
 *
 * 사용자 통찰 "알고리즘 근본 자체 잘못. 부분 fix 의미 없다" 반영.
 *
 * 옛 architecture 결함:
 *   - 다중 strategy 분배(6/N개씩) → 각 strategy 별도 풀에서 추첨 → 정렬 시 끝자리 패턴 충돌 (2/3/4, 21/22/24 인접 클러스터링).
 *   - 풀 컷팅 + 학설 풀 좁음 + Luck 25배 보너스 + balancer 합 필터 누적 보정 → 1번대 무조건 노출.
 *
 * 새 architecture:
 *   1. 모든 strategy의 가중을 단일 weight 벡터(1-45 base 1.0)로 합성.
 *   2. weightedSample 1번 호출 → 6번호 추첨.
 *   3. 풀 컷팅 / 분배 / Luck 25배 / balancer post-filter / 합 필터 모두 우회.
 *   4. 학설 / 통계 가중은 약한 보너스(+0.3~+0.5)만. 한국 6/45 실 분포 ±5% 노이즈.
 *   5. 정렬 시 인접 클러스터링 발생 안 함 (단일 추첨이라 풀 인접 인덱스 동시 채택 가능성 균등).
 *   6. strategySources 시각 라벨 = 번호가 어느 학설 풀 안에 있는지 매핑(시각만, 추첨 영향 0).
 */
function computeUnifiedWeights(ctx, strategyIds) {
  const w = new Array(VECTOR_LEN).fill(1.0);
  const { seed = 0, drwNo = 0, luck = 50, numberStats = [], bonusStats = [], zodiac, dayPillar } = ctx;

  const elMap = {
    aries: 'fire', leo: 'fire', sagittarius: 'fire',
    taurus: 'earth', virgo: 'earth', capricorn: 'earth',
    gemini: 'air', libra: 'air', aquarius: 'air',
    cancer: 'water', scorpio: 'water', pisces: 'water',
  };

  for (const sid of strategyIds) {
    if (sid === STRATEGY_ASTROLOGER) {
      const lucky = ZODIAC_LUCKY[zodiac] || [];
      for (const n of lucky) w[n - 1] += 0.4;
    } else if (sid === STRATEGY_ZODIAC_ELEMENT) {
      const lucky = ZODIAC_ELEMENT_LUCKY[elMap[zodiac]] || [];
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
      const ratio = Math.max(0, Math.min(1, (luck || 0) / 100));
      const boost = ratio * 0.5;
      const pool = [];
      for (let n = 1; n <= 45; n += 1) pool.push(n);
      const rng = mulberry32(seed >>> 0);
      for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      for (let i = 0; i < 6; i += 1) w[pool[i] - 1] += boost;
    }
    // STRATEGY_BALANCER: post-filter 폐기. 1-45 균등 가중 (추가 보너스 0). 합 100-180 자연 통과 빈도.
  }

  for (let i = 0; i < VECTOR_LEN; i += 1) if (w[i] < 0.1) w[i] = 0.1;
  return w;
}

/** 번호가 어느 strategy 풀에 속하는지 매핑 (시각 라벨용. 추첨 영향 0).
 *  매핑 우선순위: 학설 풀 안 매칭 → BLESSED 시드 6번호 → INTUITIVE → 첫 strategy.
 *  학설 풀 외 번호가 학설 라벨 부착되는 모순 방지. */
function assignSourceForNumber(n, ctx, strategyIds) {
  const { seed = 0, zodiac, dayPillar } = ctx;
  const elMap = {
    aries: 'fire', leo: 'fire', sagittarius: 'fire',
    taurus: 'earth', virgo: 'earth', capricorn: 'earth',
    gemini: 'air', libra: 'air', aquarius: 'air',
    cancer: 'water', scorpio: 'water', pisces: 'water',
  };
  for (const sid of strategyIds) {
    if (sid === STRATEGY_ASTROLOGER && (ZODIAC_LUCKY[zodiac] || []).includes(n)) return sid;
    if (sid === STRATEGY_FIVE_ELEMENTS) {
      const lucky = FIVE_ELEMENTS_LUCKY[STEM_TO_ELEMENT[dayPillar?.stem]] || [];
      if (lucky.includes(n)) return sid;
    }
    if (sid === STRATEGY_ZODIAC_ELEMENT) {
      const lucky = ZODIAC_ELEMENT_LUCKY[elMap[zodiac]] || [];
      if (lucky.includes(n)) return sid;
    }
  }
  // BLESSED 시드 6번호 매칭
  if (strategyIds.includes(STRATEGY_BLESSED)) {
    const pool = [];
    for (let i = 1; i <= 45; i += 1) pool.push(i);
    const rng = mulberry32(seed >>> 0);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    if (pool.slice(0, 6).includes(n)) return STRATEGY_BLESSED;
  }
  // 학설 / 시드 매칭 안 되면 INTUITIVE 우선 → 통계계 → 첫 strategy
  if (strategyIds.includes(STRATEGY_INTUITIVE)) return STRATEGY_INTUITIVE;
  if (strategyIds.includes(STRATEGY_BALANCER)) return STRATEGY_BALANCER;
  return strategyIds[0];
}

export function recommendMulti(ctx) {
  const { strategyIds, seed = 0, drwNo = 0 } = ctx;
  if (!Array.isArray(strategyIds) || strategyIds.length === 0) {
    throw new Error('strategyIds가 비어있음');
  }
  const normalized = normalizeStrategyIds(strategyIds);

  // S43: 단일 weight 합성 + 단일 추첨. 분배 / 풀 컷팅 / Luck 25배 / 합 필터 우회.
  const w = computeUnifiedWeights(ctx, normalized);
  const samplingSeed = mixSeeds(seed >>> 0, ((drwNo || 0) + 0xC0FFEE) >>> 0);
  const collected = weightedSample(w, PICK_COUNT, samplingSeed);
  collected.sort((a, b) => a - b);
  const sources = collected.map((n) => assignSourceForNumber(n, ctx, normalized));

  // 보너스: 본번호 제외 후 1-45 균등 추첨.
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
 * S29.2 (2026-05-04) / S30.1: 사용 풀 계산 (호출부에서 strategyIds=[focusedId] 단일 전달).
 *
 * **풀 정의 (S30.2 정정)**: `mainWeights > 0`인 번호 (applyLuck 전). 풀 컷팅 직후 weight 기준.
 *   applyLuck의 `WEIGHT_MIN_FLOOR`가 풀 외 0을 양수로 만들어 시드 의존 전략(pairTracker /
 *   astrologer / zodiacElement / fiveElements)의 풀이 1~45로 확장되는 문제 해결.
 *   객관 전략은 finalWeights == mainWeights라 영향 없음.
 *
 * @param {string[]} strategyIds 1개 이상의 전략 ID. S30.1: 호출부가 [focusedId] 단일 전달 권장.
 * @param {object} ctx recommend / recommendMulti와 동일한 ctx.
 * @returns {number[]} 풀 번호 (오름차순).
 */
// S34 (2026-05-08): computePairsForPairTracker 폐기. 짝꿍 페어 박스 UI 동반 제거.

export function computePoolForStrategies(strategyIds, ctx) {
  if (!Array.isArray(strategyIds) || strategyIds.length === 0) return [];
  const sids = normalizeStrategyIds(strategyIds);
  const union = new Set();
  for (const sid of sids) {
    const sc = computeStrategyContext({ ...ctx, strategyId: sid });
    // S30.5 (2026-05-04 - 인덱스 버그 fix): mainWeights는 0-based (arr[number-1] = ...).
    //   기존 (i=1~45, mainWeights[i])는 1-based로 잘못 읽어 모든 풀이 -1 shift됐음.
    //   결과: 캐릭터 카드 별자리/원소/사주 행운 번호와 풀 표시가 정확히 1씩 어긋남 (사용자 지적).
    //   fix: mainWeights[number - 1]로 0-based 접근, union.add(number)로 1-based 번호 추가.
    for (let n = 1; n <= 45; n += 1) {
      if ((sc.mainWeights[n - 1] || 0) > 0) union.add(n);
    }
  }
  return [...union].sort((a, b) => a - b);
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
    // S43.2: 모든 호출을 recommendMulti로 통일 (단일 strategy → strategyIds 1개 list).
    const sids = ctx.strategyIds || (ctx.strategyId ? [ctx.strategyId] : []);
    const rec = recommendMulti({ ...setCtx, strategyIds: sids });
    out.push(rec);
  }
  return out;
}
