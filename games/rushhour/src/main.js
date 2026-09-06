// 진입점. 상태 관리 + UI 바인딩 + 모듈 조립(docs/03_architecture.md §3).

import {
  STORAGE_NS, TIME_BASE_S, TIME_PER_OPTIMAL_S, FACE_WORRIED_RATIO, FACE_CRY_RATIO,
  STAR2_MARGIN, GOLD_BASE, GOLD_STAR3, GOLD_STAR2, GOLD_TIME_BONUS, HINT_COST, HINT_MAX_OPTIMAL,
  COMBO_GOLD_STEP, COMBO_MAX, STAR_SOUND_GAP_MS,
} from './data/constants.js';
import { PUZZLES } from './data/puzzles.js';
import { FOGLEMAN_PUZZLES } from './data/puzzles-fogleman.js';
import { parseGrid, moveCar, isSolved } from './core/board.js';
import { solve, solveStep } from './core/solver.js';
import { buildBoard, syncPositions, playClear, updateTargetFace, setTargetAccessory, setBoardMood, showHint } from './render/render.js';
import { attachDrag } from './input/drag.js';
import { SOUNDS } from './audio/sound.js';
import {
  BOARD_THEMES, DEFAULT_THEME, ACCESSORY_ITEMS, DEFAULT_ACCESSORY,
} from './data/shop.js';
import { PONY_STYLES, DEFAULT_STYLE } from './data/styles.js';
import { SAVE_SCHEMA, looksCurrent, migrateToPlatform } from './data/save-shape.js';

import { createGameFrame, createSave, SCREEN } from '../../../shared/frame/index.js';

const DIFF_LABEL = { beginner: '입문', easy: '쉬움', medium: '보통', hard: '어려움' };
const DIFF_ORDER = ['beginner', 'easy', 'medium', 'hard'];

// 게임 모드: 오리지널(자체 제작 186개) / Fogleman(외부 DB 400개). 진행·별은 모드별로 각각
// 저장하고, 골드·테마·장식·설정은 모든 모드가 공유한다(사용자 결정 2026-07-02).
const MODES = [
  { id: 'original', name: '오리지널', puzzles: PUZZLES },
  { id: 'fogleman', name: 'Fogleman', puzzles: FOGLEMAN_PUZZLES, credit: '퍼즐: Michael Fogleman · MIT (michaelfogleman.com/rush)' },
];
const DEFAULT_MODE = 'original';

// 저장은 플랫폼 저장 칸을 쓴다(기획서 Ⅲ권 4.1). 이 그릇이 만들어질 때 옛 저장을 새 칸으로
// 딱 한 번 옮기고, 옮기기 전 원본은 백업 칸에 그대로 남는다(설계 4.2). 프레임보다 먼저
// 만드는 이유는 소리 설정을 공용 칸으로 넘기는 일이 프레임의 소리 복원보다 앞서야 해서다.
const SHAPE_OPTS = {
  modeIds: MODES.map((m) => m.id),
  defaultMode: DEFAULT_MODE,
  defaultTheme: DEFAULT_THEME,
  defaultAccessory: DEFAULT_ACCESSORY,
  defaultStyle: DEFAULT_STYLE,
};
const save = createSave(STORAGE_NS, {
  schema: SAVE_SCHEMA,
  migrate: (old, ctx) => migrateToPlatform(old, SHAPE_OPTS, ctx),
  verify: looksCurrent,
});

