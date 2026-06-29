// 보드 / 차 DOM 렌더. 칸 좌표 → CSS 변수로 배치하고 위치 갱신만 담당한다.
// 게임 로직은 core/에 있다(docs/03_architecture.md §2.2).
// 차는 동물 친구로 그린다: 색(colors.js) + 종류(characters.js)를 여기서 조합한다.

import { BOARD_SIZE, EXIT_ROW, TARGET_ID, ORIENT } from '../data/constants.js';
import { TARGET_COLOR, CAR_PALETTE } from '../data/colors.js';
import { TARGET_KIND, FRIEND_KINDS } from '../data/characters.js';

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

// 차 id별 동물 종류를 정한다. target은 토끼 고정, 나머지는 종류 배열을 순환.
function kindFor(cars) {
  const map = new Map();
  let i = 0;
  for (const car of cars) {
    if (car.id === TARGET_ID) map.set(car.id, TARGET_KIND);
    else map.set(car.id, FRIEND_KINDS[i++ % FRIEND_KINDS.length]);
  }
  return map;
}

// 종류별 귀 / 머리 장식 SVG(viewBox 0~100, 얼굴을 가득 채운다). 흰 얼굴 위에서 보이도록 흰 바깥 + 몸색 안쪽.
function ears(kind, body) {
  const W = '#ffffff';
  switch (kind) {
    case 'rabbit':
      return `<ellipse cx="33" cy="14" rx="10" ry="25" fill="${W}"/><ellipse cx="67" cy="14" rx="10" ry="25" fill="${W}"/>`
        + `<ellipse cx="33" cy="16" rx="4.5" ry="17" fill="${body}"/><ellipse cx="67" cy="16" rx="4.5" ry="17" fill="${body}"/>`;
    case 'bear':
      return `<circle cx="19" cy="21" r="17" fill="${W}"/><circle cx="81" cy="21" r="17" fill="${W}"/>`
        + `<circle cx="19" cy="21" r="9" fill="${body}"/><circle cx="81" cy="21" r="9" fill="${body}"/>`;
    case 'cat':
      return `<polygon points="8,33 22,-3 51,28" fill="${W}"/><polygon points="92,33 78,-3 49,28" fill="${W}"/>`
        + `<polygon points="17,29 24,8 41,27" fill="${body}"/><polygon points="83,29 76,8 59,27" fill="${body}"/>`;
    case 'dog':
      return `<ellipse cx="11" cy="31" rx="12" ry="24" fill="${body}"/><ellipse cx="89" cy="31" rx="12" ry="24" fill="${body}"/>`;
    case 'chick':
      return `<path d="M39 8 Q50 -8 61 8 Q50 16 39 8 Z" fill="${body}"/>`;
    default:
      return ''; // penguin: 귀 없음
  }
}

// 얼굴 SVG 한 장. 흰 얼굴 베이스를 viewBox 가득(r44) + 큰 눈 / 볼 / 코, 종류별 귀와 부리(병아리).
function faceSvg(kind, body) {
  const head = `<circle cx="50" cy="54" r="44" fill="#ffffff"/>`;
  const beak = kind === 'chick'
    ? `<polygon points="40,60 60,60 50,76" fill="#f6a02a"/>` : '';
  const nose = kind === 'rabbit' || kind === 'bear' || kind === 'dog' || kind === 'cat'
    ? `<ellipse cx="50" cy="61" rx="4.5" ry="3.3" fill="#9c6b7d"/>` : '';
  return `<svg class="face" viewBox="0 0 100 100" aria-hidden="true">`
    + ears(kind, body)
    + head
    + `<circle cx="35" cy="51" r="8" fill="#3a2e3a"/><circle cx="65" cy="51" r="8" fill="#3a2e3a"/>`
    + `<circle cx="32" cy="48" r="2.8" fill="#ffffff"/><circle cx="62" cy="48" r="2.8" fill="#ffffff"/>`
    + `<circle cx="20" cy="65" r="7" fill="#ff9ec4" opacity="0.72"/><circle cx="80" cy="65" r="7" fill="#ff9ec4" opacity="0.72"/>`
    + nose + beak
    + `</svg>`;
}

// 보드를 비우고 격자 배경 + 출구(집) 표시 + 차 엘리먼트를 새로 만든다.
// 반환: id -> 차 엘리먼트 맵.
export function buildBoard(boardEl, cars) {
  boardEl.style.setProperty('--size', String(BOARD_SIZE));
  boardEl.innerHTML = '';

  // 출구 표시(출구 행 오른쪽 가장자리) = 토끼의 집.
  const exit = document.createElement('div');
  exit.className = 'exit';
  exit.style.setProperty('--row', String(EXIT_ROW));
  exit.textContent = '🏠';
  boardEl.appendChild(exit);

  const colors = colorFor(cars);
  const kinds = kindFor(cars);
  const els = new Map();
  for (const car of cars) {
    const el = document.createElement('div');
    el.className = `car ${car.orient === ORIENT.H ? 'h' : 'v'}${car.id === TARGET_ID ? ' target' : ''}`;
    el.dataset.id = car.id;
    el.style.setProperty('--len', String(car.len));
    el.style.background = colors.get(car.id);
    el.innerHTML = faceSvg(kinds.get(car.id), colors.get(car.id));
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
