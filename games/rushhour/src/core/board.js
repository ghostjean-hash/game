// 순수 게임 로직. DOM/window/document 일체 import 금지(docs/04_conventions.md §2.2).
// cars 배열은 불변으로 다룬다. 이동 함수는 새 배열을 반환한다.

import { BOARD_SIZE, EXIT_ROW, TARGET_ID, ORIENT } from '../data/constants.js';

// 차가 점유하는 셀 좌표 배열 [{row, col}, ...].
export function cellsOf(car) {
  const cells = [];
  for (let i = 0; i < car.len; i++) {
    cells.push(
      car.orient === ORIENT.H
        ? { row: car.row, col: car.col + i }
        : { row: car.row + i, col: car.col },
    );
  }
  return cells;
}

// 점유 격자: grid[row][col] = 차 id 또는 null.
export function occupancy(cars) {
  const grid = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
  for (const car of cars) {
    for (const { row, col } of cellsOf(car)) {
      grid[row][col] = car.id;
    }
  }
  return grid;
}

// 가변 좌표: 가로차는 col, 세로차는 row(이동 축의 시작 좌표).
export function axisPos(car) {
  return car.orient === ORIENT.H ? car.col : car.row;
}

// 그 차가 이동할 수 있는 시작 좌표 범위 { min, max } (가변 축 기준, 포함 범위).
// 자기 자신은 격자에서 빼고 앞뒤로 빈 칸을 센다.
export function slideRange(cars, id) {
  const car = cars.find((c) => c.id === id);
  const grid = occupancy(cars);
  for (const { row, col } of cellsOf(car)) grid[row][col] = null;

  const isH = car.orient === ORIENT.H;
  const cur = isH ? car.col : car.row;
  const fixed = isH ? car.row : car.col;

  const occupiedAt = (pos) => {
    // 차의 머리 좌표가 pos일 때 새로 들어가는 끝 칸 점검은 호출부에서 한 칸씩 확장한다.
    const r = isH ? fixed : pos;
    const c = isH ? pos : fixed;
    return grid[r][c] !== null;
  };

  // 뒤(작은 좌표)로 확장: 머리 한 칸 앞 칸이 비었는지 본다.
  let min = cur;
  while (min - 1 >= 0 && !occupiedAt(min - 1)) min -= 1;

  // 앞(큰 좌표)으로 확장: 머리를 한 칸 늘렸을 때 새로 차지하는 꼬리 칸이 비었는지 본다.
  let max = cur;
  while (tailFree(grid, car, max + 1, isH, fixed)) max += 1;

  return { min, max };
}

// 머리 좌표가 head일 때 새로 차지하는 꼬리 칸(head+len-1)이 비었는지.
function tailFree(grid, car, head, isH, fixed) {
  const tail = head + car.len - 1;
  if (tail > BOARD_SIZE - 1) return false;
  const r = isH ? fixed : tail;
  const c = isH ? tail : fixed;
  return grid[r][c] === null;
}

// 차 id를 가변 축의 새 시작 좌표 pos로 옮긴 새 cars 배열을 반환한다.
// 범위 밖이면 그대로(변화 없음) 반환한다.
export function moveCar(cars, id, pos) {
  const { min, max } = slideRange(cars, id);
  const clamped = Math.max(min, Math.min(max, pos));
  return cars.map((c) => {
    if (c.id !== id) return c;
    return c.orient === ORIENT.H ? { ...c, col: clamped } : { ...c, row: clamped };
  });
}

// 빨간 차의 오른쪽 끝이 보드 오른쪽 가장자리에 닿으면 클리어.
export function isSolved(cars) {
  const x = cars.find((c) => c.id === TARGET_ID);
  return x ? x.col + x.len === BOARD_SIZE : false;
}

// 격자 문자열(6줄 x 6자, '.'=빈칸, 그 외 문자=차 id, 'X'=빨간 차)을 cars 배열로 변환한다.
// 같은 문자가 한 행에만 있으면 가로, 한 열에만 있으면 세로로 판정한다.
export function parseGrid(rows) {
  const cells = new Map(); // id -> [{row,col}, ...]
  for (let row = 0; row < rows.length; row++) {
    const line = rows[row];
    for (let col = 0; col < line.length; col++) {
      const ch = line[col];
      if (ch === '.' || ch === ' ') continue;
      if (!cells.has(ch)) cells.set(ch, []);
      cells.get(ch).push({ row, col });
    }
  }
  const cars = [];
  for (const [id, list] of cells) {
    const rowsSet = new Set(list.map((c) => c.row));
    const colsSet = new Set(list.map((c) => c.col));
    const orient = rowsSet.size === 1 ? ORIENT.H : ORIENT.V;
    const row = Math.min(...list.map((c) => c.row));
    const col = Math.min(...list.map((c) => c.col));
    cars.push({ id, row, col, len: list.length, orient });
  }
  return cars;
}

// 퍼즐 유효성(docs/02_data.md §3.4). 문제 있으면 사유 문자열 배열, 정상이면 빈 배열.
export function validatePuzzle(cars) {
  const errors = [];
  const grid = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null),
  );
  for (const car of cars) {
    for (const { row, col } of cellsOf(car)) {
      if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
        errors.push(`${car.id}: 보드 밖 (${row},${col})`);
        continue;
      }
      if (grid[row][col] !== null) {
        errors.push(`${car.id}: ${grid[row][col]}와 겹침 (${row},${col})`);
      }
      grid[row][col] = car.id;
    }
  }
  const targets = cars.filter((c) => c.id === TARGET_ID);
  if (targets.length !== 1) {
    errors.push(`빨간 차(${TARGET_ID})는 정확히 1대여야 함 (현재 ${targets.length})`);
  } else {
    const x = targets[0];
    if (x.orient !== ORIENT.H) errors.push('빨간 차는 가로여야 함');
    if (x.row !== EXIT_ROW) errors.push(`빨간 차는 출구 행(${EXIT_ROW})에 있어야 함`);
  }
  return errors;
}
