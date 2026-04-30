// requestAnimationFrame 기반 게임 루프.
// - dt(초 단위)를 update에 전달
// - 탭 비활성/visibilitychange에서 자동 일시정지
// - dt 클램프(긴 정지 후 점프 방지)

export function createLoop({ update, render, maxDt = 0.1 }) {
  let running = false;
  let raf = 0;
  let last = 0;

  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, maxDt);
    last = now;
    update(dt);
    render(dt);
    raf = requestAnimationFrame(tick);
  }

  function onVisibility() {
    if (document.hidden) pause();
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
      document.addEventListener("visibilitychange", onVisibility);
    },
    pause() { pause(); },
    resume() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    },
    stop() {
      pause();
      document.removeEventListener("visibilitychange", onVisibility);
    },
    get running() { return running; },
  };

  function pause() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
  }
}
