// 추천 vs 발표 매칭. SSOT: docs/02_data.md (등수 룰).
// core/는 DOM 금지. 순수 함수.
//
// 한국 6/45 등수 룰:
//   1등: 본번호 6개 일치
//   2등: 본번호 5개 + 추천의 6번째 본번호 = 발표 보너스
//   3등: 본번호 5개 일치
//   4등: 본번호 4개 일치
//   5등: 본번호 3개 일치

/**
 * 추천 결과를 발표 회차와 매칭하여 등수 반환.
 * @param {{ numbers: number[], bonus: number }} recommendation 추천 카드
 * @param {{ numbers: number[], bonus: number }} draw 발표 회차
 * @returns {1 | 2 | 3 | 4 | 5 | null}
 */
export function matchRank(recommendation, draw) {
  const drawNumberSet = new Set(draw.numbers);
  let mainHits = 0;
  for (const n of recommendation.numbers) {
    if (drawNumberSet.has(n)) mainHits += 1;
  }
  // 추천 본번호 중 발표 보너스와 일치하는 개수 (0 또는 1)
  let bonusHit = 0;
  for (const n of recommendation.numbers) {
    if (n === draw.bonus) { bonusHit = 1; break; }
  }

  if (mainHits === 6) return 1;
  if (mainHits === 5 && bonusHit === 1) return 2;
  if (mainHits === 5) return 3;
  if (mainHits === 4) return 4;
  if (mainHits === 3) return 5;
  return null;
}
