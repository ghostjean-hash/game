// 시작 흐름 공용 프레임 - 화면 골격(기획서 Ⅰ권 4.1 / 10장).
//
// 왜 이렇게 만드나: 지금 다섯 게임이 화면을 세 가지 방식으로 바꾸고 있고, 그중
// "숨기라는 지시를 배치 지시가 덮어써" 두 화면이 겹쳐 보이던 사고가 실제로 있었다(Ⅰ권 2.2).
// 그래서 여기서는 요소마다 숨김을 켜고 끄지 않는다. 지금 어느 화면인지를 뿌리 요소 한 곳에 적고,
// 표시는 frame.css가 그 값만 보고 가른다. 화면이 둘 보이는 상태가 구조상 만들어지지 않는다.
//
// 되돌아가기는 stack.js가 계산하고, 이 파일은 그 결과를 화면과 브라우저 뒤로가기에 잇는다.
// 되돌리기: createScreens를 쓰지 않으면 게임이 원래 하던 방식으로 즉시 돌아간다.
// SSOT: standards/html-game/plans/doc/screen-frame.html 4장 / 10장.

import { SCREEN } from './text.js';
import { createStack } from './stack.js';

const ATTR_SCREEN = 'data-gg-screen';

// 화면 골격을 만든다.
//   root:     화면 요소들을 담는 부모(여기에 지금 화면 이름이 적힌다)
//   onExit:   시작 화면에서 한 번 더 되돌아갔을 때 공용 나가기 통로를 호출한다
//   useHistory: 기기 자체의 되돌아가기 동작을 계단에 물릴지 여부
//   interceptBack: 화면 안 되돌아가기 버튼을 먼저 받을 함수. true를 돌리면 화면을 옮기지 않는다
//                  (덮는 카드가 열려 있을 때 그 카드만 닫기 위한 통로). 기기 뒤로가기는
//                  덮는 카드가 직접 받으므로 여기로 오지 않는다
export function createScreens({ root, hasSelect = false, useHistory = true, onExit = null, onChange = null, interceptBack = null } = {}) {
  if (!root) throw new Error('createScreens: root required');

  const stack = createStack({ hasSelect });
  const listeners = onChange ? [onChange] : [];
  let popping = false;     // 브라우저 뒤로가기로 들어온 이동인지(다시 기록을 쌓지 않기 위함)
  let destroyed = false;

  root.classList.add('gg-frame');

  function paint() {
    root.setAttribute('data-screen', stack.current());
    const covered = stack.covered();
    if (covered) root.setAttribute('data-covered', covered);
    else root.removeAttribute('data-covered');
  }

  function emit(prev) {
    const now = stack.current();
    if (prev === now) return;
    listeners.forEach((fn) => { try { fn(now, prev); } catch { /* 한 곳이 실패해도 화면 이동은 끝난다 */ } });
  }

  // 화면을 옮기고 표시·기록을 함께 맞춘다.
  function go(name) {
    const prev = stack.current();
    stack.go(name);
    paint();
    if (useHistory && !popping) {
      const deeper = (stack.depth(name) ?? 0) > (stack.depth(prev) ?? 0);
      // 깊어질 때만 되돌아갈 자리를 하나 쌓는다. 얕아질 때 쌓으면 뒤로가기가 앞으로 가버린다.
      if (deeper) {
        try { history.pushState({ ggScreen: name }, ''); } catch { /* 파일로 열었을 때 등 */ }
      }
    }
    emit(prev);
    return stack.current();
  }

    // 한 칸 바깥으로. 시작 화면에서는 공용 나가기만 호출한다(Ⅰ권 4.3).
  function back() {
    if (interceptBack && interceptBack()) return stack.current();
    const target = stack.peekBack();
    if (target === null) {
      if (onExit) onExit();
      return null;
    }
    if (useHistory && !popping) {
      // 실제 이동은 popstate에서 한 번만 일어난다. 여기서 화면까지 바꾸면 두 칸 물러난다.
      try {
        history.back();
        return target;
      } catch { /* 기록을 못 쓰는 환경이면 아래에서 직접 옮긴다 */ }
    }
    const prev = stack.current();
    stack.back();
    paint();
    emit(prev);
    return stack.current();
  }

  function onPopState() {
    if (destroyed) return;
    const target = stack.peekBack();
    if (target === null) return;   // 시작 화면에서의 뒤로가기는 브라우저가 알아서 허브로 보낸다
    popping = true;
    const prev = stack.current();
    stack.back();
    paint();
    emit(prev);
    popping = false;
  }

  if (useHistory) window.addEventListener('popstate', onPopState);
  paint();

  return {
    go,
    back,
    current() { return stack.current(); },
    covered() { return stack.covered(); },
    depth(name) { return stack.depth(name); },
    onChange(fn) { if (typeof fn === 'function') listeners.push(fn); },
    // 게임이 자기 화면 요소를 프레임에 등록할 때 쓴다(이름을 붙여 두면 표시는 CSS가 가른다).
    // 같은 이름으로 이미 등록된 다른 요소가 있으면 그 이름표를 뗀다 - 프레임이 미리 만들어 둔
    // 빈 자리를 게임이 자기 화면으로 갈아끼우는 경우다. 떼지 않으면 빈 자리도 함께 표시되어
    // 화면 높이를 반씩 나눠 갖는다(비행 슈팅 적용에서 실측으로 드러난 사고 - 보드가 절반 크기).
    register(name, el) {
      if (!el) return null;
      root.querySelectorAll(`[${ATTR_SCREEN}="${name}"]`).forEach((prev) => {
        if (prev !== el) prev.removeAttribute(ATTR_SCREEN);
      });
      el.setAttribute(ATTR_SCREEN, name);
      if (el.parentElement !== root) root.appendChild(el);
      return el;
    },
    destroy() {
      destroyed = true;
      if (useHistory) window.removeEventListener('popstate', onPopState);
    },
  };
}

export { SCREEN };
