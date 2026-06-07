import { suite, test, assertEqual, assertTrue } from '../core.js';
import {
  recordRecommendation,
  matchHistory,
  characterStats,
  toggleSavedSetRegistration,
  toggleHistoryLock,
  countRegisteredForRound,
  isRegistered,
  revealRecommendation,
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

// S097 (2026-05-19): toggleSavedSetRegistration entry에 revealed: false / revealRecommendation 동작.
suite('core/history - S097 revealed 필드', () => {
  test('toggleSavedSetRegistration 신규 등록 entry는 revealed: false', () => {
    const c = fakeCharacter();
    const set = { numbers: [3, 9, 16, 28, 42, 43], bonus: 5, reasons: [], strategyIds: [STRATEGY_DEFAULT] };
    const { character: next, action } = toggleSavedSetRegistration(c, set, 1225);
    assertEqual(action, 'registered');
    assertEqual(next.history.length, 1);
    assertEqual(next.history[0].revealed, false, '신규 등록 = revealed false');
  });

  test('revealRecommendation - matching 항목 revealed=true 갱신', () => {
    const c = fakeCharacter();
    const set = { numbers: [3, 9, 16, 28, 42, 43], bonus: 5, reasons: [], strategyIds: [STRATEGY_DEFAULT] };
    const { character: registered } = toggleSavedSetRegistration(c, set, 1225);
    const revealed = revealRecommendation(registered, 1225, '3,9,16,28,42,43');
    assertEqual(revealed.history[0].revealed, true, 'reveal 후 true');
    // 옛 character는 immutable (참조 다름).
    assertTrue(revealed !== registered, '새 객체 반환');
  });

  test('revealRecommendation - 이미 true면 동일 객체 반환 (idempotent)', () => {
    const c = fakeCharacter();
    const set = { numbers: [3, 9, 16, 28, 42, 43], bonus: 5, reasons: [], strategyIds: [STRATEGY_DEFAULT] };
    const { character: registered } = toggleSavedSetRegistration(c, set, 1225);
    const once = revealRecommendation(registered, 1225, '3,9,16,28,42,43');
    const twice = revealRecommendation(once, 1225, '3,9,16,28,42,43');
    assertTrue(once === twice, '두 번째 호출 = 동일 객체 (no-op)');
  });

  test('revealRecommendation - 매칭 없는 key는 무변동', () => {
    const c = fakeCharacter();
    const set = { numbers: [3, 9, 16, 28, 42, 43], bonus: 5, reasons: [], strategyIds: [STRATEGY_DEFAULT] };
    const { character: registered } = toggleSavedSetRegistration(c, set, 1225);
    const result = revealRecommendation(registered, 9999, '1,2,3,4,5,6');
    assertTrue(result === registered, '미매칭 = 동일 객체');
  });
});

// S3 기록 잠금 (2026-06-07): toggleHistoryLock + 잠긴 항목 unregister 차단.
suite('core/history - S3 기록 잠금', () => {
  test('toggleSavedSetRegistration 신규 등록 entry는 locked: false', () => {
    const c = fakeCharacter();
    const set = { numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], strategyIds: [STRATEGY_DEFAULT] };
    const { character: next } = toggleSavedSetRegistration(c, set, 1225);
    assertEqual(next.history[0].locked, false, '신규 등록 = 미잠금');
  });

  test('toggleHistoryLock - 잠금 토글 (false → true → false)', () => {
    const c = fakeCharacter();
    const set = { numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], strategyIds: [STRATEGY_DEFAULT] };
    const { character: reg } = toggleSavedSetRegistration(c, set, 1225);
    const r1 = toggleHistoryLock(reg, 1225, '1,2,3,4,5,6');
    assertEqual(r1.locked, true, '첫 토글 = 잠금');
    assertEqual(r1.character.history[0].locked, true);
    const r2 = toggleHistoryLock(r1.character, 1225, '1,2,3,4,5,6');
    assertEqual(r2.locked, false, '두 번째 토글 = 해제');
    assertEqual(r2.character.history[0].locked, false);
  });

  test('잠긴 항목은 추천 체크 해제(unregister) 차단 + 기록 유지', () => {
    const c = fakeCharacter();
    const set = { numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], strategyIds: [STRATEGY_DEFAULT] };
    const { character: reg } = toggleSavedSetRegistration(c, set, 1225);
    const { character: locked } = toggleHistoryLock(reg, 1225, '1,2,3,4,5,6');
    const r = toggleSavedSetRegistration(locked, set, 1225);
    assertEqual(r.action, 'locked', '잠금 = unregister 차단');
    assertEqual(r.character.history.length, 1, '기록 유지');
  });

  test('잠금 해제 후에는 정상 unregister', () => {
    const c = fakeCharacter();
    const set = { numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], strategyIds: [STRATEGY_DEFAULT] };
    const { character: reg } = toggleSavedSetRegistration(c, set, 1225);
    const { character: locked } = toggleHistoryLock(reg, 1225, '1,2,3,4,5,6');
    const { character: unlocked } = toggleHistoryLock(locked, 1225, '1,2,3,4,5,6');
    const r = toggleSavedSetRegistration(unlocked, set, 1225);
    assertEqual(r.action, 'unregistered', '잠금 해제 후 정상 취소');
    assertEqual(r.character.history.length, 0);
  });

  test('toggleHistoryLock - 매칭 없는 key는 무변동', () => {
    const c = fakeCharacter();
    const set = { numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], strategyIds: [STRATEGY_DEFAULT] };
    const { character: reg } = toggleSavedSetRegistration(c, set, 1225);
    const r = toggleHistoryLock(reg, 9999, '9,9,9,9,9,9');
    assertEqual(r.locked, false);
    assertEqual(r.character.history.length, 1, '무변동');
  });
});
