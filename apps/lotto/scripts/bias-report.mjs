// 추천 번호 분포 / 편향 정량 검증 도구. SSOT: docs/03_architecture.md 1장 (scripts/ 책임).
// S67 (2026-05-10): 사용자 보고 "추천 번호가 작위적인 느낌이 강해" 정량 진단.
//   11 전략 × 60 캐릭터 × 1000 추출 = 660,000 sets. 7차원 분포 + K3 판정.
//
// 실행:
//   node scripts/bias-report.mjs
//   또는 인자 N (캐릭터당 추출 수): node scripts/bias-report.mjs 2000
//
// 출력:
//   stdout 요약 + tests/reports/bias_<YYYY-MM-DD>.md
//
// 의존: src/core/* + src/data/* + node:fs / node:path / node:url
//   render / DOM / localStorage 미의존 (03_architecture 2.3.4 준수).

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { recommendMulti } from '../src/core/recommend.js';
import { computeNumberStats, computeBonusStats } from '../src/core/stats.js';
import { mixSeeds } from '../src/core/random.js';
import {
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_ASTROLOGER,
  STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS,
  SAVED_SETS_SALT_BASE,
  NUMBER_MIN, NUMBER_MAX, PICK_COUNT,
  LUCK_INITIAL,
  DEFAULT_PRESETS,
} from '../src/data/numbers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRAWS_PATH = resolve(ROOT, 'src/data/draws.json');
const REPORT_DIR = resolve(ROOT, 'tests/reports');

// ============================================================
// 1. 분석 파라미터 (재현성 위해 고정값. 사용자 인자로 N만 변경 가능)
// ============================================================

const DEFAULT_N_PER_CHAR = 1000;     // 캐릭터당 추출 수
const N_DRWNO_MIX = 100;             // 최근 회차 mix 폭
const ZODIACS = Object.freeze([
  'aries','taurus','gemini','cancer','leo','virgo',
  'libra','scorpio','sagittarius','capricorn','aquarius','pisces',
]);
// 천간 5종 (오행 5종 각각의 양간 대표). 사주 풀 5종 모두 cover.
const STEMS = Object.freeze(['gap','byeong','mu','gyeong','im']);
// 60명 = 12 zodiac × 5 stem. branch는 recommend.js에서 미참조라 'rat' 고정.
const STEM_FIXED_BRANCH = 'rat';
const CHAR_LUCK = LUCK_INITIAL;       // 모든 캐릭터 동일 Luck (블레스드 전략 보정 일정 비교)

// ============================================================
// 2. 카이제곱 alpha=0.05 임계값 테이블 (df별)
//    출처: 표준 카이제곱 분포 표. K2 판정 = chi^2 > critical → p<0.05 → 편향.
// ============================================================
const CHI2_CRITICAL_05 = Object.freeze({
  1: 3.841, 2: 5.991, 3: 7.815, 4: 9.488, 5: 11.070,
  6: 12.592, 7: 14.067, 8: 15.507, 9: 16.919, 10: 18.307,
  44: 60.481,
});

// ============================================================
// 3. 자연 기대치 (6/45 균등 추첨 가정)
// ============================================================
// 5구간 (1-9 / 10-18 / 19-27 / 28-36 / 37-45) 각 9개 → 각 20%
const BAND_EDGES = Object.freeze([9, 18, 27, 36, 45]);
const BAND_LABELS = Object.freeze(['1-9','10-18','19-27','28-36','37-45']);
const NATURAL_BAND_RATIO = 1 / 5;     // 각 구간 9개/45개 = 20%

// 짝/홀: 짝 22개 (2,4,..,44), 홀 23개 (1,3,..,45)
const NATURAL_EVEN_RATIO = 22 / 45;

// 끝자리 0~9 자연 기대 비율 (개수/45)
//   0: 4 (10,20,30,40), 1~5: 5, 6~9: 4
const NATURAL_ENDING_COUNTS = Object.freeze({
  0: 4, 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 4, 7: 4, 8: 4, 9: 4,
});

// 합계 분포 (6/45 비복원 추첨)
//   평균 = 6 × 23 = 138
//   분산 = 6 × ((45²-1)/12) × ((45-6)/(45-1)) = 6 × 168.667 × 0.8864 = 897.0
//   표준편차 = √897.0 ≈ 29.95
const NATURAL_SUM_MEAN = 6 * (NUMBER_MIN + NUMBER_MAX) / 2;
const NATURAL_SUM_VARIANCE = PICK_COUNT * ((NUMBER_MAX * NUMBER_MAX - 1) / 12) * ((NUMBER_MAX - PICK_COUNT) / (NUMBER_MAX - 1));
const NATURAL_SUM_STDDEV = Math.sqrt(NATURAL_SUM_VARIANCE);

// 인접 페어 1개 이상 포함 확률 (정확값)
//   = 1 - C(40,6) / C(45,6) = 1 - 3,838,380 / 8,145,060 = 0.5287
const NATURAL_ADJ_PAIR_PROB = 1 - combinations(NUMBER_MAX - PICK_COUNT + 1, PICK_COUNT) / combinations(NUMBER_MAX, PICK_COUNT);