const el = {
  page: document.querySelector('.rushhour'),
  board: document.getElementById('board'),
  stageMode: document.getElementById('stage-mode'),
  stageDiff: document.getElementById('stage-diff'),
  stageDiffLabel: document.getElementById('stage-diff-label'),
  stageNum: document.getElementById('stage-num'),
  moves: document.getElementById('moves'),
  goldSlot: document.getElementById('gold-slot'),
  time: document.getElementById('time'),
  undo: document.getElementById('btn-undo'),
  reset: document.getElementById('btn-reset'),
  hint: document.getElementById('btn-hint'),
  prev: document.getElementById('btn-prev'),
  next: document.getElementById('btn-next'),
  resultBody: document.getElementById('result-body'),
  playBack: document.getElementById('btn-back'),
  playMute: document.getElementById('btn-mute'),
  playSettings: document.getElementById('btn-play-settings'),
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

// 걸음 A가 세웠던 임시 변환기는 여기서 사라졌다. 지갑·산 것·쓰는 것을 공용 부품이 갖게 되어
// 게임이 저장 한 덩어리를 조립해 읽을 이유가 없어졌다(설계 1.3 · 7.3).
// 남은 것은 옛 저장을 새 칸으로 옮기는 함수뿐이고 그것은 save-shape.js에 있다.

// 모드 정의·퍼즐 목록은 공용 진행 부품이 갖는다(걸음 B). 여기서는 짧게 부르기만 한다.
function modeDef(id) { return frame.progress.modeDef(id); }
function modePuzzles(id) { return frame.progress.stages(id); }

// 적용한 보드 테마. 무엇을 쓰는 중인지는 공용 상점이 갖는다(기획서 Ⅲ권 4.6).
function currentTheme() {
  return frame.shop('shop').equippedItem('theme') || BOARD_THEMES[0];
}

// 보드 테마 색을 .rushhour의 --rh-* 변수에 인라인으로 덮어써 즉시 반영한다.
function applyTheme(t) {
  el.page.style.setProperty('--rh-board', t.board);
  el.page.style.setProperty('--rh-line', t.line);
  el.page.style.setProperty('--rh-exit', t.exit);
}

// 장착한 포니 머리 장식(render에 넘길 acc 키).
function currentAccessory() {
  return frame.shop('shop').equippedItem('accessory') || ACCESSORY_ITEMS[0];
}

// 꾸미기에서 고른 블록 캐릭터 스타일. 없어진 스타일이 저장돼 있으면 공용 상점이 기본으로 되돌린다.
function currentStyle() {
  return frame.shop('decor').equipped('style') || DEFAULT_STYLE;
}

// 스타일·주인공별 배경·테두리 표시 옵션(기본값 + 저장값 병합).
// 이것은 그림을 고르는 것이 아니라 켜고 끄는 것이라 상점의 사고 쓰는 모델에 맞지 않는다.
// 규격이 뜻을 정하지 않는 게임 칸이 제자리다(기획서 Ⅲ권 4.1 마지막 칸 · 설계 6.3).
const BLOCK_OPT_DEFAULT = {
  a: { bg: true, border: true },
  c: { bg: true, border: true },
  target: { bg: false, border: true },
};
// 캐릭터가 늘면 이 표에도 적어야 하지만, 안 적었다고 꾸미기 카드가 통째로 죽지는 않게
// 표에 없는 이름은 켜짐 둘로 받는다(종전 설정 화면이 하던 방어를 그대로 옮겼다).
function blockOptOf(key) {
  const o = save.readGame().blockOpts || {};
  return { ...(BLOCK_OPT_DEFAULT[key] || { bg: true, border: true }), ...(o[key] || {}) };
}
function currentBlockOpts() {
  const keys = new Set([...Object.keys(BLOCK_OPT_DEFAULT), ...PONY_STYLES.map((st) => st.id)]);
  const out = {};
  for (const k of keys) out[k] = blockOptOf(k);
  return out;
}

function puzzleById(id) {
  return modePuzzles().find((p) => p.id === id);
}

// 시작 화면 배경. 배경 그림이 없는 게임이라 이 게임의 얼굴인 크림 판과 오른쪽 출구 길을
// 그대로 배경으로 쓴다(규격 4.8-5, 기획서 Ⅰ권 6.6). 배치는 실제 48번 문제이고
// 붉은 테두리가 빼내야 할 주인공이다. 열 때마다 달라지면 같은 화면이 아니게 되므로 고정한다.
const TITLE_PUZZLE_ID = 48;
function titleBackdrop() {
  const wrap = document.createElement('div');
  wrap.className = 'title-board';
  const grid = document.createElement('div');
  grid.className = 'tb-grid';
  wrap.appendChild(grid);
  const p = PUZZLES.find((x) => x.id === TITLE_PUZZLE_ID) || PUZZLES[0];
  const cell = 100 / 6;
  for (const car of parseGrid(p.grid)) {
    const d = document.createElement('i');
    d.className = car.id === 'X' ? 'tb-car is-target' : 'tb-car';
    d.style.left = `${car.col * cell}%`;
    d.style.top = `${car.row * cell}%`;
    d.style.width = `${(car.orient === 'h' ? car.len : 1) * cell}%`;
    d.style.height = `${(car.orient === 'v' ? car.len : 1) * cell}%`;
    grid.appendChild(d);
  }
  return wrap;
}

// 진행 맵 제목. 종전 팝업 제목에 있던 지도 그림을 그대로 쓴다(게임 고유 장식은 게임 몫).
function mapTitleNode() {
  const frag = document.createDocumentFragment();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'title-ic');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of ['M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z', 'M9 4v14M15 6v14']) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  frag.appendChild(svg);
  frag.appendChild(document.createTextNode('진행 맵'));
  return frag;
}

