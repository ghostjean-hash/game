// 격자 입력 처리: 포인터(탭/드래그) → main 콜백. 좌표만 뽑고 동작 결정은 main.
// 드래그는 "직선 고정": 시작 후 주 이동 방향(가로/세로)을 정해 그 한 줄로만 투영한다
// (손 흔들림에 옆 줄이 칠해지는 오조작 방지, 저학년 배려). touch-action:none(CSS).

export function attachBoardInput(boardEl, cb) {
  let dragging = false;
  let lastKey = null;
  let start = null;   // 드래그 시작 칸
  let axis = null;    // 'row'(가로 고정) | 'col'(세로 고정) | null(미정)

  const cellOf = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const cell = el && el.closest ? el.closest('.cell') : null;
    if (!cell || !boardEl.contains(cell)) return null;
    return { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
  };

  boardEl.addEventListener('pointerdown', (e) => {
    const pos = cellOf(e.clientX, e.clientY);
    if (!pos) return;
    dragging = true;
    start = { r: pos.r, c: pos.c };
    axis = null;
    lastKey = `${pos.r},${pos.c}`;
    try { boardEl.setPointerCapture(e.pointerId); } catch { /* noop */ }
    cb.onStart(pos.r, pos.c);
    e.preventDefault();
  });

  boardEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const pos = cellOf(e.clientX, e.clientY);
    if (!pos) return;

    // 아직 축이 안 정해졌으면, 시작 칸에서 벗어난 방향으로 가로/세로 결정.
    if (axis === null) {
      const dr = Math.abs(pos.r - start.r);
      const dc = Math.abs(pos.c - start.c);
      if (dr === 0 && dc === 0) return; // 아직 같은 칸
      axis = dc >= dr ? 'row' : 'col';
    }

    // 정해진 축의 시작 줄로 투영(옆 줄 침범 무시).
    const rr = axis === 'row' ? start.r : pos.r;
    const cc = axis === 'col' ? start.c : pos.c;
    const key = `${rr},${cc}`;
    if (key === lastKey) return;
    lastKey = key;
    cb.onMove(rr, cc);
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    lastKey = null;
    start = null;
    axis = null;
    cb.onEnd();
  };
  boardEl.addEventListener('pointerup', end);
  boardEl.addEventListener('pointercancel', end);
}
