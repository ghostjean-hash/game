import { suite, test, assertEqual, assertTrue } from '../core.js';
import { mulberry32, mixSeeds } from '../../src/core/random.js';

suite('core/random', () => {
  test('mulberry32: 같은 시드는 같은 첫 값', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    assertEqual(a(), b());
  });

  test('mulberry32: 같은 시드는 같은 시퀀스 (10 step)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 10; i += 1) {
      assertEqual(a(), b());
    }
  });

  test('mulberry32: 다른 시드는 다른 첫 값', () => {
    const a = mulberry32(42);
    const b = mulberry32(43);
    assertTrue(a() !== b());
  });

  test('mulberry32: 출력은 [0, 1) 범위', () => {
    const r = mulberry32(123);
    for (let i = 0; i < 100; i += 1) {
      const v = r();
      assertTrue(v >= 0 && v < 1, `out of [0,1): ${v}`);
    }
  });

  test('mulberry32: 분포 대략 균등 (1000샘플 평균 0.5±0.05)', () => {
    const r = mulberry32(7);
    let sum = 0;
    const n = 1000;
    for (let i = 0; i < n; i += 1) sum += r();
    const mean = sum / n;
    assertTrue(mean > 0.45 && mean < 0.55, `mean ${mean} out of band`);
  });

  test('mixSeeds: 결정론', () => {
    assertEqual(mixSeeds(1, 2), mixSeeds(1, 2));
  });

  test('mixSeeds: a, b 순서 다르면 결과 다름', () => {
    assertTrue(mixSeeds(1, 2) !== mixSeeds(2, 1));
  });

  test('mixSeeds: 출력은 unsigned 32bit', () => {
    const r = mixSeeds(0xdeadbeef, 0x12345678);
    assertTrue(Number.isInteger(r));
    assertTrue(r >= 0 && r <= 0xffffffff);
  });
});
