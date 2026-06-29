// 보드 / 차 DOM 렌더. 칸 좌표 → CSS 변수로 배치하고 위치 갱신만 담당한다.
// 게임 로직은 core/에 있다(docs/03_architecture.md §2.2).
// 차는 동물 친구로 그린다: 블록 크기 → 동물(characters.js), 색(colors.js), 표정·액세서리는 블록 위치로.

import { BOARD_SIZE, EXIT_ROW, TARGET_ID, CLEAR_EXIT_MS, CONFETTI_COUNT } from '../data/constants.js';
import { TARGET_COLOR, KIND_COLORS } from '../data/colors.js';
import { TARGET_KIND, KIND_BY_SHAPE, FACES, ACCESSORIES } from '../data/characters.js';

// 주인공 토끼 색(상점에서 장착한 스킨). main이 setTargetColor로 갱신한다.
let targetColor = TARGET_COLOR;
export function setTargetColor(c) {
  targetColor = c || TARGET_COLOR;
}

// 블록 위치 기반 결정값(리셋해도 같은 블록은 같은 모습). 음수 방지로 절대값.
function seedOf(car) {
  return Math.abs(car.row * 31 + car.col * 17 + car.len * 7);
}

// 블록 크기 → 동물 종류. 주인공은 토끼 고정.
function kindOf(car) {
  if (car.id === TARGET_ID) return TARGET_KIND;
  return KIND_BY_SHAPE[`${car.orient}${car.len}`] || 'cat';
}

// 동물 색. 주인공은 고정, 친구는 종류별 후보에서 위치로 하나 고른다.
function colorOf(car, kind) {
  if (car.id === TARGET_ID) return targetColor;
  const pool = KIND_COLORS[kind] || KIND_COLORS.cat;
  return pool[seedOf(car) % pool.length];
}

// 표정 / 액세서리. 주인공은 방긋 + 액세서리 없음(깔끔하게 강조).
function faceOf(car) {
  return car.id === TARGET_ID ? 'neutral' : FACES[(seedOf(car) * 3 + 1) % FACES.length];
}
function accOf(car) {
  return car.id === TARGET_ID ? 'none' : ACCESSORIES[(seedOf(car) * 5 + 2) % ACCESSORIES.length];
}

// 종류별 귀 / 머리 장식(viewBox 0~100). 흰 얼굴 위에서 보이도록 흰 바깥 + 몸색 안쪽.
function ears(kind, body) {
  const W = '#ffffff';
  switch (kind) {
    case 'rabbit':
      return `<ellipse cx="33" cy="14" rx="10" ry="25" fill="${W}"/><ellipse cx="67" cy="14" rx="10" ry="25" fill="${W}"/>`
        + `<ellipse cx="33" cy="16" rx="4.5" ry="17" fill="${body}"/><ellipse cx="67" cy="16" rx="4.5" ry="17" fill="${body}"/>`;
    case 'dog':
      return `<ellipse cx="11" cy="31" rx="12" ry="24" fill="${body}"/><ellipse cx="89" cy="31" rx="12" ry="24" fill="${body}"/>`;
    case 'cat':
      return `<polygon points="8,33 22,-3 51,28" fill="${W}"/><polygon points="92,33 78,-3 49,28" fill="${W}"/>`
        + `<polygon points="17,29 24,8 41,27" fill="${body}"/><polygon points="83,29 76,8 59,27" fill="${body}"/>`;
    case 'penguin': // 머리 위 작은 깃털 둘
      return `<path d="M44 12 Q47 2 50 12 Z" fill="${body}"/><path d="M50 12 Q53 2 56 12 Z" fill="${body}"/>`;
    default:
      return ''; // chick: 머리깃은 본체에서
  }
}

