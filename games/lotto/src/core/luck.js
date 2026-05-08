// Luck 성장 룰. SSOT: docs/01_spec.md 5.1 / 7.2, docs/02_data.md 1.2.
// core/는 DOM 금지. 순수 함수.
//
// S43.3 (2026-05-08, Sprint 053): applyLuck / preferredNumbers 폐기.
//   새 architecture(`recommendMulti`)는 시드 6번호 inline shuffle + Luck 비례 가중을 직접 처리.
//   applyLuckGrowth(등수 적중 보너스) + rankLuckBonus(참고용)만 보존.

import { LUCK_MIN, LUCK_MAX } from '../data/numbers.js';

// 등수별 Luck 보너스 (적중 시 1회 적용). SSOT: docs/02_data.md 3.8.
const RANK_LUCK_BONUS = Object.freeze({ 1: 20, 2: 15, 3: 10, 4: 5, 5: 2 });

/**
 * Luck 성장 적용. history의 매칭된 항목 중 luckApplied=false인 것만 처리.
 * 한 번 적용되면 luckApplied=true로 잠금 (중복 적용 방지).
 * @param {object} character
 * @returns {object} 갱신된 character (immutable)
 */
export function applyLuckGrowth(character) {
  let luck = character.luck;
  const next = character.history.map((h) => {
    if (h.luckApplied) return h;
    if (h.matchedRank === null || h.matchedRank === undefined) return h;
    const bonus = RANK_LUCK_BONUS[h.matchedRank] || 0;
    luck = Math.max(LUCK_MIN, Math.min(LUCK_MAX, luck + bonus));
    return { ...h, luckApplied: true };
  });
  return { ...character, luck, history: next };
}

/** 등수 → Luck 보너스 (참고용 / UI 표시용). */
export function rankLuckBonus(rank) {
  return RANK_LUCK_BONUS[rank] || 0;
}
