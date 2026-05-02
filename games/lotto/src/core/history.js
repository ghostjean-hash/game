// 이력 저장 / 매칭 / 캐릭터 통계 / 백캐스트.
// core/는 DOM 금지. 순수 함수.

import { matchRank } from './match.js';
import { recommend } from './recommend.js';
import { BACKFILL_RECENT_COUNT } from '../data/numbers.js';

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
 * 백캐스트: 최근 N회 draws에 대해 결정론적 추천을 history에 백필 + 매칭.
 * 이미 history에 있는 회차는 건너뜀 (idempotent).
 * Luck 부트스트랩 목적. 다음 추첨(미래)은 발표 전이라 매칭 불가하므로 과거 회차로 충당.
 *
 * 통계 인자(numberStats / bonusStats / cooccur)는 "현재 시점" 통계를 모든 회차에 사용.
 * 결정론(같은 시점, 같은 캐릭터, 같은 회차 = 같은 결과). 회차별 시점 통계는 본 함수의 책임 아님.
 *
 * @param {object} character
 * @param {Array<{drwNo:number, drwDate:string, numbers:number[], bonus:number}>} draws
 * @param {string} strategyId
 * @param {{ numberStats:Array, bonusStats:Array, cooccur:Array }} stats
 * @param {number} [lastN=BACKFILL_RECENT_COUNT]
 * @returns {object} 갱신된 character
 */
export function backfillRecommendations(character, draws, strategyId, stats, lastN = BACKFILL_RECENT_COUNT) {
  if (!Array.isArray(draws) || draws.length === 0) return character;
  const sorted = [...draws].sort((a, b) => b.drwNo - a.drwNo);
  const recent = sorted.slice(0, lastN);
  const existing = new Set(character.history.map((h) => h.drwNo));

  const newEntries = [];
  for (const draw of recent) {
    if (existing.has(draw.drwNo)) continue;
    const rec = recommend({
      seed: character.seed,
      strategyId,
      luck: character.luck,
      drwNo: draw.drwNo,
      numberStats: stats.numberStats,
      bonusStats: stats.bonusStats,
      cooccur: stats.cooccur,
      zodiac: character.zodiac,
      dayPillar: character.dayPillar,
    });
    newEntries.push({
      drwNo: draw.drwNo,
      numbers: rec.numbers,
      bonus: rec.bonus,
      reasons: rec.reasons,
      createdAt: character.createdAt,
      matchedRank: matchRank({ numbers: rec.numbers, bonus: rec.bonus }, draw),
      luckApplied: false,
    });
  }
  if (newEntries.length === 0) return character;
  // history는 drwNo 오름차순 보장하지 않음 (기존 동작 유지). 단순 append.
  return { ...character, history: [...character.history, ...newEntries] };
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
