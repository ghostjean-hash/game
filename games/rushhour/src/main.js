// 진입점. 상태 관리 + UI 바인딩 + 모듈 조립(docs/03_architecture.md §3).

import {
  STORAGE_NS, TIME_BASE_S, TIME_PER_OPTIMAL_S, FACE_WORRIED_RATIO, FACE_CRY_RATIO,
  STAR2_MARGIN, GOLD_BASE, GOLD_STAR3, GOLD_STAR2, GOLD_TIME_BONUS, HINT_COST,
  COMBO_GOLD_STEP, COMBO_MAX,
} from './data/constants.js';
import { PUZZLES } from './data/puzzles.js';
import { parseGrid, moveCar, isSolved } from './core/board.js';
import { solve, solveStep } from './core/solver.js';
import { buildBoard, syncPositions, playClear, updateTargetFace, setTargetColor, setTargetAccessory, showHint } from './render/render.js';
import { attachDrag } from './input/drag.js';
import { play, setMuted, isMuted, unlockAudio } from './audio/sound.js';
import {
  RABBIT_SKINS, DEFAULT_SKIN, BOARD_THEMES, DEFAULT_THEME, ACCESSORY_ITEMS, DEFAULT_ACCESSORY,
} from './data/shop.js';
import { PONY_STYLES, DEFAULT_STYLE } from './data/styles.js';
import { createStorage } from '../../../shared/storage.js';

const DIFF_LABEL = { beginner: '입문', easy: '쉬움', medium: '보통', hard: '어려움' };

const store = createStorage(STORAGE_NS);

