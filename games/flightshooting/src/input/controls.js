// 입력 처리. 드래그(상대 이동)로 기체를 옮기고, 키보드 상태(keys)를 노출한다.
// 실제 이동 반영(applyKeyboard)과 clamp는 core/world.js의 순수 함수가 담당.
import { clampPlayer } from '../core/world.js';

// opts: { isPlaying: ()=>bool, onPause: ()=>void, size: ()=>({W,H}) }
export function createControls(canvas, game, opts) {
  const keys = new Set();
  let dragging = false;
  let lastPtr = null;

  function canvasPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }
  function onDown(ev) {
    if (!opts.isPlaying() || game.autopilot) return; // 자동 플레이 중엔 수동 조작 무시
    canvas.setPointerCapture?.(ev.pointerId);
    dragging = true;
    lastPtr = canvasPos(ev);
  }
  function onMove(ev) {
    if (!dragging || !opts.isPlaying() || !game.player || game.autopilot) return;
    const p = canvasPos(ev);
    game.player.x += p.x - lastPtr.x;
    game.player.y += p.y - lastPtr.y;
    lastPtr = p;
    const { W, H } = opts.size();
    clampPlayer(game, W, H);
  }
  function endDrag() { dragging = false; lastPtr = null; }

  function onKeyDown(ev) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(ev.key)) ev.preventDefault();
    const k = ev.key.toLowerCase();
    keys.add(k);
    if (k === 'p') opts.onPause();
  }
  function onKeyUp(ev) { keys.delete(ev.key.toLowerCase()); }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return {
    keys,
    destroy() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('pointercancel', endDrag);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    },
  };
}
