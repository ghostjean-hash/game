// 줄 논리(line solving) 솔버 + 유일해/추측불필요 검증 + 난이도 지표 (순수 함수).
// 내장 조건(docs/02_data.md 3.2): 힌트만으로 추측 없이 전 칸이 확정되어야 하며,
// 그 경우 해는 유일하다(각 확정은 모든 유효 배치의 교집합이므로).

import { makeClues, toMask } from './hints.js';

// 셀 확정 상태.
const UNKNOWN = -1;
const EMPTY = 0;
const FILLED = 1;

// clue 블록들을 길이 len 줄에 놓는 모든 유효 배치를 생성(0=빈칸,1=채움).
function* linePlacements(clue, len) {
  // 빈 줄([0])은 전부 빈칸 한 가지.
  if (clue.length === 1 && clue[0] === 0) {
    yield new Array(len).fill(EMPTY);
    return;
  }
  const blocks = clue;
  const total = blocks.reduce((a, b) => a + b, 0);
  const slack = len - total - (blocks.length - 1); // 자유 공백(내부 최소1 제외)
  if (slack < 0) return; // 애초에 안 들어감

  // blocks.length+1개 간격(앞/내부들/뒤)에 slack을 0 이상으로 분배.
  yield* build([], slack);

  function* build(gaps, remaining) {
    if (gaps.length === blocks.length) {
      // 마지막(뒤) 간격에 남은 전부.
      yield assemble([...gaps, remaining]);
      return;
    }
    for (let g = 0; g <= remaining; g++) {
      yield* build([...gaps, g], remaining - g);
    }
  }

  function assemble(gaps) {
    const line = [];
    for (let i = 0; i < gaps[0]; i++) line.push(EMPTY);
    for (let j = 0; j < blocks.length; j++) {
      for (let k = 0; k < blocks[j]; k++) line.push(FILLED);
      if (j < blocks.length - 1) {
        const inner = 1 + gaps[j + 1]; // 내부 간격 최소 1
        for (let k = 0; k < inner; k++) line.push(EMPTY);
      }
    }
    for (let i = 0; i < gaps[gaps.length - 1]; i++) line.push(EMPTY);
    return line;
  }
}

// 배치가 현재 알려진 줄 상태와 호환되는가.
function compatible(placement, cur) {
  for (let i = 0; i < cur.length; i++) {
    if (cur[i] !== UNKNOWN && cur[i] !== placement[i]) return false;
  }
  return true;
}

// 한 줄을 clue로 최대한 확정. 반환: 새 줄 상태 또는 null(모순=유효 배치 0).
function solveLine(clue, cur) {
  let allFilled = null; // 모든 호환 배치에서 채움인 칸
  let allEmpty = null;  // 모든 호환 배치에서 빈칸인 칸
  let any = false;
  for (const p of linePlacements(clue, cur.length)) {
    if (!compatible(p, cur)) continue;
    any = true;
    if (allFilled === null) {
      allFilled = p.map((v) => v === FILLED);
      allEmpty = p.map((v) => v === EMPTY);
    } else {
      for (let i = 0; i < p.length; i++) {
        if (p[i] !== FILLED) allFilled[i] = false;
        if (p[i] !== EMPTY) allEmpty[i] = false;
      }
    }
  }
  if (!any) return null;
  const out = cur.slice();
  for (let i = 0; i < out.length; i++) {
    if (allFilled[i]) out[i] = FILLED;
    else if (allEmpty[i]) out[i] = EMPTY;
  }
  return out;
}

// rowClues/colClues로 줄 논리 전파. 변화 없을 때까지 반복.
// 반환: { solvable, contradiction, grid(확정 상태), rounds }
export function solve(rowClues, colClues, size) {
  let grid = Array.from({ length: size }, () => new Array(size).fill(UNKNOWN));
  let rounds = 0;
  let contradiction = false;

  for (;;) {
    let changed = false;

    for (let r = 0; r < size; r++) {
      const next = solveLine(rowClues[r], grid[r]);
      if (next === null) { contradiction = true; break; }
      for (let c = 0; c < size; c++) {
        if (next[c] !== grid[r][c]) { grid[r][c] = next[c]; changed = true; }
      }
    }
    if (contradiction) break;

    for (let c = 0; c < size; c++) {
      const col = grid.map((row) => row[c]);
      const next = solveLine(colClues[c], col);
      if (next === null) { contradiction = true; break; }
      for (let r = 0; r < size; r++) {
        if (next[r] !== grid[r][c]) { grid[r][c] = next[r]; changed = true; }
      }
    }
    if (contradiction) break;

    rounds += 1;
    if (!changed) break;
  }

  const determined = !contradiction && grid.every((row) => row.every((v) => v !== UNKNOWN));
  return { solvable: determined, contradiction, grid, rounds };
}

// 그림 격자 하나가 내장 조건을 만족하는지 검증.
// 반환: { ok, lineSolvable, unique, matches, rounds, difficultyRounds }
export function verifyPuzzle(grid) {
  const size = grid.length;
  const mask = toMask(grid); // boolean 2D
  const { rowClues, colClues } = makeClues(grid);
  const res = solve(rowClues, colClues, size);

  // 줄 논리로 전 칸 확정되면 추측 불필요이며 해가 유일하다.
  const lineSolvable = res.solvable;

  // 확정된 해가 원본 그림과 일치하는지(안전장치).
  let matches = lineSolvable;
  if (lineSolvable) {
    for (let r = 0; r < size && matches; r++) {
      for (let c = 0; c < size; c++) {
        const solverFilled = res.grid[r][c] === FILLED;
        if (solverFilled !== mask[r][c]) { matches = false; break; }
      }
    }
  }

  return {
    ok: lineSolvable && matches,
    lineSolvable,
    unique: lineSolvable, // 줄 논리 완전 확정 == 유일해
    matches,
    rounds: res.rounds,
    difficultyRounds: res.rounds, // 난이도 지표(전파 라운드 수)
  };
}
