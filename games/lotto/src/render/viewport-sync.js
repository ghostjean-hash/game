// 하단 탭(`.bottom-tabs`) 위치를 visual viewport bottom에 강제 동기.
// S088 (2026-05-17): 사용자 보고 "크롬 모바일에서 하단 크롬 메뉴와 하단 탭 보이기/숨기기 싱크가 정확히 맞지 않아 허접".
//
// 원인:
//   - `.bottom-tabs`는 position: fixed; bottom: 0 → layout viewport 기준.
//   - 크롬 모바일 하단 메뉴 슬라이딩은 visual viewport(visualViewport.height + offsetTop) 변화로 표출.
//   - layout vs visual 갭으로 fixed 요소가 크롬 바 슬라이딩에 한 박자 늦거나 jerky.
//
// 해법 (사용자 결정: 옵션 C + "항상 보임"):
//   - visualViewport API resize/scroll 이벤트 → window.innerHeight - (vv.offsetTop + vv.height) 만큼 위로 transform 보정.
//   - 결과: 크롬 바가 슬라이드 중이든 멈췄든 하단 탭이 visual viewport 안 visible bottom에 항상 부착.
//   - GPU layer 분리는 CSS(`will-change: transform`)에서 동반 적용.
//
// SSOT: docs/01_spec.md 4장 + docs/04_conventions.md 4.8.6.

let rafId = 0;
let resizeObs = null;

function applyOffset() {
  rafId = 0;
  const tabs = document.querySelector('.bottom-tabs');
  if (!tabs) return;
  const vv = window.visualViewport;
  if (!vv) {
    // 폴백: visualViewport 미지원 환경(매우 옛 브라우저)은 자연 layout viewport 기준 유지.
    tabs.style.transform = '';
    return;
  }
  // visual viewport bottom의 layout viewport 좌표 = vv.offsetTop + vv.height.
  // window.innerHeight가 layout viewport bottom(대략).
  // 차이만큼 위로 끌어올리면 하단 탭이 visual viewport visible bottom에 정확 부착.
  const offset = window.innerHeight - (vv.offsetTop + vv.height);
  tabs.style.transform = offset > 0 ? `translateY(-${offset}px)` : '';
}

function schedule() {
  if (rafId) return;
  rafId = requestAnimationFrame(applyOffset);
}

/**
 * 하단 탭 viewport 동기 시작. main.js 부트 시 1회 호출.
 * - visualViewport resize/scroll 양쪽 후크 (크롬 바 슬라이딩 + pinch zoom 패닝 모두 cover).
 * - window resize도 보조 (회전 + 데스크톱 resize).
 * - SSR / 노드 환경 가드.
 */
export function startBottomTabsViewportSync() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!window.visualViewport) {
    // 환경 미지원이면 no-op. 향후 폴백 룰 결정 시 본 분기 확장.
    return;
  }
  const vv = window.visualViewport;
  vv.addEventListener('resize', schedule);
  vv.addEventListener('scroll', schedule);
  window.addEventListener('resize', schedule);
  // 진입 1회 즉시 보정.
  schedule();
}
