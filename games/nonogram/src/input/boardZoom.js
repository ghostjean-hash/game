// 두 손가락 확대·이동. 손가락이 둘 이상 닿으면 칠하기를 끊고 이 모드로 넘어간다.
// 계산은 core/zoom.js(순수 함수)가 하고 여기서는 DOM(셀 크기·스크롤)에만 반영한다.
// 규칙은 docs/01_spec.md §3, 설계 근거는 docs/06_plan_zoom_pan.md.

import { clampCell, distance, midpoint, zoomScroll } from '../core/zoom.js';

/**
 * @param {HTMLElement} viewportEl 스크롤 영역(.puzzle-wrap)
 * @param {object} cb
 * @param {() => number} cb.getCell        현재 셀 크기(px)
 * @param {(px:number) => void} cb.setCell 셀 크기 반영(레이아웃 갱신까지)
 * @param {() => {min:number, max:number}} cb.getLimits 축소 하한 / 확대 상한
 * @param {() => {w:number, h:number}} cb.getClueSize   힌트가 차지하는 고정 폭·높이
 * @param {() => void} cb.onGestureStart   두 손가락 인식 순간(칠하기 취소용)
 */
export function attachBoardZoom(viewportEl, cb) {
  const points = new Map();   // pointerId → { x, y }
  let gesture = null;         // 제스처 시작 시점의 스냅샷

  const twoPoints = () => {
    const it = points.values();
    return [it.next().value, it.next().value];
  };

  function beginGesture() {
    const [a, b] = twoPoints();
    if (!a || !b) return;
    const rect = viewportEl.getBoundingClientRect();
    const mid = midpoint(a, b);
    gesture = {
      dist: distance(a, b),
      cell: cb.getCell(),
      scrollLeft: viewportEl.scrollLeft,
      scrollTop: viewportEl.scrollTop,
      // 뷰포트 왼쪽 위를 기준으로 잰 초점(확대해도 이 자리에 있던 칸이 제자리에 남는다).
      focusX: mid.x - rect.left,
      focusY: mid.y - rect.top,
      midX: mid.x,
      midY: mid.y,
      clue: cb.getClueSize(),
    };
    cb.onGestureStart();
  }

  function updateGesture() {
    const [a, b] = twoPoints();
    if (!a || !b || !gesture) return;
    const dist = distance(a, b);
    if (!(gesture.dist > 0)) return;

    const { min, max } = cb.getLimits();
    const next = clampCell(Math.round(gesture.cell * (dist / gesture.dist)), min, max);
    if (next !== cb.getCell()) cb.setCell(next);

    // 확대 보정(초점 유지) + 밀기 보정(두 손가락 중점이 움직인 만큼 반대로 스크롤).
    const mid = midpoint(a, b);
    const base = { clueLen: 0, oldCell: gesture.cell, newCell: next };
    const left = zoomScroll({ ...base, scroll: gesture.scrollLeft, focus: gesture.focusX, clueLen: gesture.clue.w });
    const top = zoomScroll({ ...base, scroll: gesture.scrollTop, focus: gesture.focusY, clueLen: gesture.clue.h });
    viewportEl.scrollLeft = left - (mid.x - gesture.midX);
    viewportEl.scrollTop = top - (mid.y - gesture.midY);
  }

  viewportEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;          // 마우스는 확대 대상 아님(데스크톱은 화면이 넓다)
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (points.size === 2) beginGesture();
  });

  viewportEl.addEventListener('pointermove', (e) => {
    if (!points.has(e.pointerId)) return;
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture && points.size >= 2) {
      updateGesture();
      e.preventDefault();
    }
  });

  const drop = (e) => {
    if (!points.delete(e.pointerId)) return;
    if (points.size < 2) gesture = null;            // 손가락이 하나로 줄면 제스처 종료
  };
  viewportEl.addEventListener('pointerup', drop);
  viewportEl.addEventListener('pointercancel', drop);
  viewportEl.addEventListener('pointerleave', drop);

  return {
    /** 화면 회전·퍼즐 교체처럼 상태가 갈아엎힐 때 초기화. */
    reset() { points.clear(); gesture = null; },
    isActive() { return gesture !== null; },
  };
}
