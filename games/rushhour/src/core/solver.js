// BFS 최단 해 솔버. 퍼즐의 최소 이동수(목표)를 계산하고 풀 수 있는지 검증한다.
// 1수 = 차 한 대를 한 방향으로 한 번 미는 것(몇 칸이든 1수, docs/01_spec.md §5).
// core 모듈이므로 DOM 의존 없음.

import { ORIENT } from '../data/constants.js';
import { slideRange, axisPos, moveCar, isSolved } from './board.js';

// 상태를 문자열로 직렬화. id 순서를 고정해 각 차의 가변 축 좌표만 나열한다.
function serialize(cars) {
  return cars
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((c) => `${c.id}${axisPos(c)}`)
    .join('|');
}

// 한 수로 도달 가능한 모든 상태(각 차를 가능한 다른 모든 칸으로 민 결과).
function neighbors(cars) {
  const out = [];
  for (const car of cars) {
    const { min, max } = slideRange(cars, car.id);
    const cur = axisPos(car);
    for (let pos = min; pos <= max; pos++) {
      if (pos === cur) continue; // 제자리는 수가 아님
      out.push(moveCar(cars, car.id, pos));
    }
  }
  return out;
}

// 최소 이동수를 반환. 풀 수 없으면 null.
export function solve(cars) {
  if (isSolved(cars)) return 0;
  const start = serialize(cars);
  const seen = new Set([start]);
  let frontier = [cars];
  let depth = 0;

  while (frontier.length > 0) {
    depth += 1;
    const next = [];
    for (const state of frontier) {
      for (const nb of neighbors(state)) {
        const key = serialize(nb);
        if (seen.has(key)) continue;
        if (isSolved(nb)) return depth;
        seen.add(key);
        next.push(nb);
      }
    }
    frontier = next;
  }
  return null;
}
