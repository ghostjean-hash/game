// games/lotto STATS_POWER / GAP_POWER 보정 효과 시뮬레이션.
// 1222회 시점 본번호/보너스 통계로 가중치 분포 + 가중 추출 분포 측정.
// SSOT: docs/02_data.md 1.7. PROGRESS 2.30 검증.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const drawsPath = resolve(__dirname, '../games/lotto/src/data/draws.json');
const draws = JSON.parse(readFileSync(drawsPath, 'utf-8'));

const NUMBER_MIN = 1;
const NUMBER_MAX = 45;
const PICK_COUNT = 6;
const VECTOR_LEN = NUMBER_MAX - NUMBER_MIN + 1;
const RECENT_MID = 30;
const WEIGHT_MIN_FLOOR = 0.0001;

const STATS_POWER = 1.5;
const GAP_POWER = 1.3;

function computeNumberStats(allDraws) {
  const sorted = [...allDraws].sort((a, b) => a.drwNo - b.drwNo);
  const total = sorted.length;
  const latestDrw = sorted[total - 1].drwNo;
  const stats = [];
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
    let totalCount = 0;
    let recent30 = 0;
    let lastSeenDrw = 0;
    for (let i = 0; i < total; i += 1) {
      const draw = sorted[i];
      if (draw.numbers.includes(n)) {
        totalCount += 1;
        lastSeenDrw = draw.drwNo;
        const tail = total - i;
        if (tail <= RECENT_MID) recent30 += 1;
      }
    }
    const currentGap = lastSeenDrw === 0 ? total : latestDrw - lastSeenDrw;
    stats.push({ number: n, totalCount, recent30, currentGap });
  }
  return stats;
}

function summarize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  return { min, max, mean, std, ratio: max / min, cv: std / mean };
}

function powerWeights(stats, key, power) {
  const arr = new Array(VECTOR_LEN);
  for (let i = 0; i < arr.length; i += 1) arr[i] = WEIGHT_MIN_FLOOR;
  for (const s of stats) {
    const base = Math.max(s[key], 1);
    arr[s.number - 1] = Math.pow(base, power);
  }
  return arr;
}

