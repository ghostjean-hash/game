// 진입점. 상태 관리 + UI 바인딩 + 모듈 조립(docs/03_architecture.md §3).

import {
  STORAGE_NS, TIME_BASE_S, TIME_PER_OPTIMAL_S, FACE_WORRIED_RATIO, FACE_CRY_RATIO,
  STAR2_MARGIN, GOLD_BASE, GOLD_STAR3, GOLD_STAR2, GOLD_TIME_BONUS, HINT_COST,
  COMBO_GOLD_STEP, COMBO_MAX, STAR_SOUND_GAP_MS,
} from './data/constants.js';
import { PUZZLES } from './data/puzzles.js';
import { BOARDGAME_PUZZLES } from './data/puzzles-boardgame.js';
import { parseGrid, moveCar, isSolved } from './core/board.js';
import { solve, solveStep } from './core/solver.js';
import { buildBoard, syncPositions, playClear, updateTargetFace, setTargetColor, setTargetAccessory, setBoardMood, showHint } from './render/render.js';
import { attachDrag } from './input/drag.js';
import { play, setMuted, isMuted, unlockAudio } from './audio/sound.js';
import {
  RABBIT_SKINS, DEFAULT_SKIN, BOARD_THEMES, DEFAULT_THEME, ACCESSORY_ITEMS, DEFAULT_ACCESSORY,
} from './data/shop.js';
import { PONY_STYLES, DEFAULT_STYLE } from './data/styles.js';
import { createStorage } from '../../../shared/storage.js';

const DIFF_LABEL = { beginner: '입문', easy: '쉬움', medium: '보통', hard: '어려움' };

// 게임 모드: 오리지널(자체 제작 세트) / 보드게임(ThinkFun Rush Hour). 진행·별은 모드별로 각각
// 저장하고, 골드·스킨·테마·장식·설정은 두 모드가 공유한다(사용자 결정 2026-07-02).
const MODES = [
  { id: 'original', name: '오리지널', puzzles: PUZZLES },
  { id: 'boardgame', name: '보드게임', puzzles: BOARDGAME_PUZZLES },
];
const DEFAULT_MODE = 'original';

const store = createStorage(STORAGE_NS);

