// 플레이 보드 상태(불변) + 승리/실수 판정 (순수 함수).
// 상태 변경은 항상 새 객체를 반환하고 원본을 변형하지 않는다. docs/03_architecture.md.

import { CELL } from '../data/constants.js';
import { toMask } from './hints.js';

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

// 회색 힌트 클릭으로 한 줄의 남은 칸을 자동 확정한다.
// - 칠한 모양이 이미 정답과 같으면 남은 EMPTY를 X로 고정한다.
// - 남은 EMPTY가 모두 정답 칠칸이면(예: [15]) 그 칸들을 FILLED로 고정한다.
// 직접 입력해 둔 X/FILLED는 상태를 바꾸지 않고 잠그지도 않는다.
// 반환 cells는 연출 순서대로 바뀐 좌표다. 확정할 수 없으면 원본 board와 빈 배열을 반환한다.
export function autoCompleteLine(board, solution, type, idx) {
  const n = board.size;
  const at = (i) => (type === 'row' ? [idx, i] : [i, idx]);
  const changes = [];

  let allFilledMatch = true;
  let allRemainingFill = true;
  for (let i = 0; i < n; i++) {
    const [r, c] = at(i);
    const st = board.cells[r][c];
    const shouldFill = solution[r][c] === true;
    if ((st === CELL.FILLED) !== shouldFill) allFilledMatch = false;
    if (st === CELL.FILLED && !shouldFill) allRemainingFill = false;
    if (st === CELL.MARKED && shouldFill) allRemainingFill = false;
    if (st === CELL.EMPTY && !shouldFill) allRemainingFill = false;
  }

  const target = allFilledMatch ? CELL.MARKED
    : allRemainingFill ? CELL.FILLED
      : null;
  if (target === null) return { board, action: null, cells: changes };

  for (let i = 0; i < n; i++) {
    const [r, c] = at(i);
    if (board.cells[r][c] === CELL.EMPTY) changes.push([r, c]);
  }
  if (!changes.length) return { board, action: null, cells: changes };

  let cells = board.cells;
  let lockedCells = board.lockedCells;
  for (const [r, c] of changes) {
    cells = cells.map((row, ri) => (ri === r ? row.slice() : row));
    cells[r][c] = target;
    lockedCells = lockedCells.map((row, ri) => (ri === r ? row.slice() : row));
    lockedCells[r][c] = true;
  }
  return { board: { ...board, cells, lockedCells }, action: target === CELL.MARKED ? 'mark' : 'fill', cells: changes };
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
