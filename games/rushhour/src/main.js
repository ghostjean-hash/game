// 진입점. 상태 관리 + UI 바인딩 + 모듈 조립(docs/03_architecture.md §3).

import {
  STORAGE_NS, TIME_BASE_S, TIME_PER_OPTIMAL_S, FACE_WORRIED_RATIO, FACE_CRY_RATIO,
  STAR2_MARGIN, GOLD_BASE, GOLD_STAR3, GOLD_STAR2, GOLD_TIME_BONUS, HINT_COST,
} from './data/constants.js';
import { PUZZLES } from './data/puzzles.js';
import { parseGrid, moveCar, isSolved } from './core/board.js';
import { solve, solveStep } from './core/solver.js';
import { buildBoard, syncPositions, playClear, updateTargetFace, setTargetColor, showHint } from './render/render.js';
import { attachDrag } from './input/drag.js';
import { play, setMuted, isMuted } from './audio/sound.js';
import { RABBIT_SKINS, DEFAULT_SKIN, BOARD_THEMES, DEFAULT_THEME } from './data/shop.js';
import { createStorage } from '../../../shared/storage.js';

const DIFF_LABEL = { beginner: '입문', easy: '쉬움', medium: '보통', hard: '어려움' };

const store = createStorage(STORAGE_NS);

const el = {
  page: document.querySelector('.rushhour'),
  board: document.getElementById('board'),
  label: document.getElementById('puzzle-label'),
  moves: document.getElementById('moves'),
  gold: document.getElementById('gold'),
  time: document.getElementById('time'),
  undo: document.getElementById('btn-undo'),
  reset: document.getElementById('btn-reset'),
  hint: document.getElementById('btn-hint'),
  prev: document.getElementById('btn-prev'),
  next: document.getElementById('btn-next'),
  overlay: document.getElementById('overlay'),
  result: document.getElementById('result-text'),
  resultStars: document.getElementById('result-stars'),
  resultGold: document.getElementById('result-gold'),
  overlayNext: document.getElementById('btn-overlay-next'),
  shopBtn: document.getElementById('btn-shop'),
  shop: document.getElementById('shop'),
  shopGold: document.getElementById('shop-gold'),
  shopItems: document.getElementById('shop-items'),
  shopThemes: document.getElementById('shop-themes'),
  shopClose: document.getElementById('btn-shop-close'),
  mapBtn: document.getElementById('btn-map'),
  map: document.getElementById('map'),
  mapSummary: document.getElementById('map-summary'),
  mapGrid: document.getElementById('map-grid'),
  mapClose: document.getElementById('btn-map-close'),
  muteBtn: document.getElementById('btn-mute'),
};

const state = {
  puzzleId: null,
  cars: [],
  els: null,
  moves: 0,
  history: [],
  optimal: null,
  solved: false,
  limit: 0,      // 제한시간(초)
  elapsed: 0,    // 경과(초)
  face: 'neutral',
  timer: null,
};

function progress() {
  return store.get('progress', {
    cleared: [], best: {}, gold: 0, stars: {},
    ownedSkins: [DEFAULT_SKIN], equippedSkin: DEFAULT_SKIN,
    ownedThemes: [DEFAULT_THEME], equippedTheme: DEFAULT_THEME, muted: false,
  });
}

// 장착한 토끼 스킨 색.
function currentSkinColor() {
  const eq = progress().equippedSkin || DEFAULT_SKIN;
  const s = RABBIT_SKINS.find((x) => x.id === eq) || RABBIT_SKINS[0];
  return s.color;
}

// 장착한 보드 테마.
function currentTheme() {
  const eq = progress().equippedTheme || DEFAULT_THEME;
  return BOARD_THEMES.find((t) => t.id === eq) || BOARD_THEMES[0];
}

// 보드 테마 색을 .rushhour의 --rh-* 변수에 인라인으로 덮어써 즉시 반영한다.
function applyTheme(t) {
  el.page.style.setProperty('--rh-board', t.board);
  el.page.style.setProperty('--rh-line', t.line);
  el.page.style.setProperty('--rh-exit', t.exit);
}

function puzzleById(id) {
  return PUZZLES.find((p) => p.id === id);
}

