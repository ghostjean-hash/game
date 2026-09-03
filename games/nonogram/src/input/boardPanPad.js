// 보드 아래 빈 이동 영역: 한 손가락 가로 밀기 → .puzzle-wrap 가로 스크롤.
// 칸 위 한 손가락 칠하기와 분리해, 큰 판에서도 실수 없이 원하는 열을 볼 수 있게 한다.

import { panScroll } from '../core/zoom.js';

/**
 * @param {HTMLElement} padEl 보드 아래 가로 이동 영역
 * @param {HTMLElement} viewportEl 스크롤 영역(.puzzle-wrap)
 */
export function attachBoardPanPad(padEl, viewportEl) {
  let drag = null;

  padEl.addEventListener('pointerdown', (e) => {
    drag = { id: e.pointerId, x: e.clientX, scrollLeft: viewportEl.scrollLeft };
    try { padEl.setPointerCapture(e.pointerId); } catch { /* noop */ }
    e.preventDefault();
  });

  padEl.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    // 손가락을 왼쪽으로 끌면 오른쪽 열을 보는 자연스러운 방향.
    viewportEl.scrollLeft = panScroll(drag.scrollLeft, drag.x, e.clientX);
    e.preventDefault();
  });

  const end = (e) => {
    if (drag?.id === e.pointerId) drag = null;
  };
  padEl.addEventListener('pointerup', end);
  padEl.addEventListener('pointercancel', end);
}
