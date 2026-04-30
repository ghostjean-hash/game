// 입력 추상화. 터치/마우스/키보드를 동일 핸들러로 받기 위한 얇은 래퍼.
// 사용 예:
//   const input = createInput(canvas, {
//     onTap: (p) => ...,
//     onSwipe: (dir) => ...,        // dir: "left"|"right"|"up"|"down"
//     onHold: (p) => ...,           // 200ms 이상 누름
//     onPanStart: (p) => ...,       // 가로 우세 드래그 진입
//     onPan: ({dx, dy}) => ...,     // 드래그 중 누적 변위
//     onPanEnd: ({dx, dy}) => ...,  // 드래그 종료
//     onKey: (key, ev) => ...,      // ev.type === "keydown"
//   });
//   input.destroy();

const SWIPE_MIN_PX = 24;
const SWIPE_MAX_MS = 500;
const HOLD_MS = 220;
const TAP_MAX_PX = 10;
const TAP_MAX_MS = 250;
// 가로 드래그(pan) 진입 임계. 이 거리만큼 가로 우세로 움직이면 swipe가 아닌 pan 모드로 전환.
const PAN_TRIGGER_PX = 12;

export function createInput(target, handlers = {}) {
  const h = {
    onTap: () => {},
    onSwipe: () => {},
    onHold: () => {},
    onPanStart: () => {},
    onPan: () => {},
    onPanEnd: () => {},
    onKey: () => {},
    ...handlers,
  };

  let start = null; // {x, y, t, id, holdTimer, holdFired, mode}

  function pos(ev, t) {
    const rect = target.getBoundingClientRect();
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }

  function onPointerDown(ev) {
    if (start) return;
    // UI 인터랙티브 요소(버튼/링크/폼)에서 시작된 입력은 게임 입력으로 처리하지 않는다.
    if (ev.target && ev.target.closest && ev.target.closest("button, a, input, textarea, select, [data-no-input]")) return;
    target.setPointerCapture?.(ev.pointerId);
    const p = pos(ev, ev);
    start = {
      x: p.x, y: p.y, t: performance.now(), id: ev.pointerId,
      holdFired: false,
      mode: "pending", // "pending" | "pan" | "vertical"
      holdTimer: setTimeout(() => {
        if (!start || start.mode !== "pending") return;
        start.holdFired = true;
        h.onHold({ x: start.x, y: start.y });
      }, HOLD_MS),
    };
  }

  function onPointerMove(ev) {
    if (!start) return;
    const p = pos(ev, ev);
    const dx = p.x - start.x, dy = p.y - start.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);

    // 일정 거리 움직이면 hold 후보 해제
    if (Math.hypot(dx, dy) > TAP_MAX_PX) {
      clearTimeout(start.holdTimer);
    }

    if (start.mode === "pending") {
      // 가로 우세 + 임계 통과 → pan 진입
      if (adx > ady && adx > PAN_TRIGGER_PX) {
        start.mode = "pan";
        h.onPanStart({ x: start.x, y: start.y });
        h.onPan({ dx, dy });
      }
      // 세로 우세는 pending 유지(pointerup에서 swipe 판정)
    } else if (start.mode === "pan") {
      h.onPan({ dx, dy });
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
    const mode = start.mode;
    start = null;

    if (wasHold) return;

    if (mode === "pan") {
      h.onPanEnd({ dx, dy });
      return;
    }

    // 세로 swipe만 발화(가로는 pan으로 처리되므로 여기 안 옴 또는 pending이라 임계 미만)
    if (dist >= SWIPE_MIN_PX && dt <= SWIPE_MAX_MS) {
      const adx = Math.abs(dx), ady = Math.abs(dy);
      const dir = adx > ady
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
    if (start.mode === "pan") h.onPanEnd({ dx: 0, dy: 0 });
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
