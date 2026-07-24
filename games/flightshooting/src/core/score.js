// 점수 지급 규칙. 자동 플레이가 실제 조종 중일 때만 점수를 낮춰, 자동을 켜둔 채 손으로 조작하는
// 구간은 원래 점수를 유지한다. 점수판·저장값은 정수로 유지하되, AI 점수의 나눗셈 잔여를
// 분자 단위로 누적해 여러 번의 획득 합계가 정확히 1/3이 되게 한다(부동소수점 오차 없음).
import { CFG } from '../data/numbers.js';

export function isAutoControlling(game) {
  return !!(game.autoAssist && !game.dragging && game.manualTimer <= 0);
}

export function awardScore(game, amount) {
  if (!isAutoControlling(game)) {
    game.score += amount;
    return amount;
  }
  const divisor = CFG.score.aiDivisor;
  const total = (game.scoreRemainder || 0) + amount;
  const earned = Math.floor(total / divisor);
  game.scoreRemainder = total % divisor;
  game.score += earned;
  return earned;
}
