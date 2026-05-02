// 역추첨: 사용자가 선택한 6개 번호를 모든 회차에 대해 매칭하여
// 최고 등수 + 매칭 회차 + 등수별 카운트를 산출.
// SSOT: docs/01_spec.md 5.7, docs/02_data.md.
// core/는 DOM 금지. 순수 함수.

import { matchRank } from './match.js';

/**
 * 사용자 선택 번호 6개를 전 회차와 매칭.
 * @param {number[]} userNumbers 본번호 6개 (정렬 무관, 1~45)
 * @param {Array<{drwNo:number, drwDate:string, numbers:number[], bonus:number}>} draws
 * @returns {{
 *   bestRank: 1|2|3|4|5|null,
 *   bestDraw: object | null,        // 최고 등수의 가장 최근 회차
 *   counts: { 1:number, 2:number, 3:number, 4:number, 5:number, miss:number },
 *   total: number,                  // 검사한 회차 수
 *   bestRankCount: number,          // 최고 등수의 매칭 회차 수
 * }}
 */
export function reverseSearch(userNumbers, draws) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, miss: 0 };
  let bestRank = null;
  let bestDraw = null;

  if (!Array.isArray(draws) || draws.length === 0) {
    return { bestRank, bestDraw, counts, total: 0, bestRankCount: 0 };
  }

  // 최고 등수가 갱신될 때만 bestDraw 교체. 같은 등수면 더 최근(drwNo 큰) 것으로 교체.
  const sorted = [...draws].sort((a, b) => b.drwNo - a.drwNo); // 최근 우선
  for (const draw of sorted) {
    const rank = matchRank({ numbers: userNumbers, bonus: 0 }, draw);
    if (rank === null) {
      counts.miss += 1;
      continue;
    }
    counts[rank] += 1;
    if (bestRank === null || rank < bestRank) {
      bestRank = rank;
      bestDraw = draw;
    }
  }

  const bestRankCount = bestRank === null ? 0 : counts[bestRank];
  return {
    bestRank,
    bestDraw,
    counts,
    total: draws.length,
    bestRankCount,
  };
}

/**
 * 사용자 입력 검증. 6개 / 1~45 / 중복 없음.
 * @param {number[]} numbers
 * @returns {{ valid: boolean, reason: string }}
 */
export function validateUserNumbers(numbers) {
  if (!Array.isArray(numbers)) return { valid: false, reason: '배열이 아닙니다' };
  if (numbers.length !== 6) return { valid: false, reason: '6개를 선택해야 합니다' };
  const set = new Set();
  for (const n of numbers) {
    if (!Number.isInteger(n) || n < 1 || n > 45) {
      return { valid: false, reason: '1~45 범위 정수만 가능합니다' };
    }
    if (set.has(n)) return { valid: false, reason: '중복된 번호가 있습니다' };
    set.add(n);
  }
  return { valid: true, reason: '' };
}
