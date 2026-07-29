// 통계 캐시 계산. SSOT: docs/02_data.md 3.4 / 3.5, docs/04_stats_axes 통합본.
// core/는 DOM 금지. 순수 함수.

import {
  NUMBER_MIN, NUMBER_MAX,
  RECENT_SHORT, RECENT_MID, RECENT_LONG,
} from '../data/numbers.js';

/**
 * 본번호 통계 캐시.
 * @param {Draw[]} draws drwNo 정렬 무관
 * @returns {NumberStat[]} length 45
 */
export function computeNumberStats(draws) {
  const sorted = [...draws].sort((a, b) => a.drwNo - b.drwNo);
  const total = sorted.length;
  const latestDrw = total > 0 ? sorted[total - 1].drwNo : 0;
  const stats = [];

  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
    let totalCount = 0;
    let recent10 = 0;
    let recent30 = 0;
    let recent100 = 0;
    let lastSeenDrw = 0;

    for (let i = 0; i < total; i += 1) {
      const draw = sorted[i];
      if (draw.numbers.includes(n)) {
        totalCount += 1;
        lastSeenDrw = draw.drwNo;
        const tail = total - i;
        if (tail <= RECENT_SHORT) recent10 += 1;
        if (tail <= RECENT_MID) recent30 += 1;
        if (tail <= RECENT_LONG) recent100 += 1;
      }
    }

    const currentGap = lastSeenDrw === 0 ? total : latestDrw - lastSeenDrw;
    stats.push({
      number: n,
      totalCount,
      recent10,
      recent30,
      recent100,
      lastSeenDrw,
      currentGap,
    });
  }
  return stats;
}

/**
 * 보너스볼 통계 (본번호와 분리).
 * @param {Draw[]} draws
 * @returns {BonusStat[]} length 45
 */
export function computeBonusStats(draws) {
  const sorted = [...draws].sort((a, b) => a.drwNo - b.drwNo);
  const total = sorted.length;
  const stats = [];

  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) {
    let totalCount = 0;
    let recent30 = 0;
    let lastSeenDrw = 0;

    for (let i = 0; i < total; i += 1) {
      const draw = sorted[i];
      if (draw.bonus === n) {
        totalCount += 1;
        lastSeenDrw = draw.drwNo;
        const tail = total - i;
        if (tail <= RECENT_MID) recent30 += 1;
      }
    }
    stats.push({ number: n, totalCount, recent30, lastSeenDrw });
  }
  return stats;
}

/**
 * 본번호 동시출현 페어 빈도 (a < b).
 * @param {Draw[]} draws
 * @returns {Cooccur[]}
 */
export function computeCooccur(draws) {
  const map = new Map();
  for (const draw of draws) {
    const sortedNums = [...draw.numbers].sort((a, b) => a - b);
    for (let i = 0; i < sortedNums.length; i += 1) {
      for (let j = i + 1; j < sortedNums.length; j += 1) {
        const key = `${sortedNums[i]}-${sortedNums[j]}`;
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
  }
  const result = [];
  for (const [key, count] of map.entries()) {
    const [a, b] = key.split('-').map(Number);
    result.push({ a, b, count });
  }
  return result;
}
