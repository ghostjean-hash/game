// Pointer Events 드래그 → 이동 의도 산출. 차를 이동 축으로만 끌고, 손을 떼면 칸으로 스냅한다.
// 게임 규칙(이동 범위)은 core/board.js, 좌표 갱신은 render에 위임한다.

import { BOARD_SIZE, ORIENT, DRAG_SNAP_RATIO } from '../data/constants.js';
import { slideRange, axisPos } from '../core/board.js';

// boardEl에 드래그를 붙인다.
//   getCars(): 현재 cars 배열
//   onCommit(id, pos): 스냅된 새 시작 좌표로 이동 확정(변화 있을 때만 호출)
//   isLocked(): true면 입력 무시(클리어 오버레이 등)
export function attachDrag(boardEl, { getCars, onCommit, isLocked }) {
  let drag = null; // { el, car, isH, range, startPx, cellPx, startPos }

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
    drag = {
      el,
      car,
      isH,
      range: slideRange(cars, id),
      startPx: isH ? e.clientX : e.clientY,
      cellPx: cellPx(),
      startPos: axisPos(car),
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

  function onUp(e) {
    if (!drag) return;
    const off = clampedOffset(e);
    // 스냅: 셀의 DRAG_SNAP_RATIO를 넘는 변위만 다음 칸으로 반영.
    const cells = off / drag.cellPx;
    const stepped = Math[cells >= 0 ? 'floor' : 'ceil'](
      cells + Math.sign(cells) * (1 - DRAG_SNAP_RATIO),
    );
    let target = drag.startPos + stepped;
    target = Math.max(drag.range.min, Math.min(drag.range.max, target));

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