// 표정별 눈.
function eyesSvg(face) {
  const D = '#3a2e3a';
  switch (face) {
    case 'happy':
      return `<path d="M27 53 Q35 44 43 53" stroke="${D}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
        + `<path d="M57 53 Q65 44 73 53" stroke="${D}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`;
    case 'wink':
      return `<path d="M27 53 Q35 44 43 53" stroke="${D}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
        + `<circle cx="65" cy="51" r="8" fill="${D}"/><circle cx="62" cy="48" r="2.8" fill="#ffffff"/>`;
    case 'surprised':
      return `<circle cx="35" cy="51" r="9" fill="${D}"/><circle cx="65" cy="51" r="9" fill="${D}"/>`
        + `<circle cx="31.5" cy="47.5" r="3" fill="#ffffff"/><circle cx="61.5" cy="47.5" r="3" fill="#ffffff"/>`;
    case 'worried': // 어두운 표정: 점눈 + 처진 눈썹
      return `<circle cx="35" cy="53" r="7" fill="${D}"/><circle cx="65" cy="53" r="7" fill="${D}"/>`
        + `<path d="M26 45 Q35 42 43 47" stroke="${D}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
        + `<path d="M74 45 Q65 42 57 47" stroke="${D}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    case 'cry': // 울상: 질끈 감은 눈(아래로 볼록)
      return `<path d="M27 50 Q35 58 43 50" stroke="${D}" stroke-width="4" fill="none" stroke-linecap="round"/>`
        + `<path d="M57 50 Q65 58 73 50" stroke="${D}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    default: // normal / neutral (점눈)
      return `<circle cx="35" cy="51" r="8" fill="${D}"/><circle cx="65" cy="51" r="8" fill="${D}"/>`
        + `<circle cx="32" cy="48" r="2.8" fill="#ffffff"/><circle cx="62" cy="48" r="2.8" fill="#ffffff"/>`;
  }
}

