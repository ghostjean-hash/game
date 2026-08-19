// 플레이 보드 상태(불변) + 승리/실수 판정 (순수 함수).
// 상태 변경은 항상 새 객체를 반환하고 원본을 변형하지 않는다. docs/03_architecture.md.

import { CELL } from '../data/constants.js';
import { toMask, lineClue } from './hints.js';

// 그림 격자 → 채움 여부(boolean) 정답 마스크. board 판정에 쓴다.
export function toSolution(grid) {
  return toMask(grid);
}

// 빈 보드 생성. cells는 전부 EMPTY.
export function createBoard(size) {
  return {
    size,
    cells: Array.from({ length: size }, () => new Array(size).fill(CELL.EMPTY)),
    // 회색 힌트 클릭으로 자동 확정한 칸만 잠근다. 직접 입력한 X는 false라 다시 고칠 수 있다.
    lockedCells: Array.from({ length: size }, () => new Array(size).fill(false)),
    mistakes: 0,
    mistakenKeys: [], // 실수로 칠한 칸 좌표('r,c') 유니크 목록
  };
}

// cells 2D를 얕게 복사(불변 갱신용, 해당 행만 교체).
function withCell(board, r, c, value) {
  const cells = board.cells.map((row, ri) => (ri === r ? row.slice() : row));
  cells[r][c] = value;
  return cells;
}

export function isLocked(board, r, c) {
  return !!board.lockedCells?.[r]?.[c];
}

// 실수 기록: 정답이 빈칸인 칸을 새로 FILLED로 만들면 유니크 카운트.
function recordMistake(board, r, c, solution) {
  const key = `${r},${c}`;
  const isWrong = solution[r][c] === false; // 정답이 빈칸인데 칠함
  if (!isWrong || board.mistakenKeys.includes(key)) {
    return { mistakes: board.mistakes, mistakenKeys: board.mistakenKeys };
  }
  const mistakenKeys = [...board.mistakenKeys, key];
  return { mistakes: mistakenKeys.length, mistakenKeys };
}

// 칠하기 토글: FILLED면 지움(EMPTY), 아니면 FILLED.
export function toggleFill(board, r, c, solution) {
  if (isLocked(board, r, c)) return board;
  const cur = board.cells[r][c];
  if (cur === CELL.FILLED) {
    return { ...board, cells: withCell(board, r, c, CELL.EMPTY) };
  }
  const cells = withCell(board, r, c, CELL.FILLED);
  const m = recordMistake(board, r, c, solution);
  return { ...board, cells, mistakes: m.mistakes, mistakenKeys: m.mistakenKeys };
}

// X 토글: MARKED면 지움(EMPTY), 아니면 MARKED. 실수 아님.
export function toggleMark(board, r, c) {
  if (isLocked(board, r, c)) return board;
  const cur = board.cells[r][c];
  const next = cur === CELL.MARKED ? CELL.EMPTY : CELL.MARKED;
  return { ...board, cells: withCell(board, r, c, next) };
}

// 드래그용: 칸을 특정 상태로 설정(같으면 무변화). FILLED 설정 시 실수 판정.
export function setCell(board, r, c, target, solution) {
  if (isLocked(board, r, c)) return board;
  if (board.cells[r][c] === target) return board;
  const cells = withCell(board, r, c, target);
  if (target === CELL.FILLED) {
    const m = recordMistake(board, r, c, solution);
    return { ...board, cells, mistakes: m.mistakes, mistakenKeys: m.mistakenKeys };
  }
  return { ...board, cells };
}

const clueEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// 힌트와 현재 표시만으로 한 줄을 기계적으로 자동 입력한다.
// 정답은 입력 가능 여부를 결정하지 않고, 바뀐 칸의 오답 기록·잠금에만 쓴다.
// 반환 path는 줄 전체 좌표라, 렌더가 이미 채워진 칸/X를 건너뛰지 않고 같은 파도로 훑는다.
export function autoCompleteLine(board, solution, clues, type, idx) {
  const n = board.size;
  const at = (i) => (type === 'row' ? [idx, i] : [i, idx]);
  const clue = type === 'row' ? clues.rowClues[idx] : clues.colClues[idx];
  const path = Array.from({ length: n }, (_, i) => at(i));
  const filled = path.map(([r, c]) => board.cells[r][c] === CELL.FILLED ? 1 : 0);
  const filledCount = filled.reduce((sum, value) => sum + value, 0);
  const emptyCount = path.filter(([r, c]) => board.cells[r][c] === CELL.EMPTY).length;
  const clueTotal = clue.reduce((sum, value) => sum + value, 0);

  // X: 칠한 묶음 자체가 힌트와 맞으면 남은 빈칸을 X로. (회색 힌트와 같은 판정)
  const canMark = clueEq(lineClue(filled), clue);
  // 칠하기: X는 경계로 보존하고, 비-X 빈칸 수가 남은 칠하기 수와 정확히 같을 때만.
  const canFill = filledCount <= clueTotal && emptyCount === clueTotal - filledCount;
  const target = canMark ? CELL.MARKED : canFill ? CELL.FILLED : null;
  if (target === null || emptyCount === 0) return { board, action: null, cells: [], path };

  const changes = path.filter(([r, c]) => board.cells[r][c] === CELL.EMPTY);
  let cells = board.cells;
  let lockedCells = board.lockedCells;
  let mistakes = board.mistakes;
  let mistakenKeys = board.mistakenKeys;
  for (const [r, c] of changes) {
    cells = cells.map((row, ri) => (ri === r ? row.slice() : row));
    cells[r][c] = target;
    const correct = target === CELL.FILLED ? solution[r][c] === true : solution[r][c] === false;
    if (correct) {
      lockedCells = lockedCells.map((row, ri) => (ri === r ? row.slice() : row));
      lockedCells[r][c] = true;
    }
    if (target === CELL.FILLED && !correct) {
      const key = `${r},${c}`;
      if (!mistakenKeys.includes(key)) {
        mistakenKeys = [...mistakenKeys, key];
        mistakes = mistakenKeys.length;
      }
    }
  }
  return {
    board: { ...board, cells, lockedCells, mistakes, mistakenKeys },
    action: target === CELL.MARKED ? 'mark' : 'fill', cells: changes, path,
  };
}

// 도움: 아직 정답과 다른 첫 줄(행 우선)을 정답대로 채운다(칠할 칸 FILLED, 나머지 EMPTY).
// 도움으로 채운 것은 실수로 세지 않는다. 이미 다 맞았으면 원본 그대로.
export function revealLine(board, solution) {
  const n = board.size;
  for (let r = 0; r < n; r++) {
    let need = false;
    for (let c = 0; c < n; c++) {
      if ((board.cells[r][c] === CELL.FILLED) !== solution[r][c]) { need = true; break; }
    }
    if (need) {
      const cells = board.cells.map((row, ri) =>
        (ri === r ? row.map((_, c) => (solution[r][c] ? CELL.FILLED : CELL.EMPTY)) : row));
      return { ...board, cells };
    }
  }
  return board;
}

// 저장/복원용: 보드를 최소 데이터로 직렬화 / 역직렬화.
export function serializeBoard(board) {
  return {
    size: board.size, cells: board.cells, lockedCells: board.lockedCells,
    mistakes: board.mistakes, mistakenKeys: board.mistakenKeys,
  };
}
export function deserializeBoard(data) {
  if (!data || !Array.isArray(data.cells)) return null;
  const size = data.size;
  const validLocks = Array.isArray(data.lockedCells) && data.lockedCells.length === size &&
    data.lockedCells.every((row) => Array.isArray(row) && row.length === size);
  return {
    size,
    cells: data.cells.map((row) => row.slice()),
    lockedCells: validLocks
      ? data.lockedCells.map((row) => row.map(Boolean))
      : Array.from({ length: size }, () => new Array(size).fill(false)),
    mistakes: data.mistakes || 0,
    mistakenKeys: Array.isArray(data.mistakenKeys) ? data.mistakenKeys.slice() : [],
  };
}

// 승리 판정: 모든 칸에서 (칠함 여부) === (정답 채움 여부). X/EMPTY 구분은 무관.
export function isSolved(board, solution) {
  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      const filled = board.cells[r][c] === CELL.FILLED;
      if (filled !== solution[r][c]) return false;
    }
  }
  return true;
}
