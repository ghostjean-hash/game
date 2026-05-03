import { suite, test, assertEqual, assertTrue, assertDeepEqual } from '../core.js';
import {
  ensureSavedSetsForRound, addSavedSets, removeSavedSetAt, clearSavedSets,
  hasSameNumbers, recipeIdFor,
} from '../../src/core/saved-sets.js';
import { SAVED_SETS_CAP } from '../../src/data/numbers.js';

function makeChar(overrides = {}) {
  return { id: 'c1', seed: 12345, savedSets: undefined, ...overrides };
}
function makeSet(numbers, sids = ['blessed']) {
  return { numbers, strategyIds: sids, strategySources: sids.slice(0, numbers.length) };
}

suite('core/saved-sets - ensureSavedSetsForRound', () => {
  test('savedSets 부재 시 빈 구조 생성, reset=false', () => {
    const r = ensureSavedSetsForRound(makeChar(), 1223);
    assertDeepEqual(r.character.savedSets, { drwNo: 1223, list: [] });
    assertEqual(r.reset, false);
  });

  test('같은 drwNo면 그대로 반환', () => {
    const c = { id: 'c1', savedSets: { drwNo: 1223, list: [{ numbers: [1, 2, 3, 4, 5, 6] }] } };
    const r = ensureSavedSetsForRound(c, 1223);
    assertEqual(r.character, c);
    assertEqual(r.reset, false);
  });

  test('drwNo 변경 시 list 비움 + reset=true (이전 list 비어있지 않음)', () => {
    const c = { id: 'c1', savedSets: { drwNo: 1222, list: [{ numbers: [1, 2, 3, 4, 5, 6] }] } };
    const r = ensureSavedSetsForRound(c, 1223);
    assertEqual(r.character.savedSets.drwNo, 1223);
    assertEqual(r.character.savedSets.list.length, 0);
    assertEqual(r.reset, true);
  });

  test('drwNo 변경 시 list 비움 + reset=false (이전 list 비어있음)', () => {
    const c = { id: 'c1', savedSets: { drwNo: 1222, list: [] } };
    const r = ensureSavedSetsForRound(c, 1223);
    assertEqual(r.character.savedSets.drwNo, 1223);
    assertEqual(r.reset, false);
  });
});

suite('core/saved-sets - addSavedSets', () => {
  test('빈 list에 1세트 추가', () => {
    const c = ensureSavedSetsForRound(makeChar(), 1223).character;
    const r = addSavedSets(c, [makeSet([1, 2, 3, 4, 5, 6])]);
    assertEqual(r.addedCount, 1);
    assertEqual(r.character.savedSets.list.length, 1);
    assertDeepEqual(r.character.savedSets.list[0].numbers, [1, 2, 3, 4, 5, 6]);
  });

  test('동일 numbers는 중복 차단 + duplicate 카운트', () => {
    let c = ensureSavedSetsForRound(makeChar(), 1223).character;
    c = addSavedSets(c, [makeSet([1, 2, 3, 4, 5, 6])]).character;
    const r = addSavedSets(c, [makeSet([1, 2, 3, 4, 5, 6])]);
    assertEqual(r.addedCount, 0);
    assertEqual(r.skipped.duplicate, 1);
    assertEqual(r.character.savedSets.list.length, 1);
  });

  test('cap 도달 시 더 추가 차단', () => {
    let c = ensureSavedSetsForRound(makeChar(), 1223).character;
    // cap 채우기 (서로 다른 numbers)
    const sets = [];
    for (let i = 0; i < SAVED_SETS_CAP; i += 1) {
      sets.push(makeSet([i + 1, i + 2, i + 3, i + 4, i + 5, i + 6]));
    }
    c = addSavedSets(c, sets).character;
    assertEqual(c.savedSets.list.length, SAVED_SETS_CAP);
    // 추가 시도 → cap 차단
    const r = addSavedSets(c, [makeSet([100, 101, 102, 103, 104, 105])]);
    assertEqual(r.addedCount, 0);
    assertEqual(r.skipped.cap, 1);
    assertEqual(r.character.savedSets.list.length, SAVED_SETS_CAP);
  });

  test('한 번에 여러 세트 추가 - 일부 중복은 skip', () => {
    let c = ensureSavedSetsForRound(makeChar(), 1223).character;
    c = addSavedSets(c, [makeSet([1, 2, 3, 4, 5, 6])]).character;
    const r = addSavedSets(c, [
      makeSet([1, 2, 3, 4, 5, 6]),  // dup
      makeSet([7, 8, 9, 10, 11, 12]), // new
      makeSet([13, 14, 15, 16, 17, 18]), // new
    ]);
    assertEqual(r.addedCount, 2);
    assertEqual(r.skipped.duplicate, 1);
    assertEqual(r.character.savedSets.list.length, 3);
  });
});

suite('core/saved-sets - removeSavedSetAt + clearSavedSets', () => {
  test('인덱스로 1개 삭제', () => {
    let c = ensureSavedSetsForRound(makeChar(), 1223).character;
    c = addSavedSets(c, [
      makeSet([1, 2, 3, 4, 5, 6]),
      makeSet([7, 8, 9, 10, 11, 12]),
      makeSet([13, 14, 15, 16, 17, 18]),
    ]).character;
    c = removeSavedSetAt(c, 1);
    assertEqual(c.savedSets.list.length, 2);
    assertDeepEqual(c.savedSets.list[0].numbers, [1, 2, 3, 4, 5, 6]);
    assertDeepEqual(c.savedSets.list[1].numbers, [13, 14, 15, 16, 17, 18]);
  });

  test('범위 밖 인덱스는 무동작', () => {
    let c = ensureSavedSetsForRound(makeChar(), 1223).character;
    c = addSavedSets(c, [makeSet([1, 2, 3, 4, 5, 6])]).character;
    const before = c.savedSets.list.length;
    c = removeSavedSetAt(c, 99);
    assertEqual(c.savedSets.list.length, before);
  });

  test('clearSavedSets: 전체 삭제', () => {
    let c = ensureSavedSetsForRound(makeChar(), 1223).character;
    c = addSavedSets(c, [
      makeSet([1, 2, 3, 4, 5, 6]),
      makeSet([7, 8, 9, 10, 11, 12]),
    ]).character;
    c = clearSavedSets(c);
    assertEqual(c.savedSets.list.length, 0);
    assertEqual(c.savedSets.drwNo, 1223); // drwNo는 보존
  });
});

suite('core/saved-sets - 헬퍼', () => {
  test('hasSameNumbers: 정확 일치만 true', () => {
    const list = [{ numbers: [1, 2, 3, 4, 5, 6] }];
    assertTrue(hasSameNumbers(list, [1, 2, 3, 4, 5, 6]));
    assertTrue(!hasSameNumbers(list, [1, 2, 3, 4, 5, 7]));
    assertTrue(!hasSameNumbers([], [1, 2, 3, 4, 5, 6]));
  });

  test('recipeIdFor: 같은 strategyIds 다른 순서 → 같은 ID', () => {
    const a = recipeIdFor(['astrologer', 'fiveElements', 'zodiacElement']);
    const b = recipeIdFor(['fiveElements', 'zodiacElement', 'astrologer']);
    assertEqual(a, b);
  });

  test('recipeIdFor: 다른 조립식 → 다른 ID', () => {
    const a = recipeIdFor(['astrologer']);
    const b = recipeIdFor(['blessed']);
    assertTrue(a !== b);
  });
});
