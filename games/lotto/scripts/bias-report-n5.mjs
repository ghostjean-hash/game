// 5세트 묶음 편향 검증 (사용자 "+5세트" 패턴 직접 정량화).
// SSOT: docs/03_architecture.md 1장. S67 N1 가설 검증.
//
// 1차 보고서(bias-report.mjs)는 660,000 추출의 평균 분포를 봤고 알고리즘 차원 결손 없음을 확인.
// 본 도구는 사용자 실 사용 시점(=5세트 1묶음을 보는 순간)의 직관 인상 정량화.
//
// 차이:
//   1차: N=600,000 본번호 단위. 평균 분포 비교.
//   2차: N=묶음 단위 (5세트 = 30번호). 묶음 안 쏠림 비율.
//
// 측정 9차원 (사용자 인상 직접 대응):
//   1. 묶음 안 5구간 최대 쏠림 (30번호 중 한 구간이 차지 비율의 분포)
//   2. 묶음 안 끝자리 쏠림 (30번호 중 한 끝자리 최대 비율)
//   3. 묶음 안 짝/홀 쏠림 (짝 비율 분포 - 0% / 100% 케이스 비율)
//   4. 묶음 안 평균 자카드 (5세트 페어와이즈 10 페어 평균)
//   5. 5세트 동일 케이스 (모두 같은 6번호) 비율
//   6. 30번호 unique 카운트 (중복 번호 수)
//   7. 사용자 직관 기준 "1~10이 30번호 중 50% 이상" 묶음 비율
//   8. **5세트 안 max 자카드** (페어와이즈 10 페어 중 최댓값) - "추천1과 2가 비슷해" 인상 직접 대응
//   9. **5세트 안 max 겹침 개수** (페어와이즈 |A∩B| 최댓값) - 가장 비슷한 두 추천의 겹친 번호 개수
//
// 실행:
//   node scripts/bias-report-n5.mjs
//   또는 인자 M (캐릭터당 묶음 수): node scripts/bias-report-n5.mjs 500

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
  SAVED_SETS_BATCH_LARGE,
  DEFAULT_PRESETS,
} from '../src/data/numbers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRAWS_PATH = resolve(ROOT, 'src/data/draws.json');
const REPORT_DIR = resolve(ROOT, 'tests/reports');

// ============================================================
// 1. 분석 파라미터
// ============================================================
const DEFAULT_M_PER_CHAR = 200;        // 캐릭터당 묶음 수 (각 묶음 = 5세트)
const SET_PER_BUNDLE = SAVED_SETS_BATCH_LARGE;  // 5세트 = 사용자 "+5세트" 버튼
const N_DRWNO_MIX = 100;
const ZODIACS = Object.freeze([
  'aries','taurus','gemini','cancer','leo','virgo',
  'libra','scorpio','sagittarius','capricorn','aquarius','pisces',
]);
const STEMS = Object.freeze(['gap','byeong','mu','gyeong','im']);
const STEM_FIXED_BRANCH = 'rat';
const CHAR_LUCK = LUCK_INITIAL;

// 묶음 안 30번호 (5세트 × 6번호)
const NUMBERS_PER_BUNDLE = SET_PER_BUNDLE * PICK_COUNT;

// ============================================================
// 2. 자연 기대치 (5세트 묶음 단위, 시뮬 baseline)
//    묶음 단위 통계는 분석 공식이 복잡 → 결정론 시드로 5000 묶음 시뮬해 baseline 산출.
// ============================================================
const BAND_EDGES = Object.freeze([9, 18, 27, 36, 45]);
const NATURAL_BAND_RATIO = 1 / 5;

const NATURAL = computeNaturalBaseline();

const K1_THRESHOLD = 0.20;

// ============================================================
// 3. 시나리오 정의 (단일 11 + 다중 9 = 20). 1차 도구와 동일 구조.
// ============================================================
function preset(id) {
  return DEFAULT_PRESETS.find((p) => p.id === id).strategyIds;
}

