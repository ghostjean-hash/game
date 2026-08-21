export const TILE = Object.freeze({ CLOSED: 'closed', OPEN: 'open', MARKED: 'marked' });
export const BOARD_STATUS = Object.freeze({ READY: 'ready', PLAYING: 'playing', WON: 'won', LOST: 'lost' });
const STEPS = Object.freeze([[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]);
const indexAt = (board, x, y) => y * board.w + x;
const valid = (board, x, y) => x >= 0 && x < board.w && y >= 0 && y < board.h;
const adjacent = (board, x, y) => STEPS.map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => valid(board, nx, ny));
const clone = (board) => JSON.parse(JSON.stringify(board));

export function createFruitBoard({ w = 5, h = 5, fruits = 10 } = {}) {
  return { w, h, fruits, placed: false, status: BOARD_STATUS.READY, cells: Array.from({ length: w * h }, () => ({ fruit: null, clue: 0, tile: TILE.CLOSED })) };
}
function clear(board) { board.cells.forEach((cell) => { cell.fruit = null; cell.clue = 0; cell.tile = TILE.CLOSED; }); }
function countClues(board) { board.cells.forEach((cell, index) => { const x = index % board.w; const y = Math.floor(index / board.w); cell.clue = adjacent(board, x, y).filter(([nx, ny]) => board.cells[indexAt(board, nx, ny)].fruit).length; }); }
function virtualOpen(board, tiles, index) {
  const queue = [index];
  while (queue.length) { const next = queue.pop(); if (tiles[next] !== TILE.CLOSED || board.cells[next].fruit) continue; tiles[next] = TILE.OPEN; if (board.cells[next].clue) continue; const x = next % board.w; const y = Math.floor(next / board.w); adjacent(board, x, y).forEach(([nx, ny]) => queue.push(indexAt(board, nx, ny))); }
}
function solvable(board, first) {
  const tiles = board.cells.map(() => TILE.CLOSED); virtualOpen(board, tiles, first);
  let changed = true;
  while (changed) {
    changed = false; const mark = new Set(); const open = new Set();
    board.cells.forEach((cell, index) => {
      if (tiles[index] !== TILE.OPEN || !cell.clue) return;
      const x = index % board.w; const y = Math.floor(index / board.w); const around = adjacent(board, x, y).map(([nx, ny]) => indexAt(board, nx, ny));
      const closed = around.filter((next) => tiles[next] === TILE.CLOSED); const marked = around.filter((next) => tiles[next] === TILE.MARKED).length; const left = cell.clue - marked;
      if (closed.length && left === 0) closed.forEach((next) => open.add(next));
      if (closed.length && left === closed.length) closed.forEach((next) => mark.add(next));
    });
    mark.forEach((index) => { if (tiles[index] === TILE.CLOSED) { tiles[index] = TILE.MARKED; changed = true; } });
    open.forEach((index) => { if (tiles[index] === TILE.CLOSED) { virtualOpen(board, tiles, index); changed = true; } });
  }
  return board.cells.every((cell, index) => cell.fruit || tiles[index] === TILE.OPEN);
}
function place(board, x, y, rng) {
  if (board.placed) return;
  const protectedTiles = new Set(adjacent(board, x, y).concat([[x, y]]).map(([nx, ny]) => indexAt(board, nx, ny)));
  const first = indexAt(board, x, y);
  for (let attempt = 0; attempt < 256; attempt += 1) {
    clear(board); const choices = board.cells.map((_, index) => index).filter((index) => !protectedTiles.has(index));
    for (let left = board.fruits; left; left -= 1) { const roll = (rng() + attempt * 0.61803398875) % 1; const pick = Math.floor(roll * choices.length); const index = choices.splice(pick, 1)[0]; board.cells[index].fruit = left > 4 ? 'apple' : 'berry'; }
    countClues(board); if (solvable(board, first)) { board.placed = true; board.status = BOARD_STATUS.PLAYING; return; }
  }
  throw new Error('무추측 과일 판을 만들지 못했습니다');
}
function reveal(board, index, opened) { const cell = board.cells[index]; if (cell.tile !== TILE.CLOSED) return; cell.tile = TILE.OPEN; opened.push(index); if (cell.clue) return; const x = index % board.w; const y = Math.floor(index / board.w); adjacent(board, x, y).forEach(([nx, ny]) => reveal(board, indexAt(board, nx, ny), opened)); }
function won(board) { const safe = board.cells.filter((cell) => !cell.fruit && cell.tile === TILE.OPEN).length; const fruitMarked = board.cells.filter((cell) => cell.fruit).every((cell) => cell.tile === TILE.MARKED); if (safe !== board.cells.length - board.fruits || !fruitMarked) return false; board.status = BOARD_STATUS.WON; return true; }
export function openTile(board, x, y, rng = Math.random) {
  if (!valid(board, x, y) || board.status === BOARD_STATUS.WON || board.status === BOARD_STATUS.LOST) return { opened: [], won: false, lost: false };
  if (!board.placed) place(board, x, y, rng); const index = indexAt(board, x, y); const cell = board.cells[index];
  if (cell.tile === TILE.MARKED) return { opened: [], won: false, lost: false };
  if (cell.fruit) { board.status = BOARD_STATUS.LOST; cell.hit = true; return { opened: [], won: false, lost: true }; }
  const opened = []; reveal(board, index, opened); return { opened, won: won(board), lost: false };
}
export function toggleHarvest(board, x, y) { if (!valid(board, x, y) || board.status === BOARD_STATUS.WON || board.status === BOARD_STATUS.LOST) return false; const cell = board.cells[indexAt(board, x, y)]; if (cell.tile === TILE.OPEN) return false; cell.tile = cell.tile === TILE.MARKED ? TILE.CLOSED : TILE.MARKED; won(board); return true; }
export function harvestReward(board) { return board.cells.reduce((result, cell) => { if (cell.fruit === 'apple') result.apple += 1; if (cell.fruit === 'berry') result.berry += 1; return result; }, { apple: 0, berry: 0 }); }
export function snapshot(board) { return clone(board); }
