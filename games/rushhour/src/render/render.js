// 보드 / 차 DOM 렌더. 칸 좌표 → CSS 변수로 배치하고 위치 갱신만 담당한다.
// 게임 로직은 core/에 있다(docs/03_architecture.md §2.2).

import { BOARD_SIZE, EXIT_ROW, TARGET_ID, ORIENT } from '../data/constants.js';
import { TARGET_COLOR, CAR_PALETTE } from '../data/colors.js';

// 차 id별 색을 정한다. target은 고정색, 나머지는 팔레트를 순환 배정.
function colorFor(cars) {
  const map = new Map();
  let i = 0;
  for (const car of cars) {
    if (car.id === TARGET_ID) map.set(car.id, TARGET_COLOR);
    else map.set(car.id, CAR_PALETTE[i++ % CAR_PALETTE.length]);
  }
  return map;
}

// 보드를 비우고 격자 배경 + 출구 표시 + 차 엘리먼트를 새로 만든다.
// 반환: id -> 차 엘리먼트 맵.
export function buildBoard(boardEl, cars) {
  boardEl.style.setProperty('--size', String(BOARD_SIZE));
  boardEl.innerHTML = '';

  // 출구 표시(출구 행 오른쪽 가장자리).
  const exit = document.createElement('div');
  exit.className = 'exit';
  exit.style.setProperty('--row', String(EXIT_ROW));
  boardEl.appendChild(exit);

  const colors = colorFor(cars);
  const els = new Map();
  for (const car of cars) {
    const el = document.createElement('div');
    el.className = `car ${car.orient === ORIENT.H ? 'h' : 'v'}${car.id === TARGET_ID ? ' target' : ''}`;
    el.dataset.id = car.id;
    el.style.setProperty('--len', String(car.len));
    el.style.background = colors.get(car.id);
    place(el, car);
    boardEl.appendChild(el);
    els.set(car.id, el);
  }
  return els;
}

// 차 엘리먼트를 칸 좌표에 놓는다(CSS 변수 갱신).
export function place(el, car) {
  el.style.setProperty('--col', String(car.col));
  el.style.setProperty('--row', String(car.row));
}

// 모든 차의 위치를 현재 cars로 갱신한다.
export function syncPositions(els, cars) {
  for (const car of cars) {
    const el = els.get(car.id);
    if (el) place(el, car);
  }
}
