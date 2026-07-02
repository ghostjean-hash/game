// 실수 횟수 → 별점 계산 (순수 함수). 경계는 constants.js.

import { STAR_THRESHOLDS, MAX_STARS } from '../data/constants.js';

// 실수 <= THREE → 3별, <= TWO → 2별, 그 외 1별.
export function starsFor(mistakes) {
  if (mistakes <= STAR_THRESHOLDS.THREE) return MAX_STARS;
  if (mistakes <= STAR_THRESHOLDS.TWO) return MAX_STARS - 1;
  return 1;
}