const SCENARIOS = Object.freeze([
  // 단일 전략 11종
  { id: STRATEGY_BLESSED,        label: '랜덤(축복)', cat: '랜덤', kind: 'random', ids: [STRATEGY_BLESSED] },
  { id: STRATEGY_INTUITIVE,      label: '직감',       cat: '랜덤', kind: 'random', ids: [STRATEGY_INTUITIVE] },
  { id: STRATEGY_BALANCER,       label: '균형',       cat: '랜덤', kind: 'random', ids: [STRATEGY_BALANCER] },
  { id: STRATEGY_TREND_FOLLOWER, label: '최신',       cat: '통계', kind: 'biased', ids: [STRATEGY_TREND_FOLLOWER] },
  { id: STRATEGY_STATISTICIAN,   label: '많이',       cat: '통계', kind: 'biased', ids: [STRATEGY_STATISTICIAN] },
  { id: STRATEGY_SECOND_STAR,    label: '보너스',     cat: '통계', kind: 'biased', ids: [STRATEGY_SECOND_STAR] },
  { id: STRATEGY_REGRESSIONIST,  label: '적게',       cat: '통계', kind: 'biased', ids: [STRATEGY_REGRESSIONIST] },
  { id: STRATEGY_ASTROLOGER,     label: '별자리',     cat: '운세', kind: 'biased', ids: [STRATEGY_ASTROLOGER] },
  { id: STRATEGY_ZODIAC_ELEMENT, label: '4원소',      cat: '운세', kind: 'biased', ids: [STRATEGY_ZODIAC_ELEMENT] },
  { id: STRATEGY_FIVE_ELEMENTS,  label: '사주',       cat: '운세', kind: 'biased', ids: [STRATEGY_FIVE_ELEMENTS] },
  // 다중 전략 묶음 9종
  { id: 'preset-1', label: '프리셋1 균형',  cat: '다중-프리셋', kind: 'biased', ids: preset('preset-1') },
  { id: 'preset-2', label: '프리셋2 분산파', cat: '다중-프리셋', kind: 'biased', ids: preset('preset-2') },
  { id: 'preset-3', label: '프리셋3 운세파', cat: '다중-프리셋', kind: 'biased', ids: preset('preset-3') },
  { id: 'cat-random',  label: '카테고리 랜덤전체', cat: '다중-카테고리', kind: 'random', ids: [STRATEGY_BLESSED, STRATEGY_INTUITIVE, STRATEGY_BALANCER] },
  { id: 'cat-stats',   label: '카테고리 통계전체', cat: '다중-카테고리', kind: 'biased', ids: [STRATEGY_TREND_FOLLOWER, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR, STRATEGY_REGRESSIONIST] },
  { id: 'cat-mapping', label: '카테고리 운세전체', cat: '다중-카테고리', kind: 'biased', ids: [STRATEGY_ASTROLOGER, STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS] },
  { id: 'cross-mr', label: '운세+랜덤 (별자리+직감)', cat: '다중-cross', kind: 'biased', ids: [STRATEGY_ASTROLOGER, STRATEGY_INTUITIVE] },
  { id: 'cross-ms', label: '운세+통계 (별자리+많이)', cat: '다중-cross', kind: 'biased', ids: [STRATEGY_ASTROLOGER, STRATEGY_STATISTICIAN] },
  { id: 'cross-rs', label: '랜덤+통계 (직감+많이)',   cat: '다중-cross', kind: 'biased', ids: [STRATEGY_INTUITIVE, STRATEGY_STATISTICIAN] },
]);

// ============================================================
// 4. 수학 / 통계 헬퍼
// ============================================================

function k1RejectRatio(observed, expected) {
  if (expected <= 0) return observed > 0;
  return Math.abs(observed - expected) / expected > K1_THRESHOLD;
}

// K2: 비율 차이의 z-test (n묶음 표본 평균)
function k2RejectZ(observed, expected, stdDev, N) {
  if (stdDev <= 0) return false;
  const stdErr = stdDev / Math.sqrt(N);
  const z = (observed - expected) / stdErr;
  return Math.abs(z) > 1.96;
}

function k3Verdict(k1, k2) {
  if (k1 && k2) return 'strong';
  if (k1 || k2) return 'caution';
  return 'ok';
}
function k3Label(v) {
  return ({ ok: '정상', caution: '주의', strong: '강한 편향' })[v] || v;
}

function fmtPct(x) { return (x * 100).toFixed(2) + '%'; }
function fmtNum(x, d = 2) { return Number(x).toFixed(d); }

// ============================================================
// 5. 자연 baseline 시뮬 (재현성 고정 시드)
//    5000 묶음 균등 추첨 → 7차원 평균 / 표준편차 산출.
// ============================================================

