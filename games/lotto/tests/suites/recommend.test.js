import { suite, test, assertEqual, assertTrue, assertDeepEqual } from '../core.js';
import { recommend, recommendMulti, distributeCounts } from '../../src/core/recommend.js';
import {
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_PAIR_TRACKER, STRATEGY_ASTROLOGER,
  STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  STRATEGY_MBTI, STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS,
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
      STRATEGY_MBTI, STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS,
    ];
    for (const strategyId of strategies) {
      const r = recommend({
        ...baseCtx, strategyId,
        zodiac: 'aries', mbti: 'INTJ', dayPillar: { stem: 'gap', branch: 'rat' },
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
  const objectiveStrategies = [
    STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR, STRATEGY_REGRESSIONIST,
    STRATEGY_TREND_FOLLOWER, STRATEGY_BALANCER,
  ];

  test('seed 달라도 같은 결과 (5개 전략)', () => {
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
  const seedStrategies = [
    STRATEGY_BLESSED, STRATEGY_PAIR_TRACKER, STRATEGY_INTUITIVE,
  ];
  test('seed 다르면 다른 결과 (3개 시드 의존 전략)', () => {
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
    assertTrue(r.reasons[0].includes('통계 추첨'));
  });

  test('secondStar 정상 동작 (빈 stats여도)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_SECOND_STAR });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('보너스볼 사냥'));
  });

  test('secondStar: 본번호도 bonusStats 빈도 가중 (라벨-동작 일치)', () => {
    // bonusStats에 특정 번호만 압도적 빈도 → 본번호로도 자주 등장해야 함.
    // PROGRESS 2.29: secondStar 본번호가 균등이던 결손 정정.
    const bonusStats = Array.from({ length: 45 }, (_, i) => ({
      number: i + 1, totalCount: 1, recent30: 0, lastSeenDrw: 1000,
    }));
    // 1, 7, 13, 19, 25, 31번에 1000배 가중
    [1, 7, 13, 19, 25, 31].forEach((n) => { bonusStats[n - 1].totalCount = 1000; });
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_SECOND_STAR, bonusStats });
    // 본번호 6개 중 최소 4개는 가중 번호여야 함 (압도적 가중이라 거의 다 포함 기대)
    const heavySet = new Set([1, 7, 13, 19, 25, 31]);
    const hits = r.numbers.filter((n) => heavySet.has(n)).length;
    assertTrue(hits >= 4, `expected >= 4 heavy-weighted in main, got ${hits} (numbers=[${r.numbers.join(',')}])`);
  });

  test('statistician: 압도적 가중 번호가 본번호에 등장 (power 보정 효과)', () => {
    // PROGRESS 2.30: STATS_POWER=1.5로 분포 차이 증폭 검증.
    const numberStats = Array.from({ length: 45 }, (_, i) => ({
      number: i + 1, totalCount: 100, recent10: 0, recent30: 0, recent100: 0,
      lastSeenDrw: 1000, currentGap: 5,
    }));
    [2, 8, 14, 20, 26, 32].forEach((n) => { numberStats[n - 1].totalCount = 5000; });
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_STATISTICIAN, numberStats });
    const heavySet = new Set([2, 8, 14, 20, 26, 32]);
    const hits = r.numbers.filter((n) => heavySet.has(n)).length;
    assertTrue(hits >= 4, `statistician power: expected >= 4 hits, got ${hits} (numbers=[${r.numbers.join(',')}])`);
  });

  test('regressionist: 압도적 gap 번호가 본번호에 등장 (power 보정 효과)', () => {
    const numberStats = Array.from({ length: 45 }, (_, i) => ({
      number: i + 1, totalCount: 100, recent10: 0, recent30: 0, recent100: 0,
      lastSeenDrw: 1000, currentGap: 1,
    }));
    [3, 9, 15, 21, 27, 33].forEach((n) => { numberStats[n - 1].currentGap = 200; });
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_REGRESSIONIST, numberStats });
    const heavySet = new Set([3, 9, 15, 21, 27, 33]);
    const hits = r.numbers.filter((n) => heavySet.has(n)).length;
    assertTrue(hits >= 4, `regressionist power: expected >= 4 hits, got ${hits} (numbers=[${r.numbers.join(',')}])`);
  });

  test('trendFollower: 압도적 recent30 번호가 본번호에 등장 (raw 가중)', () => {
    // PROGRESS 2.31: trendFollower는 raw 유지. recent30은 자연 분포(0~9)로 두드러져 power 불필요.
    const numberStats = Array.from({ length: 45 }, (_, i) => ({
      number: i + 1, totalCount: 100, recent10: 0, recent30: 1, recent100: 0,
      lastSeenDrw: 1000, currentGap: 5,
    }));
    [4, 10, 16, 22, 28, 34].forEach((n) => { numberStats[n - 1].recent30 = 100; });
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_TREND_FOLLOWER, numberStats });
    const heavySet = new Set([4, 10, 16, 22, 28, 34]);
    const hits = r.numbers.filter((n) => heavySet.has(n)).length;
    assertTrue(hits >= 4, `trendFollower raw: expected >= 4 hits, got ${hits} (numbers=[${r.numbers.join(',')}])`);
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
    assertTrue(r.reasons[0].includes('미출현 회귀'));
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

  test('mbti 정상 동작 (mbti 없어도)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_MBTI });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('MBTI'));
  });

  test('mbti reasons에 타입 포함', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_MBTI, mbti: 'INTJ' });
    assertTrue(r.reasons[0].includes('INTJ'));
  });

  test('zodiacElement 정상 동작 (zodiac 미지정도)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_ZODIAC_ELEMENT });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('별자리 4원소'));
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
    assertTrue(r.reasons[0].includes('일주 오행'));
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
});