// 입(병아리는 부리로 대체).
function mouthSvg(kind, face) {
  if (kind === 'chick') return `<polygon points="40,60 60,60 50,76" fill="#f6a02a"/>`;
  const M = '#9c6b7d';
  switch (face) {
    case 'surprised': return `<ellipse cx="50" cy="67" rx="3.5" ry="4.5" fill="${M}"/>`;
    case 'neutral': return `<path d="M44 66 L56 66" stroke="${M}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'worried': return `<path d="M43 68 Q50 63 57 68" stroke="${M}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'cry': return `<ellipse cx="50" cy="68" rx="5" ry="6" fill="#7d5563"/>`;
    default: return `<path d="M43 64 Q50 70 57 64" stroke="${M}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
}

function noseSvg(kind) {
  return kind === 'rabbit' || kind === 'cat' || kind === 'dog'
    ? `<ellipse cx="50" cy="59.5" rx="4" ry="3" fill="#9c6b7d"/>` : '';
}

// 액세서리(일부 블록만). 머리 오른쪽 위 또는 턱 아래.
function accessorySvg(acc) {
  switch (acc) {
    case 'ribbon':
      return `<g transform="translate(71,15)"><polygon points="0,0 -11,-7 -11,7" fill="#ff8fab"/>`
        + `<polygon points="0,0 11,-7 11,7" fill="#ff8fab"/><circle cx="0" cy="0" r="4" fill="#ff6f95"/></g>`;
    case 'bowtie':
      return `<g transform="translate(50,90)"><polygon points="0,0 -10,-6 -10,6" fill="#8fb3ff"/>`
        + `<polygon points="0,0 10,-6 10,6" fill="#8fb3ff"/><circle cx="0" cy="0" r="3.5" fill="#6f95ff"/></g>`;
    case 'flower':
      return `<g transform="translate(72,15)"><circle cx="0" cy="-6" r="4" fill="#ffd86b"/>`
        + `<circle cx="6" cy="-2" r="4" fill="#ffd86b"/><circle cx="4" cy="5" r="4" fill="#ffd86b"/>`
        + `<circle cx="-4" cy="5" r="4" fill="#ffd86b"/><circle cx="-6" cy="-2" r="4" fill="#ffd86b"/>`
        + `<circle cx="0" cy="0" r="3.5" fill="#ff8fab"/></g>`;
    default:
      return '';
  }
}

// 얼굴 SVG 한 장. 흰 얼굴 베이스(r44) + 귀 + 표정 + 볼 + 코/입 + 액세서리.
function faceSvg(kind, body, face, acc) {
  const tears = face === 'cry'
    ? `<ellipse cx="29" cy="64" rx="3.6" ry="5.2" fill="#7ec8f0" opacity="0.9"/><ellipse cx="71" cy="64" rx="3.6" ry="5.2" fill="#7ec8f0" opacity="0.9"/>` : '';
  return `<svg class="face" viewBox="0 0 100 100" aria-hidden="true">`
    + ears(kind, body)
    + `<circle cx="50" cy="54" r="44" fill="#ffffff"/>`
    + eyesSvg(face)
    + `<circle cx="20" cy="65" r="7" fill="#ff9ec4" opacity="0.72"/><circle cx="80" cy="65" r="7" fill="#ff9ec4" opacity="0.72"/>`
    + noseSvg(kind)
    + mouthSvg(kind, face)
    + tears
    + accessorySvg(acc)
    + `</svg>`;
}

// 보드를 비우고 격자 배경 + 출구 길/집 표시 + 차 엘리먼트를 새로 만든다.
// 반환: id -> 차 엘리먼트 맵.
export function buildBoard(boardEl, cars) {
  boardEl.style.setProperty('--size', String(BOARD_SIZE));
  boardEl.innerHTML = '';

  // 출구 행 길 강조(보드 안 오른쪽) + 보드 밖 집(🏠).
  const lane = document.createElement('div');
  lane.className = 'exit-lane';
  lane.style.setProperty('--row', String(EXIT_ROW));
  boardEl.appendChild(lane);

  const exit = document.createElement('div');
  exit.className = 'exit';
  exit.style.setProperty('--row', String(EXIT_ROW));
  // 출구 게이트: 오른쪽 화살표 + 반짝이 별("이쪽으로 나가요"). SVG라 --cell 너비에 정확히 맞춘다.
  exit.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true">'
    + '<polygon points="14,40 52,40 52,24 90,50 52,76 52,60 14,60" fill="#ffc24d"/>'
    + '<polygon points="14,40 52,40 52,24 90,50 52,76 52,60 14,60" fill="none" stroke="#f0a92e" stroke-width="3" stroke-linejoin="round"/>'
    + '<path d="M30 14 l2.5 5 5.5 .8 -4 4 1 5.5 -5-2.6 -5 2.6 1-5.5 -4-4 5.5-.8z" fill="#ffe08a"/>'
    + '<path d="M78 78 l1.8 3.6 4 .6 -2.9 2.8 .7 4 -3.6-1.9 -3.6 1.9 .7-4 -2.9-2.8 4-.6z" fill="#ffe08a"/>'
    + '</svg>';
  boardEl.appendChild(exit);

  const els = new Map();
  for (const car of cars) {
    const kind = kindOf(car);
    const color = colorOf(car, kind);
    const el = document.createElement('div');
    el.className = `car ${car.orient}${car.id === TARGET_ID ? ' target' : ''}`;
    el.dataset.id = car.id;
    el.style.setProperty('--len', String(car.len));
    el.style.background = color;
    el.innerHTML = faceSvg(kind, color, faceOf(car), accOf(car));
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

// 주인공 토끼의 표정만 바꿔 다시 그린다(제한시간 경과 / 클리어에 따라 main이 호출).
export function updateTargetFace(els, face) {
  const t = els.get(TARGET_ID);
  if (t) t.innerHTML = faceSvg(TARGET_KIND, targetColor, face, 'none');
}

// 클리어 연출: 토끼를 출구 길로 미끄러뜨려 내보내고 별·하트 파티클을 터뜨린 뒤 onDone 호출.
// 다음 퍼즐 로드 시 buildBoard가 보드를 새로 그려 잔여를 정리한다.
export function playClear(els, boardEl, onDone) {
  const target = els.get(TARGET_ID);
  if (target) {
    target.classList.add('exiting');
    target.style.transition = `transform ${CLEAR_EXIT_MS}ms cubic-bezier(0.5, 0, 0.75, 1), opacity ${CLEAR_EXIT_MS}ms ease-in`;
    target.style.transform = 'translateX(175%)';
    target.style.opacity = '0';
  }
  spawnConfetti(boardEl);
  setTimeout(onDone, CLEAR_EXIT_MS);
}

const CONFETTI_MARKS = ['⭐', '💖', '✨', '🌟', '🎉'];

function spawnConfetti(boardEl) {
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    p.textContent = CONFETTI_MARKS[i % CONFETTI_MARKS.length];
    p.style.left = `${15 + Math.random() * 70}%`;
    p.style.top = `${38 + Math.random() * 16}%`;
    p.style.setProperty('--dx', `${(Math.random() * 2 - 1) * 170}px`);
    p.style.setProperty('--dy', `${-70 - Math.random() * 190}px`);
    p.style.setProperty('--rot', `${(Math.random() * 2 - 1) * 120}deg`);
    p.style.animationDelay = `${Math.floor(Math.random() * 140)}ms`;
    boardEl.appendChild(p);
    setTimeout(() => p.remove(), 1500);
  }
}
