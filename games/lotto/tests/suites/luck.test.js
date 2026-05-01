import { suite, test, assertEqual, assertTrue, assertDeepEqual } from '../core.js';
import { preferredNumbers, applyLuck, applyLuckGrowth, rankLuckBonus } from '../../src/core/luck.js';
import { LUCK_MAX, WEIGHT_MAX_BIAS, NUMBER_MAX } from '../../src/data/numbers.js';

function uniform45() {
  return new Array(NUMBER_MAX).fill(1);
}

suite('core/luck - preferredNumbers', () => {
  test('기본 길이 6', () => {
    assertEqual(preferredNumbers(42).length, 6);
  });

  test('오름차순 정렬', () => {
    const arr = preferredNumbers(42);
    for (let i = 1; i < arr.length; i += 1) {
      assertTrue(arr[i - 1] < arr[i], 'must be ascending');
    }
  });

  test('1~45 범위 + 중복 없음', () => {
    const arr = preferredNumbers(42);
    const set = new Set(arr);
    assertEqual(set.size, arr.length);
    for (const n of arr) {
      assertTrue(n >= 1 && n <= 45);
    }
  });

  test('같은 시드는 같은 결과', () => {
    assertDeepEqual(preferredNumbers(42), preferredNumbers(42));
  });

  test('다른 시드는 다른 결과', () => {
    const a = preferredNumbers(42);
    const b = preferredNumbers(43);
    const aStr = a.join(',');
    const bStr = b.join(',');
    assertTrue(aStr !== bStr, `same: ${aStr}`);
  });
});

suite('core/luck - applyLuck', () => {
  test('Luck 0: 모든 weight 동일 (uniform 입력)', () => {
    const result = applyLuck(uniform45(), 42, 0);
    const first = result[0];
    for (const w of result) assertEqual(w, first);
  });

  test('Luck 100: 선호 6개만 boost = WEIGHT_MAX_BIAS', () => {
    const result = applyLuck(uniform45(), 42, LUCK_MAX);
    let boostedCount = 0;
    let normalCount = 0;
    for (const w of result) {
      if (w === WEIGHT_MAX_BIAS) boostedCount += 1;
      else if (w === 1) normalCount += 1;
    }
    assertEqual(boostedCount, 6);
    assertEqual(normalCount, 45 - 6);
  });

  test('Luck 50: boost 중간값', () => {
    const result = applyLuck(uniform45(), 42, 50);
    const expectedBoost = 1 + 0.5 * (WEIGHT_MAX_BIAS - 1);
    let boostedCount = 0;
    for (const w of result) {
      if (Math.abs(w - expectedBoost) < 1e-9) boostedCount += 1;
    }
    assertEqual(boostedCount, 6);
  });

  test('결정성: 같은 입력 = 같은 출력', () => {
    const a = applyLuck(uniform45(), 42, 50);
    const b = applyLuck(uniform45(), 42, 50);
    assertDeepEqual(a, b);
  });

  test('Luck 음수 / 초과 clamp', () => {
    const a = applyLuck(uniform45(), 42, -10);
    const b = applyLuck(uniform45(), 42, 0);
    assertDeepEqual(a, b);
    const c = applyLuck(uniform45(), 42, 200);
    const d = applyLuck(uniform45(), 42, LUCK_MAX);
    assertDeepEqual(c, d);
  });
});

suite('core/luck - applyLuckGrowth', () => {
  test('미발표(matchedRank=null) 항목은 luck 변화 없음', () => {
    const ch = { luck: 10, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: null }] };
    assertEqual(applyLuckGrowth(ch).luck, 10);
  });

  test('5등 적중 = +2', () => {
    const ch = { luck: 10, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: 5, luckApplied: false }] };
    assertEqual(applyLuckGrowth(ch).luck, 12);
  });

  test('4등 = +5', () => {
    const ch = { luck: 10, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: 4, luckApplied: false }] };
    assertEqual(applyLuckGrowth(ch).luck, 15);
  });

  test('1등 = +20', () => {
    const ch = { luck: 10, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: 1, luckApplied: false }] };
    assertEqual(applyLuckGrowth(ch).luck, 30);
  });

  test('적용 후 luckApplied=true 잠금', () => {
    const ch = { luck: 10, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: 5, luckApplied: false }] };
    const r = applyLuckGrowth(ch);
    assertTrue(r.history[0].luckApplied === true);
  });

  test('재호출 시 중복 적용 안 됨', () => {
    let ch = { luck: 10, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: 5, luckApplied: false }] };
    ch = applyLuckGrowth(ch);
    ch = applyLuckGrowth(ch);
    assertEqual(ch.luck, 12);
  });

  test('Luck 100 cap', () => {
    const ch = { luck: 95, history: [{ drwNo: 1, numbers: [], bonus: 0, matchedRank: 1, luckApplied: false }] };
    assertEqual(applyLuckGrowth(ch).luck, 100);
  });

  test('여러 항목 누적', () => {
    const ch = {
      luck: 10,
      history: [
        { drwNo: 1, numbers: [], bonus: 0, matchedRank: 5, luckApplied: false },
        { drwNo: 2, numbers: [], bonus: 0, matchedRank: 4, luckApplied: false },
      ],
    };
    assertEqual(applyLuckGrowth(ch).luck, 17);
  });

  test('rankLuckBonus 룩업', () => {
    assertEqual(rankLuckBonus(1), 20);
    assertEqual(rankLuckBonus(5), 2);
    assertEqual(rankLuckBonus(null), 0);
  });
});
