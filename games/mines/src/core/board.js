import { CELL_STATE, GAME, NEIGHBORS } from '../data/constants.js';

function idxOf(board, x, y) { return y * board.w + x; }
function inside(board, x, y) { return x >= 0 && x < board.w && y >= 0 && y < board.h; }

export function neighbors(board, x, y) {
  return NEIGHBORS.map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => inside(board, nx, ny));
}

export function createBoard({ w, h, mines, key }) {
  return {
    w, h, mines, key, placed: false, status: GAME.READY,
    cells: Array.from({ length: w * h }, () => ({ mine: false, adjacent: 0, state: CELL_STATE.CLOSED })),
  };
}

export function placeMines(board, x, y, rng = Math.random) {
  if (board.placed) return board;
  const protectedCells = new Set(neighbors(board, x, y).concat([[x, y]]).map(([nx, ny]) => idxOf(board, nx, ny)));
  const choices = board.cells.map((_, idx) => idx).filter((idx) => !protectedCells.has(idx));
  for (let left = board.mines; left > 0; left -= 1) {
    const pick = Math.floor(rng() * choices.length);
    const idx = choices.splice(pick, 1)[0];
    board.cells[idx].mine = true;
  }
  board.cells.forEach((cell, idx) => {
    const cx = idx % board.w;
    const cy = Math.floor(idx / board.w);
    cell.adjacent = neighbors(board, cx, cy).filter(([nx, ny]) => board.cells[idxOf(board, nx, ny)].mine).length;
  });
  board.placed = true;
  return board;
}

function reveal(board, x, y, opened) {
  const cell = board.cells[idxOf(board, x, y)];
  if (cell.state !== CELL_STATE.CLOSED) return;
  cell.state = CELL_STATE.OPEN;
  opened.push([x, y]);
  if (cell.adjacent !== 0) return;
  neighbors(board, x, y).forEach(([nx, ny]) => reveal(board, nx, ny, opened));
}

function finishIfWon(board) {
  const safeOpen = board.cells.filter((cell) => !cell.mine && cell.state === CELL_STATE.OPEN).length;
  if (safeOpen !== board.cells.length - board.mines) return false;
  board.status = GAME.WON;
  board.cells.forEach((cell) => { if (cell.mine) cell.state = CELL_STATE.FLAG; });
  return true;
}

function lose(board, x, y) {
  board.status = GAME.LOST;
  board.cells[idxOf(board, x, y)].hit = true;
  return { opened: [], hit: [x, y], lost: true, won: false };
}

export function openCell(board, x, y, rng = Math.random) {
  if (!inside(board, x, y) || board.status === GAME.WON || board.status === GAME.LOST) return { opened: [], won: false, lost: false };
  const cell = board.cells[idxOf(board, x, y)];
  if (cell.state === CELL_STATE.FLAG) return { opened: [], won: false, lost: false };
  if (!board.placed) {
    // 첫 칸을 여는 바로 그 순간에만 배치하고 시간도 시작한다(01_spec.md 3.2, 3.8).
    placeMines(board, x, y, rng);
    start(board);
  }
  if (cell.state === CELL_STATE.OPEN) return chord(board, x, y);
  if (cell.mine) return lose(board, x, y);
  const opened = [];
  reveal(board, x, y, opened);
  return { opened, won: finishIfWon(board), lost: false };
}

export function toggleFlag(board, x, y) {
  if (!inside(board, x, y) || board.status === GAME.WON || board.status === GAME.LOST) return false;
  const cell = board.cells[idxOf(board, x, y)];
  if (cell.state === CELL_STATE.OPEN) return false;
  cell.state = cell.state === CELL_STATE.FLAG ? CELL_STATE.CLOSED : CELL_STATE.FLAG;
  return true;
}

export function chord(board, x, y) {
  if (!inside(board, x, y) || board.status !== GAME.PLAYING) return { opened: [], won: false, lost: false };
  const cell = board.cells[idxOf(board, x, y)];
  if (cell.state !== CELL_STATE.OPEN || cell.adjacent === 0) return { opened: [], won: false, lost: false };
  const around = neighbors(board, x, y);
  if (around.filter(([nx, ny]) => board.cells[idxOf(board, nx, ny)].state === CELL_STATE.FLAG).length !== cell.adjacent) return { opened: [], won: false, lost: false };
  const opened = [];
  for (const [nx, ny] of around) {
    const next = board.cells[idxOf(board, nx, ny)];
    if (next.state !== CELL_STATE.CLOSED) continue;
    if (next.mine) return lose(board, nx, ny);
    reveal(board, nx, ny, opened);
  }
  return { opened, won: finishIfWon(board), lost: false };
}

export function start(board) { if (board.status === GAME.READY) board.status = GAME.PLAYING; }
export function countFlags(board) { return board.cells.filter((cell) => cell.state === CELL_STATE.FLAG).length; }
export function serialize(board) { return JSON.parse(JSON.stringify(board)); }
export function restore(value) {
  if (!value || !Number.isInteger(value.w) || !Number.isInteger(value.h) || !Array.isArray(value.cells) || value.cells.length !== value.w * value.h) return null;
  return value;
}
