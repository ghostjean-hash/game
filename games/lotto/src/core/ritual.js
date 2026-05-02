// 행운 의식 (T4). SSOT: docs/01_spec.md 5.6, docs/02_data.md 1.19.
// core/는 DOM 금지. 순수 함수.
//
// 해석 B (콘텐츠): 추첨 확률 영향 없음. 만땅 시 Luck +5 1회 보너스만.
// 회차 변경 시 게이지 + 쿨다운 모두 리셋 (회차별 격리).
// 캐릭터별 격리 (charId).

import {
  RITUAL_GAUGE_MAX, RITUAL_GAIN_PER_ACTION, RITUAL_LIST, LUCK_BONUS_RITUAL,
  LUCK_MIN, LUCK_MAX,
} from '../data/numbers.js';

const VALID_IDS = new Set(RITUAL_LIST.map((r) => r.id));

/**
 * 빈 의식 상태 생성.
 * @param {string} charId
 * @param {number} drwNo
 */
export function emptyRitualState(charId, drwNo) {
  return { charId, drwNo, performed: [], gauge: 0, appliedBonus: false };
}

/**
 * 회차 또는 캐릭터 변경 시 리셋. 같은 charId+drwNo면 그대로 보존.
 * @param {object | null} state
 * @param {string} charId
 * @param {number} drwNo
 */
export function ensureCurrentState(state, charId, drwNo) {
  if (!state || state.charId !== charId || state.drwNo !== drwNo) {
    return emptyRitualState(charId, drwNo);
  }
  return state;
}

/**
 * 행위 1회 수행. 같은 행위 재호출은 무시 (회차당 1회 쿨다운).
 * @param {object} state
 * @param {string} ritualId
 * @returns {{ state: object, didApply: boolean, justFilled: boolean }}
 */
export function performRitual(state, ritualId) {
  if (!VALID_IDS.has(ritualId)) return { state, didApply: false, justFilled: false };
  if (state.performed.includes(ritualId)) return { state, didApply: false, justFilled: false };

  const performed = [...state.performed, ritualId];
  const gauge = Math.min(RITUAL_GAUGE_MAX, performed.length * RITUAL_GAIN_PER_ACTION);
  const justFilled = gauge >= RITUAL_GAUGE_MAX && !state.appliedBonus;
  return {
    state: { ...state, performed, gauge },
    didApply: true,
    justFilled,
  };
}

/**
 * 만땅 보너스 적용. character.luck +LUCK_BONUS_RITUAL (cap 적용). appliedBonus 잠금.
 * 이미 적용됐거나 만땅 아니면 변화 없음.
 * @param {object} character
 * @param {object} state
 * @returns {{ character: object, state: object, applied: boolean }}
 */
export function applyRitualBonus(character, state) {
  if (state.appliedBonus) return { character, state, applied: false };
  if (state.gauge < RITUAL_GAUGE_MAX) return { character, state, applied: false };
  const newLuck = Math.max(LUCK_MIN, Math.min(LUCK_MAX, character.luck + LUCK_BONUS_RITUAL));
  return {
    character: { ...character, luck: newLuck },
    state: { ...state, appliedBonus: true },
    applied: true,
  };
}

/**
 * 사용자에게 표시할 진행도. 0~1 범위.
 */
export function progressRatio(state) {
  return Math.max(0, Math.min(1, state.gauge / RITUAL_GAUGE_MAX));
}

export function isRitualPerformed(state, ritualId) {
  return state.performed.includes(ritualId);
}
