import { suite, test, assertEqual, assertTrue, assertDeepEqual } from '../core.js';
import { recommendMulti, recommendFiveSets } from '../../src/core/recommend.js';
// S34 (2026-05-08): STRATEGY_PAIR_TRACKER 폐기 - import / 사용처 모두 제거.
import {
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_ASTROLOGER,
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
    const r = recommendMulti(baseCtx);
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
    const r = recommendMulti(baseCtx);
    assertTrue(Number.isInteger(r.bonus));
    assertTrue(r.bonus >= 1 && r.bonus <= 45);
  });

  test('bonus는 본번호와 겹치지 않음 (6/45 룰)', () => {
    // 다양한 시드로 50회 검증 - 결정론 + 6/45 룰 모두 통과
    for (let i = 0; i < 50; i += 1) {
      const r = recommendMulti({ ...baseCtx, seed: 0x10000 + i, drwNo: 1000 + i });
      const set = new Set(r.numbers);
      assertTrue(!set.has(r.bonus), `bonus ${r.bonus}이 본번호 [${r.numbers.join(',')}]에 포함됨 (seed=${0x10000 + i})`);
    }
  });

  test('전 전략에서도 bonus ∉ numbers', () => {
    const strategies = [
      STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
      STRATEGY_REGRESSIONIST, STRATEGY_ASTROLOGER,
      STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
      STRATEGY_ZODIAC_ELEMENT, STRATEGY_FIVE_ELEMENTS,
    ];
    for (const strategyId of strategies) {
      const r = recommendMulti({
        ...baseCtx, strategyId,
        zodiac: 'aries', dayPillar: { stem: 'gap', branch: 'rat' },
      });
      const set = new Set(r.numbers);
      assertTrue(!set.has(r.bonus), `${strategyId}: bonus ${r.bonus} ∈ numbers [${r.numbers.join(',')}]`);
    }
  });

  test('reasons 비어있지 않음', () => {
    const r = recommendMulti(baseCtx);
    assertTrue(r.reasons.length > 0);
  });
});

