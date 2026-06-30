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
    const { el, car, isH, startPos, cellPx } = drag;
    const off = clampedOffset(e);
    const target = isTap(e) ? tapTarget(e) : snapTarget(off);
    drag = null;

    if (target === startPos) {
      // 제자리: transition을 되살리고 transform만 0으로 부드럽게 복귀.
      el.classList.remove('dragging');
      el.style.transform = '';
      return;
    }

    // FLIP 정착. left/top과 transform을 함께 트랜지션하면 iPad에서 레이아웃 경로와
    // 컴포지터 경로의 타이밍 차로 차가 좌우로 흔들린다(docs/03 §5.2). 그래서:
    //  1) 칸 위치를 즉시 목표 칸으로 옮기고(dragging 유지 중 = transition 꺼짐, 점프),
    //  2) 같은 순간 transform으로 손 뗀 시각 위치를 상쇄해 점프를 0으로 만든 뒤,
    //  3) 다음 프레임에 transition을 되살리고 transform만 0으로 → 컴포지터 단일 속성만 정착 애니.
    const settleOff = off - (target - startPos) * cellPx;
    onCommit(car.id, target);
    // 이 수로 클리어되면 onCommit이 출구 빠져나가기 연출(transform)을 건다. 정착으로 덮지 않는다.
    if (isLocked && isLocked()) return;
    el.style.transform = isH ? `translateX(${settleOff}px)` : `translateY(${settleOff}px)`;
    requestAnimationFrame(() => {
      if (drag && drag.el === el) return; // 같은 차로 새 드래그가 시작됨 - 건드리지 않음
      el.classList.remove('dragging');
      el.style.transform = '';
    });
  }

  boardEl.addEventListener('pointerdown', onDown);
  boardEl.addEventListener('pointermove', onMove);
  boardEl.addEventListener('pointerup', onUp);
  boardEl.addEventListener('pointercancel', onUp);
}
