// 누적 추천 세트 (조립식 N장 누적). SSOT: docs/02_data.md 1.5.8.
// 사용자가 strategy 조합을 바꿔가며 세트를 누적 → 추천1, 추천2 ... 세로 스택.
// 회차 단위 격납. 다음 회차 진입 시 자동 비움.
// core/는 DOM 금지. 순수 함수.

import { SAVED_SETS_CAP } from '../data/numbers.js';

/**
 * 캐릭터의 savedSets를 현재 회차 기준으로 보장.
 * drwNo가 다르면 list 비움 (회차 전환 자동 비움).
 * 부재 시 빈 구조 생성 (마이그레이션).
 *
 * @param {object} character
 * @param {number} drwNo 현재 추천 회차
 * @returns {{ character: object, reset: boolean }}
 */
export function ensureSavedSetsForRound(character, drwNo) {
  const cur = character.savedSets;
  if (!cur || typeof cur !== 'object') {
    return {
      character: { ...character, savedSets: { drwNo, list: [] } },
      reset: false, // 첫 생성은 reset이 아님 (이전 list가 없었으니 비울 게 없음)
    };
  }
  if (cur.drwNo !== drwNo) {
    const hadItems = Array.isArray(cur.list) && cur.list.length > 0;
    return {
      character: { ...character, savedSets: { drwNo, list: [] } },
      reset: hadItems,
    };
  }
  return { character, reset: false };
}

/**
 * recipeId 생성. 같은 조립식이면 같은 ID.
 * strategyIds 정규화(STRATEGY_ORDER) 후 sort + join.
 * recommendMulti 안에서 정규화하므로 result.strategyIds도 정규화 가정 가능하지만
 * 외부에서도 안전하게 동작하도록 sort.
 */
export function recipeIdFor(strategyIds) {
  if (!Array.isArray(strategyIds) || strategyIds.length === 0) return '';
  return [...strategyIds].sort().join('-');
}

/**
 * 동일 numbers 조합이 list에 이미 있는지.
 * @param {number[]} numbers 6개 (sort된 배열)
 */
export function hasSameNumbers(list, numbers) {
  if (!Array.isArray(list) || list.length === 0) return false;
  const key = numbers.join(',');
  return list.some((s) => Array.isArray(s.numbers) && s.numbers.join(',') === key);
}

/**
 * 누적 세트 추가. 중복 numbers는 자동 skip.
 * cap 초과 시 추가 차단 (테일 자르기 X - 사용자가 명시적으로 삭제).
 *
 * @param {object} character savedSets 보장된 상태
 * @param {Array<{numbers, strategyIds, strategySources}>} newSets
 * @returns {{ character: object, addedCount: number, skipped: { duplicate: number, cap: number } }}
 */
export function addSavedSets(character, newSets) {
  const list = Array.isArray(character.savedSets?.list) ? character.savedSets.list : [];
  const next = [...list];
  let dup = 0;
  let capSkip = 0;
  let added = 0;
  const now = Date.now();

  for (const set of newSets) {
    if (!set || !Array.isArray(set.numbers) || set.numbers.length === 0) continue;
    if (next.length >= SAVED_SETS_CAP) { capSkip += 1; continue; }
    if (hasSameNumbers(next, set.numbers)) { dup += 1; continue; }
    next.push({
      numbers: [...set.numbers],
      strategyIds: Array.isArray(set.strategyIds) ? [...set.strategyIds] : [],
      strategySources: Array.isArray(set.strategySources) ? [...set.strategySources] : [],
      recipeId: recipeIdFor(set.strategyIds),
      createdAt: now,
    });
    added += 1;
  }

  return {
    character: { ...character, savedSets: { ...character.savedSets, list: next } },
    addedCount: added,
    skipped: { duplicate: dup, cap: capSkip },
  };
}

/**
 * 인덱스로 세트 1개 삭제.
 * @returns {object} updated character
 */
export function removeSavedSetAt(character, index) {
  const list = Array.isArray(character.savedSets?.list) ? character.savedSets.list : [];
  if (index < 0 || index >= list.length) return character;
  const next = [...list.slice(0, index), ...list.slice(index + 1)];
  return { ...character, savedSets: { ...character.savedSets, list: next } };
}

/** 모든 세트 삭제. */
export function clearSavedSets(character) {
  return { ...character, savedSets: { ...(character.savedSets || {}), list: [] } };
}
