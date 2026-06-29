// 외부 라이브러리 없는 미니 테스트 러너 + 케이스.
// tests/test.html에서 로드하면 전체 자동 실행, 결과를 화면과 콘솔에 출력한다.

import {
  cellsOf, occupancy, slideRange, moveCar, isSolved, parseGrid, validatePuzzle, axisPos,
} from '../src/core/board.js';
import { solve, solveStep } from '../src/core/solver.js';
import { PUZZLES } from '../src/data/puzzles.js';
import { ORIENT } from '../src/data/constants.js';

const tests = [];
const test = (name, fn) => tests.push({ name, fn });
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || ''} expected=${b} got=${a}`); }

// --- core/board ---

test('cellsOf: 가로차는 같은 행, 세로차는 같은 열', () => {
  const h = cellsOf({ id: 'A', row: 1, col: 2, len: 3, orient: ORIENT.H });
  eq(h.length, 3);
  eq(h[2].row, 1); eq(h[2].col, 4);
  const v = cellsOf({ id: 'B', row: 0, col: 3, len: 2, orient: ORIENT.V });
  eq(v[1].row, 1); eq(v[1].col, 3);
});

test('parseGrid: 격자에서 방향/길이/좌표를 복원', () => {
  const cars = parseGrid(['......', '...A..', 'XX.A..', '......', '......', '......']);
  const x = cars.find((c) => c.id === 'X');
  const a = cars.find((c) => c.id === 'A');
  eq(x.orient, ORIENT.H); eq(x.len, 2); eq(x.row, 2); eq(x.col, 0);
  eq(a.orient, ORIENT.V); eq(a.len, 2); eq(a.row, 1); eq(a.col, 3);
});

test('occupancy: 점유 격자에 id가 채워짐', () => {
  const cars = parseGrid(['......', '......', 'XX....', '......', '......', '......']);
  const g = occupancy(cars);
  eq(g[2][0], 'X'); eq(g[2][1], 'X'); eq(g[2][2], null);
});

test('slideRange: 막힘 없는 가로차는 0..(size-len)', () => {
  const cars = parseGrid(['......', '......', 'XX....', '......', '......', '......']);
  const r = slideRange(cars, 'X');
  eq(r.min, 0); eq(r.max, 4);
});

test('slideRange: 앞 차에 막히면 그 앞까지만', () => {
  // X(2,0,2) 뒤로 막힘 없음, col3에 세로차 A가 row2 점유 → max는 col1
  const cars = parseGrid(['......', '...A..', 'XX.A..', '......', '......', '......']);
  const r = slideRange(cars, 'X');
  eq(r.min, 0); eq(r.max, 1);
});

test('moveCar: 불변(새 배열) + 범위 클램프', () => {
  const cars = parseGrid(['......', '......', 'XX....', '......', '......', '......']);
  const moved = moveCar(cars, 'X', 99);
  assert(moved !== cars, '새 배열을 반환해야 함');
  eq(cars.find((c) => c.id === 'X').col, 0, '원본 불변');
  eq(moved.find((c) => c.id === 'X').col, 4, '최대 칸으로 클램프');
});

test('isSolved: 빨간 차 오른쪽 끝이 가장자리면 클리어', () => {
  const before = parseGrid(['......', '......', 'XX....', '......', '......', '......']);
  assert(!isSolved(before), '시작은 미클리어');
  const after = moveCar(before, 'X', 4);
  assert(isSolved(after), '오른쪽 끝 도달은 클리어');
});

test('axisPos: 가로는 col, 세로는 row', () => {
  eq(axisPos({ orient: ORIENT.H, row: 2, col: 3 }), 3);
  eq(axisPos({ orient: ORIENT.V, row: 4, col: 1 }), 4);
});

// --- core/solver ---

test('solve: 한 수로 푸는 자명한 퍼즐', () => {
  const cars = parseGrid(['......', '......', 'XX....', '......', '......', '......']);
  eq(solve(cars), 1);
});

test('solve: 풀 수 없으면 null', () => {
  // 출구 행을 세로 트럭이 완전히 막고, 그 트럭이 빠질 공간이 없게.
  const cars = parseGrid(['...C..', '...C..', 'XX.C..', '...D..', '...D..', '...D..']);
  eq(solve(cars), null);
});

test('solveStep: 한 수로 푸는 퍼즐의 그 수를 반환', () => {
  const cars = parseGrid(['......', '......', 'XX....', '......', '......', '......']);
  const m = solveStep(cars);
  assert(m && m.id === 'X', 'X를 움직여야 함');
  assert(isSolved(moveCar(cars, m.id, m.pos)), '그 수로 클리어돼야 함');
});

test('solveStep: 이미 풀렸으면 null', () => {
  const cars = parseGrid(['......', '......', '....XX', '......', '......', '......']);
  eq(solveStep(cars), null);
});

test('solveStep: 풀 수 없으면 null', () => {
  const cars = parseGrid(['...C..', '...C..', 'XX.C..', '...D..', '...D..', '...D..']);
  eq(solveStep(cars), null);
});

test('solveStep: 반환한 수는 이동 가능 범위 안의 실제 이동', () => {
  const cars = parseGrid(['......', '...A..', 'XX.A..', '......', '......', '......']);
  const m = solveStep(cars);
  const r = slideRange(cars, m.id);
  assert(m.pos >= r.min && m.pos <= r.max, '이동 범위 안이어야 함');
  assert(m.pos !== axisPos(cars.find((c) => c.id === m.id)), '제자리가 아니어야 함');
});

test('solveStep: 첫 수를 두면 최소 수가 정확히 1 줄어든다(최적 수, 앞 40개 샘플)', () => {
  for (const p of PUZZLES.slice(0, 40)) {
    const cars = parseGrid(p.grid);
    const opt = solve(cars);
    const m = solveStep(cars);
    assert(m, `P${p.id} 첫 수 없음`);
    const optAfter = solve(moveCar(cars, m.id, m.pos));
    eq(optAfter, opt - 1, `P${p.id} 첫 수가 최적이 아님`);
  }
});

// --- 내장 퍼즐 전수 검증 ---

test('PUZZLES: id가 1부터 연속', () => {
  PUZZLES.forEach((p, i) => eq(p.id, i + 1, `index ${i}`));
});

test('PUZZLES: 모든 퍼즐이 유효(겹침/경계/빨간차)', () => {
  for (const p of PUZZLES) {
    const errs = validatePuzzle(parseGrid(p.grid));
    assert(errs.length === 0, `P${p.id}: ${errs.join('; ')}`);
  }
});

test('PUZZLES: 시작 상태는 미클리어', () => {
  for (const p of PUZZLES) {
    assert(!isSolved(parseGrid(p.grid)), `P${p.id} 시작부터 클리어 상태`);
  }
});

test('PUZZLES: 모두 풀 수 있고 최소 수 ≥ 1', () => {
  for (const p of PUZZLES) {
    const opt = solve(parseGrid(p.grid));
    assert(opt !== null && opt >= 1, `P${p.id} 풀 수 없음(opt=${opt})`);
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
  console.log(`[rushhour tests] ${failed ? 'FAIL' : 'PASS'} ${passed}/${results.length}`);
  return { passed, failed, total: results.length };
}
