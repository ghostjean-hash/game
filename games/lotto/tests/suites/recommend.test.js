import { suite, test, assertEqual, assertTrue, assertDeepEqual } from '../core.js';
import { recommend } from '../../src/core/recommend.js';
import {
  STRATEGY_BLESSED, STRATEGY_STATISTICIAN, STRATEGY_SECOND_STAR,
  STRATEGY_REGRESSIONIST, STRATEGY_PAIR_TRACKER, STRATEGY_ASTROLOGER,
  STRATEGY_TREND_FOLLOWER, STRATEGY_INTUITIVE, STRATEGY_BALANCER,
  STRATEGY_MBTI, STRATEGY_ZODIAC_ELEMENT,
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
      STRATEGY_MBTI, STRATEGY_ZODIAC_ELEMENT,
    ];
    for (const strategyId of strategies) {
      const r = recommend({
        ...baseCtx, strategyId,
        zodiac: 'aries', mbti: 'INTJ',
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

  test('seed 다르면 다른 결과 (대부분)', () => {
    const a = recommend(baseCtx);
    const b = recommend({ ...baseCtx, seed: 0x12345678 });
    const aStr = a.numbers.join(',');
    const bStr = b.numbers.join(',');
    assertTrue(aStr !== bStr || a.bonus !== b.bonus);
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
    assertTrue(r.reasons[0].includes('통계학자'));
  });

  test('secondStar 정상 동작 (빈 stats여도)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_SECOND_STAR });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('2등의 별'));
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
    assertTrue(r.reasons[0].includes('회귀주의자'));
  });

  test('pairTracker 정상 동작 (빈 cooccur여도)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_PAIR_TRACKER });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('짝궁추적자'));
  });

  test('astrologer 정상 동작 (zodiac 미지정 가능)', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_ASTROLOGER });
    assertEqual(r.numbers.length, 6);
    assertTrue(r.reasons[0].includes('점성술사'));
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
    assertTrue(r.reasons[0].includes('추세추종자'));
  });

  test('intuitive 정상 동작 (결정론)', () => {
    const a = recommend({ ...baseCtx, strategyId: STRATEGY_INTUITIVE });
    const b = recommend({ ...baseCtx, strategyId: STRATEGY_INTUITIVE });
    assertDeepEqual(a.numbers, b.numbers);
    assertTrue(a.reasons[0].includes('직감주의자'));
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
    assertTrue(r.reasons[0].includes('균형주의자'));
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
    assertTrue(r.reasons[0].includes('별자리 원소'));
  });

  test('zodiacElement: leo는 fire 그룹', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_ZODIAC_ELEMENT, zodiac: 'leo' });
    assertTrue(r.reasons[0].includes('fire'));
  });

  test('zodiacElement: cancer는 water 그룹', () => {
    const r = recommend({ ...baseCtx, strategyId: STRATEGY_ZODIAC_ELEMENT, zodiac: 'cancer' });
    assertTrue(r.reasons[0].includes('water'));
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
