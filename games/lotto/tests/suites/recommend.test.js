import { suite, test, assertEqual, assertTrue, assertDeepEqual } from '../core.js';
import { recommend, recommendMulti, distributeCounts, recommendFiveSets } from '../../src/core/recommend.js';
import {
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_PAIR_TRACKER, STRATEGY_ASTROLOGER,
  STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS,
  FIVE_SETS_COUNT,
} from '../../src/data/numbers.js';

const baseCtx = {
  seed: 0xdeadbeef,
  strategyId: STRATEGY_BLESSED,
  luck: 50,
  drwNo: 1100,
  numberStats: [],
  bonusStats: [],
};

suite('core/recommend - 형식', () => {
  test('numbers 길이 6, 정렬, 중복 없음, 1~45 범위', () => {
    const r = recommend(baseCtx);
    assertEqual(r.numbers.length, 6);
    const set = new Set(r.numbers);
    assertEqual(set.size, 6);
    for (const n of r.numbers) {
      assertTrue(n >= 1 && n <= 45);
    }
    for (let i = 1; i < r.numbers.length; i += 1) {
      assertTrue(r.numbers[i - 1] < r.numbers[i], 'must be ascending');
    }
  });

  test('bonus는 1~45 정수', () => {
    const r = recommend(baseCtx);
    assertTrue(Number.isInteger(r.bonus));
    assertTrue(r.bonus >= 1 && r.bonus <= 45);
  });

  test('bonus는 본번호와 겹치지 않음 (6/45 룰)', () => {
    // 다양한 시드로 50회 검증 - 결정론 + 6/45 룰 모두 통과
    for (let i = 0; i < 50; i += 1) {
      const r = recommend({ ...baseCtx, seed: 0x10000 + i, drwNo: 1000 + i });
      const set = new Set(r.numbers);
      assertTrue(!set.has(r.bonus), `bonus ${r.bonus}이 본번호 [${r.numbers.join(',')}]에 포함됨 (seed=${0x10000 + i})`);
    }
  });

  test('전 전략에서도 bonus ∉ numbers', () => {
    const strategies = [
      STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
      STRATEGY_REGRESSIONIST, STRATEGY_PAIR_TRACKER, STRATEGY_ASTROLOGER,
      STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
      STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS,
    ];
    for (const strategyId of strategies) {
      const r = recommend({
        ...baseCtx, strategyId,
        zodiac: 'aries', dayPillar: { stem: 'gap', branch: 'rat' },
      });
      const set = new Set(r.numbers);
      assertTrue(!set.has(r.bonus), `${strategyId}: bonus ${r.bonus} ∈ numbers [${r.numbers.join(',')}]`);
    }
  });

  test('reasons 비어있지 않음', () => {
    const r = recommend(baseCtx);
    assertTrue(r.reasons.length > 0);
  });
});

suite('core/recommend - 결정론', () => {
  test('같은 ctx는 같은 결과', () => {
    const a = recommend(baseCtx);
    const b = recommend(baseCtx);
    assertDeepEqual(a.numbers, b.numbers);
    assertEqual(a.bonus, b.bonus);
  });

  test('drwNo 다르면 다른 결과 (대부분)', () => {
    const a = recommend(baseCtx);
    const b = recommend({ ...baseCtx, drwNo: 1101 });
    const aStr = a.numbers.join(',');
    const bStr = b.numbers.join(',');
    assertTrue(aStr !== bStr || a.bonus !== b.bonus, 'expect different draw');
  });

  test('seed 다르면 다른 결과 (대부분, blessed = 시드 의존)', () => {
    const a = recommend(baseCtx);
    const b = recommend({ ...baseCtx, seed: 0x12345678 });
    const aStr = a.numbers.join(',');
    const bStr = b.numbers.join(',');
    assertTrue(aStr !== bStr || a.bonus !== b.bonus);
  });
});

