// 외부 라이브러리 없는 미니 테스트 러너 + 케이스.
// tests/test.html에서 로드하면 전체 자동 실행, 결과를 화면과 콘솔에 출력한다.

import { lineClue, rowClues, colClues, makeClues, isFilled } from '../src/core/hints.js';
import { solve, verifyPuzzle } from '../src/core/solver.js';
import { createBoard, toSolution, toggleFill, toggleMark, setCell, isSolved } from '../src/core/board.js';
import { starsFor } from '../src/core/stars.js';
import { CELL, MAX_STARS } from '../src/data/constants.js';
import { PUZZLES } from '../src/data/puzzles.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || ''} expected=${b} got=${a}`); }
function eqArr(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || ''} expected=${JSON.stringify(b)} got=${JSON.stringify(a)}`);
}

// --- 셋업 스모크 ---
test('러너가 동작한다', () => { assert(true); eq(1 + 1, 2); });

// --- hints ---
test('isFilled: 0은 빈칸, 1 이상은 칠함', () => {
  eq(isFilled(0), false); eq(isFilled(1), true); eq(isFilled(9), true);
});
test('lineClue: 연속 묶음 길이', () => {
  eqArr(lineClue([1, 1, 1, 0, 1]), [3, 1]);
  eqArr(lineClue([0, 0, 0]), [0]);
  eqArr(lineClue([1, 0, 1, 0, 1]), [1, 1, 1]);
  eqArr(lineClue([3, 3, 0, 5]), [2, 1], '색 인덱스도 채움으로 카운트');
});
test('rowClues/colClues: 방향', () => {
  const g = [[1, 0], [1, 1]];
  eqArr(rowClues(g), [[1], [2]]);
  eqArr(colClues(g), [[2], [1]]);
});
test('makeClues: 묶음', () => {
  const { rowClues: rc, colClues: cc } = makeClues([[1, 1], [0, 1]]);
  eqArr(rc, [[2], [1]]); eqArr(cc, [[1], [2]]);
});

// --- solver ---
test('solve: 단순 격자를 줄 논리로 확정', () => {
  const g = [[1, 0], [1, 1]];
  const { rowClues: rc, colClues: cc } = makeClues(g);
  const res = solve(rc, cc, 2);
  eq(res.solvable, true);
});
test('verifyPuzzle: 줄 논리로 풀리는 퍼즐은 ok + unique', () => {
  const v = verifyPuzzle([
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ]);
  eq(v.ok, true); eq(v.unique, true); eq(v.matches, true);
});
test('verifyPuzzle: 추측 필요한 모양은 ok=false', () => {
  // 대각 2점 모양은 힌트가 같은 다른 배치를 허용 → 줄 논리로 확정 불가.
  const v = verifyPuzzle([
    [1, 0],
    [0, 1],
  ]);
  eq(v.ok, false);
  eq(v.lineSolvable, false);
});

// --- board ---
test('createBoard: 전부 EMPTY', () => {
  const b = createBoard(3);
  eq(b.size, 3); eq(b.mistakes, 0);
  eq(b.cells.every((row) => row.every((c) => c === CELL.EMPTY)), true);
});
test('toggleFill: 칠함/지움 + 원본 불변', () => {
  const b0 = createBoard(2);
  const sol = toSolution([[1, 0], [0, 0]]);
  const b1 = toggleFill(b0, 0, 0, sol);
  eq(b1.cells[0][0], CELL.FILLED);
  eq(b0.cells[0][0], CELL.EMPTY, '원본 불변');
  const b2 = toggleFill(b1, 0, 0, sol);
  eq(b2.cells[0][0], CELL.EMPTY, '다시 탭하면 지움');
});
test('실수: 정답 빈칸을 칠하면 카운트, 유니크', () => {
  const b0 = createBoard(2);
  const sol = toSolution([[1, 0], [0, 0]]); // (0,1)은 정답 빈칸
  const wrong1 = toggleFill(b0, 0, 1, sol);
  eq(wrong1.mistakes, 1);
  const cleared = toggleFill(wrong1, 0, 1, sol); // 지움
  const wrongAgain = toggleFill(cleared, 0, 1, sol); // 같은 칸 다시
  eq(wrongAgain.mistakes, 1, '같은 칸은 유니크 카운트');
  const right = toggleFill(b0, 0, 0, sol); // 정답 칸
  eq(right.mistakes, 0, '정답 칸은 실수 아님');
});
test('toggleMark: X는 실수 아님', () => {
  const b0 = createBoard(2);
  const b1 = toggleMark(b0, 0, 1);
  eq(b1.cells[0][1], CELL.MARKED); eq(b1.mistakes, 0);
});
test('setCell: 드래그 설정', () => {
  const b0 = createBoard(2);
  const sol = toSolution([[1, 1], [0, 0]]);
  const b1 = setCell(b0, 0, 0, CELL.FILLED, sol);
  eq(b1.cells[0][0], CELL.FILLED);
  eq(setCell(b1, 0, 0, CELL.FILLED, sol), b1, '같은 상태면 무변화(동일 참조)');
});
test('isSolved: 칠함 여부만 정답과 일치하면 승리(X 무관)', () => {
  const grid = [[1, 0], [1, 1]];
  const sol = toSolution(grid);
  let b = createBoard(2);
  b = toggleFill(b, 0, 0, sol);
  b = toggleMark(b, 0, 1); // 정답 빈칸에 X - 승리 무관
  b = toggleFill(b, 1, 0, sol);
  eq(isSolved(b, sol), false);
  b = toggleFill(b, 1, 1, sol);
  eq(isSolved(b, sol), true);
});

// --- stars ---
test('starsFor: 경계', () => {
  eq(starsFor(0), MAX_STARS);
  eq(starsFor(2), MAX_STARS - 1);
  eq(starsFor(3), 1);
  eq(starsFor(10), 1);
});

// --- 내장 퍼즐 전수 검증 (내장 조건: 줄 논리 유일해) ---
test(`내장 퍼즐 ${PUZZLES.length}개 전수: 유일해 + 추측 불필요`, () => {
  const ids = new Set();
  for (const p of PUZZLES) {
    assert(!ids.has(p.id), `중복 id: ${p.id}`);
    ids.add(p.id);
    eq(p.grid.length, p.size, `${p.id} 행 수 = size`);
    assert(p.grid.every((row) => row.length === p.size), `${p.id} 각 행 길이 = size`);
    const v = verifyPuzzle(p.grid);
    assert(v.ok, `${p.id} 검증 실패 (lineSolvable=${v.lineSolvable} matches=${v.matches})`);
  }
});

// --- 실행 ---
export function runAll() {
  const results = [];
  for (const t of tests) {
    try { t.fn(); results.push({ name: t.name, ok: true }); }
    catch (e) { results.push({ name: t.name, ok: false, error: e.message }); }
  }
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  const root = document.getElementById('out');
  if (root) {
    root.innerHTML = `<h2 id="summary" class="${failed ? 'fail' : 'pass'}">${failed ? 'FAIL' : 'PASS'} — ${passed}/${results.length}</h2>` +
      results.map((r) =>
        `<div class="row ${r.ok ? 'pass' : 'fail'}">${r.ok ? '✓' : '✗'} ${r.name}${r.error ? ` — ${r.error}` : ''}</div>`,
      ).join('');
  }
  for (const r of results) {
    if (!r.ok) console.error(`FAIL: ${r.name} — ${r.error}`);
  }
  console.log(`[nonogram tests] ${failed ? 'FAIL' : 'PASS'} ${passed}/${results.length}`);
  return { passed, failed, total: results.length };
}
