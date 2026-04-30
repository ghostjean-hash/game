// 입력 추상화. 터치/마우스/키보드를 동일 핸들러로 받기 위한 얇은 래퍼.
// 사용 예:
//   const input = createInput(canvas, {
//     onTap: (p) => ...,
//     onSwipe: (dir) => ...,        // dir: "left"|"right"|"up"|"down"
//     onHold: (p) => ...,           // 200ms 이상 누름
//     onKey: (key, ev) => ...,      // ev.type === "keydown"
//   });
//   input.destroy();

const SWIPE_MIN_PX = 24;
const SWIPE_MAX_MS = 500;
const HOLD_MS = 220;
const TAP_MAX_PX = 10;
const TAP_MAX_MS = 250;

export function createInput(target, handlers = {}) {
  const h = {
    onTap: () => {},
    onSwipe: () => {},
    onHold: () => {},
    onKey: () => {},
    ...handlers,
  };

  let start = null; // {x, y, t, id, holdTimer, holdFired}

  function pos(ev, t) {
    const rect = target.getBoundingClientRect();
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function onPointerDown(ev) {
    if (start) return;
    target.setPointerCapture?.(ev.pointerId);
    const p = pos(ev, ev);
    start = {
      x: p.x, y: p.y, t: performance.now(), id: ev.pointerId,
      holdFired: false,
      holdTimer: setTimeout(() => {
        if (!start) return;
        start.holdFired = true;
        h.onHold({ x: start.x, y: start.y });
      }, HOLD_MS),
    };
  }

  function onPointerMove(ev) {
    // hold 중 상당히 움직였으면 hold 취소
    if (!start) return;
    const p = pos(ev, ev);
    const dx = p.x - start.x, dy = p.y - start.y;
    if (Math.hypot(dx, dy) > TAP_MAX_PX) {
      clearTimeout(start.holdTimer);
    }
  }

  function onPointerUp(ev) {
    if (!start) return;
    clearTimeout(start.holdTimer);
    const p = pos(ev, ev);
    const dx = p.x - start.x;
    const dy = p.y - start.y;
    const dist = Math.hypot(dx, dy);
    const dt = performance.now() - start.t;
    const wasHold = start.holdFired;
    start = null;

    if (wasHold) return;

    if (dist >= SWIPE_MIN_PX && dt <= SWIPE_MAX_MS) {
      const dir = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? "right" : "left")
        : (dy > 0 ? "down" : "up");
      h.onSwipe(dir, { dx, dy });
      return;
    }

    if (dist <= TAP_MAX_PX && dt <= TAP_MAX_MS) {
      h.onTap({ x: p.x, y: p.y });
    }
  }

  function onPointerCancel() {
    if (!start) return;
    clearTimeout(start.holdTimer);
    start = null;
  }

  function onKeyDown(ev) { h.onKey(ev.key, ev); }
  function onKeyUp(ev) { h.onKey(ev.key, ev); }

  // 컨텍스트 메뉴 무시(긴 누름 처리 충돌 방지)
  function onContextMenu(ev) { ev.preventDefault(); }

  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", onPointerUp);
  target.addEventListener("pointercancel", onPointerCancel);
  target.addEventListener("contextmenu", onContextMenu);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return {
    destroy() {
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", onPointerUp);
      target.removeEventListener("pointercancel", onPointerCancel);
      target.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
