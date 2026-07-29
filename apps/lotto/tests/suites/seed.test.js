import { suite, test, assertEqual, assertTrue } from '../core.js';
import { fnv1a, characterSeed } from '../../src/core/seed.js';

suite('core/seed', () => {
  test('fnv1a: 빈 문자열은 FNV offset', () => {
    assertEqual(fnv1a(''), 0x811c9dc5);
  });

  test('fnv1a: 같은 입력은 같은 출력', () => {
    assertEqual(fnv1a('hello'), fnv1a('hello'));
  });

  test('fnv1a: 다른 입력은 다른 출력', () => {
    assertTrue(fnv1a('hello') !== fnv1a('world'), 'hello and world should differ');
  });

  test('fnv1a: 한 글자만 달라도 다른 출력', () => {
    assertTrue(fnv1a('hello') !== fnv1a('hellp'), 'hello and hellp should differ');
  });

  test('fnv1a: 출력은 unsigned 32bit 정수', () => {
    const h = fnv1a('test');
    assertTrue(Number.isInteger(h), 'must be integer');
    assertTrue(h >= 0 && h <= 0xffffffff, 'must be in u32 range');
  });

  test('characterSeed: 같은 입력은 같은 시드', () => {
    const input = { birthYMD: '1990-05-01', name: '홍길동', zodiac: 'taurus', luckyWord: '바람' };
    assertEqual(characterSeed(input), characterSeed(input));
  });

  test('characterSeed: luckyWord만 달라도 시드 다름', () => {
    const a = { birthYMD: '1990-05-01', name: '홍길동', zodiac: 'taurus', luckyWord: '바람' };
    const b = { ...a, luckyWord: '구름' };
    assertTrue(characterSeed(a) !== characterSeed(b));
  });

  test('characterSeed: name만 달라도 시드 다름', () => {
    const a = { birthYMD: '1990-05-01', name: '홍길동', zodiac: 'taurus', luckyWord: '바람' };
    const b = { ...a, name: '김철수' };
    assertTrue(characterSeed(a) !== characterSeed(b));
  });

  test('characterSeed: zodiac만 달라도 시드 다름', () => {
    const a = { birthYMD: '1990-05-01', name: '홍길동', zodiac: 'taurus', luckyWord: '바람' };
    const b = { ...a, zodiac: 'gemini' };
    assertTrue(characterSeed(a) !== characterSeed(b));
  });
});