// mulberry32 시드 RNG
function mulberry32(seed) {
  let s = seed >>> 0;
  return function rand() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedSample(weights, count, seed) {
  const pool = weights.map((w, i) => ({ n: i + 1, w: Math.max(w, WEIGHT_MIN_FLOOR) }));
  const rng = mulberry32(seed);
  const picked = [];
  for (let k = 0; k < count; k += 1) {
    const total = pool.reduce((s, x) => s + x.w, 0);
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

// N회 가중 추출 → 본번호 6개 등장 빈도 카운트
function simulateDistribution(weights, trials) {
  const freq = new Array(VECTOR_LEN).fill(0);
  for (let i = 0; i < trials; i += 1) {
    const picked = weightedSample(weights, PICK_COUNT, i + 1);
    for (const n of picked) freq[n - 1] += 1;
  }
  return freq;
}

const stats = computeNumberStats(draws);

console.log('='.repeat(70));
console.log(`Lotto stats power simulation (draws=${draws.length}, latest=${stats[0] && draws[draws.length-1].drwNo})`);
console.log('='.repeat(70));

// 1) 본번호 totalCount 분포
const counts = stats.map((s) => s.totalCount);
const cs = summarize(counts);
console.log('\n[1] 본번호 totalCount (raw)');
console.log(`    min=${cs.min} max=${cs.max} mean=${cs.mean.toFixed(2)} std=${cs.std.toFixed(2)}`);
console.log(`    max/min ratio=${cs.ratio.toFixed(3)} (편차계수 cv=${cs.cv.toFixed(3)})`);

// 2) statsToWeights 보정 전 (raw count)
const rawW = stats.map((s) => Math.max(s.totalCount, WEIGHT_MIN_FLOOR));
const rawSum = summarize(rawW);
console.log('\n[2] statistician weight (보정 전, count^1.0)');
console.log(`    min=${rawSum.min.toFixed(2)} max=${rawSum.max.toFixed(2)} ratio=${rawSum.ratio.toFixed(3)}`);

// 3) statsToWeights 보정 후 (count^1.5)
const powW = powerWeights(stats, 'totalCount', STATS_POWER);
const powSum = summarize(powW);
console.log('\n[3] statistician weight (보정 후, count^1.5)');
console.log(`    min=${powSum.min.toFixed(2)} max=${powSum.max.toFixed(2)} ratio=${powSum.ratio.toFixed(3)}`);
console.log(`    >>> 보정 효과: ratio ${rawSum.ratio.toFixed(3)} → ${powSum.ratio.toFixed(3)} (${(powSum.ratio / rawSum.ratio).toFixed(2)}배 증폭)`);

// 4) 추출 시뮬레이션 (10000회)
const TRIALS = 10000;
console.log(`\n[4] 가중 추출 ${TRIALS}회 시뮬레이션 (본번호 6개 × 시행 = ${TRIALS * 6}개)`);
const expectedFreq = TRIALS * PICK_COUNT / VECTOR_LEN; // 균등이면 기대값
console.log(`    균등 기대 빈도: ${expectedFreq.toFixed(0)}/번호`);

const rawFreq = simulateDistribution(rawW, TRIALS);
const rawFreqStats = summarize(rawFreq);
console.log(`\n  [4a] 보정 전 (count^1.0) 추출 빈도`);
console.log(`       min=${rawFreqStats.min} max=${rawFreqStats.max} mean=${rawFreqStats.mean.toFixed(0)} ratio=${rawFreqStats.ratio.toFixed(3)}`);

const powFreq = simulateDistribution(powW, TRIALS);
const powFreqStats = summarize(powFreq);
console.log(`\n  [4b] 보정 후 (count^1.5) 추출 빈도`);
console.log(`       min=${powFreqStats.min} max=${powFreqStats.max} mean=${powFreqStats.mean.toFixed(0)} ratio=${powFreqStats.ratio.toFixed(3)}`);
console.log(`       >>> 추출 빈도 max/min ratio: ${rawFreqStats.ratio.toFixed(3)} → ${powFreqStats.ratio.toFixed(3)}`);

// 5) Top 10 / Bottom 10 비교
function rank(arr) {
  return arr.map((v, i) => ({ n: i + 1, v })).sort((a, b) => b.v - a.v);
}
const rawRanked = rank(rawFreq);
const powRanked = rank(powFreq);
console.log('\n[5] 보정 전 Top 5 vs 보정 후 Top 5 (추출 빈도)');
console.log(`    raw Top5: ${rawRanked.slice(0, 5).map((x) => `${x.n}(${x.v})`).join(', ')}`);
console.log(`    pow Top5: ${powRanked.slice(0, 5).map((x) => `${x.n}(${x.v})`).join(', ')}`);
console.log(`    raw Bot5: ${rawRanked.slice(-5).map((x) => `${x.n}(${x.v})`).join(', ')}`);
console.log(`    pow Bot5: ${powRanked.slice(-5).map((x) => `${x.n}(${x.v})`).join(', ')}`);

// 6) trendFollower (recent30) 분포
const recents = stats.map((s) => s.recent30);
const rs = summarize(recents);
console.log('\n[6] trendFollower recent30 (raw)');
console.log(`    min=${rs.min} max=${rs.max} mean=${rs.mean.toFixed(2)} std=${rs.std.toFixed(2)} ratio=${rs.ratio === Infinity ? 'inf' : rs.ratio.toFixed(3)}`);

const trendRawW = stats.map((s) => Math.max(s.recent30, WEIGHT_MIN_FLOOR));
const trendPowW = powerWeights(stats, 'recent30', STATS_POWER);
const trendRawSum = summarize(trendRawW);
const trendPowSum = summarize(trendPowW);
console.log(`    raw weight: min=${trendRawSum.min.toFixed(4)} max=${trendRawSum.max.toFixed(2)} ratio=${trendRawSum.ratio.toFixed(0)}`);
console.log(`    pow weight: min=${trendPowSum.min.toFixed(6)} max=${trendPowSum.max.toFixed(2)} ratio=${(trendPowSum.ratio).toExponential(2)}`);

// 7) regressionist (currentGap) 분포
const gaps = stats.map((s) => s.currentGap);
const gs = summarize(gaps);
console.log('\n[7] regressionist currentGap (raw)');
console.log(`    min=${gs.min} max=${gs.max} mean=${gs.mean.toFixed(2)} std=${gs.std.toFixed(2)} ratio=${gs.ratio.toFixed(3)}`);

const gapRawW = stats.map((s) => Math.max(s.currentGap, 1));
const gapPowW = powerWeights(stats, 'currentGap', GAP_POWER);
const gapRawSum = summarize(gapRawW);
const gapPowSum = summarize(gapPowW);
console.log(`    raw weight ratio: ${gapRawSum.ratio.toFixed(3)}`);
console.log(`    pow weight ratio (gap^1.3): ${gapPowSum.ratio.toFixed(3)}`);
console.log(`    >>> 증폭: ${(gapPowSum.ratio / gapRawSum.ratio).toFixed(2)}배`);

console.log('\n' + '='.repeat(70));
console.log('결론');
console.log('='.repeat(70));
console.log('- statistician (count^1.5): weight ratio가 보정 전후로 어떻게 변하는지 위 [3]/[4b] 참조.');
console.log('- 본번호 누적 totalCount는 1222회 시점에서 거의 균등이므로 ratio가 1.x 수준.');
console.log('- power=1.5 적용 후 ratio 증폭이 너무 작으면 파워를 더 키워야 (예: 2.0).');
console.log('- gap은 0~수십 범위로 ratio 자체가 매우 큼. 1.3 약한 증폭 적정.');