// 자카드 자연 기대 (두 무작위 6/45 추첨의 평균 |A∩B| / |A∪B|)
//   |A∩B| 분포 = hypergeometric(N=45, K=6, n=6). E[|A∩B|] = 6×6/45 = 0.8
//   평균 자카드는 |A∩B|/(12-|A∩B|) 기댓값 = 약 0.08 (시뮬 검증치).
//   본 도구는 자체 시뮬 baseline 사용 (cleaner).
const NATURAL_JACCARD_BASELINE = computeNaturalJaccardBaseline();

// K1: 자연 기대 대비 ±20% 초과 시 편향. SSOT: 사용자 정의 (S67).
const K1_THRESHOLD = 0.20;

// ============================================================
// 4. 시나리오 정의 (단일 전략 11 + 다중 전략 묶음 9 = 20)
//    S67-B (2026-05-10): 단일만 측정으로는 사용자 인상 cover 불충분.
//    DEFAULT_PRESETS 3종(사용자 실 사용) + 카테고리 mix 6종 추가.
//    각 시나리오 = ids 배열 (단일이면 1개 원소).
// ============================================================
function preset(id) {
  return DEFAULT_PRESETS.find((p) => p.id === id).strategyIds;
}

const SCENARIOS = Object.freeze([
  // --- 단일 전략 11종 ---
  // 랜덤 카테고리 (자연 기대 균등 - 정도 기준)
  { id: STRATEGY_BLESSED,        label: '랜덤(축복)', cat: '랜덤', kind: 'random', ids: [STRATEGY_BLESSED] },
  { id: STRATEGY_INTUITIVE,      label: '직감',       cat: '랜덤', kind: 'random', ids: [STRATEGY_INTUITIVE] },
  { id: STRATEGY_BALANCER,       label: '균형',       cat: '랜덤', kind: 'random', ids: [STRATEGY_BALANCER] },
  // 통계 카테고리 (학습 데이터 의도된 편향)
  { id: STRATEGY_TREND_FOLLOWER, label: '최신',       cat: '통계', kind: 'biased', ids: [STRATEGY_TREND_FOLLOWER] },
  { id: STRATEGY_STATISTICIAN,   label: '많이',       cat: '통계', kind: 'biased', ids: [STRATEGY_STATISTICIAN] },
  { id: STRATEGY_SECOND_STAR,    label: '보너스',     cat: '통계', kind: 'biased', ids: [STRATEGY_SECOND_STAR] },
  { id: STRATEGY_REGRESSIONIST,  label: '적게',       cat: '통계', kind: 'biased', ids: [STRATEGY_REGRESSIONIST] },
  // 운세 카테고리 (학설 풀 의도된 편향)
  { id: STRATEGY_ASTROLOGER,     label: '별자리',     cat: '운세', kind: 'biased', ids: [STRATEGY_ASTROLOGER] },
  { id: STRATEGY_ZODIAC_ELEMENT, label: '4원소',      cat: '운세', kind: 'biased', ids: [STRATEGY_ZODIAC_ELEMENT] },
  { id: STRATEGY_FIVE_ELEMENTS,  label: '사주',       cat: '운세', kind: 'biased', ids: [STRATEGY_FIVE_ELEMENTS] },
  // --- 다중 전략 묶음 9종 (사용자 실 사용 우선) ---
  // DEFAULT_PRESETS 3종
  { id: 'preset-1', label: '프리셋1 균형',  cat: '다중-프리셋', kind: 'biased', ids: preset('preset-1') },
  { id: 'preset-2', label: '프리셋2 분산파', cat: '다중-프리셋', kind: 'biased', ids: preset('preset-2') },
  { id: 'preset-3', label: '프리셋3 운세파', cat: '다중-프리셋', kind: 'biased', ids: preset('preset-3') },
  // 카테고리 내 mix
  { id: 'cat-random',  label: '카테고리 랜덤전체', cat: '다중-카테고리', kind: 'random', ids: [STRATEGY_BLESSED, STRATEGY_INTUITIVE, STRATEGY_BALANCER] },
  { id: 'cat-stats',   label: '카테고리 통계전체', cat: '다중-카테고리', kind: 'biased', ids: [STRATEGY_TREND_FOLLOWER, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR, STRATEGY_REGRESSIONIST] },
  { id: 'cat-mapping', label: '카테고리 운세전체', cat: '다중-카테고리', kind: 'biased', ids: [STRATEGY_ASTROLOGER, STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS] },
  // 카테고리 cross mix (대표 페어)
  { id: 'cross-mr', label: '운세+랜덤 (별자리+직감)', cat: '다중-cross', kind: 'biased', ids: [STRATEGY_ASTROLOGER, STRATEGY_INTUITIVE] },
  { id: 'cross-ms', label: '운세+통계 (별자리+많이)', cat: '다중-cross', kind: 'biased', ids: [STRATEGY_ASTROLOGER, STRATEGY_STATISTICIAN] },
  { id: 'cross-rs', label: '랜덤+통계 (직감+많이)',   cat: '다중-cross', kind: 'biased', ids: [STRATEGY_INTUITIVE, STRATEGY_STATISTICIAN] },
]);