suite('core/recommend - 객관 전략 캐릭터 무관 (SSOT: 02_data.md 1.5)', () => {
  // 객관 5개: statistician / secondStar / regressionist / trendFollower / balancer
  // → 같은 회차 + 같은 통계 = 모든 캐릭터에 동일 결과 (시드 / Luck 무관)
  const numberStats = Array.from({ length: 45 }, (_, i) => ({
    number: i + 1, totalCount: 100 + i, recent10: 0, recent30: i, recent100: 0,
    lastSeenDrw: 1000, currentGap: 45 - i,
  }));
  const bonusStats = Array.from({ length: 45 }, (_, i) => ({
    number: i + 1, totalCount: 50 + i, recent30: 0, lastSeenDrw: 1000,
  }));
  // S30.4 (2026-05-04): pairTracker 객관 승격 - 6개 전략으로 확장.
  const objectiveStrategies = [
    STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR, STRATEGY_REGRESSIONIST,
    STRATEGY_TREND_FOLLOWER, STRATEGY_BALANCER, STRATEGY_PAIR_TRACKER,
  ];

  test('seed 달라도 같은 결과 (6개 전략)', () => {
    for (const strategyId of objectiveStrategies) {
      const ctxA = { ...baseCtx, strategyId, seed: 0xAAAAAAAA, luck: 50, numberStats, bonusStats };
      const ctxB = { ...baseCtx, strategyId, seed: 0xBBBBBBBB, luck: 50, numberStats, bonusStats };
      const a = recommend(ctxA);
      const b = recommend(ctxB);
      assertDeepEqual(a.numbers, b.numbers);
      assertEqual(a.bonus, b.bonus);
    }
  });

  test('luck 달라도 같은 결과 (Luck boost 미적용)', () => {
    for (const strategyId of objectiveStrategies) {
      const a = recommend({ ...baseCtx, strategyId, luck: 0, numberStats, bonusStats });
      const b = recommend({ ...baseCtx, strategyId, luck: 100, numberStats, bonusStats });
      assertDeepEqual(a.numbers, b.numbers);
      assertEqual(a.bonus, b.bonus);
    }
  });

  test('drwNo 다르면 다른 결과 (회차는 영향)', () => {
    for (const strategyId of objectiveStrategies) {
      const a = recommend({ ...baseCtx, strategyId, drwNo: 1100, numberStats, bonusStats });
      const b = recommend({ ...baseCtx, strategyId, drwNo: 1101, numberStats, bonusStats });
      const aStr = a.numbers.join(',') + '|' + a.bonus;
      const bStr = b.numbers.join(',') + '|' + b.bonus;
      assertTrue(aStr !== bStr, `${strategyId}: drwNo 1100 vs 1101 결과 같음`);
    }
  });
});

suite('core/recommend - 시드 의존 전략 (캐릭터별 다른 결과)', () => {
  // S30.4 (2026-05-04): pairTracker 객관 승격으로 시드 의존 목록에서 제거.
  const seedStrategies = [
    STRATEGY_BLESSED, STRATEGY_INTUITIVE,
  ];
  test('seed 다르면 다른 결과 (2개 시드 의존 전략)', () => {
    for (const strategyId of seedStrategies) {
      const a = recommend({ ...baseCtx, strategyId, seed: 0xAAAAAAAA });
      const b = recommend({ ...baseCtx, strategyId, seed: 0xBBBBBBBB });
      const aStr = a.numbers.join(',') + '|' + a.bonus;
      const bStr = b.numbers.join(',') + '|' + b.bonus;
      assertTrue(aStr !== bStr, `${strategyId}: 같은 결과 (시드 의존이어야 함)`);
    }
  });
});