const el = {
  page: document.querySelector('.rushhour'),
  board: document.getElementById('board'),
  stageNum: document.getElementById('stage-num'),
  moves: document.getElementById('moves'),
  gold: document.getElementById('gold'),
  time: document.getElementById('time'),
  undo: document.getElementById('btn-undo'),
  reset: document.getElementById('btn-reset'),
  hint: document.getElementById('btn-hint'),
  prev: document.getElementById('btn-prev'),
  next: document.getElementById('btn-next'),
  overlay: document.getElementById('overlay'),
  resultTitle: document.getElementById('result-title'),
  result: document.getElementById('result-text'),
  resultStars: document.getElementById('result-stars'),
  resultCombo: document.getElementById('result-combo'),
  resultGold: document.getElementById('result-gold'),
  overlayNext: document.getElementById('btn-overlay-next'),
  shopBtn: document.getElementById('btn-shop'),
  shop: document.getElementById('shop'),
  shopGold: document.getElementById('shop-gold'),
  shopItems: document.getElementById('shop-items'),
  shopThemes: document.getElementById('shop-themes'),
  shopAccessories: document.getElementById('shop-accessories'),
  shopClose: document.getElementById('btn-shop-close'),
  mapBtn: document.getElementById('btn-map'),
  map: document.getElementById('map'),
  mapSummary: document.getElementById('map-summary'),
  mapGrid: document.getElementById('map-grid'),
  mapClose: document.getElementById('btn-map-close'),
  muteBtn: document.getElementById('btn-mute'),
  settingsBtn: document.getElementById('btn-settings'),
  settings: document.getElementById('settings'),
  styleGrid: document.getElementById('style-grid'),
  optGrid: document.getElementById('opt-grid'),
  settingsClose: document.getElementById('btn-settings-close'),
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
    ownedThemes: [DEFAULT_THEME], equippedTheme: DEFAULT_THEME,
    ownedAccessories: [DEFAULT_ACCESSORY], equippedAccessory: DEFAULT_ACCESSORY,
    combo: 0, bestCombo: 0, muted: false, ponyStyle: DEFAULT_STYLE,
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

// 장착한 토끼 액세서리(render에 넘길 acc 키).
function currentAccessory() {
  const eq = progress().equippedAccessory || DEFAULT_ACCESSORY;
  return ACCESSORY_ITEMS.find((a) => a.id === eq) || ACCESSORY_ITEMS[0];
}

// 설정에서 고른 블록 캐릭터 스타일(a/b).
function currentStyle() {
  return progress().ponyStyle || DEFAULT_STYLE;
}

// 스타일/주인공별 배경·테두리 표시 옵션(기본값 + 저장값 병합).
function currentBlockOpts() {
  const d = {
    a: { bg: true, border: true },
    b: { bg: true, border: true },
    target: { bg: false, border: true },
  };
  const o = progress().blockOpts || {};
  return {
    a: { ...d.a, ...o.a },
    b: { ...d.b, ...o.b },
    target: { ...d.target, ...o.target },
  };
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
  state.els = buildBoard(el.board, state.cars, currentStyle(), currentBlockOpts());
  store.set('current', p.id);
  hideOverlay();
  render();
  startTimer();
}

function render() {
  el.stageNum.textContent = String(state.puzzleId);
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

  // 연속 콤보: 시간 내 클리어면 +1, 초과 클리어면 끊겨 0. 2연속부터 보너스 골드.
  const combo = inTime ? (pr.combo || 0) + 1 : 0;
  pr.combo = combo;
  pr.bestCombo = Math.max(pr.bestCombo || 0, combo);
  const comboBonus = combo >= 2 ? Math.min(combo, COMBO_MAX) * COMBO_GOLD_STEP : 0;

  const gold = GOLD_BASE
    + (stars === 3 ? GOLD_STAR3 : stars === 2 ? GOLD_STAR2 : 0)
    + (inTime ? GOLD_TIME_BONUS : 0)
    + comboBonus;
  pr.gold = (pr.gold || 0) + gold;
  store.set('progress', pr);

  const idx = PUZZLES.findIndex((p) => p.id === state.puzzleId);
  const isLast = idx >= PUZZLES.length - 1;
  // 핵심만: 상태(제목) + 별 + 수/최소 + (콤보) + 획득 골드.
  el.resultTitle.textContent = isLast ? '완주! 🎉' : (state.moves <= state.optimal ? '완벽!' : '클리어!');
  el.resultStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  el.result.textContent = `${state.moves}수 · 최소 ${state.optimal}수`;
  if (combo >= 2) {
    el.resultCombo.textContent = `🔥 ${combo}연속`;
    el.resultCombo.hidden = false;
  } else {
    el.resultCombo.hidden = true;
  }
  el.resultGold.textContent = `+${gold} 🪙`;
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

// 거부 피드백: 노드에 shake 애니를 재시작한다(reflow로 강제). 골드 부족 등에 쓴다.
function shake(node) {
  if (!node) return;
  node.classList.remove('shake');
  void node.offsetWidth; // reflow로 애니 재시작
  node.classList.add('shake');
}

// 힌트: 골드를 써서 최적 다음 한 수를 강조한다. 자동으로 옮기지는 않는다.
function hint() {
  if (state.solved) return;
  const move = solveStep(state.cars);
  if (!move) return; // 이미 풀렸거나 풀 수 없음
  const pr = progress();
  if ((pr.gold || 0) < HINT_COST) {
    shake(el.gold.closest('.stat'));
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

// 종류별 메타: 품목 배열 + progress 보유/장착 키 + 기본 id + 미리보기 swatch HTML.
const SHOP_KINDS = {
  skin: {
    list: RABBIT_SKINS, ownedKey: 'ownedSkins', eqKey: 'equippedSkin', def: DEFAULT_SKIN,
    swatchHtml: (item) => `<span class="shop-swatch" style="background:${item.color}"></span>`,
  },
  theme: {
    list: BOARD_THEMES, ownedKey: 'ownedThemes', eqKey: 'equippedTheme', def: DEFAULT_THEME,
    swatchHtml: (item) => `<span class="shop-swatch" style="background:${item.board};border:2px solid ${item.exit}"></span>`,
  },
  accessory: {
    list: ACCESSORY_ITEMS, ownedKey: 'ownedAccessories', eqKey: 'equippedAccessory', def: DEFAULT_ACCESSORY,
    swatchHtml: (item) => `<span class="shop-swatch shop-acc">${item.emoji}</span>`,
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
      + cfg.swatchHtml(item)
      + `<span class="shop-name">${item.name}</span>`
      + `<span class="shop-state">${tag}</span></button>`;
  }).join('');
}

function renderShop() {
  el.shopGold.textContent = String(progress().gold || 0);
  el.shopItems.innerHTML = chipsHtml('skin');
  el.shopThemes.innerHTML = chipsHtml('theme');
  el.shopAccessories.innerHTML = chipsHtml('accessory');
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
      shake(el.shopGold.parentElement);
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
  } else if (kind === 'theme') {
    applyTheme(item); // 보드 색 즉시 반영
  } else {
    setTargetAccessory(item.acc);
    updateTargetFace(state.els, state.face); // 토끼 머리 장식 즉시 반영
  }
  renderShop();
  render();
  play('buy');
}

// 패널(상점/맵) 열고 닫기. 열 때 해당 렌더를 먼저 돌린다.
function openPanel(panel, renderFn) {
  renderFn();
  panel.hidden = false;
}
function closePanel(panel) {
  panel.hidden = true;
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

// --- 설정(블록 캐릭터 스타일) ---

const OPT_ROWS = [{ key: 'a', name: '조랑말' }, { key: 'b', name: '모찌' }, { key: 'target', name: '주인공' }];

function renderSettings() {
  const cur = currentStyle();
  el.styleGrid.innerHTML = PONY_STYLES.map((s) =>
    `<button class="style-item${s.id === cur ? ' selected' : ''}" data-style="${s.id}" type="button">`
    + `<span class="style-emoji">${s.emoji}</span>`
    + `<span class="style-name">${s.name}</span>`
    + `<span class="style-state">${s.id === cur ? '사용 중' : '선택'}</span></button>`,
  ).join('');
  const opts = currentBlockOpts();
  el.optGrid.innerHTML = OPT_ROWS.map((r) => {
    const o = opts[r.key];
    return `<div class="opt-row"><span class="opt-name">${r.name}</span>`
      + `<button class="opt-toggle${o.bg ? ' on' : ''}" data-key="${r.key}" data-opt="bg" type="button">배경</button>`
      + `<button class="opt-toggle${o.border ? ' on' : ''}" data-key="${r.key}" data-opt="border" type="button">테두리</button></div>`;
  }).join('');
}

// 진행 중 퍼즐 상태는 유지하고 블록만 현재 스타일/옵션으로 다시 그린다.
function redrawBlocks() {
  state.els = buildBoard(el.board, state.cars, currentStyle(), currentBlockOpts());
}

// 스타일 전환.
function setStyle(id) {
  if (!PONY_STYLES.some((s) => s.id === id)) return;
  const pr = progress();
  pr.ponyStyle = id;
  store.set('progress', pr);
  redrawBlocks();
  renderSettings();
  play('buy');
}

// 배경/테두리 표시 토글(스타일 또는 주인공별).
function toggleBlockOpt(key, opt) {
  const opts = currentBlockOpts();
  opts[key][opt] = !opts[key][opt];
  const pr = progress();
  pr.blockOpts = opts;
  store.set('progress', pr);
  redrawBlocks();
  renderSettings();
  play('buy');
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
el.shopBtn.addEventListener('click', () => openPanel(el.shop, renderShop));
el.shopClose.addEventListener('click', () => closePanel(el.shop));
function onShopClick(e) {
  const btn = e.target.closest('.shop-item');
  if (btn) buyOrEquip(btn.dataset.kind, btn.dataset.id);
}
el.shopItems.addEventListener('click', onShopClick);
el.shopThemes.addEventListener('click', onShopClick);
el.shopAccessories.addEventListener('click', onShopClick);
el.muteBtn.addEventListener('click', toggleMute);
el.mapBtn.addEventListener('click', () => openPanel(el.map, renderMap));
el.mapClose.addEventListener('click', () => closePanel(el.map));
el.mapGrid.addEventListener('click', (e) => {
  const chip = e.target.closest('.map-chip');
  if (chip) {
    closePanel(el.map);
    loadPuzzle(Number(chip.dataset.id));
  }
});
el.settingsBtn.addEventListener('click', () => openPanel(el.settings, renderSettings));
el.settingsClose.addEventListener('click', () => closePanel(el.settings));
el.styleGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.style-item');
  if (btn) setStyle(btn.dataset.style);
});
el.optGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.opt-toggle');
  if (btn) toggleBlockOpt(btn.dataset.key, btn.dataset.opt);
});

// iOS 오디오 잠금 해제: 첫 사용자 제스처 한 번에 AudioContext를 깨운다(둘 다 once라 각 1회).
window.addEventListener('pointerdown', unlockAudio, { once: true });
window.addEventListener('touchend', unlockAudio, { once: true });

el.hint.textContent = `💡 힌트 (${HINT_COST}🪙)`;
setMuted(progress().muted);
updateMuteBtn();
setTargetColor(currentSkinColor());
setTargetAccessory(currentAccessory().acc);
applyTheme(currentTheme());
loadPuzzle(store.get('current', PUZZLES[0].id));
