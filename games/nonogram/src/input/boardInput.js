// 격자 입력 처리: 포인터(탭/드래그) → main 콜백. 좌표만 뽑고 동작 결정은 main.
// touch-action:none(CSS)으로 스크롤 대신 그리기. DOM 계층.

export function attachBoardInput(boardEl, cb) {
  let dragging = false;
  let lastKey = null;

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
    lastKey = `${pos.r},${pos.c}`;
    try { boardEl.setPointerCapture(e.pointerId); } catch { /* noop */ }
    cb.onStart(pos.r, pos.c);
    e.preventDefault();
  });

  boardEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const pos = cellOf(e.clientX, e.clientY);
    if (!pos) return;
    const key = `${pos.r},${pos.c}`;
    if (key === lastKey) return; // 같은 셀 반복 스킵
    lastKey = key;
    cb.onMove(pos.r, pos.c);
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    lastKey = null;
    cb.onEnd();
  };
  boardEl.addEventListener('pointerup', end);
  boardEl.addEventListener('pointercancel', end);
}
