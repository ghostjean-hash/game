import { suite, test, assertEqual, assertTrue } from '../core.js';
import { fortuneFor, fortuneRelation } from '../../src/core/fortune.js';

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
