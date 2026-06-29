// Pointer Events 드래그 → 이동 의도 산출. 차를 이동 축으로만 끌고, 손을 떼면 칸으로 스냅한다.
// 게임 규칙(이동 범위)은 core/board.js, 좌표 갱신은 render에 위임한다.

import { BOARD_SIZE, ORIENT, DRAG_SNAP_RATIO, DRAG_TAP_RATIO } from '../data/constants.js';
import { slideRange, axisPos } from '../core/board.js';

// boardEl에 드래그를 붙인다.
//   getCars(): 현재 cars 배열
//   onCommit(id, pos): 스냅된 새 시작 좌표로 이동 확정(변화 있을 때만 호출)
//   isLocked(): true면 입력 무시(클리어 오버레이 등)
export function attachDrag(boardEl, { getCars, onCommit, isLocked }) {
  let drag = null; // { el, car, isH, range, startPx, cellPx, startPos, downX, downY, center }

  function cellPx() {
    return boardEl.clientWidth / BOARD_SIZE;
  }

  function onDown(e) {
    if (isLocked && isLocked()) return;
    const el = e.target.closest('.car');
    if (!el || !boardEl.contains(el)) return;
    const id = el.dataset.id;
    const cars = getCars();
    const car = cars.find((c) => c.id === id);
    if (!car) return;

    const isH = car.orient === ORIENT.H;
    const rect = el.getBoundingClientRect();
    drag = {
      el,
      car,
      isH,
      range: slideRange(cars, id),
      startPx: isH ? e.clientX : e.clientY,
      cellPx: cellPx(),
      startPos: axisPos(car),
      downX: e.clientX,
      downY: e.clientY,
      // 탭 방향 판정용 차 중심(이동 축 기준).
      center: isH ? (rect.left + rect.right) / 2 : (rect.top + rect.bottom) / 2,
    };
    el.classList.add('dragging');
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  // 드래그 변위를 이동 가능 범위 안의 px 오프셋으로 클램프해 반환.
  function clampedOffset(e) {
    const cur = drag.isH ? e.clientX : e.clientY;
    const raw = cur - drag.startPx;
    const minOff = (drag.range.min - drag.startPos) * drag.cellPx;
    const maxOff = (drag.range.max - drag.startPos) * drag.cellPx;
    return Math.max(minOff, Math.min(maxOff, raw));
  }

  function onMove(e) {
    if (!drag) return;
    const off = clampedOffset(e);
    drag.el.style.transform = drag.isH ? `translateX(${off}px)` : `translateY(${off}px)`;
  }

  // 포인터가 거의 안 움직였으면 탭으로 본다(축 무관 직선 거리 기준).
  function isTap(e) {
    const dx = e.clientX - drag.downX;
    const dy = e.clientY - drag.downY;
    return Math.hypot(dx, dy) < drag.cellPx * DRAG_TAP_RATIO;
  }

  // 탭한 지점이 차 중심보다 이동 축 +방향이면 +1칸, 아니면 -1칸.
  function tapTarget(e) {
    const downPos = drag.isH ? drag.downX : drag.downY;
    const dir = downPos >= drag.center ? 1 : -1;
    return Math.max(drag.range.min, Math.min(drag.range.max, drag.startPos + dir));
  }

  // 스냅: 셀의 DRAG_SNAP_RATIO를 넘는 변위만 다음 칸으로 반영.
  function snapTarget(off) {
    const cells = off / drag.cellPx;
    const stepped = Math[cells >= 0 ? 'floor' : 'ceil'](
      cells + Math.sign(cells) * (1 - DRAG_SNAP_RATIO),
    );
    return Math.max(drag.range.min, Math.min(drag.range.max, drag.startPos + stepped));
  }

  function onUp(e) {
    if (!drag) return;
    const target = isTap(e) ? tapTarget(e) : snapTarget(clampedOffset(e));

    // dragging 해제로 transition을 되살린 뒤 transform을 0으로, 좌표를 새 칸으로 동시에
    // 바꾸면 둘 다 트랜지션돼 손 뗀 자리에서 목표 칸으로 점프 없이 정착한다.
    drag.el.classList.remove('dragging');
    drag.el.style.transform = '';
    const { car, startPos } = drag;
    drag = null;

    if (target !== startPos) {
      onCommit(car.id, target);
    }
  }

  boardEl.addEventListener('pointerdown', onDown);
  boardEl.addEventListener('pointermove', onMove);
  boardEl.addEventListener('pointerup', onUp);
  boardEl.addEventListener('pointercancel', onUp);
}
