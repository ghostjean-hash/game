// 진입점: 화면 전환 오케스트레이션 + 저장 연결. core를 조립하고 render/input에 위임한다.

import { createStorage } from '../../../shared/storage.js';
import { CELL, MODE, MAX_STARS, ANIM, PRAISE, PRAISE_STREAK } from './data/constants.js';
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
  markDragRun, clearDragRun,
} from './render/boardView.js';
import { renderMap } from './render/mapView.js';
import { renderResult } from './render/resultView.js';
import { renderAlbum } from './render/albumView.js';
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
  result: el('screen-result'), album: el('screen-album'),
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
  el('puzzle-info').innerHTML =
    `<span class="pi-badge">${d.icon} ${d.name}</span>` +
    (puzzle.difficulty === 'tutorial' ? '' : `<span class="pi-name">${puzzle.title}</span>`) +
    `<span class="pi-prog">${idx}/${total}</span>`;

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
  updateFinger();
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
  const s = currentStars();
  el('star-preview').innerHTML = Array.from({ length: MAX_STARS }, (_, i) =>
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

// 칠하기 모드에서 이미 칠한 칸은 "틀린 칸(붉은)"만 지우고, 맞은 칸은 잠금(null=무동작).
function decideAction(r, c) {
  const st = cur.board.cells[r][c];
  if (cur.mode === MODE.FILL) {
    // 이미 맞게 칠한 칸: 지우진 않지만(무변화) 드래그는 이어지도록 fill로.
    // 틀린 칸(붉은)은 지우기.
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

// --- 도감 ---
function openAlbum() {
  renderAlbum(el('album-body'), progress);
  showScreen('album');
}

// --- 사운드 ---
function updateMuteBtn() {
  el('sound-toggle').textContent = sound.isMuted() ? '🔇' : '🔊';
}
function toggleMute() {
  const m = !sound.isMuted();
  sound.setMuted(m);
  store.set('muted', m);
  updateMuteBtn();
}

// --- 배선 ---
function init() {
  attachBoardInput(boardEl, { onStart: onPaintStart, onMove: onPaintMove, onEnd: onPaintEnd });
  el('mode-fill').addEventListener('click', () => setMode(MODE.FILL));
  el('mode-mark').addEventListener('click', () => setMode(MODE.MARK));
  el('play-back').addEventListener('click', openMap);
  el('go-album').addEventListener('click', openAlbum);
  el('album-back').addEventListener('click', openMap);
  el('result-map').addEventListener('click', openMap);
  el('result-next').addEventListener('click', nextPuzzle);
  el('sound-toggle').addEventListener('click', toggleMute);
  el('undo-btn').addEventListener('click', undo);
  el('help-btn').addEventListener('click', useHelp);
  document.addEventListener('keydown', onKey);

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
