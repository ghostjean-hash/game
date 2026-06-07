import { suite, test, assertEqual, assertTrue } from '../core.js';
import { fortuneFor, fortuneRelation } from '../../src/core/fortune.js';
import { pickFortuneCopy, FORTUNE_COPY_POOL } from '../../src/data/numbers.js';

suite('core/fortune', () => {
  test('결정론: 같은 입력 = 같은 출력', () => {
    assertEqual(fortuneFor(123, 1100, 'rat'), fortuneFor(123, 1100, 'rat'));
  });

  test('animalSign 누락도 동작 (legacy 호환)', () => {
    const r = fortuneFor(42, 1100);
    assertTrue(['great', 'good', 'neutral', 'bad'].includes(r));
  });

  test('출력은 4가지 등급 중 하나', () => {
    const valid = ['great', 'good', 'neutral', 'bad'];
    assertTrue(valid.includes(fortuneFor(42, 1100, 'dragon')));
  });

  test('20회차 다양성: 적어도 2종 등급', () => {
    const set = new Set();
    for (let n = 1; n <= 20; n += 1) set.add(fortuneFor(42, n, 'rat'));
    assertTrue(set.size >= 2);
  });

  test('fortuneRelation: rat 캐릭터 + drwNo 12 → same', () => {
    assertEqual(fortuneRelation('rat', 12), 'same');
  });

  test('fortuneRelation: rat 캐릭터 + drwNo 6 → chung', () => {
    assertEqual(fortuneRelation('rat', 6), 'chung');
  });

  test('chung 관계 1000샘플: bad 비율이 normal보다 높음', () => {
    // rat - horse (drwNo % 12 == 6) = chung. bad 40%.
    // normal 관계는 bad 15%. 비교.
    let chungBad = 0;
    let normalBad = 0;
    for (let n = 1; n <= 1000; n += 1) {
      const seed = (n * 0x9e3779b1) >>> 0;
      // drwNo % 12 == 6 = horse → rat과 chung
      const chungDrw = n * 12 + 6;
      // drwNo % 12 == 1 = ox → rat과 normal
      const normalDrw = n * 12 + 1;
      if (fortuneFor(seed, chungDrw, 'rat') === 'bad') chungBad += 1;
      if (fortuneFor(seed, normalDrw, 'rat') === 'bad') normalBad += 1;
    }
    assertTrue(chungBad > normalBad, `chung bad ${chungBad} should exceed normal bad ${normalBad}`);
  });
});

// S2 후속 (2026-06-07): pickFortuneCopy 회차 변형 운세 문구.
suite('data/numbers - pickFortuneCopy (운세 문구 회차 변형)', () => {
  test('결정론: 같은 등급+시드+회차 = 같은 문구', () => {
    assertEqual(pickFortuneCopy('neutral', 123, 1100), pickFortuneCopy('neutral', 123, 1100));
  });
  test('등급별 풀 안에서 반환', () => {
    for (const f of ['great', 'good', 'neutral', 'bad']) {
      assertTrue(FORTUNE_COPY_POOL[f].includes(pickFortuneCopy(f, 7, 1234)), `${f} 풀 내 문구`);
    }
  });
  test('회차에 따라 문구 변형 (시드 0 고정, 회차만 변경)', () => {
    const pool = FORTUNE_COPY_POOL.neutral;
    const seen = new Set();
    for (let d = 0; d < pool.length; d += 1) seen.add(pickFortuneCopy('neutral', 0, d));
    assertTrue(seen.size > 1, '회차 변화로 2개 이상 문구 등장');
  });
});
