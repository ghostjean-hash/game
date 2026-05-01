// Luck 스탯 가중치 적용 + 성장 룰. SSOT: docs/01_spec.md 5.1 / 7.2, docs/02_data.md 1.2 / 1.7.
// core/는 DOM 금지. 순수 함수.

import {
  LUCK_MIN, LUCK_MAX, NUMBER_MIN, NUMBER_MAX, PICK_COUNT,
  WEIGHT_MIN_FLOOR, WEIGHT_MAX_BIAS,
} from '../data/numbers.js';
import { mulberry32 } from './random.js';

// 등수별 Luck 보너스 (적중 시 1회 적용).
const RANK_LUCK_BONUS = Object.freeze({ 1: 20, 2: 15, 3: 10, 4: 5, 5: 2 });

/**
 * 시드로부터 결정론적 선호 번호 N개 추출 (1~45, 오름차순).
 * Fisher-Yates shuffle 부분 적용.
 * @param {number} seed unsigned 32bit
 * @param {number} count 기본 PICK_COUNT(6)
 * @returns {number[]}
 */
export function preferredNumbers(seed, count = PICK_COUNT) {
  const pool = [];
  for (let n = NUMBER_MIN; n <= NUMBER_MAX; n += 1) pool.push(n);
  const rng = mulberry32(seed);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

/**
 * Luck 분산도 적용. 선호 번호에 boost. 다른 번호는 그대로.
 * Luck 0 = boost 1.0 (변화 없음). Luck 100 = boost WEIGHT_MAX_BIAS.
 * @param {number[]} weights length 45 (index 0 = number 1)
 * @param {number} seed unsigned 32bit
 * @param {number} luck 0~100
 * @returns {number[]} 변형된 weight (정규화 안 함)
 */
export function applyLuck(weights, seed, luck) {
  const clamped = Math.max(LUCK_MIN, Math.min(LUCK_MAX, luck));
  const ratio = clamped / LUCK_MAX;
  const boost = 1 + ratio * (WEIGHT_MAX_BIAS - 1);

  const preferred = preferredNumbers(seed);
  const result = weights.map((w) => Math.max(w, WEIGHT_MIN_FLOOR));

  for (const n of preferred) {
    result[n - 1] = result[n - 1] * boost;
  }
  return result;
}

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

/**
 * 등수 → Luck 보너스 (참고용 / UI 표시용).
 */
export function rankLuckBonus(rank) {
  return RANK_LUCK_BONUS[rank] || 0;
}