// ============================================================
// 5. 헬퍼 - 수학 / 통계
// ============================================================

function combinations(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let num = 1, den = 1;
  for (let i = 0; i < k; i += 1) {
    num *= (n - i);
    den *= (i + 1);
  }
  return num / den;
}

/**
 * 카이제곱 통계량. observed / expected 모두 같은 길이 배열.
 * chi^2 = sum((o - e)^2 / e). expected에 0 포함되면 그 항 skip.
 */
function chiSquare(observed, expected) {
  let sum = 0;
  for (let i = 0; i < observed.length; i += 1) {
    const e = expected[i];
    if (e <= 0) continue;
    const diff = observed[i] - e;
    sum += (diff * diff) / e;
  }
  return sum;
}

/**
 * K2 판정: chi^2이 alpha=0.05 임계값 초과면 true (편향).
 * df 키가 표에 없으면 가까운 키로 보간 없이 가장 큰 df로 보수적 판정.
 */
function k2Reject(chi2, df) {
  const critical = CHI2_CRITICAL_05[df];
  if (typeof critical === 'number') return chi2 > critical;
  // 임계값 표에 없는 df = 보수적으로 통과 처리 (false). 본 도구가 사용하는 df는 모두 표에 등록.
  return false;
}

/**
 * K1 판정: 관측 비율이 자연 기대 비율의 ±20% 초과 시 true.
 * 차원별 호출: 어떤 카테고리(구간/짝홀/끝자리/번호)든 기대 비율 대비 비교.
 */
function k1RejectRatio(observedRatio, expectedRatio) {
  if (expectedRatio <= 0) return observedRatio > 0; // 기대 0인데 관측 > 0 = 편향
  const diff = Math.abs(observedRatio - expectedRatio) / expectedRatio;
  return diff > K1_THRESHOLD;
}

/**
 * K3: K1 결과 + K2 결과 합성.
 * @returns {'ok' | 'caution' | 'strong'}
 *   둘 다 통과 → ok
 *   한쪽만 위반 → caution
 *   둘 다 위반 → strong
 */
function k3Verdict(k1, k2) {
  if (k1 && k2) return 'strong';
  if (k1 || k2) return 'caution';
  return 'ok';
}

function k3Label(v) {
  return ({ ok: '정상', caution: '주의', strong: '강한 편향' })[v] || v;
}

// 자연 자카드 baseline 시뮬 (재현성 고정 시드).
function computeNaturalJaccardBaseline() {
  const rngSeed = 0xBA5E11;
  let s = rngSeed >>> 0;
  function rand() {
    // mulberry32 inline (random.js와 동일 구현, baseline 격리)
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function pick6() {
    const pool = [];
    for (let n = 1; n <= NUMBER_MAX; n += 1) pool.push(n);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, PICK_COUNT);
  }
  const N = 5000;
  let total = 0;
  for (let i = 0; i < N; i += 1) {
    const A = pick6(); const B = pick6();
    const setA = new Set(A);
    let inter = 0;
    for (const x of B) if (setA.has(x)) inter += 1;
    const union = (PICK_COUNT * 2) - inter;
    total += inter / union;
  }
  return total / N;
}

// ============================================================
// 6. 캐릭터 합성 (60명 = 12 zodiac × 5 stem)
// ============================================================

function buildCharacters() {
  const chars = [];
  let idx = 0;
  for (const zodiac of ZODIACS) {
    for (const stem of STEMS) {
      const seed = mixSeeds((idx + 1) >>> 0, 0xC4A5EED);
      chars.push({
        seed,
        zodiac,
        dayPillar: { stem, branch: STEM_FIXED_BRANCH },
        luck: CHAR_LUCK,
        label: `${zodiac}/${stem}`,
      });
      idx += 1;
    }
  }
  return chars;
}

// ============================================================
// 7. 추출 시뮬 (전략 1개 × 캐릭터 N명 × NPerChar 추출)
// ============================================================

function collectScenario(strategyIds, characters, stats, drwNoList, nPerChar) {
  const sets = [];
  for (const char of characters) {
    for (let i = 0; i < nPerChar; i += 1) {
      const drwNo = drwNoList[i % drwNoList.length];
      const seedSalt = SAVED_SETS_SALT_BASE + i;
      const seed = mixSeeds(char.seed >>> 0, seedSalt >>> 0);
      const ctx = {
        seed,
        drwNo,
        luck: char.luck,
        numberStats: stats.numberStats,
        bonusStats: stats.bonusStats,
        zodiac: char.zodiac,
        dayPillar: char.dayPillar,
        strategyIds,
      };
      const r = recommendMulti(ctx);
      sets.push({
        numbers: r.numbers,
        charLabel: char.label,
      });
    }
  }
  return sets;
}