function loadPuzzle(id) {
  stopTimer();
  const list = modePuzzles();
  const p = list.find((x) => x.id === id) || list[0];
  state.puzzleId = p.id;
  state.cars = parseGrid(p.grid);
  state.moves = 0;
  state.history = [];
  // 데이터에 검증된 최소 수(optimal)가 있으면(Fogleman 모드) 그대로 쓴다 - 고난도 실시간 BFS 회피.
  state.optimal = typeof p.optimal === 'number' ? p.optimal : solve(state.cars);
  state.limit = state.optimal * TIME_PER_OPTIMAL_S + TIME_BASE_S;
  state.elapsed = 0;
  state.face = 'neutral';
  state.solved = false;
  state.els = buildBoard(el.board, state.cars, currentStyle(), currentBlockOpts());
  // 마지막으로 보던 퍼즐을 현재 갈래 진행에 저장(갈래별). 공용 진행 부품이 맡는다.
  frame.progress.setCurrent(p.id);
  render();
  startTimer();
}

function render() {
  const list = modePuzzles();
  el.stageMode.textContent = modeDef().name;
  const cur = puzzleById(state.puzzleId);
  // 난이도는 4칸 게이지 + 라벨(§01 spec 8.2). 채움 칸 수·색은 style.css가 data-diff로 결정.
  el.stageDiffLabel.textContent = cur ? DIFF_LABEL[cur.difficulty] : '';
  el.stageDiff.dataset.diff = cur ? cur.difficulty : '';
  el.stageNum.textContent = String(state.puzzleId);
  el.moves.textContent = String(state.moves);
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
  // 타이머 알약의 진행 막대(남은 비율 1→0, style.css --t 소비).
  el.time.style.setProperty('--t', state.limit > 0 ? String(remain / state.limit) : '0');
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
  // 초과 확정(제한+1초)까지만 센다. 그 뒤는 표시 0:00·표정 울상으로 고정이라 잴 것이 없다 -
  // 방치 시 타이머가 영원히 도는 것을 막는다(시간 내 판정은 elapsed <= limit이라 영향 없음).
  if (state.elapsed > state.limit) stopTimer();
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
  else frame.audio.play('move');
}

