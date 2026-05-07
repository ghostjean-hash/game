import { suite, test, assertEqual, assertTrue, assertDeepEqual } from '../core.js';
import {
  ensureSavedSetsForRound, addSavedSets, removeSavedSetAt, clearSavedSets,
  hasSameNumbers, recipeIdFor,
} from '../../src/core/saved-sets.js';
import { recommendMulti } from '../../src/core/recommend.js';
import { mixSeeds } from '../../src/core/random.js';
import {
  SAVED_SETS_CAP, SAVED_SETS_RETRY_MAX,
  SAVED_SETS_TOAST_NORMAL_MS, SAVED_SETS_TOAST_PARTIAL_MS,
  SAVED_SETS_SALT_BASE,
  ZODIAC_LUCKY,
} from '../../src/data/numbers.js';

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

// S32 (2026-05-07): 풀 한계 재시도 룰 회귀.
// SSOT: docs/01_spec.md 5.2.5.4 / docs/02_data.md 1.5.8.5 ~ 1.5.8.6.
// render 호출부의 재시도 루프를 단위 테스트 차원에서 시뮬한다.
suite('S32 풀 한계 재시도 - 별자리 좁은 풀', () => {
  test('상수 export 확인 (RETRY_MAX / TOAST_*)', () => {
    assertEqual(SAVED_SETS_RETRY_MAX, 50);
    assertEqual(SAVED_SETS_TOAST_NORMAL_MS, 1500);
    assertEqual(SAVED_SETS_TOAST_PARTIAL_MS, 2500);
  });

  function simulateBatch({ poolKey, batchN, baseSeed = 12345, drwNo = 1223, startIdx = 0 }) {
    let cur = ensureSavedSetsForRound(makeChar({ seed: baseSeed }), drwNo).character;
    const strategyIds = ['astrologer'];
    let attempts = 0;
    let totalAdded = 0;
    let totalDup = 0;
    let totalCapSkip = 0;
    while (totalAdded < batchN && attempts < SAVED_SETS_RETRY_MAX && totalCapSkip === 0) {
      const remaining = batchN - totalAdded;
      const newSets = [];
      for (let i = 0; i < remaining && attempts < SAVED_SETS_RETRY_MAX; i += 1) {
        const salt = SAVED_SETS_SALT_BASE + startIdx + attempts;
        const ctx = {
          seed: mixSeeds(baseSeed, salt),
          drwNo,
          luck: 50,
          numberStats: [],
          bonusStats: [],
          cooccur: [],
          zodiac: poolKey,
          strategyIds,
        };
        const r = recommendMulti(ctx);
        newSets.push({ numbers: r.numbers, strategyIds, strategySources: r.strategySources });
        attempts += 1;
      }
      const result = addSavedSets(cur, newSets);
      cur = result.character;
      totalAdded += result.addedCount;
      totalDup += result.skipped.duplicate;
      totalCapSkip += result.skipped.cap;
    }
    const exhausted = !totalCapSkip && totalAdded < batchN && attempts >= SAVED_SETS_RETRY_MAX;
    return { totalAdded, totalDup, attempts, exhausted, list: cur.savedSets.list };
  }

  test('libra(풀 8) 20세트 요청 - 시드 변형 unique 조합 수 ≤ C(8,6)=28', () => {
    // libra 풀이 8 → 가능 조합 28. 20세트 요청 시 항상 unique 20세트 도달 (수학적 보장).
    const r = simulateBatch({ poolKey: 'libra', batchN: 20 });
    assertEqual(r.totalAdded, 20);
    assertEqual(r.exhausted, false);
    // 본번호 6개 조합이 모두 서로 다른지 검증.
    const keys = new Set(r.list.map((s) => s.numbers.join(',')));
    assertEqual(keys.size, 20);
  });

  test('libra(풀 8) cap 도달까지 - unique 보장', () => {
    // cap=20까지 모두 unique 조합으로 채워져야 함.
    const r = simulateBatch({ poolKey: 'libra', batchN: SAVED_SETS_CAP });
    assertEqual(r.totalAdded, SAVED_SETS_CAP);
    const keys = new Set(r.list.map((s) => s.numbers.join(',')));
    assertEqual(keys.size, SAVED_SETS_CAP);
  });

  test('gemini(풀 10) 20세트 요청 - C(10,6)=210 풀에서 손쉽게 unique 도달', () => {
    const r = simulateBatch({ poolKey: 'gemini', batchN: 20 });
    assertEqual(r.totalAdded, 20);
    assertEqual(r.exhausted, false);
    const keys = new Set(r.list.map((s) => s.numbers.join(',')));
    assertEqual(keys.size, 20);
  });

  // S33 (2026-05-07): 풀 외 추첨 차단 회귀.
  //   applyLuck + weightedSample의 floor가 풀 외 weight 0을 양수화하던 버그 fix.
  //   별자리 / 원소 / 사주 / 짝꿍 추첨 결과는 학설 풀 안 번호로만 구성됨.
  test('S33 풀 외 추첨 차단 - libra 추첨은 학설 풀 부분집합', () => {
    const r = simulateBatch({ poolKey: 'libra', batchN: 10 });
    const pool = new Set(ZODIAC_LUCKY.libra);
    for (const set of r.list) {
      for (const n of set.numbers) {
        assertTrue(pool.has(n), `번호 ${n}는 libra 풀 ${[...pool]} 밖 - applyLuck floor 누설`);
      }
    }
  });

  test('S33 풀 외 추첨 차단 - aries 추첨은 학설 풀 부분집합', () => {
    const r = simulateBatch({ poolKey: 'aries', batchN: 10 });
    const pool = new Set(ZODIAC_LUCKY.aries);
    for (const set of r.list) {
      for (const n of set.numbers) {
        assertTrue(pool.has(n), `번호 ${n}는 aries 풀 ${[...pool]} 밖`);
      }
    }
  });
});
