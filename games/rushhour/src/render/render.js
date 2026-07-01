// 보드 / 차 DOM 렌더. 칸 좌표 → CSS 변수로 배치하고 위치 갱신만 담당한다.
// 차는 조랑말 PNG 이미지로 그린다(assets/ponies/). 블록 크기 → 파일명 매핑.
// 게임 로직은 core/에 있다(docs/03_architecture.md §2.2).

import { BOARD_SIZE, EXIT_ROW, TARGET_ID, CLEAR_EXIT_MS, CONFETTI_COUNT } from '../data/constants.js';
import { BLOCK_TINTS, TARGET_BORDER, TARGET_COLOR } from '../data/colors.js';
import { PONY_STYLES } from '../data/styles.js';
import { ACCESSORY_ITEMS } from '../data/shop.js';

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

// 스타일 정의(styles.js). 없으면 통 블록 기본으로 본다.
function styleDef(style) {
  return PONY_STYLES.find((s) => s.id === style) || {};
}

// 위치 기반 결정적 해시(리셋해도 같은 블록은 같은 종류·시작 위상을 얻는다).
function hashAt(car, i, salt) {
  return Math.abs(car.row * 31 + car.col * 17 + car.len * 7 + i * 13 + salt * 5);
}

// 블록 el에 단일 이미지(통 블록)를 채운다. 주인공/통 스타일/조립 실패 폴백 공용.
function fillWhole(el, car, style) {
  const img = document.createElement('img');
  img.className = 'pony';
  img.alt = '';
  img.draggable = false;
  if (car.id !== TARGET_ID) {
    img.addEventListener('error', function onErr() {
      img.removeEventListener('error', onErr);
      img.src = fallbackSrc(car); // 이 스타일에 크기별 이미지도 없으면 A타입으로
    });
  }
  img.src = ponySrc(car, style);
  el.appendChild(img);
}

// 발밑 정렬용 시트 측정 캐시. 각 표정 칸의 발밑(최하단 불투명 픽셀) y를 셀 높이 대비 비율로 잰다.
let feetCache = null;
function measureFeet(def) {
  if (feetCache && feetCache.sheet === def.faceSheet) return Promise.resolve(feetCache);
  const scan = (suffix) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const N = img.naturalWidth;
        const cv = document.createElement('canvas');
        cv.width = N; cv.height = N;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, N, N).data;
        const g = def.faceGrid;
        const cs = N / g;
        const out = [];
        for (let gr = 0; gr < g; gr++) {
          for (let gc = 0; gc < g; gc++) {
            let bottom = -1;
            let minX = cs;
            let maxX = -1;
            for (let y = 0; y < cs; y++) {
              for (let x = 0; x < cs; x++) {
                if (data[((gr * cs + y) * N + (gc * cs + x)) * 4 + 3] > 30) {
                  if (y > bottom) bottom = y;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                }
              }
            }
            if (bottom < 0) { bottom = cs - 1; minX = 0; maxX = cs - 1; } // 빈 칸 안전값
            out.push({ b: bottom / cs, cx: ((minX + maxX) / 2) / cs }); // 발밑 y·좌우 중심 x 비율
          }
        }
        resolve(out);
      } catch (e) { resolve(null); } // canvas 접근 불가 등은 보정 생략(안전측)
    };
    img.onerror = () => resolve(null);
    img.src = `${PONY_BASE}${def.faceSheet}_${suffix}.png`;
  });
  return scan('a').then((a) => {
    if (!a) return null;
    const target = Math.max(...a.map((f) => f.b)); // 발밑 공통 기준 = 가장 낮은 발밑
    feetCache = { sheet: def.faceSheet, grid: def.faceGrid, a, target };
    return feetCache;
  });
}
// 발밑을 공통 기준(가장 낮은 발밑)에 맞추는 세로 보정(% of 프레임 높이).
function footPctY(idx) {
  if (!feetCache) return 0;
  const f = feetCache.a[idx];
  return f ? ((feetCache.target - f.b) / feetCache.grid) * 100 : 0;
}
// 좌우 폭 중심을 칸 중앙(0.5)에 맞추는 가로 보정(% of 프레임 너비).
function footPctX(idx) {
  if (!feetCache) return 0;
  const f = feetCache.a[idx];
  return f ? ((0.5 - f.cx) / feetCache.grid) * 100 : 0;
}

