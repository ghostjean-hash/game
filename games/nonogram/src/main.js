// 진입점: 화면 전환 오케스트레이션 + 저장 연결. core를 조립하고 render/input에 위임한다.

import { createStorage } from '../../../shared/storage.js';
import { CELL, MODE, MAX_STARS, ANIM, PRAISE, PRAISE_STREAK, CELL_FIT } from './data/constants.js';
import { PUZZLES } from './data/puzzles.js';
import { makeClues } from './core/hints.js';
import {
  createBoard, toSolution, setCell, isSolved,
  revealLine, serializeBoard, deserializeBoard,
} from './core/board.js';
import { lineFlags, completedCount } from './core/lines.js';
import { starsFor } from './core/stars.js';
import {
  renderClues, applyClueDim, renderBoard, applyState, revealColors,
  setCursor, popCell, waveHighlight, pointFinger, showDragCount, hideDragCount,
  markDragRun, clearDragRun, clearWaves, markFlow,
} from './render/boardView.js';
import { renderMap } from './render/mapView.js';
import { renderResult } from './render/resultView.js';
import { attachBoardInput } from './input/boardInput.js';
import * as sound from './audio/sound.js';

const store = createStorage('nonogram');

// --- 영속 상태 ---
let progress = store.get('progress', {});   // { [id]: { cleared, stars, bestMistakes } }

// --- 현재 판 상태 ---
let cur = null;

// --- DOM 참조 ---
const el = (id) => document.getElementById(id);
const screens = {
  map: el('screen-map'), play: el('screen-play'),
  result: el('screen-result'),
};
const boardEl = el('board');
const puzzleEl = boardEl.parentElement;

const DIFF = {
  tutorial: { icon: '🎓', name: '튜토리얼' },
  easy: { icon: '🌱', name: '초급' },
  medium: { icon: '⭐', name: '중급' },
  hard: { icon: '🔥', name: '고급' },
};

const COACH = {
  1: '가로줄·세로줄 앞의 <b>숫자</b>만큼 칸을 이어서 칠해요. 손가락을 따라 눌러 봐요!',
  2: '칠하지 않을 칸은 <b>표시(×)</b>로 막아두면 헷갈리지 않아요.',
  3: '이제 자유롭게! 숫자 힌트만 보고 그림을 완성해 봐요.',
};

function showScreen(name) {
  for (const [k, node] of Object.entries(screens)) node.classList.toggle('active', k === name);
}

// --- 맵 ---
function openMap() {
  renderMap(el('map-body'), progress, startPuzzle);
  showScreen('map');
}

// 난이도 내 순번.
function puzzleRank(p) {
  const same = PUZZLES.filter((q) => q.difficulty === p.difficulty);
  return { idx: same.findIndex((q) => q.id === p.id) + 1, total: same.length };
}

// 중도 저장.
function saveInProgress() {
  const ip = store.get('inprogress', {});
  ip[cur.puzzle.id] = serializeBoard(cur.board);
  store.set('inprogress', ip);
}
function clearInProgress(id) {
  const ip = store.get('inprogress', {});
  if (ip[id]) { delete ip[id]; store.set('inprogress', ip); }
}
function loadInProgress(id, size) {
  const ip = store.get('inprogress', {});
  const b = deserializeBoard(ip[id]);
  return b && b.size === size ? b : createBoard(size);
}

