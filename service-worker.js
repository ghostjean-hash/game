// Cache version. 배포마다 bump해서 stale 캐시 무효화.
const CACHE_VERSION = "v2";
const CACHE_NAME = `game-ghost-${CACHE_VERSION}`;

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
