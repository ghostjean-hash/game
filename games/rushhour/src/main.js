// 진입점. 상태 관리 + UI 바인딩 + 모듈 조립(docs/03_architecture.md §3).

import { STORAGE_NS } from './data/constants.js';
import { PUZZLES } from './data/puzzles.js';
import { parseGrid, moveCar, isSolved, axisPos } from './core/board.js';
import { solve } from './core/solver.js';
import { buildBoard, syncPositions } from './render/render.js';
import { attachDrag } from './input/drag.js';
import { createStorage } from '../../../shared/storage.js';

const DIFF_LABEL = { beginner: '입문', easy: '쉬움', medium: '보통', hard: '어려움' };

const store = createStorage(STORAGE_NS);

const el = {
  board: document.getElementById('board'),
  label: document.getElementById('puzzle-label'),
  moves: document.getElementById('moves'),
  optimal: document.getElementById('optimal'),
  undo: document.getElementById('btn-undo'),
  reset: document.getElementById('btn-reset'),
  prev: document.getElementById('btn-prev'),
  next: document.getElementById('btn-next'),
  overlay: document.getElementById('overlay'),
  result: document.getElementById('result-text'),
  overlayNext: document.getElementById('btn-overlay-next'),
};

const state = {
  puzzleId: null,
  cars: [],
  els: null,
  moves: 0,
  history: [],
  optimal: null,
  solved: false,
};

function progress() {
  return store.get('progress', { cleared: [], best: {} });
}

function puzzleById(id) {
  return PUZZLES.find((p) => p.id === id);
}

function loadPuzzle(id) {
  const p = puzzleById(id) || PUZZLES[0];
  state.puzzleId = p.id;
  state.cars = parseGrid(p.grid);
  state.moves = 0;
  state.history = [];
  state.optimal = solve(state.cars);
  state.solved = false;
  state.els = buildBoard(el.board, state.cars);
  store.set('current', p.id);
  hideOverlay();
  render();
}

function render() {
  const p = puzzleById(state.puzzleId);
  const best = progress().best[state.puzzleId];
  el.label.textContent = `#${state.puzzleId} ${DIFF_LABEL[p.difficulty]}`;
  el.moves.textContent = String(state.moves);
  el.optimal.textContent = best != null ? `최소 ${state.optimal} · 최고 ${best}` : `최소 ${state.optimal}`;
  el.undo.disabled = state.history.length === 0 || state.solved;
  el.prev.disabled = state.puzzleId <= PUZZLES[0].id;
  el.next.disabled = state.puzzleId >= PUZZLES[PUZZLES.length - 1].id;
}

function onCommit(id, pos) {
  if (state.solved) return;
  state.history.push(state.cars);
  state.cars = moveCar(state.cars, id, pos);
  state.moves += 1;
  syncPositions(state.els, state.cars);
  render();
  if (isSolved(state.cars)) onSolved();
}

function onSolved() {
  state.solved = true;
  const pr = progress();
  if (!pr.cleared.includes(state.puzzleId)) pr.cleared.push(state.puzzleId);
  const prevBest = pr.best[state.puzzleId];
  if (prevBest == null || state.moves < prevBest) pr.best[state.puzzleId] = state.moves;
  store.set('progress', pr);

  const best = pr.best[state.puzzleId];
  const perfect = state.moves <= state.optimal;
  el.result.textContent = perfect
    ? `완벽! ${state.moves}수 (최소 ${state.optimal}수)`
    : `클리어! ${state.moves}수 · 최소 ${state.optimal}수 · 최고 ${best}수`;
  el.overlay.hidden = false;
  render();
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

function go(delta) {
  const idx = PUZZLES.findIndex((p) => p.id === state.puzzleId);
  const next = PUZZLES[idx + delta];
  if (next) loadPuzzle(next.id);
}

function hideOverlay() {
  el.overlay.hidden = true;
}

// 드래그는 보드에 한 번만 붙인다. 현재 상태는 getCars로 읽는다.
attachDrag(el.board, {
  getCars: () => state.cars,
  onCommit,
  isLocked: () => state.solved,
});

el.undo.addEventListener('click', undo);
el.reset.addEventListener('click', reset);
el.prev.addEventListener('click', () => go(-1));
el.next.addEventListener('click', () => go(1));
el.overlayNext.addEventListener('click', () => go(1));

loadPuzzle(store.get('current', PUZZLES[0].id));