function loadPuzzle(id) {
  stopTimer();
  const p = puzzleById(id) || PUZZLES[0];
  state.puzzleId = p.id;
  state.cars = parseGrid(p.grid);
  state.moves = 0;
  state.history = [];
  state.optimal = solve(state.cars);
  state.limit = state.optimal * TIME_PER_OPTIMAL_S + TIME_BASE_S;
  state.elapsed = 0;
  state.face = 'neutral';
  state.solved = false;
  setTargetColor(currentSkinColor());
  state.els = buildBoard(el.board, state.cars);
  store.set('current', p.id);
  hideOverlay();
  render();
  startTimer();
}

function render() {
  const p = puzzleById(state.puzzleId);
  el.label.textContent = `#${state.puzzleId} ${DIFF_LABEL[p.difficulty]}`;
  el.moves.textContent = String(state.moves);
  el.gold.textContent = String(progress().gold || 0);
  updateTimeUi();
  el.undo.disabled = state.history.length === 0 || state.solved;
  el.hint.disabled = state.solved;
  el.prev.disabled = state.puzzleId <= PUZZLES[0].id;
  el.next.disabled = state.puzzleId >= PUZZLES[PUZZLES.length - 1].id;
}

// --- 제한시간 + 토끼 표정 ---

function fmtTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function updateTimeUi() {
  const remain = Math.max(0, state.limit - state.elapsed);
  el.time.textContent = fmtTime(remain);
  el.time.classList.toggle('low', !state.solved && remain <= 10);
}

// 경과/제한 비율로 토끼 표정 갱신(무표정 → 어두움 → 울상). 클리어 후엔 건드리지 않는다.
function applyFace() {
  if (state.solved) return;
  const ratio = state.limit > 0 ? state.elapsed / state.limit : 0;
  let face = 'neutral';
  if (ratio >= FACE_CRY_RATIO) face = 'cry';
  else if (ratio >= FACE_WORRIED_RATIO) face = 'worried';
  if (face !== state.face) {
    state.face = face;
    updateTargetFace(state.els, face);
  }
}

function tick() {
  state.elapsed += 1;
  updateTimeUi();
  applyFace();
}

function startTimer() {
  stopTimer();
  state.timer = setInterval(tick, 1000);
}

function stopTimer() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

// --- 진행 ---

function onCommit(id, pos) {
  if (state.solved) return;
  state.history.push(state.cars);
  state.cars = moveCar(state.cars, id, pos);
  state.moves += 1;
  syncPositions(state.els, state.cars);
  render();
  if (isSolved(state.cars)) onSolved();
  else play('move');
}

function starsFor(moves, optimal) {
  if (moves <= optimal) return 3;
  if (moves <= optimal + STAR2_MARGIN) return 2;
  return 1;
}

function onSolved() {
  state.solved = true;
  stopTimer();
  play('clear');
  state.face = 'happy';
  updateTargetFace(state.els, 'happy');

  const pr = progress();
  if (!pr.cleared.includes(state.puzzleId)) pr.cleared.push(state.puzzleId);
  const prevBest = pr.best[state.puzzleId];
  if (prevBest == null || state.moves < prevBest) pr.best[state.puzzleId] = state.moves;

  const stars = starsFor(state.moves, state.optimal);
  pr.stars = pr.stars || {};
  pr.stars[state.puzzleId] = Math.max(pr.stars[state.puzzleId] || 0, stars);

  const inTime = state.elapsed <= state.limit;
  const gold = GOLD_BASE
    + (stars === 3 ? GOLD_STAR3 : stars === 2 ? GOLD_STAR2 : 0)
    + (inTime ? GOLD_TIME_BONUS : 0);
  pr.gold = (pr.gold || 0) + gold;
  store.set('progress', pr);

  const best = pr.best[state.puzzleId];
  const idx = PUZZLES.findIndex((p) => p.id === state.puzzleId);
  const isLast = idx >= PUZZLES.length - 1;
  el.resultStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  const body = state.moves <= state.optimal
    ? `완벽! ${state.moves}수 (최소 ${state.optimal}수)`
    : `클리어! ${state.moves}수 · 최소 ${state.optimal}수 · 최고 ${best}수`;
  el.result.textContent = isLast ? `모든 퍼즐 완주! 🎉 ${body}` : body;
  el.resultGold.textContent = `+${gold} 골드 획득${inTime ? ' (시간 보너스 +' + GOLD_TIME_BONUS + ')' : ''} · 모은 골드 ${pr.gold}`;
  el.overlayNext.textContent = isLast ? '처음부터 다시' : '다음 퍼즐';
  render();
  // 토끼가 출구 길로 빠져나가는 연출 + 축하 파티클 후 결과 오버레이.
  playClear(state.els, el.board, () => {
    el.overlay.hidden = false;
  });
}

