// 게임 화면에서 화면 요소 없이 동기화만 돌린다. SSOT: 설계 9.3.
//
// 버튼과 대화상자는 허브에만 둔다(사용자 결정 2026-07-29, 설계 7.4).
// 하지만 기록이 실제로 바뀌는 곳은 게임 화면이므로, 동기화 자체는 여기서도 돌아야
// PC와 폰을 오가며 끊김 없이 이어서 할 수 있다.
//
// 로그인하지 않은 사용자에게는 아무 일도 일어나지 않는다. 구글 스크립트조차 불러오지 않는다.

import { createLocal, deviceId } from "./local.js";
import { createDriveRemote } from "./remote.js";
import { createGoogleAuth } from "./auth.js";
import { createSync } from "./sync.js";
import { CLIENT_ID, SCOPE } from "./config.js";

async function boot() {
  if (!CLIENT_ID) return;

  const auth = createGoogleAuth({ clientId: CLIENT_ID, scope: SCOPE });
  if (!auth.isSignedIn()) return;

  const local = createLocal();
  const remote = createDriveRemote({ getToken: (opts) => auth.getToken(opts) });
  const sync = createSync({
    auth,
    remote,
    local,
    device: deviceId(),
    // 게임 화면은 저장이 잦다. 조금 더 짧게 모아 올려 다른 기기가 빨리 이어받게 한다.
    debounceMs: 2500,
    // 게임 도중에는 아무것도 묻지 않는다. 선택이 필요한 충돌은 올리지 않고 허브에서 처리한다.
    onConflicts: () => {},
  });

  globalThis.__ggCloudSync = sync;

  // 진입 시 한 번 내려받는다. 다른 기기에서 이어서 하는 경우가 여기서 해결된다.
  await sync.start();

  // 화면을 벗어나기 직전에 남은 변경을 밀어낸다.
  const flush = () => {
    try { sync.flushNow(); } catch {}
  };
  addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

boot().catch(() => {});