function onSolved() {
  state.solved = true;
  stopTimer();
  frame.audio.play('clear');
  state.face = 'happy';
  updateTargetFace(state.els, 'happy');
  setBoardMood('happy'); // 주인공이 빠져나가면 남은 블록들도 전부 신난 표정

  // 깬 표시·별·최고 기록은 공용 진행 부품이 맡는다. 별 매기는 규칙(기준값 대비)도
  // 프레임에 한 번 넘겼으므로 여기서 계산하지 않는다.
  const { stars } = frame.progress.finish(state.puzzleId, {
    cleared: true, value: state.moves, par: state.optimal,
  });

  const inTime = state.elapsed <= state.limit;

  // 연속 클리어는 이 게임 고유 규칙이라 갈래별 게임 고유 값 자리에 담는다.
  // 시간 내 클리어면 +1, 초과 클리어면 끊겨 0. 2연속부터 보너스 골드.
  const ex = frame.progress.extra();
  const combo = inTime ? (ex.combo || 0) + 1 : 0;
  frame.progress.setExtra({ combo, bestCombo: Math.max(ex.bestCombo || 0, combo) });
  const comboBonus = combo >= 2 ? Math.min(combo, COMBO_MAX) * COMBO_GOLD_STEP : 0;

  // 얼마를 줄지의 계산식은 게임 몫이고(기획서 Ⅲ권 4.5), 지갑에 넣고 저장하는 것은 플랫폼이 한다.
  // 골드는 두 갈래가 함께 쓴다.
  const gold = GOLD_BASE
    + (stars === 3 ? GOLD_STAR3 : stars === 2 ? GOLD_STAR2 : 0)
    + (inTime ? GOLD_TIME_BONUS : 0)
    + comboBonus;
  frame.wallet.earn(gold);

  const isLast = !frame.progress.next(state.puzzleId);
  // 핵심만: 상태(제목) + 별 + 수/최소 + (콤보) + 획득 골드.
  // 별·수·콤보·골드는 글자 목록으로 담기지 않는 이 게임의 표현이라 카드 본문 조각을
  // 그대로 만들어 넣는다(규격 4.8-13). 버튼은 공용 카드의 다시 하기·그만하기를 쓴다.
  const body = el.resultBody.content.cloneNode(true).firstElementChild;
  body.querySelector('#result-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  body.querySelector('#result-text').textContent = `${state.moves}수 · 최소 ${state.optimal}수`;
  const comboEl = body.querySelector('#result-combo');
  if (combo >= 2) {
    comboEl.textContent = `🔥 ${combo}연속`;
    comboEl.hidden = false;
  }
  body.querySelector('#result-gold').textContent = `+${gold} 🪙`;
  // 이 게임의 '다시 하기'는 같은 문제를 또 푸는 것이 아니라 다음 문제로 넘어가는 흐름이라
  // 그 자리 문구만 바꾼다(규격 4.8-6 고정 문구의 예외 통로).
  frame.result.setActionLabel('retry', isLast ? '처음부터 다시' : '다음 퍼즐');
  render();
  // 주인공이 출구 길로 빠져나가는 연출 + 축하 파티클 후 결과 카드.
  playClear(state.els, el.board, () => {
    frame.result.show({
      title: isLast ? '완주! 🎉' : (state.moves <= state.optimal ? '완벽!' : '클리어!'),
      bodyEl: body,
      newRecord: stars === 3,
    });
    frame.screens.go(SCREEN.RESULT);
    // 얻은 별 개수만큼 반짝 효과음을 계단식으로 낸다.
    for (let i = 0; i < stars; i += 1) setTimeout(() => frame.audio.play('star'), i * STAR_SOUND_GAP_MS);
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

// 거부 피드백. 흔드는 모양은 공용 것을 쓰고(기획서 Ⅲ권 4.8 거절 흔들기) 어디를 흔들지만
// 이 게임이 정한다. 골드가 모자랄 때의 흔들기는 지갑이 직접 하므로 여기 오지 않는다 -
// 남은 자리는 값이 아니라 게임 규칙 때문에 막는 곳(고난도 퍼즐의 힌트)이다.
function shake(node) {
  if (!node) return;
  node.classList.remove('gg-shake');
  void node.offsetWidth; // reflow로 애니 재시작
  node.classList.add('gg-shake');
}

// 힌트: 골드를 써서 최적 다음 한 수를 강조한다. 자동으로 옮기지는 않는다.
function hint() {
  if (state.solved) return;
  // 고난도(Fogleman 보통·어려움)는 실시간 BFS가 무거워 힌트를 막는다(멈춤 방지).
  if (state.optimal > HINT_MAX_OPTIMAL) {
    shake(el.hint);
    frame.audio.play('deny');
    return;
  }
  const move = solveStep(state.cars);
  if (!move) return; // 이미 풀렸거나 풀 수 없음
  // 빼기와 모자랄 때의 거절·쪽지·흔들기는 지갑이 한다(기획서 Ⅲ권 4.5 - 플레이 중 소비).
  if (!frame.wallet.spend(HINT_COST, { deny: el.goldSlot })) return;
  showHint(state.els, move);
  frame.audio.play('hint');
}

// 소리 상태를 보드 위 버튼 아이콘에 비춘다. 켜고 끄는 것과 저장은 공용 프레임이 맡고,
// 이 함수는 지금 상태를 그리기만 한다(자리는 게임, 규칙은 공용 - 표준 4.8 규칙 19).
function paintMute(muted) {
  el.playMute.classList.toggle('is-muted', !!muted);
  el.playMute.setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기');
}



function go(delta) {
  const target = delta > 0
    ? frame.progress.next(state.puzzleId)
    : frame.progress.prev(state.puzzleId);
  if (target) loadPuzzle(target.id);
}


// 진행 맵은 공용 화면이다(기획서 Ⅲ권 4.3). 갈래 탭·요약 줄·묶음별 칩 격자·갈래 전환
// 확정 규칙까지 프레임이 갖는다. 이 게임은 판 목록과 묶는 규칙만 넘긴다(아래 createGameFrame).

// --- 상점과 꾸미기 (기획서 Ⅲ권 4.6 · 4.7) ---
//
// 껍데기·격자·가격 표시·살 수 있는지 판정·사고 나서 바로 적용·저장은 전부 공용 상점이 한다.
// 이 게임에 남는 것은 무엇을 파는지, 얼마인지, 미리 보기를 어떻게 그리는지, 그리고
// 쓰기로 한 것이 실제 플레이에서 무엇을 바꾸는지 넷뿐이다.

// 보드 테마 미리 보기 - 바닥색 동그라미에 출구 길 색 테두리.
function themeSwatch(t) {
  const n = document.createElement('span');
  n.className = 'rh-swatch';
  n.style.background = t.board;
  n.style.borderColor = t.exit;
  return n;
}

// 머리 장식 미리 보기 - 그림 글자를 같은 크기 동그라미 안에 넣는다. 맨바닥에 두면
// 바로 위 테마 격자와 미리 보기 모양이 어긋난다(1회차 검사 6번).
function accessorySwatch(a) {
  const n = document.createElement('span');
  n.className = 'rh-swatch rh-swatch-acc';
  n.textContent = a.emoji;
  return n;
}

// 꾸미기 카드 아래에 붙는 이 게임의 조각 - 캐릭터별 배경·테두리 켜고 끄기.
// 고르기가 아니라 켜고 끄기라 상점 격자에 들어가지 않는다(설계 6.3).
function blockOptRows() {
  const box = document.createElement('div');
  box.className = 'gg-set-list';
  const rows = [
    ...PONY_STYLES.map((st) => ({ key: st.id, name: st.name, emoji: st.emoji })),
    { key: 'target', name: '주인공', emoji: '🌟' },
  ];
  const paint = () => {
    box.replaceChildren(...rows.map((r) => {
      const o = blockOptOf(r.key);
      const row = document.createElement('div');
      row.className = 'gg-set-row';
      const label = document.createElement('span');
      label.className = 'gg-set-label';
      // 그림 글자는 종전 설정 줄에 있던 것이다. 주인공은 위 격자에 없어 여기가 유일한 자리다.
      label.textContent = `${r.emoji} ${r.name}`;
      row.appendChild(label);
      for (const [opt, text] of [['bg', '배경'], ['border', '테두리']]) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `gg-btn gg-btn-ghost gg-set-toggle${o[opt] ? ' is-on' : ''}`;
        b.setAttribute('aria-pressed', o[opt] ? 'true' : 'false');
        b.textContent = text;
        b.addEventListener('click', () => { toggleBlockOpt(r.key, opt); paint(); });
        row.appendChild(b);
      }
      return row;
    }));
  };
  paint();
  return box;
}

// 배경·테두리 켜고 끄기. 게임 칸에 담으므로 플랫폼은 안을 보지 않는다.
function toggleBlockOpt(key, opt) {
  const opts = currentBlockOpts();
  opts[key] = { ...blockOptOf(key), [opt]: !blockOptOf(key)[opt] };
  save.writeGame({ ...save.readGame(), blockOpts: opts });
  redrawBlocks();
  frame.audio.play('buy');
}

// 진행 중 퍼즐 상태는 유지하고 블록만 지금 스타일·옵션으로 다시 그린다.
function redrawBlocks() {
  state.els = buildBoard(el.board, state.cars, currentStyle(), currentBlockOpts());
}

// 상점 둘. 값이 있는 것이 상점이고 값이 없는 것이 꾸미기다(기획서 4.7 - 같은 부품이다).
const SHOPS = [
  {
    id: 'shop',
    title: '상점',
    currency: 'gold',
    kinds: [
      {
        id: 'theme',
        hint: '보드 테마를 골라 적용해요',
        equipLabel: '적용 중',
        defaultItem: DEFAULT_THEME,
        items: BOARD_THEMES.map((t) => ({ ...t, preview: () => themeSwatch(t) })),
      },
      {
        id: 'accessory',
        hint: '포니 머리 장식을 달아요',
        equipLabel: '장착 중',
        defaultItem: DEFAULT_ACCESSORY,
        items: ACCESSORY_ITEMS.map((a) => ({ ...a, preview: () => accessorySwatch(a) })),
      },
    ],
    // 쓰기로 한 것이 화면에서 무엇을 바꾸는지는 게임만 안다(기획서 4.6 마지막 줄).
    onEquip: (kind, item) => {
      if (kind === 'theme') {
        applyTheme(item);
      } else {
        setTargetAccessory(item.acc);
        updateTargetFace(state.els, state.face);
      }
    },
  },
  {
    id: 'decor',
    title: '꾸미기',
    kinds: [
      {
        id: 'style',
        hint: '블록 캐릭터를 골라요',
        equipLabel: '사용 중',
        pickLabel: '선택',
        defaultItem: DEFAULT_STYLE,
        items: PONY_STYLES.map((st) => ({ ...st, preview: () => st.emoji })),
      },
    ],
    extraEl: () => blockOptRows(),
    onEquip: () => redrawBlocks(),
  },
];

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
// 공용 프레임은 홈 화면의 <- 허브 복귀를 맡고, 놀이 중 소리는 이 게임 HUD가 직접 맡는다.
// 놀이 중에 쓰는 셋. 되돌아가기는 계단을 따르고, 소리와 환경설정은 공용 부품을 연다.
el.playBack.addEventListener('click', () => frame.navigate.back());
el.playMute.addEventListener('click', () => frame.audio.setMuted(!frame.audio.isMuted()));
el.playSettings.addEventListener('click', () => frame.settings.open());

// 절전: 탭이 백그라운드로 가면 게임 타이머를 재우고 돌아오면 되살린다(§01 spec 6.4·10.5).
// 자리 비운 시간은 경과에 넣지 않는다(페널티 없음). 오디오 재우기·깨우기는 공용 프레임이 맡는다.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopTimer();
  } else if (frame.screens.current() === SCREEN.PLAY) {
    // 클리어 후·시간 초과 확정 후에는 잴 것이 없어 다시 돌리지 않는다.
    if (!state.solved && state.elapsed <= state.limit) startTimer();
  }
});

