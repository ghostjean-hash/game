// Cache version. 배포마다 bump해서 stale 캐시 무효화.
// v9 (2026-05-03): lotto Sprint 026-032 (S17-S23) - 추천 카드 보너스 폐기 / 통계 라벨 / 출처 식별성 / 시드 분산.
//   stale-while-revalidate라 옛 lotto 파일이 캐시되어 사용자 새로고침 후에도 옛 화면 노출되던 문제 해결.
// v10 (2026-05-03): lotto S24 - 흉/대길 배너 제거.
// v11 (2026-05-03): lotto S25 - 다중 전략 C+E안 (풀에서 직접 추출 + strategyIds 정규화).
// v12 (2026-05-03): lotto S26 - 누적 추천 세트 (조립식 N장 누적 + 회차 자동 비움).
// v13 (2026-05-03): lotto S26 hotfix - 누적 라벨 추천1 중복 정정 (추천2부터 시작).
const CACHE_VERSION = "v13";
const CACHE_NAME = `game-ghost-${CACHE_VERSION}`;

// 항상 network-first로 응답할 경로. 게임 목록 / 게임 메타 / 회차 정적 데이터.
const NETWORK_FIRST_PATHS = [
  "/games/_registry.json",
  "/games/lotto/src/data/draws.json",
];

// 셸(런처 + 공통 모듈) 사전 캐시. 게임은 첫 방문 시 lazy 캐시.
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable.png",
  "./shared/tokens.css",
  "./shared/base.css",
  "./shared/input.js",
  "./shared/storage.js",
  "./shared/loop.js",
  "./shared/ui.js",
  "./games/_registry.json",
  "./games/tetris/index.html",
  "./games/tetris/style.css",
  "./games/tetris/game.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate: 캐시 즉시 응답 + 백그라운드에서 갱신.
// 단, navigate 요청은 network-first(새 버전 빠르게 반영).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // _registry.json 등은 항상 network-first. 게임 추가 / 변경 즉시 반영.
  if (NETWORK_FIRST_PATHS.some((p) => url.pathname.endsWith(p))) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