function undo() {
  if (state.history.length === 0 || state.solved) return;
  state.cars = state.history.pop();
  state.moves = Math.max(0, state.moves - 1);
  syncPositions(state.els, state.cars);
  render();
}

function reset() {
  loadPuzzle(state.puzzleId);
}

// 골드 부족 등 거부 피드백: 상단 골드 표시 흔들림.
function shakeGold() {
  const stat = el.gold.closest('.stat');
  if (!stat) return;
  stat.classList.remove('shake');
  void stat.offsetWidth; // reflow로 애니 재시작
  stat.classList.add('shake');
}

// 힌트: 골드를 써서 최적 다음 한 수를 강조한다. 자동으로 옮기지는 않는다.
function hint() {
  if (state.solved) return;
  const move = solveStep(state.cars);
  if (!move) return; // 이미 풀렸거나 풀 수 없음
  const pr = progress();
  if ((pr.gold || 0) < HINT_COST) {
    shakeGold();
    play('deny');
    return;
  }
  pr.gold -= HINT_COST;
  store.set('progress', pr);
  render();
  showHint(state.els, move);
  play('hint');
}

// 음소거 토글(🔊/🔇). 설정은 progress.muted에 저장한다.
function toggleMute() {
  const pr = progress();
  const next = !isMuted();
  pr.muted = next;
  store.set('progress', pr);
  setMuted(next);
  updateMuteBtn();
  if (!next) play('move'); // 켤 때 들리는지 확인음
}

function updateMuteBtn() {
  el.muteBtn.textContent = isMuted() ? '🔇' : '🔊';
  el.muteBtn.setAttribute('aria-label', isMuted() ? '소리 켜기' : '소리 끄기');
}

function go(delta) {
  const idx = PUZZLES.findIndex((p) => p.id === state.puzzleId);
  const next = PUZZLES[idx + delta];
  if (next) loadPuzzle(next.id);
}

function hideOverlay() {
  el.overlay.hidden = true;
}

// --- 상점(토끼 색 스킨 + 보드 테마) ---

// 종류별 메타: 품목 배열 + progress 보유/장착 키 + 기본 id + 미리보기 swatch 스타일.
const SHOP_KINDS = {
  skin: {
    list: RABBIT_SKINS, ownedKey: 'ownedSkins', eqKey: 'equippedSkin', def: DEFAULT_SKIN,
    swatch: (item) => `background:${item.color}`,
  },
  theme: {
    list: BOARD_THEMES, ownedKey: 'ownedThemes', eqKey: 'equippedTheme', def: DEFAULT_THEME,
    swatch: (item) => `background:${item.board};border:2px solid ${item.exit}`,
  },
};

function chipsHtml(kind) {
  const cfg = SHOP_KINDS[kind];
  const pr = progress();
  const owned = pr[cfg.ownedKey] || [cfg.def];
  const eq = pr[cfg.eqKey] || cfg.def;
  return cfg.list.map((item) => {
    const isOwned = item.price === 0 || owned.includes(item.id);
    const isEq = eq === item.id;
    const tag = isEq ? '장착 중' : isOwned ? '장착하기' : `${item.price} 🪙`;
    return `<button class="shop-item${isEq ? ' equipped' : ''}" data-kind="${kind}" data-id="${item.id}" type="button">`
      + `<span class="shop-swatch" style="${cfg.swatch(item)}"></span>`
      + `<span class="shop-name">${item.name}</span>`
      + `<span class="shop-state">${tag}</span></button>`;
  }).join('');
}

function renderShop() {
  el.shopGold.textContent = String(progress().gold || 0);
  el.shopItems.innerHTML = chipsHtml('skin');
  el.shopThemes.innerHTML = chipsHtml('theme');
}

// 상점 골드 표시 흔들기(부족 피드백).
function shakeShopGold() {
  const line = el.shopGold.parentElement;
  line.classList.remove('shake');
  void line.offsetWidth; // reflow로 애니 재시작
  line.classList.add('shake');
}

