// Mulberry32 PRNG. SSOT: docs/02_data.md 1.9.
// core/는 DOM 금지. 순수 함수.

/**
 * Mulberry32. 32bit 시드를 받아 [0, 1) float 시퀀스 함수를 반환.
 * 동일 시드 = 동일 시퀀스 (결정론).
 * @param {number} seed unsigned 32bit
 * @returns {() => number} 호출 시 다음 [0, 1) 값
 */
export function mulberry32(seed) {
  let s = seed >>> 0;
  return function rand() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 두 32bit 시드를 결정론적으로 혼합.
 * 다른 회차 / 다른 컨텍스트에 같은 캐릭터 시드를 적용할 때 사용.
 * @param {number} a unsigned 32bit
 * @param {number} b unsigned 32bit
 * @returns {number} unsigned 32bit
 */
export function mixSeeds(a, b) {
  const x = (a ^ Math.imul(b, 0x9e3779b1)) >>> 0;
  return x;
}
