// 이력 저장 / 매칭 / 캐릭터 통계.
// core/는 DOM 금지. 순수 함수.
//
// S090 (2026-05-17): 백캐스트(`backfillRecommendations`) 폐기.
//   사용자 명시 "진짜를 돌리고 싶다" + "추천 번호를 직접 선택해야 한다".
//   history는 사용자 명시 등록만 누적 = 진짜 적중률 시각화.
//   자동 등록 흐름도 폐기 (옛 main.js의 + 1세트 시 자동 recordRecommendation 호출).
//   진입: saved-sets-row "내 번호로 선택" 버튼 → registerSavedSetToHistory 호출.

import { matchRank } from './match.js';
// S090-후속 7 (2026-05-18): cap 폐기. 사용자 명시 "5개 제한 없애줘".

/**
 * 캐릭터 history에 추천 항목 기록 (같은 drwNo + 같은 numbers는 덮어쓰기 아닌 중복으로 간주, 본 함수는 사용자 명시 등록 진입점에서만 호출).
 * 새 객체 반환 (immutable).
 * @param {object} character
 * @param {{ drwNo: number, numbers: number[], bonus: number, reasons: string[], createdAt: string, strategyIds?: string[], strategySources?: any[] }} recommendation
 * @returns {object} 갱신된 character
 */
export function recordRecommendation(character, recommendation) {
  // S090: 같은 drwNo + 같은 numbers 조합은 중복 등록 차단 (saved-set은 이미 dedupe, 본 함수는 안전망).
  const sameKey = (recommendation.numbers || []).join(',');
  const dup = character.history.some(
    (h) => h.drwNo === recommendation.drwNo && Array.isArray(h.numbers) && h.numbers.join(',') === sameKey,
  );
  if (dup) return character;
  // S089: luckApplied 필드 폐기. S090: source 'user' 필드 신설 (사용자 명시 등록 출처 표기).
  const entry = { ...recommendation, matchedRank: null, source: 'user' };
  return { ...character, history: [...character.history, entry] };
}

/**
 * S090 (2026-05-17): 사용자 명시 등록 - saved-set 1개를 history에 등록 또는 해제 (toggle).
 * S090-후속 7 (2026-05-18): cap 폐기 (사용자 명시 "5개 제한 없애줘"). 등록 차단 분기 제거.
 *   saved-sets cap(20)이 자연 상한 역할.
 *
 * @param {object} character
 * @param {object} savedSet - saved-set 1개 (numbers / bonus / reasons / strategyIds / strategySources)
 * @param {number} drwNo
 * @returns {{ character: object, action: 'registered' | 'unregistered' | 'noop' }}
 */
export function toggleSavedSetRegistration(character, savedSet, drwNo) {
  if (!savedSet || !Array.isArray(savedSet.numbers)) return { character, action: 'noop' };
  const key = savedSet.numbers.join(',');
  const existingIdx = character.history.findIndex(
    (h) => h.drwNo === drwNo && Array.isArray(h.numbers) && h.numbers.join(',') === key,
  );
  if (existingIdx >= 0) {
    // 등록 해제
    const next = [...character.history.slice(0, existingIdx), ...character.history.slice(existingIdx + 1)];
    return { character: { ...character, history: next }, action: 'unregistered' };
  }
  // 등록 (S090-후속 7 cap 체크 폐기)
  // S097 (2026-05-19): `revealed: false` 신규 필드 - 발표 후 사용자가 직접 reveal 트리거 전까지 ball 반투명 상태.
  const entry = {
    drwNo,
    numbers: [...savedSet.numbers],
    bonus: savedSet.bonus ?? null,
    reasons: Array.isArray(savedSet.reasons) ? [...savedSet.reasons] : [],
    strategyIds: Array.isArray(savedSet.strategyIds) ? [...savedSet.strategyIds] : [],
    strategySources: Array.isArray(savedSet.strategySources) ? [...savedSet.strategySources] : [],
    createdAt: new Date().toISOString(),
    matchedRank: null,
    source: 'user',
    revealed: false,
  };
  return { character: { ...character, history: [...character.history, entry] }, action: 'registered' };
}

/**
 * S097 (2026-05-19): history 항목을 revealed=true로 갱신.
 * 사용자가 체크 버튼 클릭 후 ball reveal 애니메이션 완료 시 호출.
 * @param {object} character
 * @param {number} drwNo
 * @param {string} key  numbers.join(',') (history 항목 식별)
 * @returns {object} 갱신된 character (변경 없으면 동일 객체)
 */
export function revealRecommendation(character, drwNo, key) {
  if (!Array.isArray(character?.history)) return character;
  const idx = character.history.findIndex(
    (h) => h.drwNo === drwNo && Array.isArray(h.numbers) && h.numbers.join(',') === key,
  );
  if (idx < 0) return character;
  if (character.history[idx].revealed === true) return character;
  const next = [...character.history];
  next[idx] = { ...next[idx], revealed: true };
  return { ...character, history: next };
}

/**
 * 회차당 등록된 history 항목 수.
 * @param {object} character
 * @param {number} drwNo
 * @returns {number}
 */
export function countRegisteredForRound(character, drwNo) {
  if (!Array.isArray(character?.history)) return 0;
  return character.history.filter((h) => h.drwNo === drwNo).length;
}

/**
 * 특정 numbers 조합이 이미 회차 history에 등록되어 있는지.
 * @param {object} character
 * @param {number} drwNo
 * @param {number[]} numbers
 * @returns {boolean}
 */
export function isRegistered(character, drwNo, numbers) {
  if (!Array.isArray(character?.history) || !Array.isArray(numbers)) return false;
  const key = numbers.join(',');
  return character.history.some(
    (h) => h.drwNo === drwNo && Array.isArray(h.numbers) && h.numbers.join(',') === key,
  );
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
    // S089: matchedRank만 갱신. (옛 luckApplied 잠금 로직은 Luck 자산 폐기로 제거.)
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
