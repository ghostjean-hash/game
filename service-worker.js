// Cache version. 배포마다 bump해서 stale 캐시 무효화.
// v9 (2026-05-03): lotto Sprint 026-032 (S17-S23) - 추천 카드 보너스 폐기 / 통계 라벨 / 출처 식별성 / 시드 분산.
//   stale-while-revalidate라 옛 lotto 파일이 캐시되어 사용자 새로고침 후에도 옛 화면 노출되던 문제 해결.
// v10 (2026-05-03): lotto S24 - 흉/대길 배너 제거.
// v11 (2026-05-03): lotto S25 - 다중 전략 C+E안 (풀에서 직접 추출 + strategyIds 정규화).
// v12 (2026-05-03): lotto S26 - 누적 추천 세트 (조립식 N장 누적 + 회차 자동 비움).
// v13 (2026-05-03): lotto S26 hotfix - 누적 라벨 추천1 중복 정정 (추천2부터 시작).
// v14 (2026-05-03): lotto S27 - 메인 카드 폐기 / 누적 리스트 단일 영역 / + 버튼 전략 영역 이동.
// v15 (2026-05-04): lotto S28 - 추천 리스트를 + 버튼 직하로 이동 (조립→실행→결과 ↑→↓ 일직선).
// v16 (2026-05-04): lotto S29 - S28 폐기 + 채팅 UX 패턴(결과 위 / 도구 아래) + 액션바 통합(전체 비우기 + 휴지통 아이콘) + 라운드 통일 / 헤더 중앙 / 액션바 grid / disclaimer 폐기 (S29.1) + 메타 텍스트 폐기 / 사용 풀 표시 (S29.2) + 모바일 폭 최적화 (S29.3) + 디자인 토큰 정리 (S29.4 / 신규 토큰 2 + 깨진 잔여 0).
// v17 (2026-05-04): lotto S30 - 포커스 분리. 토글(선택/해제) ≠ 포커스(desc 표시 대상). 활성 list 마지막 원소가 자동 포커스, 해제 시 직전 활성으로 자동 이동. is-focused outline ring 시각. + S30.1: 사용 풀도 포커스 전략 1개 기준으로 통일 / 랜덤 카테고리 풀 미표시. + S30.2: 풀 정의를 mainWeights(applyLuck 전) 기준으로 정정. + S30.3: 짝꿍 키번호 노트 추가 (S30.4에서 폐기). + S30.4: 짝꿍 객관 승격 - 키번호 anchor 폐기, 동시출현 빈도 상위 페어 합집합 풀로 재설계 (사용자 직관 일치).
// v18 (2026-05-04): lotto S30.4 캐시 새로고침용 SW bump.
// v19 (2026-05-04): lotto S30.5 - **중대 버그 fix**. computePoolForStrategies 인덱스 1-based ↔ 0-based 불일치로 운세/통계 풀 표시가 정확히 -1 shift됐던 문제 정정. 추첨 결과 자체는 정확했음(weightedSample 별도 경로). 사용자 신뢰 회복.
// v20 (2026-05-04): lotto S30.6 - 사주 행운 일진 보너스 가시화 (B안). 캐릭터 카드 사주 패널에 추첨일 오행 + 관계 라벨 + 보너스 풀 별도 줄로 표시. 카드 = 추천 풀 100% 일치.
// v21 (2026-05-04): lotto S31 - 짝꿍 풀을 페어 박스 단위로 표시 (computePairsForPairTracker) + 전략 라벨 축약(축복/최신/많이/페어/보너스/적게/별자리/4원소/사주/균형) + 추천 리스트 좌측 padding 1.5배(12→18px).
// v22 (2026-05-04): lotto S32 - 추천 리스트 번호공 gap 80% (var(--space-1) * 0.8 = 3.2px). 시각 컴팩트.
const CACHE_VERSION = "v22";
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