// 셀 화면에 표정 idx를 표시(그리드 칸 이동 + 발밑·좌우 보정). 깜빡임은 이것만 쓰고 기억은 안 바꾼다.
function applyFaceVisual(cell, idx, grid) {
  cell.style.setProperty('--tx', `${-((idx % grid) * 100) / grid}%`);
  cell.style.setProperty('--ty', `${-(Math.floor(idx / grid) * 100) / grid}%`);
  const f = cell.querySelector('.pony-frame');
  if (f) { f.style.setProperty('--fy', `${footPctY(idx)}%`); f.style.setProperty('--fx', `${footPctX(idx)}%`); }
}
// 셀의 표정을 idx로 설정 + 기억(dataset). 표정 변경·초기 배치용.
function setFace(cell, idx, grid) {
  cell.dataset.face = String(idx);
  applyFaceVisual(cell, idx, grid);
}
// 시트 측정이 끝난 뒤 이미 그려진 셀들의 발밑 보정을 다시 적용한다.
function refreshFeet(boardEl, grid) {
  boardEl.querySelectorAll('.pony-cell.face').forEach((cell) => {
    setFace(cell, parseInt(cell.dataset.face, 10) || 0, grid);
  });
}

// 표정 타이머(보드 전체에 하나). 블럭(차) 단위로 각자 독립 확률로 판정한다. 한 블럭의 셀은
// 같은 표정으로 함께 깜빡이거나 함께 바뀌고(블럭 내 통일), 표정을 바꿀 땐 다른 블럭이 현재
// 쓰는 표정을 피한다(블럭 간 겹침 방지). 여러 블럭이 동시에 깜빡이기도 한다. 몸은 정지.
let faceCycleTimer = null;
function startFaceCycle(boardEl, def) {
  if (faceCycleTimer) { clearInterval(faceCycleTimer); faceCycleTimer = null; }
  if (!def || !def.faceSheet || !(def.faceCount > 1)) return;
  const grid = def.faceGrid;
  const blink = def.blinkFace;              // 눈 감은 컷 인덱스(없으면 깜빡임 생략)
  const tick = def.faceCycleMs || 500;      // 판정 주기
  const blinkChance = def.blinkChance || 0.12; // 블럭이 한 tick에 깜빡일 확률
  const faceChance = def.faceChance || 0.04;   // 블럭이 한 tick에 표정 바꿀 확률
  const blocks = Array.from(boardEl.querySelectorAll('.car'))
    .map((carEl) => ({ el: carEl, cells: Array.from(carEl.querySelectorAll('.pony-cell.face')) }))
    .filter((b) => b.cells.length);
  if (!blocks.length) return;
  const baseFace = (block) => parseInt(block.cells[0].dataset.face, 10) || 0;
  const applyBlock = (block, idx) => block.cells.forEach((c) => setFace(c, idx, grid));      // 표정+기억
  const visualBlock = (block, idx) => block.cells.forEach((c) => applyFaceVisual(c, idx, grid)); // 화면만
  faceCycleTimer = setInterval(() => {
    const usedFaces = new Set(blocks.map(baseFace)); // 현재 블럭들이 쓰는 표정(겹침 회피용)
    for (const block of blocks) {
      if (block.el.dataset.blinking === '1') continue; // 깜빡 중인 블럭은 건너뜀
      const base = baseFace(block);
      const r = Math.random();
      if (blink != null && base !== blink && r < blinkChance) {
        // 눈 깜빡: 블럭 전체가 잠깐 눈감았다(기억 유지) 원래 표정으로 복귀
        block.el.dataset.blinking = '1';
        visualBlock(block, blink);
        setTimeout(() => {
          visualBlock(block, baseFace(block));
          block.el.dataset.blinking = '';
        }, 130);
      } else if (r > 1 - faceChance) {
        // 다른 블럭이 안 쓰는 표정으로 블럭 전체를 바꾼다(눈감은 컷 제외)
        let n = Math.floor(Math.random() * def.faceCount);
        let tries = 0;
        while ((usedFaces.has(n) || n === blink) && tries < def.faceCount) {
          n = (n + 1) % def.faceCount;
          tries += 1;
        }
        usedFaces.delete(base);
        usedFaces.add(n);
        applyBlock(block, n);
      }
    }
  }, tick);
}

