// FNV-1a 32bit 해시. SSOT: docs/02_data.md 1.8.
// core/는 DOM 금지. 순수 함수.

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * FNV-1a 32bit hash.
 * @param {string} str
 * @returns {number} unsigned 32bit integer
 */
export function fnv1a(str) {
  let hash = FNV_OFFSET;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/**
 * 캐릭터 시드. 입력 객체 직렬화 후 FNV-1a 해시.
 * 직렬화 포맷: `birthYMD|name|zodiac|luckyWord` (docs/02_data.md 1.8).
 * @param {{ birthYMD: string, name: string, zodiac: string, luckyWord: string }} input
 * @returns {number}
 */
export function characterSeed(input) {
  const serialized = `${input.birthYMD}|${input.name}|${input.zodiac}|${input.luckyWord}`;
  return fnv1a(serialized);
}