function computeNaturalBaseline() {
  const N_BASELINE = 5000;
  let s = 0xBA5E11 >>> 0;
  function rand() {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function pick6() {
    const pool = [];
    for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) pool.push(n);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, PICK_COUNT);
  }
  const bandMaxRatios = [];
  const endingMaxRatios = [];
  const evenRatios = [];
  const jaccards = [];
  const maxJaccards = [];
  const maxOverlaps = [];
  const allSameCases = [];
  const uniqueCounts = [];
  const lowHeavy = []; // 1~10이 30번호 중 50% 이상

  for (let m = 0; m < N_BASELINE; m += 1) {
    const sets = [];
    for (let k = 0; k < SET_PER_BUNDLE; k += 1) sets.push(pick6());
    const flat = sets.flat();
    bandMaxRatios.push(measureBandMax(flat));
    endingMaxRatios.push(measureEndingMax(flat));
    evenRatios.push(measureEvenRatio(flat));
    jaccards.push(measureJaccardMean(sets));
    const pair = measurePairMax(sets);
    maxJaccards.push(pair.maxJ);
    maxOverlaps.push(pair.maxOverlap);
    allSameCases.push(measureAllSame(sets) ? 1 : 0);
    uniqueCounts.push(new Set(flat).size);
    const low = flat.filter((n) => n >= 1 && n <= 10).length;
    lowHeavy.push(low / NUMBERS_PER_BUNDLE >= 0.50 ? 1 : 0);
  }

  return {
    bandMax: stat(bandMaxRatios),
    endingMax: stat(endingMaxRatios),
    even: stat(evenRatios),
    jaccard: stat(jaccards),
    maxJaccard: stat(maxJaccards),
    maxOverlap: stat(maxOverlaps),
    allSame: stat(allSameCases),
    unique: stat(uniqueCounts),
    lowHeavy: stat(lowHeavy),
  };
}

function stat(arr) {
  const N = arr.length;
  let sum = 0; let sumSq = 0;
  for (const x of arr) { sum += x; sumSq += x * x; }
  const mean = sum / N;
  const variance = sumSq / N - mean * mean;
  return { mean, stdDev: Math.sqrt(Math.max(0, variance)), N };
}

// ============================================================
// 6. 측정 함수 (묶음 단위)
// ============================================================

function measureBandMax(flat) {
  // 30번호 중 한 구간이 차지 비율의 최댓값 (5구간)
  const counts = [0, 0, 0, 0, 0];
  for (const n of flat) {
    let b = 0;
    while (b < BAND_EDGES.length - 1 && n > BAND_EDGES[b]) b += 1;
    counts[b] += 1;
  }
  return Math.max(...counts) / flat.length;
}

function measureEndingMax(flat) {
  const counts = new Array(10).fill(0);
  for (const n of flat) counts[n % 10] += 1;
  return Math.max(...counts) / flat.length;
}

function measureEvenRatio(flat) {
  let even = 0;
  for (const n of flat) if (n % 2 === 0) even += 1;
  return even / flat.length;
}

function measureJaccardMean(sets) {
  let total = 0; let count = 0;
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const A = new Set(sets[i]);
      let inter = 0;
      for (const x of sets[j]) if (A.has(x)) inter += 1;
      const union = (PICK_COUNT * 2) - inter;
      total += inter / union;
      count += 1;
    }
  }
  return total / count;
}

/**
 * 5세트 안 페어와이즈(10페어) 자카드 / 겹침 개수의 최댓값.
 * "추천1과 추천2가 비슷해" 사용자 인상 직접 대응.
 */
function measurePairMax(sets) {
  let maxJ = 0; let maxOverlap = 0;
  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const A = new Set(sets[i]);
      let inter = 0;
      for (const x of sets[j]) if (A.has(x)) inter += 1;
      const union = (PICK_COUNT * 2) - inter;
      const jacc = inter / union;
      if (jacc > maxJ) maxJ = jacc;
      if (inter > maxOverlap) maxOverlap = inter;
    }
  }
  return { maxJ, maxOverlap };
}

function measureAllSame(sets) {
  const first = [...sets[0]].sort((a, b) => a - b).join(',');
  for (let i = 1; i < sets.length; i += 1) {
    const cur = [...sets[i]].sort((a, b) => a - b).join(',');
    if (cur !== first) return false;
  }
  return true;
}