// 블럭(차)마다 표정 하나를 유니크하게 배정한다(같은 블럭 통일 + 블럭 간 겹침 방지). 결정적.
// 블럭 수가 (표정 수 - 깜빡 컷)보다 많으면 부득이 겹칠 수 있다(안전측 순환).
function assignBlockFaces(cars, def) {
  const map = {};
  const used = new Set();
  const blink = def.blinkFace;
  for (const car of cars) {
    if (car.id === TARGET_ID) continue;
    let idx = hashAt(car, 0, 1) % def.faceCount;
    let tries = 0;
    while ((used.has(idx) || idx === blink) && tries < def.faceCount) {
      idx = (idx + 1) % def.faceCount;
      tries += 1;
    }
    used.add(idx);
    map[car.id] = idx;
  }
  return map;
}

// 조립 스타일의 표정 그리드 셀: 표정 시트(faceGrid×faceGrid 칸에 표정 여러 개)에서 배정된
// 표정 하나를 단일 이미지로 그린다. 몸은 정지, 표정만 타이머(startFaceCycle)로 변한다.
function appendFaceCell(el, car, i, def, onFail, faceIdx) {
  const cell = document.createElement('div');
  cell.className = 'pony-cell face';
  const grid = def.faceGrid;
  const idx = faceIdx != null ? faceIdx : hashAt(car, i, 1) % def.faceCount; // 블럭 배정 표정(통일)
  cell.style.setProperty('--fg', String(grid)); // 그리드 한 변(스트립 배율)
  cell.style.setProperty('--lift', `${def.footLiftPx || 0}px`); // 발을 바닥에서 살짝 띄움
  const img = document.createElement('img');
  img.className = 'pony-frame';
  img.alt = '';
  img.draggable = false;
  img.addEventListener('error', function onErr() {
    img.removeEventListener('error', onErr);
    onFail();
  });
  img.src = `${PONY_BASE}${def.faceSheet}_a.png`;
  cell.appendChild(img);
  setFace(cell, idx, grid); // 프레임을 붙인 뒤 표정 칸 이동 + 발밑·좌우 보정 적용
  el.appendChild(cell);
}

// 블록 el에 캐릭터 이미지를 채운다(방식은 스타일 tiled + 주인공 여부로 결정).
// - 주인공 / 통 스타일(tiled:false) / 표정 시트 없는 스타일: 단일 이미지(늘림).
// - 표정 그리드 스타일(tiled:true + faceSheet): 1칸 표정 셀을 길이만큼 반복.
//   시트 로드 실패 시 통 블록 이미지로 1회 폴백한다(→ 없으면 A타입).
function fillCar(el, car, style, faceIdx) {
  const def = styleDef(style);
  if (car.id === TARGET_ID || !def.tiled || !def.faceSheet) {
    fillWhole(el, car, style);
    return;
  }
  let switched = false;
  const useSingle = () => {
    if (switched) return; // 여러 셀이 동시에 실패해도 재구성은 한 번만
    switched = true;
    el.innerHTML = '';
    fillWhole(el, car, style); // 통 블록 이미지로 폴백(→ 없으면 A타입)
  };
  for (let i = 0; i < car.len; i++) appendFaceCell(el, car, i, def, useSingle, faceIdx); // 블럭 통일
}

// --- 주인공 토끼 색 스킨 / 머리 장식 / 표정 (상점·시간 연동) ---
// 주인공은 단일 PNG(target.png)라 색은 CSS filter(색조 회전)로, 장식은 이모지 오버레이로,
// 표정은 몸통 애니(+ 눈물 이모지)로 표현한다. 별도 색상별 이미지 자산 없이 동작한다.

// #rrggbb → HSL(h 0-360, s/l 0-100). 색 filter 계산용.
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

