import { TOUCH } from '../data/constants.js';

export function bindBoardInput(boardEl, { onOpen, onFlag, getMode }) {
  let held = null;
  const locate = (target) => target.closest('.cell');
  const clear = () => {
    if (held?.timer) clearTimeout(held.timer);
    if (held?.pointerId !== undefined && boardEl.hasPointerCapture?.(held.pointerId)) boardEl.releasePointerCapture(held.pointerId);
    held = null;
  };
  boardEl.addEventListener('pointerdown', (event) => {
    const cell = locate(event.target); if (!cell) return;
    const x = Number(cell.dataset.x); const y = Number(cell.dataset.y);
    boardEl.setPointerCapture?.(event.pointerId);
    held = { x, y, startX: event.clientX, startY: event.clientY, pointerId: event.pointerId, long: false };
    held.timer = setTimeout(() => { if (held) { held.long = true; cell.classList.add('pressing'); (getMode() === 'open' ? onFlag : onOpen)(x, y); } }, TOUCH.longPressMs);
  });
  boardEl.addEventListener('pointermove', (event) => {
    if (!held) return;
    if (Math.hypot(event.clientX - held.startX, event.clientY - held.startY) > TOUCH.moveTolerance) clear();
  });
  boardEl.addEventListener('pointerup', (event) => {
    const cell = locate(event.target);
    if (held && !held.long && cell) (getMode() === 'open' ? onOpen : onFlag)(held.x, held.y);
    clear();
  });
  boardEl.addEventListener('pointercancel', clear);
  boardEl.addEventListener('contextmenu', (event) => event.preventDefault());
  return () => { clear(); };
}