suite('core/recommend - 전략', () => {
  test('blessed 정상 동작', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_BLESSED });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('축복'));
  });

  test('statistician 정상 동작 (빈 stats여도)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_STATISTICIAN });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('많이 나온 수'));
  });

  test('secondStar 정상 동작 (빈 stats여도)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_SECOND_STAR });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('보너스볼'));
  });

  test('secondStar: 본번호도 bonusStats 빈도 가중 (라벨-동작 일치)', () => {
    // bonusStats heavy 10개 (= STATS_POOL_SIZE) → 풀 = heavy 10. 추출 6 = heavy 6 (100%).
    // PROGRESS 2.29: secondStar 본번호가 균등이던 결손 정정.
    // S21 (2026-05-03): heavy 6 → 10으로 강화 (시드 운 의존 제거).
    const bonusStats = Array.from({ length: 45 }, (_, i) => ({
      number: i + 1, totalCount: 1, recent30: 0, lastSeenDrw: 1000,
    }));
    const heavy = [1, 7, 13, 19, 25, 31, 37, 43, 4, 10];
    heavy.forEach((n) => { bonusStats[n - 1].totalCount = 1000; });
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_SECOND_STAR, bonusStats });
    const heavySet = new Set(heavy);
    const hits = r.numbers.filter((n) => heavySet.has(n)).length;
    assertTrue(hits === 6, `expected 6 heavy hits in main, got ${hits} (numbers=[${r.numbers.join(',')}])`);
  });

  test('statistician: 압도적 가중 번호가 본번호에 등장 (풀 컷팅 효과)', () => {
    // S18 풀 컷팅: heavy 10개 = STATS_POOL_SIZE → 풀 = heavy 10. 추출 6 = heavy 6 (100%).
    // S21 (2026-05-03): heavy 6 → 10으로 강화. 시드 의존 fragile 제거 (이전엔 풀 4자리가 보통 번호로 채워져 운).
    const numberStats = Array.from({ length: 45 }, (_, i) => ({
      number: i + 1, totalCount: 100, recent10: 0, recent30: 0, recent100: 0,
      lastSeenDrw: 1000, currentGap: 5,
    }));
    const heavy = [2, 8, 14, 20, 26, 32, 38, 5, 11, 17];
    heavy.forEach((n) => { numberStats[n - 1].totalCount = 5000; });
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_STATISTICIAN, numberStats });
    const heavySet = new Set(heavy);
    const hits = r.numbers.filter((n) => heavySet.has(n)).length;
    assertTrue(hits === 6, `statistician pool: expected 6 hits, got ${hits} (numbers=[${r.numbers.join(',')}])`);
  });

  test('regressionist: 압도적 gap 번호가 본번호에 등장 (풀 컷팅 효과)', () => {
    const numberStats = Array.from({ length: 45 }, (_, i) => ({
      number: i + 1, totalCount: 100, recent10: 0, recent30: 0, recent100: 0,
      lastSeenDrw: 1000, currentGap: 1,
    }));
    const heavy = [3, 9, 15, 21, 27, 33, 39, 6, 12, 18];
    heavy.forEach((n) => { numberStats[n - 1].currentGap = 200; });
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_REGRESSIONIST, numberStats });
    const heavySet = new Set(heavy);
    const hits = r.numbers.filter((n) => heavySet.has(n)).length;
    assertTrue(hits === 6, `regressionist pool: expected 6 hits, got ${hits} (numbers=[${r.numbers.join(',')}])`);
  });

  test('trendFollower: 압도적 recent30 번호가 본번호에 등장 (raw 가중 + 풀 컷팅)', () => {
    const numberStats = Array.from({ length: 45 }, (_, i) => ({
      number: i + 1, totalCount: 100, recent10: 0, recent30: 1, recent100: 0,
      lastSeenDrw: 1000, currentGap: 5,
    }));
    const heavy = [4, 10, 16, 22, 28, 34, 40, 7, 13, 19];
    heavy.forEach((n) => { numberStats[n - 1].recent30 = 100; });
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_TREND_FOLLOWER, numberStats });
    const heavySet = new Set(heavy);
    const hits = r.numbers.filter((n) => heavySet.has(n)).length;
    assertTrue(hits === 6, `trendFollower pool: expected 6 hits, got ${hits} (numbers=[${r.numbers.join(',')}])`);
  });

  test('알 수 없는 전략은 에러', () => {
    let threw = false;
    try {
      recommend({ ...baseCtx, strategyId: 'unknown' });
    } catch (e) {
      threw = true;
    }
    assertTrue(threw);
  });

  test('regressionist 정상 동작 (빈 stats여도)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_REGRESSIONIST });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('안 나온 수'));
  });

  test('pairTracker 정상 동작 (빈 cooccur여도)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_PAIR_TRACKER });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('짝꿍 번호'));
  });

  test('astrologer 정상 동작 (zodiac 미지정 가능)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_ASTROLOGER });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('별자리 행운'));
  });

  test('astrologer 별자리 reasons에 포함', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_ASTROLOGER, zodiac: 'leo' });
    assertTrue(r.reasons[0].includes('leo'));
  });

  test('같은 캐릭터 + 다른 전략 = 다른 추천 (대부분)', () => {
    const a = recommend({ ...baseCtx, strategyId: STRATEGY_BLESSED });
    const b = recommend({ ...baseCtx, strategyId: STRATEGY_ASTROLOGER, zodiac: 'leo' });
    const aStr = a.numbers.join(',');
    const bStr = b.numbers.join(',');
    assertTrue(aStr !== bStr || a.bonus !== b.bonus, '전략별 차이 있어야');
  });

  test('trendFollower 정상 동작', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_TREND_FOLLOWER });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('최근 트렌드'));
  });

  test('intuitive 정상 동작 (결정론)', () => {
    const a = recommend({ ...baseCtx, strategyId: STRATEGY_INTUITIVE });
    const b = recommend({ ...baseCtx, strategyId: STRATEGY_INTUITIVE });
    assertDeepEqual(a.numbers, b.numbers);
    assertTrue(a.reasons[0].includes('직감'));
  });

  test('intuitive 다른 회차에 다른 분포', () => {
    const a = recommend({ ...baseCtx, strategyId: STRATEGY_INTUITIVE, drwNo: 1100 });
    const b = recommend({ ...baseCtx, strategyId: STRATEGY_INTUITIVE, drwNo: 1101 });
    const aStr = a.numbers.join(',');
    const bStr = b.numbers.join(',');
    assertTrue(aStr !== bStr || a.bonus !== b.bonus);
  });

  test('balancer 정상 동작', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_BALANCER });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('균형 조합'));
  });

  test('zodiacElement 정상 동작 (zodiac 미지정도)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_ZODIAC_ELEMENT });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('원소 행운'));
  });

  test('zodiacElement: leo는 fire 그룹', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_ZODIAC_ELEMENT, zodiac: 'leo' });
    assertTrue(r.reasons[0].includes('fire'));
  });

  test('zodiacElement: cancer는 water 그룹', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_ZODIAC_ELEMENT, zodiac: 'cancer' });
    assertTrue(r.reasons[0].includes('water'));
  });

  test('fiveElements 정상 동작 (dayPillar 미지정도)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_FIVE_ELEMENTS });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('사주 행운'));
  });

  test('fiveElements: gap(갑) → wood 그룹', () => {
    const r = recommend({
      ...baseCtx, strategyId: STRATEGY_FIVE_ELEMENTS,
      dayPillar: { stem: 'gap', branch: 'rat' },
    });
    assertTrue(r.reasons[0].includes('wood'));
  });

  test('fiveElements: byeong(병) → fire 그룹', () => {
    const r = recommend({
      ...baseCtx, strategyId: STRATEGY_FIVE_ELEMENTS,
      dayPillar: { stem: 'byeong', branch: 'rat' },
    });
    assertTrue(r.reasons[0].includes('fire'));
  });

  test('fiveElements: gye(계) → water 그룹', () => {
    const r = recommend({
      ...baseCtx, strategyId: STRATEGY_FIVE_ELEMENTS,
      dayPillar: { stem: 'gye', branch: 'rat' },
    });
    assertTrue(r.reasons[0].includes('water'));
  });

  test('fiveElements: 다른 dayPillar = 다른 그룹 (캐릭터 차별화)', () => {
    // wood (gap) vs metal (gyeong)은 행운 번호 매핑이 완전 분리.
    const wood = recommend({
      ...baseCtx, strategyId: STRATEGY_FIVE_ELEMENTS,
      dayPillar: { stem: 'gap', branch: 'rat' },
    });
    const metal = recommend({
      ...baseCtx, strategyId: STRATEGY_FIVE_ELEMENTS,
      dayPillar: { stem: 'gyeong', branch: 'rat' },
    });
    const aStr = wood.numbers.join(',');
    const bStr = metal.numbers.join(',');
    assertTrue(aStr !== bStr, 'wood vs metal 결과 같음');
  });

  test('S3-T1 distributeCounts: 1~6 분배', () => {
    assertDeepEqual(distributeCounts(1), [6]);
    assertDeepEqual(distributeCounts(2), [3, 3]);
    assertDeepEqual(distributeCounts(3), [2, 2, 2]);
    assertDeepEqual(distributeCounts(4), [2, 2, 1, 1]);
    assertDeepEqual(distributeCounts(5), [2, 1, 1, 1, 1]);
    assertDeepEqual(distributeCounts(6), [1, 1, 1, 1, 1, 1]);
  });

  test('S3-T1 distributeCounts: 범위 밖 에러', () => {
    let threw = false;
    try { distributeCounts(0); } catch { threw = true; }
    assertTrue(threw);
    threw = false;
    try { distributeCounts(7); } catch { threw = true; }
    assertTrue(threw);
  });

  test('S3-T1 recommendMulti: 단일 전략은 recommend와 동일 형태', () => {
    const r = recommendMulti({ ...baseCtx, strategyIds: [STRATEGY_BLESSED] });
    assertEqual(r.numbers.length, 6);
    assertTrue(Number.isInteger(r.bonus));
    assertEqual(r.strategySources.length, 6);
    for (const s of r.strategySources) assertEqual(s, STRATEGY_BLESSED);
  });

  test('S3-T1 recommendMulti: 2전략 분배 + 출처', () => {
    const r = recommendMulti({
      ...baseCtx,
      strategyIds: [STRATEGY_BLESSED, STRATEGY_INTUITIVE],
    });
    assertEqual(r.numbers.length, 6);
    const sourceSet = new Set(r.strategySources);
    // 2 전략 모두 등장 가능 (분배 3+3, 중복 제외 후에도 양쪽이 채워짐)
    assertTrue(sourceSet.size >= 1, '최소 1전략은 출처에 등장');
    assertTrue(sourceSet.size <= 2, '최대 2전략');
  });

  test('S3-T1 recommendMulti: 6전략 모두 1개씩', () => {
    const r = recommendMulti({
      ...baseCtx,
      strategyIds: [
        STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_REGRESSIONIST,
        STRATEGY_PAIR_TRACKER, STRATEGY_INTUITIVE, STRATEGY_TREND_FOLLOWER,
      ],
    });
    assertEqual(r.numbers.length, 6);
    assertEqual(r.strategySources.length, 6);
  });

  test('S3-T1 recommendMulti: bonus ∉ numbers', () => {
    for (let i = 0; i < 30; i += 1) {
      const r = recommendMulti({
        ...baseCtx,
        seed: 0x10000 + i,
        drwNo: 1000 + i,
        strategyIds: [STRATEGY_BLESSED, STRATEGY_INTUITIVE, STRATEGY_BALANCER],
      });
      assertTrue(!r.numbers.includes(r.bonus), `bonus=${r.bonus} ∈ numbers=[${r.numbers}]`);
    }
  });

  test('S3-T1 recommendMulti: 빈 strategyIds는 에러', () => {
    let threw = false;
    try { recommendMulti({ ...baseCtx, strategyIds: [] }); } catch { threw = true; }
    assertTrue(threw);
  });

  test('S25 recommendMulti: strategyIds 정규화 - 클릭 순서 무관 결정론', () => {
    // 같은 3 strategy 다른 순서로 호출 → 결과 numbers + bonus + sources 모두 동일.
    const a = recommendMulti({
      ...baseCtx, zodiac: 'cancer', dayPillar: { stem: 'gap', branch: 'rat' },
      strategyIds: [STRATEGY_ASTROLOGER, STRATEGY_FIVE_ELEMENTS, STRATEGY_ZODIAC_ELEMENT],
    });
    const b = recommendMulti({
      ...baseCtx, zodiac: 'cancer', dayPillar: { stem: 'gap', branch: 'rat' },
      strategyIds: [STRATEGY_FIVE_ELEMENTS, STRATEGY_ZODIAC_ELEMENT, STRATEGY_ASTROLOGER],
    });
    const c = recommendMulti({
      ...baseCtx, zodiac: 'cancer', dayPillar: { stem: 'gap', branch: 'rat' },
      strategyIds: [STRATEGY_ZODIAC_ELEMENT, STRATEGY_ASTROLOGER, STRATEGY_FIVE_ELEMENTS],
    });
    assertDeepEqual(a.numbers, b.numbers);
    assertDeepEqual(b.numbers, c.numbers);
    assertEqual(a.bonus, b.bonus);
    assertEqual(b.bonus, c.bonus);
    assertDeepEqual(a.strategySources, b.strategySources);
    assertDeepEqual(b.strategySources, c.strategySources);
  });

  test('S25 recommendMulti: 통계 + 운세 혼합 정규화', () => {
    // 통계 + 운세 혼합 6전략. 클릭 순서 다양하게 → 동일 결과.
    const ids1 = [STRATEGY_FIVE_ELEMENTS, STRATEGY_TREND_FOLLOWER, STRATEGY_STATISTICIAN, STRATEGY_PAIR_TRACKER, STRATEGY_SECOND_STAR, STRATEGY_REGRESSIONIST];
    const ids2 = [STRATEGY_REGRESSIONIST, STRATEGY_FIVE_ELEMENTS, STRATEGY_PAIR_TRACKER, STRATEGY_TREND_FOLLOWER, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR];
    const a = recommendMulti({ ...baseCtx, dayPillar: { stem: 'gap', branch: 'rat' }, strategyIds: ids1 });
    const b = recommendMulti({ ...baseCtx, dayPillar: { stem: 'gap', branch: 'rat' }, strategyIds: ids2 });
    assertDeepEqual(a.numbers, b.numbers);
    assertDeepEqual(a.strategySources, b.strategySources);
  });

  test('S25 recommendMulti: 운세 3개 결과 평균이 풀 평균에 수렴 (작은 번호 편향 정정)', () => {
    // 운세 3개(별자리/원소/사주) - 풀 합집합 평균이 22~30 정도. 결과 평균이 작은 쪽(< 12) 편향이면 실패.
    // S25 이전(잘라쓰기): 평균 6~9 (작은 번호 편향).
    // S25 이후(풀에서 직접 추출): 풀 평균에 수렴 → 12 이상 기대.
    const r = recommendMulti({
      ...baseCtx, zodiac: 'cancer', dayPillar: { stem: 'gap', branch: 'rat' },
      drawDate: '2026-05-09',
      strategyIds: [STRATEGY_ASTROLOGER, STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS],
    });
    const avg = r.numbers.reduce((s, n) => s + n, 0) / r.numbers.length;
    assertTrue(avg >= 12, `평균 ${avg.toFixed(1)} - 작은 번호 편향 의심 (>=12 기대, S25 잘라쓰기 폐기 검증).`);
  });

  test('balancer 결과는 (대부분) 합 121~160 + 홀짝 3:3 통과', () => {
    // 50번 시도 보장이지만 fallback 가능. 통과율 검증.
    let pass = 0;
    for (let n = 1; n <= 30; n += 1) {
      const r = recommend({ ...baseCtx, seed: n * 0x9e3779b1, strategyId: STRATEGY_BALANCER });
      const sum = r.numbers.reduce((a, b) => a + b, 0);
      const odds = r.numbers.filter((x) => x % 2 === 1).length;
      if (sum >= 121 && sum <= 160 && odds === 3) pass += 1;
    }
    // 30번 중 25번 이상 통과 기대 (fallback 5번 미만)
    assertTrue(pass >= 25, `pass ${pass}/30, expected >= 25`);
  });

  // ========== S4-T1: 5세트 동시 추천 ==========

  test('S4-T1 recommendFiveSets: 길이 = FIVE_SETS_COUNT(5)', () => {
    const sets = recommendFiveSets({ ...baseCtx, strategyId: STRATEGY_BLESSED });
    assertEqual(sets.length, FIVE_SETS_COUNT);
    assertEqual(sets.length, 5);
  });

  test('S4-T1 recommendFiveSets: 각 세트는 numbers 6개 정렬 + bonus 1개 + bonus ∉ numbers', () => {
    const sets = recommendFiveSets({ ...baseCtx, strategyId: STRATEGY_BLESSED });
    for (const s of sets) {
      assertEqual(s.numbers.length, 6);
      assertEqual(new Set(s.numbers).size, 6);
      for (const n of s.numbers) assertTrue(n >= 1 && n <= 45);
      for (let i = 1; i < s.numbers.length; i += 1) assertTrue(s.numbers[i - 1] < s.numbers[i]);
      assertTrue(!s.numbers.includes(s.bonus), `bonus ${s.bonus} ∈ numbers ${s.numbers}`);
    }
  });

  test('S4-T1 recommendFiveSets: [0]은 메인 (단일 recommend와 동일 결과)', () => {
    const main = recommend({ ...baseCtx, strategyId: STRATEGY_INTUITIVE });
    const sets = recommendFiveSets({ ...baseCtx, strategyId: STRATEGY_INTUITIVE });
    assertDeepEqual(sets[0].numbers, main.numbers);
    assertEqual(sets[0].bonus, main.bonus);
  });

  test('S4-T1 recommendFiveSets: 시드 의존 전략은 [0]과 [1..4] 결과가 다름 (변형 효과)', () => {
    const sets = recommendFiveSets({ ...baseCtx, strategyId: STRATEGY_INTUITIVE });
    // [0]과 [1..4] 중 최소 하나는 numbers가 달라야 (시드 변형 효과)
    let differs = 0;
    for (let i = 1; i < sets.length; i += 1) {
      if (JSON.stringify(sets[0].numbers) !== JSON.stringify(sets[i].numbers)) differs += 1;
    }
    assertTrue(differs >= 3, `[1..4] 중 최소 3개는 [0]과 달라야 함 (실제 ${differs})`);
  });

  test('S4-T1 recommendFiveSets: 결정론 (같은 ctx → 같은 5세트)', () => {
    const a = recommendFiveSets({ ...baseCtx, strategyId: STRATEGY_INTUITIVE });
    const b = recommendFiveSets({ ...baseCtx, strategyId: STRATEGY_INTUITIVE });
    for (let i = 0; i < a.length; i += 1) {
      assertDeepEqual(a[i].numbers, b[i].numbers);
      assertEqual(a[i].bonus, b[i].bonus);
    }
  });

  test('S4-T1 recommendFiveSets: 객관 전략(statistician)도 회차 변형 → [1..4]가 [0]과 다름', () => {
    // 통계 압도 가중치 6개 (객관 전략도 5세트 다양화 검증)
    const numberStats = [];
    for (let n = 1; n <= 45; n += 1) {
      numberStats.push({ number: n, totalCount: n <= 6 ? 100 : 1, recent10: 0, recent30: 0, recent100: 0, lastSeenDrw: 0, currentGap: 0 });
    }
    const sets = recommendFiveSets({
      ...baseCtx, strategyId: STRATEGY_STATISTICIAN, numberStats,
    });
    // 객관 전략은 캐릭터 시드 무관이지만, 5세트는 drwNo 변형으로 분기 → 모두 동일 numbers면 안 됨
    let differs = 0;
    for (let i = 1; i < sets.length; i += 1) {
      if (JSON.stringify(sets[0].numbers) !== JSON.stringify(sets[i].numbers)) differs += 1;
    }
    assertTrue(differs >= 1, `객관 전략 5세트는 회차 변형으로 최소 1세트는 [0]과 달라야 (실제 ${differs})`);
  });

  test('S4-T1 recommendFiveSets: 다중 모드 호환 (multi=true) - strategySources 채워짐', () => {
    const sets = recommendFiveSets(
      { ...baseCtx, strategyIds: [STRATEGY_BLESSED, STRATEGY_INTUITIVE] },
      { multi: true }
    );
    assertEqual(sets.length, 5);
    for (const s of sets) {
      assertEqual(s.numbers.length, 6);
      assertTrue(Array.isArray(s.strategySources));
      assertEqual(s.strategySources.length, 6);
    }
  });
});
