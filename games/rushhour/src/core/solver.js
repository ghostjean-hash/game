// BFS 최단 해 솔버. 퍼즐의 최소 이동수(목표)를 계산하고 풀 수 있는지 검증한다.
// 1수 = 차 한 대를 한 방향으로 한 번 미는 것(몇 칸이든 1수, docs/01_spec.md §5).
// core 모듈이므로 DOM 의존 없음.

import { slideRange, axisPos, isSolved } from './board.js';
import { ORIENT } from '../data/constants.js';

// 상태를 문자열로 직렬화. BFS 안의 모든 상태는 같은 시작 배열의 map 파생이라 차 순서가
// 고정이므로 정렬 없이 그대로 잇는다(id 1글자 + 좌표 1자리라 구분자 불필요).
function serialize(cars) {
  let key = '';
  for (const c of cars) key += c.id + axisPos(c);
  return key;
}

// 한 수로 도달 가능한 모든 { move, state }(각 차를 가능한 다른 모든 칸으로 민 결과).
// move = { id, pos }(가변 축 목표 좌표), state = 그 수를 둔 새 cars.
// pos는 이미 slideRange 안이므로 moveCar(내부에서 slideRange를 다시 계산)를 거치지 않고
// 새 배열을 직접 만든다(탐색 상태당 점유 격자 재계산 1회 절약).
function expand(cars) {
  const out = [];
  for (const car of cars) {
    const { min, max } = slideRange(cars, car.id);
    const cur = axisPos(car);
    const isH = car.orient === ORIENT.H;
    for (let pos = min; pos <= max; pos++) {
      if (pos === cur) continue; // 제자리는 수가 아님
      const state = cars.map((c) => (c === car
        ? (isH ? { ...c, col: pos } : { ...c, row: pos })
        : c));
      out.push({ move: { id: car.id, pos }, state });
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
