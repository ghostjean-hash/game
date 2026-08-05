// 격자 입력 처리: 포인터(탭/드래그) → main 콜백. 좌표만 뽑고 동작 결정은 main.
// 드래그는 "직선 고정": 시작 후 주 이동 방향(가로/세로)을 정해 그 한 줄로만 투영한다
// (손 흔들림에 옆 줄이 칠해지는 오조작 방지, 저학년 배려). touch-action:none(CSS).
// 빠르게 드래그해 포인터 이벤트가 띄엄띄엄 와도, 이전 칸에서 현재 칸까지 한 칸씩
// 보간해 중간 칸을 빠짐없이 채운다.

export function attachBoardInput(boardEl, cb) {
  let dragging = false;
  let last = null;    // 직전에 onMove로 넘긴 칸 { r, c }
  let start = null;   // 드래그 시작 칸
  let axis = null;    // 'row'(가로 고정) | 'col'(세로 고정) | null(미정)
  let startedAt = 0;  // 드래그 시작 시각(두 손가락 확대가 끼어들 때 오조작 판정용)

  const cellOf = (x, y) => {
    const el = document.elementFromPoint(x, y);
    const cell = el && el.closest ? el.closest('.cell') : null;
    if (!cell || !boardEl.contains(cell)) return null;
    return { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
  };

  boardEl.addEventListener('pointerdown', (e) => {
    // 이미 한 손가락이 칠하는 중이면 둘째 손가락은 무시한다. 그건 확대·이동 신호이고
    // (boardZoom이 받는다) 여기서 또 칠하기 시작하면 그 칸이 남아버린다.
    if (dragging) return;
    const pos = cellOf(e.clientX, e.clientY);
    if (!pos) return;
    dragging = true;
    start = { r: pos.r, c: pos.c };
    axis = null;
    last = { r: pos.r, c: pos.c };
    startedAt = performance.now();
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
    if (rr === last.r && cc === last.c) return;

    // 이전 칸(last) → 현재 칸(rr,cc)을 한 칸씩 보간해 빠짐없이 onMove 호출.
    // 축 고정이라 한 방향으로만 진행한다(대각선 없음).
    const stepR = Math.sign(rr - last.r);
    const stepC = Math.sign(cc - last.c);
    let r = last.r, c = last.c;
    while (r !== rr || c !== cc) {
      r += stepR; c += stepC;
      cb.onMove(r, c);
    }
    last = { r: rr, c: cc };
  });

  const end = () => {
    if (!dragging) return;
    dragging = false;
    last = null;
    start = null;
    axis = null;
    cb.onEnd();
  };
  boardEl.addEventListener('pointerup', end);
  boardEl.addEventListener('pointercancel', end);

  // 밖(두 손가락 확대·이동)에서 진행 중인 드래그를 끊는다.
  // 반환: 실제로 끊었는지 + 시작 후 지난 시간(ms). 시간이 아주 짧으면 호출한 쪽이
  // "확대하려다 첫 손가락이 먼저 닿은 오조작"으로 보고 되돌린다(docs/06 2.1).
  return {
    cancelDrag() {
      if (!dragging) return { cancelled: false, elapsedMs: 0 };
      const elapsedMs = performance.now() - startedAt;
      end();
      return { cancelled: true, elapsedMs };
    },
  };
}
