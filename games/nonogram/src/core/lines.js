// 행/열 완성 판정 (순수 함수). 어떤 줄의 칠한 모양이 그 줄 힌트와 일치하면 "완성".
// 완성한 줄은 힌트를 흐리게 + 칭찬에 쓴다. docs/03_architecture.md.

import { CELL } from '../data/constants.js';
import { lineClue } from './hints.js';

const rowFilled = (cells, r) => cells[r].map((v) => (v === CELL.FILLED ? 1 : 0));
const colFilled = (cells, c) => cells.map((row) => (row[c] === CELL.FILLED ? 1 : 0));
const clueEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// 빈 줄(힌트 [0])은 흐리게 표시할 숫자가 없으므로 완성으로 치지 않는다.
function done(filledLine, clue) {
  if (clue.length === 1 && clue[0] === 0) return false;
  return clueEq(lineClue(filledLine), clue);
}

// board + 힌트 → { rows:[bool], cols:[bool] } 완성 여부.
export function lineFlags(board, clues) {
  const n = board.size;
  const rows = [];
  const cols = [];
  for (let r = 0; r < n; r++) rows.push(done(rowFilled(board.cells, r), clues.rowClues[r]));
  for (let c = 0; c < n; c++) cols.push(done(colFilled(board.cells, c), clues.colClues[c]));
  return { rows, cols };
}

// 완성된 줄의 개수(칭찬 판정용).
export function completedCount(flags) {
  return flags.rows.filter(Boolean).length + flags.cols.filter(Boolean).length;
}