// ============================================================
// 7. 캐릭터 합성 (60명, 1차와 동일)
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
// 8. 5세트 묶음 추출 (사용자 "+5세트" 버튼 패턴)
//    사용자 실 사용: SAVED_SETS_SALT_BASE + i 변형으로 누적 5세트.
//    묶음 m번째: salt 인덱스 m × 5 ~ m × 5 + 4.
// ============================================================
function collectScenarioBundles(strategyIds, characters, stats, drwNoList, mPerChar) {
  const bundles = [];
  for (const char of characters) {
    for (let m = 0; m < mPerChar; m += 1) {
      const drwNo = drwNoList[m % drwNoList.length];
      const sets = [];
      for (let k = 0; k < SET_PER_BUNDLE; k += 1) {
        const saltIdx = m * SET_PER_BUNDLE + k;
        const seed = mixSeeds(char.seed >>> 0, (SAVED_SETS_SALT_BASE + saltIdx) >>> 0);
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
        sets.push(r.numbers);
      }
      bundles.push(sets);
    }
  }
  return bundles;
}

// ============================================================
// 9. 묶음별 7차원 측정 → 전략 단위 집계
// ============================================================
function measureScenario(scenario, characters, stats, drwNoList, mPerChar) {
  const t0 = Date.now();
  const bundles = collectScenarioBundles(scenario.ids, characters, stats, drwNoList, mPerChar);
  const t1 = Date.now();

  const bandMax = [];
  const endingMax = [];
  const evenRatios = [];
  const jaccards = [];
  const maxJaccards = [];
  const maxOverlaps = [];
  const allSameFlags = [];
  const uniqueCounts = [];
  const lowHeavyFlags = [];

  for (const sets of bundles) {
    const flat = sets.flat();
    bandMax.push(measureBandMax(flat));
    endingMax.push(measureEndingMax(flat));
    evenRatios.push(measureEvenRatio(flat));
    jaccards.push(measureJaccardMean(sets));
    const pair = measurePairMax(sets);
    maxJaccards.push(pair.maxJ);
    maxOverlaps.push(pair.maxOverlap);
    allSameFlags.push(measureAllSame(sets) ? 1 : 0);
    uniqueCounts.push(new Set(flat).size);
    const low = flat.filter((n) => n >= 1 && n <= 10).length;
    lowHeavyFlags.push(low / NUMBERS_PER_BUNDLE >= 0.50 ? 1 : 0);
  }

  const result = {
    scenarioId: scenario.id,
    bundleCount: bundles.length,
    elapsedMs: t1 - t0,
    bandMax: judgeDim('bandMax', stat(bandMax), NATURAL.bandMax),
    endingMax: judgeDim('endingMax', stat(endingMax), NATURAL.endingMax),
    even: judgeDim('even', stat(evenRatios), NATURAL.even),
    jaccard: judgeDim('jaccard', stat(jaccards), NATURAL.jaccard),
    maxJaccard: judgeDim('maxJaccard', stat(maxJaccards), NATURAL.maxJaccard),
    maxOverlap: judgeDim('maxOverlap', stat(maxOverlaps), NATURAL.maxOverlap),
    allSame: judgeDim('allSame', stat(allSameFlags), NATURAL.allSame),
    unique: judgeDim('unique', stat(uniqueCounts), NATURAL.unique),
    lowHeavy: judgeDim('lowHeavy', stat(lowHeavyFlags), NATURAL.lowHeavy),
  };
  return result;
}

function judgeDim(name, observed, natural) {
  // K1: 평균이 자연 평균 ±20% 초과
  const k1 = k1RejectRatio(observed.mean, natural.mean);
  // K2: z-test (관측 평균 vs 자연 평균, 자연 표준편차 / sqrt(N) 기준)
  const k2 = k2RejectZ(observed.mean, natural.mean, natural.stdDev, observed.N);
  return {
    name,
    observed,
    natural,
    k1,
    k2,
    verdict: k3Verdict(k1, k2),
  };
}

// ============================================================
// 10. markdown 보고서
// ============================================================

