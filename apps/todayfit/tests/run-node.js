// node 진입점. 실행: node tests/run-node.js (작업 폴더 apps/todayfit)
//
// core/ 는 브라우저를 부르지 않으므로 대역이 거의 필요 없다. 다만 store/ 가 붙으면
// localStorage 가 필요해지므로 미리 얇은 대역을 깔아 둔다(lotto 의 같은 파일이 선례).

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
  key(i) { return Array.from(this.map.keys())[i] ?? null; }
  get length() { return this.map.size; }
}

// node 판에 따라 빈 builtin 이 먼저 잡혀 있을 수 있어 덮어쓸 수 있는지 먼저 본다.
if (!globalThis.localStorage || typeof globalThis.localStorage.setItem !== 'function') {
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  } catch {
    globalThis.localStorage = new MemoryStorage();
  }
}

const mod = await import('./runner.js');
process.exit(mod.ok ? 0 : 1);
