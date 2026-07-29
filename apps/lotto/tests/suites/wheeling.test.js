import { suite, test, assertEqual, assertTrue } from '../core.js';
import { fullWheel, abbreviatedWheel, combinationCount, isCovering4if4 } from '../../src/core/wheeling.js';

suite('core/wheeling - combinationCount', () => {
  test('C(7,6) = 7', () => assertEqual(combinationCount(7, 6), 7));
  test('C(8,6) = 28', () => assertEqual(combinationCount(8, 6), 28));
  test('C(9,6) = 84', () => assertEqual(combinationCount(9, 6), 84));
  test('C(12,6) = 924', () => assertEqual(combinationCount(12, 6), 924));
  test('C(45,6) = 8145060', () => assertEqual(combinationCount(45, 6), 8145060));
  test('C(0,0) = 1', () => assertEqual(combinationCount(0, 0), 1));
  test('C(5,6) = 0', () => assertEqual(combinationCount(5, 6), 0));
});

suite('core/wheeling - fullWheel', () => {
  test('풀 6개 = 1 티켓', () => {
    const w = fullWheel([1, 2, 3, 4, 5, 6]);
    assertEqual(w.ticketCount, 1);
    assertEqual(w.tickets[0].length, 6);
  });
  test('풀 7개 = 7 티켓', () => {
    const w = fullWheel([1, 2, 3, 4, 5, 6, 7]);
    assertEqual(w.ticketCount, 7);
  });
  test('풀 8개 = 28 티켓', () => {
    const w = fullWheel([1, 2, 3, 4, 5, 6, 7, 8]);
    assertEqual(w.ticketCount, 28);
  });
  test('풀 9개 = 84 티켓', () => {
    const w = fullWheel([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assertEqual(w.ticketCount, 84);
  });
  test('5개 미만 풀은 에러', () => {
    let threw = false;
    try { fullWheel([1, 2, 3, 4, 5]); } catch { threw = true; }
    assertTrue(threw);
  });
  test('범위 외 번호 (0) 에러', () => {
    let threw = false;
    try { fullWheel([0, 1, 2, 3, 4, 5, 6]); } catch { threw = true; }
    assertTrue(threw);
  });
  test('범위 외 번호 (46) 에러', () => {
    let threw = false;
    try { fullWheel([1, 2, 3, 4, 5, 6, 46]); } catch { threw = true; }
    assertTrue(threw);
  });
  test('중복 번호 에러', () => {
    let threw = false;
    try { fullWheel([1, 1, 2, 3, 4, 5, 6]); } catch { threw = true; }
    assertTrue(threw);
  });
  test('각 티켓은 정렬', () => {
    const w = fullWheel([5, 1, 3, 8, 2, 6, 4]);
    for (const t of w.tickets) {
      for (let i = 1; i < t.length; i += 1) {
        assertTrue(t[i - 1] < t[i]);
      }
    }
  });
  test('각 티켓은 중복 없음', () => {
    const w = fullWheel([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const t of w.tickets) {
      assertEqual(new Set(t).size, 6);
    }
  });
  test('모든 티켓이 풀 안에서 나옴', () => {
    const pool = [1, 2, 3, 4, 5, 6, 7];
    const w = fullWheel(pool);
    const poolSet = new Set(pool);
    for (const t of w.tickets) {
      for (const n of t) {
        assertTrue(poolSet.has(n));
      }
    }
  });
  test('풀 정렬', () => {
    const w = fullWheel([5, 1, 3, 8, 2, 6, 4]);
    assertEqual(w.pool[0], 1);
    assertEqual(w.pool[w.pool.length - 1], 8);
  });
  test('1등 보장 메시지 포함', () => {
    const w = fullWheel([1, 2, 3, 4, 5, 6, 7]);
    assertTrue(w.guarantee.hit6.message.includes('1등'));
  });
  test('Full Wheel은 4-if-4 보장 자동 통과', () => {
    const w = fullWheel([1, 2, 3, 4, 5, 6, 7, 8]);
    assertTrue(w.isCovering4if4 === true);
  });
});

suite('core/wheeling - abbreviatedWheel', () => {
  test('요청 티켓 수만큼 반환', () => {
    const w = abbreviatedWheel([1, 2, 3, 4, 5, 6, 7, 8], 10, 42);
    assertEqual(w.ticketCount, 10);
  });
  test('Full 이상 요청 시 Full 반환', () => {
    const w = abbreviatedWheel([1, 2, 3, 4, 5, 6, 7], 100, 42);
    assertEqual(w.ticketCount, 7);
    assertTrue(w.isCovering4if4 === true);
  });
  test('결정론: 같은 (pool, count, seed) = 같은 티켓', () => {
    const a = abbreviatedWheel([1, 2, 3, 4, 5, 6, 7, 8], 10, 42);
    const b = abbreviatedWheel([1, 2, 3, 4, 5, 6, 7, 8], 10, 42);
    assertEqual(a.tickets.length, b.tickets.length);
    for (let i = 0; i < a.tickets.length; i += 1) {
      for (let j = 0; j < a.tickets[i].length; j += 1) {
        assertEqual(a.tickets[i][j], b.tickets[i][j]);
      }
    }
  });
  test('seed 다르면 다른 결과', () => {
    const a = abbreviatedWheel([1, 2, 3, 4, 5, 6, 7, 8], 5, 42);
    const b = abbreviatedWheel([1, 2, 3, 4, 5, 6, 7, 8], 5, 123);
    const aStr = a.tickets.map((t) => t.join(',')).sort().join('|');
    const bStr = b.tickets.map((t) => t.join(',')).sort().join('|');
    assertTrue(aStr !== bStr);
  });
  test('isCovering4if4 boolean', () => {
    const w = abbreviatedWheel([1, 2, 3, 4, 5, 6, 7, 8], 5, 42);
    assertTrue(typeof w.isCovering4if4 === 'boolean');
  });
  test('각 티켓은 풀 안 + 정렬', () => {
    const pool = [3, 7, 12, 18, 22, 28, 33, 41];
    const w = abbreviatedWheel(pool, 10, 42);
    const poolSet = new Set(pool);
    for (const t of w.tickets) {
      assertEqual(t.length, 6);
      for (const n of t) assertTrue(poolSet.has(n));
      for (let i = 1; i < t.length; i += 1) assertTrue(t[i - 1] < t[i]);
    }
  });
});

suite('core/wheeling - isCovering4if4', () => {
  test('Full Wheel 8풀 - 통과', () => {
    const w = fullWheel([1, 2, 3, 4, 5, 6, 7, 8]);
    assertTrue(isCovering4if4(w.tickets, w.pool));
  });
  test('단일 티켓 - 미통과 (8풀)', () => {
    assertTrue(isCovering4if4([[1, 2, 3, 4, 5, 6]], [1, 2, 3, 4, 5, 6, 7, 8]) === false);
  });
});
