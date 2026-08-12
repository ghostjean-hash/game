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

// 로그인 여부와 무관하게 딱 한 번만 실제로 동기화를 켠다(로그인 감지 경로가 둘이라 중복 방지).
let started = false;

async function startSync(auth) {
  if (started) return;
  started = true;

  const local = createLocal();
  const remote = createDriveRemote({
    getToken: (opts) => auth.getToken(opts),
    invalidateToken: () => auth.invalidateToken(),
  });
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

async function boot() {
  if (!CLIENT_ID) return;

  // 게임 화면에서는 주소 이동 갱신을 쓰지 않는다(redirectRenew 기본값 false).
  // 되살리려고 화면을 구글로 옮기면 놀이 중인 판이 사라진다 - 게임 도중에는 아무것도 묻지 않는다는
  // 규정(설계 4.4.4)과 같은 이유다. 만료됐으면 동기화만 멈추고, 허브에 들어올 때 되살아난다.
  const auth = createGoogleAuth({ clientId: CLIENT_ID, scope: SCOPE });
  if (auth.isSignedIn()) {
    await startSync(auth);
    return;
  }

  // 이 탭이 로그인 전에 열려 그냥 넘어갔더라도, 로그인은 다른 탭(허브)에서 일어날 수 있다.
  // storage 이벤트는 변경을 일으킨 탭 자신에게는 오지 않고 같은 오리진의 다른 탭에만 온다 -
  // 그래서 이 탭은 로그인 순간을 놓치고, 다시 완전히 새로 열어야만 동기화가 켜졌다
  // (2026-08-12 신고: 게임을 로그인 전에 플레이하고 나중에 로그인해도 반영이 안 됨).
  // 로그인 관련 값(gg.__cloud.*)이 바뀌면 다시 확인해 이 탭에서도 늦게라도 동기화를 켠다.
  const onStorage = (e) => {
    if (e.key !== null && !e.key.startsWith("gg.__cloud.")) return;
    if (!auth.isSignedIn()) return;
    removeEventListener("storage", onStorage);
    startSync(auth).catch(() => {});
  };
  addEventListener("storage", onStorage);
}

boot().catch(() => {});