function buyOrEquip(kind, id) {
  const cfg = SHOP_KINDS[kind];
  if (!cfg) return;
  const item = cfg.list.find((x) => x.id === id);
  if (!item) return;
  const pr = progress();
  const owned = pr[cfg.ownedKey] || [cfg.def];
  if (item.price > 0 && !owned.includes(id)) {
    if ((pr.gold || 0) < item.price) {
      shakeShopGold();
      play('deny');
      return;
    }
    pr.gold -= item.price;
    owned.push(id);
    pr[cfg.ownedKey] = owned;
  }
  pr[cfg.eqKey] = id;
  store.set('progress', pr);
  if (kind === 'skin') {
    setTargetColor(item.color);
    updateTargetFace(state.els, state.face); // 토끼 즉시 색 반영
  } else {
    applyTheme(item); // 보드 색 즉시 반영
  }
  renderShop();
  render();
  play('buy');
}

function openShop() {
  renderShop();
  el.shop.hidden = false;
}
function closeShop() {
  el.shop.hidden = true;
}

// --- 진행 맵(난이도별 별 현황) ---

const DIFF_ORDER = ['beginner', 'easy', 'medium', 'hard'];

function renderMap() {
  const pr = progress();
  const cleared = new Set(pr.cleared || []);
  const stars = pr.stars || {};
  const totalStars = Object.values(stars).reduce((a, b) => a + b, 0);
  el.mapSummary.textContent = `클리어 ${cleared.size} / ${PUZZLES.length} · 모은 별 ${totalStars} ⭐`;

  const groups = {};
  for (const p of PUZZLES) (groups[p.difficulty] = groups[p.difficulty] || []).push(p);
  el.mapGrid.innerHTML = DIFF_ORDER.filter((d) => groups[d]).map((d) => {
    const chips = groups[d].map((p) => {
      const done = cleared.has(p.id);
      const cur = p.id === state.puzzleId;
      const starStr = done ? '⭐'.repeat(stars[p.id] || 0) : '·';
      return `<button class="map-chip${done ? ' done' : ''}${cur ? ' current' : ''}" data-id="${p.id}" type="button">`
        + `<span class="map-num">${p.id}</span>`
        + `<span class="map-stars">${starStr}</span></button>`;
    }).join('');
    return `<div class="map-section"><h3>${DIFF_LABEL[d]} (${groups[d].length})</h3>`
      + `<div class="map-chips">${chips}</div></div>`;
  }).join('');
}

function openMap() {
  renderMap();
  el.map.hidden = false;
}
function closeMap() {
  el.map.hidden = true;
}

// 드래그는 보드에 한 번만 붙인다. 현재 상태는 getCars로 읽는다.
attachDrag(el.board, {
  getCars: () => state.cars,
  onCommit,
  isLocked: () => state.solved,
});

el.undo.addEventListener('click', undo);
el.reset.addEventListener('click', reset);
el.hint.addEventListener('click', hint);
el.prev.addEventListener('click', () => go(-1));
el.next.addEventListener('click', () => go(1));
el.overlayNext.addEventListener('click', () => {
  const idx = PUZZLES.findIndex((p) => p.id === state.puzzleId);
  if (idx < PUZZLES.length - 1) go(1);
  else loadPuzzle(PUZZLES[0].id); // 마지막 퍼즐 완주 후 처음으로
});
el.shopBtn.addEventListener('click', openShop);
el.shopClose.addEventListener('click', closeShop);
function onShopClick(e) {
  const btn = e.target.closest('.shop-item');
  if (btn) buyOrEquip(btn.dataset.kind, btn.dataset.id);
}
el.shopItems.addEventListener('click', onShopClick);
el.shopThemes.addEventListener('click', onShopClick);
el.muteBtn.addEventListener('click', toggleMute);
el.mapBtn.addEventListener('click', openMap);
el.mapClose.addEventListener('click', closeMap);
el.mapGrid.addEventListener('click', (e) => {
  const chip = e.target.closest('.map-chip');
  if (chip) {
    closeMap();
    loadPuzzle(Number(chip.dataset.id));
  }
});

el.hint.textContent = `💡 힌트 (${HINT_COST}🪙)`;
setMuted(progress().muted);
updateMuteBtn();
setTargetColor(currentSkinColor());
applyTheme(currentTheme());
loadPuzzle(store.get('current', PUZZLES[0].id));
