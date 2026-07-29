// Sprint 012 / S2-T1: 역추첨 검증.
import { suite, test, assertEqual, assertTrue } from '../core.js';
import { reverseSearch, validateUserNumbers, findMatchingDraws } from '../../src/core/reverse.js';

const sampleDraws = [
  { drwNo: 100, drwDate: '2024-01-06', numbers: [1, 2, 3, 4, 5, 6], bonus: 7 },
  { drwNo: 101, drwDate: '2024-01-13', numbers: [10, 20, 30, 40, 41, 42], bonus: 1 },
  { drwNo: 102, drwDate: '2024-01-20', numbers: [1, 2, 3, 7, 8, 9], bonus: 4 },
];

suite('core/reverse - validateUserNumbers', () => {
  test('정상 6개', () => {
    const r = validateUserNumbers([1, 2, 3, 4, 5, 6]);
    assertTrue(r.valid);
  });
  test('5개는 실패', () => {
    const r = validateUserNumbers([1, 2, 3, 4, 5]);
    assertEqual(r.valid, false);
  });
  test('범위 초과 실패', () => {
    const r = validateUserNumbers([1, 2, 3, 4, 5, 46]);
    assertEqual(r.valid, false);
  });
  test('중복 실패', () => {
    const r = validateUserNumbers([1, 2, 3, 4, 5, 5]);
    assertEqual(r.valid, false);
  });
});

suite('core/reverse - reverseSearch', () => {
  test('빈 draws 반환', () => {
    const r = reverseSearch([1, 2, 3, 4, 5, 6], []);
    assertEqual(r.bestRank, null);
    assertEqual(r.total, 0);
  });

  test('1등 매칭 (정확히 6개 일치)', () => {
    const r = reverseSearch([1, 2, 3, 4, 5, 6], sampleDraws);
    assertEqual(r.bestRank, 1);
    assertEqual(r.bestDraw.drwNo, 100);
    assertEqual(r.counts[1], 1);
  });

  test('미적중', () => {
    const r = reverseSearch([11, 12, 13, 14, 15, 16], sampleDraws);
    assertEqual(r.bestRank, null);
    assertEqual(r.counts.miss, 3);
  });

  test('5등 (3개 일치) - 동률 2회 (drw 100 + drw 102)', () => {
    // 입력: [1, 2, 3, 11, 12, 13]
    // drw 100 [1,2,3,4,5,6]: 1,2,3 일치 = 5등 (보너스 7도 입력에 없음)
    // drw 101 [10,20,30,40,41,42]: 0개 일치 = 미적중
    // drw 102 [1,2,3,7,8,9]: 1,2,3 일치 = 5등 (보너스 4도 입력에 없음)
    const r = reverseSearch([1, 2, 3, 11, 12, 13], sampleDraws);
    assertEqual(r.counts[5], 2);
    assertEqual(r.bestRank, 5);
  });

  test('동률 시 가장 최근 회차', () => {
    // 1,2,3 입력 → drw 100, 102 모두 5등 매칭. 더 최근(102) 반환.
    const r = reverseSearch([1, 2, 3, 11, 12, 13], sampleDraws);
    assertEqual(r.bestDraw.drwNo, 102);
    assertEqual(r.bestRankCount, 2);
  });

  test('counts 합계 = total', () => {
    const r = reverseSearch([1, 2, 3, 4, 5, 6], sampleDraws);
    const sum = r.counts[1] + r.counts[2] + r.counts[3] + r.counts[4] + r.counts[5] + r.counts.miss;
    assertEqual(sum, sampleDraws.length);
  });

  test('보너스 일치 = 2등 판별', () => {
    // 입력 [1,2,3,4,5,7] → drw 100 (1,2,3,4,5 일치 + 7은 발표 보너스) = 2등
    const r = reverseSearch([1, 2, 3, 4, 5, 7], sampleDraws);
    assertEqual(r.bestRank, 2);
  });
});

// S5-T3: 동률 다회차 모두 반환.
suite('core/reverse - findMatchingDraws (S5-T3)', () => {
  test('5등 동률 매칭 회차 모두 반환 (drwNo 내림차순)', () => {
    const matched = findMatchingDraws([1, 2, 3, 11, 12, 13], sampleDraws, 5);
    assertEqual(matched.length, 2);
    // drw 102가 더 최근 → 첫 번째
    assertEqual(matched[0].drwNo, 102);
    assertEqual(matched[1].drwNo, 100);
  });

  test('1등 매칭 1건만 반환', () => {
    const matched = findMatchingDraws([1, 2, 3, 4, 5, 6], sampleDraws, 1);
    assertEqual(matched.length, 1);
    assertEqual(matched[0].drwNo, 100);
  });

  test('매칭 0건이면 빈 배열', () => {
    const matched = findMatchingDraws([1, 2, 3, 4, 5, 6], sampleDraws, 3);
    assertEqual(matched.length, 0);
  });

  test('잘못된 rank는 빈 배열', () => {
    assertEqual(findMatchingDraws([1, 2, 3, 4, 5, 6], sampleDraws, 0).length, 0);
    assertEqual(findMatchingDraws([1, 2, 3, 4, 5, 6], sampleDraws, 6).length, 0);
    assertEqual(findMatchingDraws([1, 2, 3, 4, 5, 6], sampleDraws, null).length, 0);
  });

  test('빈 draws는 빈 배열', () => {
    assertEqual(findMatchingDraws([1, 2, 3, 4, 5, 6], [], 1).length, 0);
  });
});
