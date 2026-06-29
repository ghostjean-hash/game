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

// 종류별 귀 / 머리 장식 SVG(viewBox 0~100). 흰 얼굴 위에서 보이도록 흰 바깥 + 몸색 안쪽으로 그린다.
function ears(kind, body) {
  const W = '#ffffff';
  switch (kind) {
    case 'rabbit':
      return `<ellipse cx="35" cy="13" rx="8" ry="20" fill="${W}"/><ellipse cx="65" cy="13" rx="8" ry="20" fill="${W}"/>`
        + `<ellipse cx="35" cy="15" rx="3.5" ry="13" fill="${body}"/><ellipse cx="65" cy="15" rx="3.5" ry="13" fill="${body}"/>`;
    case 'bear':
      return `<circle cx="25" cy="25" r="13" fill="${W}"/><circle cx="75" cy="25" r="13" fill="${W}"/>`
        + `<circle cx="25" cy="25" r="6.5" fill="${body}"/><circle cx="75" cy="25" r="6.5" fill="${body}"/>`;
    case 'cat':
      return `<polygon points="15,33 26,5 47,30" fill="${W}"/><polygon points="85,33 74,5 53,30" fill="${W}"/>`
        + `<polygon points="22,29 28,14 39,27" fill="${body}"/><polygon points="78,29 72,14 61,27" fill="${body}"/>`;
    case 'dog':
      return `<ellipse cx="18" cy="30" rx="10" ry="19" fill="${body}"/><ellipse cx="82" cy="30" rx="10" ry="19" fill="${body}"/>`;
    case 'chick':
      return `<path d="M42 11 Q50 -3 58 11 Q50 15 42 11 Z" fill="${body}"/>`;
    default:
      return ''; // penguin: 귀 없음
  }
}

// 얼굴 SVG 한 장. 흰 얼굴 베이스 + 눈 / 볼 / 코, 종류별 귀와 부리(병아리).
function faceSvg(kind, body) {
  const head = `<circle cx="50" cy="56" r="31" fill="#ffffff"/>`;
  const beak = kind === 'chick'
    ? `<polygon points="42,58 58,58 50,69" fill="#f6a02a"/>` : '';
  const nose = kind === 'rabbit' || kind === 'bear' || kind === 'dog' || kind === 'cat'
    ? `<ellipse cx="50" cy="61" rx="3.5" ry="2.6" fill="#9c6b7d"/>` : '';
  return `<svg class="face" viewBox="0 0 100 100" aria-hidden="true">`
    + ears(kind, body)
    + head
    + `<circle cx="38" cy="54" r="5.5" fill="#3a2e3a"/><circle cx="62" cy="54" r="5.5" fill="#3a2e3a"/>`
    + `<circle cx="36" cy="52" r="1.8" fill="#ffffff"/><circle cx="60" cy="52" r="1.8" fill="#ffffff"/>`
    + `<circle cx="28" cy="65" r="5" fill="#ff9ec4" opacity="0.7"/><circle cx="72" cy="65" r="5" fill="#ff9ec4" opacity="0.7"/>`
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