// ── 공용 프레임(html-game 표준 4.8) ──
// 시작 화면·상단 띠·결과 카드·되돌아가기 계단·소리를 여기서 한 번에 받는다.
// 이 게임은 퍼즐이 586개(두 모드 합계)라 '골라 들어가는 형'이다 - 시작 화면과 플레이 사이에
// 진행 맵 한 칸이 들어간다. 상점은 새 칸을 만들지 않고 조작단 맨 아래 줄에 둔다(규격 4.8-5).
const frame = createGameFrame({
  root: document.getElementById('app'),
  gameId: STORAGE_NS,
  title: '밥풀이와 포니',
  // 판은 크림이지만 페이지 배경은 저녁 플럼(어두운 쪽)이라 밝은 톤으로 뒤집지 않는다.
  hasSelect: true,
  // 판 목록을 넘기면 진행 부품과 진행 맵이 함께 선다(기획서 Ⅲ권 4.2·4.3).
  // 별은 기준값(최소 이동 수) 대비로 매기고, 잠금은 두지 않는다 - 지금 동작 그대로다.
  progress: {
    modes: MODES.map((m) => ({ id: m.id, name: m.name, stages: m.puzzles, credit: m.credit })),
    group: (p) => p.difficulty,
    groups: DIFF_ORDER.map((d) => ({ id: d, label: DIFF_LABEL[d] })),
    stars: { type: 'par', margin: STAR2_MARGIN },
    higherIsBetter: false,             // 이동 수는 적을수록 좋다
  },
  onPickStage: (stage) => { loadPuzzle(stage.id); frame.screens.go(SCREEN.PLAY); },
  mapTitle: mapTitleNode(),
  background: { className: 'title-deco', el: titleBackdrop() },
  character: { src: 'assets/ponies/a_v2.png', width: 76 },
  sounds: SOUNDS,
  pauseOnHide: false,                // 시간은 흐르지만 실패로 죽는 게임이 아니라 카드를 띄우지 않는다
  resume: { enabled: false, detail: '' },
  startHint: '누르면 모드와 퍼즐 고르는 진행 맵으로 감',
  // 재화를 넘기면 지갑이 서고, 상점을 넘기면 시작 화면 추가 항목에 이름이 스스로 선다
  // (기획서 Ⅲ권 4.5 · 4.6). 이름표와 여는 코드를 이 게임이 다시 적지 않는다.
  wallet: { currencies: [{ id: 'gold', label: '골드', icon: '🪙' }] },
  shops: SHOPS,
  onStart: () => frame.start(),
  onResume: () => resumeLast(),
  // 소리가 바뀌면 보드 위 버튼 아이콘을 같이 맞춘다.
  onMuted: (m) => paintMute(m),
});
paintMute(frame.audio.isMuted());

