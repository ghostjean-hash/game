import { createBoard, openCell, toggleFlag, chord, serialize, restore } from '../src/core/board.js';
import { CELL_STATE, GAME } from '../src/data/constants.js';
import { runGameHarness } from './gameHarness.js';

const results = document.querySelector('#results');
let failed = 0;
function test(name, fn) {
  const line = document.createElement('p');
  try { fn(); line.className = 'pass'; line.textContent = `PASS · ${name}`; }
  catch (error) { failed += 1; line.className = 'fail'; line.textContent = `FAIL · ${name} — ${error.message}`; }
  results.appendChild(line);
}
function ok(value, message = '조건이 거짓입니다') { if (!value) throw new Error(message); }

test('첫 탭 칸과 이웃 여덟 칸에는 지뢰가 없다', () => {
  const board = createBoard({ w: 9, h: 9, mines: 10, key: 'easy' }); openCell(board, 4, 4, () => 0.37);
  [4, 3, 5].forEach((x) => [4, 3, 5].forEach((y) => ok(!board.cells[y * 9 + x].mine)));
});
test('0 칸은 이어진 빈 영역과 경계 숫자까지 연다', () => {
  const board = createBoard({ w: 3, h: 3, mines: 1, key: 'test' }); openCell(board, 2, 2, () => 0.99);
  ok(board.cells.filter((cell) => cell.state === CELL_STATE.OPEN).length === 8);
});
test('깃발 칸은 열리지 않고 같은 조작으로 빠진다', () => {
  const board = createBoard({ w: 9, h: 9, mines: 10, key: 'easy' }); ok(toggleFlag(board, 0, 0)); openCell(board, 0, 0); ok(board.status === GAME.READY); ok(toggleFlag(board, 0, 0));
});
test('빠른 열기는 깃발 수가 숫자와 같을 때만 주변을 연다', () => {
  const board = createBoard({ w: 3, h: 3, mines: 1, key: 'test' });
  board.placed = true; board.status = GAME.PLAYING; board.cells[0].mine = true;
  board.cells.forEach((cell, idx) => { const x = idx % 3; const y = Math.floor(idx / 3); cell.adjacent = (x <= 1 && y <= 1) ? 1 : 0; });
  board.cells[4].state = CELL_STATE.OPEN; toggleFlag(board, 0, 0);
  const result = chord(board, 1, 1); ok(result.won && board.status === GAME.WON);
});
test('직렬화한 판은 같은 상태로 복원된다', () => {
  const board = createBoard({ w: 9, h: 9, mines: 10, key: 'easy' }); openCell(board, 4, 4, () => 0); const copy = restore(serialize(board)); ok(copy && copy.cells.length === board.cells.length && copy.placed);
});
runGameHarness(test, ok);
document.title = failed ? `FAIL (${failed})` : 'PASS';
