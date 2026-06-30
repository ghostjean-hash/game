// BFS 최단 해 솔버. 퍼즐의 최소 이동수(목표)를 계산하고 풀 수 있는지 검증한다.
// 1수 = 차 한 대를 한 방향으로 한 번 미는 것(몇 칸이든 1수, docs/01_spec.md §5).
// core 모듈이므로 DOM 의존 없음.

import { slideRange, axisPos, moveCar, isSolved } from './board.js';

// 상태를 문자열로 직렬화. id 순서를 고정해 각 차의 가변 축 좌표만 나열한다.
function serialize(cars) {
  return cars
    .slice()
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((c) => `${c.id}${axisPos(c)}`)
    .join('|');
}

// 한 수로 도달 가능한 모든 { move, state }(각 차를 가능한 다른 모든 칸으로 민 결과).
// move = { id, pos }(가변 축 목표 좌표), state = 그 수를 둔 새 cars.
function expand(cars) {
  const out = [];
  for (const car of cars) {
    const { min, max } = slideRange(cars, car.id);
    const cur = axisPos(car);
    for (let pos = min; pos <= max; pos++) {
      if (pos === cur) continue; // 제자리는 수가 아님
      out.push({ move: { id: car.id, pos }, state: moveCar(cars, car.id, pos) });
    }
  }
  return out;
}

// 시작 상태에서 클리어까지 BFS 최단 탐색. solve / solveStep의 공통 코어.
// 반환: { depth, firstMove } - depth=최소 이동수, firstMove=최단 경로의 첫 수({id,pos}).
//   이미 풀려 있으면 { depth: 0, firstMove: null }, 풀 수 없으면 null.
function search(cars) {
  if (isSolved(cars)) return { depth: 0, firstMove: null };
  const seen = new Set([serialize(cars)]);
  // frontier 각 항목: { state, first } - first는 이 경로가 출발할 때 둔 첫 수.
  let frontier = [{ state: cars, first: null }];
  let depth = 0;

  while (frontier.length > 0) {
    depth += 1;
    const next = [];
    for (const { state, first } of frontier) {
      for (const { move, state: nb } of expand(state)) {
        const key = serialize(nb);
        if (seen.has(key)) continue;
        const firstMove = first || move; // 깊이 1에서 둔 수가 그 경로의 첫 수
        if (isSolved(nb)) return { depth, firstMove };
        seen.add(key);
        next.push({ state: nb, first: firstMove });
      }
    }
    frontier = next;
  }
  return null;
}

// 최소 이동수를 반환. 풀 수 없으면 null.
export function solve(cars) {
  const r = search(cars);
  return r ? r.depth : null;
}

// 힌트용: 최적 해의 첫 한 수 { id, pos }를 반환한다(가변 축 목표 좌표).
// 이미 풀렸거나 풀 수 없으면 null.
export function solveStep(cars) {
  const r = search(cars);
  return r ? r.firstMove : null;
}
