// 행운 의식 만땅 진입 Canvas 파티클 (S4-T2).
// SSOT: docs/01_spec.md 5.6.7 / 5.6.8.
// 만땅 진입 trigger 시 단발 0.9초 방사형 입자 버스트. prefers-reduced-motion 시 비활성.

const PARTICLE_COUNT = 30;
const DURATION_MS = 900;
const RADIUS_MAX = 140;       // 최대 비행 반경(px)
const PARTICLE_SIZE = 4;      // 입자 base 반지름
const COLOR_GOLD = '#f6c445';
const COLOR_AMBER = '#f59e0b';

/**
 * anchor 요소 중심에서 0.9초 단발 파티클 버스트.
 * fixed canvas를 document.body에 마운트, 종료 후 자동 제거.
 * @param {HTMLElement} anchor 중심 좌표 기준 요소
 */
export function spawnRitualBurst(anchor) {
  if (!anchor || typeof window === 'undefined' || typeof document === 'undefined') return;

  // 접근성: prefers-reduced-motion 시 즉시 종료.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rect = anchor.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const canvas = document.createElement('canvas');
  canvas.className = 'ritual-burst-canvas';
  // viewport 전체 덮어 fixed. 입자 좌표는 client 좌표계.
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.position = 'fixed';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999'; // modal-overlay 위
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  // 입자 초기화.
  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + Math.random() * 0.2;
    const speed = 0.6 + Math.random() * 0.6; // 0.6~1.2 (RADIUS_MAX 비율)
    particles.push({
      angle,
      speed,
      sizeMul: 0.7 + Math.random() * 0.8,
      color: i % 2 === 0 ? COLOR_GOLD : COLOR_AMBER,
    });
  }

  const start = performance.now();
  let rafId = null;

  function draw(now) {
    const t = (now - start) / DURATION_MS; // 0~1
    if (t >= 1) {
      // 종료
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ease-out (1 - (1-t)^2)
    const eased = 1 - (1 - t) * (1 - t);
    const alpha = 1 - t; // 페이드아웃
    for (const p of particles) {
      const r = RADIUS_MAX * eased * p.speed;
      const x = cx + Math.cos(p.angle) * r;
      const y = cy + Math.sin(p.angle) * r;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, PARTICLE_SIZE * p.sizeMul, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    rafId = window.requestAnimationFrame(draw);
  }

  rafId = window.requestAnimationFrame(draw);

  // 안전 가드: 페이지 unload 등으로 raf가 멈추는 경우 setTimeout으로 청소.
  setTimeout(() => {
    if (rafId) window.cancelAnimationFrame(rafId);
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }, DURATION_MS + 200);
}
