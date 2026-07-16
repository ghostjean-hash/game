// 입력 처리. 드래그(상대 이동)로 기체를 옮기고, 키보드 상태(keys)를 노출한다.
// 실제 이동 반영(applyKeyboard)과 clamp는 core/world.js의 순수 함수가 담당.
// 자동 보조(autoAssist) 하이브리드: 조작하는 동안 game.dragging=true로 자동을 잠재우고,
//   조작할 때마다 game.manualTimer를 resumeDelay로 리셋한다. 손을 떼면 그 시간이 지나야 자동 복귀(main이 판정).
import { clampPlayer } from '../core/world.js';
import { CFG } from '../data/numbers.js';

// opts: { isPlaying: ()=>bool, onPause: ()=>void, size: ()=>({W,H}) }
export function createControls(canvas, game, opts) {
  const keys = new Set();
  let dragging = false;
  let lastPtr = null;

  // 수동 조작이 있었음을 표시: 자동 복귀 대기 타이머를 다시 채운다.
  function markManual() { game.manualTimer = CFG.autopilot.resumeDelay; }

  function canvasPos(ev) {
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }
  function onDown(ev) {
    if (!opts.isPlaying()) return;
    canvas.setPointerCapture?.(ev.pointerId);
    dragging = true;
    game.dragging = true; // 잡고 있는 동안 자동 정지(main이 참조)
    lastPtr = canvasPos(ev);
    markManual();
  }
  function onMove(ev) {
    if (!dragging || !opts.isPlaying() || !game.player) return;
    const p = canvasPos(ev);
    game.player.x += p.x - lastPtr.x;
    game.player.y += p.y - lastPtr.y;
    lastPtr = p;
    markManual();
    const { W, H } = opts.size();
    clampPlayer(game, W, H);
  }
  function endDrag() { dragging = false; game.dragging = false; lastPtr = null; markManual(); }

  function onKeyDown(ev) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(ev.key)) ev.preventDefault();
    const k = ev.key.toLowerCase();
    keys.add(k);
    if (k === 'p') opts.onPause();
    else if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) markManual(); // 방향키도 수동 조작
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
