// Node CLI 진입점 (S7-T1, 2026-05-02 신설).
// SSOT: docs/04_conventions.md.
// 목적: GitHub Actions 또는 로컬 `node tests/run-node.js`로 자동 회귀 검증.
// 브라우저용 진입점은 tests/test.html → tests/runner.js 그대로 유지.
//
// 동작:
// 1. localStorage polyfill 주입 (data/storage.js + storage.test.js 동작 보장).
// 2. runner.js dynamic import → suites 자동 등록 → done() 호출.
// 3. core.js의 done()이 failed > 0이면 process.exit(1).

class MemoryStorage {
  constructor() { this._data = new Map(); }
  get length() { return this._data.size; }
  key(i) { return Array.from(this._data.keys())[i] ?? null; }
  getItem(k) { return this._data.has(k) ? this._data.get(k) : null; }
  setItem(k, v) { this._data.set(String(k), String(v)); }
  removeItem(k) { this._data.delete(k); }
  clear() { this._data.clear(); }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new MemoryStorage();
}

// fetch는 storage.js의 syncDraws에서 사용. Node 18+ 글로벌 fetch 있음. 없으면 no-op.
if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = async () => ({ ok: false, json: async () => null });
}

console.log('=== Lotto 자동 회귀 (Node CLI) ===');
const start = Date.now();
await import('./runner.js');
const ms = Date.now() - start;
console.log(`\n  완료 (${ms}ms)`);
