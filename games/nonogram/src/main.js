// 진입점: 화면 전환 오케스트레이션 + 저장 연결. core를 조립하고 render/input에 위임한다.

import { createStorage } from '../../../shared/storage.js';
import { CELL, MODE } from './data/constants.js';
import { PUZZLES } from './data/puzzles.js';
import { makeClues } from './core/hints.js';
import { createBoard, toSolution, setCell, isSolved } from './core/board.js';
import { starsFor } from './core/stars.js';
import { renderClues, renderBoard, applyState, revealColors, setCursor } from './render/boardView.js';
import { renderMap } from './render/mapView.js';
import { renderResult } from './render/resultView.js';
import { renderAlbum } from './render/albumView.js';
import { attachBoardInput } from './input/boardInput.js';
import * as sound from './audio/sound.js';

const store = createStorage('nonogram');

// --- 영속 상태 ---
let progress = store.get('progress', {});      // { [id]: { cleared, stars, bestMistakes } }

// --- 현재 판 상태 ---
let cur = null; // { puzzle, clues, solution, board, mode, dragAction, cursor }

// --- DOM 참조 ---
const el = (id) => document.getElementById(id);
const screens = {
  map: el('screen-map'), play: el('screen-play'),
  result: el('screen-result'), album: el('screen-album'),
};
const boardEl = el('board');
const puzzleEl = boardEl.parentElement; // .puzzle (--cell/data-size 보유)

const COACH = {
  1: '가로줄·세로줄 앞의 <b>숫자</b>만큼 칸을 이어서 칠해요. 하트를 만들어 볼까요?',
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

// --- 플레이 ---
function startPuzzle(puzzle) {
  cur = {
    puzzle,
    clues: makeClues(puzzle.grid),
    solution: toSolution(puzzle.grid),
    board: createBoard(puzzle.size),
    mode: MODE.FILL,
    dragAction: null,
    cursor: { r: 0, c: 0 },
  };

  puzzleEl.dataset.size = puzzle.size;
  puzzleEl.style.setProperty('--n', puzzle.size);
  el('col-clues').style.setProperty('--n', puzzle.size);
  el('row-clues').style.setProperty('--n', puzzle.size);

  renderBoard(boardEl, puzzle.size);
  renderClues(el('col-clues'), el('row-clues'), cur.clues);
  applyState(boardEl, cur.board);
  updateMistake();
  setMode(MODE.FILL);

  const coach = el('coach');
  if (puzzle.difficulty === 'tutorial' && COACH[puzzle.tutorialStep]) {
    coach.innerHTML = COACH[puzzle.tutorialStep];
    coach.hidden = false;
  } else {
    coach.hidden = true;
  }

  showScreen('play');
}

function updateMistake() {
  el('mistake-count').textContent = cur.board.mistakes;
}

function setMode(mode) {
  cur.mode = mode;
  el('mode-fill').classList.toggle('active', mode === MODE.FILL);
  el('mode-mark').classList.toggle('active', mode === MODE.MARK);
  store.set('mode', mode);
}

// 드래그/탭: 첫 칸 상태로 동작 결정 후 지나는 칸에 동일 적용.
function decideAction(r, c) {
  const st = cur.board.cells[r][c];
  if (cur.mode === MODE.FILL) return st === CELL.FILLED ? 'erase' : 'fill';
  return st === CELL.MARKED ? 'erase' : 'mark';
}

function applyAction(r, c) {
  const target = cur.dragAction === 'fill' ? CELL.FILLED
    : cur.dragAction === 'mark' ? CELL.MARKED
      : CELL.EMPTY;
  const before = cur.board;
  cur.board = setCell(before, r, c, target, cur.solution);
  if (cur.board === before) return; // 무변화 → 무렌더/무음
  applyState(boardEl, cur.board);
  updateMistake();
  if (cur.board.mistakes > before.mistakes) sound.play('mistake');
  else sound.play(cur.dragAction); // 'fill' | 'erase' | 'mark'
}

function onPaintStart(r, c) {
  cur.dragAction = decideAction(r, c);
  cur.cursor = { r, c };
  applyAction(r, c);
}
function onPaintMove(r, c) { applyAction(r, c); }
function onPaintEnd() {
  if (isSolved(cur.board, cur.solution)) win();
}

function win() {
  const stars = starsFor(cur.board.mistakes);
  const id = cur.puzzle.id;
  const prev = progress[id];
  const bestMistakes = prev ? Math.min(prev.bestMistakes, cur.board.mistakes) : cur.board.mistakes;
  const bestStars = prev ? Math.max(prev.stars, stars) : stars;
  progress = { ...progress, [id]: { cleared: true, stars: bestStars, bestMistakes } };
  store.set('progress', progress);

  // 흑백 → 컬러 변신 연출 후 결과 화면.
  revealColors(boardEl, cur.puzzle.grid);
  setCursor(boardEl, -1, -1, cur.puzzle.size); // 커서 제거
  sound.play('clear');
  setTimeout(() => {
    renderResult(el('result-pic'), el('result-title'), el('result-stars'), cur.puzzle, stars);
    showScreen('result');
    sound.playStars(stars);
  }, 850);
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
    case ' ': case 'Enter': {
      cur.mode = MODE.FILL; setMode(MODE.FILL);
      cur.dragAction = decideAction(r, c); applyAction(r, c);
      if (isSolved(cur.board, cur.solution)) win();
      break;
    }
    case 'x': case 'X': {
      cur.mode = MODE.MARK; setMode(MODE.MARK);
      cur.dragAction = decideAction(r, c); applyAction(r, c);
      break;
    }
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
  document.addEventListener('keydown', onKey);

  // 사운드 초기화: 저장된 음소거 상태 적용 + 첫 제스처에서 오디오 깨우기 + 백그라운드 절전.
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