// --- 플레이 ---
function startPuzzle(puzzle) {
  cur = {
    puzzle,
    clues: makeClues(puzzle.grid),
    solution: toSolution(puzzle.grid),
    board: loadInProgress(puzzle.id, puzzle.size),
    mode: MODE.FILL,
    dragAction: null,
    dragStart: null,       // 드래그 시작 칸(범위·방향 계산)
    dragLast: null,        // 드래그 마지막 칸(파도 방향)
    completedBefore: null, // 드래그 직전 완성 줄 스냅샷
    cursor: { r: 0, c: 0 },
    history: [],
    helpUsed: 0,
    streak: 0,
    prevCompleted: 0,
  };

  puzzleEl.dataset.size = puzzle.size;
  puzzleEl.style.setProperty('--n', puzzle.size);
  el('col-clues').style.setProperty('--n', puzzle.size);
  el('row-clues').style.setProperty('--n', puzzle.size);

  renderBoard(boardEl, puzzle.size);
  renderClues(el('col-clues'), el('row-clues'), cur.clues);

  // 헤더 정보
  const d = DIFF[puzzle.difficulty];
  const { idx, total } = puzzleRank(puzzle);
  // 퍼즐 이름은 정답 스포일러라 HUD에 아예 표시하지 않는다(클리어 결과 화면에서만 공개).
  // 난이도 배지(난이도별 색) + 진행 위치만 두어 깔끔하게. (배지의 d.name은 난이도명)
  el('puzzle-info').innerHTML =
    `<span class="pi-badge pi-${puzzle.difficulty}">${d.name}</span>` +
    `<span class="pi-prog">${idx}/${total}</span>`;

  el('mode-fill').disabled = false;
  el('mode-mark').disabled = false;
  setMode(MODE.FILL);
  cur.prevCompleted = completedCount(lineFlags(cur.board, cur.clues));
  refresh();

  // 튜토리얼 코치 + 안내문
  const coach = el('coach');
  const isTut = puzzle.difficulty === 'tutorial';
  if (isTut && COACH[puzzle.tutorialStep]) {
    coach.innerHTML = COACH[puzzle.tutorialStep];
    coach.hidden = false;
  } else {
    coach.hidden = true;
  }
  el('hint-line').hidden = !isTut;

  showScreen('play');
  // 화면 전환으로 레이아웃이 잡힌 다음 프레임에 격자 크기를 화면에 맞춘다.
  requestAnimationFrame(() => { fitBoard(); updateFinger(); });
}

// 격자를 현재 화면에 꼭 맞춘다(페이지 스크롤 없이 한 화면에).
// 머리말·모드바가 쓰고 남은 .puzzle-wrap 공간에서 힌트 영역을 뺀 뒤,
// 폭·높이 중 작은 쪽으로 셀 크기를 정한다. 힌트 폭·높이는 글자 기반이라 셀 크기와
// 사실상 무관하므로 한 번 측정으로 충분하다. CSS clamp는 JS 미동작 시 fallback.
function fitBoard() {
  if (!cur) return;
  const n = cur.puzzle.size;
  const wrap = puzzleEl.parentElement; // .puzzle-wrap
  const center = puzzleEl.closest('.play-center');
  if (!center) return;
  // 격자 가용 공간 = play-center에서 형제(모드바·코치·힌트)와 그 사이 gap을 뺀 나머지.
  // 이래야 격자가 남는 공간에 딱 맞고, 모드바가 격자 바로 아래에 붙는다.
  const cs = getComputedStyle(center);
  const gap = parseFloat(cs.rowGap) || 0;
  let sibH = 0, sibCount = 0;
  for (const ch of center.children) {
    if (ch === wrap || ch.offsetParent === null) continue; // 자기 자신·숨김 제외
    sibH += ch.offsetHeight; sibCount += 1;
  }
  // 가로(태블릿 눕힘)에선 보드 열 폭이 auto라 center 폭을 병목으로 쓸 수 없다.
  // 대신 화면 전체 폭에서 좌·우 UI 열과 열 간격을 뺀 값이 실제 가용 폭이다.
  // 폭을 병목에서 빼면(무한대) 옆으로 긴 창에서 보드+UI가 화면을 넘친다(STANDARD 4.7-7).
  const isLandscape = window.innerWidth > window.innerHeight;
  let availW;
  if (isLandscape) {
    const screen = el('screen-play');
    const colGap = parseFloat(getComputedStyle(screen).columnGap) || 0;
    // offsetWidth는 좁은 창에서 이미 눌린 트랙 폭이 나와 순환 측정이 된다.
    // scrollWidth(내용물 고유 폭)와 큰 쪽을 써야 UI 열이 실제 필요한 폭을 확보한다.
    const contentW = (sel) => {
      const ui = screen.querySelector(sel);
      return ui ? Math.max(ui.offsetWidth, ui.scrollWidth) : 0;
    };
    const tlW = contentW('.pc-tl');
    const sideW = Math.max(contentW('.pc-tr'), contentW('.pc-br'));
    availW = screen.clientWidth - tlW - sideW - colGap * 2;
  } else {
    availW = center.clientWidth;
  }
  const availH = center.clientHeight - sibH - gap * sibCount;
  if (availH <= 0 || availW <= 0) return;        // 아직 레이아웃 전(display:none 등)
  const clueLeft = el('row-clues').offsetWidth;  // 좌측 행 힌트 폭
  const clueTop = el('col-clues').offsetHeight;  // 상단 열 힌트 높이
  const g = CELL_FIT.GUTTER_PX;
  // 보드 오른쪽 여백: 세로에선 좌측 힌트 폭만큼 줘 격자(board)를 화면 정중앙에.
  // 가로에선 그 1/3만 줘 우측 UI를 보드에 가깝게 붙인다(RIGHT_MARGIN_RATIO).
  const marginRight = isLandscape
    ? Math.round(clueLeft * CELL_FIT.RIGHT_MARGIN_RATIO)
    : clueLeft;
  const byW = (availW - clueLeft - marginRight - g) / n;
  const byH = (availH - clueTop - g) / n;
  // 가로에선 보드가 배정 영역(높이)을 꽉 채워야 UI가 보드 모서리에 정확히 붙는다.
  // cap을 두면 보드가 영역보다 작아져 그 여백만큼 UI가 보드 밖으로 벗어난다.
  const cap = isLandscape ? Number.POSITIVE_INFINITY : (CELL_FIT.MAX[n] || CELL_FIT.DEFAULT_MAX);
  const cell = Math.max(CELL_FIT.MIN_PX, Math.floor(Math.min(byW, byH, cap)));
  puzzleEl.style.setProperty('--cell', `${cell}px`);
  puzzleEl.style.marginRight = `${marginRight}px`;
}

