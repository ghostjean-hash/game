// 게임별 네임스페이스를 자동 부여하는 localStorage 래퍼.
// 사용 예:
//   const store = createStorage("tetris");
//   store.set("highscore", 12000);
//   store.get("highscore", 0);

export function createStorage(namespace) {
  if (!namespace || typeof namespace !== "string") {
    throw new Error("createStorage: namespace required");
  }
  const prefix = `gg.${namespace}.`;

  function key(k) { return prefix + k; }

  return {
    get(k, fallback = null) {
      try {
        const raw = localStorage.getItem(key(k));
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(key(k), JSON.stringify(v));
      } catch {
        // quota exceeded 등은 조용히 무시(프로토타입)
      }
    },
    remove(k) {
      try { localStorage.removeItem(key(k)); } catch {}
    },
    clearAll() {
      try {
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) toRemove.push(k);
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    },
  };
}