// ============================================================
// 8. 7차원 측정 (전략 단위 sets 입력)
// ============================================================

function measureBands(sets) {
  // 5구간 분포 (1-9 / 10-18 / 19-27 / 28-36 / 37-45)
  const counts = [0, 0, 0, 0, 0];
  let total = 0;
  for (const s of sets) {
    for (const n of s.numbers) {
      let b = 0;
      while (b < BAND_EDGES.length - 1 && n > BAND_EDGES[b]) b += 1;
      counts[b] += 1;
      total += 1;
    }
  }
  const ratios = counts.map((c) => c / total);
  const expected = counts.map(() => total * NATURAL_BAND_RATIO);
  const chi2 = chiSquare(counts, expected);
  const df = counts.length - 1;
  const k2 = k2Reject(chi2, df);
  const k1 = ratios.some((r) => k1RejectRatio(r, NATURAL_BAND_RATIO));
  return { counts, ratios, total, chi2, df, k1, k2, verdict: k3Verdict(k1, k2) };
}

function measureNumberFreq(sets) {
  const counts = new Array(NUMBER_MAX).fill(0);
  let total = 0;
  for (const s of sets) {
    for (const n of s.numbers) {
      counts[n - 1] += 1;
      total += 1;
    }
  }
  const expected = counts.map(() => total / NUMBER_MAX);
  const chi2 = chiSquare(counts, expected);
  const df = NUMBER_MAX - 1;
  const k2 = k2Reject(chi2, df);
  const ratios = counts.map((c) => c / total);
  const expectedRatio = 1 / NUMBER_MAX;
  const violators = [];
  ratios.forEach((r, i) => {
    if (k1RejectRatio(r, expectedRatio)) violators.push({ number: i + 1, ratio: r, expected: expectedRatio });
  });
  const k1 = violators.length > 0;
  return { counts, ratios, total, chi2, df, k1, k2, violators, verdict: k3Verdict(k1, k2) };
}

function measureEvenOdd(sets) {
  let even = 0, odd = 0;
  for (const s of sets) {
    for (const n of s.numbers) {
      if (n % 2 === 0) even += 1; else odd += 1;
    }
  }
  const total = even + odd;
  const evenRatio = even / total;
  const oddRatio = odd / total;
  const expectedEven = total * NATURAL_EVEN_RATIO;
  const expectedOdd = total * (1 - NATURAL_EVEN_RATIO);
  const chi2 = chiSquare([even, odd], [expectedEven, expectedOdd]);
  const df = 1;
  const k2 = k2Reject(chi2, df);
  const k1 = k1RejectRatio(evenRatio, NATURAL_EVEN_RATIO);
  return { even, odd, evenRatio, oddRatio, total, chi2, df, k1, k2, verdict: k3Verdict(k1, k2) };
}

function measureSum(sets) {
  let sum = 0; let sumSq = 0; const N = sets.length;
  for (const s of sets) {
    const total = s.numbers.reduce((a, b) => a + b, 0);
    sum += total;
    sumSq += total * total;
  }
  const mean = sum / N;
  const variance = sumSq / N - mean * mean;
  const stdDev = Math.sqrt(Math.max(0, variance));
  // K1: 평균이 자연 평균 ±20% 초과 또는 표준편차가 자연 표준편차의 ±20% 초과
  const meanDev = Math.abs(mean - NATURAL_SUM_MEAN) / NATURAL_SUM_MEAN;
  const stdDevDev = Math.abs(stdDev - NATURAL_SUM_STDDEV) / NATURAL_SUM_STDDEV;
  const k1 = meanDev > K1_THRESHOLD || stdDevDev > K1_THRESHOLD;
  // K2: t-test 같은 정밀 검정 대신 단순 z-score (표본 평균이 자연 평균에서 표준오차 N개 이상 떨어짐)
  //   stdErrMean = NATURAL_SUM_STDDEV / sqrt(N). z = (mean - NATURAL_SUM_MEAN) / stdErrMean.
  //   |z| > 1.96 → p<0.05 (양측).
  const stdErrMean = NATURAL_SUM_STDDEV / Math.sqrt(N);
  const z = (mean - NATURAL_SUM_MEAN) / stdErrMean;
  const k2 = Math.abs(z) > 1.96;
  return { mean, stdDev, naturalMean: NATURAL_SUM_MEAN, naturalStdDev: NATURAL_SUM_STDDEV, z, k1, k2, verdict: k3Verdict(k1, k2) };
}