// 화면 갱신: 셀 상태 + 완성 줄 흐리게 + 별 예고 + 실수 + 중도 저장.
function refresh() {
  applyState(boardEl, cur.board, cur.solution);
  applyClueDim(el('col-clues'), el('row-clues'), lineFlags(cur.board, cur.clues));
  updateStarPreview();
  updateMistake();
  saveInProgress();
}

function updateMistake() {
  el('mistake-count').textContent = cur.board.mistakes;
}

// 지금 받을 별(실수 + 도움 양보 반영).
function currentStars() {
  return Math.max(1, Math.min(starsFor(cur.board.mistakes), MAX_STARS - cur.helpUsed));
}
function updateStarPreview() {
  const sp = el('star-preview');
  if (!sp) return; // 플레이 중 예상 별점 표시는 제거됨(요소 없음)
  const s = currentStars();
  sp.innerHTML = Array.from({ length: MAX_STARS }, (_, i) =>
    `<span class="${i < s ? 'on' : 'off'}">★</span>`).join('');
}

function setMode(mode) {
  cur.mode = mode;
  el('mode-fill').classList.toggle('active', mode === MODE.FILL);
  el('mode-mark').classList.toggle('active', mode === MODE.MARK);
  store.set('mode', mode);
}

// 맞게 칠한 칸(정답 칠칸)은 잠긴다: 지우기 불가.
function isCorrectFilled(r, c) {
  return cur.board.cells[r][c] === CELL.FILLED && cur.solution[r][c] === true;
}

// 이 칸을 눌렀을 때의 동작을 정한다.
// 칠하기 모드: 빈 칸·맞은 칸은 fill(맞은 칸은 무변화라 유지되며 드래그가 이어짐), 틀린 칸(붉은)만 erase.
// 표시 모드: X 토글(있으면 erase, 없으면 mark).
function decideAction(r, c) {
  const st = cur.board.cells[r][c];
  if (cur.mode === MODE.FILL) {
    if (st === CELL.FILLED) return cur.solution[r][c] === false ? 'erase' : 'fill';
    return 'fill';
  }
  return st === CELL.MARKED ? 'erase' : 'mark';
}

function applyAction(r, c) {
  if (!cur.dragAction) return; // 잠긴 맞은 칸(무동작)
  // 지우기 드래그가 맞게 칠한 칸을 지나가도 그 칸은 건너뛴다(잠금 유지).
  if (cur.dragAction === 'erase' && isCorrectFilled(r, c)) return;
  const target = cur.dragAction === 'fill' ? CELL.FILLED
    : cur.dragAction === 'mark' ? CELL.MARKED
      : CELL.EMPTY;
  const before = cur.board;
  cur.board = setCell(before, r, c, target, cur.solution);
  if (cur.board === before) return;
  refresh();
  popCell(boardEl, r, c, cur.puzzle.size);
  if (cur.board.mistakes > before.mistakes) sound.play('mistake');
  else sound.play(cur.dragAction);
  updateFinger();
}

