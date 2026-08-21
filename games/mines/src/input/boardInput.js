import { TOUCH } from '../data/constants.js';

export function bindBoardInput(boardEl, { onOpen, onFlag, getMode, directInput = false }) {
  let held = null;
  let lastPointerActionAt = 0;
  let lastMouseActionAt = 0;
  let lastTouchActionAt = 0;
  const locate = (target) => target.closest('.cell');
  const primaryAction = (x, y) => (directInput || getMode() === 'open' ? onOpen : onFlag)(x, y);
  const longPressAction = (x, y) => (directInput || getMode() === 'open' ? onFlag : onOpen)(x, y);
  const clear = () => {
    if (held?.timer) clearTimeout(held.timer);
    if (held?.pointerId !== undefined && boardEl.hasPointerCapture?.(held.pointerId)) boardEl.releasePointerCapture(held.pointerId);
    held = null;
  };
  boardEl.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'touch') return;
    const cell = locate(event.target); if (!cell) return;
    const x = Number(cell.dataset.x); const y = Number(cell.dataset.y);
    boardEl.setPointerCapture?.(event.pointerId);
    held = { x, y, startX: event.clientX, startY: event.clientY, pointerId: event.pointerId, long: false };
    held.timer = setTimeout(() => { if (held) { held.long = true; cell.classList.add('pressing'); longPressAction(x, y); } }, TOUCH.longPressMs);
  });
  boardEl.addEventListener('pointermove', (event) => {
    if (!held) return;
    if (Math.hypot(event.clientX - held.startX, event.clientY - held.startY) > TOUCH.moveTolerance) clear();
  });
  boardEl.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'touch') return;
    const cell = locate(event.target);
    if (held && !held.long && cell) {
      primaryAction(held.x, held.y);
      lastPointerActionAt = Date.now();
    }
    clear();
  });
  boardEl.addEventListener('pointercancel', clear);
  // 모바일 웹뷰는 Pointer Event의 long-press 흐름을 끊는 경우가 있어 터치는 원본 이벤트로
  // 따로 받는다. mouse와 touch가 같은 클릭 보조 경로에 섞이지 않게 시간표를 분리한다.
  boardEl.addEventListener('touchstart', (event) => {
    const cell = locate(event.target); const touch = event.touches[0]; if (!cell || !touch) return;
    event.preventDefault();
    const x = Number(cell.dataset.x); const y = Number(cell.dataset.y);
    held = { x, y, startX: touch.clientX, startY: touch.clientY, long: false };
    held.timer = setTimeout(() => {
      if (!held) return;
      held.long = true; lastTouchActionAt = Date.now();
      longPressAction(x, y);
    }, TOUCH.longPressMs);
  }, { passive: false });
  boardEl.addEventListener('touchmove', (event) => {
    const touch = event.touches[0]; if (!held || !touch) return;
    if (Math.hypot(touch.clientX - held.startX, touch.clientY - held.startY) > TOUCH.moveTolerance) clear();
  }, { passive: true });
  boardEl.addEventListener('touchend', (event) => {
    if (held && !held.long) {
      lastTouchActionAt = Date.now();
      primaryAction(held.x, held.y);
    }
    event.preventDefault(); clear();
  }, { passive: false });
  boardEl.addEventListener('touchcancel', clear);
  // 데스크톱 마우스는 Pointer Event를 거치지 않는다. 웹뷰별 pointerup 누락으로 한 칸도
  // 열리지 않던 문제를 피하려고 주 버튼을 즉시 현재 모드 동작으로 번역한다.
  boardEl.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    const cell = locate(event.target); if (!cell) return;
    event.preventDefault(); lastMouseActionAt = Date.now();
    primaryAction(Number(cell.dataset.x), Number(cell.dataset.y));
  });
  // 일부 데스크톱 웹뷰는 pointerup을 칸까지 보내지 않는다. click은 그 환경의 확실한 보조 경로다.
  boardEl.addEventListener('click', (event) => {
    const cell = locate(event.target);
    if (!cell || Date.now() - lastPointerActionAt < TOUCH.tapMaxMs || Date.now() - lastMouseActionAt < TOUCH.tapMaxMs || Date.now() - lastTouchActionAt < TOUCH.tapMaxMs) return;
    clear();
    primaryAction(Number(cell.dataset.x), Number(cell.dataset.y));
  });
  boardEl.addEventListener('contextmenu', (event) => {
    const cell = locate(event.target); event.preventDefault();
    if (cell) onFlag(Number(cell.dataset.x), Number(cell.dataset.y));
  });
  return () => { clear(); };
}
