// 허브에서 클라우드 저장을 켜는 진입점. SSOT: 설계 6.3 S4.
//
// 버튼이 보이는 조건은 둘 중 하나다.
//   1. config.js의 CLIENT_ID가 채워져 있다 (S5 이후 실제 사용)
//   2. 주소에 ?cloudmock=1 이 붙어 있다 (화면 검증용 가짜 모드)
// 둘 다 아니면 아무것도 그리지 않는다. 동작하지 않는 버튼을 노출하지 않기 위해서다.

import { createLocal, deviceId } from "./local.js";
import { createMemoryRemote, createDriveRemote } from "./remote.js";
import { createMockAuth, createGoogleAuth } from "./auth.js";
import { createSync } from "./sync.js";
import { mountCloudUI } from "./ui.js";
import { CLIENT_ID, SCOPE } from "./config.js";

async function loadTitles() {
  const titles = {};
  const sources = [
    ["./games/_registry.json", "games", (id) => `gg.${id}`],
    ["./apps/_registry.json", "apps", (id) => `gg.${id}`],
  ];
  for (const [url, key, toSlot] of sources) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      const data = await res.json();
      for (const item of data[key] || []) {
        titles[toSlot(item.id)] = item.title || item.id;
      }
    } catch {}
  }
  // lotto는 자체 저장 규칙을 써서 슬롯 이름이 다르다.
  if (titles["gg.lotto"]) titles.lotto = titles["gg.lotto"];
  return titles;
}

// 화면 검증용 가짜 충돌(설계 5.4.4). 실제 저장 데이터는 건드리지 않는다.
function demoConflicts(now) {
  return [
    {
      slot: "gg.tetris",
      reason: "same-time-diff-content",
      // 각 게임이 실제로 쓰는 저장 키를 그대로 쓴다(화면에 없는 값이 뜨지 않도록).
      local: { updatedAt: now - 5 * 60 * 1000, createdAt: now - 9 * 86400000, lineage: "ln-demo-a", data: { "best.marathon": 12000 } },
      remote: { updatedAt: now - 5 * 60 * 1000, createdAt: now - 9 * 86400000, lineage: "ln-demo-a", data: { "best.marathon": 9400 } },
    },
    {
      slot: "gg.flightshooting",
      reason: "big-loss",
      local: { updatedAt: now - 2 * 3600000, createdAt: now - 3 * 86400000, lineage: "ln-demo-c", data: { best: 3200 } },
      remote: { updatedAt: now - 20 * 60 * 1000, createdAt: now - 40 * 86400000, lineage: "ln-demo-d", data: { best: 8700 } },
    },
  ];
}

export async function bootCloud({ container }) {
  if (!container) return null;
  const params = new URLSearchParams(location.search);
  const mock = params.get("cloudmock") === "1";
  if (!mock && !CLIENT_ID) return null;

  const local = createLocal();
  const auth = mock ? createMockAuth() : createGoogleAuth({ clientId: CLIENT_ID, scope: SCOPE });
  const remote = mock
    ? createMemoryRemote()
    : createDriveRemote({ getToken: (opts) => auth.getToken(opts) });
  const titles = await loadTitles();

  let ui = null;
  const sync = createSync({
    auth,
    remote,
    local,
    device: deviceId(),
    onStatus: (s) => ui && ui.setStatus(s),
    onConflicts: (c) => ui && ui.showConflicts(c),
  });

  ui = mountCloudUI({ container, auth, sync, local, titles });
  await sync.start();

  // 허브를 떠나기 직전에 남은 변경을 밀어낸다.
  const flush = () => {
    try { sync.flushNow(); } catch {}
  };
  addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });

  if (params.get("cloudconflict") === "1") {
    ui.showConflicts(demoConflicts(Date.now()));
  }

  return { sync, auth, ui };
}
