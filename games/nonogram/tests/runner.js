// 외부 라이브러리 없는 미니 테스트 러너 + 케이스.
// tests/test.html에서 로드하면 전체 자동 실행, 결과를 화면과 콘솔에 출력한다.

import { lineClue, rowClues, colClues, makeClues, isFilled } from '../src/core/hints.js';
import { solve, verifyPuzzle } from '../src/core/solver.js';
import {
  createBoard, toSolution, toggleFill, toggleMark, setCell, isSolved, isLocked, autoCompleteLine,
  revealLine, serializeBoard, deserializeBoard,
} from '../src/core/board.js';
import { lineFlags, completedCount } from '../src/core/lines.js';
import { starsFor } from '../src/core/stars.js';
import { fitCellSize, clampCell, zoomScroll, planBoardFit, distance, midpoint } from '../src/core/zoom.js';
import { CELL, MAX_STARS, ZOOM, CELL_FIT } from '../src/data/constants.js';
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
test('autoCompleteLine: 완성 줄의 남은 빈칸을 잠긴 X로 확정', () => {
  const sol = toSolution([[1, 0, 1]]);
  let b = createBoard(3);
  b = setCell(b, 0, 0, CELL.FILLED, sol);
  b = setCell(b, 0, 2, CELL.FILLED, sol);
  const result = autoCompleteLine(b, sol, 'row', 0);
  eq(result.action, 'mark');
  eqArr(result.cells, [[0, 1]]);
  eq(result.board.cells[0][1], CELL.MARKED);
  eq(isLocked(result.board, 0, 1), true);
  eq(toggleFill(result.board, 0, 1, sol), result.board, '자동 X는 칠하기로 덮지 못함');
});
test('autoCompleteLine: 남은 칸이 전부 칠칸이면 잠긴 칠하기로 확정', () => {
  const sol = toSolution([[1, 1, 1]]); // 힌트 3: 빈 판에서도 전부 확정 가능
  let b = createBoard(3);
  b = setCell(b, 0, 0, CELL.FILLED, sol); // 일부를 이미 칠한 경우도 포함
  const result = autoCompleteLine(b, sol, 'row', 0);
  eq(result.action, 'fill');
  eqArr(result.cells, [[0, 1], [0, 2]]);
  eqArr(result.board.cells[0], [CELL.FILLED, CELL.FILLED, CELL.FILLED]);
  eq(isLocked(result.board, 0, 1), true);
});
test('autoCompleteLine: 직접 입력한 X는 잠그지 않아 다시 칠할 수 있다', () => {
  const sol = toSolution([[1, 1]]);
  let b = createBoard(2);
  b = toggleMark(b, 0, 0);
  eq(isLocked(b, 0, 0), false);
  b = toggleFill(b, 0, 0, sol);
  eq(b.cells[0][0], CELL.FILLED);
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

// --- lines (완성 줄 판정) ---
test('lineFlags: 채운 줄이 힌트와 맞으면 완성', () => {
  const grid = [[1, 0], [1, 1]];
  const clues = makeClues(grid);
  const sol = toSolution(grid);
  let b = createBoard(2);
  eqArr(lineFlags(b, clues).rows, [false, false], '빈 보드는 완성 없음');
  b = setCell(b, 1, 0, CELL.FILLED, sol);
  b = setCell(b, 1, 1, CELL.FILLED, sol); // 아래 행 [1,1] 완성
  eq(lineFlags(b, clues).rows[1], true, '아래 행 완성');
  eq(lineFlags(b, clues).rows[0], false, '위 행 아직');
});
test('completedCount: 완성 줄 총합', () => {
  const flags = { rows: [true, false], cols: [true, true] };
  eq(completedCount(flags), 3);
});

// --- 도움 / 저장 ---
test('revealLine: 첫 미완성 행을 정답대로 채움(실수 아님)', () => {
  const grid = [[1, 0], [0, 1]];
  const sol = toSolution(grid);
  const b0 = createBoard(2);
  const b1 = revealLine(b0, sol);
  eq(b1.cells[0][0], CELL.FILLED, '정답 칠칸');
  eq(b1.cells[0][1], CELL.EMPTY, '정답 빈칸');
  eq(b1.mistakes, 0, '도움은 실수 아님');
  eq(b0.cells[0][0], CELL.EMPTY, '원본 불변');
});
test('serialize/deserialize: 라운드트립 보존', () => {
  const grid = [[1, 0], [1, 1]];
  const sol = toSolution(grid);
  let b = createBoard(2);
  b = setCell(b, 0, 1, CELL.FILLED, sol); // 실수 하나
  const round = deserializeBoard(serializeBoard(b));
  eq(round.size, 2); eq(round.mistakes, 1);
  eq(round.cells[0][1], CELL.FILLED);
  eq(round.lockedCells.every((row) => row.every((v) => v === false)), true, '예전 저장은 잠금 없음으로 보정');
  eq(deserializeBoard(null), null, '깨진 데이터는 null');
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

// --- zoom (확대·이동 계산) ---
const IPHONE_MINI = {   // 아이폰 미니 세로에서 실측한 가용 공간·힌트 크기(docs/06 1장)
  availW: 359, availH: 600, clueW: 70, clueH: 70,
  gutter: CELL_FIT.GUTTER_PX, minPx: CELL_FIT.MIN_PX,
  fitMin: ZOOM.FIT_MIN_PX, startPx: ZOOM.START_PX,
};

test('fitCellSize: 폭·높이 중 좁은 쪽이 셀 크기를 정한다', () => {
  const base = { availH: 1000, clueH: 0, marginRight: 0, gutter: 0, minPx: 1 };
  eq(fitCellSize({ ...base, availW: 100, clueW: 0, n: 10 }), 10, '폭 병목');
  eq(fitCellSize({ ...base, availW: 1000, availH: 50, clueW: 0, n: 10 }), 5, '높이 병목');
});
test('fitCellSize: 힌트·여백·둘레를 뺀 나머지로 계산한다', () => {
  eq(fitCellSize({ availW: 200, availH: 999, clueW: 40, clueH: 0, marginRight: 40, n: 10, gutter: 20, minPx: 1 }), 10);
});
test('fitCellSize: 상한·바닥값을 지킨다', () => {
  const base = { availH: 9999, clueW: 0, clueH: 0, marginRight: 0, n: 5, gutter: 0 };
  eq(fitCellSize({ ...base, availW: 9999, minPx: 1, maxPx: 44 }), 44, '상한');
  eq(fitCellSize({ ...base, availW: 10, minPx: 12 }), 12, '바닥값');
});
test('clampCell: 범위 안으로 자르고, 하한이 상한보다 크면 하한을 쓴다', () => {
  eq(clampCell(30, 20, 60), 30);
  eq(clampCell(10, 20, 60), 20, '하한');
  eq(clampCell(90, 20, 60), 60, '상한');
  eq(clampCell(30, 80, 60), 80, '전체가 보이는 상태가 우선');
});
test('zoomScroll: 확대해도 초점의 칸이 제자리에 남는다', () => {
  // 힌트 70 + 칸 3개(20px) 자리를 초점으로 잡고 2배로 확대 → 같은 칸이 여전히 초점에 있어야 한다.
  const next = zoomScroll({ scroll: 0, focus: 130, clueLen: 70, oldCell: 20, newCell: 40 });
  eq(next, 60, '새 스크롤');
  eq(70 + 3 * 40 - next, 130, '초점 위치 유지(칸 3번이 그대로 초점에)');
});
test('zoomScroll: 크게 축소해 스크롤이 음수가 되면 0으로 자른다', () => {
  eq(zoomScroll({ scroll: 0, focus: 200, clueLen: 70, oldCell: 40, newCell: 10 }), 0);
});
test('distance/midpoint: 두 손가락 거리와 중점', () => {
  eq(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  const m = midpoint({ x: 0, y: 10 }, { x: 4, y: 20 });
  eq(m.x, 2); eq(m.y, 15);
});
test('planBoardFit: 다 들어가고 누를 수도 있으면 전체 맞춤(이동 없음)', () => {
  const p = planBoardFit({ ...IPHONE_MINI, marginRight: 70, n: 5, maxPx: 92 });
  eq(p.pannable, false);
  assert(p.cell >= ZOOM.FIT_MIN_PX, '손가락 기준 이상');
  eq(p.cell, p.minCell, '전체 맞춤이라 축소 하한과 같다');
  eq(p.marginRight, 70, '여백을 걷어낼 이유가 없다');
});
test('planBoardFit: 여백 때문에 칸이 작아지면 여백부터 버린다(폭 회수)', () => {
  // 10칸 판: 여백 70을 그대로 두면 21px(손가락 기준 미달) → 여백을 버려 28px 확보.
  const p = planBoardFit({ ...IPHONE_MINI, marginRight: 70, n: 10, maxPx: 60 });
  eq(p.marginRight, 0, '여백 회수');
  eq(p.pannable, false, '회수만으로 손가락 기준을 넘으면 전체 맞춤 유지');
  assert(p.cell >= ZOOM.FIT_MIN_PX, `회수 후 ${p.cell}px`);
});
test('planBoardFit: 여백을 버려도 작으면 확대·이동 모드로 넘긴다', () => {
  // 15칸 판: 여백을 버려도 18px이라 손가락으로 못 누른다.
  const p = planBoardFit({ ...IPHONE_MINI, marginRight: 70, n: 15, maxPx: 44 });
  eq(p.pannable, true);
  eq(p.cell, ZOOM.START_PX, '손가락으로 누를 수 있는 크기로 시작');
  assert(p.minCell < ZOOM.FIT_MIN_PX, '축소 하한 = 전체가 들어가는 크기');
  assert(p.minCell >= CELL_FIT.MIN_PX, '바닥값 이상');
  eq(p.marginRight, 0);
});
test('planBoardFit: 축소 하한은 확대 상한(maxPx)에 눌리지 않는다', () => {
  // 15칸 판 하한은 "전체가 들어가는 크기"라야 오므리기 한 번이 전체 보기가 된다.
  const p = planBoardFit({ ...IPHONE_MINI, marginRight: 70, n: 15, maxPx: 44 });
  const whole = fitCellSize({ ...IPHONE_MINI, marginRight: 0, clueW: 70, clueH: 70, n: 15 });
  eq(p.minCell, whole);
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