// 이번 동작으로 "새로 완성된" 줄만 파도 반짝 + 연속 칭찬.
// before=동작 직전 완성 flags, forward=드래그 방향. 이미 완성돼 있던 줄은 다시 반짝하지 않는다.
function highlightNewCompletions(before, forward) {
  const n = cur.puzzle.size;
  // 이 동작으로 퍼즐이 완성되면 줄 파도를 그리지 않는다(전체 컬러 변신과 겹쳐 지저분해짐).
  if (isSolved(cur.board, cur.solution)) return;
  const after = lineFlags(cur.board, cur.clues);
  const newLines = [];
  for (let r = 0; r < n; r++) if (after.rows[r] && !before.rows[r]) newLines.push({ type: 'row', idx: r });
  for (let c = 0; c < n; c++) if (after.cols[c] && !before.cols[c]) newLines.push({ type: 'col', idx: c });
  if (newLines.length) {
    waveHighlight(boardEl, newLines, n, forward, ANIM.SPARKLE_STEP_MS);
    sound.play('fill');
  }
  const now = completedCount(after);
  if (now > cur.prevCompleted) {
    cur.streak += 1;
    if (cur.streak >= PRAISE_STREAK) showPraise();
  } else if (now < cur.prevCompleted) {
    cur.streak = 0;
  }
  cur.prevCompleted = now;
}

let praiseTimer = null;
function showPraise() {
  const t = el('praise-toast');
  t.textContent = PRAISE[Math.floor(Math.random() * PRAISE.length)];
  t.hidden = false;
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(praiseTimer);
  praiseTimer = setTimeout(() => t.classList.remove('show'), ANIM.PRAISE_MS);
}

// 튜토리얼 손가락: 아직 첫 칸도 안 칠했으면 첫 정답 칠칸을 가리킨다.
function updateFinger() {
  if (!cur) return; // 맵/결과 화면에서 resize로 불릴 수 있어 가드
  const fingerEl = el('finger');
  if (cur.puzzle.difficulty !== 'tutorial') { fingerEl.hidden = true; return; }
  const anyFilled = cur.board.cells.some((row) => row.some((v) => v === CELL.FILLED));
  if (anyFilled) { fingerEl.hidden = true; return; }
  const n = cur.puzzle.size;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (cur.solution[r][c]) { pointFinger(boardEl, fingerEl, r, c, n); return; }
    }
  }
}

// 되돌리기: 드래그 한 묶음 전으로.
function pushHistory() {
  cur.history.push(cur.board);
  if (cur.history.length > 200) cur.history.shift();
}
function undo() {
  if (!cur.history.length) return;
  cur.board = cur.history.pop();
  cur.prevCompleted = completedCount(lineFlags(cur.board, cur.clues));
  cur.streak = 0;
  refresh();
  updateFinger();
  sound.play('erase');
}

// 도움: 한 줄 열기(별 하나 양보).
function useHelp() {
  const before = cur.board;
  const beforeFlags = lineFlags(before, cur.clues);
  const next = revealLine(before, cur.solution);
  if (next === before) return; // 이미 다 맞음
  pushHistory();
  cur.board = next;
  cur.helpUsed += 1;
  refresh();
  if (isSolved(cur.board, cur.solution)) { win(); return; }
  highlightNewCompletions(beforeFlags, true);
}

// 힌트 숫자를 누르면: 그 줄이 완성됐을 때만 남은 빈 칸을 자동으로 X로 채운다.
// 아직 못 맞춘 줄은 아무 동작도 하지 않는다(type='row'|'col', idx=줄 번호).
function fillLineMarks(type, idx) {
  if (!cur) return;
  const n = cur.puzzle.size;
  // "맞춘 줄" 판정을 정답 기준으로: 정답 칠칸은 모두 칠했고 잘못 칠한 칸이 없어야 한다.
  // (빈 줄=힌트 0 은 칠할 칸이 없으므로, 잘못 칠한 게 없으면 맞춘 것으로 본다.)
  for (let i = 0; i < n; i++) {
    const r = type === 'row' ? idx : i;
    const c = type === 'col' ? idx : i;
    const filled = cur.board.cells[r][c] === CELL.FILLED;
    if (filled !== (cur.solution[r][c] === true)) return; // 아직 못 맞춘 줄이면 무동작
  }
  // 남은 빈 칸 목록을 줄 방향 순서로 모은다(누른 쪽=힌트에서 흘러가는 파도).
  const empties = [];
  for (let i = 0; i < n; i++) {
    const r = type === 'row' ? idx : i;
    const c = type === 'col' ? idx : i;
    if (cur.board.cells[r][c] === CELL.EMPTY) empties.push([r, c]);
  }
  if (!empties.length) return; // 채울 빈 칸이 없으면 무동작
  pushHistory();
  sound.play('mark');
  // 칸별로 순차 지연을 줘 X가 파도처럼 흘러가며 채워지게 한다.
  empties.forEach(([r, c], k) => {
    setTimeout(() => {
      if (!cur) return;
      cur.board = setCell(cur.board, r, c, CELL.MARKED, cur.solution);
      applyState(boardEl, cur.board, cur.solution);
      markFlow(boardEl, r, c, cur.puzzle.size);
    }, k * ANIM.MARK_STEP_MS);
  });
  setTimeout(() => { if (cur) refresh(); }, empties.length * ANIM.MARK_STEP_MS + 20);
}