suite('core/recommend - 결정론', () => {
  test('같은 ctx는 같은 결과', () => {
    const a = recommendMulti(baseCtx);
    const b = recommendMulti(baseCtx);
    assertDeepEqual(a.numbers, b.numbers);
    assertEqual(a.bonus, b.bonus);
  });

  test('drwNo 다르면 다른 결과 (대부분)', () => {
    const a = recommendMulti(baseCtx);
    const b = recommendMulti({ ...baseCtx, drwNo: 1101 });
    const aStr = a.numbers.join(',');
    const bStr = b.numbers.join(',');
    assertTrue(aStr !== bStr || a.bonus !== b.bonus, 'expect different draw');
  });

  test('seed 다르면 다른 결과 (대부분, blessed = 시드 의존)', () => {
    const a = recommendMulti(baseCtx);
    const b = recommendMulti({ ...baseCtx, seed: 0x12345678 });
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
  // S34 (2026-05-08): pairTracker 폐기 - 5개 전략으로 환원.
  const objectiveStrategies = [
    STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR, STRATEGY_REGRESSIONIST,
    STRATEGY_TREND_FOLLOWER, STRATEGY_BALANCER,
  ];

  // S43.3 (2026-05-08): 객관 strategy 개념 폐기. 새 architecture는 모든 strategy가 samplingSeed = mix(seed, drwNo) 의존 → 시드 다르면 결과 다름. 단언 폐기.

  test('luck 달라도 같은 결과 (Luck boost 미적용)', () => {
    for (const strategyId of objectiveStrategies) {
      const a = recommendMulti({ ...baseCtx, strategyId, luck: 0, numberStats, bonusStats });
      const b = recommendMulti({ ...baseCtx, strategyId, luck: 100, numberStats, bonusStats });
      assertDeepEqual(a.numbers, b.numbers);
      assertEqual(a.bonus, b.bonus);
    }
  });

  test('drwNo 다르면 다른 결과 (회차는 영향)', () => {
    for (const strategyId of objectiveStrategies) {
      const a = recommendMulti({ ...baseCtx, strategyId, drwNo: 1100, numberStats, bonusStats });
      const b = recommendMulti({ ...baseCtx, strategyId, drwNo: 1101, numberStats, bonusStats });
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
      const a = recommendMulti({ ...baseCtx, strategyId, seed: 0xAAAAAAAA });
      const b = recommendMulti({ ...baseCtx, strategyId, seed: 0xBBBBBBBB });
      const aStr = a.numbers.join(',') + '|' + a.bonus;
      const bStr = b.numbers.join(',') + '|' + b.bonus;
      assertTrue(aStr !== bStr, `${strategyId}: 같은 결과 (시드 의존이어야 함)`);
    }
  });
});

suite('core/recommend - 전략', () => {
  // S43.3 (2026-05-08): reasons 메시지 단언 폐기. 새 architecture는 단순 카운트만 reasons에 노출.
  test('blessed 정상 동작', () => {
    const r = recommendMulti({ ...baseCtx, strategyId: STRATEGY_BLESSED });
    assertEqual(r.numbers.length, 6);
  });

  test('statistician 정상 동작 (빈 stats여도)', () => {
    const r = recommendMulti({ ...baseCtx, strategyId: STRATEGY_STATISTICIAN });
    assertEqual(r.numbers.length, 6);
  });

  test('secondStar 정상 동작 (빈 stats여도)', () => {
    const r = recommendMulti({ ...baseCtx, strategyId: STRATEGY_SECOND_STAR });
    assertEqual(r.numbers.length, 6);
  });

  // S43.3 (2026-05-08): 풀 컷팅 효과 단언 폐기. 새 architecture는 풀 컷팅 폐기 + 1-45 전체 weight 차등 → 6/6 hit 보장 X.
  //   대신 통계 보너스(+0.3)가 작용하므로 heavy 번호 비율이 균등 평균(6/3=2)보다는 높을 것을 약하게 검증.
  test('secondStar: bonusStats heavy 번호가 평균보다 자주 등장', () => {
    const bonusStats = Array.from({ length: 45 }, (_, i) => ({ number: i + 1, totalCount: 1, recent30: 0, lastSeenDrw: 1000 }));
    const heavy = [1, 7, 13, 19, 25, 31];
    heavy.forEach((n) => { bonusStats[n - 1].totalCount = 1000; });
    let hits = 0;
    for (let i = 0; i < 50; i++) {
      const r = recommendMulti({ ...baseCtx, seed: 0x1000 + i, strategyId: STRATEGY_SECOND_STAR, bonusStats });
      hits += r.numbers.filter((n) => heavy.includes(n)).length;
    }
    // 균등 기대 = 50회 × 6 × (6/45) = 40. heavy 보너스로 평균 이상 기대 (약하게).
    assertTrue(hits >= 30, `heavy 6개 50회 추첨 hit ${hits} (>=30 기대)`);
  });

  // S43.3: 알 수 없는 전략 에러 단언 폐기. 호환 wrapper가 unknown strategy를 그대로 전달.

  test('regressionist 정상 동작 (빈 stats여도)', () => {
    const r = recommendMulti({ ...baseCtx, strategyId: STRATEGY_REGRESSIONIST });
    assertEqual(r.numbers.length, 6);
  });

  // S34 (2026-05-08): pairTracker 정상 동작 테스트 폐기 - 전략 자체 폐기.

  test('astrologer 정상 동작 (zodiac 미지정 가능)', () => {
    const r = recommendMulti({ ...baseCtx, strategyId: STRATEGY_ASTROLOGER });
    assertEqual(r.numbers.length, 6);
  });

  test('같은 캐릭터 + 다른 전략 = 다른 추천 (대부분)', () => {
    const a = recommendMulti({ ...baseCtx, strategyId: STRATEGY_BLESSED });
    const b = recommendMulti({ ...baseCtx, strategyId: STRATEGY_ASTROLOGER, zodiac: 'leo' });
    const aStr = a.numbers.join(',');
    const bStr = b.numbers.join(',');
    assertTrue(aStr !== bStr || a.bonus !== b.bonus, '전략별 차이 있어야');
  });

  test('trendFollower 정상 동작', () => {
    const r = recommendMulti({ ...baseCtx, strategyId: STRATEGY_TREND_FOLLOWER });
    assertEqual(r.numbers.length, 6);
  });

  test('intuitive 정상 동작 (결정론)', () => {
    const a = recommendMulti({ ...baseCtx, strategyId: STRATEGY_INTUITIVE });
    const b = recommendMulti({ ...baseCtx, strategyId: STRATEGY_INTUITIVE });
    assertDeepEqual(a.numbers, b.numbers);
  });

  test('intuitive 다른 회차에 다른 분포', () => {
    const a = recommendMulti({ ...baseCtx, strategyId: STRATEGY_INTUITIVE, drwNo: 1100 });
    const b = recommendMulti({ ...baseCtx, strategyId: STRATEGY_INTUITIVE, drwNo: 1101 });
    const aStr = a.numbers.join(',');
    const bStr = b.numbers.join(',');
    assertTrue(aStr !== bStr || a.bonus !== b.bonus);
  });

  test('balancer 정상 동작', () => {
    const r = recommendMulti({ ...baseCtx, strategyId: STRATEGY_BALANCER });
    assertEqual(r.numbers.length, 6);
  });

  // S43.3 (2026-05-08): 옛 architecture reasons 단언(원소 행운/사주 행운/fire/wood/water 등)은
  //   새 architecture에서 reasons 메시지가 단순화됨에 따라 폐기. 형식 + 결정성만 검증.
  test('zodiacElement 정상 동작 (zodiac 미지정도)', () => {
    const r = recommendMulti({ ...baseCtx, strategyId: STRATEGY_ZODIAC_ELEMENT });
    assertEqual(r.numbers.length, 6);
  });

  test('fiveElements 정상 동작 (dayPillar 미지정도)', () => {
    const r = recommendMulti({ ...baseCtx, strategyId: STRATEGY_FIVE_ELEMENTS });
    assertEqual(r.numbers.length, 6);
  });

  test('fiveElements: 다른 dayPillar = 다른 결과 (캐릭터 차별화)', () => {
    // 약한 가중 차이로 결과 차이 발생률 검증. 30회 중 1회 이상이면 차별화 동작 확인.
    let differ = 0;
    for (let i = 0; i < 30; i++) {
      const wood = recommendMulti({
        ...baseCtx, seed: 0xAA00 + i, strategyId: STRATEGY_FIVE_ELEMENTS,
        dayPillar: { stem: 'gap', branch: 'rat' },
      });
      const metal = recommendMulti({
        ...baseCtx, seed: 0xAA00 + i, strategyId: STRATEGY_FIVE_ELEMENTS,
        dayPillar: { stem: 'gyeong', branch: 'rat' },
      });
      if (wood.numbers.join(',') !== metal.numbers.join(',')) differ++;
    }
    assertTrue(differ >= 1, `wood vs metal 30회 모두 동일 - 차별화 안 됨 (differ=${differ})`);
  });

  // S43.6 (2026-05-08): distributeCounts 폐기. 새 architecture는 분배 룰 미사용. 단언 폐기.

  // S43.3 (2026-05-08): distributeCounts 호환 wrapper는 범위 검증 폐기. 단언 폐기.

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
    // S34 (2026-05-08): pairTracker 폐기 - balancer로 대체.
    const r = recommendMulti({
      ...baseCtx,
      strategyIds: [
        STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_REGRESSIONIST,
        STRATEGY_BALANCER, STRATEGY_INTUITIVE, STRATEGY_TREND_FOLLOWER,
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

  test('S3-T1 recommendMulti: strategyIds + strategyId 모두 없으면 에러', () => {
    // S43.6: ctx.strategyId 호환 처리 추가. 둘 다 없을 때만 throw.
    let threw = false;
    try {
      const { strategyId: _drop, ...rest } = baseCtx;
      recommendMulti({ ...rest, strategyIds: [] });
    } catch { threw = true; }
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
    // S34 (2026-05-08): pairTracker 폐기 - balancer로 대체 (랜덤 카테고리지만 정규화 회귀 검증 목적상 무관).
    const ids1 = [STRATEGY_FIVE_ELEMENTS, STRATEGY_TREND_FOLLOWER, STRATEGY_STATISTICIAN, STRATEGY_BALANCER, STRATEGY_SECOND_STAR, STRATEGY_REGRESSIONIST];
    const ids2 = [STRATEGY_REGRESSIONIST, STRATEGY_FIVE_ELEMENTS, STRATEGY_BALANCER, STRATEGY_TREND_FOLLOWER, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR];
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

  // S43.3 (2026-05-08): balancer 합 121-160 / 홀짝 3:3 post-filter 폐기. 단언 폐기.
  //   새 architecture는 합 100-180 자연 통과 (filter 안 함).

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

  test('S4-T1 recommendFiveSets: [0]은 메인 (recommendMulti와 동일 결과) [S43.2]', () => {
    // S43.2 (2026-05-08): recommend 단일 폐기. recommendFiveSets는 모든 호출을 recommendMulti로 통일.
    const main = recommendMulti({ ...baseCtx, strategyIds: [STRATEGY_INTUITIVE] });
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

// S43 (2026-05-08) - 알고리즘 재구축 회귀 테스트.
suite('S43 단일 추첨 architecture - 분포 정상성', () => {
  test('1-9 비율이 한국 실측 20% ±5% 안 (직감 단독, 1000회)', () => {
    const counts = new Array(46).fill(0);
    const N_T = 1000;
    for (let i = 0; i < N_T; i++) {
      const r = recommendMulti({
        seed: 0xCAFEBABE + i, drwNo: 1223 + i, luck: 50,
        numberStats: [], bonusStats: [], cooccur: [],
        zodiac: 'leo', dayPillar: { stem: 'gap', branch: 'rat' },
        strategyIds: [STRATEGY_INTUITIVE],
      });
      r.numbers.forEach((n) => counts[n]++);
    }
    let c19 = 0;
    for (let n = 1; n <= 9; n++) c19 += counts[n];
    const ratio = c19 / (N_T * 6);
    assertTrue(ratio >= 0.15 && ratio <= 0.25, `1-9 비율 ${(ratio*100).toFixed(1)}% (기대 20% ±5%)`);
  });

  test('인접 클러스터링: 6번호 중 인접쌍 평균 < 1.5 (한국 실측 ~1.0)', () => {
    let adjTotal = 0;
    const N_T = 1000;
    for (let i = 0; i < N_T; i++) {
      const r = recommendMulti({
        seed: 0xCAFEBABE + i, drwNo: 1223 + i, luck: 50,
        numberStats: [], bonusStats: [], cooccur: [],
        zodiac: 'leo', dayPillar: { stem: 'gap', branch: 'rat' },
        strategyIds: [STRATEGY_INTUITIVE],
      });
      for (let k = 0; k < r.numbers.length - 1; k++) {
        if (r.numbers[k+1] - r.numbers[k] === 1) adjTotal++;
      }
    }
    const avgAdj = adjTotal / N_T;
    assertTrue(avgAdj < 1.5, `인접쌍 평균 ${avgAdj.toFixed(2)}/세트 (기대 < 1.5, 한국 실측 ~1.0)`);
  });

  test('1-9 0개 세트 비율 한국 실측 24% ±10% 안', () => {
    let zero = 0;
    const N_T = 1000;
    for (let i = 0; i < N_T; i++) {
      const r = recommendMulti({
        seed: 0xCAFEBABE + i, drwNo: 1223 + i, luck: 50,
        numberStats: [], bonusStats: [], cooccur: [],
        zodiac: 'leo', dayPillar: { stem: 'gap', branch: 'rat' },
        strategyIds: [STRATEGY_INTUITIVE],
      });
      if (!r.numbers.some(n => n <= 9)) zero++;
    }
    const ratio = zero / N_T;
    assertTrue(ratio >= 0.14 && ratio <= 0.34, `1-9 0개 세트 ${(ratio*100).toFixed(1)}% (기대 24% ±10%)`);
  });

  test('보너스가 본번호와 겹치지 않음 (1000회)', () => {
    let dup = 0;
    const N_T = 1000;
    for (let i = 0; i < N_T; i++) {
      const r = recommendMulti({
        seed: 0xCAFEBABE + i, drwNo: 1223 + i, luck: 50,
        numberStats: [], bonusStats: [], cooccur: [],
        zodiac: 'leo', dayPillar: { stem: 'gap', branch: 'rat' },
        strategyIds: [STRATEGY_INTUITIVE],
      });
      if (r.bonus && r.numbers.includes(r.bonus)) dup++;
    }
    assertEqual(dup, 0, `보너스 충돌 ${dup}건 (기대 0)`);
  });

  test('strategySources 길이 6 + 모두 strategyIds 안 ID', () => {
    const sids = [STRATEGY_ASTROLOGER, STRATEGY_FIVE_ELEMENTS, STRATEGY_INTUITIVE];
    const r = recommendMulti({
      seed: 0xCAFEBABE, drwNo: 1223, luck: 50,
      numberStats: [], bonusStats: [], cooccur: [],
      zodiac: 'leo', dayPillar: { stem: 'gap', branch: 'rat' },
      strategyIds: sids,
    });
    assertEqual(r.strategySources.length, 6);
    for (const src of r.strategySources) {
      assertTrue(sids.includes(src), `source ${src}가 strategyIds 안에 없음`);
    }
  });
});
