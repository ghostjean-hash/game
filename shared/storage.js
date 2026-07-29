// 게임별 네임스페이스를 자동 부여하는 localStorage 래퍼.
// 사용 예:
//   const store = createStorage("tetris");
//   store.set("highscore", 12000);
//   store.get("highscore", 0);

import { stampSlot, slotIdOf } from "./cloud/stamp.js";

// 클라우드 동기화 처리(설계 6.3 S3).
//   1) 이 기록이 방금 바뀌었다는 시각을 남긴다. 게임 화면에는 클라우드 UI가 없으므로
//      이 한 줄이 없으면 새로 세운 기록이 오래된 클라우드 기록에 덮인다(설계 9.2).
//   2) 허브에서 동기화가 돌고 있으면 업로드를 예약한다. 없으면 아무 일도 일어나지 않는다.
// 되돌리기: 아래 notifyCloud 호출 3곳만 지우면 원래 동작으로 즉시 복귀한다(설계 5.7.4).
function notifyCloud(namespace) {
  stampSlot(slotIdOf(namespace));
  try { globalThis.__ggCloudNotify?.(namespace); } catch {}
}

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
      notifyCloud(namespace);
    },
    remove(k) {
      try { localStorage.removeItem(key(k)); } catch {}
      notifyCloud(namespace);
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
      notifyCloud(namespace);
    },
  };
}
