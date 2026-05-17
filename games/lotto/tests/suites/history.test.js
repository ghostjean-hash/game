import { suite, test, assertEqual, assertTrue } from '../core.js';
import {
  recordRecommendation,
  matchHistory,
  characterStats,
  toggleSavedSetRegistration,
  countRegisteredForRound,
  isRegistered,
} from '../../src/core/history.js';
import { STRATEGY_DEFAULT, HISTORY_REGISTER_CAP_PER_ROUND } from '../../src/data/numbers.js';

// 미니 draws 셋 (회차 5개)
const draws = [
  { drwNo: 1100, drwDate: '2024-01-06', numbers: [1, 2, 3, 4, 5, 6], bonus: 7 },
  { drwNo: 1101, drwDate: '2024-01-13', numbers: [10, 11, 12, 13, 14, 15], bonus: 16 },
  { drwNo: 1102, drwDate: '2024-01-20', numbers: [20, 21, 22, 23, 24, 25], bonus: 26 },
  { drwNo: 1103, drwDate: '2024-01-27', numbers: [30, 31, 32, 33, 34, 35], bonus: 36 },
  { drwNo: 1104, drwDate: '2024-02-03', numbers: [40, 41, 42, 43, 44, 45], bonus: 1 },
];

function fakeCharacter() {
  return {
    id: 'c_test',
    seed: 12345,
    name: '테스트',
    animalSign: 'dragon',
    zodiac: 'aries',
    dayPillar: { stem: 'gap', branch: 'rat' },
    // S089 (2026-05-17): luck 필드 제거.
    lastUsedStrategy: STRATEGY_DEFAULT,
    createdAt: '2024-01-01T00:00:00.000Z',
    history: [],
  };
}

suite('core/history - recordRecommendation (S090 사용자 명시 등록)', () => {
  test('새 회차 추천 추가 + source=user', () => {
    const c = fakeCharacter();
    const updated = recordRecommendation(c, {
      drwNo: 1200, numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], createdAt: '2024-01-01T00:00:00.000Z',
    });
    assertEqual(updated.history.length, 1);
    assertEqual(updated.history[0].drwNo, 1200);
    assertEqual(updated.history[0].matchedRank, null);
    assertEqual(updated.history[0].source, 'user');
  });

  test('S090 같은 drwNo + 같은 numbers는 중복 차단', () => {
    let c = fakeCharacter();
    c = recordRecommendation(c, {
      drwNo: 1200, numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], createdAt: '2024-01-01T00:00:00.000Z',
    });
    c = recordRecommendation(c, {
      drwNo: 1200, numbers: [1, 2, 3, 4, 5, 6], bonus: 99, reasons: [], createdAt: '2024-01-02T00:00:00.000Z',
    });
    assertEqual(c.history.length, 1, '중복 numbers 차단');
    assertEqual(c.history[0].bonus, 7, '첫 등록 보존');
  });
});

suite('core/history - toggleSavedSetRegistration (S090)', () => {
  test('등록 → unregister 토글', () => {
    let c = fakeCharacter();
    const set1 = { numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], strategyIds: ['blessed'], strategySources: [] };
    let r = toggleSavedSetRegistration(c, set1, 1200);
    assertEqual(r.action, 'registered');
    assertEqual(r.character.history.length, 1);
    assertEqual(r.character.history[0].source, 'user');
    // 다시 toggle = unregister
    r = toggleSavedSetRegistration(r.character, set1, 1200);
    assertEqual(r.action, 'unregistered');
    assertEqual(r.character.history.length, 0);
  });

  test('S090-후속 7 - cap 폐기 (사용자 명시 "5개 제한 없애줘")', () => {
    let c = fakeCharacter();
    // 옛 cap 5보다 많은 7건 모두 등록 가능.
    const targetN = 7;
    for (let i = 0; i < targetN; i += 1) {
      const set = { numbers: [i + 1, i + 2, i + 3, i + 4, i + 5, i + 6], bonus: 45, reasons: [], strategyIds: [], strategySources: [] };
      const r = toggleSavedSetRegistration(c, set, 1200);
      assertEqual(r.action, 'registered', `${i + 1}번째 등록`);
      c = r.character;
    }
    assertEqual(countRegisteredForRound(c, 1200), targetN, '7건 모두 등록 (cap 폐기 확인)');
  });

  test('다른 회차도 자유롭게 등록', () => {
    let c = fakeCharacter();
    for (let i = 0; i < 3; i += 1) {
      const set = { numbers: [i + 1, i + 2, i + 3, i + 4, i + 5, i + 6], bonus: 45, reasons: [], strategyIds: [], strategySources: [] };
      c = toggleSavedSetRegistration(c, set, 1200).character;
    }
    // 다른 회차 = 등록 가능
    const otherRound = { numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], strategyIds: [], strategySources: [] };
    const r = toggleSavedSetRegistration(c, otherRound, 1201);
    assertEqual(r.action, 'registered');
    assertEqual(countRegisteredForRound(r.character, 1201), 1);
  });

  test('isRegistered helper', () => {
    let c = fakeCharacter();
    const set1 = { numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], strategyIds: [], strategySources: [] };
    assertEqual(isRegistered(c, 1200, set1.numbers), false);
    c = toggleSavedSetRegistration(c, set1, 1200).character;
    assertEqual(isRegistered(c, 1200, set1.numbers), true);
    assertEqual(isRegistered(c, 1201, set1.numbers), false, '다른 회차');
  });
});

suite('core/history - matchHistory', () => {
  test('history의 추천을 발표 회차와 매칭', () => {
    let c = fakeCharacter();
    c = recordRecommendation(c, {
      drwNo: 1100, numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], createdAt: '2024-01-01T00:00:00.000Z',
    });
    c = matchHistory(c, draws);
    assertEqual(c.history[0].matchedRank, 1); // 1등
  });
  test('발표 안 된 회차는 matchedRank null', () => {
    let c = fakeCharacter();
    c = recordRecommendation(c, {
      drwNo: 9999, numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], createdAt: '2024-01-01T00:00:00.000Z',
    });
    c = matchHistory(c, draws);
    assertEqual(c.history[0].matchedRank, null);
  });
});

suite('core/history - characterStats', () => {
  test('빈 history → total 0', () => {
    const stats = characterStats(fakeCharacter());
    assertEqual(stats.total, 0);
    assertEqual(stats.hits, 0);
    assertEqual(stats.bestRank, null);
  });
});

// S090 (2026-05-17): backfillRecommendations 폐기 - import 불가 검증.
suite('core/history - S090 backfillRecommendations 폐기', () => {
  test('backfillRecommendations export 부재', async () => {
    const mod = await import('../../src/core/history.js');
    assertTrue(typeof mod.backfillRecommendations === 'undefined', 'S090 폐기');
  });
});
