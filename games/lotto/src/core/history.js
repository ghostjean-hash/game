// 이력 저장 / 매칭 / 캐릭터 통계.
// core/는 DOM 금지. 순수 함수.

import { matchRank } from './match.js';

/**
 * 캐릭터 history에 추천 항목 기록 (같은 drwNo는 덮어쓰기).
 * 새 객체 반환 (immutable).
 * @param {object} character
 * @param {{ drwNo: number, numbers: number[], bonus: number, reasons: string[], createdAt: string }} recommendation
 * @returns {object} 갱신된 character
 */
export function recordRecommendation(character, recommendation) {
  const idx = character.history.findIndex((h) => h.drwNo === recommendation.drwNo);
  const entry = { ...recommendation, matchedRank: null, luckApplied: false };
  const next = [...character.history];
  if (idx >= 0) {
    // 같은 drwNo면 매칭 결과 + luckApplied 보존 + 추천 덮어쓰기
    next[idx] = {
      ...entry,
      matchedRank: next[idx].matchedRank,
      luckApplied: next[idx].luckApplied || false,
    };
  } else {
    next.push(entry);
  }
  return { ...character, history: next };
}

/**
 * 모든 history 항목에 대해 draws 매칭하여 matchedRank 갱신.
 * @param {object} character
 * @param {Array} draws
 * @returns {object}
 */
export function matchHistory(character, draws) {
  const drawMap = new Map(draws.map((d) => [d.drwNo, d]));
  const next = character.history.map((h) => {
    const draw = drawMap.get(h.drwNo);
    if (!draw) return { ...h, matchedRank: null };
    const rank = matchRank({ numbers: h.numbers, bonus: h.bonus }, draw);
    // matchedRank만 갱신. luckApplied는 보존 (이미 적용된 보너스 보호).
    return { ...h, matchedRank: rank };
  });
  return { ...character, history: next };
}

/**
 * 캐릭터 통계 요약.
 * @param {object} character
 * @returns {{ total: number, settled: number, ranks: {1:number,2:number,3:number,4:number,5:number}, bestRank: 1|2|3|4|5|null, hits: number }}
 */
export function characterStats(character) {
  const total = character.history.length;
  let settled = 0;
  const ranks = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let bestRank = null;
  for (const h of character.history) {
    if (h.matchedRank !== undefined && h.matchedRank !== null) {
      settled += 1;
      ranks[h.matchedRank] += 1;
      if (bestRank === null || h.matchedRank < bestRank) bestRank = h.matchedRank;
    } else if (h.matchedRank === null) {
      // null은 미적중 또는 미발표. settled는 발표된 것만.
    }
  }
  // settled를 다시 정확히 계산: drws에서 매칭된 항목만 (matchedRank가 null이라도 settled일 수 있음)
  // 본 함수는 matchedRank !== null 만 settled로 간주. 단순화.
  const hits = ranks[1] + ranks[2] + ranks[3] + ranks[4] + ranks[5];
  return { total, settled, ranks, bestRank, hits };
}