function renderReport(allResults, meta) {
  const lines = [];
  lines.push(`# Lotto 5세트 묶음 편향 검증 보고서 (N1 가설)`);
  lines.push('');
  lines.push(`- **생성일**: ${meta.dateIso}`);
  lines.push(`- **표본**: ${meta.charCount}명 캐릭터 × ${meta.mPerChar}묶음 = 캐릭터당 ${meta.mPerChar}묶음(=${meta.mPerChar * SET_PER_BUNDLE}세트), 전략당 ${meta.charCount * meta.mPerChar}묶음`);
  lines.push(`- **묶음 정의**: 사용자 "+5세트" 버튼 1회 = ${SET_PER_BUNDLE}세트 × ${PICK_COUNT}번호 = ${NUMBERS_PER_BUNDLE}번호`);
  lines.push(`- **회차 mix**: 최근 ${N_DRWNO_MIX}회 (drwNo ${meta.drwLo} ~ ${meta.drwHi})`);
  lines.push(`- **자연 baseline**: 균등 6/45 추첨으로 ${NATURAL.bandMax.N}묶음 시뮬한 결과 (재현성 고정 시드)`);
  lines.push(`- **판정 기준 (K3)**: K1(자연 평균 ±${(K1_THRESHOLD * 100).toFixed(0)}%) + K2(z-test p<0.05). 둘 다 위반 = **강한 편향**, 한쪽 = **주의**, 둘 다 통과 = **정상**.`);
  lines.push('');

  lines.push(`## 1. 9차원 정의 + 자연 baseline`);
  lines.push('');
  lines.push(`| 차원 | 의미 | 자연 평균 | 자연 표준편차 |`);
  lines.push(`|---|---|---|---|`);
  lines.push(`| 구간 최대 쏠림 | 묶음 안 한 구간이 30번호 중 차지 최대 비율 | ${fmtPct(NATURAL.bandMax.mean)} | ${fmtPct(NATURAL.bandMax.stdDev)} |`);
  lines.push(`| 끝자리 최대 쏠림 | 묶음 안 한 끝자리(0~9) 최대 비율 | ${fmtPct(NATURAL.endingMax.mean)} | ${fmtPct(NATURAL.endingMax.stdDev)} |`);
  lines.push(`| 짝 비율 | 30번호 중 짝수 비율 | ${fmtPct(NATURAL.even.mean)} | ${fmtPct(NATURAL.even.stdDev)} |`);
  lines.push(`| 5세트 평균 자카드 | 5세트 페어와이즈(10페어) 평균 자카드 | ${fmtNum(NATURAL.jaccard.mean, 4)} | ${fmtNum(NATURAL.jaccard.stdDev, 4)} |`);
  lines.push(`| **5세트 max 자카드** | 페어와이즈 10페어 중 **최댓값** (가장 비슷한 두 추천) | ${fmtNum(NATURAL.maxJaccard.mean, 4)} | ${fmtNum(NATURAL.maxJaccard.stdDev, 4)} |`);
  lines.push(`| **5세트 max 겹침 개수** | 페어와이즈 |A∩B| **최댓값** (가장 비슷한 두 추천의 겹친 번호 개수) | ${fmtNum(NATURAL.maxOverlap.mean, 2)} | ${fmtNum(NATURAL.maxOverlap.stdDev, 2)} |`);
  lines.push(`| 5세트 동일 비율 | 5세트가 모두 같은 6번호인 묶음 비율 | ${fmtPct(NATURAL.allSame.mean)} | ${fmtPct(NATURAL.allSame.stdDev)} |`);
  lines.push(`| unique 카운트 | 30번호 중 unique 번호 개수 | ${fmtNum(NATURAL.unique.mean, 2)} | ${fmtNum(NATURAL.unique.stdDev, 2)} |`);
  lines.push(`| 1~10 50% 이상 비율 | 30번호 중 1~10이 15개 이상인 묶음 비율 (사용자 정의) | ${fmtPct(NATURAL.lowHeavy.mean)} | ${fmtPct(NATURAL.lowHeavy.stdDev)} |`);
  lines.push('');

  lines.push(`## 2. 시나리오 × 9차원 K3 판정`);
  lines.push('');
  lines.push(`| 시나리오 | 카테고리 | kind | 구간쏠림 | 끝자리 | 짝 | 평균자카드 | maxJ | maxOverlap | 5동일 | unique | 1~10 50% | 종합 |`);
  lines.push(`|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const sdef of SCENARIOS) {
    const r = allResults[sdef.id];
    const dims = [r.bandMax.verdict, r.endingMax.verdict, r.even.verdict, r.jaccard.verdict, r.maxJaccard.verdict, r.maxOverlap.verdict, r.allSame.verdict, r.unique.verdict, r.lowHeavy.verdict];
    const strongCount = dims.filter((v) => v === 'strong').length;
    const cautionCount = dims.filter((v) => v === 'caution').length;
    const overall = strongCount >= 2 ? 'strong' : (strongCount >= 1 || cautionCount >= 4 ? 'caution' : 'ok');
    lines.push(`| ${sdef.label} | ${sdef.cat} | ${sdef.kind} | ${k3Label(r.bandMax.verdict)} | ${k3Label(r.endingMax.verdict)} | ${k3Label(r.even.verdict)} | ${k3Label(r.jaccard.verdict)} | ${k3Label(r.maxJaccard.verdict)} | ${k3Label(r.maxOverlap.verdict)} | ${k3Label(r.allSame.verdict)} | ${k3Label(r.unique.verdict)} | ${k3Label(r.lowHeavy.verdict)} | **${k3Label(overall)}** |`);
  }
  lines.push('');

  // 카테고리별 상세
  lines.push(`## 3. 카테고리별 상세`);
  lines.push('');
  const CATS_ORDER = ['랜덤', '통계', '운세', '다중-프리셋', '다중-카테고리', '다중-cross'];
  let secNum = 0;
  for (const cat of CATS_ORDER) {
    const list = SCENARIOS.filter((s) => s.cat === cat);
    if (list.length === 0) continue;
    secNum += 1;
    lines.push(`### 3.${secNum}. ${cat} 카테고리`);
    lines.push('');
    for (const sdef of list) {
      appendScenarioDetail(lines, sdef, allResults[sdef.id]);
    }
  }

  // 결론
  lines.push(`## 4. 자동 결론`);
  lines.push('');
  const concerns = [];
  for (const sdef of SCENARIOS) {
    const r = allResults[sdef.id];
    const dims = [
      ['구간 쏠림', r.bandMax.verdict],
      ['끝자리 쏠림', r.endingMax.verdict],
      ['짝 비율', r.even.verdict],
      ['평균 자카드', r.jaccard.verdict],
      ['max 자카드', r.maxJaccard.verdict],
      ['max 겹침', r.maxOverlap.verdict],
      ['5세트 동일', r.allSame.verdict],
      ['unique', r.unique.verdict],
      ['1~10 50%', r.lowHeavy.verdict],
    ];
    const strong = dims.filter(([, v]) => v === 'strong').map(([k]) => k);
    if (sdef.kind === 'random' && strong.length > 0) {
      concerns.push(`- **${sdef.label}** (${sdef.cat}, 자연 균등 카테고리): 강한 편향 ${strong.length}개 = ${strong.join(', ')} → **결손 의심**`);
    } else if (sdef.kind === 'biased' && strong.length > 0) {
      concerns.push(`- **${sdef.label}** (${sdef.cat}, 의도된 편향 카테고리): 강한 편향 ${strong.length}개 = ${strong.join(', ')} → 합성/풀 좁음의 누적 인상`);
    }
  }
  if (concerns.length === 0) {
    lines.push(`자비스 자동 분류 = **결손 의심 없음**. 5세트 묶음 단위에서도 모든 측정 차원이 자연 baseline 범위 내.`);
  } else {
    lines.push(`자비스 자동 분류 주의:`);
    lines.push('');
    concerns.forEach((c) => lines.push(c));
  }
  lines.push('');
  lines.push(`> [의견] 본 보고서는 1차(개별 본번호 분포) → 2차(5세트 묶음 인상) 진단의 두 번째. 두 보고서 모두 결손 없음이면 사용자 인상의 출처는 시각 인지(번호공 색)나 N=1~5 표본의 통계적 변동일 가능성이 높음.`);
  lines.push('');

  return lines.join('\n');
}

function appendScenarioDetail(lines, sdef, r) {
  const idsHint = sdef.ids.length > 1 ? ` [묶음: ${sdef.ids.join(', ')}]` : '';
  lines.push(`#### ${sdef.label} (${sdef.id})${idsHint}`);
  lines.push(`표본 ${r.bundleCount}묶음 · 추출 ${r.elapsedMs}ms`);
  lines.push('');
  lines.push(`| 차원 | 관측 평균 | 자연 평균 | 편차 | K1 | K2 | K3 |`);
  lines.push(`|---|---|---|---|---|---|---|`);
  appendDimRow(lines, '구간 최대 쏠림', r.bandMax, true);
  appendDimRow(lines, '끝자리 최대 쏠림', r.endingMax, true);
  appendDimRow(lines, '짝 비율', r.even, true);
  appendDimRow(lines, '5세트 평균 자카드', r.jaccard, false);
  appendDimRow(lines, '5세트 max 자카드', r.maxJaccard, false);
  appendDimRow(lines, '5세트 max 겹침 개수', r.maxOverlap, false);
  appendDimRow(lines, '5세트 동일 비율', r.allSame, true);
  appendDimRow(lines, 'unique 카운트', r.unique, false);
  appendDimRow(lines, '1~10 50% 이상 비율', r.lowHeavy, true);
  lines.push('');
}

function appendDimRow(lines, label, dim, asPct) {
  const fmtMean = asPct ? fmtPct : (x) => fmtNum(x, 4);
  const obs = fmtMean(dim.observed.mean);
  const nat = fmtMean(dim.natural.mean);
  const dev = dim.natural.mean !== 0
    ? fmtPct(Math.abs(dim.observed.mean - dim.natural.mean) / dim.natural.mean)
    : '-';
  lines.push(`| ${label} | ${obs} | ${nat} | ${dev} | ${dim.k1 ? '위반' : 'OK'} | ${dim.k2 ? '위반' : 'OK'} | **${k3Label(dim.verdict)}** |`);
}

// ============================================================
// 11. 메인
// ============================================================

function loadDraws() {
  return JSON.parse(readFileSync(DRAWS_PATH, 'utf-8'));
}

function buildDrwNoList(draws) {
  const sorted = [...draws].sort((a, b) => a.drwNo - b.drwNo);
  const latest = sorted[sorted.length - 1].drwNo;
  const list = [];
  for (let i = 0; i < N_DRWNO_MIX; i += 1) list.push(latest - (N_DRWNO_MIX - 1) + i);
  return { drwNoList: list, drwLo: list[0], drwHi: list[list.length - 1] };
}

function pad2(n) { return String(n).padStart(2, '0'); }
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function main() {
  const argM = parseInt(process.argv[2], 10);
  const mPerChar = (Number.isFinite(argM) && argM > 0) ? argM : DEFAULT_M_PER_CHAR;

  console.log('# Lotto bias-report-n5 (N1 가설 - 5세트 묶음)');
  console.log(`표본 = 60 캐릭터 × ${mPerChar}묶음 × 11 전략 (묶음당 ${SET_PER_BUNDLE}세트)`);
  console.log('');

  const t0 = Date.now();
  const draws = loadDraws();
  const stats = {
    numberStats: computeNumberStats(draws),
    bonusStats: computeBonusStats(draws),
  };
  const characters = buildCharacters();
  const { drwNoList, drwLo, drwHi } = buildDrwNoList(draws);
  console.log(`draws ${draws.length}회 / 분석 회차 mix ${drwLo}~${drwHi} / 캐릭터 ${characters.length}명`);
  console.log(`자연 baseline 평균: 구간쏠림 ${fmtPct(NATURAL.bandMax.mean)} / 끝자리쏠림 ${fmtPct(NATURAL.endingMax.mean)} / 자카드 ${fmtNum(NATURAL.jaccard.mean, 4)} / unique ${fmtNum(NATURAL.unique.mean, 2)} / 1~10 50% ${fmtPct(NATURAL.lowHeavy.mean)}`);
  console.log('');

  const allResults = {};
  for (const sdef of SCENARIOS) {
    process.stdout.write(`[${sdef.label}] ... `);
    const r = measureScenario(sdef, characters, stats, drwNoList, mPerChar);
    allResults[sdef.id] = r;
    const verdicts = [r.bandMax.verdict, r.endingMax.verdict, r.even.verdict, r.jaccard.verdict, r.maxJaccard.verdict, r.maxOverlap.verdict, r.allSame.verdict, r.unique.verdict, r.lowHeavy.verdict];
    console.log(`${r.elapsedMs}ms / ${verdicts.join('/')}`);
  }
  const t1 = Date.now();
  console.log('');
  console.log(`총 소요: ${t1 - t0}ms`);

  const meta = {
    dateIso: todayIso(),
    charCount: characters.length,
    mPerChar,
    drwLo,
    drwHi,
  };
  const md = renderReport(allResults, meta);
  const outPath = resolve(REPORT_DIR, `bias_n5_${meta.dateIso}.md`);
  writeFileSync(outPath, md, 'utf-8');
  console.log(`보고서 저장: ${outPath}`);
}

main();