// 목표 스킨 색을 기본 핑크(TARGET_COLOR) 대비 filter 문자열로 바꾼다. 기본 색이면 변화 없음(항등).
function colorFilter(color) {
  const base = hexToHsl(TARGET_COLOR);
  const t = hexToHsl(color);
  const dh = Math.round(t.h - base.h);
  const sat = base.s ? (t.s / base.s).toFixed(2) : '1';
  const bri = base.l ? (t.l / base.l).toFixed(2) : '1';
  return `hue-rotate(${dh}deg) saturate(${sat}) brightness(${bri})`;
}

// acc 키(ribbon/flower/crown/bowtie/none) → 머리 장식 이모지. none/미지정은 빈 문자열(장식 없음).
function accEmoji(acc) {
  if (!acc || acc === 'none') return '';
  const item = ACCESSORY_ITEMS.find((a) => a.acc === acc);
  return item && item.acc !== 'none' ? item.emoji : '';
}

let targetColorFilter = ''; // 현재 장착 스킨의 filter(빈 문자열이면 기본 색)
let targetAccessory = 'none'; // 현재 장착 머리 장식 acc 키

function targetImg() {
  return document.querySelector('.car.target .pony');
}
function targetCarEl() {
  return document.querySelector('.car.target');
}

// 스킨 색 filter를 현재 주인공 이미지에 반영. 표정 애니(transform)와 속성이 달라 공존한다.
function applyTargetColor() {
  const img = targetImg();
  if (img) img.style.filter = targetColorFilter;
}

// 머리 장식 이모지 오버레이를 갱신(없으면 제거).
function applyTargetAccessory() {
  const car = targetCarEl();
  if (!car) return;
  let deco = car.querySelector('.pony-acc');
  const emoji = accEmoji(targetAccessory);
  if (!emoji) {
    if (deco) deco.remove();
    return;
  }
  if (!deco) {
    deco = document.createElement('span');
    deco.className = 'pony-acc';
    deco.setAttribute('aria-hidden', 'true');
    car.appendChild(deco);
  }
  deco.textContent = emoji;
}

// 상점에서 고른 토끼 색을 반영(color=null이면 기본). buildBoard가 주인공을 새로 그린 뒤에도 재호출된다.
export function setTargetColor(color) {
  targetColorFilter = color ? colorFilter(color) : '';
  applyTargetColor();
}

// 상점에서 고른 머리 장식(acc 키)을 반영.
export function setTargetAccessory(acc) {
  targetAccessory = acc || 'none';
  applyTargetAccessory();
}

// 남은 시간 비율에 따른 주인공 표정(neutral/worried/cry/happy)을 몸통 애니로 표현.
// happy(클리어)는 통통, worried는 갸웃, cry는 떨림 + 눈물 이모지. 색 filter와 독립.
const FACE_CLASSES = ['face-worried', 'face-cry', 'face-happy'];
export function updateTargetFace(els, face) {
  const car = (els && els.get && els.get(TARGET_ID)) || targetCarEl();
  if (!car) return;
  car.classList.remove(...FACE_CLASSES);
  if (face && face !== 'neutral') car.classList.add(`face-${face}`);
  let tear = car.querySelector('.pony-tear');
  if (face === 'cry') {
    if (!tear) {
      tear = document.createElement('span');
      tear.className = 'pony-tear';
      tear.textContent = '💧';
      tear.setAttribute('aria-hidden', 'true');
      car.appendChild(tear);
    }
  } else if (tear) {
    tear.remove();
  }
}

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

  const sdef = styleDef(style);
  // 표정 그리드 스타일이면 블럭마다 표정을 유니크 배정(같은 블럭 통일 + 블럭 간 겹침 방지).
  const faceMap = sdef.faceSheet ? assignBlockFaces(cars, sdef) : null;

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
    fillCar(el, car, style, faceMap ? faceMap[car.id] : undefined);
    place(el, car);
    boardEl.appendChild(el);
    els.set(car.id, el);
  }
  startFaceCycle(boardEl, sdef); // 표정 그리드 스타일이면 이따금 표정 교체
  if (sdef.faceSheet) measureFeet(sdef).then((c) => { if (c) refreshFeet(boardEl, c.grid); }); // 발밑 정렬
  applyTargetColor();      // 새로 그린 주인공에 현재 스킨 색 반영
  applyTargetAccessory();  // 새로 그린 주인공에 현재 머리 장식 반영
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
