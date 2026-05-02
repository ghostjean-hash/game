import { suite, test, assertEqual, assertTrue } from '../core.js';
import {
  recordRecommendation,
  matchHistory,
  backfillRecommendations,
  characterStats,
} from '../../src/core/history.js';
import { computeNumberStats, computeBonusStats, computeCooccur } from '../../src/core/stats.js';
import { LUCK_INITIAL, STRATEGY_DEFAULT } from '../../src/data/numbers.js';

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
    luck: LUCK_INITIAL,
    lastUsedStrategy: STRATEGY_DEFAULT,
    createdAt: '2024-01-01T00:00:00.000Z',
    history: [],
  };
}

function fakeStats() {
  return {
    numberStats: computeNumberStats(draws),
    bonusStats: computeBonusStats(draws),
    cooccur: computeCooccur(draws),
  };
}

suite('core/history - recordRecommendation', () => {
  test('새 회차 추천 추가', () => {
    const c = fakeCharacter();
    const updated = recordRecommendation(c, {
      drwNo: 1200, numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], createdAt: '2024-01-01T00:00:00.000Z',
    });
    assertEqual(updated.history.length, 1);
    assertEqual(updated.history[0].drwNo, 1200);
    assertEqual(updated.history[0].matchedRank, null);
    assertEqual(updated.history[0].luckApplied, false);
  });

  test('같은 drwNo는 덮어쓰기 + matchedRank/luckApplied 보존', () => {
    let c = fakeCharacter();
    c = recordRecommendation(c, {
      drwNo: 1200, numbers: [1, 2, 3, 4, 5, 6], bonus: 7, reasons: [], createdAt: '2024-01-01T00:00:00.000Z',
    });
    c.history[0].matchedRank = 3;
    c.history[0].luckApplied = true;
    c = recordRecommendation(c, {
      drwNo: 1200, numbers: [10, 11, 12, 13, 14, 15], bonus: 16, reasons: [], createdAt: '2024-01-02T00:00:00.000Z',
    });
    assertEqual(c.history.length, 1);
    assertEqual(c.history[0].numbers[0], 10); // 새 추천으로 덮어쓰기
    assertEqual(c.history[0].matchedRank, 3); // 매칭 보존
    assertEqual(c.history[0].luckApplied, true); // luck 잠금 보존
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

suite('core/history - backfillRecommendations', () => {
  test('빈 history → 최근 N회 모두 백필 (lastN=3)', () => {
    const c = fakeCharacter();
    const updated = backfillRecommendations(c, draws, STRATEGY_DEFAULT, fakeStats(), 3);
    assertEqual(updated.history.length, 3);
    // 최근 3회 = 1102, 1103, 1104
    const drwNos = updated.history.map((h) => h.drwNo).sort((a, b) => a - b);
    assertEqual(drwNos[0], 1102);
    assertEqual(drwNos[2], 1104);
  });

  test('각 entry에 matchedRank가 매겨짐 (null 또는 1~5)', () => {
    const c = fakeCharacter();
    const updated = backfillRecommendations(c, draws, STRATEGY_DEFAULT, fakeStats(), 3);
    for (const h of updated.history) {
      const ok = h.matchedRank === null || (h.matchedRank >= 1 && h.matchedRank <= 5);
      assertTrue(ok);
    }
  });

  test('idempotent: 같은 입력으로 두 번 호출해도 history 중복 없음', () => {
    const c = fakeCharacter();
    const once = backfillRecommendations(c, draws, STRATEGY_DEFAULT, fakeStats(), 5);
    const twice = backfillRecommendations(once, draws, STRATEGY_DEFAULT, fakeStats(), 5);
    assertEqual(twice.history.length, once.history.length);
  });

  test('결정론: 같은 캐릭터 + 같은 draws + 같은 통계 = 같은 추천', () => {
    const a = backfillRecommendations(fakeCharacter(), draws, STRATEGY_DEFAULT, fakeStats(), 3);
    const b = backfillRecommendations(fakeCharacter(), draws, STRATEGY_DEFAULT, fakeStats(), 3);
    const aNums = a.history.map((h) => h.numbers.join(',')).sort();
    const bNums = b.history.map((h) => h.numbers.join(',')).sort();
    assertEqual(aNums.join('|'), bNums.join('|'));
  });

  test('빈 draws → 변화 없음', () => {
    const c = fakeCharacter();
    const updated = backfillRecommendations(c, [], STRATEGY_DEFAULT, fakeStats(), 5);
    assertEqual(updated.history.length, 0);
  });

  test('lastN 기본값 사용 (BACKFILL_RECENT_COUNT)', () => {
    const c = fakeCharacter();
    const updated = backfillRecommendations(c, draws, STRATEGY_DEFAULT, fakeStats());
    // draws 5개니까 lastN 30이라도 5개만
    assertEqual(updated.history.length, 5);
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
