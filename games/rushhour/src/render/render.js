// 보드 / 차 DOM 렌더. 칸 좌표 → CSS 변수로 배치하고 위치 갱신만 담당한다.
// 차는 조랑말 PNG 이미지로 그린다(assets/ponies/). 블록 크기 → 파일명 매핑.
// 게임 로직은 core/에 있다(docs/03_architecture.md §2.2).

import { BOARD_SIZE, EXIT_ROW, TARGET_ID, CLEAR_EXIT_MS, CONFETTI_COUNT } from '../data/constants.js';
import { BLOCK_TINTS, TARGET_BORDER } from '../data/colors.js';

// 조랑말 이미지 폴더(index.html 기준 상대경로).
const PONY_BASE = 'assets/ponies/';

// 블록 배경 색조: 위치로 파스텔 하나를 고른다(리셋해도 같은 블록은 같은 색).
function tintOf(car) {
  const seed = Math.abs(car.row * 31 + car.col * 17 + car.len * 7);
  return BLOCK_TINTS[seed % BLOCK_TINTS.length];
}

// 같은 색 블록이 인접해도 경계가 보이도록, 배경보다 살짝 진한 같은 계열 색(안쪽 테두리용).
function darken(hex, f = 0.85) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// 블록 → 조랑말 이미지 파일. 주인공은 스타일 공용 target.png, 나머지는 스타일_방향+길이(a_h2 등).
function ponySrc(car, style) {
  if (car.id === TARGET_ID) return `${PONY_BASE}target.png`;
  return `${PONY_BASE}${style}_${car.orient}${car.len}.png`;
}

// 선택한 스타일에 이 블록 이미지가 없을 때(예: B 미완성 가로 블록) 쓸 A타입 폴백 경로.
function fallbackSrc(car) {
  return `${PONY_BASE}a_${car.orient}${car.len}.png`;
}

// 아래 셋은 SVG 시절 동적 표정·스킨 색·머리 장식을 그리던 함수다. PNG 단일 이미지로
// 전환하며 잠정 비활성화했다(main.js 호출부가 깨지지 않도록 시그니처만 유지).
// 표정/스킨/장식 복원 시 여기에 이미지 교체 로직을 다시 넣는다.
export function setTargetColor() {}
export function setTargetAccessory() {}
export function updateTargetFace() {}

// 보드를 비우고 격자 배경 + 출구 길/집 표시 + 차 엘리먼트를 새로 만든다.
// 반환: id -> 차 엘리먼트 맵.
// opts: 스타일/주인공별 배경·테두리 표시 여부 { a:{bg,border}, b:{...}, target:{...} }.
export function buildBoard(boardEl, cars, style = 'a', opts = {}) {
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
    const el = document.createElement('div');
    el.className = `car ${car.orient}${car.id === TARGET_ID ? ' target' : ''}`;
    el.dataset.id = car.id;
    el.style.setProperty('--len', String(car.len));
    // 배경·테두리 표시는 스타일/주인공별 옵션을 따른다(설정에서 켜고 끔).
    const isTarget = car.id === TARGET_ID;
    const o = opts[isTarget ? 'target' : style] || { bg: true, border: true };
    const tint = tintOf(car);
    el.style.background = o.bg ? tint : 'transparent';
    const borderColor = isTarget ? TARGET_BORDER : darken(tint);
    el.style.setProperty('--tint-border', o.border ? borderColor : 'transparent');
    const img = document.createElement('img');
    img.className = 'pony';
    img.src = ponySrc(car, style);
    img.alt = '';
    img.draggable = false; // 브라우저 기본 이미지 드래그(고스트) 차단
    // 이 스타일에 해당 블록 이미지가 없으면(로드 실패) A타입으로 1회 대체.
    if (car.id !== TARGET_ID) {
      img.addEventListener('error', function onErr() {
        img.removeEventListener('error', onErr);
        img.src = fallbackSrc(car);
      });
    }
    el.appendChild(img);
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

// 힌트: 최적 다음 한 수의 차를 잠깐 강조 + 목표 방향으로 살짝 움직여 보여준다.
// move = { id, pos }(가변 축 목표 좌표). 자동으로 옮기지는 않는다.
let hintTimer = null;
export function showHint(els, move) {
  if (!move) return;
  const el = els.get(move.id);
  if (!el) return;
  const isH = el.classList.contains('h');
  const cur = parseInt(el.style.getPropertyValue(isH ? '--col' : '--row'), 10) || 0;
  const dir = move.pos > cur ? 1 : -1;
  el.style.setProperty('--hint-dx', isH ? `${dir * 18}%` : '0%');
  el.style.setProperty('--hint-dy', isH ? '0%' : `${dir * 18}%`);
  el.classList.remove('hint');
  void el.offsetWidth; // reflow로 애니 재시작
  el.classList.add('hint');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => el.classList.remove('hint'), 1500);
}

// 클리어 연출: 주인공을 출구 길로 미끄러뜨려 내보내고 별·하트 파티클을 터뜨린 뒤 onDone 호출.
// 다음 퍼즐 로드 시 buildBoard가 보드를 새로 그려 잔여를 정리한다.
export function playClear(els, boardEl, onDone) {
  const target = els.get(TARGET_ID);
  if (target) {
    // 드래그로 밀어 클리어한 경우 드래그 잔여 transform이 남아 시작점이 어긋나면 오른쪽으로 튄다.
    // 잔여를 지우고 현재 칸 위치(transform 0)로 리셋한 뒤, 다음 프레임에 출구 밖으로 transform을
    // 걸어 점프 없이 보드 안에서 밖으로 부드럽게 미끄러져 나가게 한다.
    target.classList.remove('dragging');
    target.classList.add('exiting');
    target.style.transition = 'none';
    target.style.transform = 'translateX(0)';
    void target.offsetWidth; // reflow로 시작 상태(제자리)를 확정
    target.style.transition = `transform ${CLEAR_EXIT_MS}ms cubic-bezier(0.45, 0, 0.55, 1), opacity ${CLEAR_EXIT_MS}ms ease-in`;
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
