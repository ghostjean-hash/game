import { suite, test, assertEqual, assertTrue } from '../core.js';
import { computeNumberStats, computeBonusStats, computeCooccur } from '../../src/core/stats.js';

const fixture = [
  { drwNo: 1, drwDate: '2026-01-03', numbers: [1, 2, 3, 4, 5, 6], bonus: 7, firstWinners: 0, firstPrize: 0, totalSales: 0 },
  { drwNo: 2, drwDate: '2026-01-10', numbers: [1, 2, 3, 7, 8, 9], bonus: 10, firstWinners: 0, firstPrize: 0, totalSales: 0 },
  { drwNo: 3, drwDate: '2026-01-17', numbers: [1, 10, 20, 30, 40, 45], bonus: 7, firstWinners: 0, firstPrize: 0, totalSales: 0 },
];

suite('core/stats - computeNumberStats', () => {
  test('빈 배열은 length 45 + 모두 0', () => {
    const s = computeNumberStats([]);
    assertEqual(s.length, 45);
    for (const x of s) {
      assertEqual(x.totalCount, 0);
      assertEqual(x.lastSeenDrw, 0);
    }
  });

  test('번호 1은 fixture에서 3회 출현', () => {
    const s = computeNumberStats(fixture);
    const one = s.find((x) => x.number === 1);
    assertEqual(one.totalCount, 3);
    assertEqual(one.lastSeenDrw, 3);
  });

  test('번호 45는 1회 (drwNo 3)', () => {
    const s = computeNumberStats(fixture);
    const x = s.find((n) => n.number === 45);
    assertEqual(x.totalCount, 1);
    assertEqual(x.lastSeenDrw, 3);
  });

  test('미출현 번호의 currentGap = total draws', () => {
    const s = computeNumberStats(fixture);
    const x = s.find((n) => n.number === 11);
    assertEqual(x.totalCount, 0);
    assertEqual(x.currentGap, 3);
  });

  test('번호 6은 drwNo 1 출현, currentGap = 2', () => {
    const s = computeNumberStats(fixture);
    const six = s.find((n) => n.number === 6);
    assertEqual(six.totalCount, 1);
    assertEqual(six.currentGap, 2);
  });
});

suite('core/stats - computeBonusStats', () => {
  test('보너스 7은 2회', () => {
    const s = computeBonusStats(fixture);
    const x = s.find((n) => n.number === 7);
    assertEqual(x.totalCount, 2);
  });

  test('본번호 7은 보너스 통계에 카운트되지 않음', () => {
    // drwNo 2의 본번호 7은 보너스가 아님
    const s = computeBonusStats(fixture);
    const x = s.find((n) => n.number === 7);
    assertEqual(x.totalCount, 2);
  });

  test('보너스 10은 1회', () => {
    const s = computeBonusStats(fixture);
    const x = s.find((n) => n.number === 10);
    assertEqual(x.totalCount, 1);
  });
});

suite('core/stats - computeCooccur', () => {
  test('페어 1-2는 2회 (drwNo 1, 2)', () => {
    const c = computeCooccur(fixture);
    const x = c.find((p) => p.a === 1 && p.b === 2);
    assertTrue(x !== undefined);
    assertEqual(x.count, 2);
  });

  test('페어 1-45는 1회', () => {
    const c = computeCooccur(fixture);
    const x = c.find((p) => p.a === 1 && p.b === 45);
    assertEqual(x.count, 1);
  });

  test('항상 a < b', () => {
    const c = computeCooccur(fixture);
    for (const p of c) {
      assertTrue(p.a < p.b);
    }
  });
});
