// 짧게 누름과 길게 누름 (03_architecture.md 4.3).
//
// 다음 버튼 하나가 두 가지 일을 한다. 짧게는 지금 구간을 끝내고, 길게는 이 운동 전체를
// 건너뛴다(01_spec.md 4.3).
//
// 길게 누름이 걸린 뒤에는 뒤따르는 click 을 흘린다. 길게 눌러 건너뛴 다음 짧게 누름까지
// 먹으면 두 구간이 한 번에 지나간다(4.3.4).
// 글자 선택과 탭 강조는 공용 CSS 가 이미 막는다. 여기서는 맥락 메뉴만 막는다(4.3.3).

import { LONG_PRESS_MS } from '../data/constants.js';

export function attachPress(el, { onShort, onLong, longMs = LONG_PRESS_MS }) {
  let timer = null;
  let firedLong = false;
  let down = false;

  function clear() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
  }

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    down = true;
    firedLong = false;
    clear();
    timer = setTimeout(() => {
      timer = null;
      if (!down) return;
      firedLong = true;
      onLong?.();
    }, longMs);
  }

  function onUp() {
    clear();
    if (!down) return;
    down = false;
    if (firedLong) return; // 길게가 이미 걸렸다. 짧게를 겹쳐 내지 않는다
    onShort?.();
  }

  function onCancel() {
    clear();
    down = false;
  }

  function onClick(e) {
    // 길게 누름 뒤에 브라우저가 내는 click 을 여기서 끊는다
    if (firedLong) { e.preventDefault(); e.stopPropagation(); firedLong = false; }
  }

  function onContextMenu(e) {
    e.preventDefault();
  }

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onCancel);
  el.addEventListener('pointerleave', onCancel);
  el.addEventListener('click', onClick, true);
  el.addEventListener('contextmenu', onContextMenu);

  return function detach() {
    clear();
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onCancel);
    el.removeEventListener('pointerleave', onCancel);
    el.removeEventListener('click', onClick, true);
    el.removeEventListener('contextmenu', onContextMenu);
  };
}