function onPaintStart(r, c) {
  cur.completedBefore = lineFlags(cur.board, cur.clues); // 드래그 전 완성 줄 스냅샷
  cur.dragAction = decideAction(r, c);
  cur.cursor = { r, c };
  cur.dragStart = { r, c };
  cur.dragLast = { r, c };
  if (!cur.dragAction) return; // 잠긴 맞은 칸: 히스토리도 남기지 않음
  pushHistory();
  applyAction(r, c);
}
function onPaintMove(r, c) {
  applyAction(r, c);
  cur.dragLast = { r, c };
  // X(표시) 드래그는 칸 수 배지/색 강조를 쓰지 않는다(칠하기 전용).
  const s = cur.dragStart;
  if (s && cur.dragAction !== 'mark') {
    const len = Math.abs(r - s.r) + Math.abs(c - s.c) + 1;
    const coords = [];
    if (r === s.r) {
      for (let cc = Math.min(s.c, c); cc <= Math.max(s.c, c); cc++) coords.push([s.r, cc]);
    } else {
      for (let rr = Math.min(s.r, r); rr <= Math.max(s.r, r); rr++) coords.push([rr, s.c]);
    }
    markDragRun(boardEl, coords, cur.puzzle.size);
    showDragCount(boardEl, el('drag-count'), r, c, cur.puzzle.size, len);
  }
}
function onPaintEnd() {
  clearDragRun();
  hideDragCount(el('drag-count'));
  // 드래그 방향(파도 순서용): 시작→마지막이 오른쪽/아래면 정방향.
  const s = cur.dragStart, last = cur.dragLast;
  const forward = !s || !last ? true : (last.c - s.c) + (last.r - s.r) >= 0;
  const before = cur.completedBefore || lineFlags(cur.board, cur.clues);
  cur.dragStart = null;
  if (isSolved(cur.board, cur.solution)) { win(); return; }
  // 마우스를 놓은 지금, 이번 드래그로 새로 온전히 맞춰진 줄만 하이라이트.
  highlightNewCompletions(before, forward);
}

function win() {
  const stars = currentStars();
  const id = cur.puzzle.id;
  const prev = progress[id];
  const bestMistakes = prev ? Math.min(prev.bestMistakes, cur.board.mistakes) : cur.board.mistakes;
  const bestStars = prev ? Math.max(prev.stars, stars) : stars;
  progress = { ...progress, [id]: { cleared: true, stars: bestStars, bestMistakes } };
  store.set('progress', progress);
  clearInProgress(id);

  el('finger').hidden = true;
  // 다 맞췄으니 모드 버튼을 잠근다(완성 연출 중 조작 방지 + 완료 표현).
  el('mode-fill').disabled = true;
  el('mode-mark').disabled = true;
  clearWaves(boardEl); // 진행 중이던 줄 파도를 지우고 나서 전체 컬러 변신(겹침 방지)
  revealColors(boardEl, cur.puzzle.grid, ANIM.REVEAL_STEP_MS, cur.puzzle.palette);
  setCursor(boardEl, -1, -1, cur.puzzle.size);
  sound.play('clear');
  const waveMs = (cur.puzzle.size * 2) * ANIM.REVEAL_STEP_MS + ANIM.RESULT_DELAY_MS;
  setTimeout(() => {
    renderResult(el('result-pic'), el('result-title'), el('result-stars'), cur.puzzle, stars);
    showScreen('result');
    sound.playStars(stars);
  }, waveMs);
}

function nextPuzzle() {
  const idx = PUZZLES.findIndex((p) => p.id === cur.puzzle.id);
  const next = PUZZLES[idx + 1];
  if (next) startPuzzle(next);
  else openMap();
}