const el = {
  page: document.querySelector('.rushhour'),
  board: document.getElementById('board'),
  stageMode: document.getElementById('stage-mode'),
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
  mapTabs: document.getElementById('map-tabs'),
  mapSummary: document.getElementById('map-summary'),
  mapGrid: document.getElementById('map-grid'),
  mapClose: document.getElementById('btn-map-close'),
  muteBtn: document.getElementById('btn-mute'),
  settingsBtn: document.getElementById('btn-settings'),
  settings: document.getElementById('settings'),
  settingList: document.getElementById('setting-list'),
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

// 모드별 진행(퍼즐 클리어/최고 수/별/현재 퍼즐/콤보). 골드·꾸미기와 달리 모드마다 따로 둔다.
function emptyModeProg() {
  return { cleared: [], best: {}, stars: {}, current: null, combo: 0, bestCombo: 0 };
}

// 저장 데이터를 현재 스키마(공유 필드 + modes{original,boardgame})로 정규화한다.
// 옛 단일 구조(최상위 cleared/best/stars + 별도 'current' 키)는 오리지널 모드로 이관한다(하위호환).
function migrateProgress(p) {
  const s = p || {};
  const base = {
    gold: s.gold || 0,
    ownedSkins: s.ownedSkins || [DEFAULT_SKIN], equippedSkin: s.equippedSkin || DEFAULT_SKIN,
    ownedThemes: s.ownedThemes || [DEFAULT_THEME], equippedTheme: s.equippedTheme || DEFAULT_THEME,
    ownedAccessories: s.ownedAccessories || [DEFAULT_ACCESSORY], equippedAccessory: s.equippedAccessory || DEFAULT_ACCESSORY,
    ponyStyle: s.ponyStyle || DEFAULT_STYLE, blockOpts: s.blockOpts, muted: !!s.muted,
    activeMode: s.activeMode || DEFAULT_MODE,
    modes: {},
  };
  if (s.modes) {
    base.modes.original = { ...emptyModeProg(), ...s.modes.original };
    base.modes.boardgame = { ...emptyModeProg(), ...s.modes.boardgame };
  } else {
    base.modes.original = {
      ...emptyModeProg(),
      cleared: s.cleared || [], best: s.best || {}, stars: s.stars || {},
      combo: s.combo || 0, bestCombo: s.bestCombo || 0,
      current: store.get('current', null),
    };
    base.modes.boardgame = emptyModeProg();
  }
  if (!MODES.some((m) => m.id === base.activeMode)) base.activeMode = DEFAULT_MODE;
  return base;
}

function progress() {
  return migrateProgress(store.get('progress', null));
}

// 모드 정의/퍼즐/진행 헬퍼. 인자 없으면 현재 활성 모드 기준.
function modeDef(id) { return MODES.find((m) => m.id === id) || MODES[0]; }
function modePuzzles(id) { return modeDef(id || progress().activeMode).puzzles; }
function modeProg(pr) { const p = pr || progress(); return p.modes[p.activeMode] || p.modes.original; }

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

// 설정에서 고른 블록 캐릭터 스타일. 삭제된 스타일이 저장돼 있으면 기본으로 되돌린다.
function currentStyle() {
  const s = progress().ponyStyle || DEFAULT_STYLE;
  return PONY_STYLES.some((x) => x.id === s) ? s : DEFAULT_STYLE;
}

// 스타일/주인공별 배경·테두리 표시 옵션(기본값 + 저장값 병합).
function currentBlockOpts() {
  const d = {
    a: { bg: true, border: true },
    c: { bg: true, border: true },
    target: { bg: false, border: true },
  };
  const o = progress().blockOpts || {};
  return {
    a: { ...d.a, ...o.a },
    c: { ...d.c, ...o.c },
    target: { ...d.target, ...o.target },
  };
}

function puzzleById(id) {
  return modePuzzles().find((p) => p.id === id);
}

function loadPuzzle(id) {
  stopTimer();
  const list = modePuzzles();
  const p = list.find((x) => x.id === id) || list[0];
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
  // 마지막으로 보던 퍼즐을 현재 모드 진행에 저장(모드별).
  const pr = progress();
  pr.modes[pr.activeMode].current = p.id;
  store.set('progress', pr);
  hideOverlay();
  render();
  startTimer();
}

function render() {
  const list = modePuzzles();
  el.stageMode.textContent = modeDef(progress().activeMode).name;
  el.stageNum.textContent = String(state.puzzleId);
  el.moves.textContent = String(state.moves);
  el.gold.textContent = String(progress().gold || 0);
  updateTimeUi();
  el.undo.disabled = state.history.length === 0 || state.solved;
  el.hint.disabled = state.solved;
  el.prev.disabled = state.puzzleId <= list[0].id;
  el.next.disabled = state.puzzleId >= list[list.length - 1].id;
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
    setBoardMood(face === 'cry' ? 'sad' : null); // 시간 임박하면 블록 전체가 울상·찡그림
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
  setBoardMood('happy'); // 주인공이 빠져나가면 남은 블록들도 전부 신난 표정

  const pr = progress();
  const mp = pr.modes[pr.activeMode]; // 진행·별·콤보는 현재 모드에 저장
  if (!mp.cleared.includes(state.puzzleId)) mp.cleared.push(state.puzzleId);
  const prevBest = mp.best[state.puzzleId];
  if (prevBest == null || state.moves < prevBest) mp.best[state.puzzleId] = state.moves;

  const stars = starsFor(state.moves, state.optimal);
  mp.stars[state.puzzleId] = Math.max(mp.stars[state.puzzleId] || 0, stars);

  const inTime = state.elapsed <= state.limit;

  // 연속 콤보: 시간 내 클리어면 +1, 초과 클리어면 끊겨 0. 2연속부터 보너스 골드.
  const combo = inTime ? (mp.combo || 0) + 1 : 0;
  mp.combo = combo;
  mp.bestCombo = Math.max(mp.bestCombo || 0, combo);
  const comboBonus = combo >= 2 ? Math.min(combo, COMBO_MAX) * COMBO_GOLD_STEP : 0;

  const gold = GOLD_BASE
    + (stars === 3 ? GOLD_STAR3 : stars === 2 ? GOLD_STAR2 : 0)
    + (inTime ? GOLD_TIME_BONUS : 0)
    + comboBonus;
  pr.gold = (pr.gold || 0) + gold; // 골드는 두 모드 공유
  store.set('progress', pr);

  const list = modePuzzles();
  const idx = list.findIndex((p) => p.id === state.puzzleId);
  const isLast = idx >= list.length - 1;
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
    // 결과 팝업에서 얻은 별 개수만큼 반짝 효과음을 계단식으로 낸다.
    for (let i = 0; i < stars; i += 1) setTimeout(() => play('star'), i * STAR_SOUND_GAP_MS);
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
  el.muteBtn.classList.toggle('muted', isMuted()); // SVG 스피커 on/off 아이콘 전환(CSS)
  el.muteBtn.setAttribute('aria-label', isMuted() ? '소리 켜기' : '소리 끄기');
}

function go(delta) {
  const list = modePuzzles();
  const idx = list.findIndex((p) => p.id === state.puzzleId);
  const next = list[idx + delta];
  if (next) loadPuzzle(next.id);
}

function hideOverlay() {
  el.overlay.hidden = true;
}

// --- 게임 모드(오리지널 / 보드게임): 진행 맵 안의 탭으로 고른다 ---
// 상단에서 바로 전환하지 않는다. 맵을 열면 현재 모드 탭이 선택돼 있고, 탭으로 다른 모드의
// 진행을 미리 볼 수 있다. 실제 전환은 그 모드의 퍼즐을 고를 때 확정된다(mapViewMode → activeMode).
let mapViewMode = null; // 맵에서 보고 있는 모드(아직 확정 전, activeMode와 다를 수 있음)

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

// 맵 열기: 현재 활성 모드를 보기 모드로 잡고 렌더.
function openMap() {
  mapViewMode = progress().activeMode;
  renderMap();
  el.map.hidden = false;
}

function renderMap() {
  const pr = progress();
  const vm = mapViewMode || pr.activeMode; // 보고 있는 모드(탭으로 바뀜)
  const mp = pr.modes[vm];
  const list = modePuzzles(vm);
  const cleared = new Set(mp.cleared || []);
  const stars = mp.stars || {};
  const totalStars = Object.values(stars).reduce((a, b) => a + b, 0);

  // 모드 탭(오리지널/보드게임). 보고 있는 모드가 active 표시.
  el.mapTabs.innerHTML = MODES.map((m) =>
    `<button class="map-tab${m.id === vm ? ' active' : ''}" data-mode="${m.id}" type="button">${m.name}</button>`,
  ).join('');

  el.mapSummary.textContent = `클리어 ${cleared.size} / ${list.length} · 모은 별 ${totalStars} ⭐`;

  const groups = {};
  for (const p of list) (groups[p.difficulty] = groups[p.difficulty] || []).push(p);
  el.mapGrid.innerHTML = DIFF_ORDER.filter((d) => groups[d]).map((d) => {
    const chips = groups[d].map((p) => {
      const done = cleared.has(p.id);
      // 현재 플레이 중 퍼즐 강조는 보고 있는 모드가 활성 모드일 때만.
      const cur = vm === pr.activeMode && p.id === state.puzzleId;
      const starStr = done ? '⭐'.repeat(stars[p.id] || 0) : '·';
      return `<button class="map-chip${done ? ' done' : ''}${cur ? ' current' : ''}" data-id="${p.id}" type="button">`
        + `<span class="map-num">${p.id}</span>`
        + `<span class="map-stars">${starStr}</span></button>`;
    }).join('');
    return `<div class="map-section"><h3>${DIFF_LABEL[d]} (${groups[d].length})</h3>`
      + `<div class="map-chips">${chips}</div></div>`;
  }).join('');
}

// --- 설정(블록 캐릭터 + 배경 · 테두리 통합) ---

// 캐릭터마다 한 줄: [선택 칩(스타일만)] + [배경 토글] + [테두리 토글]. 주인공은 선택 없이 토글만.
function renderSettings() {
  const cur = currentStyle();
  const opts = currentBlockOpts();
  const rows = [
    ...PONY_STYLES.map((s) => ({ key: s.id, emoji: s.emoji, name: s.name, selectable: true })),
    { key: 'target', emoji: '🌟', name: '주인공', selectable: false },
  ];
  el.settingList.innerHTML = rows.map((r) => {
    const o = opts[r.key] || { bg: true, border: true };
    const sel = r.selectable && r.key === cur;
    const pick = r.selectable
      ? `<button class="set-pick${sel ? ' selected' : ''}" data-style="${r.key}" type="button">`
        + `<span class="set-emoji">${r.emoji}</span><span class="set-name">${r.name}</span>`
        + `<span class="set-state">${sel ? '사용 중' : '선택'}</span></button>`
      : `<span class="set-pick set-label">`
        + `<span class="set-emoji">${r.emoji}</span><span class="set-name">${r.name}</span></span>`;
    return `<div class="setting-row">${pick}`
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
  const list = modePuzzles();
  const idx = list.findIndex((p) => p.id === state.puzzleId);
  if (idx < list.length - 1) go(1);
  else loadPuzzle(list[0].id); // 마지막 퍼즐 완주 후 처음으로
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
el.mapBtn.addEventListener('click', openMap);
el.mapClose.addEventListener('click', () => closePanel(el.map));
// 모드 탭: 보고 있는 모드만 바꿔 미리 본다(아직 전환 확정 아님).
el.mapTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.map-tab');
  if (tab) { mapViewMode = tab.dataset.mode; renderMap(); }
});
el.mapGrid.addEventListener('click', (e) => {
  const chip = e.target.closest('.map-chip');
  if (!chip) return;
  // 퍼즐을 고르면 보고 있던 모드로 전환을 확정하고 그 퍼즐을 연다.
  const pr = progress();
  if (pr.activeMode !== mapViewMode) {
    pr.activeMode = mapViewMode;
    store.set('progress', pr);
  }
  closePanel(el.map);
  loadPuzzle(Number(chip.dataset.id));
});
el.settingsBtn.addEventListener('click', () => openPanel(el.settings, renderSettings));
el.settingsClose.addEventListener('click', () => closePanel(el.settings));
el.settingList.addEventListener('click', (e) => {
  const pick = e.target.closest('.set-pick');
  if (pick && pick.dataset.style) { setStyle(pick.dataset.style); return; }
  const tog = e.target.closest('.opt-toggle');
  if (tog) toggleBlockOpt(tog.dataset.key, tog.dataset.opt);
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
const startProg = modeProg();
loadPuzzle(startProg.current != null ? startProg.current : modePuzzles()[0].id);