function measureAdjacent(sets) {
  let withAdj = 0; let withTriple = 0; const N = sets.length;
  for (const s of sets) {
    const sorted = [...s.numbers].sort((a, b) => a - b);
    let hasAdj = false; let hasTriple = false;
    for (let i = 0; i < sorted.length - 1; i += 1) {
      if (sorted[i + 1] - sorted[i] === 1) {
        hasAdj = true;
        if (i < sorted.length - 2 && sorted[i + 2] - sorted[i + 1] === 1) hasTriple = true;
      }
    }
    if (hasAdj) withAdj += 1;
    if (hasTriple) withTriple += 1;
  }
  const adjRatio = withAdj / N;
  // K1: 자연 0.5287 ±20%
  const k1 = k1RejectRatio(adjRatio, NATURAL_ADJ_PAIR_PROB);
  // K2: 이항 검정 (n=N, p=0.5287) z-score 근사
  const expectedAdj = N * NATURAL_ADJ_PAIR_PROB;
  const stdAdj = Math.sqrt(N * NATURAL_ADJ_PAIR_PROB * (1 - NATURAL_ADJ_PAIR_PROB));
  const z = (withAdj - expectedAdj) / stdAdj;
  const k2 = Math.abs(z) > 1.96;
  return { withAdj, withTriple, adjRatio, naturalAdj: NATURAL_ADJ_PAIR_PROB, z, total: N, k1, k2, verdict: k3Verdict(k1, k2) };
}

function measureEndingDigit(sets) {
  const counts = [0,0,0,0,0,0,0,0,0,0];
  let total = 0;
  for (const s of sets) {
    for (const n of s.numbers) {
      counts[n % 10] += 1;
      total += 1;
    }
  }
  // 자연 기대: 끝자리 d 개수 / 45 × 6 × N
  const expected = [];
  for (let d = 0; d < 10; d += 1) {
    expected.push(total * (NATURAL_ENDING_COUNTS[d] / NUMBER_MAX));
  }
  const chi2 = chiSquare(counts, expected);
  const df = 9;
  const k2 = k2Reject(chi2, df);
  // K1: 각 끝자리 비율 vs 자연 비율
  const ratios = counts.map((c) => c / total);
  const naturalRatios = [];
  for (let d = 0; d < 10; d += 1) naturalRatios.push(NATURAL_ENDING_COUNTS[d] / NUMBER_MAX);
  const k1 = ratios.some((r, i) => k1RejectRatio(r, naturalRatios[i]));
  return { counts, ratios, naturalRatios, total, chi2, df, k1, k2, verdict: k3Verdict(k1, k2) };
}

function measureJaccard(sets, nPerChar) {
  // 같은 캐릭터 내 인접 i, i+1 페어의 자카드 평균.
  // sets는 캐릭터 순서대로 [0..nPerChar-1, nPerChar..], 각 nPerChar개씩 한 캐릭터.
  let totalJ = 0; let pairCount = 0;
  for (let i = 0; i < sets.length - 1; i += 1) {
    if ((i + 1) % nPerChar === 0) continue; // 캐릭터 경계 skip
    const A = new Set(sets[i].numbers);
    let inter = 0;
    for (const x of sets[i + 1].numbers) if (A.has(x)) inter += 1;
    const union = (PICK_COUNT * 2) - inter;
    totalJ += inter / union;
    pairCount += 1;
  }
  const meanJ = totalJ / pairCount;
  // K1: 자연 baseline ±20%
  const k1 = k1RejectRatio(meanJ, NATURAL_JACCARD_BASELINE);
  // K2: 자카드는 분포가 복잡 → K1 결과를 보수적으로 K2에도 반영 (정밀 검정 대신).
  //   여기서는 평균이 자연 baseline의 ±50% 초과 시 K2 위반으로 판정 (사용자 인상이 강한 차원만 잡힘).
  const strongDev = Math.abs(meanJ - NATURAL_JACCARD_BASELINE) / NATURAL_JACCARD_BASELINE;
  const k2 = strongDev > 0.50;
  return { meanJaccard: meanJ, naturalJaccard: NATURAL_JACCARD_BASELINE, pairCount, k1, k2, verdict: k3Verdict(k1, k2) };
}

// ============================================================
// 9. 한 전략 → 7차원 측정 결과 객체
// ============================================================

function measureScenario(scenario, characters, stats, drwNoList, nPerChar) {
  const t0 = Date.now();
  const sets = collectScenario(scenario.ids, characters, stats, drwNoList, nPerChar);
  const t1 = Date.now();
  return {
    scenarioId: scenario.id,
    setCount: sets.length,
    elapsedMs: t1 - t0,
    bands: measureBands(sets),
    numberFreq: measureNumberFreq(sets),
    evenOdd: measureEvenOdd(sets),
    sum: measureSum(sets),
    adjacent: measureAdjacent(sets),
    endingDigit: measureEndingDigit(sets),
    jaccard: measureJaccard(sets, nPerChar),
  };
}

// ============================================================
// 10. markdown 보고서 생성
// ============================================================

function fmtPct(x) {
  return (x * 100).toFixed(2) + '%';
}
function fmtNum(x, digits = 2) {
  return Number(x).toFixed(digits);
}