// 플레이 화면만 등록한다. 고르는 화면은 공용 진행 맵이 쓴다.
frame.screens.register(SCREEN.PLAY, document.getElementById('screen-play'));

// 결과 카드 버튼. 다시 하기는 다음 퍼즐로, 그만하기는 진행 맵으로 돌아간다.
frame.result.on('retry', () => {
  const nx = frame.progress.next(state.puzzleId);
  if (nx) loadPuzzle(nx.id);
  else loadPuzzle(modePuzzles()[0].id); // 마지막 퍼즐 완주 후 처음으로
  frame.screens.go(SCREEN.PLAY);
});
frame.result.on('quit', () => frame.start());

frame.screens.onChange((now) => {
  if (now === SCREEN.TITLE) refreshTitle();
  if (now === SCREEN.SELECT) frame.map.refresh();
  if (now === SCREEN.PLAY && !state.solved && state.elapsed <= state.limit) startTimer();
  else if (now !== SCREEN.PLAY) stopTimer();
});

// 시작 화면 기록 줄과 이어서 하기 칸을 지금 상태로 맞춘다.
// 골드·꾸미기는 모드와 무관한 공용 재산이고 진행은 모드마다 따로 쌓이므로 한 줄에 셋을 담는다.
function refreshTitle() {
  const t = frame.progress.totals();
  const mode = modeDef();
  frame.title.setRecord(`모은 별 ${t.stars} · 골드 ${frame.wallet.balance().toLocaleString()} · ${mode.name} ${t.cleared} / ${t.total}`);
  const cur = frame.progress.current();
  frame.title.setResume({
    enabled: cur != null,
    detail: cur != null ? `${mode.name} ${cur}번` : '풀던 문제 없음',
  });
}

// 시작 화면 '이어서 하기': 마지막에 보던 문제로 곧장 들어간다.
function resumeLast() {
  const cur = frame.progress.current();
  if (cur == null) { frame.start(); return; }
  loadPuzzle(cur);
  frame.screens.go(SCREEN.PLAY);
}

el.hint.textContent = `💡 힌트 (${HINT_COST}🪙)`;
// 잔액 표시는 공용 지갑 부품이 그리고 이 게임은 자리만 정한다(표준 4.8 규칙 19·20).
frame.wallet.mount(el.goldSlot, { cur: 'gold' });
setTargetAccessory(currentAccessory().acc);
applyTheme(currentTheme());
// 첫 화면은 시작 화면이다(규격 4.8-1). 예전에는 열면 곧바로 퍼즐이 떴다.
// 보드는 미리 만들어 두어 시작 다음 흐름이 매끄럽게 이어지게 한다.
const startAt = frame.progress.current();
loadPuzzle(startAt != null ? startAt : modePuzzles()[0].id);
stopTimer();
refreshTitle();
