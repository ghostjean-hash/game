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
  const cur = board.cells[r][c];
  const next = cur === CELL.MARKED ? CELL.EMPTY : CELL.MARKED;
  return { ...board, cells: withCell(board, r, c, next) };
}

// 드래그용: 칸을 특정 상태로 설정(같으면 무변화). FILLED 설정 시 실수 판정.
export function setCell(board, r, c, target, solution) {
  if (board.cells[r][c] === target) return board;
  const cells = withCell(board, r, c, target);
  if (target === CELL.FILLED) {
    const m = recordMistake(board, r, c, solution);
    return { ...board, cells, mistakes: m.mistakes, mistakenKeys: m.mistakenKeys };
  }
  return { ...board, cells };
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
  return { size: board.size, cells: board.cells, mistakes: board.mistakes, mistakenKeys: board.mistakenKeys };
}
export function deserializeBoard(data) {
  if (!data || !Array.isArray(data.cells)) return null;
  return {
    size: data.size,
    cells: data.cells.map((row) => row.slice()),
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