function renderReport(allResults, meta) {
  const lines = [];
  lines.push(`# Lotto 추천 번호 편향 검증 보고서`);
  lines.push('');
  lines.push(`- **생성일**: ${meta.dateIso}`);
  lines.push(`- **표본**: ${meta.charCount}명 캐릭터 × ${meta.nPerChar}회 추출 = 캐릭터당 ${meta.nPerChar}세트, 전략당 ${meta.charCount * meta.nPerChar}세트`);
  lines.push(`- **회차 mix**: 최근 ${N_DRWNO_MIX}회 (drwNo ${meta.drwLo} ~ ${meta.drwHi})`);
  lines.push(`- **판정 기준 (K3)**: K1(자연 기대 ±${(K1_THRESHOLD * 100).toFixed(0)}%) + K2(카이제곱 p<0.05). 둘 다 위반 = **강한 편향**, 한쪽 = **주의**, 둘 다 통과 = **정상**.`);
  lines.push(`- **자연 기대 (6/45 균등)**: 합 평균 ${fmtNum(NATURAL_SUM_MEAN, 1)} / 합 표준편차 ${fmtNum(NATURAL_SUM_STDDEV, 2)} / 인접 페어 ${fmtPct(NATURAL_ADJ_PAIR_PROB)} / 자카드 ${fmtNum(NATURAL_JACCARD_BASELINE, 4)}`);
  lines.push(`- **kind 'random'** = 자연 기대 균등에 가까워야 정도(正道). **kind 'biased'** = 학설/통계 풀에 의도된 편향.`);
  lines.push('');

  // 카테고리별 요약 표
  lines.push(`## 1. 시나리오 × 7차원 K3 판정 요약`);
  lines.push('');
  lines.push(`| 시나리오 | 카테고리 | kind | 5구간 | 1~45 | 짝/홀 | 합계 | 인접 | 끝자리 | 자카드 | 종합 |`);
  lines.push(`|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const sdef of SCENARIOS) {
    const r = allResults[sdef.id];
    const dims = [r.bands.verdict, r.numberFreq.verdict, r.evenOdd.verdict, r.sum.verdict, r.adjacent.verdict, r.endingDigit.verdict, r.jaccard.verdict];
    const strongCount = dims.filter((v) => v === 'strong').length;
    const cautionCount = dims.filter((v) => v === 'caution').length;
    const overall = strongCount >= 2 ? 'strong' : (strongCount >= 1 || cautionCount >= 3 ? 'caution' : 'ok');
    lines.push(`| ${sdef.label} | ${sdef.cat} | ${sdef.kind} | ${k3Label(r.bands.verdict)} | ${k3Label(r.numberFreq.verdict)} | ${k3Label(r.evenOdd.verdict)} | ${k3Label(r.sum.verdict)} | ${k3Label(r.adjacent.verdict)} | ${k3Label(r.endingDigit.verdict)} | ${k3Label(r.jaccard.verdict)} | **${k3Label(overall)}** |`);
  }
  lines.push('');

  // 카테고리별 정리
  lines.push(`## 2. 정도(正道) 진단`);
  lines.push('');
  const CATS_ORDER = ['랜덤', '통계', '운세', '다중-프리셋', '다중-카테고리', '다중-cross'];
  const CAT_NOTES = {
    '랜덤': '자연 기대 균등 - 결과가 자연 기대에 가까워야 작위성 인상 회피.',
    '통계': '학습 데이터(numberStats / bonusStats) 학습으로 편향이 자연. 다만 편향 폭이 사용자 인상에 영향.',
    '운세': '학설 풀(좁은 번호 집합)에 의도된 편향. 풀 안 분포가 균등한지가 본 카테고리의 "정도".',
    '다중-프리셋': 'DEFAULT_PRESETS 3종 (사용자 첫 진입 기본). S43 합성 weight의 부수효과 검증.',
    '다중-카테고리': '카테고리 내 모든 전략 묶음. 카테고리 일관성 검증.',
    '다중-cross': '카테고리 cross 페어. 의도된 편향이 cross 합성에서 어떻게 부수효과를 내는지 검증.',
  };
  let secNum = 0;
  for (const cat of CATS_ORDER) {
    const list = SCENARIOS.filter((s) => s.cat === cat);
    if (list.length === 0) continue;
    secNum += 1;
    lines.push(`### 2.${secNum}. ${cat} 카테고리`);
    lines.push(CAT_NOTES[cat] || '');
    lines.push('');
    for (const sdef of list) {
      appendScenarioDetail(lines, sdef, allResults[sdef.id]);
    }
  }

  // 결론 자동 생성
  lines.push(`## 3. 자동 결론 (자비스 분류)`);
  lines.push('');
  const concerns = [];
  for (const sdef of SCENARIOS) {
    const r = allResults[sdef.id];
    const dims = [
      ['5구간', r.bands.verdict],
      ['1~45 빈도', r.numberFreq.verdict],
      ['짝/홀', r.evenOdd.verdict],
      ['합계', r.sum.verdict],
      ['인접', r.adjacent.verdict],
      ['끝자리', r.endingDigit.verdict],
      ['자카드', r.jaccard.verdict],
    ];
    const strong = dims.filter(([, v]) => v === 'strong').map(([k]) => k);
    if (sdef.kind === 'random' && strong.length > 0) {
      concerns.push(`- **${sdef.label}** (${sdef.cat}, 자연 기대 균등 카테고리): 강한 편향 차원 ${strong.length}개 = ${strong.join(', ')} → **결손 의심**`);
    } else if (sdef.kind === 'biased') {
      const unintendedDims = dims.filter(([k, v]) => v === 'strong' && (k === '짝/홀' || k === '합계' || k === '인접' || k === '자카드'));
      if (unintendedDims.length > 0) {
        concerns.push(`- **${sdef.label}** (${sdef.cat}, 의도된 편향 카테고리): 풀 외 차원에서 강한 편향 ${unintendedDims.length}개 = ${unintendedDims.map(([k]) => k).join(', ')} → **합성/풀 좁음의 부수효과 의심**`);
      }
    }
  }
  if (concerns.length === 0) {
    lines.push(`자비스 자동 분류상 **결손 의심 없음**. 모든 의도된 편향은 카테고리 정체성 범위 내.`);
  } else {
    lines.push(`자비스 자동 분류 주의 항목:`);
    lines.push('');
    concerns.forEach((c) => lines.push(c));
  }
  lines.push('');
  lines.push(`> [의견] 본 분류는 K3 자동 판정 결과의 1차 해석. 사용자가 "작위적"이라 느낀 차원과 직접 대응되는지는 사용자 검토 필요.`);
  lines.push('');

  return lines.join('\n');
}

function appendScenarioDetail(lines, sdef, r) {
  const idsHint = sdef.ids.length > 1 ? ` [묶음: ${sdef.ids.join(', ')}]` : '';
  lines.push(`#### ${sdef.label} (${sdef.id})${idsHint}`);
  lines.push(`표본 ${r.setCount}세트 · 추출 ${r.elapsedMs}ms`);
  lines.push('');
  // 차원 요약 표
  lines.push(`| 차원 | 관측 | 자연 기대 | chi^2 (df) / z | K1 | K2 | K3 |`);
  lines.push(`|---|---|---|---|---|---|---|`);
  // 5구간
  lines.push(`| 5구간 분포 | ${r.bands.ratios.map(fmtPct).join(' / ')} | 각 ${fmtPct(NATURAL_BAND_RATIO)} | ${fmtNum(r.bands.chi2)} (df=${r.bands.df}) | ${r.bands.k1 ? '위반' : 'OK'} | ${r.bands.k2 ? '위반' : 'OK'} | **${k3Label(r.bands.verdict)}** |`);
  // 1~45 빈도 - 자세한 violator만 표시
  lines.push(`| 1~45 번호 빈도 | 위반 ${r.numberFreq.violators.length}개 | 각 ${fmtPct(1/NUMBER_MAX)} | ${fmtNum(r.numberFreq.chi2)} (df=${r.numberFreq.df}) | ${r.numberFreq.k1 ? '위반' : 'OK'} | ${r.numberFreq.k2 ? '위반' : 'OK'} | **${k3Label(r.numberFreq.verdict)}** |`);
  // 짝/홀
  lines.push(`| 짝/홀 | 짝 ${fmtPct(r.evenOdd.evenRatio)} / 홀 ${fmtPct(r.evenOdd.oddRatio)} | 짝 ${fmtPct(NATURAL_EVEN_RATIO)} / 홀 ${fmtPct(1-NATURAL_EVEN_RATIO)} | ${fmtNum(r.evenOdd.chi2)} (df=1) | ${r.evenOdd.k1 ? '위반' : 'OK'} | ${r.evenOdd.k2 ? '위반' : 'OK'} | **${k3Label(r.evenOdd.verdict)}** |`);
  // 합계
  lines.push(`| 합계 분포 | 평균 ${fmtNum(r.sum.mean, 1)} / 표준편차 ${fmtNum(r.sum.stdDev, 2)} | 평균 ${fmtNum(NATURAL_SUM_MEAN, 1)} / 표준편차 ${fmtNum(NATURAL_SUM_STDDEV, 2)} | z=${fmtNum(r.sum.z, 2)} | ${r.sum.k1 ? '위반' : 'OK'} | ${r.sum.k2 ? '위반' : 'OK'} | **${k3Label(r.sum.verdict)}** |`);
  // 인접
  lines.push(`| 인접 페어 (≥1) | ${fmtPct(r.adjacent.adjRatio)} (3연 ${fmtPct(r.adjacent.withTriple/r.adjacent.total)}) | ${fmtPct(NATURAL_ADJ_PAIR_PROB)} | z=${fmtNum(r.adjacent.z, 2)} | ${r.adjacent.k1 ? '위반' : 'OK'} | ${r.adjacent.k2 ? '위반' : 'OK'} | **${k3Label(r.adjacent.verdict)}** |`);
  // 끝자리
  lines.push(`| 끝자리 0~9 | (chi^2 ${fmtNum(r.endingDigit.chi2)}) | 0:${fmtPct(NATURAL_ENDING_COUNTS[0]/NUMBER_MAX)} 1~5:${fmtPct(5/NUMBER_MAX)} 6~9:${fmtPct(4/NUMBER_MAX)} | ${fmtNum(r.endingDigit.chi2)} (df=9) | ${r.endingDigit.k1 ? '위반' : 'OK'} | ${r.endingDigit.k2 ? '위반' : 'OK'} | **${k3Label(r.endingDigit.verdict)}** |`);
  // 자카드
  lines.push(`| 추천N 간 자카드 | 평균 ${fmtNum(r.jaccard.meanJaccard, 4)} | 자연 ${fmtNum(NATURAL_JACCARD_BASELINE, 4)} | 편차 ${fmtPct(Math.abs(r.jaccard.meanJaccard - NATURAL_JACCARD_BASELINE)/NATURAL_JACCARD_BASELINE)} | ${r.jaccard.k1 ? '위반' : 'OK'} | ${r.jaccard.k2 ? '위반' : 'OK'} | **${k3Label(r.jaccard.verdict)}** |`);
  lines.push('');
  // 1~45 violator 가 있으면 상위 5개만 표시
  if (r.numberFreq.violators.length > 0) {
    const topViolators = [...r.numberFreq.violators].sort((a, b) => Math.abs(b.ratio - b.expected) - Math.abs(a.ratio - a.expected)).slice(0, 5);
    lines.push(`자연 기대 대비 ±20% 초과 번호 상위 ${topViolators.length}개: ` + topViolators.map((v) => `${v.number}번 ${fmtPct(v.ratio)} (자연 ${fmtPct(v.expected)})`).join(' / '));
    lines.push('');
  }
}

// ============================================================
// 11. 메인
// ============================================================

function loadDraws() {
  const txt = readFileSync(DRAWS_PATH, 'utf-8');
  return JSON.parse(txt);
}

function buildDrwNoList(draws) {
  const sorted = [...draws].sort((a, b) => a.drwNo - b.drwNo);
  const latest = sorted[sorted.length - 1].drwNo;
  const list = [];
  for (let i = 0; i < N_DRWNO_MIX; i += 1) {
    const drwNo = latest - (N_DRWNO_MIX - 1) + i;
    list.push(drwNo);
  }
  return { drwNoList: list, drwLo: list[0], drwHi: list[list.length - 1] };
}

function pad2(n) { return String(n).padStart(2, '0'); }

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function main() {
  const argN = parseInt(process.argv[2], 10);
  const nPerChar = (Number.isFinite(argN) && argN > 0) ? argN : DEFAULT_N_PER_CHAR;

  console.log('# Lotto bias-report');
  const singleCount = SCENARIOS.filter((s) => s.ids.length === 1).length;
  const multiCount = SCENARIOS.length - singleCount;
  console.log(`표본 = 60 캐릭터 × ${nPerChar} 추출 × ${SCENARIOS.length} 시나리오 (단일 ${singleCount} + 다중 묶음 ${multiCount})`);
  console.log('');

  const t0 = Date.now();
  const draws = loadDraws();
  const numberStats = computeNumberStats(draws);
  const bonusStats = computeBonusStats(draws);
  const stats = { numberStats, bonusStats };
  const characters = buildCharacters();
  const { drwNoList, drwLo, drwHi } = buildDrwNoList(draws);
  console.log(`draws 로드: ${draws.length}회 (drwNo ${draws[0].drwNo} ~ ${draws[draws.length-1].drwNo}). 분석 회차 mix: ${drwLo} ~ ${drwHi} (${drwNoList.length}개).`);
  console.log(`캐릭터: ${characters.length}명 (12 zodiac × 5 stem). Luck = ${CHAR_LUCK} 일정.`);
  console.log('');

  const allResults = {};
  for (const sdef of SCENARIOS) {
    process.stdout.write(`[${sdef.label}] (${sdef.id}) ... `);
    const r = measureScenario(sdef, characters, stats, drwNoList, nPerChar);
    allResults[sdef.id] = r;
    console.log(`${r.elapsedMs}ms / 종합 = ${[r.bands.verdict, r.numberFreq.verdict, r.evenOdd.verdict, r.sum.verdict, r.adjacent.verdict, r.endingDigit.verdict, r.jaccard.verdict].join('/')}`);
  }
  const t1 = Date.now();
  console.log('');
  console.log(`총 소요: ${t1 - t0}ms`);

  const meta = {
    dateIso: todayIso(),
    charCount: characters.length,
    nPerChar,
    drwLo,
    drwHi,
  };
  const md = renderReport(allResults, meta);
  const outPath = resolve(REPORT_DIR, `bias_${meta.dateIso}.md`);
  writeFileSync(outPath, md, 'utf-8');
  console.log(`보고서 저장: ${outPath}`);
}

main();
