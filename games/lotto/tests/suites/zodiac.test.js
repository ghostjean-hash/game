import { suite, test, assertEqual, assertTrue } from '../core.js';
import {
  yearToAnimalSign, animalSignIndex,
  drwNoToAnimalSign, dateToAnimalSign, drawToAnimalSign,
  zodiacRelation,
} from '../../src/core/zodiac.js';

suite('core/zodiac - yearToAnimalSign', () => {
  test('1900 → rat (자/쥐)', () => assertEqual(yearToAnimalSign(1900), 'rat'));
  test('2024 → dragon (진/용)', () => assertEqual(yearToAnimalSign(2024), 'dragon'));
  test('1988 → dragon (88올림픽 무진년)', () => assertEqual(yearToAnimalSign(1988), 'dragon'));
  test('2000 → dragon (밀레니엄 경진년)', () => assertEqual(yearToAnimalSign(2000), 'dragon'));
  test('2025 → snake (사/뱀)', () => assertEqual(yearToAnimalSign(2025), 'snake'));
  test('2026 → horse (오/말)', () => assertEqual(yearToAnimalSign(2026), 'horse'));
  test('1995 → pig (해/돼지)', () => assertEqual(yearToAnimalSign(1995), 'pig'));
});

suite('core/zodiac - relations', () => {
  test('동일 띠 = same', () => assertEqual(zodiacRelation('rat', 'rat'), 'same'));
  test('rat - horse (6 떨어짐) = chung', () => assertEqual(zodiacRelation('rat', 'horse'), 'chung'));
  test('rat - dragon (4 떨어짐) = sahap', () => assertEqual(zodiacRelation('rat', 'dragon'), 'sahap'));
  test('rat - monkey (8 떨어짐) = sahap', () => assertEqual(zodiacRelation('rat', 'monkey'), 'sahap'));
  test('rat - ox (1 떨어짐) = normal', () => assertEqual(zodiacRelation('rat', 'ox'), 'normal'));
  test('미존재 띠는 normal', () => assertEqual(zodiacRelation('alien', 'rat'), 'normal'));
});

suite('core/zodiac - drwNoToAnimalSign', () => {
  test('결정론', () => assertEqual(drwNoToAnimalSign(1100), drwNoToAnimalSign(1100)));
  test('12 차이 회차는 같은 띠', () => assertEqual(drwNoToAnimalSign(0), drwNoToAnimalSign(12)));
  test('출력은 12간지 ID', () => assertTrue(animalSignIndex(drwNoToAnimalSign(42)) >= 0));
});

suite('core/zodiac - dateToAnimalSign', () => {
  test('1984-02-02 = rat (60갑자 시작 갑자일)', () => {
    assertEqual(dateToAnimalSign('1984-02-02'), 'rat');
  });
  test('1984-02-03 = ox (을축)', () => {
    assertEqual(dateToAnimalSign('1984-02-03'), 'ox');
  });
  test('12일 후 rat 회귀', () => {
    assertEqual(dateToAnimalSign('1984-02-14'), 'rat');
  });
  test('잘못된 입력은 null', () => {
    assertEqual(dateToAnimalSign('not-a-date'), null);
  });
  test('타입 잘못된 입력은 null', () => {
    assertEqual(dateToAnimalSign(null), null);
  });
});

suite('core/zodiac - drawToAnimalSign', () => {
  test('drwDate 있으면 정밀 일진', () => {
    assertEqual(drawToAnimalSign({ drwNo: 1, drwDate: '1984-02-02' }), 'rat');
  });
  test('drwDate 없으면 drwNo mod 12 fallback', () => {
    assertEqual(drawToAnimalSign({ drwNo: 12 }), 'rat');
  });
  test('숫자 인자는 drwNo 모드', () => {
    assertEqual(drawToAnimalSign(0), 'rat');
  });
  test('완전 잘못된 인자는 null', () => {
    assertEqual(drawToAnimalSign({}), null);
  });
});