// --- 키보드(보조) ---
function moveCursor(dr, dc) {
  const n = cur.puzzle.size;
  cur.cursor.r = Math.min(n - 1, Math.max(0, cur.cursor.r + dr));
  cur.cursor.c = Math.min(n - 1, Math.max(0, cur.cursor.c + dc));
  setCursor(boardEl, cur.cursor.r, cur.cursor.c, n);
}

function onKey(e) {
  if (!screens.play.classList.contains('active') || !cur) return;
  const { r, c } = cur.cursor;
  switch (e.key) {
    case 'ArrowUp': moveCursor(-1, 0); break;
    case 'ArrowDown': moveCursor(1, 0); break;
    case 'ArrowLeft': moveCursor(0, -1); break;
    case 'ArrowRight': moveCursor(0, 1); break;
    case ' ': case 'Enter':
      setMode(MODE.FILL);
      cur.dragAction = decideAction(r, c);
      if (cur.dragAction) { pushHistory(); applyAction(r, c); }
      if (isSolved(cur.board, cur.solution)) win();
      break;
    case 'x': case 'X':
      setMode(MODE.MARK);
      cur.dragAction = decideAction(r, c);
      if (cur.dragAction) { pushHistory(); applyAction(r, c); }
      break;
    case 'z': case 'Z': undo(); break;
    default: return;
  }
  e.preventDefault();
}

// --- 사운드 ---
// 소리 켜짐/음소거 SVG 아이콘(버튼 안에서 상태에 따라 교체). tool-btn 규격에 맞춰 라벨 포함.
const ICON_SOUND = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>';
const ICON_MUTE = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';
function updateMuteBtn() {
  el('sound-toggle').innerHTML = sound.isMuted() ? ICON_MUTE : ICON_SOUND;
}
function toggleMute() {
  const m = !sound.isMuted();
  sound.setMuted(m);
  store.set('muted', m);
  updateMuteBtn();
}

// --- 전체화면 ---
// iOS Safari/일부 브라우저는 requestFullscreen 미지원 - 그럴 땐 버튼을 숨긴다.
function fsSupported() {
  const d = document.documentElement;
  return !!(d.requestFullscreen || d.webkitRequestFullscreen);
}
function toggleFullscreen() {
  const d = document;
  const root = d.documentElement;
  const isFs = d.fullscreenElement || d.webkitFullscreenElement;
  if (!isFs) {
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (req) req.call(root);
  } else {
    const exit = d.exitFullscreen || d.webkitExitFullscreen;
    if (exit) exit.call(d);
  }
}

// --- 배선 ---
function init() {
  attachBoardInput(boardEl, { onStart: onPaintStart, onMove: onPaintMove, onEnd: onPaintEnd });
  el('mode-fill').addEventListener('click', () => setMode(MODE.FILL));
  el('mode-mark').addEventListener('click', () => setMode(MODE.MARK));
  el('play-back').addEventListener('click', openMap);
  el('result-map').addEventListener('click', openMap);
  el('result-next').addEventListener('click', nextPuzzle);
  el('sound-toggle').addEventListener('click', toggleMute);
  el('undo-btn').addEventListener('click', undo);
  el('help-btn').addEventListener('click', useHelp);
  // 힌트 숫자 누르면 완성된 줄의 빈 칸을 자동 X로.
  el('row-clues').addEventListener('click', (e) => {
    const line = e.target.closest('.clue-row');
    if (line) fillLineMarks('row', [...el('row-clues').children].indexOf(line));
  });
  el('col-clues').addEventListener('click', (e) => {
    const line = e.target.closest('.clue-col');
    if (line) fillLineMarks('col', [...el('col-clues').children].indexOf(line));
  });
  el('fs-toggle').addEventListener('click', toggleFullscreen);
  if (fsSupported()) el('fs-toggle').hidden = false; // 지원 기기에서만 노출
  document.addEventListener('keydown', onKey);
  // 창 크기·방향(가로/세로 회전)·전체화면 전환이 바뀌면 격자를 다시 화면에 맞춘다.
  window.addEventListener('resize', () => { fitBoard(); updateFinger(); });
  window.addEventListener('orientationchange', () => {
    requestAnimationFrame(() => { fitBoard(); updateFinger(); });
  });
  const onFsChange = () => requestAnimationFrame(() => { fitBoard(); updateFinger(); });
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  sound.setMuted(store.get('muted', false));
  updateMuteBtn();
  document.addEventListener('pointerdown', () => sound.unlockAudio(), { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) sound.suspendAudio();
    else sound.resumeAudio();
  });

  openMap();
}

init();
